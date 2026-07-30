import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { copy, profile, type Locale, type Project } from '../src/content';
import { casePages, insightPages, servicePages, siteConfig, type ContentSection, type LocalizedPageContent } from '../src/static-pages';

const dist = resolve(process.cwd(), 'dist');
const origin = (process.env.SITE_ORIGIN ?? siteConfig.origin).replace(/\/$/, '');
const basePath = normalizeBasePath(process.env.BASE_PATH ?? siteConfig.basePath);
const locales: Locale[] = ['ru', 'en'];
const generatedAt = new Date().toISOString();

interface RouteRecord {
  locale: Locale;
  type: 'home' | 'service' | 'case' | 'insight';
  id: string;
  path: string;
  counterpartPath: string;
  updatedAt: string;
  capabilities: string[];
}

function normalizeBasePath(value: string): string {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function routePath(locale: Locale, group?: string, slug?: string): string {
  const localePrefix = locale === 'en' ? 'en/' : '';
  return `${basePath}${localePrefix}${group ? `${group}/` : ''}${slug ? `${slug}/` : ''}`;
}

function absolute(path: string): string {
  return `${origin}${path}`;
}

function outputFile(path: string): string {
  const relative = path.slice(basePath.length);
  return resolve(dist, relative, 'index.html');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function pageLabel(locale: Locale, type: RouteRecord['type']): string {
  const labels = {
    ru: { home: 'Главная', service: 'Услуга', case: 'Кейс', insight: 'Разбор' },
    en: { home: 'Home', service: 'Service', case: 'Case study', insight: 'Insight' },
  } as const;
  return labels[locale][type];
}

function commonCss(): string {
  return `
    :root{color-scheme:dark;--bg:#06060b;--surface:#0e0f19;--surface2:#151725;--text:#eef0f7;--dim:#a5a8ba;--border:#292c3f;--cyan:#67e8f9;--violet:#a78bfa;--max:1120px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 78% 4%,rgba(103,232,249,.10),transparent 28%),radial-gradient(circle at 14% 22%,rgba(167,139,250,.10),transparent 28%),var(--bg);color:var(--text);line-height:1.65}
    a{color:inherit}.shell{width:min(var(--max),calc(100% - 2rem));margin:auto}.skip{position:absolute;left:-9999px}.skip:focus{left:1rem;top:1rem;z-index:10;background:#fff;color:#000;padding:.7rem 1rem;border-radius:.5rem}
    header{position:sticky;top:0;z-index:5;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(6,6,11,.86);backdrop-filter:blur(16px)}.nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:68px}.brand{text-decoration:none;font-weight:800;letter-spacing:-.03em}.brand span{color:var(--cyan)}.navlinks{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.75rem}.navlinks a{text-decoration:none;color:var(--dim);padding:.42rem .62rem;border-radius:.55rem}.navlinks a:hover,.navlinks a:focus-visible{color:var(--text);background:rgba(255,255,255,.06)}
    main{padding:clamp(3rem,8vw,7rem) 0 5rem}.eyebrow{font:600 .78rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--cyan);text-transform:uppercase;letter-spacing:.16em}.hero h1{font-size:clamp(2.5rem,8vw,5.8rem);line-height:.98;letter-spacing:-.055em;max-width:950px;margin:.9rem 0 1.4rem}.lead{font-size:clamp(1.08rem,2.2vw,1.35rem);max-width:790px;color:var(--dim)}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.7rem}.button{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:.8rem 1rem;border-radius:.75rem;border:1px solid var(--border);background:rgba(255,255,255,.035);font-weight:650}.button.primary{background:linear-gradient(100deg,var(--cyan),var(--violet));color:#080910;border:0}.button:hover{transform:translateY(-1px)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:1.4rem}.card{display:block;text-decoration:none;border:1px solid var(--border);background:linear-gradient(150deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border-radius:1rem;padding:1.25rem;min-height:100%;box-shadow:0 18px 50px rgba(0,0,0,.18)}.card:hover,.card:focus-visible{border-color:rgba(103,232,249,.55);transform:translateY(-2px)}.card h2,.card h3{margin:.1rem 0 .55rem;line-height:1.2}.card p{margin:0;color:var(--dim)}.tags{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.85rem}.tag{font:500 .72rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid var(--border);padding:.3rem .48rem;border-radius:999px;color:var(--dim)}
    section{margin-top:clamp(3rem,7vw,6rem)}section>h2{font-size:clamp(1.7rem,4vw,2.65rem);letter-spacing:-.035em;margin:0 0 1rem}.prose{max-width:820px}.prose p,.prose li{color:var(--dim)}.prose strong{color:var(--text)}.section-block{border-top:1px solid var(--border);padding-top:1.35rem;margin-top:1.4rem}.section-block h2{font-size:1.55rem;margin:0 0 .75rem}.section-block ul{padding-left:1.25rem}.section-block li+li{margin-top:.38rem}
    .breadcrumbs{display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:1.2rem;color:var(--dim);font-size:.88rem}.breadcrumbs a{text-decoration:none}.breadcrumbs span[aria-current]{color:var(--text)}.meta{display:flex;flex-wrap:wrap;gap:.65rem;color:var(--dim);font-size:.86rem;margin-top:1rem}.faq details{border-top:1px solid var(--border);padding:1rem 0}.faq summary{cursor:pointer;font-weight:700}.faq p{color:var(--dim)}
    footer{border-top:1px solid var(--border);padding:2rem 0 3rem;color:var(--dim)}.footer-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem}.footer-row a{color:var(--text)}
    @media(max-width:720px){.nav{align-items:flex-start;padding:.8rem 0}.navlinks{font-size:.9rem}.hero h1{font-size:clamp(2.35rem,13vw,4.1rem)}}
    @media(prefers-reduced-motion:no-preference){a,.card,.button{transition:transform .18s ease,border-color .18s ease,color .18s ease,background .18s ease}}
  `;
}

function analyticsScript(): string {
  return `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-portfolio-event]');if(!a)return;window.dispatchEvent(new CustomEvent('portfolio:event',{detail:{event:a.dataset.portfolioEvent,pageType:document.body.dataset.pageType,pageId:document.body.dataset.pageId,locale:document.documentElement.lang,href:a.href||null}}));});</script>`;
}

function header(locale: Locale): string {
  const home = routePath(locale);
  const other = routePath(locale === 'ru' ? 'en' : 'ru');
  return `<header><div class="shell nav"><a class="brand" href="${home}" data-portfolio-event="home">hazard<span>.dev</span></a><nav class="navlinks" aria-label="${locale === 'ru' ? 'Основная навигация' : 'Primary navigation'}"><a href="${home}#services" data-portfolio-event="services">${locale === 'ru' ? 'Услуги' : 'Services'}</a><a href="${home}#cases" data-portfolio-event="cases">${locale === 'ru' ? 'Кейсы' : 'Cases'}</a><a href="${home}#insights" data-portfolio-event="insights">${locale === 'ru' ? 'Разборы' : 'Insights'}</a><a href="${other}" hreflang="${locale === 'ru' ? 'en' : 'ru'}" data-portfolio-event="language_switch">${locale === 'ru' ? 'EN' : 'RU'}</a></nav></div></header>`;
}

function footer(locale: Locale): string {
  return `<footer><div class="shell footer-row"><span>© ${new Date().getUTCFullYear()} ${siteConfig.publicName}</span><span><a href="${siteConfig.telegramUrl}" rel="me noopener" data-portfolio-event="cta_telegram">Telegram</a> · <a href="mailto:${siteConfig.email}" data-portfolio-event="cta_email">Email</a> · <a href="${siteConfig.githubUrl}" rel="me noopener" data-portfolio-event="cta_github">GitHub</a></span></div></footer>`;
}

function head(locale: Locale, title: string, description: string, path: string, counterpartPath: string, jsonLd: unknown[]): string {
  const canonical = absolute(path);
  const ruPath = locale === 'ru' ? path : counterpartPath;
  const enPath = locale === 'en' ? path : counterpartPath;
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="theme-color" content="#06060b" />
    <link rel="canonical" href="${canonical}" />
    <link rel="alternate" hreflang="ru" href="${absolute(ruPath)}" />
    <link rel="alternate" hreflang="en" href="${absolute(enPath)}" />
    <link rel="alternate" hreflang="x-default" href="${absolute(ruPath)}" />
    <link rel="icon" type="image/svg+xml" href="${basePath}favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${locale === 'ru' ? 'ru_RU' : 'en_US'}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="Hazard Portfolio" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <style>${commonCss()}</style>
    ${jsonLd.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join('\n')}
  </head>`;
}

function breadcrumbs(locale: Locale, type: RouteRecord['type'], title: string): string {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${routePath(locale)}">${locale === 'ru' ? 'Главная' : 'Home'}</a><span>→</span><span>${pageLabel(locale, type)}</span><span>→</span><span aria-current="page">${escapeHtml(title)}</span></nav>`;
}

function renderSections(sections: ContentSection[]): string {
  return sections.map((section) => `<section class="section-block prose"><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}${section.items?.length ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
}

function documentTemplate(args: {
  locale: Locale;
  type: RouteRecord['type'];
  id: string;
  path: string;
  counterpartPath: string;
  title: string;
  description: string;
  directAnswer: string;
  body: string;
  jsonLd: unknown[];
}): string {
  return `<!doctype html><html lang="${args.locale}">${head(args.locale, args.title, args.description, args.path, args.counterpartPath, args.jsonLd)}<body data-page-type="${args.type}" data-page-id="${escapeHtml(args.id)}"><a class="skip" href="#main">${args.locale === 'ru' ? 'К содержанию' : 'Skip to content'}</a>${header(args.locale)}<main id="main"><div class="shell hero">${breadcrumbs(args.locale, args.type, args.title)}<p class="eyebrow">${pageLabel(args.locale, args.type)}</p><h1>${escapeHtml(args.title)}</h1><p class="lead">${escapeHtml(args.directAnswer)}</p><div class="actions"><a class="button primary" href="${siteConfig.telegramUrl}" rel="noopener" data-portfolio-event="cta_telegram">${args.locale === 'ru' ? 'Обсудить проект' : 'Discuss a project'}</a><a class="button" href="mailto:${siteConfig.email}" data-portfolio-event="cta_email">Email</a></div></div><div class="shell">${args.body}</div></main>${footer(args.locale)}${analyticsScript()}</body></html>`;
}

function serviceSummary(locale: Locale, descriptor: (typeof servicePages)[number]): string {
  if (descriptor.customSummary) return descriptor.customSummary[locale];
  if (descriptor.serviceIndex === undefined) return descriptor.content[locale].description;
  return copy[locale].services[descriptor.serviceIndex]?.text ?? descriptor.content[locale].description;
}

function project(locale: Locale, id: string): Project {
  const match = copy[locale].projects.find((item) => item.id === id);
  if (!match) throw new Error(`Project ${id} is missing for locale ${locale}.`);
  return match;
}

function serviceCards(locale: Locale): string {
  return `<div class="grid">${servicePages.map((item) => `<a class="card" href="${routePath(locale, 'services', item.slug)}" data-portfolio-event="service_view"><p class="eyebrow">${locale === 'ru' ? 'Услуга' : 'Service'}</p><h3>${escapeHtml(item.content[locale].title)}</h3><p>${escapeHtml(serviceSummary(locale, item))}</p><div class="tags">${item.capabilities.slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></a>`).join('')}</div>`;
}

function caseCards(locale: Locale): string {
  return `<div class="grid">${casePages.map((item) => { const data = project(locale, item.id); return `<a class="card" href="${routePath(locale, 'cases', item.slug)}" data-portfolio-event="case_view"><p class="eyebrow">${data.year}</p><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p><div class="tags">${data.tech.slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></a>`; }).join('')}</div>`;
}

function insightCards(locale: Locale): string {
  return `<div class="grid">${insightPages.map((item) => `<a class="card" href="${routePath(locale, 'insights', item.slug)}" data-portfolio-event="insight_view"><p class="eyebrow">${locale === 'ru' ? 'Практический разбор' : 'Practical insight'}</p><h3>${escapeHtml(item.content[locale].title)}</h3><p>${escapeHtml(item.content[locale].description)}</p></a>`).join('')}</div>`;
}

function homeDocument(locale: Locale): string {
  const path = routePath(locale);
  const counterpartPath = routePath(locale === 'ru' ? 'en' : 'ru');
  const title = copy[locale].meta.title;
  const description = copy[locale].meta.description;
  const directAnswer = locale === 'ru'
    ? 'Разрабатываю ASP.NET Core приложения, Telegram-ботов, системы автоматизации и интерактивные WebGL-интерфейсы — от архитектуры до проверяемого deployment.'
    : 'I build ASP.NET Core applications, Telegram bots, automation systems and interactive WebGL interfaces — from architecture to verified deployment.';
  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: siteConfig.publicName,
      description,
      url: absolute(path),
      sameAs: [siteConfig.githubUrl, siteConfig.telegramUrl],
      knowsAbout: ['ASP.NET Core', 'Telegram bots', 'Business process automation', 'Three.js', 'WebGL', 'TypeScript'],
    },
  };
  const body = `<section id="services"><h2>${locale === 'ru' ? 'Услуги' : 'Services'}</h2>${serviceCards(locale)}</section><section id="cases"><h2>${locale === 'ru' ? 'Кейсы' : 'Case studies'}</h2>${caseCards(locale)}</section><section id="insights"><h2>${locale === 'ru' ? 'Практические разборы' : 'Practical insights'}</h2>${insightCards(locale)}</section>`;
  return documentTemplate({ locale, type: 'home', id: 'home', path, counterpartPath, title, description, directAnswer, body, jsonLd: [profileLd] });
}

async function writePage(path: string, html: string): Promise<void> {
  const file = outputFile(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
}

const routes: RouteRecord[] = [];

for (const locale of locales) {
  const homePath = routePath(locale);
  routes.push({ locale, type: 'home', id: 'home', path: homePath, counterpartPath: routePath(locale === 'ru' ? 'en' : 'ru'), updatedAt: '2026-07-30', capabilities: [] });
  if (locale === 'en') await writePage(homePath, homeDocument(locale));

  for (const descriptor of servicePages) {
    const path = routePath(locale, 'services', descriptor.slug);
    const counterpartPath = routePath(locale === 'ru' ? 'en' : 'ru', 'services', descriptor.slug);
    const content: LocalizedPageContent = descriptor.content[locale];
    const relatedCases = descriptor.relatedCaseIds.map((id) => { const data = project(locale, id); const route = casePages.find((item) => item.id === id); return route ? `<a class="card" href="${routePath(locale, 'cases', route.slug)}" data-portfolio-event="case_view"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></a>` : ''; }).join('');
    const faqBody = content.faq?.length ? `<section class="faq"><h2>${locale === 'ru' ? 'Частые вопросы' : 'Frequently asked questions'}</h2>${content.faq.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</section>` : '';
    const body = `${renderSections(content.sections)}<section><h2>${locale === 'ru' ? 'Связанные кейсы' : 'Related case studies'}</h2><div class="grid">${relatedCases}</div></section>${faqBody}`;
    const serviceLd = { '@context': 'https://schema.org', '@type': 'Service', name: content.title, description: content.description, provider: { '@type': 'Person', name: siteConfig.publicName, url: siteConfig.portfolioUrl }, url: absolute(path) };
    const faqLd = content.faq?.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: content.faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } : null;
    await writePage(path, documentTemplate({ locale, type: 'service', id: descriptor.id, path, counterpartPath, title: content.title, description: content.description, directAnswer: content.directAnswer, body, jsonLd: faqLd ? [serviceLd, faqLd] : [serviceLd] }));
    routes.push({ locale, type: 'service', id: descriptor.id, path, counterpartPath, updatedAt: '2026-07-30', capabilities: descriptor.capabilities });
  }

  for (const descriptor of casePages) {
    const data = project(locale, descriptor.id);
    const path = routePath(locale, 'cases', descriptor.slug);
    const counterpartPath = routePath(locale === 'ru' ? 'en' : 'ru', 'cases', descriptor.slug);
    const relatedServices = descriptor.relatedServiceIds.map((id) => { const item = servicePages.find((service) => service.id === id); return item ? `<a class="card" href="${routePath(locale, 'services', item.slug)}" data-portfolio-event="service_view"><h3>${escapeHtml(item.content[locale].title)}</h3><p>${escapeHtml(serviceSummary(locale, item))}</p></a>` : ''; }).join('');
    const sections: ContentSection[] = [
      { title: locale === 'ru' ? 'Задача' : 'The challenge', paragraphs: [data.caseStudy.challenge] },
      { title: locale === 'ru' ? 'Решение' : 'The solution', paragraphs: [data.caseStudy.solution] },
      { title: locale === 'ru' ? 'Что реализовано' : 'What was delivered', items: data.caseStudy.highlights },
      { title: locale === 'ru' ? 'Технологии' : 'Technology', items: data.tech },
    ];
    const externalLink = data.caseStudy.link ? `<p><a class="button" href="${data.caseStudy.link}" rel="noopener" data-portfolio-event="project_source">${locale === 'ru' ? 'Открыть проект' : 'Open project'} ↗</a></p>` : '';
    const body = `${renderSections(sections)}${externalLink}<section><h2>${locale === 'ru' ? 'Связанные услуги' : 'Related services'}</h2><div class="grid">${relatedServices}</div></section>`;
    const articleLd = { '@context': 'https://schema.org', '@type': 'TechArticle', headline: data.title, description: data.description, datePublished: descriptor.publishedAt, dateModified: descriptor.updatedAt, author: { '@type': 'Person', name: siteConfig.publicName, url: siteConfig.portfolioUrl }, mainEntityOfPage: absolute(path), keywords: descriptor.capabilities.join(', ') };
    await writePage(path, documentTemplate({ locale, type: 'case', id: descriptor.id, path, counterpartPath, title: `${data.title} — ${locale === 'ru' ? 'кейс' : 'case study'}`, description: data.description, directAnswer: data.tagline, body, jsonLd: [articleLd] }));
    routes.push({ locale, type: 'case', id: descriptor.id, path, counterpartPath, updatedAt: descriptor.updatedAt, capabilities: descriptor.capabilities });
  }

  for (const descriptor of insightPages) {
    const content = descriptor.content[locale];
    const path = routePath(locale, 'insights', descriptor.slug);
    const counterpartPath = routePath(locale === 'ru' ? 'en' : 'ru', 'insights', descriptor.slug);
    const service = servicePages.find((item) => item.id === descriptor.relatedServiceId);
    const relatedCases = descriptor.relatedCaseIds.map((id) => { const data = project(locale, id); const route = casePages.find((item) => item.id === id); return route ? `<a class="card" href="${routePath(locale, 'cases', route.slug)}" data-portfolio-event="case_view"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></a>` : ''; }).join('');
    const related = `<section><h2>${locale === 'ru' ? 'Связанные материалы' : 'Related work'}</h2><div class="grid">${service ? `<a class="card" href="${routePath(locale, 'services', service.slug)}" data-portfolio-event="service_view"><h3>${escapeHtml(service.content[locale].title)}</h3><p>${escapeHtml(serviceSummary(locale, service))}</p></a>` : ''}${relatedCases}</div></section>`;
    const articleLd = { '@context': 'https://schema.org', '@type': 'TechArticle', headline: content.title, description: content.description, datePublished: descriptor.publishedAt, dateModified: descriptor.updatedAt, author: { '@type': 'Person', name: siteConfig.publicName, url: siteConfig.portfolioUrl }, mainEntityOfPage: absolute(path) };
    await writePage(path, documentTemplate({ locale, type: 'insight', id: descriptor.id, path, counterpartPath, title: content.title, description: content.description, directAnswer: content.directAnswer, body: `${renderSections(content.sections)}${related}`, jsonLd: [articleLd] }));
    routes.push({ locale, type: 'insight', id: descriptor.id, path, counterpartPath, updatedAt: descriptor.updatedAt, capabilities: [] });
  }
}

const rootHtmlPath = resolve(dist, 'index.html');
let rootHtml = await readFile(rootHtmlPath, 'utf8');
const rootAlternates = `<link rel="alternate" hreflang="ru" href="${absolute(routePath('ru'))}" />\n  <link rel="alternate" hreflang="en" href="${absolute(routePath('en'))}" />\n  <link rel="alternate" hreflang="x-default" href="${absolute(routePath('ru'))}" />`;
const rootProfileLd = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: siteConfig.publicName, description: copy.ru.meta.description, url: siteConfig.portfolioUrl, sameAs: [siteConfig.githubUrl, siteConfig.telegramUrl], knowsAbout: ['ASP.NET Core', 'Telegram bots', 'Business process automation', 'Three.js', 'WebGL', 'TypeScript'] } };
rootHtml = rootHtml.replace('</head>', `  ${rootAlternates}\n  <script type="application/ld+json">${safeJson(rootProfileLd)}</script>\n  <style>.seo-directory{position:relative;z-index:4}.seo-directory .seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}.seo-directory a{display:block;text-decoration:none;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1rem;background:rgba(255,255,255,.035)}.seo-directory a:hover,.seo-directory a:focus-visible{border-color:rgba(103,232,249,.55)}.seo-directory h3{margin:0 0 .4rem}.seo-directory p{margin:0;color:var(--text-dim)}</style>\n</head>`);
rootHtml = rootHtml.replace(/<button class="lang-toggle"[\s\S]*?<\/button>/, `<a class="lang-toggle" id="lang-toggle" href="${routePath('en')}" hreflang="en" data-cursor="link" data-magnetic aria-label="English version"><span class="lang-toggle__option is-active" data-lang-pill="ru">RU</span><span class="lang-toggle__option" data-lang-pill="en">EN</span></a>`);
const directory = `<section class="seo-directory section" id="explore"><div class="section__head"><span class="section__index">07</span><h2 class="section__title">Услуги, кейсы и разборы</h2></div><div class="seo-grid">${servicePages.map((item) => `<a href="${routePath('ru', 'services', item.slug)}" data-portfolio-event="service_view"><h3>${escapeHtml(item.content.ru.title)}</h3><p>${escapeHtml(serviceSummary('ru', item))}</p></a>`).join('')}${casePages.map((item) => { const data = project('ru', item.id); return `<a href="${routePath('ru', 'cases', item.slug)}" data-portfolio-event="case_view"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.tagline)}</p></a>`; }).join('')}${insightPages.map((item) => `<a href="${routePath('ru', 'insights', item.slug)}" data-portfolio-event="insight_view"><h3>${escapeHtml(item.content.ru.title)}</h3><p>${escapeHtml(item.content.ru.description)}</p></a>`).join('')}</div></section>`;
rootHtml = rootHtml.replace('<footer class="footer">', `${directory}<footer class="footer">`);
rootHtml = rootHtml.replace('</body>', `${analyticsScript()}</body>`);
await writeFile(rootHtmlPath, rootHtml, 'utf8');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${routes.map((route) => `  <url>\n    <loc>${absolute(route.path)}</loc>\n    <lastmod>${route.updatedAt}</lastmod>\n    <xhtml:link rel="alternate" hreflang="${route.locale}" href="${absolute(route.path)}" />\n    <xhtml:link rel="alternate" hreflang="${route.locale === 'ru' ? 'en' : 'ru'}" href="${absolute(route.counterpartPath)}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(route.locale === 'ru' ? route.path : route.counterpartPath)}" />\n  </url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap, 'utf8');

const robots = `User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${absolute(`${basePath}sitemap.xml`)}\n`;
await writeFile(resolve(dist, 'robots.txt'), robots, 'utf8');

const linkRegistry = {
  schemaVersion: 1,
  generatedAt,
  canonicalHomepageUrl: absolute(routePath('ru')),
  links: routes.map((route) => ({
    id: `${route.locale}:${route.type}:${route.id}`,
    canonicalUrl: absolute(route.path),
    locale: route.locale,
    type: route.type === 'home' ? 'homepage' : route.type,
    capabilities: route.capabilities,
    confidentiality: 'public',
    enabled: true,
  })),
};
await writeFile(resolve(dist, 'portfolio-links.json'), `${JSON.stringify(linkRegistry, null, 2)}\n`, 'utf8');
await writeFile(resolve(dist, 'routes-manifest.json'), `${JSON.stringify({ generatedAt, origin, basePath, routes }, null, 2)}\n`, 'utf8');

console.log(`Generated ${routes.length} localized routes, sitemap.xml and portfolio-links.json.`);
