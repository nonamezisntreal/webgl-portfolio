import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const [indexHtml, main, generator, hardener, finalizer] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'src/main.ts'), 'utf8'),
  readFile(resolve(root, 'scripts/generate-static-site.ts'), 'utf8'),
  readFile(resolve(root, 'scripts/harden-homepage.ts'), 'utf8'),
  readFile(resolve(root, 'scripts/finalize-static-site.ts'), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/<html\b[^>]*\bdata-locale="ru"/u.test(indexHtml), 'Canonical homepage source must declare data-locale="ru".');
assert(/<span\b[^>]*\bdata-lang-pill="ru"[^>]*\baria-current="page"/u.test(indexHtml), 'Canonical RU locale must be an inert span.');
assert(/<a\b[^>]*\bdata-lang-pill="en"[^>]*\bdata-lang-link\b[^>]*\bhreflang="en"/u.test(indexHtml), 'Canonical EN counterpart must be a physical anchor.');
assert(!/<a\b[^>]*\bdata-lang-pill="ru"[^>]*\baria-current="page"/u.test(indexHtml), 'Canonical active RU locale must not be an anchor.');

assert(/function localeFromDocument\(\): Locale/u.test(main), 'Runtime locale must be read from the physical document contract.');
assert(/document\.documentElement\.dataset\.locale/u.test(main), 'Runtime locale source of truth is missing.');
assert(/routeLocale !== declared/u.test(main), 'Runtime must fail closed when pathname and declared locale disagree.');
assert(!/const locale\s*:\s*Locale\s*=\s*['"]ru['"]/u.test(main), 'Runtime locale is hardcoded to RU.');
assert(!/\blocalStorage\b/u.test(main), 'Canonical locale must not depend on localStorage.');
assert(!/location\.(?:replace|assign)\s*\(/u.test(main), 'Canonical locale must not depend on a JavaScript redirect.');

assert(!/function\s+homeDocument\s*\(/u.test(generator), 'Obsolete static homeDocument() source of truth is active.');
assert(!/writePage\(\s*homePath\s*,/u.test(generator), 'Generator still writes a route-loop static homepage.');
assert(/interactiveHomeDocument\(interactiveBaseHtml,\s*['"]ru['"]\)/u.test(generator), 'Generator does not post-process the RU interactive homepage.');
assert(/interactiveHomeDocument\(interactiveBaseHtml,\s*['"]en['"]\)/u.test(generator), 'Generator does not create the EN homepage from the shared interactive runtime.');
assert(/data-homepage-assembly=\\?"v1\\?"/u.test(generator), 'Generator homepage assembly marker is missing.');
assert(/data-interactive-homepage=\\?"v1\\?"/u.test(generator), 'Generator interactive homepage marker is missing.');
assert(/languageSwitcher\(locale\)/u.test(generator), 'Generator does not localize the semantic language switcher.');

assert(/resolve\(process\.cwd\(\),\s*['"]dist['"],\s*['"]index\.html['"]\)/u.test(hardener), 'Homepage hardener does not include dist/index.html.');
assert(/resolve\(process\.cwd\(\),\s*['"]dist['"],\s*['"]en['"],\s*['"]index\.html['"]\)/u.test(hardener), 'Homepage hardener does not include dist/en/index.html.');
assert(/prepared\.length/u.test(hardener) && /Promise\.all\(prepared/u.test(hardener), 'Homepage hardening must prepare both localized pages before writes.');
assert(/homepage hardening was applied more than once/u.test(hardener), 'Homepage hardening repeated-execution guard is missing.');

assert(/manifest\.routes\.filter\(\(route\) => route\.type !== ['"]home['"]\)\.length/u.test(finalizer), 'Static navigation count must be derived from the routes manifest.');
assert(/route\.locale === ['"]ru['"]/u.test(finalizer) && /route\.locale === ['"]en['"]/u.test(finalizer), 'Static navigation finalizer must bind both homepage locales.');
assert(/#projects/u.test(finalizer) && /#explore/u.test(finalizer), 'Static navigation finalizer must target real interactive anchors.');
assert(!/repairedNavigationPages !== 26/u.test(finalizer), 'Static navigation finalizer contains a hardcoded content-page count.');

console.log('Validated localized homepage source architecture: shared interactive runtime, document-bound locale, semantic switcher, dual hardening and manifest-bound finalization.');
