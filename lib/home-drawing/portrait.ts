import { ART } from './path';

/** Match object-fit: contain in the homepage portrait frame, at every viewport. */
export function portraitBox(rect: { left: number; top: number; width: number; height: number }) {
  const scale = Math.min(rect.width / ART.w, rect.height / ART.h);
  return {
    left: rect.left + (rect.width - ART.w * scale) / 2,
    top: rect.top + (rect.height - ART.h * scale) / 2,
    width: ART.w * scale,
    height: ART.h * scale,
    scale,
  };
}
