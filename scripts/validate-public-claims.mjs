import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');

async function listHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

const forbiddenClaims = [
  { pattern: /\b60\s*fps\b/i, label: 'absolute 60fps claim' },
  { pattern: /stable\s+60/i, label: 'stable 60 claim' },
  { pattern: /steady\s+60/i, label: 'steady 60 claim' },
  { pattern: /gh-pages branch/i, label: 'obsolete gh-pages deployment claim' },
  { pattern: /без перезагрузки страницы/i, label: 'obsolete in-place localization claim' },
  { pattern: /without a page reload/i, label: 'obsolete in-place localization claim' },
];

const htmlFiles = await listHtmlFiles(dist);
const violations = [];

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const claim of forbiddenClaims) {
    if (claim.pattern.test(html)) violations.push(`${file}: ${claim.label}`);
  }
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

console.log(`Validated public claims across ${htmlFiles.length} HTML files.`);
