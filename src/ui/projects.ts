import { getCopy, getProjects, type Locale, type Project } from '../content';
import { bindMagnetic } from './interactions';

/**
 * Expandable case-study overlay: clicking a project card opens a
 * cinematic panel with the extended write-up.
 */
export function initProjectCases(getLocale: () => Locale): void {
  const overlay = document.getElementById('case')!;
  const panel = document.getElementById('case-panel')!;
  const body = document.getElementById('case-body')!;
  const closeBtn = document.getElementById('case-close')!;
  const backdrop = document.getElementById('case-backdrop')!;

  let lastFocused: HTMLElement | null = null;
  const backgroundRoots = [document.getElementById('header'), document.getElementById('content')].filter((node): node is HTMLElement => Boolean(node));

  const setBackgroundInert = (inert: boolean) => {
    for (const root of backgroundRoots) root.inert = inert;
  };

  const open = (project: Project) => {
    lastFocused = document.activeElement as HTMLElement;
    const locale = getLocale();
    body.innerHTML = caseTemplate(project, locale);
    closeBtn.setAttribute('aria-label', locale === 'ru' ? 'Закрыть описание проекта' : 'Close project details');
    bindMagnetic();
    panel.style.setProperty('--glow', project.glow);
    overlay.classList.add('case--open');
    overlay.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true);
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => {
    if (!overlay.classList.contains('case--open')) return;
    overlay.classList.remove('case--open');
    overlay.setAttribute('aria-hidden', 'true');
    setBackgroundInert(false);
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  document.getElementById('projects-grid')?.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-project]');
    if (!card) return;
    const project = getProjects(getLocale()).find((p) => p.id === card.dataset.project);
    if (project) open(project);
  });

  document.getElementById('projects-grid')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-project]');
    if (!card) return;
    e.preventDefault();
    const project = getProjects(getLocale()).find((p) => p.id === card.dataset.project);
    if (project) open(project);
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('case--open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
    if (focusable.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

function caseTemplate(p: Project, locale: Locale): string {
  const labels = getCopy(locale).caseLabels;
  return `
  <span class="case__year">${p.year}</span>
  <h3 class="case__title" id="case-title">${p.title}</h3>
  <p class="case__tagline">${p.tagline}</p>
  <div class="case__tech">${p.tech.map((t) => `<span>${t}</span>`).join('')}</div>

  <div class="case__section">
    <h4>${labels.challenge}</h4>
    <p>${p.caseStudy.challenge}</p>
  </div>
  <div class="case__section">
    <h4>${labels.solution}</h4>
    <p>${p.caseStudy.solution}</p>
  </div>
  <div class="case__section">
    <h4>${labels.highlights}</h4>
    <ul>${p.caseStudy.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
  </div>
  ${p.caseStudy.link ? `<a class="btn btn--ghost case__link" href="${p.caseStudy.link}" target="_blank" rel="noopener noreferrer" data-magnetic>${labels.link}</a>` : ''}
  `;
}
