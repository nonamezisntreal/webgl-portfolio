/**
 * Custom cursor: instant dot + lagging glow ring.
 * Enabled only on pointer-fine devices without reduced motion.
 */
export function initCursor(reducedMotion: boolean): void {
  const root = document.getElementById('cursor');
  if (!root) return;

  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) {
    root.remove();
    return;
  }

  document.body.classList.add('has-custom-cursor');

  const dot = root.querySelector<HTMLElement>('.cursor__dot')!;
  const ring = root.querySelector<HTMLElement>('.cursor__ring')!;

  let x = -100, y = -100;
  let rx = -100, ry = -100;

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  const loop = () => {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // grow on interactive elements
  document.addEventListener('pointerover', (e) => {
    const interactive = (e.target as HTMLElement).closest('[data-cursor="link"], a, button, input, textarea, [data-tilt]');
    root.classList.toggle('cursor--active', !!interactive);
  });
}
