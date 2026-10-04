import type { Cam } from './camera';
import { fracAt, pointAt, type Stroke } from './path';

export interface Spot {
	x: 'left' | 'right';
	y: 'top' | 'middle' | 'bottom';
	/** left, top, right, bottom, as shares of the screen. */
	box: [number, number, number, number];
}

const WIDE: Spot[] = [
	{ x: 'left', y: 'bottom', box: [0.03, 0.58, 0.46, 0.9] },
	{ x: 'right', y: 'top', box: [0.54, 0.1, 0.97, 0.42] },
	{ x: 'left', y: 'top', box: [0.03, 0.1, 0.46, 0.42] },
	{ x: 'right', y: 'bottom', box: [0.54, 0.58, 0.97, 0.9] },
	{ x: 'left', y: 'middle', box: [0.03, 0.34, 0.46, 0.66] },
	{ x: 'right', y: 'middle', box: [0.54, 0.34, 0.97, 0.66] }
];
const TALL: Spot[] = [
	{ x: 'left', y: 'top', box: [0, 0.08, 1, 0.3] },
	{ x: 'left', y: 'bottom', box: [0, 0.7, 1, 0.92] }
];

interface View {
	w: number;
	h: number;
	penTime: (t: number) => number;
	camera: (u: number) => Cam;
}

/** Puts each line of the letter in the emptiest spot while it is up, avoiding the last one. */
export function pickSpots(lines: { from: number; to: number }[], stroke: Stroke, view: View) {
	const { w, h } = view;
	const spots = w > h ? WIDE : TALL;
	const tip = { x: 0, y: 0 };
	let before = -1;

	return lines.map((line) => {
		const span = line.to - line.from;
		const scores = spots.map((spot, i) => (i === before ? 90 : 0) + (spot.y === 'middle' ? 60 : 0));

		for (const t of [line.from + span * 0.25, line.from + span * 0.55, line.to - span * 0.1]) {
			const u = view.penTime(t);
			const frac = fracAt(u);
			const { x, y, k } = view.camera(u);
			const drawn = Math.floor(frac * stroke.count);
			pointAt(stroke, frac, tip);

			spots.forEach(({ box }, i) => {
				const x0 = x + ((box[0] - 0.5) * w) / k;
				const x1 = x + ((box[2] - 0.5) * w) / k;
				const y0 = y + ((box[1] - 0.5) * h) / k;
				const y1 = y + ((box[3] - 0.5) * h) / k;
				for (let j = 0; j < drawn; j += 3) {
					const px = stroke.pts[j * 2];
					const py = stroke.pts[j * 2 + 1];
					if (px > x0 && px < x1 && py > y0 && py < y1) scores[i]++;
				}
				// The pen itself is the one thing a line must not sit on.
				if (tip.x > x0 && tip.x < x1 && tip.y > y0 && tip.y < y1) scores[i] += 120;
			});
		}

		before = scores.indexOf(Math.min(...scores));
		return spots[before];
	});
}
