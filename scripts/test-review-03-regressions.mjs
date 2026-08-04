import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const dist = resolve(projectRoot, 'dist');
const node = process.execPath;
const validators = {
  dist: resolve(projectRoot, 'scripts/validate-dist.mjs'),
  claims: resolve(projectRoot, 'scripts/validate-public-claims.mjs'),
};
const servicePage = 'en/services/webgl-interfaces/index.html';
const faqPage = 'en/services/telegram-bots-automation/index.html';
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function execute(script, env) {
  return spawnSync(node, [script], {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
  });
}

function output(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

async function mutateText(path, mutate) {
  const source = await readFile(path, 'utf8');
  const next = mutate(source);
  assert(next !== source, `Mutation setup made no change: ${path}`);
  await writeFile(path, next, 'utf8');
}

function jsonLdMatches(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)];
}

async function mutateJsonLd(path, type, mutate) {
  await mutateText(path, (html) => {
    for (const match of jsonLdMatches(html)) {
      const value = JSON.parse(match[1]);
      const items = Array.isArray(value) ? value : [value];
      const target = items.find((item) => item && typeof item === 'object' && item['@type'] === type);
      if (!target) continue;
      const replacement = mutate(value, target);
      return `${html.slice(0, match.index)}${match[0].replace(match[1], JSON.stringify(replacement))}${html.slice(match.index + match[0].length)}`;
    }
    throw new Error(`JSON-LD ${type} target is missing in ${path}`);
  });
}

async function withDistMutation(mutate, validator = 'dist') {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-r03-dist-'));
  const mutant = resolve(root, 'dist');
  try {
    await cp(dist, mutant, { recursive: true });
    await mutate(mutant);
    return execute(validators[validator], { PROJECT_ROOT: projectRoot, DIST_DIR: mutant });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withClaimsSourceMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-r03-source-'));
  try {
    for (const name of ['README.md', 'index.html']) await cp(resolve(projectRoot, name), resolve(root, name));
    for (const name of ['src', 'public', 'docs']) await cp(resolve(projectRoot, name), resolve(root, name), { recursive: true });
    await mutate(root);
    return execute(validators.claims, { PROJECT_ROOT: root, DIST_DIR: dist });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectFailure(id, mutation, expectedDiagnostic, executeMutation) {
  let result;
  let setupError;
  try { result = await executeMutation(); }
  catch (error) { setupError = error instanceof Error ? error.message : String(error); }
  const diagnostic = setupError ?? output(result);
  const exitCode = setupError ? null : result.status;
  const pass = !setupError && exitCode !== 0 && diagnostic.toLocaleLowerCase().includes(expectedDiagnostic.toLocaleLowerCase());
  results.push({ id, mutation, expectedDiagnostic, actualExitCode: exitCode, diagnostic, status: pass ? 'PASS' : 'FAIL' });
  console.log(`${id} ${pass ? 'PASS' : 'FAIL'} — ${mutation}`);
}

async function expectSuccess(id, mutation, executeMutation) {
  let result;
  let setupError;
  try { result = await executeMutation(); }
  catch (error) { setupError = error instanceof Error ? error.message : String(error); }
  const diagnostic = setupError ?? output(result);
  const exitCode = setupError ? null : result.status;
  const pass = !setupError && exitCode === 0;
  results.push({ id, mutation, expectedDiagnostic: 'zero exit', actualExitCode: exitCode, diagnostic, status: pass ? 'PASS' : 'FAIL' });
  console.log(`${id} ${pass ? 'PASS' : 'FAIL'} — ${mutation}`);
}

const baselineDist = execute(validators.dist, { PROJECT_ROOT: projectRoot, DIST_DIR: dist });
const baselineClaims = execute(validators.claims, { PROJECT_ROOT: projectRoot, DIST_DIR: dist });
assert(baselineDist.status === 0, `Review-03 baseline dist validator failed:\n${output(baselineDist)}`);
assert(baselineClaims.status === 0, `Review-03 baseline claims validator failed:\n${output(baselineClaims)}`);

await expectFailure('R03-JSONLD-EXTRA-URL', 'Service receives an unapproved sameAs URL field', 'unexpected keys: sameAs', () => withDistMutation(async (root) => {
  await mutateJsonLd(resolve(root, servicePage), 'Service', (value, target) => { target.sameAs = ['https://attacker.example/']; return value; });
}));

await expectFailure('R03-JSONLD-HIDDEN-FAQ', 'aria-hidden text is the only evidence for mutated FAQ content', 'not present in visible page content', () => withDistMutation(async (root) => {
  const file = resolve(root, faqPage);
  await mutateJsonLd(file, 'FAQPage', (value, target) => {
    target.mainEntity[0].name = 'Invisible synthetic question?';
    target.mainEntity[0].acceptedAnswer.text = 'Invisible synthetic answer.';
    return value;
  });
  await mutateText(file, (html) => html.replace('</body>', '<div aria-hidden="true"><p>Invisible synthetic question?</p><p>Invisible synthetic answer.</p></div></body>'));
}));

await expectFailure('R03-ASSET-PROTOCOL-RELATIVE', 'stylesheet uses a protocol-relative attacker authority', 'forbidden protocol-relative', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'index.html'), (html) => html.replace(/href="\/webgl-portfolio\/assets\/[^"]+\.css"/u, 'href="//attacker.example/site.css"'));
}));

await expectFailure('R03-CLAIM-SPLIT-MARKUP', 'forbidden guarantee is split across HTML nodes', 'all-device performance guarantee', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'en/index.html'), (html) => html.replace('</body>', '<p>Guaranteed rendering <span>performance</span> on every device.</p></body>'));
}, 'claims'));

await expectFailure('R03-CLAIM-ALWAYS-SMOOTH', 'English semantic smoothness guarantee without FPS wording', 'semantic all-device smoothness guarantee', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'en/index.html'), (html) => html.replace('</body>', '<p>Always smooth on every device.</p></body>'));
}, 'claims'));

await expectFailure('R03-CLAIM-RU-ALWAYS-SMOOTH', 'Russian semantic smoothness guarantee without FPS wording', 'semantic all-device Russian performance guarantee', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'index.html'), (html) => html.replace('</body>', '<p>Всегда плавно на всех устройствах.</p></body>'));
}, 'claims'));

await expectFailure('R03-SITEMAP-DOCTYPE', 'sitemap contains DOCTYPE and an external entity declaration', 'forbidden DOCTYPE', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'sitemap.xml'), (xml) => xml.replace(/(<\?xml[^>]+>)/u, '$1\n<!DOCTYPE urlset [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'));
}));

await expectFailure('EXT-J-UNICODE-DUP-FAQ', 'FAQ questions differ only by NFC composition', 'duplicate FAQ question', () => withDistMutation(async (root) => {
  const file = resolve(root, faqPage);
  const composed = 'Café question?';
  const decomposed = composed.normalize('NFD');
  await mutateJsonLd(file, 'FAQPage', (value, target) => {
    target.mainEntity[0].name = composed;
    target.mainEntity[1].name = decomposed;
    return value;
  });
  await mutateText(file, (html) => html.replace('</body>', `<p>${composed}</p><p>${decomposed}</p></body>`));
}));

await expectFailure('EXT-J-NESTED-ARRAY', 'top-level JSON-LD contains a nested array', 'nested JSON-LD arrays are forbidden', () => withDistMutation(async (root) => {
  const file = resolve(root, faqPage);
  await mutateText(file, (html) => {
    const matches = jsonLdMatches(html);
    const service = matches.find((item) => JSON.parse(item[1])['@type'] === 'Service');
    const faq = matches.find((item) => JSON.parse(item[1])['@type'] === 'FAQPage');
    assert(service && faq, 'Service and FAQ JSON-LD blocks are required.');
    const start = Math.min(service.index, faq.index);
    const end = Math.max(service.index + service[0].length, faq.index + faq[0].length);
    const replacement = `<script type="application/ld+json">${JSON.stringify([JSON.parse(service[1]), [JSON.parse(faq[1])]])}</script>`;
    return `${html.slice(0, start)}${replacement}${html.slice(end)}`;
  });
}));

await expectFailure('EXT-J-DUPLICATE-KEY', 'JSON-LD contains a duplicate key with contradictory value', 'duplicate JSON key', () => withDistMutation(async (root) => {
  const file = resolve(root, servicePage);
  await mutateText(file, (html) => {
    const match = jsonLdMatches(html).find((item) => JSON.parse(item[1])['@type'] === 'Service');
    const body = match[1].replace('"name":', '"name":"Contradictory service","name":');
    return `${html.slice(0, match.index)}${match[0].replace(match[1], body)}${html.slice(match.index + match[0].length)}`;
  });
}));

await expectFailure('EXT-S-DUP-LOC-NODE', 'one sitemap entry contains duplicate loc nodes', 'duplicate <loc> nodes are forbidden', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'sitemap.xml'), (xml) => {
    const loc = xml.match(/<loc>[^<]+<\/loc>/u)?.[0];
    assert(loc, 'Sitemap loc target is missing.');
    return xml.replace(loc, `${loc}${loc}`);
  });
}));

await expectFailure('EXT-S-PARTIAL-XML', 'sitemap appends a second root after urlset', 'partial/ambiguous root content', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'sitemap.xml'), (xml) => xml.replace('</urlset>', '</urlset><extra/>'));
}));

await expectFailure('EXT-A-CASE-DRIFT-WINDOWS', 'asset URL casing differs from the generated path', 'case-sensitive path mismatch', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'index.html'), (html) => html.replace('/webgl-portfolio/assets/', '/webgl-portfolio/ASSETS/'));
}));

await expectFailure('EXT-A-BAD-SRCSET-DESCRIPTOR', 'srcset uses an invalid q descriptor', 'invalid srcset descriptor', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'en/index.html'), (html) => html.replace('</body>', '<img srcset="/webgl-portfolio/favicon.svg 1q" alt="test"></body>'));
}));

await expectFailure('EXT-C-PUNCT-NEWLINE', 'frame-rate guarantee is split by punctuation and newline', 'guaranteed frame-rate claim', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'en/index.html'), (html) => html.replace('</body>', '<p>guaranteed frame-\nrate on every device</p></body>'));
}, 'claims'));

await expectFailure('EXT-C-HTML-ENTITY', 'frame-rate guarantee uses an HTML entity separator', 'guaranteed frame-rate claim', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'en/index.html'), (html) => html.replace('</body>', '<p>guaranteed frame&#32;rate on every device</p></body>'));
}, 'claims'));

await expectFailure('EXT-C-JSON-ESCAPE', 'generated JSON hides a guarantee with Unicode escapes', 'all-device performance guarantee', () => withDistMutation(async (root) => {
  await writeFile(resolve(root, 'claim.json'), '{"claim":"guaranteed\\u0020rendering\\u0020performance\\u0020on\\u0020every\\u0020device"}\n', 'utf8');
}, 'claims'));

await expectFailure('EXT-C-JS-CONCAT', 'generated JavaScript concatenates fragments into a guarantee', 'all-device performance guarantee', () => withDistMutation(async (root) => {
  await writeFile(resolve(root, 'claim.js'), 'document.body.dataset.claim="guaranteed rendering per"+"formance on every device";\n', 'utf8');
}, 'claims'));

await expectFailure('EXT-C-RU-INFLECTION', 'Russian inflection guarantees smoothness on all devices', 'semantic all-device Russian performance guarantee', () => withDistMutation(async (root) => {
  await mutateText(resolve(root, 'index.html'), (html) => html.replace('</body>', '<p>Гарантирует плавность на всех устройствах.</p></body>'));
}, 'claims'));

await expectSuccess('R03-POSITIVE-ADAPTIVE-EN', 'bounded English adaptive-performance statement remains allowed', () => withClaimsSourceMutation(async (root) => {
  await writeFile(resolve(root, 'src', 'review03-positive-en.ts'), "export const statement = 'Performance adapts to device capability and may reduce effects on lower-powered devices.';\n", 'utf8');
}));

await expectSuccess('R03-POSITIVE-ADAPTIVE-RU', 'bounded Russian adaptive-performance statement remains allowed', () => withClaimsSourceMutation(async (root) => {
  await writeFile(resolve(root, 'src', 'review03-positive-ru.ts'), "export const statement = 'Качество адаптируется к возможностям устройства и снижает детализацию при необходимости.';\n", 'utf8');
}));

const failed = results.filter((item) => item.status === 'FAIL');
const report = {
  schemaVersion: 1,
  subject: 'WEBGL-PORTFOLIO-REMEDIATION-03-REVIEW-03-REGRESSIONS',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  cases: results,
};
const reportPath = resolve(process.env.REVIEW03_REPORT ?? resolve(tmpdir(), 'webgl-portfolio-review03-regressions.json'));
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (failed.length) throw new Error(`Review-03 regression validation failed: ${failed.length}/${results.length}. Report: ${reportPath}`);
console.log(`Review-03 regression validation passed: ${results.length}/${results.length}. Report: ${reportPath}`);
