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
  throw new Error(`Unverified public performance claims remain:\n${violations.join('\n')}`);
}

const rootHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
const englishHome = await readFile(resolve(dist, 'en', 'index.html'), 'utf8');
const expectedRussian = 'Профилирование, frame budgets, адаптивная детализация и graceful fallback для слабых устройств.';
const expectedEnglish = 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-interactions with profiling and an adaptive render budget.';

if (!rootHtml.includes(expectedRussian)) {
  throw new Error('The verified Russian performance claim is missing from the homepage artifact.');
}

if (!englishHome.includes(expectedEnglish)) {
  throw new Error('The verified English WebGL service summary is missing from the localized homepage artifact.');
}

console.log(`Validated public claims across ${htmlFiles.length} HTML files.`);
