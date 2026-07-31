import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const dist = resolve(projectRoot, process.env.DIST_DIR ?? 'dist');
const publicTextExtensions = new Set(['.html', '.js', '.jsx', '.json', '.md', '.svg', '.ts', '.tsx', '.txt', '.xml']);
const canonicalRootFiles = ['README.md', 'index.html'];
const recursivePublicRoots = ['src', 'public', 'docs'];
const excludedPublicPrefixes = ['docs/plans/'];

const englishNumberWord = '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\\s-]+(?:and[\\s-]+)?(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand))*';
const russianNumberWord = '(?:ноль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|тысяча)(?:[\\s-]+(?:ноль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|тысяча))*';

const forbiddenClaims = [
  { pattern: /\b\d+(?:[.,]\d+)?\s*(?:fps|frames?\s+per\s+second)\b/iu, label: 'absolute numeric frame-rate claim' },
  { pattern: new RegExp(`\\b${englishNumberWord}\\s+(?:fps|frames?\\s+per\\s+second)\\b`, 'iu'), label: 'English word-form frame-rate claim' },
  { pattern: /(?:^|[^\p{L}\p{N}_])\d+(?:[.,]\d+)?\s*(?:кадр(?:а|ов)?\s+в\s+секунду)(?=$|[^\p{L}\p{N}_])/iu, label: 'absolute Russian frame-rate claim' },
  { pattern: new RegExp(`(?:^|[^\\p{L}\\p{N}_])${russianNumberWord}\\s+кадр(?:а|ов)?\\s+в\\s+секунду(?=$|[^\\p{L}\\p{N}_])`, 'iu'), label: 'Russian word-form frame-rate claim' },
  { pattern: /\b(?:stable|steady|constant|locked|guaranteed|guarantees|guaranteeing)\b[^.!?\n]{0,100}\b(?:fps|frame\s*rate|frames?\s+per\s+second)\b/iu, label: 'guaranteed frame-rate claim' },
  { pattern: /\b(?:guaranteed|guarantees|guaranteeing|stable|constant|locked)\b[^.!?\n]{0,120}\b(?:performance|rendering|animation|frame\s*rate|fps)\b[^.!?\n]{0,120}\b(?:on|across|for)\s+(?:all|any|every)\s+(?:device|browser|machine|hardware)s?\b/iu, label: 'all-device performance guarantee' },
  { pattern: /\b(?:all|any|every)\s+(?:device|browser|machine|hardware)s?\b[^.!?\n]{0,120}\b(?:guaranteed|stable|constant|locked)\b[^.!?\n]{0,120}\b(?:performance|rendering|animation|frame\s*rate|fps)\b/iu, label: 'all-device performance guarantee' },
  { pattern: /(?:^|[^\p{L}\p{N}_])(?:стабильн\w*|гарантированн\w*|гарантир\w*|постоянн\w*|фиксированн\w*)[^.!?\n]{0,100}(?:fps|кадр\w*\s+в\s+секунду|частот\w*\s+кадр\w*)(?=$|[^\p{L}\p{N}_])/iu, label: 'guaranteed Russian frame-rate claim' },
  { pattern: /(?:^|[^\p{L}\p{N}_])(?:стабильн\w*|гарантированн\w*|гарантир\w*|постоянн\w*|фиксированн\w*)[^.!?\n]{0,120}(?:производительн\w*|рендер\w*|анимац\w*|fps|кадр\w*)[^.!?\n]{0,120}(?:на|для)\s+(?:любом|любого|всех|каждом|каждого)\s+(?:устройств\w*|браузер\w*|оборудован\w*)(?=$|[^\p{L}\p{N}_])/iu, label: 'all-device Russian performance guarantee' },
  { pattern: /(?:^|[^\p{L}\p{N}_])(?:на|для)\s+(?:любом|любого|всех|каждом|каждого)\s+(?:устройств\w*|браузер\w*|оборудован\w*)[^.!?\n]{0,120}(?:стабильн\w*|гарантированн\w*|гарантир\w*|постоянн\w*|фиксированн\w*)[^.!?\n]{0,120}(?:производительн\w*|рендер\w*|анимац\w*|fps|кадр\w*)(?=$|[^\p{L}\p{N}_])/iu, label: 'all-device Russian performance guarantee' },
  { pattern: /gh-pages branch/iu, label: 'obsolete gh-pages deployment claim' },
  { pattern: /без перезагрузки страницы/iu, label: 'obsolete in-place localization claim' },
  { pattern: /without a page reload/iu, label: 'obsolete in-place localization claim' },
];

function extension(path) {
  const match = path.match(/(\.[^./\\]+)$/);
  return match?.[1].toLowerCase() ?? '';
}

function normalizedRelative(root, path) {
  return relative(root, path).split(sep).join('/');
}

function isExcludedPublicSurface(path) {
  const normalized = normalizedRelative(projectRoot, path);
  return excludedPublicPrefixes.some((prefix) => normalized.startsWith(prefix));
}

async function listFiles(directory, predicate) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path, predicate));
    else if (entry.isFile() && predicate(path)) files.push(path);
  }
  return files.sort();
}

function collectViolations(source, label) {
  const violations = [];
  for (const claim of forbiddenClaims) {
    if (claim.pattern.test(source)) violations.push(`${label}: ${claim.label}`);
  }
  return violations;
}

const sourceFiles = [];
for (const file of canonicalRootFiles) sourceFiles.push(resolve(projectRoot, file));
for (const directory of recursivePublicRoots) {
  sourceFiles.push(...await listFiles(resolve(projectRoot, directory), (path) => publicTextExtensions.has(extension(path)) && !isExcludedPublicSurface(path)));
}
const uniqueSourceFiles = [...new Set(sourceFiles)].sort();
const generatedFiles = await listFiles(dist, (path) => ['.html', '.js', '.json'].includes(extension(path)));
const violations = [];

for (const file of uniqueSourceFiles) {
  const label = `public-source:${normalizedRelative(projectRoot, file)}`;
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`${label}: required public surface is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  violations.push(...collectViolations(source, label));
}
for (const file of generatedFiles) {
  const label = `generated:${normalizedRelative(dist, file)}`;
  violations.push(...collectViolations(await readFile(file, 'utf8'), label));
}

if (violations.length) {
  throw new Error(`Unverified or obsolete public claims remain:\n${violations.join('\n')}`);
}

const rootHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
const englishHome = await readFile(resolve(dist, 'en', 'index.html'), 'utf8');
const russianCase = await readFile(resolve(dist, 'cases', 'webgl-portfolio', 'index.html'), 'utf8');
const englishCase = await readFile(resolve(dist, 'en', 'cases', 'webgl-portfolio', 'index.html'), 'utf8');
const expectedClaims = [
  [rootHtml, 'Профилирование, frame budgets, адаптивная детализация и graceful fallback для слабых устройств.', 'verified Russian performance claim'],
  [englishHome, 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-interactions with profiling and an adaptive render budget.', 'verified English WebGL service summary'],
  [russianCase, 'Отдельные индексируемые RU/EN URL с reciprocal hreflang', 'current Russian localization architecture claim'],
  [englishCase, 'Separate indexable RU/EN URLs with reciprocal hreflang', 'current English localization architecture claim'],
  [russianCase, 'Проверяемый деплой на GitHub Pages через GitHub Actions', 'current Russian deployment claim'],
  [englishCase, 'Verified GitHub Pages deployment through GitHub Actions', 'current English deployment claim'],
];
for (const [source, value, label] of expectedClaims) {
  if (!source.includes(value)) throw new Error(`The ${label} is missing from the built artifact.`);
}

console.log(`Validated public claims across ${uniqueSourceFiles.length} explicit public source/document surfaces and ${generatedFiles.length} generated HTML/JavaScript/JSON artifacts; excluded audit-only prefixes: ${excludedPublicPrefixes.join(', ')}.`);
