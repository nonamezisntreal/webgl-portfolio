import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { assertExactKeys, decodeHtmlEntities, normalizeTextNfc, parseJsonStrict, visiblePerceivedText } from './validation-utils.mjs';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const dist = resolve(projectRoot, process.env.DIST_DIR ?? 'dist');
const canonicalOrigin = 'https://nonamezisntreal.github.io';
const canonicalBasePath = '/webgl-portfolio/';
const canonicalHomepage = `${canonicalOrigin}${canonicalBasePath}`;
const canonicalSitemap = `${canonicalHomepage}sitemap.xml`;
const allowedExternalAssetOrigins = new Set(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']);
const requiredFiles = ['index.html', 'robots.txt', 'sitemap.xml', '404.html', 'portfolio-links.json', 'routes-manifest.json'];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
const analyticsBody = "document.addEventListener('click',function(e){var a=e.target.closest('[data-portfolio-event]');if(!a)return;window.dispatchEvent(new CustomEvent('portfolio:event',{detail:{event:a.dataset.portfolioEvent,pageType:document.body.dataset.pageType,pageId:document.body.dataset.pageId,locale:document.documentElement.lang,href:a.href||null}}));});";
const expectedIdentity = {
  name: 'Hazard',
  profileUrl: canonicalHomepage,
  sameAs: ['https://github.com/nonamezisntreal', 'https://t.me/JustNikitafornow'],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(source, label) {
  return parseJsonStrict(source, label);
}

function normalizedRelative(root, file) {
  return relative(root, file).split(sep).join('/');
}

function routeFile(basePath, path) {
  assert(path.startsWith(basePath), `Route path escapes base path: ${path}`);
  const relativePath = path.slice(basePath.length);
  return relativePath ? resolve(dist, relativePath, 'index.html') : resolve(dist, 'index.html');
}

async function listFiles(directory, predicate = () => true) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(path, predicate));
    else if (entry.isFile() && predicate(path)) result.push(path);
  }
  return result.sort();
}

function tags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null;
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

function decodeHtml(value) {
  return decodeHtmlEntities(value);
}

function normalizeText(value) {
  return normalizeTextNfc(value);
}

function visibleText(html) {
  return visiblePerceivedText(html);
}

function assertVisible(text, value, label) {
  const expected = normalizeText(value);
  assert(expected.length > 0, `${label} must be nonempty.`);
  assert(text.toLocaleLowerCase().includes(expected.toLocaleLowerCase()), `${label} is not present in visible page content.`);
}

function validateCanonical(html, expected, label) {
  const canonicals = canonicalLinks(html);
  assert(canonicals.length === 1, `${label}: expected exactly one canonical link, found ${canonicals.length}.`);
  assert(canonicals[0].href !== null && canonicals[0].href.length > 0, `${label}: canonical href is empty.`);
  let parsed;
  try {
    parsed = new URL(canonicals[0].href);
  } catch {
    throw new Error(`${label}: canonical URL is malformed.`);
  }
  assert(parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '' && parsed.search === '' && parsed.hash === '', `${label}: canonical URL must be an absolute clean HTTPS URL.`);
  assert(parsed.href === expected, `${label}: canonical mismatch: ${parsed.href}.`);
}

function validateHttpsUrl(value, label, { exact, origin, underBasePath = false } = {}) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a nonempty URL.`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid absolute URL.`);
  }
  assert(parsed.protocol === 'https:', `${label} must use HTTPS.`);
  assert(parsed.username === '' && parsed.password === '' && parsed.hash === '' && parsed.search === '', `${label} must not contain credentials, query parameters or fragments.`);
  if (exact !== undefined) assert(parsed.href === exact, `${label} must equal ${exact}.`);
  if (origin !== undefined) assert(parsed.origin === origin, `${label} must remain under ${origin}.`);
  if (underBasePath) assert(parsed.pathname.startsWith(canonicalBasePath), `${label} escapes ${canonicalBasePath}.`);
  return parsed;
}

function dateValue(value, label) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must use YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value), `${label} is not a valid calendar date.`);
  return date.valueOf();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function flattenJsonLd(value, label) {
  if (Array.isArray(value)) {
    assert(value.length > 0, `${label} must not be an empty array.`);
    return value.map((item, index) => {
      assert(!Array.isArray(item), `${label}[${index}] must contain a nonempty object; nested JSON-LD arrays are forbidden.`);
      assert(isObject(item) && Object.keys(item).length > 0, `${label}[${index}] must contain a nonempty object.`);
      assert(!Object.hasOwn(item, '@graph'), `${label}[${index}] may not hide objects in an unsupported @graph container.`);
      return item;
    });
  }
  assert(isObject(value) && Object.keys(value).length > 0, `${label} must contain a nonempty object.`);
  assert(!Object.hasOwn(value, '@graph'), `${label} may not hide objects in an unsupported @graph container.`);
  return [value];
}

function validatePerson(value, label, { url, profile = false }) {
  assert(isObject(value), `${label} must be an object.`);
  assertExactKeys(value, profile
    ? ['@type', 'name', 'url', 'description', 'sameAs', 'knowsAbout']
    : ['@type', 'name', 'url'], label);
  assert(value['@type'] === 'Person', `${label}.@type must be Person.`);
  assert(value.name === expectedIdentity.name, `${label}.name must match the canonical public identity.`);
  validateHttpsUrl(value.url, `${label}.url`, { exact: url });
}

function validateJsonLd(html, label, route, canonical, metaDescription, h1) {
  const jsonLdScripts = scriptElements(html).filter((script) => (scriptAttribute(script, 'type') ?? '').toLowerCase() === 'application/ld+json');
  assert(jsonLdScripts.length > 0, `${label}: structured data is missing.`);
  const objects = [];
  for (const [index, script] of jsonLdScripts.entries()) {
    assert(script.body.trim().length > 0, `${label}: JSON-LD block ${index + 1} is empty.`);
    const parsed = parseJson(script.body, `${label}: JSON-LD block ${index + 1}`);
    objects.push(...flattenJsonLd(parsed, `${label}: JSON-LD block ${index + 1}`));
  }

  const fingerprints = objects.map(stableJson);
  assert(new Set(fingerprints).size === fingerprints.length, `${label}: duplicate JSON-LD object detected.`);
  for (const [index, object] of objects.entries()) {
    assert(object['@context'] === 'https://schema.org', `${label}: JSON-LD object ${index + 1} has missing or unsupported @context.`);
    assert(typeof object['@type'] === 'string' && object['@type'].length > 0, `${label}: JSON-LD object ${index + 1} has missing @type.`);
  }

  const allowedTypes = route.type === 'home' ? ['ProfilePage'] : route.type === 'service' ? ['Service', 'FAQPage'] : ['TechArticle'];
  for (const object of objects) assert(allowedTypes.includes(object['@type']), `${label}: unsupported JSON-LD @type ${object['@type']} for route type ${route.type}.`);
  const topLevelContracts = {
    ProfilePage: ['@context', '@type', 'mainEntity'],
    Service: ['@context', '@type', 'name', 'description', 'url', 'provider'],
    FAQPage: ['@context', '@type', 'mainEntity'],
    TechArticle: ['@context', '@type', 'headline', 'description', 'datePublished', 'dateModified', 'author', 'mainEntityOfPage'],
  };
  for (const object of objects) {
    const keys = object['@type'] === 'TechArticle' && Object.hasOwn(object, 'keywords')
      ? [...topLevelContracts.TechArticle, 'keywords']
      : topLevelContracts[object['@type']];
    assertExactKeys(object, keys, `${label}: ${object['@type']}`);
  }
  const byType = new Map(allowedTypes.map((type) => [type, objects.filter((item) => item['@type'] === type)]));
  const primaryType = route.type === 'home' ? 'ProfilePage' : route.type === 'service' ? 'Service' : 'TechArticle';
  assert(byType.get(primaryType).length === 1, `${label}: expected exactly one ${primaryType} object.`);
  if (route.type === 'service') assert(byType.get('FAQPage').length <= 1, `${label}: expected at most one FAQPage object.`);
  assert(objects.length === [...byType.values()].reduce((sum, values) => sum + values.length, 0), `${label}: contradictory structured data objects detected.`);

  const pageText = visibleText(html);
  const primary = byType.get(primaryType)[0];
  if (primaryType === 'ProfilePage') {
    validatePerson(primary.mainEntity, `${label}: ProfilePage.mainEntity`, { url: canonical, profile: true });
    assert(primary.mainEntity.description === metaDescription, `${label}: profile description does not match the localized page description.`);
    assertVisible(pageText, primary.mainEntity.name, `${label}: profile name`);
    assert(Array.isArray(primary.mainEntity.knowsAbout) && primary.mainEntity.knowsAbout.length > 0 && primary.mainEntity.knowsAbout.every((item) => typeof item === 'string' && item.trim().length > 0), `${label}: ProfilePage.mainEntity.knowsAbout must be a nonempty string array.`);
    assert(Array.isArray(primary.mainEntity.sameAs), `${label}: ProfilePage.mainEntity.sameAs must be an array.`);
    assert(JSON.stringify([...primary.mainEntity.sameAs].sort()) === JSON.stringify([...expectedIdentity.sameAs].sort()), `${label}: ProfilePage.mainEntity.sameAs does not match the expected public profiles.`);
    for (const [index, url] of primary.mainEntity.sameAs.entries()) validateHttpsUrl(url, `${label}: sameAs[${index}]`);
  } else if (primaryType === 'Service') {
    assert(typeof primary.name === 'string' && primary.name.length > 0, `${label}: Service.name is required.`);
    assert(typeof primary.description === 'string' && primary.description.length > 0, `${label}: Service.description is required.`);
    assert(primary.description === metaDescription, `${label}: Service.description does not match the page description.`);
    validateHttpsUrl(primary.url, `${label}: Service.url`, { exact: canonical });
    validatePerson(primary.provider, `${label}: Service.provider`, { url: expectedIdentity.profileUrl });
    assertVisible(pageText, primary.name, `${label}: Service.name`);
    assert(normalizeText(h1) === normalizeText(primary.name), `${label}: Service.name does not match the visible H1.`);
  } else {
    assert(typeof primary.headline === 'string' && primary.headline.length > 0, `${label}: TechArticle.headline is required.`);
    assert(typeof primary.description === 'string' && primary.description.length > 0, `${label}: TechArticle.description is required.`);
    assert(primary.description === metaDescription, `${label}: TechArticle.description does not match the page description.`);
    if (Object.hasOwn(primary, 'keywords')) assert((typeof primary.keywords === 'string' && primary.keywords.trim().length > 0) || (Array.isArray(primary.keywords) && primary.keywords.length > 0 && primary.keywords.every((item) => typeof item === 'string' && item.trim().length > 0)), `${label}: TechArticle.keywords must be a nonempty string or string array.`);
    const published = dateValue(primary.datePublished, `${label}: TechArticle.datePublished`);
    const modified = dateValue(primary.dateModified, `${label}: TechArticle.dateModified`);
    assert(published <= modified, `${label}: TechArticle.datePublished must not be after dateModified.`);
    assert(primary.dateModified === route.updatedAt, `${label}: TechArticle.dateModified must match the versioned route date.`);
    validatePerson(primary.author, `${label}: TechArticle.author`, { url: expectedIdentity.profileUrl });
    validateHttpsUrl(primary.mainEntityOfPage, `${label}: TechArticle.mainEntityOfPage`, { exact: canonical });
    assertVisible(pageText, primary.headline, `${label}: TechArticle.headline`);
    assert(normalizeText(h1).toLocaleLowerCase().includes(normalizeText(primary.headline).toLocaleLowerCase()), `${label}: TechArticle.headline does not match the visible H1.`);
  }

  const faqObjects = byType.get('FAQPage') ?? [];
  if (faqObjects.length === 1) {
    const faq = faqObjects[0];
    assert(Array.isArray(faq.mainEntity) && faq.mainEntity.length > 0, `${label}: FAQPage.mainEntity must be nonempty.`);
    const questions = new Set();
    for (const [index, question] of faq.mainEntity.entries()) {
      assert(isObject(question) && question['@type'] === 'Question', `${label}: FAQ item ${index + 1} must be a Question.`);
      assertExactKeys(question, ['@type', 'name', 'acceptedAnswer'], `${label}: FAQ question ${index + 1}`);
      assert(typeof question.name === 'string' && question.name.trim().length > 0, `${label}: FAQ question ${index + 1} is empty.`);
      const normalizedQuestion = normalizeText(question.name).normalize('NFKC').toLocaleLowerCase();
      assert(!questions.has(normalizedQuestion), `${label}: duplicate FAQ question detected.`);
      questions.add(normalizedQuestion);
      assert(isObject(question.acceptedAnswer) && question.acceptedAnswer['@type'] === 'Answer', `${label}: FAQ answer ${index + 1} must be an Answer.`);
      assertExactKeys(question.acceptedAnswer, ['@type', 'text'], `${label}: FAQ answer ${index + 1}`);
      assert(typeof question.acceptedAnswer.text === 'string' && question.acceptedAnswer.text.trim().length > 0, `${label}: FAQ answer ${index + 1} is empty.`);
      assertVisible(pageText, question.name, `${label}: FAQ question ${index + 1}`);
      assertVisible(pageText, question.acceptedAnswer.text, `${label}: FAQ answer ${index + 1}`);
    }
  }
}

function validateStaticRuntime(html, label, { requireEventHook = true } = {}) {
  assert(!/<canvas\b/i.test(html), `${label}: static page unexpectedly contains a canvas runtime surface.`);
  assert(!/<script\b[^>]*\btype=["'](?:module|importmap)["']/i.test(html), `${label}: static page unexpectedly loads a module or import map.`);
  for (const link of tags(html, 'link')) {
    const rel = (attribute(link, 'rel') ?? '').toLowerCase().split(/\s+/);
    const as = (attribute(link, 'as') ?? '').toLowerCase();
    if (rel.includes('modulepreload') || (rel.includes('preload') && as === 'script')) throw new Error(`${label}: static page unexpectedly preloads a JavaScript runtime.`);
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
  const rel = normalizedRelative(dist, file);
  if (rel === 'index.html') return basePath;
  return `${basePath}${rel.replace(/index\.html$/, '')}`;
}

function parseSitemap(source) {
  assert(!/<!DOCTYPE|<!ENTITY|\bSYSTEM\b|\bPUBLIC\b|<!\[CDATA\[/iu.test(source), 'sitemap.xml contains forbidden DOCTYPE, entity or external-authority syntax.');
  assert(/^\s*(?:<\?xml\s+version=["']1\.0["']\s+encoding=["']UTF-8["']\s*\?>\s*)?<urlset\b[\s\S]*<\/urlset>\s*$/u.test(source), 'sitemap.xml is malformed XML or contains partial/ambiguous root content.');
  const validation = XMLValidator.validate(source, { allowBooleanAttributes: false });
  assert(validation === true, `sitemap.xml is malformed XML: ${validation.err?.msg ?? 'unknown XML error'}.`);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: true,
    processEntities: false,
    ignoreDeclaration: true,
    isArray: (_name, path) => path === 'urlset.url' || path === 'urlset.url.xhtml:link',
  });
  const document = parser.parse(source);
  assert(isObject(document), 'sitemap.xml must contain one urlset root.');
  assertExactKeys(document, ['urlset'], 'sitemap.xml document');
  assert(isObject(document.urlset), 'sitemap.xml must contain one urlset root.');
  const root = document.urlset;
  assert(root['@_xmlns'] === 'http://www.sitemaps.org/schemas/sitemap/0.9', 'sitemap.xml uses an unexpected sitemap namespace.');
  assert(root['@_xmlns:xhtml'] === 'http://www.w3.org/1999/xhtml', 'sitemap.xml uses an unexpected XHTML namespace.');
  assertExactKeys(root, ['@_xmlns', '@_xmlns:xhtml', 'url'], 'sitemap.xml urlset');
  assert(Array.isArray(root.url), 'sitemap.xml url entries must be an array.');
  return root.url;
}

function validateSitemap(source, manifest) {
  const entries = parseSitemap(source);
  assert(entries.length === manifest.routes.length, `sitemap.xml expected ${manifest.routes.length} URLs, found ${entries.length}.`);
  const expected = new Map(manifest.routes.map((route) => [`${manifest.origin}${route.path}`, route]));
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    assert(isObject(entry), `sitemap.xml URL entry ${index + 1} is invalid.`);
    assertExactKeys(entry, ['lastmod', 'loc', 'xhtml:link'], `sitemap.xml URL entry ${index + 1}`);
    assert(typeof entry.loc === 'string' && entry.loc.trim().length > 0, `sitemap.xml loc ${index + 1} must be a nonempty URL scalar; duplicate <loc> nodes are forbidden.`);
    const loc = normalizeText(entry.loc);
    validateHttpsUrl(loc, `sitemap.xml loc ${index + 1}`, { origin: canonicalOrigin, underBasePath: true });
    assert(!seen.has(loc), `sitemap.xml contains duplicate loc ${loc}.`);
    seen.add(loc);
    const route = expected.get(loc);
    assert(route, `sitemap.xml contains undeclared route ${loc}.`);
    assert(entry.lastmod === route.updatedAt, `sitemap.xml lastmod mismatch for ${loc}: expected ${route.updatedAt}.`);
    dateValue(entry.lastmod, `sitemap.xml lastmod for ${loc}`);
    assert(Array.isArray(entry['xhtml:link']) && entry['xhtml:link'].length === 3, `sitemap.xml ${loc} must contain exactly three alternate links.`);
    const expectedAlternates = new Set([
      `${route.locale}|${loc}`,
      `${route.locale === 'ru' ? 'en' : 'ru'}|${manifest.origin}${route.counterpartPath}`,
      `x-default|${manifest.origin}${route.locale === 'ru' ? route.path : route.counterpartPath}`,
    ]);
    const actualAlternates = new Set();
    for (const alternate of entry['xhtml:link']) {
      assert(isObject(alternate), `sitemap.xml ${loc} contains malformed alternate metadata.`);
      assertExactKeys(alternate, ['@_rel', '@_hreflang', '@_href'], `sitemap.xml alternate for ${loc}`);
      assert(alternate['@_rel'] === 'alternate', `sitemap.xml ${loc} contains malformed alternate metadata.`);
      assert(['ru', 'en', 'x-default'].includes(alternate['@_hreflang']), `sitemap.xml ${loc} contains an unsupported hreflang authority.`);
      validateHttpsUrl(alternate['@_href'], `sitemap.xml alternate for ${loc}`, { origin: canonicalOrigin, underBasePath: true });
      const tuple = `${alternate['@_hreflang']}|${alternate['@_href']}`;
      assert(!actualAlternates.has(tuple), `sitemap.xml ${loc} contains duplicate alternate metadata.`);
      actualAlternates.add(tuple);
    }
    assert(JSON.stringify([...actualAlternates].sort()) === JSON.stringify([...expectedAlternates].sort()), `sitemap.xml alternates mismatch for ${loc}.`);
  }
  assert(seen.size === expected.size && [...expected.keys()].every((url) => seen.has(url)), 'sitemap.xml route-manifest parity failed: missing URL(s).');
}

function validateRobots(source) {
  const lines = source.split(/\r?\n/).map((line) => line.replace(/#.*$/, '').trim()).filter(Boolean);
  const groups = new Map();
  const sitemaps = [];
  let currentAgents = [];
  for (const [index, line] of lines.entries()) {
    const separator = line.indexOf(':');
    assert(separator > 0, `robots.txt line ${index + 1} is malformed.`);
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    assert(['user-agent', 'allow', 'disallow', 'sitemap'].includes(name), `robots.txt contains unsupported directive ${name}.`);
    if (name === 'sitemap') {
      sitemaps.push(value);
      currentAgents = [];
      continue;
    }
    if (name === 'user-agent') {
      assert(value.length > 0, 'robots.txt contains an empty User-agent.');
      assert(!groups.has(value.toLowerCase()), `robots.txt contains a conflicting duplicate crawler group for ${value}.`);
      groups.set(value.toLowerCase(), { display: value, allow: [], disallow: [] });
      currentAgents = [value.toLowerCase()];
      continue;
    }
    assert(currentAgents.length > 0, `robots.txt ${name} directive is not attached to a crawler group.`);
    for (const agent of currentAgents) groups.get(agent)[name].push(value);
  }
  assert(sitemaps.length === 1 && sitemaps[0] === canonicalSitemap, 'robots.txt must declare exactly the canonical sitemap URL.');
  const expectedAgents = ['*', 'oai-searchbot', 'perplexitybot'];
  assert(JSON.stringify([...groups.keys()].sort()) === JSON.stringify(expectedAgents.sort()), `robots.txt crawler groups must be exactly *, OAI-SearchBot and PerplexityBot.`);
  for (const group of groups.values()) {
    assert(group.disallow.length === 0 || group.disallow.every((value) => value === ''), `robots.txt ${group.display} must not contain a nonempty Disallow rule.`);
    assert(group.allow.length === 1 && group.allow[0] === '/', `robots.txt ${group.display} must contain exactly Allow: /.`);
  }
}

function splitSrcset(value, label) {
  const candidates = value.split(',').map((candidate) => candidate.trim()).filter(Boolean);
  assert(candidates.length > 0, `${label} contains no srcset candidates.`);
  const descriptors = new Set();
  return candidates.map((candidate) => {
    const parts = candidate.split(/\s+/u);
    assert(parts.length >= 1 && parts.length <= 2 && parts[0].length > 0, `${label} contains a malformed srcset candidate.`);
    const descriptor = parts[1] ?? '1x';
    assert(/^(?:[1-9]\d*)w$/u.test(descriptor) || /^(?:\d+(?:\.\d+)?)x$/u.test(descriptor) && Number.parseFloat(descriptor) > 0, `${label} contains invalid srcset descriptor ${descriptor}.`);
    assert(!descriptors.has(descriptor), `${label} contains duplicate srcset descriptor ${descriptor}.`);
    descriptors.add(descriptor);
    return parts[0];
  });
}

function rawTraversal(value, label) {
  const path = value.split(/[?#]/, 1)[0];
  assert(!/%2f|%5c/i.test(path), `${label} contains encoded path separators.`);
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new Error(`${label} contains malformed URL encoding.`);
  }
  assert(!decoded.includes('\\') && !decoded.includes('\0'), `${label} contains an invalid path separator or NUL.`);
  assert(!decoded.split('/').some((segment) => segment === '.' || segment === '..'), `${label} contains path traversal.`);
}

async function exactCaseAssetPath(relativePath, label) {
  const segments = relativePath.split('/').filter(Boolean);
  assert(segments.length > 0, `${label} does not identify an asset file.`);
  let current = dist;
  for (const segment of segments) {
    assert(segment === segment.normalize('NFC'), `${label} contains a non-NFC path segment.`);
    const names = (await readdir(current, { withFileTypes: true })).map((entry) => entry.name);
    if (!names.includes(segment)) {
      const collision = names.find((name) => name.toLocaleLowerCase('en-US') === segment.toLocaleLowerCase('en-US'));
      if (collision) throw new Error(`${label} has a case-sensitive path mismatch: requested ${segment}, generated ${collision}.`);
      throw new Error(`${label} references missing internal asset ${relativePath}.`);
    }
    current = resolve(current, segment);
  }
  return current;
}

async function validateInternalAssetReference(value, pagePath, label, manifest) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} is empty.`);
  assert(value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value), `${label} contains whitespace or control characters.`);
  if (/^(?:data|blob):/i.test(value)) return;
  assert(!/^javascript:/i.test(value), `${label} uses javascript:.`);
  assert(!value.startsWith('//'), `${label} uses a forbidden protocol-relative external reference.`);
  rawTraversal(value, label);
  let target;
  try {
    target = new URL(value, `${manifest.origin}${pagePath}`);
  } catch {
    throw new Error(`${label} is a malformed URL.`);
  }
  assert(target.protocol === 'https:', `${label} must use HTTPS.`);
  assert(target.username === '' && target.password === '', `${label} must not contain URL userinfo.`);
  if (target.origin !== manifest.origin) {
    assert(allowedExternalAssetOrigins.has(target.origin), `${label} references an unapproved external asset authority.`);
    assert(target.hash === '', `${label} external asset must not contain a fragment.`);
    return;
  }
  assert(target.pathname.startsWith(manifest.basePath), `${label} escapes the project base path: ${value}.`);
  assert(target.search === '' && target.hash === '', `${label} must not use query parameters or fragments.`);
  let relativePath;
  try {
    relativePath = decodeURIComponent(target.pathname.slice(manifest.basePath.length));
  } catch {
    throw new Error(`${label} contains malformed URL encoding.`);
  }
  const file = await exactCaseAssetPath(relativePath, label);
  assert(file === dist || file.startsWith(`${dist}${sep}`), `${label} resolves outside dist.`);
  try {
    await access(file, constants.R_OK);
  } catch {
    throw new Error(`${label} references missing internal asset ${target.pathname}.`);
  }
}

async function validateInternalAssets(html, pagePath, label, manifest) {
  const references = [];
  for (const script of scriptElements(html)) {
    const src = scriptAttribute(script, 'src');
    if (src !== null) references.push([src, `${label}: script[src]`]);
  }
  for (const link of tags(html, 'link')) {
    const rel = (attribute(link, 'rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (rel.some((token) => ['stylesheet', 'icon', 'preload', 'modulepreload'].includes(token))) {
      const href = attribute(link, 'href');
      assert(href !== null, `${label}: asset link is missing href.`);
      references.push([href, `${label}: link[rel=${rel.join(' ')}]`]);
    }
  }
  for (const tagName of ['img', 'source']) {
    for (const tag of tags(html, tagName)) {
      const src = attribute(tag, 'src');
      if (src !== null) references.push([src, `${label}: ${tagName}[src]`]);
      const srcset = attribute(tag, 'srcset');
      if (srcset !== null) for (const candidate of splitSrcset(srcset, `${label}: ${tagName}[srcset]`)) references.push([candidate, `${label}: ${tagName}[srcset]`]);
    }
  }
  for (const [value, referenceLabel] of references) await validateInternalAssetReference(value, pagePath, referenceLabel, manifest);
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
assert(manifest.basePath === canonicalBasePath, `Unexpected base path: ${manifest.basePath}`);
assert(manifest.origin === canonicalOrigin, `Unexpected site origin: ${manifest.origin}`);
assert(Array.isArray(manifest.routes), 'Routes manifest is invalid.');
assert(manifest.routes.length === 28, `Expected 28 localized routes, got ${manifest.routes.length}.`);
assert(new Set(manifest.routes.map((route) => route.path)).size === manifest.routes.length, 'Routes manifest contains duplicate paths.');
const routePathAuthorities = new Map();
for (const route of manifest.routes) {
  assert(route.path === route.path.normalize('NFC') && route.counterpartPath === route.counterpartPath.normalize('NFC'), `Route ${route.id} contains a non-NFC path.`);
  for (const path of [route.path, route.counterpartPath]) {
    const authority = path.normalize('NFC').toLocaleLowerCase('en-US');
    const previous = routePathAuthorities.get(authority);
    assert(previous === undefined || previous === path, `Routes manifest contains a mixed-case or Unicode-equivalent path collision: ${previous} and ${path}.`);
    routePathAuthorities.set(authority, path);
  }
}
assert(new Set(manifest.routes.map((route) => `${route.locale}:${route.type}:${route.id}`)).size === manifest.routes.length, 'Routes manifest contains duplicate locale/type/ID records.');
for (const route of manifest.routes) {
  assert(['ru', 'en'].includes(route.locale), `Route ${route.path} has invalid locale.`);
  assert(['home', 'service', 'case', 'insight'].includes(route.type), `Route ${route.path} has invalid route type.`);
  assert(typeof route.id === 'string' && route.id.length > 0, `Route ${route.path} has an empty ID.`);
  assert(typeof route.path === 'string' && route.path.startsWith(manifest.basePath) && route.path.endsWith('/') && !route.path.includes('\\'), `Route ${route.id} has invalid path or platform-specific separator.`);
  assert(typeof route.counterpartPath === 'string' && route.counterpartPath.startsWith(manifest.basePath) && route.counterpartPath.endsWith('/') && !route.counterpartPath.includes('\\'), `Route ${route.path} has invalid counterpart path or platform-specific separator.`);
  dateValue(route.updatedAt, `Route ${route.path} updatedAt`);
}
const latestContentDate = manifest.routes.map((route) => route.updatedAt).sort().at(-1);
const expectedGeneratedAt = `${latestContentDate}T00:00:00.000Z`;
const expectedCopyright = `© ${latestContentDate.slice(0, 4)} ${expectedIdentity.name}`;
assert(manifest.generatedAt === expectedGeneratedAt, `Routes manifest generatedAt must be derived from versioned route dates: ${expectedGeneratedAt}.`);
assert(registry.generatedAt === expectedGeneratedAt, `Portfolio registry generatedAt must be derived from versioned route dates: ${expectedGeneratedAt}.`);
assert(JSON.stringify(Object.keys(manifest)) === JSON.stringify(['generatedAt', 'origin', 'basePath', 'routes']), 'routes-manifest.json top-level key order is unstable.');
assert(JSON.stringify(Object.keys(registry)) === JSON.stringify(['schemaVersion', 'generatedAt', 'canonicalHomepageUrl', 'links']), 'portfolio-links.json top-level key order is unstable.');
assert(manifestText === `${JSON.stringify(manifest, null, 2)}\n`, 'routes-manifest.json serialization order or formatting is unstable.');
assert(registryText === `${JSON.stringify(registry, null, 2)}\n`, 'portfolio-links.json serialization order or formatting is unstable.');
assert(registry.schemaVersion === 1, 'Unexpected portfolio link registry version.');
assert(registry.canonicalHomepageUrl === canonicalHomepage, 'Portfolio registry changed the canonical homepage URL.');
assert(Array.isArray(registry.links) && registry.links.length === manifest.routes.length, 'Portfolio link registry and routes manifest are out of sync.');
assert(new Set(registry.links.map((item) => item.id)).size === registry.links.length, 'Portfolio registry contains duplicate IDs.');
assert(new Set(registry.links.map((item) => item.canonicalUrl)).size === registry.links.length, 'Portfolio registry contains duplicate URLs.');
assert(registry.links.every((item) => item.enabled === true && item.confidentiality === 'public'), 'Generated registry contains a disabled or non-public link.');
for (const [index, item] of registry.links.entries()) {
  assert(isObject(item), `Portfolio registry entry ${index + 1} is invalid.`);
  validateHttpsUrl(item.canonicalUrl, `Portfolio registry entry ${index + 1} canonicalUrl`, { origin: canonicalOrigin, underBasePath: true });
}
const routeIndex = new Map(manifest.routes.map((route) => [route.path, route]));
for (const route of manifest.routes) {
  const counterpart = routeIndex.get(route.counterpartPath);
  assert(counterpart, `Missing counterpart route for ${route.path}.`);
  assert(counterpart.counterpartPath === route.path && counterpart.locale !== route.locale && counterpart.type === route.type && counterpart.id === route.id, `Counterpart relationship is invalid for ${route.path}.`);
}
const registryByUrl = new Map(registry.links.map((item) => [item.canonicalUrl, item]));
for (const route of manifest.routes) {
  const canonical = `${manifest.origin}${route.path}`;
  validateHttpsUrl(canonical, `Route ${route.path} canonical`, { origin: canonicalOrigin, underBasePath: true });
  const item = registryByUrl.get(canonical);
  assert(item, `${route.path}: missing from portfolio link registry.`);
  assert(item.id === `${route.locale}:${route.type}:${route.id}`, `${route.path}: registry ID mismatch.`);
  assert(item.locale === route.locale, `${route.path}: registry locale mismatch.`);
  assert(item.type === (route.type === 'home' ? 'homepage' : route.type), `${route.path}: registry type mismatch.`);
}
validateSitemap(sitemap, manifest);
validateRobots(robots);

const titles = new Map();
const descriptions = new Map();
const htmlByPath = new Map();
for (const route of manifest.routes) {
  const file = routeFile(manifest.basePath, route.path);
  await access(file, constants.R_OK);
  const html = await readFile(file, 'utf8');
  htmlByPath.set(route.path, html);
  const canonical = `${manifest.origin}${route.path}`;
  const counterpart = `${manifest.origin}${route.counterpartPath}`;
  const titleTags = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  assert(titleTags.length === 1 && normalizeText(titleTags[0][1]).length > 0, `${route.path}: expected exactly one nonempty title.`);
  const title = normalizeText(titleTags[0][1]);
  const descriptionTags = tags(html, 'meta').filter((tag) => (attribute(tag, 'name') ?? '').toLowerCase() === 'description');
  assert(descriptionTags.length === 1, `${route.path}: expected exactly one description meta tag.`);
  const description = attribute(descriptionTags[0], 'content');
  assert(description !== null && normalizeText(description).length > 0, `${route.path}: missing description.`);
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert(h1Matches.length === 1, `${route.path}: expected exactly one H1.`);
  const h1 = normalizeText(h1Matches[0][1].replace(/<[^>]+>/g, ' '));
  assert(!titles.has(title), `${route.path}: duplicate title also used by ${titles.get(title)}.`);
  assert(!descriptions.has(description), `${route.path}: duplicate description also used by ${descriptions.get(description)}.`);
  titles.set(title, route.path);
  descriptions.set(description, route.path);
  const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  assert(lang === route.locale, `${route.path}: document language must be ${route.locale}.`);
  validateCanonical(html, canonical, route.path);
  validateJsonLd(html, route.path, route, canonical, decodeHtml(description), h1);
  assert(html.includes(`hreflang="${route.locale}" href="${canonical}"`), `${route.path}: self hreflang is missing.`);
  assert(html.includes(`hreflang="${route.locale === 'ru' ? 'en' : 'ru'}" href="${counterpart}"`), `${route.path}: counterpart hreflang is missing.`);
  assert(html.includes(`hreflang="x-default" href="${manifest.origin}${route.locale === 'ru' ? route.path : route.counterpartPath}"`), `${route.path}: x-default is incorrect.`);
  assert(!/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(html), `${route.path}: development URL leaked into generated HTML.`);
  assert(!html.includes('/src/main.ts'), `${route.path}: source entry leaked into static HTML.`);
  assert(!/\{\{[^}]+\}\}|__\w+__|TODO_REPLACE/i.test(html), `${route.path}: unresolved marker leaked into generated HTML.`);
  if (route.path !== canonicalBasePath) assert(visibleText(html).includes(expectedCopyright), `${route.path}: copyright year must be derived from the versioned content date.`);
  else assert(html.includes('<span id="year"></span>'), 'Homepage deterministic year target is missing.');
  if (route.type !== 'home' || route.locale === 'en') validateStaticRuntime(html, route.path);
  await validateInternalAssets(html, route.path, route.path, manifest);
}

const rootRoute = routeIndex.get(canonicalBasePath);
assert(rootRoute, 'Russian homepage route is missing.');
validateCanonical(rootHtml, canonicalHomepage, 'Homepage');
assert(rootHtml.includes('id="projects"'), 'Homepage projects target is missing.');
assert(rootHtml.includes('id="explore"'), 'Homepage published-content directory is missing.');
assert(rootHtml.includes('/webgl-portfolio/services/aspnet-core-development/'), 'Homepage does not expose service deep links.');
assert(rootHtml.includes('/webgl-portfolio/cases/freelancebot/'), 'Homepage does not expose case deep links.');
assert(rootHtml.includes('/webgl-portfolio/insights/webgl-core-web-vitals/'), 'Homepage does not expose insight deep links.');
assert(rootHtml.includes('<a class="lang-toggle"'), 'Homepage language switch must be a normal link.');
assert(!rootHtml.includes('<button class="lang-toggle"'), 'Homepage language switch still mutates locale in place.');
assert(!rootHtml.includes('href="/favicon.svg"'), 'Favicon still uses a domain-root path.');
assert(!rootHtml.includes('src="/src/main.ts"'), 'Vite source entry leaked into the production artifact.');

for (const route of manifest.routes) {
  const counterpartHtml = htmlByPath.get(route.counterpartPath);
  const canonical = `${manifest.origin}${route.path}`;
  assert(counterpartHtml.includes(`hreflang="${route.locale}" href="${canonical}"`), `${route.path}: counterpart hreflang is not reciprocal.`);
}

const htmlFiles = await listFiles(dist, (file) => file.endsWith('.html'));
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
      let fragment;
      try { fragment = decodeURIComponent(href.slice(1)); } catch { throw new Error(`${sourcePath}: malformed local fragment ${href}.`); }
      assert(sourceIds.has(fragment), `${sourcePath}: broken local fragment ${href}.`);
      continue;
    }
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    assert(!href.toLowerCase().startsWith('javascript:'), `${sourcePath}: javascript: URL is forbidden.`);
    rawTraversal(href, `${sourcePath}: anchor href`);
    const target = new URL(href, `${manifest.origin}${sourcePath}`);
    if (target.origin !== manifest.origin) continue;
    assert(target.pathname.startsWith(manifest.basePath), `${sourcePath}: internal link escapes the project base path: ${href}.`);
    assert(target.search === '', `${sourcePath}: internal link must not contain query parameters: ${href}.`);
    const targetHtml = htmlFileIndex.get(target.pathname);
    assert(targetHtml, `${sourcePath}: internal link target does not exist: ${href}.`);
    if (target.hash) {
      const targetIds = ids(targetHtml);
      let fragment;
      try { fragment = decodeURIComponent(target.hash.slice(1)); } catch { throw new Error(`${sourcePath}: malformed target fragment ${href}.`); }
      assert(targetIds.has(fragment), `${sourcePath}: broken target fragment ${href}.`);
    }
  }
}

validateStaticRuntime(notFound, '404.html', { requireEventHook: false });
assert(notFound.includes('meta name="robots" content="noindex,follow"'), '404 page must be noindex,follow.');
assert(notFound.includes('href="/webgl-portfolio/"'), '404 page does not link to the project-site homepage.');
await validateInternalAssets(notFound, canonicalBasePath, '404.html', manifest);
assert(!registryText.toLowerCase().includes('utm_'), 'Portfolio registry must not contain tracking parameters.');
assert(!registryText.includes('bit.ly') && !registryText.includes('t.co'), 'Portfolio registry must not contain URL shorteners.');

const artifactFiles = await listFiles(dist);
assert(artifactFiles.length === 37, `Expected exactly 37 extracted dist artifacts, found ${artifactFiles.length}.`);
const artifactAuthorities = new Map();
for (const file of artifactFiles) {
  const artifactPath = normalizedRelative(dist, file);
  assert(artifactPath === artifactPath.normalize('NFC'), `${artifactPath}: generated artifact path is not NFC-normalized.`);
  const authority = artifactPath.toLocaleLowerCase('en-US');
  const previous = artifactAuthorities.get(authority);
  assert(previous === undefined, `Generated artifacts contain a mixed-case path collision: ${previous} and ${artifactPath}.`);
  artifactAuthorities.set(authority, artifactPath);
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const source = await readFile(file, 'utf8');
  assert(!source.includes('\r'), `${artifactPath}: text artifact contains non-LF line endings.`);
  const assetPagePath = `${canonicalBasePath}${artifactPath}`;
  if (extname(file).toLowerCase() === '.css') {
    for (const match of source.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s][^)]*?))\s*\)/giu)) {
      const value = (match[1] ?? match[2] ?? match[3]).trim();
      await validateInternalAssetReference(value, assetPagePath, `${artifactPath}: CSS url()`, manifest);
    }
  }
  if (['.css', '.js'].includes(extname(file).toLowerCase())) {
    for (const match of source.matchAll(/[#@]\s*sourceMappingURL\s*=\s*([^\s*]+)/giu)) {
      await validateInternalAssetReference(match[1], assetPagePath, `${artifactPath}: sourceMappingURL`, manifest);
    }
  }
}

console.log(`Validated ${manifest.routes.length} localized routes, ${htmlFiles.length} HTML files and ${artifactFiles.length} artifacts: semantic JSON-LD, structural sitemap/robots parity, internal assets, canonical SEO, bounded static runtime, links and public registry.`);
