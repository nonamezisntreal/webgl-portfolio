import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const dist = resolve(projectRoot, 'dist');
const node = process.execPath;
const bun = process.env.BUN_EXE ?? (process.platform === 'win32' ? 'bun.cmd' : 'bun');
const reportPath = resolve(process.env.ADVERSARIAL_REPORT ?? resolve(tmpdir(), 'webgl-portfolio-adversarial-results.json'));
const validators = {
  dist: resolve(projectRoot, 'scripts/validate-dist.mjs'),
  claims: resolve(projectRoot, 'scripts/validate-public-claims.mjs'),
  workflow: resolve(projectRoot, 'scripts/validate-workflow-policy.mjs'),
  architecture: resolve(projectRoot, 'scripts/validate-localized-homepage-architecture.mjs'),
  hero: resolve(projectRoot, 'scripts/validate-hero-scene.mjs'),
};
const canonical = 'https://nonamezisntreal.github.io/webgl-portfolio/en/services/webgl-interfaces/';
const staticPage = 'en/services/webgl-interfaces/index.html';
const faqPage = 'en/services/telegram-bots-automation/index.html';
const reports = [];
const positiveWorkflowVariants = [];
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function commandResult(executable, args, cwd, env = {}) {
  return spawnSync(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && /\.cmd$/iu.test(executable),
  });
}

function nodeResult(script, env = {}) {
  return commandResult(node, [script], projectRoot, env);
}

function diagnostic(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function commandDisplay(executable, args) {
  return [executable, ...args].map((value) => JSON.stringify(value)).join(' ');
}

function replaceRequired(source, search, replacement, label) {
  const next = typeof search === 'string' ? source.replace(search, replacement) : source.replace(search, replacement);
  assert(next !== source, `Mutation setup failed for ${label}.`);
  return next;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function listFiles(root, predicate = () => true) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(path, predicate));
    else if (entry.isFile() && predicate(path)) result.push(path);
  }
  return result.sort();
}

async function firstAsset(pattern) {
  const files = await listFiles(resolve(dist, 'assets'), (path) => pattern.test(basename(path)));
  assert(files.length > 0, `No asset matched ${pattern}.`);
  return files[0];
}

async function copyPublicSource(root) {
  for (const name of ['README.md', 'index.html']) await cp(resolve(projectRoot, name), resolve(root, name));
  for (const name of ['src', 'public', 'docs']) await cp(resolve(projectRoot, name), resolve(root, name), { recursive: true });
}

async function withClaimsSourceMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-claims-source-'));
  try {
    await copyPublicSource(root);
    await mutate(root);
    return nodeResult(validators.claims, { PROJECT_ROOT: root, DIST_DIR: dist });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withDistMutation(mutate, validator = 'dist') {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-dist-'));
  const mutantDist = resolve(root, 'dist');
  try {
    await cp(dist, mutantDist, { recursive: true });
    await mutate(mutantDist);
    return nodeResult(validators[validator], { PROJECT_ROOT: projectRoot, DIST_DIR: mutantDist });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withWorkflowMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-workflow-'));
  const workflowRoot = resolve(root, 'workflows');
  try {
    await cp(resolve(projectRoot, '.github/workflows'), workflowRoot, { recursive: true });
    await mutate(workflowRoot, resolve(workflowRoot, 'deploy.yml'));
    return nodeResult(validators.workflow, { PROJECT_ROOT: projectRoot, WORKFLOW_ROOT: workflowRoot });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectWorkflowSuccessVariant(name, mutate) {
  const result = await withWorkflowMutation(mutate);
  const output = diagnostic(result);
  if (result.status !== 0) throw new Error(`Valid workflow syntax variant ${name} was rejected:\n${output}`);
  positiveWorkflowVariants.push({
    name,
    command: commandDisplay(node, [validators.workflow]),
    actualExitCode: result.status,
    diagnostic: output,
    status: 'PASS',
  });
  console.log(`WORKFLOW-VARIANT PASS — ${name}`);
}

async function withContentSourceMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-content-'));
  try {
    await cp(resolve(projectRoot, 'src'), resolve(root, 'src'), { recursive: true });
    await mkdir(resolve(root, 'scripts'), { recursive: true });
    await cp(resolve(projectRoot, 'scripts/validate-content.ts'), resolve(root, 'scripts/validate-content.ts'));
    await mutate(root);
    return commandResult(bun, [resolve(root, 'scripts/validate-content.ts')], root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withHeroSourceMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-hero-source-'));
  try {
    await cp(resolve(projectRoot, 'src/webgl'), resolve(root, 'src/webgl'), { recursive: true });
    await mkdir(resolve(root, 'src/ui'), { recursive: true });
    await cp(resolve(projectRoot, 'src/scene-nodes.ts'), resolve(root, 'src/scene-nodes.ts'));
    await cp(resolve(projectRoot, 'src/ui/sceneNav.ts'), resolve(root, 'src/ui/sceneNav.ts'));
    await cp(resolve(projectRoot, 'src/ui/intro.ts'), resolve(root, 'src/ui/intro.ts'));
    await cp(resolve(projectRoot, 'index.html'), resolve(root, 'index.html'));
    await mutate(root);
    return nodeResult(validators.hero, { PROJECT_ROOT: root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withArchitectureSourceMutation(mutate) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-home-architecture-'));
  try {
    await mkdir(resolve(root, 'src'), { recursive: true });
    await mkdir(resolve(root, 'scripts'), { recursive: true });
    await cp(resolve(projectRoot, 'index.html'), resolve(root, 'index.html'));
    await cp(resolve(projectRoot, 'src/main.ts'), resolve(root, 'src/main.ts'));
    for (const name of ['generate-static-site.ts', 'harden-homepage.ts', 'finalize-static-site.ts']) {
      await cp(resolve(projectRoot, 'scripts', name), resolve(root, 'scripts', name));
    }
    await mutate(root);
    return nodeResult(validators.architecture, { PROJECT_ROOT: root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function mutateText(path, mutate) {
  const source = await readFile(path, 'utf8');
  await writeFile(path, mutate(source), 'utf8');
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
}

async function mutateFirstJsonLd(path, mutate) {
  await mutateText(path, (html) => {
    const match = jsonLdBlocks(html)[0];
    assert(match, 'JSON-LD mutation target is missing.');
    const replacement = typeof mutate === 'function' ? mutate(match[1]) : mutate;
    return `${html.slice(0, match.index)}${match[0].replace(match[1], replacement)}${html.slice(match.index + match[0].length)}`;
  });
}

async function expectFailure(test) {
  let result;
  let setupError = null;
  try {
    result = await test.execute();
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
  }
  const output = setupError ?? diagnostic(result);
  const status = setupError ? null : (result.status ?? -1);
  const ok = !setupError && status !== 0 && output.includes(test.expectedDiagnostic);
  reports.push({
    id: test.id,
    section: test.section,
    mutation: test.mutation,
    command: test.command,
    expectedResult: `nonzero exit; diagnostic contains ${JSON.stringify(test.expectedDiagnostic)}`,
    actualExitCode: status,
    diagnostic: output,
    status: ok ? 'PASS' : 'FAIL',
  });
  if (!ok) {
    console.error(`${test.id} FAIL — ${setupError ? `mutation setup: ${setupError}` : status === 0 ? 'validator unexpectedly passed' : `wrong diagnostic; expected ${JSON.stringify(test.expectedDiagnostic)}`}`);
    return;
  }
  passed += 1;
  console.log(`${test.id} PASS — ${test.mutation}`);
}

function distCase(id, section, mutation, expectedDiagnostic, mutate, validator = 'dist') {
  return {
    id,
    section,
    mutation,
    expectedDiagnostic,
    command: commandDisplay(node, [validators[validator]]),
    execute: () => withDistMutation(mutate, validator),
  };
}

function workflowCase(id, mutation, expectedDiagnostic, mutate) {
  return {
    id,
    section: 'workflow-policy',
    mutation,
    expectedDiagnostic,
    command: commandDisplay(node, [validators.workflow]),
    execute: () => withWorkflowMutation(mutate),
  };
}

function sourceClaimCase(id, mutation, expectedDiagnostic, mutate) {
  return {
    id,
    section: 'public-claims',
    mutation,
    expectedDiagnostic,
    command: commandDisplay(node, [validators.claims]),
    execute: () => withClaimsSourceMutation(mutate),
  };
}

function contentCase(id, mutation, expectedDiagnostic, mutate) {
  return {
    id,
    section: 'content-and-reproducibility',
    mutation,
    expectedDiagnostic,
    command: commandDisplay(bun, ['scripts/validate-content.ts']),
    execute: () => withContentSourceMutation(mutate),
  };
}

function heroCase(id, mutation, expectedDiagnostic, mutate) {
  return {
    id,
    section: 'hero-scene',
    mutation,
    expectedDiagnostic,
    command: commandDisplay(node, [validators.hero]),
    execute: () => withHeroSourceMutation(mutate),
  };
}

function architectureCase(id, mutation, expectedDiagnostic, mutate) {
  return {
    id,
    section: 'interactive-homepage-source-architecture',
    mutation,
    expectedDiagnostic,
    command: commandDisplay(node, [validators.architecture]),
    execute: () => withArchitectureSourceMutation(mutate),
  };
}

const baselineChecks = [
  ['dist', validators.dist],
  ['claims', validators.claims],
  ['workflow', validators.workflow],
  ['architecture', validators.architecture],
  ['hero', validators.hero],
];
for (const [name, script] of baselineChecks) {
  const result = nodeResult(script);
  if (result.status !== 0) throw new Error(`Baseline ${name} validator failed:\n${diagnostic(result)}`);
}
const contentBaseline = commandResult(bun, [resolve(projectRoot, 'scripts/validate-content.ts')], projectRoot);
if (contentBaseline.status !== 0) throw new Error(`Baseline content validator failed:\n${diagnostic(contentBaseline)}`);

const condition = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
await expectWorkflowSuccessVariant('quoted scalars', async (_root, file) => {
  await mutateText(file, (source) => source
    .replaceAll('runs-on: ubuntu-24.04', 'runs-on: "ubuntu-24.04"')
    .replace('branches: [main]', 'branches: ["main"]')
    .replace('bun-version: 1.3.14', 'bun-version: "1.3.14"'));
});
await expectWorkflowSuccessVariant('reordered mapping fields', async (_root, file) => {
  await mutateText(file, (source) => replaceRequired(source,
    '      - name: Set up Bun\n        uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2\n        with:\n          bun-version: 1.3.14',
    '      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2\n        with:\n          bun-version: 1.3.14\n        name: Set up Bun',
    'reordered valid step fields'));
});
await expectWorkflowSuccessVariant('folded multiline exact conditions', async (_root, file) => {
  await mutateText(file, (source) => source
    .replaceAll(`        if: ${condition}`, `        if: >-\n          ${condition}`)
    .replace(`    if: ${condition}`, `    if: >-\n      ${condition}`));
});
await expectWorkflowSuccessVariant('YAML alias for exact Pages condition', async (_root, file) => {
  await mutateText(file, (source) => source
    .replace(`        if: ${condition}`, `        if: &pages-condition >-\n          ${condition}`)
    .replace(`        if: ${condition}`, '        if: *pages-condition')
    .replace(`    if: ${condition}`, '    if: *pages-condition'));
});

const cases = [
  sourceClaimCase('ADV-001', 'unsupported numeric claim in tracked source', 'public-source:src/public-claims.ts: absolute numeric frame-rate claim', async (root) => {
    await mutateText(resolve(root, 'src/public-claims.ts'), (source) => `${source}\n// 60 fps\n`);
  }),
  distCase('ADV-002', 'public-claims', 'unsupported claim in generated HTML', 'generated:en/services/webgl-interfaces/index.html: absolute numeric frame-rate claim', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => `${html}\n<!-- 144 fps -->\n`);
  }, 'claims'),
  distCase('ADV-003', 'public-claims', 'unsupported claim in emitted JavaScript', 'generated:assets/', async (root) => {
    const original = await firstAsset(/\.js$/i);
    const file = resolve(root, 'assets', basename(original));
    await mutateText(file, (source) => `${source}\n;console.log('stable 120 fps');\n`);
  }, 'claims'),
  sourceClaimCase('ADV-004', 'unsupported claim in README.md', 'public-source:README.md: absolute numeric frame-rate claim', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nGuaranteed stable 240 fps.\n`);
  }),
  sourceClaimCase('ADV-005', 'unsupported claim in tracked public documentation', 'public-source:docs/public-guide.md: absolute numeric frame-rate claim', async (root) => {
    await writeFile(resolve(root, 'docs/public-guide.md'), 'Public guarantee: stable 90 fps.\n', 'utf8');
  }),
  sourceClaimCase('ADV-006', 'English word-form frame-rate guarantee', 'English word-form frame-rate claim', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nGuaranteed stable sixty frames per second.\n`);
  }),
  sourceClaimCase('ADV-007', 'Russian word-form frame-rate guarantee', 'Russian word-form frame-rate claim', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nГарантированно стабильные шестьдесят кадров в секунду.\n`);
  }),
  sourceClaimCase('ADV-008', 'all-device performance guarantee', 'all-device performance guarantee', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nGuaranteed rendering performance on every device.\n`);
  }),
  sourceClaimCase('ADV-009', 'obsolete branch-based deployment wording', 'obsolete gh-pages deployment claim', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nDeploy from the gh-pages branch.\n`);
  }),
  sourceClaimCase('ADV-010', 'obsolete localization wording', 'obsolete in-place localization claim', async (root) => {
    await mutateText(resolve(root, 'README.md'), (source) => `${source}\nSwitch languages without a page reload.\n`);
  }),
  distCase('ADV-011', 'public-claims', 'unsupported guarantee in generated public JSON', 'generated:portfolio-links.json: all-device performance guarantee', async (root) => {
    const file = resolve(root, 'portfolio-links.json');
    const value = JSON.parse(await readFile(file, 'utf8'));
    value.publicClaim = 'Guaranteed rendering performance on every device.';
    await writeJson(file, value);
  }, 'claims'),

  distCase('ADV-012', 'canonical-html', 'duplicate canonical link', 'expected exactly one canonical link, found 2', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<link rel="canonical" href="https://attacker.invalid/" /></head>'));
  }),
  distCase('ADV-013', 'canonical-html', 'missing canonical link', 'expected exactly one canonical link, found 0', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(/<link rel="canonical"[^>]*>\s*/i, ''));
  }),
  distCase('ADV-014', 'canonical-html', 'empty canonical href', 'canonical href is empty', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(canonical, ''));
  }),
  distCase('ADV-015', 'canonical-html', 'malformed canonical URL', 'canonical URL is malformed', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(canonical, 'https://['));
  }),
  distCase('ADV-016', 'canonical-html', 'incorrect canonical URL', 'canonical mismatch', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(canonical, 'https://nonamezisntreal.github.io/webgl-portfolio/en/services/wrong/'));
  }),
  distCase('ADV-017', 'canonical-html', 'duplicate title', 'expected exactly one nonempty title', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<title>Duplicate title</title></head>'));
  }),
  distCase('ADV-018', 'canonical-html', 'missing title', 'expected exactly one nonempty title', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(/<title>[\s\S]*?<\/title>/i, ''));
  }),
  distCase('ADV-019', 'canonical-html', 'missing description', 'expected exactly one description meta tag', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace(/<meta name="description"[^>]*>\s*/i, ''));
  }),
  distCase('ADV-020', 'canonical-html', 'duplicate H1', 'expected exactly one H1', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</main>', '<h1>Duplicate</h1></main>'));
  }),
  distCase('ADV-021', 'canonical-html', 'incorrect document language', 'document language must be en', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('<html lang="en">', '<html lang="ru">'));
  }),
  distCase('ADV-022', 'canonical-html', 'duplicate description meta', 'expected exactly one description meta tag', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<meta name="description" content="Duplicate description" /></head>'));
  }),

  distCase('ADV-023', 'json-ld', 'invalid JSON syntax', 'JSON-LD block 1 is not valid strict JSON', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), '{not-json');
  }),
  distCase('ADV-024', 'json-ld', 'one invalid JSON-LD block among valid blocks', 'JSON-LD block 2 is not valid strict JSON', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<script type="application/ld+json">{not-json</script></head>'));
  }),
  distCase('ADV-025', 'json-ld', 'empty JSON-LD object', 'must contain a nonempty object', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), '{}');
  }),
  distCase('ADV-026', 'json-ld', 'missing JSON-LD @context', 'missing or unsupported @context', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); delete value['@context']; return JSON.stringify(value); });
  }),
  distCase('ADV-027', 'json-ld', 'unsupported JSON-LD @type', 'unsupported JSON-LD @type Organization', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); value['@type'] = 'Organization'; return JSON.stringify(value); });
  }),
  distCase('ADV-028', 'json-ld', 'missing required Service.name', 'missing keys: name', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); delete value.name; return JSON.stringify(value); });
  }),
  distCase('ADV-029', 'json-ld', 'attacker URL in Service structured data', 'Service.url must equal', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); value.url = 'https://attacker.invalid/'; return JSON.stringify(value); });
  }),
  distCase('ADV-030', 'json-ld', 'localized Service.name mismatch', 'Service.name is not present in visible page content', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); value.name = 'Unrelated localized service'; return JSON.stringify(value); });
  }),
  distCase('ADV-031', 'json-ld', 'duplicate JSON-LD object', 'duplicate JSON-LD object detected', async (root) => {
    const file = resolve(root, staticPage);
    await mutateText(file, (html) => { const match = jsonLdBlocks(html)[0]; return html.replace('</head>', `${match[0]}</head>`); });
  }),
  distCase('ADV-032', 'json-ld', 'contradictory second Service object', 'expected exactly one Service object', async (root) => {
    const file = resolve(root, staticPage);
    await mutateText(file, (html) => {
      const value = JSON.parse(jsonLdBlocks(html)[0][1]);
      value.name = 'Contradictory service';
      return html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(value)}</script></head>`);
    });
  }),
  distCase('ADV-033', 'json-ld', 'malformed FAQ item', 'FAQ item 1 must be a Question', async (root) => {
    const file = resolve(root, faqPage);
    await mutateText(file, (html) => {
      const blocks = jsonLdBlocks(html);
      const faq = blocks.find((item) => JSON.parse(item[1])['@type'] === 'FAQPage');
      const value = JSON.parse(faq[1]);
      value.mainEntity = [{}];
      return html.replace(faq[1], JSON.stringify(value));
    });
  }),
  distCase('ADV-034', 'json-ld', 'FAQ content absent from visible page', 'FAQ question 1 is not present in visible page content', async (root) => {
    const file = resolve(root, faqPage);
    await mutateText(file, (html) => {
      const blocks = jsonLdBlocks(html);
      const faq = blocks.find((item) => JSON.parse(item[1])['@type'] === 'FAQPage');
      const value = JSON.parse(faq[1]);
      value.mainEntity[0].name = 'Invisible synthetic question?';
      return html.replace(faq[1], JSON.stringify(value));
    });
  }),
  distCase('ADV-035', 'json-ld', 'TechArticle published date after modified date', 'datePublished must not be after dateModified', async (root) => {
    const file = resolve(root, 'en/cases/webgl-portfolio/index.html');
    await mutateFirstJsonLd(file, (body) => { const value = JSON.parse(body); value.datePublished = '2099-01-01'; return JSON.stringify(value); });
  }),
  distCase('ADV-036', 'json-ld', 'attacker provider URL', 'Service.provider.url must equal', async (root) => {
    await mutateFirstJsonLd(resolve(root, staticPage), (body) => { const value = JSON.parse(body); value.provider.url = 'https://attacker.invalid/'; return JSON.stringify(value); });
  }),
  distCase('ADV-037', 'json-ld', 'ProfilePage sameAs identity drift', 'sameAs does not match the expected public profiles', async (root) => {
    await mutateFirstJsonLd(resolve(root, 'en/index.html'), (body) => { const value = JSON.parse(body); value.mainEntity.sameAs = ['https://attacker.invalid/']; return JSON.stringify(value); });
  }),

  distCase('ADV-038', 'runtime-assets', 'static module script', 'static page unexpectedly loads a module or import map', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</body>', '<script type="module" src="/webgl-portfolio/assets/renamed.js"></script></body>'));
  }),
  distCase('ADV-039', 'runtime-assets', 'static classic Three.js script', 'expected 1 bounded executable script(s), found 2', async (root) => {
    const three = await firstAsset(/^three-.*\.js$/i);
    await mutateText(resolve(root, staticPage), (html) => html.replace('</body>', `<script src="/webgl-portfolio/assets/${basename(three)}"></script></body>`));
  }),
  distCase('ADV-040', 'runtime-assets', 'static script preload', 'static page unexpectedly preloads a JavaScript runtime', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<link rel="preload" as="script" href="/webgl-portfolio/assets/missing.js" /></head>'));
  }),
  distCase('ADV-041', 'runtime-assets', 'static modulepreload', 'static page unexpectedly preloads a JavaScript runtime', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</head>', '<link rel="modulepreload" href="/webgl-portfolio/assets/missing.js" /></head>'));
  }),
  distCase('ADV-042', 'runtime-assets', 'renamed hashed runtime injected into static page', 'expected 1 bounded executable script(s), found 2', async (root) => {
    const three = await firstAsset(/^three-.*\.js$/i);
    await cp(three, resolve(root, 'assets/runtime-renamed.js'));
    await mutateText(resolve(root, staticPage), (html) => html.replace('</body>', '<script src="/webgl-portfolio/assets/runtime-renamed.js"></script></body>'));
  }),
  distCase('ADV-043', 'runtime-assets', 'missing homepage stylesheet asset', 'references missing internal asset', async (root) => {
    await mutateText(resolve(root, 'index.html'), (html) => html.replace(/href="\/webgl-portfolio\/assets\/index-[^"]+\.css"/, 'href="/webgl-portfolio/assets/missing.css"'));
  }),
  distCase('ADV-044', 'runtime-assets', 'missing homepage JavaScript asset', 'references missing internal asset', async (root) => {
    await mutateText(resolve(root, 'index.html'), (html) => html.replace(/src="\/webgl-portfolio\/assets\/index-[^"]+\.js"/, 'src="/webgl-portfolio/assets/missing.js"'));
  }),
  distCase('ADV-045', 'runtime-assets', 'internal asset path escapes BASE_PATH by traversal', 'contains path traversal', async (root) => {
    await mutateText(resolve(root, 'index.html'), (html) => html.replace('</body>', '<img src="/webgl-portfolio/%2e%2e/secret.png" alt="" /></body>'));
  }),
  distCase('ADV-046', 'runtime-assets', 'missing internal image/source asset', 'references missing internal asset', async (root) => {
    await mutateText(resolve(root, 'index.html'), (html) => html.replace('</body>', '<picture><source srcset="/webgl-portfolio/assets/missing.webp 1x"><img src="/webgl-portfolio/assets/missing.png" alt="" /></picture></body>'));
  }),
  distCase('ADV-047', 'runtime-assets', 'malformed percent encoding in internal asset', 'contains malformed URL encoding', async (root) => {
    await mutateText(resolve(root, 'index.html'), (html) => html.replace('</body>', '<img src="/webgl-portfolio/assets/%ZZ.png" alt="" /></body>'));
  }),

  distCase('ADV-048', 'routes-sitemap-robots', 'missing local fragment target', 'broken local fragment #missing-target', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</main>', '<a href="#missing-target">Broken</a></main>'));
  }),
  distCase('ADV-049', 'routes-sitemap-robots', 'missing internal route target', 'internal link target does not exist', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => html.replace('</main>', '<a href="/webgl-portfolio/en/missing-route/">Broken</a></main>'));
  }),
  distCase('ADV-050', 'routes-sitemap-robots', 'disabled route exposed in registry', 'disabled or non-public link', async (root) => {
    const file = resolve(root, 'portfolio-links.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.links[0].enabled = false; await writeJson(file, value);
  }),
  distCase('ADV-051', 'routes-sitemap-robots', 'UTM query added to canonical registry URL', 'must not contain credentials, query parameters or fragments', async (root) => {
    const file = resolve(root, 'portfolio-links.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.links[0].canonicalUrl += '?utm_source=test'; await writeJson(file, value);
  }),
  distCase('ADV-052', 'routes-sitemap-robots', 'duplicate route ID tuple', 'duplicate locale/type/ID records', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.routes[1].locale = value.routes[0].locale; value.routes[1].type = value.routes[0].type; value.routes[1].id = value.routes[0].id; await writeJson(file, value);
  }),
  distCase('ADV-053', 'routes-sitemap-robots', 'duplicate canonical route slug', 'Routes manifest contains duplicate paths', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.routes[1].path = value.routes[0].path; await writeJson(file, value);
  }),
  distCase('ADV-054', 'routes-sitemap-robots', 'missing/invalid locale', 'has invalid locale', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.routes[0].locale = 'fr'; await writeJson(file, value);
  }),
  contentCase('ADV-055', 'broken related-content ID in canonical source', 'unknown related case missing-case', async (root) => {
    const file = resolve(root, 'src/static-pages.ts');
    await mutateText(file, (source) => replaceRequired(source, "relatedCaseIds: ['freelancebot']", "relatedCaseIds: ['missing-case']", 'related content ID'));
  }),
  distCase('ADV-056', 'routes-sitemap-robots', 'duplicate sitemap URL entry', 'sitemap.xml expected 28 URLs, found 29', async (root) => {
    const file = resolve(root, 'sitemap.xml'); await mutateText(file, (xml) => { const match = xml.match(/  <url>[\s\S]*?  <\/url>/); return xml.replace('</urlset>', `${match[0]}\n</urlset>`); });
  }),
  distCase('ADV-057', 'routes-sitemap-robots', 'extra undeclared sitemap URL', 'sitemap.xml expected 28 URLs, found 29', async (root) => {
    const file = resolve(root, 'sitemap.xml'); await mutateText(file, (xml) => xml.replace('</urlset>', '  <url><loc>https://nonamezisntreal.github.io/webgl-portfolio/private/</loc><lastmod>2026-07-30</lastmod><xhtml:link rel="alternate" hreflang="ru" href="https://nonamezisntreal.github.io/webgl-portfolio/private/"/><xhtml:link rel="alternate" hreflang="en" href="https://nonamezisntreal.github.io/webgl-portfolio/en/private/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://nonamezisntreal.github.io/webgl-portfolio/private/"/></url>\n</urlset>'));
  }),
  distCase('ADV-058', 'routes-sitemap-robots', 'missing sitemap URL entry', 'sitemap.xml expected 28 URLs, found 27', async (root) => {
    const file = resolve(root, 'sitemap.xml'); await mutateText(file, (xml) => xml.replace(/  <url>[\s\S]*?  <\/url>\n/, ''));
  }),
  distCase('ADV-059', 'routes-sitemap-robots', 'incorrect sitemap lastmod', 'sitemap.xml lastmod mismatch', async (root) => {
    const file = resolve(root, 'sitemap.xml'); await mutateText(file, (xml) => xml.replace('<lastmod>2026-07-30</lastmod>', '<lastmod>2099-01-01</lastmod>'));
  }),
  distCase('ADV-060', 'routes-sitemap-robots', 'malformed sitemap XML', 'sitemap.xml is malformed XML', async (root) => {
    const file = resolve(root, 'sitemap.xml'); await mutateText(file, (xml) => xml.replace('</urlset>', ''));
  }),
  distCase('ADV-061', 'routes-sitemap-robots', 'accidental global Disallow: /', 'must not contain a nonempty Disallow rule', async (root) => {
    await mutateText(resolve(root, 'robots.txt'), (source) => source.replace('User-agent: *\nAllow: /', 'User-agent: *\nAllow: /\nDisallow: /'));
  }),
  distCase('ADV-062', 'routes-sitemap-robots', 'incorrect sitemap declaration in robots.txt', 'must declare exactly the canonical sitemap URL', async (root) => {
    await mutateText(resolve(root, 'robots.txt'), (source) => source.replace('https://nonamezisntreal.github.io/webgl-portfolio/sitemap.xml', 'https://attacker.invalid/sitemap.xml'));
  }),
  distCase('ADV-063', 'routes-sitemap-robots', 'conflicting duplicate robots crawler group', 'conflicting duplicate crawler group', async (root) => {
    await mutateText(resolve(root, 'robots.txt'), (source) => `${source}\nUser-agent: *\nAllow: /\n`);
  }),

  workflowCase('ADV-064', 'mutable Action tag', 'not pinned to a full 40-character commit SHA', async (_root, file) => {
    await mutateText(file, (source) => source.replace(/actions\/checkout@[0-9a-f]{40}/, 'actions/checkout@v4'));
  }),
  workflowCase('ADV-065', 'wrong Bun version', 'input bun-version is incorrect', async (_root, file) => {
    await mutateText(file, (source) => source.replace('bun-version: 1.3.14', 'bun-version: 1.3.13'));
  }),
  workflowCase('ADV-066', 'non-exact pull-request checkout', 'input ref is incorrect', async (_root, file) => {
    await mutateText(file, (source) => source.replace("github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha", 'github.sha'));
  }),
  workflowCase('ADV-067', 'persist-credentials omitted', 'inputs keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => source.replace(/\n\s+persist-credentials: false/, ''));
  }),
  workflowCase('ADV-068', 'persist-credentials enabled', 'input persist-credentials is incorrect', async (_root, file) => {
    await mutateText(file, (source) => source.replace('persist-credentials: false', 'persist-credentials: true'));
  }),
  workflowCase('ADV-069', 'expanded build permissions', 'Build job permission contents must be read', async (_root, file) => {
    await mutateText(file, (source) => source.replace('      contents: read', '      contents: write'));
  }),
  workflowCase('ADV-070', 'expanded deploy permissions', 'Deploy job permissions keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => source.replace('      id-token: write', '      id-token: write\n      contents: write'));
  }),
  workflowCase('ADV-071', 'broad deployment condition', 'condition does not use the exact positive allowlist', async (_root, file) => {
    await mutateText(file, (source) => source.replaceAll("github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')", "github.event_name != 'pull_request'"));
  }),
  workflowCase('ADV-072', 'feature branch added to push trigger', 'Push deployment must be restricted exactly to main', async (_root, file) => {
    await mutateText(file, (source) => source.replace('branches: [main]', 'branches: [main, feature]'));
  }),
  workflowCase('ADV-073', 'pull-request deployment condition', 'condition does not use the exact positive allowlist', async (_root, file) => {
    await mutateText(file, (source) => source.replaceAll("github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')", "github.event_name == 'pull_request'"));
  }),
  workflowCase('ADV-074', 'pull_request_target trigger', 'pull_request_target is forbidden', async (_root, file) => {
    await mutateText(file, (source) => source.replace('  pull_request:\n', '  pull_request:\n  pull_request_target:\n'));
  }),
  workflowCase('ADV-075', 'required review artifact step removed', 'Build job must contain exactly 8 approved steps', async (_root, file) => {
    await mutateText(file, (source) => source.replace(/\n      - name: Upload review artifact[\s\S]*?retention-days: 7\n/, '\n'));
  }),
  workflowCase('ADV-076', 'review artifact missing files do not fail', 'input if-no-files-found is incorrect', async (_root, file) => {
    await mutateText(file, (source) => source.replace('if-no-files-found: error', 'if-no-files-found: ignore'));
  }),
  workflowCase('ADV-077', 'additional contents:write job', 'Workflow jobs keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => `${source}\n  mutate:\n    runs-on: ubuntu-24.04\n    permissions:\n      contents: write\n    steps:\n      - name: Push\n        run: git push\n`);
  }),
  workflowCase('ADV-078', 'additional Pages/OIDC job', 'Workflow jobs keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => `${source}\n  pages-extra:\n    runs-on: ubuntu-24.04\n    permissions:\n      pages: write\n      id-token: write\n    steps:\n      - name: Pages\n        run: echo deploy\n`);
  }),
  workflowCase('ADV-079', 'unguarded deployment job', 'Workflow jobs keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => `${source}\n  unguarded:\n    runs-on: ubuntu-24.04\n    permissions:\n      pages: write\n    steps:\n      - name: Deploy\n        run: echo deploy\n`);
  }),
  workflowCase('ADV-080', 'run-based git push mutation', 'contains a repository mutation or deployment command', async (_root, file) => {
    await mutateText(file, (source) => source.replace('run: bun run build', 'run: |\n          bun run build\n          git push origin HEAD'));
  }),
  workflowCase('ADV-081', 'YAML alias resolves to expanded deploy permissions', 'Deploy job permissions keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => source.replace('    permissions:\n      contents: read', '    permissions: &shared-permissions\n      contents: read').replace('    permissions:\n      pages: write\n      id-token: write', '    permissions: *shared-permissions'));
  }),
  workflowCase('ADV-082', 'reordered malicious additional job fields', 'Workflow jobs keys must be exactly', async (_root, file) => {
    await mutateText(file, (source) => `${source}\n  reordered-extra:\n    steps:\n      - run: git push\n        name: Mutate\n    permissions: { contents: write }\n    runs-on: ubuntu-24.04\n`);
  }),
  workflowCase('ADV-083', 'quoted multiline broad condition bypass', 'Deploy job condition does not use the exact positive allowlist', async (_root, file) => {
    await mutateText(file, (source) => source.replace(/^    if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)$/m, "    if: >-\n      github.event_name != 'pull_request'"));
  }),
  workflowCase('ADV-084', 'duplicate YAML permissions key', 'Workflow YAML is invalid or uses unsupported syntax', async (_root, file) => {
    await mutateText(file, (source) => source.replace('    permissions:\n      contents: read', '    permissions:\n      contents: read\n    permissions:\n      contents: write'));
  }),
  workflowCase('ADV-085', 'additional workflow file', 'deploy.yml must remain the only active workflow authority', async (root) => {
    await writeFile(resolve(root, 'extra.yml'), 'name: extra\non: [push]\njobs: {}\n', 'utf8');
  }),
  workflowCase('ADV-086', 'validation step bypassed with Vite-only build', 'Build and validate command must be exactly bun run build', async (_root, file) => {
    await mutateText(file, (source) => source.replace('run: bun run build', 'run: vite build'));
  }),
  workflowCase('ADV-087', 'workflow-level permission inheritance enabled', 'Workflow-level permissions must fail closed', async (_root, file) => {
    await mutateText(file, (source) => source.replace('permissions: {}', 'permissions:\n  contents: write'));
  }),
  workflowCase('ADV-088', 'continue-on-error bypass', 'may not continue on error', async (_root, file) => {
    await mutateText(file, (source) => source.replace('run: bun run build', 'continue-on-error: true\n        run: bun run build'));
  }),

  distCase('ADV-089', 'reproducibility', 'wall-clock generated date injected', 'generatedAt must be derived from versioned route dates', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.generatedAt = '2099-01-01T00:00:00.000Z'; await writeJson(file, value);
  }),
  contentCase('ADV-090', 'copyright year changed to wall-clock source', 'Homepage copyright year must be derived from siteConfig.contentUpdatedAt', async (root) => {
    const file = resolve(root, 'src/ui/render.ts');
    await mutateText(file, (source) => source.replace('year.textContent = siteConfig.contentUpdatedAt.slice(0, 4);', 'year.textContent = String(new Date().getFullYear());'));
  }),
  distCase('ADV-091', 'reproducibility', 'CRLF text artifact', 'text artifact contains non-LF line endings', async (root) => {
    const file = resolve(root, '404.html'); await mutateText(file, (source) => source.replaceAll('\n', '\r\n'));
  }),
  distCase('ADV-092', 'reproducibility', 'unstable routes-manifest serialization order', 'routes-manifest.json top-level key order is unstable', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); const reordered = { origin: value.origin, routes: value.routes, generatedAt: value.generatedAt, basePath: value.basePath }; await writeJson(file, reordered);
  }),
  distCase('ADV-093', 'reproducibility', 'platform-specific path separator in route', 'platform-specific separator', async (root) => {
    const file = resolve(root, 'routes-manifest.json'); const value = JSON.parse(await readFile(file, 'utf8')); value.routes[0].path = '/webgl-portfolio\\'; await writeJson(file, value);
  }),
  distCase('ADV-094', 'reproducibility', 'portfolio registry serialization order drift', 'portfolio-links.json top-level key order is unstable', async (root) => {
    const file = resolve(root, 'portfolio-links.json'); const value = JSON.parse(await readFile(file, 'utf8')); const reordered = { generatedAt: value.generatedAt, links: value.links, schemaVersion: value.schemaVersion, canonicalHomepageUrl: value.canonicalHomepageUrl }; await writeJson(file, reordered);
  }),

  distCase('ADV-095', 'interactive-homepages', 'English homepage application module removed', 'expected exactly one application module script', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, /<script\b[^>]*type="module"[^>]*><\/script>/i, '', 'English application module'));
  }),
  distCase('ADV-096', 'interactive-homepages', 'English homepage canvas removed', 'expected exactly one shared WebGL canvas', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, /<canvas\b[^>]*id="gl"[^>]*><\/canvas>/i, '', 'English WebGL canvas'));
  }),
  distCase('ADV-097', 'interactive-homepages', 'English declared locale changed to Russian', 'data-locale must equal en', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, '<html lang="en" data-locale="en">', '<html lang="en" data-locale="ru">', 'English data-locale'));
  }),
  distCase('ADV-098', 'interactive-homepages', 'active English locale changed back into an anchor', 'active locale must be an inert span', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, /<span class="lang-toggle__option is-active" data-lang-pill="en" aria-current="page">EN<\/span>/i, '<a class="lang-toggle__option is-active" data-lang-pill="en" href="/webgl-portfolio/en/" aria-current="page">EN</a>', 'active EN option'));
  }),
  distCase('ADV-099', 'interactive-homepages', 'inactive RU locale points to the wrong homepage', 'inactive locale href must equal /webgl-portfolio/', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, 'href="/webgl-portfolio/" hreflang="ru"', 'href="/webgl-portfolio/en/" hreflang="ru"', 'inactive RU href'));
  }),
  distCase('ADV-100', 'interactive-homepages', 'English homepage hardening removed', 'homepage hardening marker must appear exactly once', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, ' data-homepage-hardening="v1"', '', 'English hardening marker'));
  }),
  distCase('ADV-101', 'interactive-homepages', 'English homepage hardening duplicated', 'homepage hardening marker must appear exactly once', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, 'data-homepage-hardening="v1"', 'data-homepage-hardening="v1" data-homepage-hardening="v1"', 'duplicate English hardening marker'));
  }),
  distCase('ADV-102', 'interactive-homepages', 'English localized published-content directory removed', 'localized published-content directory is missing', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, 'id="explore"', 'id="explore-removed"', 'English SEO directory'));
  }),
  distCase('ADV-103', 'interactive-homepages', 'English homepage replaced by a non-interactive document marker', 'interactive homepage marker is missing', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, 'data-interactive-homepage="v1"', 'data-static-homepage="v1"', 'English interactive marker'));
  }),
  distCase('ADV-104', 'interactive-homepages', 'English canonical points to Russian homepage', 'canonical mismatch', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, '<link rel="canonical" href="https://nonamezisntreal.github.io/webgl-portfolio/en/"', '<link rel="canonical" href="https://nonamezisntreal.github.io/webgl-portfolio/"', 'English canonical'));
  }),
  distCase('ADV-105', 'interactive-homepages', 'English self hreflang points to Russian homepage', 'self hreflang is missing', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, 'hreflang="en" href="https://nonamezisntreal.github.io/webgl-portfolio/en/"', 'hreflang="en" href="https://nonamezisntreal.github.io/webgl-portfolio/"', 'English self hreflang'));
  }),
  distCase('ADV-106', 'interactive-homepages', 'English nested navigation restored obsolete #cases fragment', 'broken target fragment', async (root) => {
    await mutateText(resolve(root, staticPage), (html) => replaceRequired(html, '/webgl-portfolio/en/#projects', '/webgl-portfolio/en/#cases', 'English nested cases navigation'));
  }),
  heroCase('ADV-107', 'spherical comet geometry reintroduced into Particles', 'intrusive spherical-comet contract: SphereGeometry', async (root) => {
    await mutateText(resolve(root, 'src/webgl/Particles.ts'), (source) => `${source}\nconst regression = new THREE.SphereGeometry(0.025, 8, 8);\n`);
  }),
  heroCase('ADV-108', 'primary bloom pass removed from hero composition', 'Primary bloom composition is missing', async (root) => {
    await mutateText(resolve(root, 'src/webgl/PostFX.ts'), (source) => replaceRequired(source, 'this.composer.addPass(this.bloom);', '// bloom removed', 'bloom pass'));
  }),
  heroCase('ADV-109', 'ambient shader particle field removed', 'Ambient shader particle field is missing', async (root) => {
    await mutateText(resolve(root, 'src/webgl/Particles.ts'), (source) => replaceRequired(source, 'new THREE.Points(geometry, this.material)', 'new THREE.Group()', 'ambient particle field'));
  }),
  distCase('ADV-110', 'interactive-homepages', 'both English locale options become anchors', 'active locale must be an inert span', async (root) => {
    await mutateText(resolve(root, 'en/index.html'), (html) => replaceRequired(html, /<span class="lang-toggle__option is-active" data-lang-pill="en" aria-current="page">EN<\/span>/i, '<a class="lang-toggle__option is-active" data-lang-pill="en" href="/webgl-portfolio/en/" aria-current="page">EN</a>', 'both locale options anchors'));
  }),
  architectureCase('ADV-111', 'obsolete static homeDocument source is restored', 'Obsolete static homeDocument() source of truth is active', async (root) => {
    await mutateText(resolve(root, 'scripts/generate-static-site.ts'), (source) => `${source}\nfunction homeDocument() { return '<html></html>'; }\n`);
  }),
  architectureCase('ADV-112', 'English homepage hardening target is removed from source', 'Homepage hardener does not include dist/en/index.html', async (root) => {
    await mutateText(resolve(root, 'scripts/harden-homepage.ts'), (source) => replaceRequired(source, "  resolve(process.cwd(), 'dist', 'en', 'index.html'),\n", '', 'English hardening target'));
  }),
  architectureCase('ADV-113', 'runtime locale is hardcoded back to Russian', 'Runtime locale is hardcoded to RU', async (root) => {
    await mutateText(resolve(root, 'src/main.ts'), (source) => `${source}\nconst locale: Locale = 'ru';\n`);
  }),
];

for (const test of cases) await expectFailure(test);

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  subject: 'WEBGL-PORTFOLIO-INTERACTIVE-EN-AND-HERO-ARTIFACT-REMEDIATION-08',
  baselineValidators: baselineChecks.map(([name, script]) => ({ name, command: commandDisplay(node, [script]), status: 'PASS' })).concat([{ name: 'content', command: commandDisplay(bun, ['scripts/validate-content.ts']), status: 'PASS' }]),
  positiveWorkflowVariants,
  total: reports.length,
  passed,
  failed: reports.length - passed,
  cases: reports,
};
await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (summary.failed > 0) throw new Error(`Adversarial validation failed: ${summary.failed}/${summary.total} mutations. Report: ${reportPath}`);
console.log(`Adversarial validation passed: ${passed}/${reports.length} mutations. Report: ${relative(projectRoot, reportPath).replaceAll('\\', '/')}`);
