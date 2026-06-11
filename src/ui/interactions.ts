/**
 * Extra premium micro-interactions: magnetic controls, click ripples, page light beam.
 * All continuous motion is lerped in rAF loops — no CSS transition fighting,
 * no snapping when the pointer crosses child elements.
 */
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

export function initInteractions(reducedMotion: boolean): void {
  if (reducedMotion) return;
  bindMagnetic();
  initRipples();
  initPointerAura();
}

/**
 * Magnetic pull for `[data-magnetic]` elements.
 * Idempotent — safe to call again after content re-renders (locale switch).
 */
export function bindMagnetic(): void {
  if (!FINE_POINTER) return;

  const els = document.querySelectorAll<HTMLElement>('[data-magnetic]:not([data-magnetic-bound])');

  for (const el of els) {
    el.dataset.magneticBound = 'true';
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let inside = false;

    const tick = () => {
      curX += (targetX - curX) * 0.16;
      curY += (targetY - curY) * 0.16;
      el.style.setProperty('--mag-x', `${curX.toFixed(2)}px`);
      el.style.setProperty('--mag-y', `${curY.toFixed(2)}px`);

      if (inside || Math.abs(targetX - curX) + Math.abs(targetY - curY) > 0.15) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        curX = 0;
        curY = 0;
        el.style.setProperty('--mag-x', '0px');
        el.style.setProperty('--mag-y', '0px');
      }
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    el.addEventListener('pointerenter', () => {
      inside = true;
      start();
    });

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      targetX = (e.clientX - (rect.left + rect.width / 2)) * 0.14;
      targetY = (e.clientY - (rect.top + rect.height / 2)) * 0.14;
      start();
    }, { passive: true });

    el.addEventListener('pointerleave', () => {
      inside = false;
      targetX = 0;
      targetY = 0;
      start();
    });
  }
}

function initRipples(): void {
  document.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.btn, .project, .skill, .contact__link, .lang-toggle');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'interaction-ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

function initPointerAura(): void {
  if (!FINE_POINTER) return;
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--px', `${e.clientX}px`);
      document.documentElement.style.setProperty('--py', `${e.clientY}px`);
    });
  }, { passive: true });
}
