import Lenis from 'lenis';

export interface ScrollCallbacks {
  onProgress: (progress: number) => void;
  onSection: (name: string) => void;
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

    const raf = (time: number) => {
      lenis!.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // progress
  const progressBar = document.getElementById('progress');
  const header = document.getElementById('header');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    callbacks.onProgress(p);
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
    });
  });
}
