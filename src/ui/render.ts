import { getCopy, getProjects, profile, skills, stack, type Locale, type Project } from '../content';

/** Inject all dynamic content (stack chips, project cards, skills, links) into the DOM. */
export function renderContent(locale: Locale): void {
  renderStack();
  renderProjects(locale);
  renderSkills(locale);
  renderContactLinks(locale);
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}

function renderStack(): void {
  const host = document.getElementById('about-stack');
  if (!host) return;
  host.innerHTML = stack
    .map((tech, i) => `<span class="chip" style="--i:${i}">${tech}</span>`)
    .join('');
}

function renderProjects(locale: Locale): void {
  const host = document.getElementById('projects-grid');
  if (!host) return;
  const labels = getCopy(locale).caseLabels;
  host.innerHTML = getProjects(locale).map((p, i) => projectCard(p, i, labels.open)).join('');
}

function projectCard(p: Project, i: number, openLabel: string): string {
  return `
  <article class="project reveal in" data-rv data-tilt data-project="${p.id}" style="--i:${i + 1};--glow:${p.glow}" tabindex="0" role="button" aria-label="${openLabel} ${p.title}">
    <div class="project__glow"></div>
    <header class="project__head">
      <span class="project__year">${p.year}</span>
      <span class="project__open" aria-hidden="true">↗</span>
    </header>
    <h3 class="project__title">${p.title}</h3>
    <p class="project__tagline">${p.tagline}</p>
    <p class="project__desc">${p.description}</p>
    <footer class="project__tech">
      ${p.tech.map((t) => `<span>${t}</span>`).join('')}
    </footer>
  </article>`;
}

function renderSkills(locale: Locale): void {
  const host = document.getElementById('skills-grid');
  if (!host) return;
  host.innerHTML = skills
    .map(
      (s, i) => `
  <div class="skill reveal in" data-rv style="--i:${(i % 4) + 1}">
    <span class="skill__icon" aria-hidden="true">${s.icon}</span>
    <span class="skill__name">${s.name}</span>
    <span class="skill__level">${s.level[locale]}</span>
  </div>`,
    )
    .join('');
}

function renderContactLinks(locale: Locale): void {
  const host = document.getElementById('contact-links');
  if (!host) return;
  const labels = getCopy(locale).contact.labels;
  const links = [
    { label: labels.email, value: profile.email, href: `mailto:${profile.email}` },
    { label: labels.github, value: profile.github.replace('https://', ''), href: profile.github },
    { label: labels.telegram, value: profile.telegram.replace('https://', ''), href: profile.telegram },
  ];
  host.innerHTML = links
    .map(
      (l) => `
  <a class="contact__link" href="${l.href}" target="_blank" rel="noopener noreferrer" data-cursor="link" data-magnetic>
    <span class="contact__link-label">${l.label}</span>
    <span class="contact__link-value">${l.value} <span aria-hidden="true">↗</span></span>
  </a>`,
    )
    .join('');
}
