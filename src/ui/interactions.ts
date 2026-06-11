/** Extra premium micro-interactions: magnetic controls, click ripples and page light beam. */
export function initInteractions(reducedMotion: boolean): void {
  if (reducedMotion) return;
  initMagnetic();
  initRipples();
  initPointerAura();
}

function initMagnetic(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.addEventListener('pointermove', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    target.style.setProperty('--mag-x', `${dx * 0.12}px`);
    target.style.setProperty('--mag-y', `${dy * 0.12}px`);
  }, { passive: true });

  document.addEventListener('pointerout', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
    if (!target) return;
    target.style.setProperty('--mag-x', '0px');
    target.style.setProperty('--mag-y', '0px');
  }, { passive: true });
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
  if (!window.matchMedia('(pointer: fine)').matches) return;
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--px', `${e.clientX}px`);
      document.documentElement.style.setProperty('--py', `${e.clientY}px`);
    });
  }, { passive: true });
}
