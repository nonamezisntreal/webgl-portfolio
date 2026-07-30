import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

let repairedNavigationPages = 0;

for (const route of manifest.routes) {
  if (route.locale !== 'ru' || route.type === 'home') continue;

  const file = routeFile(route.path);
  const source = await readFile(file, 'utf8');
  const casesHref = `${manifest.basePath}#cases`;
  const insightsHref = `${manifest.basePath}#insights`;

  if (!source.includes(casesHref) || !source.includes(insightsHref)) {
    throw new Error(`${route.path}: expected localized navigation targets are missing before finalization.`);
  }

  const repaired = source
    .replaceAll(casesHref, `${manifest.basePath}#projects`)
    .replaceAll(insightsHref, `${manifest.basePath}#explore`);

  if (repaired === source) {
    throw new Error(`${route.path}: localized navigation finalization made no changes.`);
  }

  await writeFile(file, repaired, 'utf8');
  repairedNavigationPages += 1;
}

if (repairedNavigationPages !== 13) {
  throw new Error(`Expected to finalize navigation for 13 Russian content pages, finalized ${repairedNavigationPages}.`);
}

console.log(`Finalized navigation for ${repairedNavigationPages} Russian content pages.`);
