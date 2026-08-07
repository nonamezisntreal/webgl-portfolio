import { getCopy, getProjects, type Locale, type Project } from '../content';
import { bindMagnetic } from './interactions';

/** Travel time of the card → panel transition, and of its reverse. */
const TRANSITION_MS = 520;
const RETURN_MS = 380;

/**
 * Expandable case-study overlay: clicking a project card opens a
 * cinematic panel with the extended write-up. The panel grows out of the card
 * that was pressed and shrinks back into it, so the two read as one object
 * rather than as a page and a dialog that replaced it.
 */
export function initProjectCases(reducedMotion: boolean, getLocale: () => Locale): void {
  const overlay = document.getElementById('case')!;
  const panel = document.getElementById('case-panel')!;
  const body = document.getElementById('case-body')!;
  const closeBtn = document.getElementById('case-close')!;
  const backdrop = document.getElementById('case-backdrop')!;

  let fallbackFocused: HTMLElement | null = null;
  let source: HTMLElement | null = null;
  let travel: Animation | null = null;
  const backgroundRoots = [document.getElementById('header'), document.getElementById('content')].filter((node): node is HTMLElement => Boolean(node));

  const setBackgroundInert = (inert: boolean) => {
    for (const root of backgroundRoots) root.inert = inert;
  };

  const canRestoreFocus = (element: HTMLElement | null): element is HTMLElement =>
    Boolean(element?.isConnected && element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true');

  const restoreFocus = (): void => {
    const target = canRestoreFocus(source)
      ? source
      : canRestoreFocus(fallbackFocused) ? fallbackFocused : null;
    target?.focus();
  };

  // The static document starts hidden; keep that subtree out of sequential focus
  // even before the first open/close lifecycle has happened.
  overlay.inert = true;

  /** Where the panel has to come from, or null when the card is not in view. */
  const originOf = (card: HTMLElement | null): DOMRect | null => {
    if (reducedMotion || !card) return null;
    const rect = card.getBoundingClientRect();
    const onScreen = rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
    return onScreen ? rect : null;
  };

  /**
   * Carry the panel between its own place and the card's, with the CSS entrance
   * held off for the duration so the two do not describe the same property.
   */
  const carry = (from: DOMRect, duration: number, reverse: boolean): Animation => {
    const to = panel.getBoundingClientRect();
    const shape = {
      transform: `translate(${Math.round(from.left + from.width / 2 - (to.left + to.width / 2))}px, `
        + `${Math.round(from.top + from.height / 2 - (to.top + to.height / 2))}px) `
        + `scale(${(from.width / to.width).toFixed(3)}, ${(from.height / to.height).toFixed(3)})`,
      opacity: '0',
    };
    const seated = { transform: 'none', opacity: '1' };
    travel?.cancel();
    panel.style.transition = 'none';
    travel = panel.animate(reverse ? [seated, shape] : [shape, seated], {
      duration,
      easing: reverse ? 'cubic-bezier(0.7, 0, 0.84, 0)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
    });
    // the write-up arrives once the box it lives in has a shape
    if (!reverse) body.animate([{ opacity: '0' }, { opacity: '1' }], { duration: duration * 0.7, delay: duration * 0.3, fill: 'backwards' });
    // only the last carry may hand the panel back to the stylesheet
    const mine = travel;
    const release = () => { if (travel === mine) panel.style.transition = ''; };
    travel.finished.then(release, release);
    return travel;
  };

  const open = (project: Project, card: HTMLElement) => {
    fallbackFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    source?.classList.remove('is-case-source');
    source = card;

    const locale = getLocale();
    body.innerHTML = caseTemplate(project, locale);
    closeBtn.setAttribute('aria-label', locale === 'ru' ? 'Закрыть описание проекта' : 'Close project details');
    bindMagnetic();
    panel.style.setProperty('--glow', project.glow);
    overlay.classList.remove('case--closing');
    // Reopening during a reverse FLIP must restore semantics before moving focus.
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('case--open');
    setBackgroundInert(true);
    document.body.style.overflow = 'hidden';
    closeBtn.focus();

    const from = originOf(card);
    if (!from) return;
    // the card is now the panel: two copies of it on screen would give that away
    card.classList.add('is-case-source');
    carry(from, TRANSITION_MS, false);
  };

  const close = () => {
    if (!overlay.classList.contains('case--open')) return;
    /* The case is over the moment it is closed: the animation that follows is a
       ghost, so nothing waits on it — not the focus, not the page behind. */
    overlay.classList.remove('case--open');
    overlay.setAttribute('aria-hidden', 'true');
    // The reverse FLIP remains visible, but it is no longer a modal or a focus
    // destination from the instant logical close happens.
    overlay.inert = true;
    setBackgroundInert(false);
    document.body.style.overflow = '';
    restoreFocus();

    const card = source;
    const back = originOf(card);
    if (!card || !back) {
      travel?.cancel();
      card?.classList.remove('is-case-source');
      source = null;
      return;
    }
    overlay.classList.add('case--closing');
    const outro = carry(back, RETURN_MS, true);
    const settle = () => {
      if (travel !== outro) return;
      overlay.classList.remove('case--closing');
      card.classList.remove('is-case-source');
      if (source === card) source = null;
    };
    outro.finished.then(settle, settle);
  };

  document.getElementById('projects-grid')?.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-project]');
    if (!card) return;
    const project = getProjects(getLocale()).find((p) => p.id === card.dataset.project);
    if (project) open(project, card);
  });

  document.getElementById('projects-grid')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-project]');
    if (!card) return;
    e.preventDefault();
    const project = getProjects(getLocale()).find((p) => p.id === card.dataset.project);
    if (project) open(project, card);
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
