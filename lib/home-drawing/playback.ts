import { RELEASES } from './releases';

export const INTRO_TIME = 2150;
export const DRAWING_TIME = 28000;
export const RELEASE_DISPLAY_TIME = 4000;
export const SCRUB_TIME = 900;
const cuts = [0, INTRO_TIME, ...RELEASES.flatMap(({ from, to }) => [INTRO_TIME + from * DRAWING_TIME, INTRO_TIME + to * DRAWING_TIME]), INTRO_TIME + DRAWING_TIME];

/** Retiming only: keep the original route, camera and card timeline in lockstep. */
export const PLAYBACK_SEGMENTS = cuts.slice(0, -1).map((from, i) => {
  const to = cuts[i + 1];
  const middle = ((from + to) / 2 - INTRO_TIME) / DRAWING_TIME;
  const reading = RELEASES.some(release => middle >= release.from && middle < release.to);
  const speed = i === 0 ? 1 : reading ? (to - from) / RELEASE_DISPLAY_TIME : 1.1;
  return { from, to, reading, speed, duration: (to - from) / speed };
});
export const PLAYBACK_DURATION = PLAYBACK_SEGMENTS.reduce((sum, segment) => sum + segment.duration, 0);

export function drawingTimeAt(playbackTime: number) {
  let remaining = Math.max(0, playbackTime);
  for (const segment of PLAYBACK_SEGMENTS) {
    if (remaining < segment.duration) return segment.from + remaining * segment.speed;
    remaining -= segment.duration;
  }
  return INTRO_TIME + DRAWING_TIME;
}
