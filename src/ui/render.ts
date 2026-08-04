import { getCopy, getProjects, profile, skills, stack, type Locale, type Project } from '../content';
import { publicClaims } from '../public-claims';
import { siteConfig } from '../static-pages';

/** Inject all dynamic content (stack chips, project cards, skills, links) into the DOM. */
export function renderContent(locale: Locale): void {
  renderStack();
  renderServices(locale);
  renderProjects(locale);
  renderProcess(locale);
  renderMarquee();
  renderSkills(locale);
  renderContactLinks(locale);
  const year = document.getElementById('year');
  if (year) year.textContent = siteConfig.contentUpdatedAt.slice(0, 4);
}

function renderStack(): void {
  const host = document.getElementById('about-stack');
  if (!host) return;
  host.innerHTML = stack
    .map((tech, i) => `<span class="chip" style="--i:${i}">${tech}</span>`)
    .join('');
}

function renderServices(locale: Locale): void {
  const host = document.getElementById('services-grid');
  if (!host) return;
  host.innerHTML = getCopy(locale)
    .services.map((service, index) => {
      const text = index === 1 ? publicClaims.webglServiceSummary[locale] : service.text;
      return `
  <div class="service reveal in" data-rv data-tilt style="--i:${index + 1}">
    <span class="service__icon" aria-hidden="true">${service.icon}</span>
    <h3 class="service__title">${service.title}</h3>
    <p class="service__text">${text}</p>
  </div>`;
    })
    .join('');
}

function renderProcess(locale: Locale): void {
  const host = document.getElementById('process-grid');
  if (!host) return;
  host.innerHTML = getCopy(locale)
    .process.map(
      (process, index) => `
  <div class="step reveal in" data-rv style="--i:${index + 1}">
    <span class="step__num">${process.num}</span>
    <h3 class="step__title">${process.title}</h3>
    <p class="step__text">${process.text}</p>
  </div>`,
    )
    .join('');
}

const marqueeWords = [
  'WebGL', 'TypeScript', 'ASP.NET Core', 'Three.js', 'GLSL',
  'React', 'Redis', 'Docker', 'SQL Server', 'Telegram Bots', 'Performance Budgets',
];

function renderMarquee(): void {
  const host = document.getElementById('marquee-track');
  if (!host) return;
  const sequence = marqueeWords
    .map((word) => `<span class="marquee__word">${word}</span><span class="marquee__dot">✦</span>`)
    .join('');
  host.innerHTML = sequence + sequence;
}

function renderProjects(locale: Locale): void {
  const host = document.getElementById('projects-grid');
  if (!host) return;
  const labels = getCopy(locale).caseLabels;
  host.innerHTML = getProjects(locale).map((project, index) => projectCard(project, index, labels.open)).join('');
}

function projectCard(project: Project, index: number, openLabel: string): string {
  return `
  <article class="project reveal in" data-rv data-tilt data-project="${project.id}" style="--i:${index + 1};--glow:${project.glow}" tabindex="0" role="button" aria-label="${openLabel} ${project.title}">
    <div class="project__glow"></div>
    <header class="project__head">
      <span class="project__year">${project.year}</span>
      <span class="project__open" aria-hidden="true">↗</span>
    </header>
    <h3 class="project__title">${project.title}</h3>
    <p class="project__tagline">${project.tagline}</p>
    <p class="project__desc">${project.description}</p>
    <footer class="project__tech">
      ${project.tech.map((technology) => `<span>${technology}</span>`).join('')}
    </footer>
  </article>`;
}

function renderSkills(locale: Locale): void {
  const host = document.getElementById('skills-grid');
  if (!host) return;
  host.innerHTML = skills
    .map(
      (skill, index) => `
  <div class="skill reveal in" data-rv style="--i:${(index % 4) + 1}">
    <span class="skill__icon" aria-hidden="true">${skill.icon}</span>
    <span class="skill__name">${skill.name}</span>
    <span class="skill__level">${skill.level[locale]}</span>
  </div>`,
    )
    .join('');
}

function renderContactLinks(locale: Locale): void {
  const host = document.getElementById('contact-links');
  if (!host) return;
  const labels = getCopy(locale).contact.labels;
  const links = [
    { label: labels.email, value: profile.email, href: `mailto:${profile.email}`, external: false },
    { label: labels.github, value: profile.github.replace('https://', ''), href: profile.github, external: true },
    { label: labels.telegram, value: profile.telegram.replace('https://', ''), href: profile.telegram, external: true },
  ];
  host.innerHTML = links
    .map(
      (link) => `
  <a class="contact__link" href="${link.href}"${link.external ? ' target="_blank" rel="noopener noreferrer"' : ''} data-cursor="link" data-magnetic>
    <span class="contact__link-label">${link.label}</span>
    <span class="contact__link-value">${link.value} <span aria-hidden="true">↗</span></span>
  </a>`,
    )
    .join('');
}
