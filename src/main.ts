import './styles/main.css';
import { renderContent } from './ui/render';
import { initScroll } from './ui/scroll';
import { initReveals } from './ui/reveal';
import { initTilt } from './ui/tilt';
import { initCursor } from './ui/cursor';
import { initProjectCases } from './ui/projects';
import { initContactForm } from './ui/contact';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 1. Inject dynamic content first so reveals/tilt can bind to it. */
renderContent();

/* 2. UI layer (works even if WebGL fails). */
initReveals(reducedMotion);
initTilt(reducedMotion);
initCursor(reducedMotion);
initProjectCases();
initContactForm();

/* 3. WebGL layer — lazy-loaded so the UI paints instantly. */
const canvas = document.getElementById('gl') as HTMLCanvasElement;
const fpsLabel = document.getElementById('hero-fps');

async function boot(): Promise<void> {
  try {
    const { Experience } = await import('./webgl/Experience');
    const experience = new Experience({
      canvas,
      reducedMotion,
      onFps: (fps) => {
        if (fpsLabel) fpsLabel.textContent = `${fps} fps`;
      },
    });

    initScroll(reducedMotion, {
      onProgress: (p) => experience.setScroll(p),
      onSection: (name) => experience.setSection(name),
    });

    if (reducedMotion) experience.renderOnce();
    else experience.start();
  } catch (err) {
    // WebGL unavailable → static dark page still works.
    console.warn('WebGL experience disabled:', err);
    canvas.remove();
    initScroll(reducedMotion, { onProgress: () => {}, onSection: () => {} });
  } finally {
    hideLoader();
  }
}

/* Loader: counts up while the three.js chunk loads. */
const loader = document.getElementById('loader');
const counter = document.getElementById('loader-count');
let progress = 0;
const fakeProgress = setInterval(() => {
  progress = Math.min(progress + Math.random() * 14, 92);
  if (counter) counter.textContent = String(Math.floor(progress));
}, 90);

function hideLoader(): void {
  clearInterval(fakeProgress);
  if (counter) counter.textContent = '100';
  setTimeout(() => {
    loader?.classList.add('loader--done');
    document.body.classList.add('is-ready');
    setTimeout(() => loader?.remove(), 900);
  }, 250);
}

boot();
