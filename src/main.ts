import './styles/main.css';
import { getCopy, type Locale } from './content';
import { publicClaims } from './public-claims';
import { renderContent } from './ui/render';
import { initScroll } from './ui/scroll';
import { initReveals } from './ui/reveal';
import { initTilt } from './ui/tilt';
import { initCursor } from './ui/cursor';
import { initProjectCases } from './ui/projects';
import { initContactForm } from './ui/contact';
import { initInteractions, bindMagnetic } from './ui/interactions';
import { initSceneNav, type SceneNav } from './ui/sceneNav';
import { initIntro } from './ui/intro';
import { sectionScenes } from './scene-nodes';
import { Experience } from './webgl/Experience';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function localeFromDocument(): Locale {
  const declared = document.documentElement.dataset.locale;
  if (declared !== 'ru' && declared !== 'en') {
    throw new Error(`Unsupported or missing document locale: ${String(declared)}`);
  }

  const configuredBase = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const normalizedPath = window.location.pathname.replace(/\/{2,}/g, '/');
  const relativePath = normalizedPath.startsWith(configuredBase)
    ? normalizedPath.slice(configuredBase.length)
    : normalizedPath.replace(/^\//, '');
  const routeLocale: Locale = relativePath.split('/').filter(Boolean)[0] === 'en' ? 'en' : 'ru';

  if (routeLocale !== declared) {
    throw new Error(`Document locale ${declared} does not match route locale ${routeLocale}.`);
  }
  return declared;
}

const locale: Locale = localeFromDocument();

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

function applyLocale(currentLocale: Locale): void {
  const t = getCopy(currentLocale);

  document.documentElement.lang = currentLocale;
  document.documentElement.dataset.locale = currentLocale;
  document.title = t.meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', t.meta.description);
  document.querySelector<HTMLElement>('.header__nav')?.setAttribute('aria-label', currentLocale === 'ru' ? 'Основная навигация' : 'Primary navigation');
  document.getElementById('lang-toggle')?.setAttribute('aria-label', currentLocale === 'ru' ? 'Выбор языка' : 'Language selection');
  document.getElementById('case-close')?.setAttribute('aria-label', currentLocale === 'ru' ? 'Закрыть описание проекта' : 'Close project details');

  setText('skip-link', currentLocale === 'ru' ? 'Перейти к основному содержимому' : 'Skip to main content');
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
  setText('about-card-performance-text', publicClaims.performanceCard[currentLocale]);
  setText('about-card-creativity-title', t.about.cards.creativity.title);
  setText('about-card-creativity-text', t.about.cards.creativity.text);
  setText('about-card-architecture-title', t.about.cards.architecture.title);
  setText('about-card-architecture-text', t.about.cards.architecture.text);

  setText('services-title', t.servicesTitle);
  setText('projects-title', t.projectsTitle);
  setText('process-title', t.processTitle);
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

  const activeLocale = document.querySelector<HTMLElement>('[data-lang-pill][aria-current="page"]');
  if (activeLocale?.dataset.langPill !== currentLocale || activeLocale.tagName === 'A') {
    throw new Error('Language switcher markup does not match the declared locale.');
  }

  renderContent(currentLocale);
  initTilt(reducedMotion);
  if (!reducedMotion) bindMagnetic();
}

/* Locale is declared by the physical HTML artifact and verified against its canonical route. */
applyLocale(locale);
document.body.classList.add('is-ready');

/* The activation is choreography over an already usable page. Its WebGL beat
   is bound later and delivered only while the intro is still active. */
const intro = initIntro({ reducedMotion });

/* UI layer works even if WebGL fails. */
initReveals(reducedMotion);
initTilt(reducedMotion);
initCursor(reducedMotion);
initInteractions(reducedMotion);
initProjectCases(reducedMotion, () => locale);
initContactForm(() => locale);

/* Primary HTML is independent of WebGL initialization and remains usable on fallback. */
const canvas = document.getElementById('gl') as HTMLCanvasElement;
const fpsLabel = document.getElementById('hero-fps');
let disposeExperience: (() => void) | undefined;

async function boot(): Promise<void> {
  try {
    let nav: SceneNav | undefined;
    const scenes = sectionScenes(locale);
    const sceneGuide = getCopy(locale).hero.sceneGuide;
    const experience = new Experience({
      canvas,
      reducedMotion,
      scenes,
      onFps: (fps) => {
        if (fpsLabel) fpsLabel.textContent = `${fps} fps`;
      },
      onNodeHover: (pointer) => nav?.hover(pointer),
      onNodeSelect: (pointer) => nav?.select(pointer),
    });
    intro.bindIgnite(() => experience.ignite());
    try {
      nav = initSceneNav({
        reducedMotion,
        scenes,
        guideCopy: sceneGuide,
        onRelease: () => experience.releaseFocus(),
        onDomHover: (id) => experience.setDomHover(id),
        onHint: (active) => experience.hint(active),
        hasEngaged: () => intro.engaged,
      });
    } catch (error) {
      experience.dispose();
      throw error;
    }
    disposeExperience = () => {
      nav?.dispose();
      experience.dispose();
    };

    initScroll(reducedMotion, {
      onProgress: (p) => experience.setScroll(p),
      onPassage: (crossing) => experience.setPassage(crossing),
      onSection: (name) => {
        experience.setSection(name);
        nav?.setSection(name);
      },
    });

    if (reducedMotion) experience.renderOnce();
    else experience.start();
  } catch (err) {
    disposeExperience?.();
    disposeExperience = undefined;
    console.warn('WebGL experience disabled:', err);
    document.documentElement.classList.add('webgl-fallback');
    canvas.remove();
    initScroll(reducedMotion, { onProgress: () => {}, onPassage: () => {}, onSection: () => {} });
  }
}

window.addEventListener('pagehide', () => {
  intro.dispose();
  disposeExperience?.();
}, { once: true });
boot();
