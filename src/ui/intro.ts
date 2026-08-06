/**
 * Stage beats, in ms from the moment the runtime is ready — not from
 * navigation. The bundle needs its own time to arrive, and the hero is
 * invisible until it does, so beats measured from navigation would hold an
 * already-late page back even further.
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
  /** Fire the scene's activation pulse, if a scene is running at all. */
  onIgnite: () => void;
}

export interface Intro {
  /** End the activation now, leaving the page in its ordinary state. */
  skip(): void;
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

/** Storage is unreachable in some privacy modes; a missed flag only costs one replay. */
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
export function initIntro({ reducedMotion, onIgnite }: IntroOptions): Intro {
  const root = document.documentElement;
  const timers: number[] = [];
  let finished = false;
  let acted = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    for (const timer of timers) window.clearTimeout(timer);
    timers.length = 0;
    root.classList.remove('is-intro-title', 'is-intro-interface');
    delete root.dataset.intro;
  };

  /* This outlives the activation: the rest of the page needs to know whether
     the visitor ever acted, not only whether they cut the intro short. */
  const markActed = (): void => {
    if (acted) return;
    acted = true;
    for (const type of SKIP_EVENTS) window.removeEventListener(type, markActed);
    finish();
  };
  for (const type of SKIP_EVENTS) window.addEventListener(type, markActed, { passive: true });

  const intro: Intro = {
    skip: finish,
    get engaged() {
      return acted || hasBeenActive();
    },
  };

  // a visitor who already pressed something is not waiting to be introduced
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

  at(IGNITION_AT, onIgnite);
  at(TITLE_AT, () => root.classList.add('is-intro-title'));
  at(INTERFACE_AT, () => root.classList.add('is-intro-interface'));
  at(CALM_AT, finish);

  return intro;
}
