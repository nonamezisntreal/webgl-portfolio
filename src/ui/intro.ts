/**
 * Stage beats, in ms from the moment the runtime is ready — not from
 * navigation. The bundle needs its own time to arrive, so every beat remains
 * interruptible and the final state is always the ordinary usable page.
 */
const IGNITION_AT = 0;
const TITLE_AT = 120;
const INTERFACE_AT = 380;
const CALM_AT = 1100;
/** A repeat visit in the same session gets the same beats, compressed. */
const REPEAT_SCALE = 0.26;
const SESSION_KEY = 'hero-intro';
/**
 * Any of these means the visitor is ahead of the intro, and it must step aside.
 * A plain `scroll` is not one of them: smooth scrolling and scroll restoration
 * both emit it on their own, which would cancel the activation instantly.
 */
const SKIP_EVENTS = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;

export interface IntroOptions {
  reducedMotion: boolean;
}

export interface Intro {
  /** End the activation now, leaving the page in its ordinary state. */
  skip(): void;
  /**
   * Attach the WebGL ignition when the scene is ready. If the ignition beat
   * already arrived, it is delivered once — unless the visitor already skipped.
   */
  bindIgnite(callback: () => void): void;
  /** Release timers and global listeners during page teardown. */
  dispose(): void;
  /** Whether the visitor has already acted, including before this bundle ran. */
  readonly engaged: boolean;
}

function hasBeenActive(): boolean {
  const activation: UserActivation | undefined = navigator.userActivation;
  return activation?.hasBeenActive ?? false;
}

function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* nothing to remember it with, so the next load simply plays it again */
  }
}

/**
 * Hero activation. The page is readable and clickable from the first frame —
 * this only choreographs how it arrives, and any real action from the visitor
 * ends it at once. The finished state is the page with no intro markers on it,
 * so ending early and ending on time land in exactly the same place.
 */
export function initIntro({ reducedMotion }: IntroOptions): Intro {
  const root = document.documentElement;
  const timers: number[] = [];
  let finished = false;
  let disposed = false;
  let acted = false;
  let ignitionPending = false;
  let ignitionFired = false;
  let ignite: (() => void) | null = null;

  const removeEngagementListeners = (): void => {
    for (const type of SKIP_EVENTS) window.removeEventListener(type, markActed);
  };

  const finish = (): void => {
    if (finished) return;
    finished = true;
    ignitionPending = false;
    for (const timer of timers) window.clearTimeout(timer);
    timers.length = 0;
    root.classList.remove('is-intro-title', 'is-intro-interface');
    delete root.dataset.intro;
  };

  const fireIgnition = (): void => {
    if (finished || ignitionFired || !ignitionPending || !ignite) return;
    ignitionFired = true;
    ignitionPending = false;
    ignite();
  };

  function markActed(): void {
    if (acted) return;
    acted = true;
    removeEngagementListeners();
    finish();
  }
  for (const type of SKIP_EVENTS) window.addEventListener(type, markActed, { passive: true });

  const intro: Intro = {
    skip: finish,
    bindIgnite(callback) {
      if (disposed) return;
      ignite = callback;
      fireIgnition();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      finish();
      removeEngagementListeners();
      ignite = null;
    },
    get engaged() {
      return acted || hasBeenActive();
    },
  };

  if (reducedMotion || hasBeenActive()) {
    rememberSession();
    return intro;
  }

  const scale = seenThisSession() ? REPEAT_SCALE : 1;
  rememberSession();
  root.dataset.intro = 'run';

  const at = (ms: number, step: () => void): void => {
    timers.push(window.setTimeout(step, ms * scale));
  };

  at(IGNITION_AT, () => {
    if (finished) return;
    ignitionPending = true;
    fireIgnition();
  });
  at(TITLE_AT, () => root.classList.add('is-intro-title'));
  at(INTERFACE_AT, () => root.classList.add('is-intro-interface'));
  at(CALM_AT, finish);

  return intro;
}
