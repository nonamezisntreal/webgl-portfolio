import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { copy, type Locale, type Project } from '../src/content';
import { publicClaims } from '../src/public-claims';
import { casePages, insightPages, servicePages, siteConfig, type ContentSection, type LocalizedPageContent } from '../src/static-pages';

const dist = resolve(process.cwd(), 'dist');
const origin = (process.env.SITE_ORIGIN ?? siteConfig.origin).replace(/\/$/, '');
const basePath = normalizeBasePath(process.env.BASE_PATH ?? siteConfig.basePath);
const locales: Locale[] = ['ru', 'en'];
const contentUpdatedAt = siteConfig.contentUpdatedAt;

if (!/^\d{4}-\d{2}-\d{2}$/.test(contentUpdatedAt)) {
  throw new Error(`Invalid versioned content date: ${contentUpdatedAt}`);
}

const generatedAt = `${contentUpdatedAt}T00:00:00.000Z`;
const copyrightYear = contentUpdatedAt.slice(0, 4);

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

const analyticsBody = "document.addEventListener('click',function(e){var a=e.target.closest('[data-portfolio-event]');if(!a)return;window.dispatchEvent(new CustomEvent('portfolio:event',{detail:{event:a.dataset.portfolioEvent,pageType:document.body.dataset.pageType,pageId:document.body.dataset.pageId,locale:document.documentElement.lang,href:a.href||null}}));});";

function analyticsScript(): string {
  return `<script data-portfolio-runtime="events">${analyticsBody}</script>`;
}

function header(locale: Locale): string {
  const home = routePath(locale);
  const other = routePath(locale === 'ru' ? 'en' : 'ru');
  return `<header><div class="shell nav"><a class="brand" href="${home}" data-portfolio-event="home">hazard<span>.dev</span></a><nav class="navlinks" aria-label="${locale === 'ru' ? 'Основная навигация' : 'Primary navigation'}"><a href="${home}#services" data-portfolio-event="services">${locale === 'ru' ? 'Услуги' : 'Services'}</a><a href="${home}#cases" data-portfolio-event="cases">${locale === 'ru' ? 'Кейсы' : 'Cases'}</a><a href="${home}#insights" data-portfolio-event="insights">${locale === 'ru' ? 'Разборы' : 'Insights'}</a><a href="${other}" hreflang="${locale === 'ru' ? 'en' : 'ru'}" data-portfolio-event="language_switch">${locale === 'ru' ? 'EN' : 'RU'}</a></nav></div></header>`;
}

function footer(locale: Locale): string {
  return `<footer><div class="shell footer-row"><span>© ${copyrightYear} ${siteConfig.publicName}</span><span><a href="${siteConfig.telegramUrl}" rel="me noopener" data-portfolio-event="cta_telegram">Telegram</a> · <a href="mailto:${siteConfig.email}" data-portfolio-event="cta_email">Email</a> · <a href="${siteConfig.githubUrl}" rel="me noopener" data-portfolio-event="cta_github">GitHub</a></span></div></footer>`;
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

async function writePage(path: string, html: string): Promise<void> {
  const file = outputFile(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
}

const routes: RouteRecord[] = [];

for (const locale of locales) {
  const homePath = routePath(locale);
  routes.push({ locale, type: 'home', id: 'home', path: homePath, counterpartPath: routePath(locale === 'ru' ? 'en' : 'ru'), updatedAt: contentUpdatedAt, capabilities: [] });

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
    routes.push({ locale, type: 'service', id: descriptor.id, path, counterpartPath, updatedAt: contentUpdatedAt, capabilities: descriptor.capabilities });
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

function escapeRegExp(value: string): string {
  return [...value]
    .map((character) => /[A-Za-z0-9_-]/.test(character) ? character : `\\${character}`)
    .join('');
}

function replaceElementContent(source: string, id: string, value: string): string {
  const pattern = new RegExp(`(<([a-z][\\w:-]*)\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>)[\\s\\S]*?(</\\2>)`, 'i');
  if (!pattern.test(source)) throw new Error(`Interactive homepage element #${id} is missing.`);
  return source.replace(pattern, (_match, opening: string, _tag: string, closing: string) => `${opening}${value}${closing}`);
}

function replaceAttributeById(source: string, id: string, attribute: string, value: string): string {
  const tagPattern = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, 'i');
  if (!tagPattern.test(source)) throw new Error(`Interactive homepage element #${id} is missing.`);
  return source.replace(tagPattern, (tag) => {
    const attributePattern = new RegExp(`\\b${escapeRegExp(attribute)}="[^"]*"`, 'i');
    if (!attributePattern.test(tag)) throw new Error(`Interactive homepage element #${id} has no ${attribute} attribute.`);
    return tag.replace(attributePattern, `${attribute}="${escapeHtml(value)}"`);
  });
}

function replaceMetaContent(source: string, attribute: 'name' | 'property', key: string, value: string): string {
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>`, 'i');
  if (!pattern.test(source)) throw new Error(`Interactive homepage meta ${attribute}=${key} is missing.`);
  return source.replace(pattern, (tag) => tag.replace(/\bcontent="[^"]*"/i, `content="${escapeHtml(value)}"`));
}

function replaceLinkHref(source: string, rel: string, href: string): string {
  const pattern = new RegExp(`<link\\b[^>]*\\brel="${escapeRegExp(rel)}"[^>]*>`, 'i');
  if (!pattern.test(source)) throw new Error(`Interactive homepage link rel=${rel} is missing.`);
  return source.replace(pattern, (tag) => tag.replace(/\bhref="[^"]*"/i, `href="${href}"`));
}

function languageSwitcher(locale: Locale): string {
  if (locale === 'ru') {
    return `<span class="lang-toggle__option is-active" data-lang-pill="ru" aria-current="page">RU</span>\n        <a class="lang-toggle__option" data-lang-pill="en" data-lang-link href="${routePath('en')}" hreflang="en" data-cursor="link">EN</a>`;
  }
  return `<a class="lang-toggle__option" data-lang-pill="ru" data-lang-link href="${routePath('ru')}" hreflang="ru" data-cursor="link">RU</a>\n        <span class="lang-toggle__option is-active" data-lang-pill="en" aria-current="page">EN</span>`;
}

function localizeInteractiveHomepage(source: string, locale: Locale): string {
  const t = copy[locale];
  const path = routePath(locale);
  let html = source.replace(/<html\b[^>]*\blang="[^"]+"[^>]*>/i, `<html lang="${locale}" data-locale="${locale}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(t.meta.title)}</title>`);
  html = replaceMetaContent(html, 'name', 'description', t.meta.description);
  html = replaceMetaContent(html, 'property', 'og:locale', locale === 'ru' ? 'ru_RU' : 'en_US');
  html = replaceMetaContent(html, 'property', 'og:title', t.meta.title);
  html = replaceMetaContent(html, 'property', 'og:description', t.meta.description);
  html = replaceMetaContent(html, 'property', 'og:url', absolute(path));
  html = replaceMetaContent(html, 'name', 'twitter:title', t.meta.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', t.meta.description);
  html = replaceLinkHref(html, 'canonical', absolute(path));
  html = html.replace('<body>', '<body data-page-type="home" data-page-id="home" data-interactive-homepage="v1">');

  html = replaceElementContent(html, 'skip-link', locale === 'ru' ? 'Перейти к основному содержимому' : 'Skip to main content');
  html = replaceElementContent(html, 'nav-about', escapeHtml(t.nav.about));
  html = replaceElementContent(html, 'nav-projects', escapeHtml(t.nav.projects));
  html = replaceElementContent(html, 'nav-skills', escapeHtml(t.nav.skills));
  html = replaceElementContent(html, 'nav-contact', escapeHtml(t.nav.contact));
  html = replaceElementContent(html, 'nav-cta', escapeHtml(t.nav.cta));
  html = replaceElementContent(html, 'hero-eyebrow', escapeHtml(t.hero.eyebrow));
  html = replaceElementContent(html, 'hero-line-1', escapeHtml(t.hero.line1));
  html = replaceElementContent(html, 'hero-line-2', escapeHtml(t.hero.line2));
  html = replaceElementContent(html, 'hero-tagline', t.hero.tagline);
  html = replaceElementContent(html, 'hero-primary', `${escapeHtml(t.hero.primary)} <span class="btn__arrow">→</span>`);
  html = replaceElementContent(html, 'hero-secondary', escapeHtml(t.hero.secondary));
  html = replaceElementContent(html, 'hero-scroll', escapeHtml(t.hero.scroll));
  html = replaceElementContent(html, 'hero-meta', escapeHtml(t.hero.meta));
  html = replaceElementContent(html, 'about-title', escapeHtml(t.about.title));
  html = replaceElementContent(html, 'about-lead', t.about.lead);
  html = replaceElementContent(html, 'about-body', escapeHtml(t.about.body));
  html = replaceElementContent(html, 'about-quote', escapeHtml(t.about.quote));
  html = replaceElementContent(html, 'about-card-performance-title', escapeHtml(t.about.cards.performance.title));
  html = replaceElementContent(html, 'about-card-performance-text', escapeHtml(publicClaims.performanceCard[locale]));
  html = replaceElementContent(html, 'about-card-creativity-title', escapeHtml(t.about.cards.creativity.title));
  html = replaceElementContent(html, 'about-card-creativity-text', escapeHtml(t.about.cards.creativity.text));
  html = replaceElementContent(html, 'about-card-architecture-title', escapeHtml(t.about.cards.architecture.title));
  html = replaceElementContent(html, 'about-card-architecture-text', escapeHtml(t.about.cards.architecture.text));
  html = replaceElementContent(html, 'services-title', escapeHtml(t.servicesTitle));
  html = replaceElementContent(html, 'projects-title', escapeHtml(t.projectsTitle));
  html = replaceElementContent(html, 'process-title', escapeHtml(t.processTitle));
  html = replaceElementContent(html, 'skills-title', escapeHtml(t.skillsTitle));
  html = replaceElementContent(html, 'contact-title', escapeHtml(t.contact.title));
  html = replaceElementContent(html, 'contact-pitch', t.contact.pitch);
  html = replaceElementContent(html, 'contact-text', escapeHtml(t.contact.text));
  html = replaceElementContent(html, 'form-name-label', escapeHtml(t.contact.form.name));
  html = replaceElementContent(html, 'form-email-label', escapeHtml(t.contact.form.email));
  html = replaceElementContent(html, 'form-message-label', escapeHtml(t.contact.form.message));
  html = replaceAttributeById(html, 'form-name-input', 'placeholder', t.contact.form.namePlaceholder);
  html = replaceAttributeById(html, 'form-email-input', 'placeholder', t.contact.form.emailPlaceholder);
  html = replaceAttributeById(html, 'form-message-input', 'placeholder', t.contact.form.messagePlaceholder);
  html = replaceElementContent(html, 'form-submit', `${escapeHtml(t.contact.form.submit)} <span class="btn__arrow">→</span>`);
  html = replaceElementContent(html, 'contact-sent', escapeHtml(t.contact.form.sent));
  html = replaceElementContent(html, 'footer-built', escapeHtml(t.footer.built));
  html = replaceElementContent(html, 'footer-top', escapeHtml(t.footer.top));
  if (locale === 'en') html = replaceElementContent(html, 'year', copyrightYear);

  html = replaceAttributeById(html, 'lang-toggle', 'aria-label', locale === 'ru' ? 'Выбор языка' : 'Language selection');
  html = replaceElementContent(html, 'lang-toggle', languageSwitcher(locale));
  html = html.replace(/(<nav class="header__nav" aria-label=")[^"]*(")/i, `$1${locale === 'ru' ? 'Основная навигация' : 'Primary navigation'}$2`);
  html = html.replace(/(<button class="case__close"[^>]*aria-label=")[^"]*(")/i, `$1${locale === 'ru' ? 'Закрыть описание проекта' : 'Close project details'}$2`);
  return html;
}

function homepageDirectory(locale: Locale): string {
  const title = locale === 'ru' ? 'Услуги, кейсы и разборы' : 'Services, case studies and insights';
  return `<section class="seo-directory section" id="explore"><div class="section__head"><span class="section__index">07</span><h2 class="section__title">${title}</h2></div><div class="seo-grid">${servicePages.map((item) => `<a href="${routePath(locale, 'services', item.slug)}" data-portfolio-event="service_view"><h3>${escapeHtml(item.content[locale].title)}</h3><p>${escapeHtml(serviceSummary(locale, item))}</p></a>`).join('')}${casePages.map((item) => { const data = project(locale, item.id); return `<a href="${routePath(locale, 'cases', item.slug)}" data-portfolio-event="case_view"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.tagline)}</p></a>`; }).join('')}${insightPages.map((item) => `<a href="${routePath(locale, 'insights', item.slug)}" data-portfolio-event="insight_view"><h3>${escapeHtml(item.content[locale].title)}</h3><p>${escapeHtml(item.content[locale].description)}</p></a>`).join('')}</div></section>`;
}

function occurrenceCount(source: string, value: string): number {
  return source.split(value).length - 1;
}

function interactiveHomeDocument(source: string, locale: Locale): string {
  const label = `${locale.toUpperCase()} interactive homepage`;
  if (source.includes('data-interactive-homepage="v1"') || source.includes('data-homepage-assembly="v1"')) {
    throw new Error(`${label} assembly was applied more than once.`);
  }
  for (const point of ['</head>', '<footer class="footer">', '</body>']) {
    if (occurrenceCount(source, point) !== 1) throw new Error(`${label} expected exactly one ${point} injection point.`);
  }

  const path = routePath(locale);
  const counterpartPath = routePath(locale === 'ru' ? 'en' : 'ru');
  const ruPath = locale === 'ru' ? path : counterpartPath;
  const enPath = locale === 'en' ? path : counterpartPath;
  const alternates = `<link rel="alternate" hreflang="ru" href="${absolute(ruPath)}" />\n  <link rel="alternate" hreflang="en" href="${absolute(enPath)}" />\n  <link rel="alternate" hreflang="x-default" href="${absolute(ruPath)}" />`;
  const profileLd = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: siteConfig.publicName, description: copy[locale].meta.description, url: absolute(path), sameAs: [siteConfig.githubUrl, siteConfig.telegramUrl], knowsAbout: ['ASP.NET Core', 'Telegram bots', 'Business process automation', 'Three.js', 'WebGL', 'TypeScript'] } };
  let html = localizeInteractiveHomepage(source, locale);
  html = html.replace('</head>', `  ${alternates}\n  <script type="application/ld+json">${safeJson(profileLd)}</script>\n  <style data-homepage-assembly="v1">.seo-directory{position:relative;z-index:4}.seo-directory .seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}.seo-directory a{display:block;text-decoration:none;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1rem;background:rgba(255,255,255,.035)}.seo-directory a:hover,.seo-directory a:focus-visible{border-color:rgba(103,232,249,.55)}.seo-directory h3{margin:0 0 .4rem}.seo-directory p{margin:0;color:var(--text-dim)}</style>\n</head>`);
  html = html.replace('<footer class="footer">', `${homepageDirectory(locale)}<footer class="footer">`);
  html = html.replace('</body>', `${analyticsScript()}</body>`);

  if (occurrenceCount(html, 'data-interactive-homepage="v1"') !== 1 || occurrenceCount(html, 'data-homepage-assembly="v1"') !== 1 || occurrenceCount(html, 'data-portfolio-runtime="events"') !== 1) {
    throw new Error(`${label} assembly markers are incomplete or duplicated.`);
  }
  return html;
}

const rootHtmlPath = resolve(dist, 'index.html');
const interactiveBaseHtml = await readFile(rootHtmlPath, 'utf8');
await writeFile(rootHtmlPath, interactiveHomeDocument(interactiveBaseHtml, 'ru'), 'utf8');
await writePage(routePath('en'), interactiveHomeDocument(interactiveBaseHtml, 'en'));

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
