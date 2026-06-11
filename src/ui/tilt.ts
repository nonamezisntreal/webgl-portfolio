/**
 * 3D tilt + cursor-tracked glow for cards marked with `data-tilt`.
 * Pointer-fine devices only; cheap (transform + 2 custom props).
 */
export function initTilt(reducedMotion: boolean): void {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-tilt]:not([data-tilt-bound])');

  for (const card of cards) {
    card.dataset.tiltBound = 'true';
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 8;
        const ry = (px - 0.5) * 10;
        card.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      card.style.transform = '';
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
  }
}
