/**
 * Scroll-driven reveal animations via IntersectionObserver.
 * Elements opt in with `data-rv`; stagger order with `--i` custom property.
 */
export function initReveals(reducedMotion: boolean): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-rv]');

  if (reducedMotion) {
    elements.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );

  elements.forEach((el) => observer.observe(el));
}
