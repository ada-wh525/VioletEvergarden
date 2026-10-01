import type { Cam } from './camera';
import { ART, fracAt, paramAt, pointAt, timeAt, trace, type Stroke } from './path';
import { createRenderer, type Frame } from './renderer';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Split only at existing cubic endpoints; control points stay untouched. */
export function planPens(stroke: Stroke) {
  const count = (stroke.curves.length - 2) / 6;
  const cuts = [0, Math.round(paramAt(stroke, fracAt(1 / 3))), Math.round(paramAt(stroke, fracAt(2 / 3))), count];
  const fractionAtVertex = (vertex: number) => {
    if (vertex === count) return 1;
    const index = stroke.param.findIndex(value => value === vertex);
    return stroke.cum[index] / stroke.length;
  };
  return cuts.slice(0, -1).map((from, index) => {
    const to = cuts[index + 1];
    return {
      from, to, delay: index * .045,
      startTime: timeAt(fractionAtVertex(from)),
      endTime: timeAt(fractionAtVertex(to)),
    };
  });
}

export function parallelCamera(width: number, height: number) {
  const fit = Math.min(width * .84 / ART.w, height * .82 / ART.h);
  const last: Cam = { x: ART.w / 2 - width * .035 / fit, y: ART.h / 2 + height * .015 / fit, k: fit };
  const first = { ...last, k: fit * .94 };
  return {
    first, last,
    at(progress: number): Cam {
      const t = clamp(progress);
      const ease = t * t * (3 - 2 * t);
      return { ...last, k: first.k + (fit - first.k) * ease };
    },
  };
}

export function createParallelRenderer(ink: HTMLCanvasElement, glow: HTMLCanvasElement, stroke: Stroke) {
  const original = createRenderer(ink, glow, stroke);
  const line = ink.getContext('2d')!;
  const tint = glow.getContext('2d')!;
  const pens = planPens(stroke);
  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize(w: number, h: number) {
    width = w;
    height = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    original.resize(w, h);
  }

  function draw(frame: Frame & { progress: number }) {
    if (frame.progress >= 1) {
      original.draw({ ...frame, frac: 1, rest: 1, gem: 1, dot: 3, stop: 5.4 });
      return;
    }
    const { cam, accent } = frame;
    for (const ctx of [line, tint]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ink.width, ink.height);
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setTransform(cam.k * dpr, 0, 0, cam.k * dpr, (width / 2 - cam.x * cam.k) * dpr, (height / 2 - cam.y * cam.k) * dpr);
    }
    const thickness = Math.min(7, Math.max(2, 2.5 * cam.k)) * Math.min(1, .45 + width / 1800);
    const active = pens.map(pen => {
      const progress = clamp((frame.progress - pen.delay) / (1 - pen.delay));
      const time = pen.startTime + (pen.endTime - pen.startTime) * progress;
      const fraction = fracAt(time);
      return { ...pen, progress, fraction, end: Math.max(pen.from, Math.min(pen.to, paramAt(stroke, fraction))) };
    }).filter(pen => pen.progress > 0);

    // Merge touching ranges so completed joins have no extra round caps.
    const ranges: Array<{ from: number; to: number }> = [];
    for (const pen of active) {
      const previous = ranges[ranges.length - 1];
      if (previous && Math.abs(previous.to - pen.from) < 1e-8) previous.to = pen.end;
      else ranges.push({ from: pen.from, to: pen.end });
    }
    if (ranges.length) {
      line.beginPath();
      for (const range of ranges) trace(line, stroke, range.from, range.to);
      line.strokeStyle = '#fff';
      line.lineWidth = thickness / cam.k;
      line.stroke();
    }

    const gemPen = active.find(pen => pen.from <= stroke.gem.from && pen.to >= stroke.gem.to);
    if (gemPen && gemPen.end >= stroke.gem.to) {
      tint.beginPath();
      trace(tint, stroke, stroke.gem.from, stroke.gem.to);
      tint.closePath();
      tint.fillStyle = accent;
      tint.fill();
    }

    const fade = clamp((1 - frame.progress) / .045);
    for (const pen of active) {
      const reach = 160 / cam.k / stroke.length;
      let from = Math.max(pen.from, paramAt(stroke, pen.fraction - reach));
      tint.strokeStyle = accent;
      for (let step = 1; step <= 14; step++) {
        const to = Math.max(pen.from, Math.min(pen.end, paramAt(stroke, pen.fraction - reach * (1 - step / 14))));
        tint.globalAlpha = (step / 14) ** 2 * fade;
        tint.lineWidth = thickness / cam.k;
        tint.beginPath();
        trace(tint, stroke, from, to);
        tint.stroke();
        from = to;
      }
    }

    tint.setTransform(dpr, 0, 0, dpr, 0, 0);
    tint.globalAlpha = fade;
    tint.fillStyle = accent;
    for (const pen of active) {
      const tip = pointAt(stroke, pen.fraction);
      const x = width / 2 + (tip.x - cam.x) * cam.k;
      const y = height / 2 + (tip.y - cam.y) * cam.k;
      tint.beginPath();
      tint.arc(x, y, 3.5, 0, Math.PI * 2);
      tint.fill();
    }
  }

  return { resize, draw };
}
