const REVEAL_THRESHOLD = 0.15;
const BOTTOM_EXCLUSION = 0.08;

interface RevealGeometry {
  visible: boolean;
  ratio: number;
  maxRatio: number;
}

/**
 * Match the IntersectionObserver's 8% bottom exclusion while also answering a
 * liveness question IO alone cannot: can this element ever reach 15% inside the
 * effective root at its current size?
 */
function revealGeometry(element: HTMLElement): RevealGeometry {
  const rect = element.getBoundingClientRect();
  const rootWidth = Math.max(0, window.innerWidth);
  const rootHeight = Math.max(0, window.innerHeight * (1 - BOTTOM_EXCLUSION));
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  if (area === 0 || rootWidth === 0 || rootHeight === 0) return { visible: false, ratio: 0, maxRatio: 0 };

  const visibleWidth = Math.max(0, Math.min(rect.right, rootWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, rootHeight) - Math.max(rect.top, 0));
  const visibleArea = visibleWidth * visibleHeight;
  const maxVisibleArea = Math.min(rect.width, rootWidth) * Math.min(rect.height, rootHeight);
  return {
    visible: visibleArea > 0,
    ratio: visibleArea / area,
    maxRatio: maxVisibleArea / area,
  };
}

/**
 * IntersectionObserver-based scroll reveals. The stylesheet is readable by
 * default; only runtime-armed content below the fold may be held back.
 */
export function initReveals(reducedMotion: boolean): void {
  if (reducedMotion) return;

  const armed = new Set<HTMLElement>();
  let resizeListening = false;

  const release = (element: HTMLElement): void => {
    if (!armed.delete(element)) return;
    element.classList.add('in');
    observer.unobserve(element);
    resizeObserver.unobserve(element);
    if (armed.size === 0 && resizeListening) {
      resizeListening = false;
      window.removeEventListener('resize', checkAll);
    }
  };

  const releaseIfReady = (element: HTMLElement): boolean => {
    const geometry = revealGeometry(element);
    if (!geometry.visible) return false;
    // Keep the designed 15% semantics for ordinary elements. If current
    // geometry makes 15% mathematically impossible, any real visibility is the
    // bounded fallback that guarantees an armed element can eventually escape.
    if (geometry.ratio + 1e-6 >= REVEAL_THRESHOLD || geometry.maxRatio + 1e-6 < REVEAL_THRESHOLD) {
      release(element);
      return true;
    }
    return false;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        releaseIfReady(entry.target as HTMLElement);
      }
    },
    { threshold: [0, REVEAL_THRESHOLD], rootMargin: '0px 0px -8% 0px' },
  );

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) releaseIfReady(entry.target as HTMLElement);
  });

  function checkAll(): void {
    for (const element of [...armed]) releaseIfReady(element);
  }

  for (const element of document.querySelectorAll<HTMLElement>('[data-rv]')) {
    // Content already in the viewport belongs to the first usable frame. Never
    // take it away merely so the runtime can animate it back in.
    if (element.getBoundingClientRect().top < window.innerHeight) continue;
    element.classList.add('reveal--armed');
    armed.add(element);
    observer.observe(element);
    resizeObserver.observe(element);
  }

  if (armed.size > 0) {
    resizeListening = true;
    window.addEventListener('resize', checkAll, { passive: true });
  }
}
