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

const stalePublicClaims = [
  {
    from: '60fps — база, а не цель.',
    to: publicClaims.performanceCard.ru,
  },
  {
    from: 'Three.js, кастомные GLSL-шейдеры, scroll-driven сцены и микроанимации, которые держат стабильные 60fps.',
    to: publicClaims.webglServiceSummary.ru,
  },
  {
    from: 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-animations that hold a steady 60fps.',
    to: publicClaims.webglServiceSummary.en,
  },
  {
    from: '<span id="hero-fps">60 fps</span>',
    to: '<span id="hero-fps" hidden></span>',
  },
  {
    from: 'Локализация RU/EN без перезагрузки страницы',
    to: 'Отдельные индексируемые RU/EN URL с reciprocal hreflang',
  },
  {
    from: 'RU/EN localization without a page reload',
    to: 'Separate indexable RU/EN URLs with reciprocal hreflang',
  },
  {
    from: 'Деплой на GitHub Pages через gh-pages branch',
    to: 'Проверяемый деплой на GitHub Pages через GitHub Actions',
  },
  {
    from: 'GitHub Pages deployment through a gh-pages branch',
    to: 'Verified GitHub Pages deployment through GitHub Actions',
  },
] as const;

let repairedNavigationPages = 0;
let repairedClaimOccurrences = 0;

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

  for (const claim of stalePublicClaims) {
    const result = replaceAllCount(repaired, claim.from, claim.to);
    repaired = result.value;
    repairedClaimOccurrences += result.replacements;
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

if (repairedClaimOccurrences !== 12) {
  throw new Error(`Expected to replace 12 stale public claim occurrences, replaced ${repairedClaimOccurrences}.`);
}

console.log(`Finalized navigation for ${repairedNavigationPages} Russian content pages and replaced ${repairedClaimOccurrences} stale public claim occurrences.`);
