import './styles/main.css';
import { getCopy, type Locale } from './content';
import { renderContent } from './ui/render';
import { initScroll } from './ui/scroll';
import { initReveals } from './ui/reveal';
import { initTilt } from './ui/tilt';
import { initCursor } from './ui/cursor';
import { initProjectCases } from './ui/projects';
import { initContactForm } from './ui/contact';
import { initInteractions, bindMagnetic } from './ui/interactions';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOCALE_KEY = 'hazard-locale';
let locale: Locale = readInitialLocale();

function readInitialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  return saved === 'en' || saved === 'ru' ? saved : 'ru';
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtml(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function setPlaceholder(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.placeholder = value;
}

function applyLocale(nextLocale: Locale): void {
  locale = nextLocale;
  localStorage.setItem(LOCALE_KEY, locale);
  const t = getCopy(locale);

  document.documentElement.lang = locale;
  document.title = t.meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', t.meta.description);

  setText('loader-label', t.loaderLabel);
  setText('nav-about', t.nav.about);
  setText('nav-projects', t.nav.projects);
  setText('nav-skills', t.nav.skills);
  setText('nav-contact', t.nav.contact);
  setText('nav-cta', t.nav.cta);

  setText('hero-eyebrow', t.hero.eyebrow);
  setText('hero-line-1', t.hero.line1);
  setText('hero-line-2', t.hero.line2);
  setHtml('hero-tagline', t.hero.tagline);
  setHtml('hero-primary', `${t.hero.primary} <span class="btn__arrow">→</span>`);
  setText('hero-secondary', t.hero.secondary);
  setText('hero-scroll', t.hero.scroll);
  setText('hero-meta', t.hero.meta);

  setText('about-title', t.about.title);
  setHtml('about-lead', t.about.lead);
  setText('about-body', t.about.body);
  setText('about-quote', t.about.quote);
  setText('about-card-performance-title', t.about.cards.performance.title);
  setText('about-card-performance-text', t.about.cards.performance.text);
  setText('about-card-creativity-title', t.about.cards.creativity.title);
  setText('about-card-creativity-text', t.about.cards.creativity.text);
  setText('about-card-architecture-title', t.about.cards.architecture.title);
  setText('about-card-architecture-text', t.about.cards.architecture.text);

  setText('projects-title', t.projectsTitle);
  setText('skills-title', t.skillsTitle);
  setText('contact-title', t.contact.title);
  setHtml('contact-pitch', t.contact.pitch);
  setText('contact-text', t.contact.text);
  setText('form-name-label', t.contact.form.name);
  setText('form-email-label', t.contact.form.email);
  setText('form-message-label', t.contact.form.message);
  setPlaceholder('form-name-input', t.contact.form.namePlaceholder);
  setPlaceholder('form-email-input', t.contact.form.emailPlaceholder);
  setPlaceholder('form-message-input', t.contact.form.messagePlaceholder);
  setHtml('form-submit', `${t.contact.form.submit} <span class="btn__arrow">→</span>`);
  setText('contact-sent', t.contact.form.sent);
  setText('footer-built', t.footer.built);
  setText('footer-top', t.footer.top);

  document.querySelectorAll('[data-lang-pill]').forEach((pill) => {
    pill.classList.toggle('is-active', (pill as HTMLElement).dataset.langPill === locale);
  });

  renderContent(locale);
  initTilt(reducedMotion);
  if (!reducedMotion) bindMagnetic();
}

function initLanguageSwitch(): void {
  const toggle = document.getElementById('lang-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    applyLocale(locale === 'ru' ? 'en' : 'ru');
  });
}

/* 1. Inject localized dynamic content first so reveals/tilt can bind to it. */
applyLocale(locale);
initLanguageSwitch();

/* 2. UI layer (works even if WebGL fails). */
initReveals(reducedMotion);
initTilt(reducedMotion);
initCursor(reducedMotion);
initInteractions(reducedMotion);
initProjectCases(() => locale);
initContactForm(() => locale);

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
