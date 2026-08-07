/**
 * Scroll-driven reveal animations via IntersectionObserver.
 * Elements opt in with `data-rv`; stagger order with `--i` custom property.
 *
 * The runtime does the hiding, not the stylesheet: nothing is held back unless
 * this code is here to let it go again, so a bundle that is slow, blocked or
 * broken leaves the page readable instead of blank. What is already on screen
 * is never armed — it is visible, and taking it away to bring it back would be
 * a flicker, not a reveal.
 */
export function initReveals(reducedMotion: boolean): void {
  if (reducedMotion) return;

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

  for (const element of document.querySelectorAll<HTMLElement>('[data-rv]')) {
    if (element.getBoundingClientRect().top < window.innerHeight) continue;
    element.classList.add('reveal--armed');
    observer.observe(element);
  }
}
