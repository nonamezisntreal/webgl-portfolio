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
  workflow: resolve(projectRoot, 'scripts/validate-workflow-policy.mjs'),
};
let passed = 0;

function run(script, env = {}) {
  return spawnSync(node, [script], {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

function expectSuccess(label, script, env = {}) {
  const result = run(script, env);
  if (result.status !== 0) {
    throw new Error(`${label} unexpectedly failed:\n${result.stdout}${result.stderr}`);
  }
  passed += 1;
}

function expectFailure(label, script, env, expectedFragment) {
  const result = run(script, env);
  const output = `${result.stdout}${result.stderr}`;
  if (result.status === 0) throw new Error(`${label} unexpectedly passed.`);
  if (!output.includes(expectedFragment)) {
    throw new Error(`${label} failed for the wrong reason; expected ${JSON.stringify(expectedFragment)}:\n${output}`);
  }
  passed += 1;
}

async function withDistMutation(label, mutate, expectedFragment) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-dist-'));
  const mutantDist = resolve(root, 'dist');
  try {
    await cp(dist, mutantDist, { recursive: true });
    await mutate(mutantDist);
    expectFailure(label, validators.dist, { PROJECT_ROOT: projectRoot, DIST_DIR: mutantDist }, expectedFragment);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withClaimsDistMutation(label, mutate, expectedFragment) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-claims-'));
  const mutantDist = resolve(root, 'dist');
  try {
    await cp(dist, mutantDist, { recursive: true });
    await mutate(mutantDist);
    expectFailure(label, validators.claims, { PROJECT_ROOT: projectRoot, DIST_DIR: mutantDist }, expectedFragment);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withWorkflowMutation(label, mutate, expectedFragment) {
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-workflow-'));
  const workflowRoot = resolve(root, 'workflows');
  try {
    await cp(resolve(projectRoot, '.github/workflows'), workflowRoot, { recursive: true });
    const file = resolve(workflowRoot, 'deploy.yml');
    const source = await readFile(file, 'utf8');
    await writeFile(file, mutate(source), 'utf8');
    expectFailure(label, validators.workflow, { PROJECT_ROOT: projectRoot, WORKFLOW_ROOT: workflowRoot }, expectedFragment);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

expectSuccess('baseline dist validator', validators.dist);
expectSuccess('baseline public-claims validator', validators.claims);
expectSuccess('baseline workflow validator', validators.workflow);

{
  const root = await mkdtemp(resolve(tmpdir(), 'webgl-seo-source-'));
  try {
    await cp(resolve(projectRoot, 'src'), resolve(root, 'src'), { recursive: true });
    await cp(resolve(projectRoot, 'index.html'), resolve(root, 'index.html'));
    const sourceFile = resolve(root, 'src/public-claims.ts');
    await writeFile(sourceFile, `${await readFile(sourceFile, 'utf8')}\n// guaranteed 60 fps\n`, 'utf8');
    expectFailure('source frame-rate claim', validators.claims, { PROJECT_ROOT: root, DIST_DIR: dist }, 'source:src/public-claims.ts: guaranteed frame-rate claim');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await withClaimsDistMutation('HTML frame-rate claim', async (mutantDist) => {
  const file = resolve(mutantDist, 'en/services/webgl-interfaces/index.html');
  await writeFile(file, `${await readFile(file, 'utf8')}\n<!-- guaranteed 144 fps -->\n`, 'utf8');
}, 'html:en/services/webgl-interfaces/index.html: guaranteed frame-rate claim');

await withClaimsDistMutation('JavaScript frame-rate claim', async (mutantDist) => {
  const file = resolve(mutantDist, 'assets/Experience-CtJGFnO4.js');
  await writeFile(file, `${await readFile(file, 'utf8')}\n;console.log('stable 120 fps');\n`, 'utf8');
}, 'javascript:assets/Experience-CtJGFnO4.js: guaranteed frame-rate claim');

await withDistMutation('duplicate canonical', async (mutantDist) => {
  const file = resolve(mutantDist, 'en/services/webgl-interfaces/index.html');
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('</head>', '<link rel="canonical" href="https://attacker.invalid/" /></head>'), 'utf8');
}, 'expected exactly one canonical link, found 2');

await withDistMutation('invalid JSON-LD', async (mutantDist) => {
  const file = resolve(mutantDist, 'en/services/webgl-interfaces/index.html');
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace(/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/i, '$1{not-json$2'), 'utf8');
}, 'JSON-LD block 1 is not valid JSON');

await withDistMutation('static external runtime', async (mutantDist) => {
  const file = resolve(mutantDist, 'en/services/webgl-interfaces/index.html');
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('</body>', '<script src="/webgl-portfolio/assets/three-K6PujBfj.js"></script></body>'), 'utf8');
}, 'expected 1 bounded executable script(s), found 2');

await withDistMutation('static module preload', async (mutantDist) => {
  const file = resolve(mutantDist, 'en/services/webgl-interfaces/index.html');
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('</head>', '<link rel="modulepreload" href="/webgl-portfolio/assets/three-K6PujBfj.js" /></head>'), 'utf8');
}, 'unexpectedly preloads a JavaScript runtime');

await withDistMutation('non-versioned generatedAt', async (mutantDist) => {
  const file = resolve(mutantDist, 'routes-manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  manifest.generatedAt = '2099-12-31T23:59:59.999Z';
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}, 'generatedAt must be derived from versioned route dates');

await withDistMutation('CRLF artifact bytes', async (mutantDist) => {
  const file = resolve(mutantDist, '404.html');
  await writeFile(file, (await readFile(file, 'utf8')).replaceAll('\n', '\r\n'), 'utf8');
}, '404.html: text artifact contains non-LF line endings');

await withWorkflowMutation('mutable Action tag', (source) => source.replace(/actions\/checkout@[0-9a-f]{40}/, 'actions/checkout@v4'), 'Action reference is not pinned to a full commit SHA');
await withWorkflowMutation('mutable Bun version', (source) => source.replace('bun-version: 1.3.14', 'bun-version: latest'), 'Bun must be pinned to 1.3.14');
await withWorkflowMutation('synthetic PR checkout', (source) => source.replace("github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha", 'github.sha'), 'Pull-request checkout is not bound to the exact PR head SHA');
await withWorkflowMutation('build write permission', (source) => source.replace('      contents: read', '      contents: write'), 'Build job must grant exactly contents: read');
await withWorkflowMutation('broad deployment condition', (source) => source.replaceAll("github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')", "github.event_name != 'pull_request'"), 'Deploy job condition does not use the positive main-event allowlist');
await withWorkflowMutation('workflow permission inheritance', (source) => source.replace('permissions: {}', 'permissions:\n  contents: write'), 'Workflow-level permissions must fail closed');

console.log(`Adversarial validation passed: ${passed} checks.`);
