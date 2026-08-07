/**
 * Frame-rate independent smoothing.
 *
 * A per-frame lerp factor is a rate per *frame*, so the same scene reacts twice
 * as fast on a 120Hz display as on a 60Hz one, and half as fast again when the
 * machine is struggling — the one place the feel should not be decided. Given a
 * rate per second this returns how far to move toward the target in `delta`
 * seconds, which lands on the same place at any frame rate.
 *
 * The decays already work this way (`Math.exp(-delta * rate)`); this is the
 * approach half of the same idea. Every rate in the scene is the one that
 * reproduces at 60Hz the per-frame factor it replaced, so nothing that was
 * tuned by eye has moved — it just stopped depending on the display.
 */
export function approach(rate: number, delta: number): number {
  return 1 - Math.exp(-rate * delta);
}
