import { ART, fracAt, pointAt, type Stroke } from './path';

export interface Cam {
	/** Artboard point at the centre of the screen. */
	x: number;
	y: number;
	/** Screen pixels per artboard unit. */
	k: number;
}

export interface Shot {
	w: number;
	h: number;
	/** Pen time the first frame rests at. */
	u0: number;
	/** Where the first frame wants the start of the line, in screen pixels. */
	anchor: { x: number; y: number };
}

const SAMPLES = 960;
/** How long a stretch of pen time the camera averages over. */
const CALM = 0.032 * SAMPLES;
/** How far from the centre the pen may stray, as a share of the screen. */
const SAFE_X = 0.4;
const SAFE_Y = 0.37;

const step = (a: number, b: number, v: number) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * t * (t * (t * 6 - 15) + 10);
};

function blur(src: Float32Array, sigma: number) {
	const reach = Math.ceil(sigma * 3);
	const dst = new Float32Array(src.length);
	for (let i = 0; i < src.length; i++) {
		let sw = 0;
		let sv = 0;
		for (let j = -reach; j <= reach; j++) {
			const n = Math.min(src.length - 1, Math.max(0, i + j));
			const g = Math.exp(-(j * j) / (2 * sigma * sigma));
			sw += g;
			sv += g * src[n];
		}
		dst[i] = sv / sw;
	}
	return dst;
}

/**
 * The camera as a function of pen time, so it scrubs both ways. It follows where
 * the pen has been working rather than the tip, and is worked out ahead of time,
 * so it has already pulled back when the pen darts off and back.
 */
export function buildCamera(stroke: Stroke, shot: Shot) {
	const { w, h, u0, anchor } = shot;

	const tipX = new Float32Array(SAMPLES);
	const tipY = new Float32Array(SAMPLES);
	const p = { x: 0, y: 0 };
	for (let i = 0; i < SAMPLES; i++) {
		pointAt(stroke, fracAt(i / (SAMPLES - 1)), p);
		tipX[i] = p.x;
		tipY[i] = p.y;
	}
	const cx = blur(tipX, CALM);
	const cy = blur(tipY, CALM);

	// The closest the camera may be at each moment and still hold the pen …
	const fit = Math.min((w * 0.88) / ART.w, (h * 0.84) / ART.h);
	const near = new Float32Array(SAMPLES);
	for (let i = 0; i < SAMPLES; i++) {
		const hold = Math.min(
			(SAFE_X * w) / (Math.abs(tipX[i] - cx[i]) + 1),
			(SAFE_Y * h) / (Math.abs(tipY[i] - cy[i]) + 1)
		);
		near[i] = Math.log(Math.min(fit * 4.6, Math.max(fit * 1.5, hold)));
	}
	// … pulled back ahead of time to the widest shot needed any time soon,
	// then eased so the zoom breathes instead of pumping.
	const soon = Math.round(CALM * 0.9);
	const wide = new Float32Array(SAMPLES);
	for (let i = 0; i < SAMPLES; i++) {
		let m = Infinity;
		for (let j = Math.max(0, i - soon); j <= Math.min(SAMPLES - 1, i + soon); j++) {
			if (near[j] < m) m = near[j];
		}
		wide[i] = m;
	}
	const zk = blur(wide, CALM * 0.75);

	// First frame: the line starts on the dot of the "i".
	const k0 = (1.25 * Math.max(w, h * 0.7)) / 340;
	const first: Cam = {
		x: stroke.start.x - (anchor.x - w / 2) / k0,
		y: stroke.start.y - (anchor.y - h / 2) / k0,
		k: k0
	};
	// Last frame: all of her, a little right of centre.
	const last: Cam = {
		x: ART.w / 2 - ((w > h ? 0.07 : 0.035) * w) / fit,
		y: ART.h / 2 + (0.015 * h) / fit,
		k: fit
	};

	const out: Cam = { x: 0, y: 0, k: 1 };

	function at(u: number): Cam {
		if (u <= u0) return Object.assign(out, first);

		const f = Math.min(SAMPLES - 1, Math.max(0, u * (SAMPLES - 1)));
		const i = Math.floor(f);
		const j = Math.min(SAMPLES - 1, i + 1);
		const t = f - i;
		let x = cx[i] + (cx[j] - cx[i]) * t;
		let y = cy[i] + (cy[j] - cy[i]) * t;
		let lk = zk[i] + (zk[j] - zk[i]) * t;

		// Leave the first frame at once, then settle into the track.
		const leave = 1 - Math.pow(1 - Math.min(1, (u - u0) / 0.06), 3);
		x = first.x + (x - first.x) * leave;
		y = first.y + (y - first.y) * leave;
		lk = Math.log(first.k) + (lk - Math.log(first.k)) * leave;

		const arrive = step(0.85, 0.995, u);
		x += (last.x - x) * arrive;
		y += (last.y - y) * arrive;
		lk += (Math.log(last.k) - lk) * arrive;

		out.x = x;
		out.y = y;
		out.k = Math.exp(lk);
		return out;
	}

	return { at, first, last };
}
