import { VIOLET_OUTLINE, VIOLET_RUNS } from "./violet-outline";

// Adapted from the supplied violet-main source's stroke/path.ts and camera.ts.
// The lettering anchor is replaced by an empty area of the homepage paper.
const ART = { width: 1086, height: 1448 };
const SAMPLES = 960;
const CALM = .032 * SAMPLES;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (start: number, end: number, amount: number) => start + (end - start) * amount;
const settle = (value: number) => {
  const t = clamp((value - .85) / (.995 - .85));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Retreading finished edges takes a quarter of the time of drawing new ink.
const weights = VIOLET_RUNS.map((run) => (run.to - run.from) / (run.kind === "retrace" ? 4 : 1));
const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
let elapsedWeight = 0;
const runs = VIOLET_RUNS.map((run, index) => {
  const start = elapsedWeight / totalWeight;
  elapsedWeight += weights[index];
  return { ...run, start, end: elapsedWeight / totalWeight };
});

export function drawingFraction(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let left = 0;
  let right = runs.length - 1;
  while (left < right) {
    const middle = (left + right) >> 1;
    if (runs[middle].end < progress) left = middle + 1;
    else right = middle;
  }
  const run = runs[left];
  return mix(run.from, run.to, (progress - run.start) / (run.end - run.start || 1));
}

function cubic(curves: Float32Array, segment: number, coordinate: number, t: number) {
  const j = segment * 6 + coordinate;
  const a = mix(curves[j], curves[j + 2], t);
  const b = mix(curves[j + 2], curves[j + 4], t);
  const c = mix(curves[j + 4], curves[j + 6], t);
  return mix(mix(a, b, t), mix(b, c, t), t);
}

function blur(source: Float32Array, sigma: number) {
  const reach = Math.ceil(sigma * 3);
  const weights = Array.from({ length: reach * 2 + 1 }, (_, index) => Math.exp(-((index - reach) ** 2) / (2 * sigma * sigma)));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return Float32Array.from(source, (_, index) => {
    let value = 0;
    for (let delta = -reach; delta <= reach; delta++) {
      value += source[Math.max(0, Math.min(source.length - 1, index + delta))] * weights[delta + reach];
    }
    return value / sum;
  });
}

export function createDrawingCamera() {
  const coordinates = VIOLET_OUTLINE.match(/-?\d*\.?\d+/g)!.map(Number);
  const curves = Float32Array.from(coordinates);
  const segments = (curves.length - 2) / 6;
  const distances = [0];
  const parameters = [0];
  let previousX = coordinates[0];
  let previousY = coordinates[1];
  let length = 0;
  let gemDistance = 0;
  for (let segment = 0; segment < segments; segment++) {
    for (let step = 1; step <= 12; step++) {
      const t = step / 12;
      const x = cubic(curves, segment, 0, t);
      const y = cubic(curves, segment, 1, t);
      length += Math.hypot(x - previousX, y - previousY);
      distances.push(length);
      parameters.push(segment + t);
      previousX = x;
      previousY = y;
    }
    if (segment === 609) gemDistance = length;
  }
  const cumulative = Float32Array.from(distances);
  const param = Float32Array.from(parameters);
  const gemDoneAt = gemDistance / length;

  // Samples measure distance; the pen itself stays on the actual cubic curves.
  function pointAt(fraction: number) {
    const distance = clamp(fraction) * length;
    let left = 0;
    let right = cumulative.length - 1;
    while (right - left > 1) {
      const middle = (left + right) >> 1;
      if (cumulative[middle] <= distance) left = middle;
      else right = middle;
    }
    const parameter = distance >= length ? segments : mix(param[left], param[right], (distance - cumulative[left]) / (cumulative[right] - cumulative[left] || 1));
    const segment = Math.min(Math.floor(parameter), segments - 1);
    const t = parameter - segment;
    return { x: cubic(curves, segment, 0, t), y: cubic(curves, segment, 1, t) };
  }

  const tipX = new Float32Array(SAMPLES);
  const tipY = new Float32Array(SAMPLES);
  for (let index = 0; index < SAMPLES; index++) {
    const pen = pointAt(drawingFraction(index / (SAMPLES - 1)));
    tipX[index] = pen.x;
    tipY[index] = pen.y;
  }
  const cx = blur(tipX, CALM);
  const cy = blur(tipY, CALM);
  let viewport = { width: 0, height: 0, zoom: new Float32Array(SAMPLES) };

  function zoomFor(width: number, height: number, fit: number) {
    if (viewport.width === width && viewport.height === height) return viewport.zoom;
    const near = Float32Array.from(tipX, (_, index) => {
      const hold = Math.min(width * .4 / (Math.abs(tipX[index] - cx[index]) + 1), height * .37 / (Math.abs(tipY[index] - cy[index]) + 1));
      return Math.log(Math.min(fit * 4.6, Math.max(fit * 1.5, hold)));
    });
    // Anticipate sharp changes before smoothing the zoom in logarithmic space.
    const soon = Math.round(CALM * .9);
    const wide = Float32Array.from(near, (_, index) => {
      let lowest = Infinity;
      for (let n = Math.max(0, index - soon); n <= Math.min(SAMPLES - 1, index + soon); n++) lowest = Math.min(lowest, near[n]);
      return lowest;
    });
    viewport = { width, height, zoom: blur(wide, CALM * .75) };
    return viewport.zoom;
  }

  return {
    length,
    frame(progress: number, width: number, height: number) {
      const u = clamp(progress);
      const fraction = drawingFraction(u);
      const pen = pointAt(fraction);
      const fit = Math.min(width * .88 / ART.width, height * .84 / ART.height);
      const zoom = zoomFor(width, height, fit);
      const index = u * (SAMPLES - 1);
      const a = Math.floor(index);
      const b = Math.min(SAMPLES - 1, a + 1);
      const t = index - a;
      const firstScale = 1.25 * Math.max(width, height * .7) / 340;
      const firstX = coordinates[0] - width * .04 / firstScale;
      const firstY = coordinates[1] + height * .05 / firstScale;
      const leave = 1 - (1 - Math.min(1, u / .06)) ** 3;
      const arrive = settle(u);
      const x = mix(firstX, mix(cx[a], cx[b], t), leave);
      const y = mix(firstY, mix(cy[a], cy[b], t), leave);
      const logScale = mix(Math.log(firstScale), mix(zoom[a], zoom[b], t), leave);
      const scale = Math.exp(mix(logScale, Math.log(fit), arrive));
      return {
        fraction, pen, scale,
        x: mix(x, ART.width / 2 - (width > height ? .07 : .035) * width / fit, arrive),
        y: mix(y, ART.height / 2 + .015 * height / fit, arrive),
        gemOpacity: clamp((fraction - gemDoneAt) / .012),
        lineWidth: Math.min(7, Math.max(2, 2.5 * scale)) * Math.min(1, .45 + width / 1800),
        tail: Math.min(fraction, 120 / scale / length),
      };
    },
  };
}
