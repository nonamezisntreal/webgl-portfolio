import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { relative, resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const canonicalHomepage = 'https://nonamezisntreal.github.io/webgl-portfolio/';
const requiredFiles = ['index.html', 'robots.txt', 'sitemap.xml', '404.html', 'portfolio-links.json', 'routes-manifest.json'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    else if (entry.name.endsWith('.html')) result.push(path);
  }
  return result;
}

function attributes(source, tag, attribute) {
  const values = [];
  const tagPattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const attributePattern = new RegExp(`\\b${attribute}=["']([^"']+)["']`, 'i');
  for (const match of source.matchAll(tagPattern)) {
    const value = match[0].match(attributePattern)?.[1];
    if (value) values.push(value);
  }
  return values;
}

function ids(source) {
  return new Set([...source.matchAll(/\\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
}

function htmlPath(file, basePath) {
  const rel = relative(dist, file).replaceAll('\\', '/');
  if (rel === 'index.html') return basePath;
  return `${basePath}${rel.replace(/index\\.html$/, '')}`;
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

const registry = JSON.parse(registryText);
const manifest = JSON.parse(manifestText);
assert(manifest.basePath === '/webgl-portfolio/', `Unexpected base path: ${manifest.basePath}`);
assert(manifest.origin === 'https://nonamezisntreal.github.io', `Unexpected site origin: ${manifest.origin}`);
assert(Array.isArray(manifest.routes), 'Routes manifest is invalid.');
assert(manifest.routes.length === 28, `Expected 28 localized routes, got ${manifest.routes.length}.`);
assert(new Set(manifest.routes.map((route) => route.path)).size === manifest.routes.length, 'Routes manifest contains duplicate paths.');
assert(registry.schemaVersion === 1, 'Unexpected portfolio link registry version.');
assert(registry.canonicalHomepageUrl === canonicalHomepage, 'Portfolio registry changed the canonical homepage URL.');
assert(registry.links.length === manifest.routes.length, 'Portfolio link registry and routes manifest are out of sync.');
assert(new Set(registry.links.map((item) => item.id)).size === registry.links.length, 'Portfolio registry contains duplicate IDs.');
assert(new Set(registry.links.map((item) => item.canonicalUrl)).size === registry.links.length, 'Portfolio registry contains duplicate URLs.');
assert(registry.links.every((item) => item.enabled === true && item.confidentiality === 'public'), 'Generated registry contains a disabled or non-public link.');

const canonicalPattern = new RegExp(`<link\\s+rel=["']canonical["'][^>]+href=["']${escapeRegex(canonicalHomepage)}["']`, 'gi');
assert(count(rootHtml, canonicalPattern) === 1, 'Homepage must contain one exact canonical link.');
assert(rootHtml.includes(`hreflang="en" href="${canonicalHomepage}en/"`), 'Homepage English hreflang is missing.');
assert(rootHtml.includes('type="application/ld+json"'), 'Homepage ProfilePage structured data is missing.');
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
  const title = html.match(/<title>([^<]+)<\\/title>/i)?.[1];
  const description = html.match(/<meta\\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];

  assert(title, `${route.path}: missing title.`);
  assert(description, `${route.path}: missing description.`);
  assert(!titles.has(title), `${route.path}: duplicate title also used by ${titles.get(title)}.`);
  assert(!descriptions.has(description), `${route.path}: duplicate description also used by ${descriptions.get(description)}.`);
  titles.set(title, route.path);
  descriptions.set(description, route.path);
  assert(count(html, /<h1[\\s>]/gi) === 1, `${route.path}: expected exactly one H1.`);
  assert(count(html, new RegExp(`<link\\s+rel=["']canonical["'][^>]+href=["']${escapeRegex(canonical)}["']`, 'gi')) === 1, `${route.path}: canonical mismatch.`);
  assert(html.includes(`hreflang="${locale}" href="${canonical}"`), `${route.path}: self hreflang is missing.`);
  assert(html.includes(`hreflang="${otherLocale}" href="${counterpart}"`), `${route.path}: counterpart hreflang is missing.`);
  assert(html.includes('hreflang="x-default"'), `${route.path}: x-default is missing.`);
  assert(html.includes('type="application/ld+json"'), `${route.path}: structured data is missing.`);
  assert(!html.includes('/src/main.ts'), `${route.path}: source entry leaked into static HTML.`);
  if (route.type !== 'home' || route.locale === 'en') {
    assert(!html.includes('three.'), `${route.path}: content page unexpectedly references Three.js.`);
    assert(!html.includes('type="module"'), `${route.path}: content page unexpectedly loads a module.`);
  }
  assert(sitemap.includes(`<loc>${canonical}</loc>`), `${route.path}: missing from sitemap.`);

  const registryEntry = registry.links.find((item) => item.canonicalUrl === canonical);
  assert(registryEntry, `${route.path}: missing from portfolio link registry.`);
  assert(registryEntry.locale === locale, `${route.path}: registry locale mismatch.`);
}

for (const route of manifest.routes) {
  const html = htmlByPath.get(route.path);
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

assert(robots.includes(`Sitemap: ${canonicalHomepage}sitemap.xml`), 'robots.txt does not point to the canonical sitemap.');
assert(robots.includes('User-agent: OAI-SearchBot'), 'OAI-SearchBot policy is missing.');
assert(robots.includes('User-agent: PerplexityBot'), 'PerplexityBot policy is missing.');
assert(notFound.includes('meta name="robots" content="noindex,follow"'), '404 page must be noindex,follow.');
assert(notFound.includes('href="/webgl-portfolio/"'), '404 page does not link to the project-site homepage.');
assert(!registryText.includes('utm_'), 'Portfolio registry must not contain tracking parameters.');
assert(!registryText.includes('bit.ly') && !registryText.includes('t.co'), 'Portfolio registry must not contain URL shorteners.');

console.log(`Validated ${manifest.routes.length} localized routes, ${htmlFiles.length} HTML files, all internal links and the public portfolio link registry.`);
