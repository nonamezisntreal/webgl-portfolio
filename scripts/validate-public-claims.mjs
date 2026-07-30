import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const dist = resolve(projectRoot, process.env.DIST_DIR ?? 'dist');

async function listFiles(directory, predicate) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path, predicate));
    else if (entry.isFile() && predicate(path)) files.push(path);
  }
  return files;
}

const forbiddenClaims = [
  { pattern: /\b\d+(?:\.\d+)?\s*(?:fps|frames?\s+per\s+second)\b/iu, label: 'absolute numeric frame-rate claim' },
  { pattern: /\b(?:stable|steady|constant|locked|guaranteed)\s+(?:at\s+)?\d+(?:\.\d+)?(?:\s*(?:fps|frames?\s+per\s+second))?\b/iu, label: 'guaranteed frame-rate claim' },
  { pattern: /\b\d+(?:[.,]\d+)?\s*(?:кадр(?:а|ов)?\s+в\s+секунду)\b/iu, label: 'absolute Russian frame-rate claim' },
  { pattern: /\b(?:стабильн\w*|гарантированн\w*|постоянн\w*)\s+\d+(?:[.,]\d+)?(?:\s*(?:fps|кадр\w*))?\b/iu, label: 'guaranteed Russian frame-rate claim' },
  { pattern: /gh-pages branch/iu, label: 'obsolete gh-pages deployment claim' },
  { pattern: /без перезагрузки страницы/iu, label: 'obsolete in-place localization claim' },
  { pattern: /without a page reload/iu, label: 'obsolete in-place localization claim' },
];

function collectViolations(source, label) {
  const violations = [];
  for (const claim of forbiddenClaims) {
    if (claim.pattern.test(source)) violations.push(`${label}: ${claim.label}`);
  }
  return violations;
}

const sourceFiles = [
  resolve(projectRoot, 'index.html'),
  ...await listFiles(resolve(projectRoot, 'src'), (path) => /\.(?:ts|tsx|js|jsx|html)$/i.test(path)),
];
const htmlFiles = await listFiles(dist, (path) => path.endsWith('.html'));
const javascriptFiles = await listFiles(dist, (path) => path.endsWith('.js'));
const violations = [];

for (const file of sourceFiles) {
  violations.push(...collectViolations(await readFile(file, 'utf8'), `source:${relative(projectRoot, file).replaceAll('\\', '/')}`));
}
for (const file of htmlFiles) {
  violations.push(...collectViolations(await readFile(file, 'utf8'), `html:${relative(dist, file).replaceAll('\\', '/')}`));
}
for (const file of javascriptFiles) {
  violations.push(...collectViolations(await readFile(file, 'utf8'), `javascript:${relative(dist, file).replaceAll('\\', '/')}`));
}

if (violations.length) {
  throw new Error(`Unverified or obsolete public claims remain:\n${violations.join('\n')}`);
}

const rootHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
const englishHome = await readFile(resolve(dist, 'en', 'index.html'), 'utf8');
const russianCase = await readFile(resolve(dist, 'cases', 'webgl-portfolio', 'index.html'), 'utf8');
const englishCase = await readFile(resolve(dist, 'en', 'cases', 'webgl-portfolio', 'index.html'), 'utf8');

const expectedClaims = [
  {
    source: rootHtml,
    value: 'Профилирование, frame budgets, адаптивная детализация и graceful fallback для слабых устройств.',
    label: 'verified Russian performance claim',
  },
  {
    source: englishHome,
    value: 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-interactions with profiling and an adaptive render budget.',
    label: 'verified English WebGL service summary',
  },
  {
    source: russianCase,
    value: 'Отдельные индексируемые RU/EN URL с reciprocal hreflang',
    label: 'current Russian localization architecture claim',
  },
  {
    source: englishCase,
    value: 'Separate indexable RU/EN URLs with reciprocal hreflang',
    label: 'current English localization architecture claim',
  },
  {
    source: russianCase,
    value: 'Проверяемый деплой на GitHub Pages через GitHub Actions',
    label: 'current Russian deployment claim',
  },
  {
    source: englishCase,
    value: 'Verified GitHub Pages deployment through GitHub Actions',
    label: 'current English deployment claim',
  },
];

for (const claim of expectedClaims) {
  if (!claim.source.includes(claim.value)) {
    throw new Error(`The ${claim.label} is missing from the built artifact.`);
  }
}

console.log(`Validated public claims across ${sourceFiles.length} source files, ${htmlFiles.length} HTML files and ${javascriptFiles.length} JavaScript bundles.`);
