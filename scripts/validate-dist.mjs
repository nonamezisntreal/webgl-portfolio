import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const dist = resolve(projectRoot, process.env.DIST_DIR ?? 'dist');
const canonicalHomepage = 'https://nonamezisntreal.github.io/webgl-portfolio/';
const requiredFiles = ['index.html', 'robots.txt', 'sitemap.xml', '404.html', 'portfolio-links.json', 'routes-manifest.json'];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
const analyticsBody = "document.addEventListener('click',function(e){var a=e.target.closest('[data-portfolio-event]');if(!a)return;window.dispatchEvent(new CustomEvent('portfolio:event',{detail:{event:a.dataset.portfolioEvent,pageType:document.body.dataset.pageType,pageId:document.body.dataset.pageId,locale:document.documentElement.lang,href:a.href||null}}));});";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJson(source, label) {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function routeFile(basePath, path) {
  const relativePath = path.slice(basePath.length);
  return relativePath ? resolve(dist, relativePath, 'index.html') : resolve(dist, 'index.html');
}

async function listHtmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(path);
  }
  return result;
}

async function listArtifactFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listArtifactFiles(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function tags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

function attributes(source, tag, name) {
  return tags(source, tag).map((value) => attribute(value, name)).filter((value) => value !== null);
}

function canonicalLinks(source) {
  return tags(source, 'link')
    .filter((tag) => (attribute(tag, 'rel') ?? '').split(/\s+/).some((token) => token.toLowerCase() === 'canonical'))
    .map((tag) => ({ tag, href: attribute(tag, 'href') }));
}

function scriptElements(source) {
  return [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((match) => ({
    tag: match[0],
    attributes: match[1],
    body: match[2],
  }));
}

function scriptAttribute(script, name) {
  return attribute(`<script${script.attributes}>`, name);
}

function validateCanonical(html, expected, label) {
  const canonicals = canonicalLinks(html);
  assert(canonicals.length === 1, `${label}: expected exactly one canonical link, found ${canonicals.length}.`);
  assert(canonicals[0].href === expected, `${label}: canonical mismatch: ${canonicals[0].href ?? '<missing href>'}.`);
}

function validateJsonLd(html, label) {
  const jsonLdScripts = scriptElements(html).filter((script) => (scriptAttribute(script, 'type') ?? '').toLowerCase() === 'application/ld+json');
  assert(jsonLdScripts.length > 0, `${label}: structured data is missing.`);

  for (const [index, script] of jsonLdScripts.entries()) {
    assert(script.body.trim().length > 0, `${label}: JSON-LD block ${index + 1} is empty.`);
    const value = parseJson(script.body, `${label}: JSON-LD block ${index + 1}`);
    assert(value !== null && typeof value === 'object', `${label}: JSON-LD block ${index + 1} must contain an object or array.`);
  }
}

function validateStaticRuntime(html, label, { requireEventHook = true } = {}) {
  assert(!/<canvas\b/i.test(html), `${label}: static page unexpectedly contains a canvas runtime surface.`);
  assert(!/<script\b[^>]*\btype=["'](?:module|importmap)["']/i.test(html), `${label}: static page unexpectedly loads a module or import map.`);

  for (const link of tags(html, 'link')) {
    const rel = (attribute(link, 'rel') ?? '').toLowerCase().split(/\s+/);
    const as = (attribute(link, 'as') ?? '').toLowerCase();
    if (rel.includes('modulepreload') || (rel.includes('preload') && as === 'script')) {
      throw new Error(`${label}: static page unexpectedly preloads a JavaScript runtime.`);
    }
  }

  const executableScripts = scriptElements(html).filter((script) => (scriptAttribute(script, 'type') ?? '').toLowerCase() !== 'application/ld+json');
  const expectedCount = requireEventHook ? 1 : 0;
  assert(executableScripts.length === expectedCount, `${label}: expected ${expectedCount} bounded executable script(s), found ${executableScripts.length}.`);

  if (requireEventHook) {
    const script = executableScripts[0];
    assert(scriptAttribute(script, 'src') === null, `${label}: static event hook must be inline and must not load a runtime asset.`);
    assert(scriptAttribute(script, 'data-portfolio-runtime') === 'events', `${label}: executable script is not the bounded event hook.`);
    assert(script.body === analyticsBody, `${label}: bounded event hook bytes changed unexpectedly.`);
  }
}

function ids(source) {
  return new Set([...source.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
}

function htmlPath(file, basePath) {
  const rel = relative(dist, file).replaceAll('\\', '/');
  if (rel === 'index.html') return basePath;
  return `${basePath}${rel.replace(/index\.html$/, '')}`;
}

for (const file of requiredFiles) await access(resolve(dist, file), constants.R_OK);

const [rootHtml, robots, sitemap, notFound, registryText, manifestText] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, 'robots.txt'), 'utf8'),
  readFile(resolve(dist, 'sitemap.xml'), 'utf8'),
  readFile(resolve(dist, '404.html'), 'utf8'),
  readFile(resolve(dist, 'portfolio-links.json'), 'utf8'),
  readFile(resolve(dist, 'routes-manifest.json'), 'utf8'),
]);

const registry = parseJson(registryText, 'portfolio-links.json');
const manifest = parseJson(manifestText, 'routes-manifest.json');
assert(manifest.basePath === '/webgl-portfolio/', `Unexpected base path: ${manifest.basePath}`);
assert(manifest.origin === 'https://nonamezisntreal.github.io', `Unexpected site origin: ${manifest.origin}`);
assert(Array.isArray(manifest.routes), 'Routes manifest is invalid.');
assert(manifest.routes.length === 28, `Expected 28 localized routes, got ${manifest.routes.length}.`);
assert(new Set(manifest.routes.map((route) => route.path)).size === manifest.routes.length, 'Routes manifest contains duplicate paths.');
assert(manifest.routes.every((route) => /^\d{4}-\d{2}-\d{2}$/.test(route.updatedAt)), 'Routes manifest contains an invalid versioned updatedAt value.');

const latestContentDate = manifest.routes.map((route) => route.updatedAt).sort().at(-1);
const expectedGeneratedAt = `${latestContentDate}T00:00:00.000Z`;
assert(manifest.generatedAt === expectedGeneratedAt, `Routes manifest generatedAt must be derived from versioned route dates: ${expectedGeneratedAt}.`);
assert(registry.generatedAt === expectedGeneratedAt, `Portfolio registry generatedAt must be derived from versioned route dates: ${expectedGeneratedAt}.`);
assert(registry.schemaVersion === 1, 'Unexpected portfolio link registry version.');
assert(registry.canonicalHomepageUrl === canonicalHomepage, 'Portfolio registry changed the canonical homepage URL.');
assert(Array.isArray(registry.links), 'Portfolio link registry links are invalid.');
assert(registry.links.length === manifest.routes.length, 'Portfolio link registry and routes manifest are out of sync.');
assert(new Set(registry.links.map((item) => item.id)).size === registry.links.length, 'Portfolio registry contains duplicate IDs.');
assert(new Set(registry.links.map((item) => item.canonicalUrl)).size === registry.links.length, 'Portfolio registry contains duplicate URLs.');
assert(registry.links.every((item) => item.enabled === true && item.confidentiality === 'public'), 'Generated registry contains a disabled or non-public link.');

validateCanonical(rootHtml, canonicalHomepage, 'Homepage');
validateJsonLd(rootHtml, 'Homepage');
assert(rootHtml.includes(`hreflang="en" href="${canonicalHomepage}en/"`), 'Homepage English hreflang is missing.');
assert(rootHtml.includes('id="projects"'), 'Homepage projects target is missing.');
assert(rootHtml.includes('id="explore"'), 'Homepage published-content directory is missing.');
assert(rootHtml.includes('/webgl-portfolio/services/aspnet-core-development/'), 'Homepage does not expose service deep links.');
assert(rootHtml.includes('/webgl-portfolio/cases/freelancebot/'), 'Homepage does not expose case deep links.');
assert(rootHtml.includes('/webgl-portfolio/insights/webgl-core-web-vitals/'), 'Homepage does not expose insight deep links.');
assert(rootHtml.includes('<a class="lang-toggle"'), 'Homepage language switch must be a normal link.');
assert(!rootHtml.includes('<button class="lang-toggle"'), 'Homepage language switch still mutates locale in place.');
assert(!rootHtml.includes('href="/favicon.svg"'), 'Favicon still uses a domain-root path.');
assert(!rootHtml.includes('src="/src/main.ts"'), 'Vite source entry leaked into the production artifact.');

const routeIndex = new Map(manifest.routes.map((route) => [route.path, route]));
const titles = new Map();
const descriptions = new Map();
const htmlByPath = new Map();

for (const route of manifest.routes) {
  assert(routeIndex.has(route.counterpartPath), `Missing counterpart route for ${route.path}.`);
  const file = routeFile(manifest.basePath, route.path);
  await access(file, constants.R_OK);
  const html = await readFile(file, 'utf8');
  htmlByPath.set(route.path, html);
  const canonical = `${manifest.origin}${route.path}`;
  const counterpart = `${manifest.origin}${route.counterpartPath}`;
  const locale = route.locale;
  const otherLocale = locale === 'ru' ? 'en' : 'ru';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];

  assert(title, `${route.path}: missing title.`);
  assert(description, `${route.path}: missing description.`);
  assert(!titles.has(title), `${route.path}: duplicate title also used by ${titles.get(title)}.`);
  assert(!descriptions.has(description), `${route.path}: duplicate description also used by ${descriptions.get(description)}.`);
  titles.set(title, route.path);
  descriptions.set(description, route.path);
  assert(count(html, /<h1[\s>]/gi) === 1, `${route.path}: expected exactly one H1.`);
  validateCanonical(html, canonical, route.path);
  validateJsonLd(html, route.path);
  assert(html.includes(`hreflang="${locale}" href="${canonical}"`), `${route.path}: self hreflang is missing.`);
  assert(html.includes(`hreflang="${otherLocale}" href="${counterpart}"`), `${route.path}: counterpart hreflang is missing.`);
  assert(html.includes('hreflang="x-default"'), `${route.path}: x-default is missing.`);
  assert(!html.includes('/src/main.ts'), `${route.path}: source entry leaked into static HTML.`);
  if (route.type !== 'home' || route.locale === 'en') validateStaticRuntime(html, route.path);
  assert(sitemap.includes(`<loc>${canonical}</loc>`), `${route.path}: missing from sitemap.`);

  const registryEntry = registry.links.find((item) => item.canonicalUrl === canonical);
  assert(registryEntry, `${route.path}: missing from portfolio link registry.`);
  assert(registryEntry.locale === locale, `${route.path}: registry locale mismatch.`);
}

for (const route of manifest.routes) {
  const counterpartHtml = htmlByPath.get(route.counterpartPath);
  const canonical = `${manifest.origin}${route.path}`;
  assert(counterpartHtml.includes(`hreflang="${route.locale}" href="${canonical}"`), `${route.path}: counterpart hreflang is not reciprocal.`);
}

const htmlFiles = await listHtmlFiles(dist);
assert(htmlFiles.length === manifest.routes.length + 1, `Expected ${manifest.routes.length + 1} HTML files including 404, got ${htmlFiles.length}.`);
const htmlFileIndex = new Map();
for (const file of htmlFiles) {
  if (file.endsWith('404.html')) continue;
  const path = htmlPath(file, manifest.basePath);
  htmlFileIndex.set(path, await readFile(file, 'utf8'));
}

for (const [sourcePath, html] of htmlFileIndex) {
  const sourceIds = ids(html);
  for (const href of attributes(html, 'a', 'href')) {
    if (href.startsWith('#')) {
      assert(sourceIds.has(decodeURIComponent(href.slice(1))), `${sourcePath}: broken local fragment ${href}.`);
      continue;
    }
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    assert(!href.toLowerCase().startsWith('javascript:'), `${sourcePath}: javascript: URL is forbidden.`);
    const target = new URL(href, `${manifest.origin}${sourcePath}`);
    if (target.origin !== manifest.origin) continue;
    assert(target.pathname.startsWith(manifest.basePath), `${sourcePath}: internal link escapes the project base path: ${href}.`);
    const targetHtml = htmlFileIndex.get(target.pathname);
    assert(targetHtml, `${sourcePath}: internal link target does not exist: ${href}.`);
    if (target.hash) {
      const targetIds = ids(targetHtml);
      assert(targetIds.has(decodeURIComponent(target.hash.slice(1))), `${sourcePath}: broken target fragment ${href}.`);
    }
  }
}

validateStaticRuntime(notFound, '404.html', { requireEventHook: false });
assert(robots.includes(`Sitemap: ${canonicalHomepage}sitemap.xml`), 'robots.txt does not point to the canonical sitemap.');
assert(robots.includes('User-agent: OAI-SearchBot'), 'OAI-SearchBot policy is missing.');
assert(robots.includes('User-agent: PerplexityBot'), 'PerplexityBot policy is missing.');
assert(notFound.includes('meta name="robots" content="noindex,follow"'), '404 page must be noindex,follow.');
assert(notFound.includes('href="/webgl-portfolio/"'), '404 page does not link to the project-site homepage.');
assert(!registryText.includes('utm_'), 'Portfolio registry must not contain tracking parameters.');
assert(!registryText.includes('bit.ly') && !registryText.includes('t.co'), 'Portfolio registry must not contain URL shorteners.');

const artifactFiles = await listArtifactFiles(dist);
for (const file of artifactFiles) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  assert(!(await readFile(file, 'utf8')).includes('\r'), `${relative(dist, file).replaceAll('\\', '/')}: text artifact contains non-LF line endings.`);
}

console.log(`Validated ${manifest.routes.length} localized routes, ${htmlFiles.length} HTML files, ${artifactFiles.length} LF artifacts, canonical uniqueness, parseable JSON-LD, bounded static runtime, all internal links and the public portfolio link registry.`);
