/**
 * 3D tilt + cursor-tracked glow for cards marked with `data-tilt`.
 * Rotation is lerped in a rAF loop and the CSS transform transition is
 * suppressed while the pointer is over the card — otherwise the 0.3-0.4s
 * hover transition fights every pointermove update and the card stutters.
 * Pointer-fine devices only; idempotent (re-render safe via data guard).
 */
export function initTilt(reducedMotion: boolean): void {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-tilt]:not([data-tilt-bound])');

  for (const card of cards) {
    card.dataset.tiltBound = 'true';
    let targetRX = 0;
    let targetRY = 0;
    let curRX = 0;
    let curRY = 0;
    let raf = 0;
    let inside = false;

    const tick = () => {
      curRX += (targetRX - curRX) * 0.12;
      curRY += (targetRY - curRY) * 0.12;

      if (inside || Math.abs(targetRX - curRX) + Math.abs(targetRY - curRY) > 0.02) {
        card.style.transform =
          `perspective(800px) rotateX(${curRX.toFixed(2)}deg) rotateY(${curRY.toFixed(2)}deg) translateY(${inside ? -4 : 0}px)`;
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        curRX = 0;
        curRY = 0;
        card.style.transform = '';
        card.style.transition = '';
      }
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    card.addEventListener('pointerenter', () => {
      inside = true;
      // Inline transforms are updated per-frame; keep other properties
      // (border, shadow) transitioning but never the transform itself.
      card.style.transition = 'border-color 0.35s, box-shadow 0.35s, background 0.35s';
      start();
    });

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetRX = (0.5 - py) * 7;
      targetRY = (px - 0.5) * 9;
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      start();
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      inside = false;
      targetRX = 0;
      targetRY = 0;
      start();
    });
  }
}
