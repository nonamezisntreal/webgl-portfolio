import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  resolve(process.cwd(), 'dist', 'index.html'),
  resolve(process.cwd(), 'dist', 'en', 'index.html'),
];
const marker = 'data-homepage-hardening="v1"';
const css = `
  <style ${marker}>
    #hero-fps{display:none!important}
  </style>`;

function count(source: string, value: string): number {
  return source.split(value).length - 1;
}

const sources = await Promise.all(files.map(async (file) => ({ file, html: await readFile(file, 'utf8') })));
const prepared = sources.map(({ file, html }) => {
  if (count(html, marker) !== 0) throw new Error(`${file}: homepage hardening was applied more than once.`);
  if (count(html, '</head>') !== 1) throw new Error(`${file}: expected exactly one </head> injection point.`);
  const hardened = html.replace('</head>', `${css}\n</head>`);
  if (count(hardened, marker) !== 1) throw new Error(`${file}: homepage hardening marker was not applied exactly once.`);
  return { file, html: hardened };
});

await Promise.all(prepared.map(({ file, html }) => writeFile(file, html, 'utf8')));
console.log(`Applied identical homepage runtime hardening to ${prepared.length} localized interactive homepages.`);
