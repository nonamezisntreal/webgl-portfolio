import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const canonicalUrl = 'https://nonamezisntreal.github.io/webgl-portfolio/';
const requiredFiles = ['index.html', 'robots.txt', 'sitemap.xml', '404.html'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  await access(resolve(dist, file), constants.R_OK);
}

const [html, robots, sitemap, notFound] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, 'robots.txt'), 'utf8'),
  readFile(resolve(dist, 'sitemap.xml'), 'utf8'),
  readFile(resolve(dist, '404.html'), 'utf8'),
]);

const escapedCanonical = canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const canonicalMatches = html.match(new RegExp(`<link\\s+rel=["']canonical["'][^>]+href=["']${escapedCanonical}["']`, 'gi')) ?? [];

assert(canonicalMatches.length === 1, `Expected one exact canonical link, found ${canonicalMatches.length}.`);
assert(html.includes('<meta property="og:url" content="https://nonamezisntreal.github.io/webgl-portfolio/"'), 'Missing exact Open Graph URL.');
assert(html.includes('<meta property="og:title"'), 'Missing Open Graph title.');
assert(html.includes('<meta property="og:description"'), 'Missing Open Graph description.');
assert(html.includes('<meta name="twitter:card"'), 'Missing Twitter card metadata.');
assert(!html.includes('href="/favicon.svg"'), 'Favicon still uses a domain-root path and will break on a project Pages site.');
assert(!html.includes('src="/src/main.ts"'), 'Vite source entry leaked into the production artifact.');
assert(robots.includes(`Sitemap: ${canonicalUrl}sitemap.xml`), 'robots.txt does not point to the canonical sitemap.');
assert(robots.includes('User-agent: OAI-SearchBot'), 'OAI-SearchBot policy is missing.');
assert(robots.includes('User-agent: PerplexityBot'), 'PerplexityBot policy is missing.');
assert(sitemap.includes(`<loc>${canonicalUrl}</loc>`), 'Canonical homepage is missing from sitemap.xml.');
assert(notFound.includes('meta name="robots" content="noindex,follow"'), '404 page must be noindex,follow.');
assert(notFound.includes('href="/webgl-portfolio/"'), '404 page does not link to the project-site homepage.');

console.log(`Validated ${requiredFiles.length} required files and homepage SEO invariants.`);
