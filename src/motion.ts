/**
 * Frame-rate independent smoothing shared by the WebGL scene and UI rAF loops.
 *
 * A per-frame lerp factor is a rate per *frame*, so the same interaction reacts
 * twice as fast at 120 Hz as at 60 Hz. A rate per second plus elapsed seconds
 * describes the same wall-clock response regardless of how many frames happened
 * to be drawn in that interval.
 */
export function approach(rate: number, delta: number): number {
  return 1 - Math.exp(-rate * Math.max(0, delta));
}

/** Clamp a requestAnimationFrame timestamp delta so a resumed tab cannot jump. */
export function frameDelta(nowMs: number, previousMs: number, maxDelta = 0.1): number {
  if (!Number.isFinite(previousMs) || previousMs <= 0) return 0;
  return Math.min(maxDelta, Math.max(0, (nowMs - previousMs) / 1000));
}

/** Rates that reproduce the UI's former 60 Hz factors without depending on Hz. */
export const UI_TILT_RATE = 7.67; // 0.12 per frame at 60 Hz
export const UI_POINTER_RATE = 10.46; // 0.16 per frame at 60 Hz
