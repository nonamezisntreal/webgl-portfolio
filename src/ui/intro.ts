/**
 * Hero activation, runtime side.
 *
 * The hero's own arrival is stylesheet work: it plays from the first painted
 * frame, so the page reads the same whether the bundle is fast, slow or never
 * arrives. What still needs JavaScript is the beat the scene owns — the WebGL
 * layer cannot announce itself before its own code exists — and the record of
 * whether the visitor has already acted, which the rest of the page reads.
 */

/**
 * Any of these means the visitor is ahead of the activation, and it must step
 * aside. A plain `scroll` is not one of them: smooth scrolling and scroll
 * restoration both emit it on their own.
 */
const SKIP_EVENTS = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;

export interface IntroOptions {
  reducedMotion: boolean;
}

export interface Intro {
  /** End the activation now; a scene that binds later stays quiet. */
  skip(): void;
  /**
   * Hand the scene's ignition over. It is delivered once, at the moment the
   * scene is ready, and never after the visitor has taken over.
   */
  bindIgnite(callback: () => void): void;
  /** Release global listeners during page teardown. */
  dispose(): void;
  /** Whether the visitor has already acted, including before this bundle ran. */
  readonly engaged: boolean;
}

/**
 * The platform keeps its own sticky record of user gestures, which is the only
 * way to know about presses that landed while the bundle was still loading.
 * Not every engine exposes it, hence the guard: our own listener is the
 * portable path, and it only misses the window before this module ran.
 */
function hasBeenActive(): boolean {
  const activation: UserActivation | undefined = navigator.userActivation;
  return activation?.hasBeenActive ?? false;
}

export function initIntro({ reducedMotion }: IntroOptions): Intro {
  let acted = false;
  let finished = false;
  let ignited = false;

  const removeEngagementListeners = (): void => {
    for (const type of SKIP_EVENTS) window.removeEventListener(type, markActed);
  };

  const finish = (): void => {
    finished = true;
  };

  /* This outlives the activation: the rest of the page needs to know whether
     the visitor ever acted, not only whether they cut the activation short. */
  function markActed(): void {
    if (acted) return;
    acted = true;
    removeEngagementListeners();
    finish();
  }
  for (const type of SKIP_EVENTS) window.addEventListener(type, markActed, { passive: true });

  // a visitor who already pressed something is not waiting to be introduced
  if (reducedMotion || hasBeenActive()) finish();

  return {
    skip: finish,
    bindIgnite(callback) {
      if (finished || ignited) return;
      ignited = true;
      callback();
    },
    dispose() {
      finish();
      removeEngagementListeners();
    },
    get engaged() {
      return acted || hasBeenActive();
    },
  };
}
