import Lenis from 'lenis';

export interface ScrollCallbacks {
  onProgress: (progress: number) => void;
  /** 0 at rest, peaking halfway out of the hero: see crossing() below. */
  onPassage: (crossing: number) => void;
  onSection: (name: string) => void;
}

let activeLenis: Lenis | null = null;

/** Scroll to an element through the active smooth-scroll instance when there is one. */
export function scrollToElement(target: HTMLElement, reducedMotion: boolean): void {
  if (activeLenis) activeLenis.scrollTo(target, { offset: -90 });
  else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
}

/**
 * Smooth scroll (Lenis) + scroll progress + active section tracking.
 * Falls back to native scroll when reduced motion is preferred.
 */
export function initScroll(reducedMotion: boolean, callbacks: ScrollCallbacks): void {
  let lenis: Lenis | null = null;

  if (!reducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    activeLenis = lenis;

    const raf = (time: number) => {
      lenis!.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // progress
  const progressBar = document.getElementById('progress');
  const header = document.getElementById('header');
  const hero = document.getElementById('hero');

  /**
   * Leaving the hero is a passage, not a state: the weight rises as the hero
   * scrolls away and returns to nothing once the next section owns the view,
   * so scrolling back up plays it in reverse instead of leaving it stuck.
   */
  const crossing = (): number => {
    const span = hero?.offsetHeight ?? window.innerHeight;
    if (span <= 0) return 0;
    const travelled = Math.min(1, Math.max(0, window.scrollY / span));
    return Math.sin(Math.PI * travelled);
  };

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    callbacks.onProgress(p);
    callbacks.onPassage(crossing());
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    header?.classList.toggle('header--scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // active section → scene state + nav highlight
  const sections = document.querySelectorAll<HTMLElement>('[data-scene]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.header__nav a');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const name = (entry.target as HTMLElement).dataset.scene!;
        callbacks.onSection(name);
        navLinks.forEach((a) =>
          a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`),
        );
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  sections.forEach((s) => observer.observe(s));

  // anchor links through lenis
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -10 });
      else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      if (window.location.hash !== id) window.history.pushState(null, '', id);
      if (a.classList.contains('skip-link')) (target as HTMLElement).focus({ preventScroll: true });
    });
  });
}
