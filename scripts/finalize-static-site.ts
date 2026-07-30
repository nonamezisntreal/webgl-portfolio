import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicClaims } from '../src/public-claims';

interface RouteRecord {
  locale: 'ru' | 'en';
  type: 'home' | 'service' | 'case' | 'insight';
  path: string;
}

interface RouteManifest {
  basePath: string;
  routes: RouteRecord[];
}

const dist = resolve(process.cwd(), 'dist');
const manifest = JSON.parse(await readFile(resolve(dist, 'routes-manifest.json'), 'utf8')) as RouteManifest;

function routeFile(path: string): string {
  const relative = path.slice(manifest.basePath.length);
  return relative ? resolve(dist, relative, 'index.html') : resolve(dist, 'index.html');
}

function replaceAllCount(source: string, from: string, to: string): { value: string; replacements: number } {
  const replacements = source.split(from).length - 1;
  return { value: replacements ? source.replaceAll(from, to) : source, replacements };
}

const legacyHomepageFallbacks = [
  {
    from: '60fps — база, а не цель.',
    to: publicClaims.performanceCard.ru,
  },
  {
    from: '<span id="hero-fps">60 fps</span>',
    to: '<span id="hero-fps" hidden></span>',
  },
] as const;

let repairedNavigationPages = 0;
let repairedFallbackOccurrences = 0;

for (const route of manifest.routes) {
  const file = routeFile(route.path);
  const source = await readFile(file, 'utf8');
  let repaired = source;

  if (route.locale === 'ru' && route.type !== 'home') {
    const casesHref = `${manifest.basePath}#cases`;
    const insightsHref = `${manifest.basePath}#insights`;

    if (!repaired.includes(casesHref) || !repaired.includes(insightsHref)) {
      throw new Error(`${route.path}: expected localized navigation targets are missing before finalization.`);
    }

    repaired = repaired
      .replaceAll(casesHref, `${manifest.basePath}#projects`)
      .replaceAll(insightsHref, `${manifest.basePath}#explore`);
    repairedNavigationPages += 1;
  }

  for (const fallback of legacyHomepageFallbacks) {
    const result = replaceAllCount(repaired, fallback.from, fallback.to);
    repaired = result.value;
    repairedFallbackOccurrences += result.replacements;
  }

  if (/\b60\s*fps\b/i.test(repaired) || /stable\s+60/i.test(repaired) || /steady\s+60/i.test(repaired)) {
    throw new Error(`${route.path}: an unverified absolute frame-rate claim remains after finalization.`);
  }

  if (/gh-pages branch/i.test(repaired) || /без перезагрузки страницы/i.test(repaired) || /without a page reload/i.test(repaired)) {
    throw new Error(`${route.path}: an obsolete deployment or localization claim remains after finalization.`);
  }

  if (repaired !== source) await writeFile(file, repaired, 'utf8');
}

if (repairedNavigationPages !== 13) {
  throw new Error(`Expected to finalize navigation for 13 Russian content pages, finalized ${repairedNavigationPages}.`);
}

if (repairedFallbackOccurrences !== 2) {
  throw new Error(`Expected to replace 2 legacy homepage fallback occurrences, replaced ${repairedFallbackOccurrences}.`);
}

console.log(`Finalized navigation for ${repairedNavigationPages} Russian content pages and replaced ${repairedFallbackOccurrences} legacy homepage fallbacks.`);
