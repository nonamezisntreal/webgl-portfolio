import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  resolve(process.cwd(), 'dist', 'index.html'),
  resolve(process.cwd(), 'dist', 'en', 'index.html'),
];
const marker = 'data-homepage-hardening="v1"';
const css = `
  <style ${marker}>
    .loader{
      inset:auto 1rem 1rem auto!important;
      width:min(260px,calc(100vw - 2rem));
      min-height:0;
      padding:.75rem 1rem;
      display:flex;
      align-items:center;
      gap:.75rem;
      border:1px solid rgba(255,255,255,.1);
      border-radius:14px;
      background:rgba(6,6,11,.76)!important;
      box-shadow:0 18px 50px rgba(0,0,0,.28);
      backdrop-filter:blur(16px);
      pointer-events:none;
    }
    .loader__core{width:42px!important;height:42px!important;margin:0!important;flex:0 0 42px}
    .loader__count{font-size:.85rem!important}
    .loader__label{text-align:left!important;letter-spacing:.12em!important;font-size:.62rem!important}
    #hero-fps{display:none!important}
    @media(max-width:560px){.loader{right:.65rem;bottom:.65rem;width:auto}.loader__label{display:none}}
    @media(prefers-reduced-motion:reduce){.loader__ring{animation:none!important}}
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
console.log(`Applied identical non-blocking homepage hardening to ${prepared.length} localized interactive homepages.`);
