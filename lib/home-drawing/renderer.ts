import type { Cam } from './camera';
import { paramAt, pointAt, trace, type Stroke } from './path';

export interface Frame {
	cam: Cam;
	/** Share of the route travelled. */
	frac: number;
	/** 0 while laying down new line, 1 while going back over one. */
	retrace: number;
	/** Fill of the brooch, 0–1. */
	gem: number;
	/** 0 → 1 as the pen tip settles into a full stop. */
	rest: number;
	/** Radius of the dot the line starts from, and of the full stop it ends as. */
	dot: number;
	stop: number;
	accent: string;
}

/** Length of fresh, still-green ink behind the pen, in pixels. */
const TAIL = 260;
const TAIL_STEPS = 14;
/** Radius of the glow around the pen, in pixels. */
const HALO = 34;

/** Draws the line, and the green parts over it, as curves placed by the canvas transform. */
export function createRenderer(ink: HTMLCanvasElement, glow: HTMLCanvasElement, stroke: Stroke) {
	const line = ink.getContext('2d')!;
	const tint = glow.getContext('2d')!;
	const tip = { x: 0, y: 0 };
	let w = 0;
	let h = 0;
	let dpr = 1;
	let fine = 1;
	let halo: CanvasGradient | undefined;
	let haloColor = '';

	function resize(width: number, height: number) {
		w = width;
		h = height;
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		fine = Math.min(1, 0.45 + w / 1800);
		for (const c of [ink, glow]) {
			c.width = Math.round(w * dpr);
			c.height = Math.round(h * dpr);
		}
	}

	/** Artboard → screen. */
	function place(c: Cam, x: number, y: number) {
		return { x: w / 2 + (x - c.x) * c.k, y: h / 2 + (y - c.y) * c.k };
	}

	function disc(x: number, y: number, r: number) {
		tint.beginPath();
		tint.arc(x, y, r, 0, Math.PI * 2);
	}

	function draw(f: Frame) {
		const { cam, accent } = f;
		const k = cam.k * dpr;
		const toArtboard = (c: CanvasRenderingContext2D) =>
			c.setTransform(k, 0, 0, k, (w / 2 - cam.x * cam.k) * dpr, (h / 2 - cam.y * cam.k) * dpr);

		for (const c of [line, tint]) {
			c.setTransform(1, 0, 0, 1, 0, 0);
			c.clearRect(0, 0, ink.width, ink.height);
			c.lineCap = 'round';
			c.lineJoin = 'round';
		}
		toArtboard(line);
		toArtboard(tint);

		const width = Math.min(7, Math.max(2, 2.5 * cam.k)) * fine;
		const g = paramAt(stroke, f.frac);
		const live = 1 - f.rest;

		if (f.gem > 0) {
			tint.beginPath();
			trace(tint, stroke, stroke.gem.from, stroke.gem.to);
			tint.closePath();
			tint.globalAlpha = f.gem;
			tint.fillStyle = accent;
			tint.fill();
		}

		if (g > 0) {
			line.lineWidth = width / cam.k;
			line.strokeStyle = '#fff';
			line.beginPath();
			trace(line, stroke, 0, g);
			line.stroke();

			// Fresh ink: the last stretch behind the pen is still wet.
			if (live > 0.01) {
				const reach = TAIL / cam.k / stroke.length;
				tint.strokeStyle = accent;
				let a = paramAt(stroke, f.frac - reach);
				for (let s = 1; s <= TAIL_STEPS; s++) {
					const b = s === TAIL_STEPS ? g : paramAt(stroke, f.frac - reach * (1 - s / TAIL_STEPS));
					const age = s / TAIL_STEPS;
					tint.globalAlpha = age * age * live;
					tint.lineWidth = (width * (1 + 0.35 * age)) / cam.k;
					tint.beginPath();
					trace(tint, stroke, a, b);
					tint.stroke();
					a = b;
				}
			}
		}

		// The rest keeps its size at any zoom.
		tint.setTransform(dpr, 0, 0, dpr, 0, 0);
		tint.fillStyle = accent;
		tint.globalAlpha = 1;

		const s = place(cam, stroke.start.x, stroke.start.y);
		if (s.x > -f.dot && s.x < w + f.dot && s.y > -f.dot && s.y < h + f.dot) {
			disc(s.x, s.y, Math.max(2.2, f.dot));
			tint.fill();
		}

		if (g <= 0) return;
		pointAt(stroke, f.frac, tip);
		const p = place(cam, tip.x, tip.y);

		if (live > 0.01) {
			if (accent !== haloColor) {
				halo = tint.createRadialGradient(0, 0, 0, 0, 0, HALO);
				halo.addColorStop(0, accent);
				halo.addColorStop(1, 'transparent');
				haloColor = accent;
			}
			tint.globalAlpha = 0.28 * live;
			tint.fillStyle = halo!;
			tint.translate(p.x, p.y);
			disc(0, 0, HALO);
			tint.fill();
			tint.translate(-p.x, -p.y);

			tint.globalAlpha = (0.55 + 0.45 * f.retrace) * live;
			tint.strokeStyle = accent;
			tint.lineWidth = 1;
			disc(p.x, p.y, 15 - 3 * f.retrace);
			tint.stroke();
			tint.fillStyle = accent;
		}
		tint.globalAlpha = 1 - 0.7 * f.retrace * live;
		disc(p.x, p.y, 5.4 + (f.stop - 5.4) * f.rest);
		tint.fill();
	}

	return { resize, draw, place };
}
