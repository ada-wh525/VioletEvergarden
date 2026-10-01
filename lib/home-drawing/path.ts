import svgRaw from './violet-one-stroke.svg?raw';
import route from './violet-one-stroke.json';

/** Artboard size, in viewBox units. */
export const ART = { w: route.viewBox[2], h: route.viewBox[3] };

/**
 * The inner oval of the brooch, as cubic indices in the route. The pen closes
 * this loop in one go, so it can be filled the moment the last one is drawn.
 */
const GEM_SEGMENTS: [number, number] = [606, 609];

/** A curve parameter is a cubic's index plus t: 12.5 is halfway through curve 12. */

export interface Stroke {
	/** The start point, then 6 numbers per cubic: two handles and its end. */
	curves: Float32Array;
	start: { x: number; y: number };
	end: { x: number; y: number };
	/** Sampled points (x/y pairs), with distance and curve parameter at each. */
	pts: Float32Array;
	cum: Float32Array;
	param: Float32Array;
	count: number;
	length: number;
	/** The brooch, as a range of curve parameters, its centre, and when it is done. */
	gem: { from: number; to: number; x: number; y: number; doneAt: number };
}

/** One coordinate of cubic `i` at (u, v, w); (t, t, t) is the point at t. */
function blossom(c: Float32Array, i: number, o: number, u: number, v: number, w: number) {
	const j = i * 6 + o;
	const a = c[j] + (c[j + 2] - c[j]) * u;
	const b = c[j + 2] + (c[j + 4] - c[j + 2]) * u;
	const e = c[j + 4] + (c[j + 6] - c[j + 4]) * u;
	const d = a + (b - a) * v;
	return d + (b + (e - b) * v - d) * w;
}

const STEPS = 12;

export function buildStroke(): Stroke {
	const d = svgRaw.match(/ d="([^"]+)"/)![1];
	const n = d.match(/-?\d*\.?\d+/g)!.map(Number);
	const c = Float32Array.from(n);
	const segments = (c.length - 2) / 6;

	// Samples only measure the route; drawing uses the curves.
	const xs: number[] = [n[0]];
	const ys: number[] = [n[1]];
	const cum: number[] = [0];
	const param: number[] = [0];
	const first: number[] = [];
	let length = 0;
	for (let i = 0; i < segments; i++) {
		first.push(xs.length - 1);
		for (let s = 1; s <= STEPS; s++) {
			const t = s / STEPS;
			const x = blossom(c, i, 0, t, t, t);
			const y = blossom(c, i, 1, t, t, t);
			length += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]);
			xs.push(x);
			ys.push(y);
			cum.push(length);
			param.push(i + t);
		}
	}
	first.push(xs.length - 1);

	const count = xs.length;
	const pts = new Float32Array(count * 2);
	for (let i = 0; i < count; i++) {
		pts[i * 2] = xs[i];
		pts[i * 2 + 1] = ys[i];
	}

	const g0 = first[GEM_SEGMENTS[0]];
	const g1 = first[GEM_SEGMENTS[1] + 1];
	let gx = 0;
	let gy = 0;
	for (let i = g0; i < g1; i++) {
		gx += xs[i];
		gy += ys[i];
	}

	return {
		curves: c,
		start: { x: n[0], y: n[1] },
		end: { x: xs[count - 1], y: ys[count - 1] },
		pts,
		cum: Float32Array.from(cum),
		param: Float32Array.from(param),
		count,
		length,
		gem: {
			from: GEM_SEGMENTS[0],
			to: GEM_SEGMENTS[1] + 1,
			x: gx / (g1 - g0),
			y: gy / (g1 - g0),
			doneAt: cum[g1] / length
		}
	};
}

/** Share of the route travelled → curve parameter. */
export function paramAt(stroke: Stroke, frac: number) {
	const { cum, param, count, length } = stroke;
	const len = frac * length;
	if (len <= 0) return 0;
	if (len >= length) return param[count - 1];
	let lo = 0;
	let hi = count - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (cum[mid] <= len) lo = mid;
		else hi = mid;
	}
	return param[lo] + (param[hi] - param[lo]) * ((len - cum[lo]) / (cum[hi] - cum[lo] || 1));
}

export function pointAt(stroke: Stroke, frac: number, out = { x: 0, y: 0 }) {
	const g = paramAt(stroke, frac);
	const i = Math.min(Math.floor(g), (stroke.curves.length - 2) / 6 - 1);
	const t = g - i;
	out.x = blossom(stroke.curves, i, 0, t, t, t);
	out.y = blossom(stroke.curves, i, 1, t, t, t);
	return out;
}

/** Adds the route between curve parameters `a` and `b` to the current path. */
export function trace(ctx: CanvasPath, stroke: Stroke, a: number, b: number) {
	const c = stroke.curves;
	for (let i = Math.floor(a); i < b; i++) {
		const t0 = Math.max(0, a - i);
		const t1 = Math.min(1, b - i);
		if (i === Math.floor(a)) {
			ctx.moveTo(blossom(c, i, 0, t0, t0, t0), blossom(c, i, 1, t0, t0, t0));
		}
		ctx.bezierCurveTo(
			blossom(c, i, 0, t0, t0, t1),
			blossom(c, i, 1, t0, t0, t1),
			blossom(c, i, 0, t0, t1, t1),
			blossom(c, i, 1, t0, t1, t1),
			blossom(c, i, 0, t1, t1, t1),
			blossom(c, i, 1, t1, t1, t1)
		);
	}
}

/** Pen time `u` runs 0 → 1, faster while the pen goes back over a line. */
const weight = (r: { kind: string; from: number; to: number }) =>
	(r.to - r.from) / (r.kind === 'retrace' ? route.retraceSpeedup : 1);
const total = route.runs.reduce((sum, r) => sum + weight(r), 0);
const runs = (() => {
	let acc = 0;
	return route.runs.map((r) => {
		const u0 = acc / total;
		acc += weight(r);
		return { ...r, u0, u1: acc / total };
	});
})();

function runAt(u: number) {
	let lo = 0;
	let hi = runs.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (runs[mid].u1 < u) lo = mid + 1;
		else hi = mid;
	}
	return runs[lo];
}

/** Pen time → share of the route travelled. */
export function fracAt(u: number) {
	if (u <= 0) return 0;
	if (u >= 1) return 1;
	const r = runAt(u);
	return r.from + (r.to - r.from) * ((u - r.u0) / (r.u1 - r.u0 || 1));
}

export function isRetrace(u: number) {
	return runAt(u).kind === 'retrace';
}

/** Share of the route travelled → pen time. */
export function timeAt(frac: number) {
	const r = runs.find((r) => frac <= r.to) ?? runs[runs.length - 1];
	return r.u0 + (r.u1 - r.u0) * ((frac - r.from) / (r.to - r.from || 1));
}
