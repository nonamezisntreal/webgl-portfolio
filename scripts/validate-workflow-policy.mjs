import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const workflowRoot = resolve(projectRoot, process.env.WORKFLOW_ROOT ?? '.github/workflows');
const deployPath = resolve(workflowRoot, 'deploy.yml');
const deployCondition = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
const exactCheckoutRef = "${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}";
const exactActions = new Map([
  ['actions/checkout', '11d5960a326750d5838078e36cf38b85af677262'],
  ['oven-sh/setup-bun', '0c5077e51419868618aeaa5fe8019c62421857d6'],
  ['actions/upload-artifact', 'ea165f8d65b6e75b540449e92b4886f43607fa02'],
  ['actions/configure-pages', '983d7736d9b0ae728b81ab479565c72886d7745b'],
  ['actions/upload-pages-artifact', '7b1f4a764d45c48632c6b24a0339c27f5614fb0b'],
  ['actions/deploy-pages', 'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keysExactly(value, expected, label) {
  assert(isObject(value), `${label} must be a mapping.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys must be exactly ${wanted.join(', ')}; found ${actual.join(', ') || '<none>'}.`);
}

function normalizeScalar(value) {
  assert(typeof value === 'string', 'Expected a scalar string.');
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeExpression(value) {
  return normalizeScalar(value).replace(/\s+/g, '');
}

function assertExpression(value, expected, label) {
  assert(typeof value === 'string' && normalizeExpression(value) === normalizeExpression(expected), `${label} does not use the exact positive allowlist.`);
}

function assertEmptyMappingOrNull(value, label) {
  assert(value === null || (isObject(value) && Object.keys(value).length === 0), `${label} must not define additional options.`);
}

function assertPermissions(value, expected, label) {
  keysExactly(value, Object.keys(expected), `${label} permissions`);
  for (const [name, permission] of Object.entries(expected)) {
    assert(value[name] === permission, `${label} permission ${name} must be ${permission}.`);
  }
}

function parseAction(value, label) {
  assert(typeof value === 'string', `${label} must use a repository Action.`);
  const match = value.match(/^([^\s@]+)@([0-9a-f]{40})$/);
  assert(match, `${label} is not pinned to a full 40-character commit SHA.`);
  const [, repository, sha] = match;
  assert(exactActions.get(repository) === sha, `${label} must remain pinned to the approved ${repository} commit.`);
  return repository;
}

function assertStepKeys(step, expected, label) {
  keysExactly(step, expected, label);
  assert(step['continue-on-error'] !== true, `${label} may not continue on error.`);
}

function assertNoDangerousRun(run, label) {
  const normalized = normalizeScalar(run).toLowerCase();
  const forbidden = [
    /\bgit\s+(?:push|commit|tag|branch|checkout|reset|clean|remote)\b/,
    /\bgh\s+(?:api|release|repo|workflow|pages)\b/,
    /\bcurl\b[^\n]*(?:api\.github\.com|uploads\.github\.com)/,
    /\b(?:npm|bun|pnpm|yarn)\s+publish\b/,
    /\bdeploy\b/,
    /\brm\s+-rf\b/,
  ];
  for (const pattern of forbidden) {
    assert(!pattern.test(normalized), `${label} contains a repository mutation or deployment command.`);
  }
}

function assertRunStep(step, expectedRun, label, expectedEnv = null) {
  const keys = expectedEnv ? ['name', 'run', 'env'] : ['name', 'run'];
  assertStepKeys(step, keys, label);
  assert(typeof step.run === 'string', `${label} run command is missing.`);
  assertNoDangerousRun(step.run, label);
  assert(normalizeScalar(step.run) === normalizeScalar(expectedRun), `${label} command must be exactly ${expectedRun}.`);
  if (expectedEnv) {
    keysExactly(step.env, Object.keys(expectedEnv), `${label} environment`);
    for (const [name, value] of Object.entries(expectedEnv)) {
      assert(step.env[name] === value, `${label} environment ${name} is incorrect.`);
    }
  }
}

function assertActionStep(step, expectedName, expectedRepository, label, options = {}) {
  const expectedKeys = ['name', 'uses'];
  if (options.if !== undefined) expectedKeys.push('if');
  if (options.id !== undefined) expectedKeys.push('id');
  if (options.with !== undefined) expectedKeys.push('with');
  assertStepKeys(step, expectedKeys, label);
  assert(step.name === expectedName, `${label} name changed.`);
  assert(parseAction(step.uses, label) === expectedRepository, `${label} must use ${expectedRepository}.`);
  if (options.if !== undefined) assertExpression(step.if, options.if, `${label} condition`);
  if (options.id !== undefined) assert(step.id === options.id, `${label} id must be ${options.id}.`);
  if (options.with !== undefined) {
    keysExactly(step.with, Object.keys(options.with), `${label} inputs`);
    for (const [name, value] of Object.entries(options.with)) {
      assert(step.with[name] === value, `${label} input ${name} is incorrect.`);
    }
  }
}

function walk(value, visit, path = '$') {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
  else if (isObject(value)) Object.entries(value).forEach(([key, child]) => walk(child, visit, `${path}.${key}`));
}

async function listWorkflowFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listWorkflowFiles(path));
    else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) files.push(path);
  }
  return files.sort();
}

const workflowFiles = await listWorkflowFiles(workflowRoot);
assert(workflowFiles.length === 1 && workflowFiles[0] === deployPath, 'deploy.yml must remain the only active workflow authority.');
const source = await readFile(deployPath, 'utf8');
const document = parseDocument(source, {
  prettyErrors: true,
  strict: true,
  uniqueKeys: true,
  merge: true,
  maxAliasCount: 50,
});
const parseProblems = [...document.errors, ...document.warnings];
assert(parseProblems.length === 0, `Workflow YAML is invalid or uses unsupported syntax: ${parseProblems.map((item) => item.message).join('; ')}`);
let workflow;
try {
  workflow = document.toJS({ maxAliasCount: 50 });
} catch (error) {
  throw new Error(`Workflow YAML aliases could not be resolved safely: ${error instanceof Error ? error.message : String(error)}`);
}

keysExactly(workflow, ['name', 'on', 'concurrency', 'permissions', 'jobs'], 'Workflow root');
assert(workflow.name === 'Build and deploy portfolio', 'Workflow name changed unexpectedly.');
assert(isObject(workflow.on) && !Object.hasOwn(workflow.on, 'pull_request_target'), 'pull_request_target is forbidden for this repository.');
keysExactly(workflow.on, ['pull_request', 'push', 'workflow_dispatch'], 'Workflow triggers');
assertEmptyMappingOrNull(workflow.on.pull_request, 'pull_request trigger');
assertEmptyMappingOrNull(workflow.on.workflow_dispatch, 'workflow_dispatch trigger');
keysExactly(workflow.on.push, ['branches'], 'push trigger');
assert(Array.isArray(workflow.on.push.branches) && workflow.on.push.branches.length === 1 && workflow.on.push.branches[0] === 'main', 'Push deployment must be restricted exactly to main.');

keysExactly(workflow.concurrency, ['group', 'cancel-in-progress'], 'Workflow concurrency');
assert(workflow.concurrency.group === 'portfolio-pages-${{ github.event_name }}-${{ github.ref }}', 'Workflow concurrency group changed unexpectedly.');
assert(workflow.concurrency['cancel-in-progress'] === "${{ github.event_name == 'pull_request' }}", 'Only pull-request workflow runs may be cancelled in progress.');
assert(isObject(workflow.permissions) && Object.keys(workflow.permissions).length === 0, 'Workflow-level permissions must fail closed with permissions: {}.');

walk(workflow, (value, path) => {
  if (isObject(value) && value['continue-on-error'] === true) throw new Error(`${path} may not continue on error.`);
});

keysExactly(workflow.jobs, ['build', 'deploy'], 'Workflow jobs');
const build = workflow.jobs.build;
const deploy = workflow.jobs.deploy;
keysExactly(build, ['runs-on', 'timeout-minutes', 'permissions', 'steps'], 'Build job');
assert(build['runs-on'] === 'ubuntu-24.04', 'Build runner must be pinned to ubuntu-24.04.');
assert(build['timeout-minutes'] === 10, 'Build timeout must remain 10 minutes.');
assertPermissions(build.permissions, { contents: 'read' }, 'Build job');
assert(Array.isArray(build.steps) && build.steps.length === 8, `Build job must contain exactly 8 approved steps; found ${build.steps?.length ?? '<invalid>'}.`);

assertActionStep(build.steps[0], 'Checkout exact subject', 'actions/checkout', 'Checkout exact subject', {
  with: {
    ref: exactCheckoutRef,
    'persist-credentials': false,
  },
});
assertActionStep(build.steps[1], 'Set up Bun', 'oven-sh/setup-bun', 'Set up Bun', {
  with: { 'bun-version': '1.3.14' },
});
assertRunStep(build.steps[2], 'bun install --frozen-lockfile', 'Install dependencies');
assert(build.steps[2].name === 'Install dependencies', 'Install dependency step name changed.');
assertRunStep(build.steps[3], 'bun run build', 'Build and validate', {
  SITE_ORIGIN: 'https://nonamezisntreal.github.io',
  BASE_PATH: '/${{ github.event.repository.name }}/',
});
assert(build.steps[3].name === 'Build and validate', 'Build validation step name changed.');
assertRunStep(build.steps[4], 'bun run test:browser', 'Browser regression');
assert(build.steps[4].name === 'Browser regression', 'Browser regression step name changed.');
assertActionStep(build.steps[5], 'Upload review artifact', 'actions/upload-artifact', 'Upload review artifact', {
  if: "github.event_name == 'pull_request'",
  with: {
    name: 'portfolio-dist-${{ github.event.pull_request.head.sha }}',
    path: 'dist',
    'if-no-files-found': 'error',
    'retention-days': 7,
  },
});
assertActionStep(build.steps[6], 'Configure GitHub Pages', 'actions/configure-pages', 'Configure GitHub Pages', { if: deployCondition });
assertActionStep(build.steps[7], 'Upload GitHub Pages artifact', 'actions/upload-pages-artifact', 'Upload GitHub Pages artifact', {
  if: deployCondition,
  with: { path: 'dist' },
});

keysExactly(deploy, ['if', 'needs', 'runs-on', 'timeout-minutes', 'permissions', 'environment', 'steps'], 'Deploy job');
assertExpression(deploy.if, deployCondition, 'Deploy job condition');
assert(deploy.needs === 'build', 'Deploy job must depend exactly on build.');
assert(deploy['runs-on'] === 'ubuntu-24.04', 'Deploy runner must be pinned to ubuntu-24.04.');
assert(deploy['timeout-minutes'] === 15, 'Deploy timeout must remain 15 minutes.');
assertPermissions(deploy.permissions, { pages: 'write', 'id-token': 'write' }, 'Deploy job');
keysExactly(deploy.environment, ['name', 'url'], 'Deploy environment');
assert(deploy.environment.name === 'github-pages', 'Deploy environment must remain github-pages.');
assert(deploy.environment.url === '${{ steps.deployment.outputs.page_url }}', 'Deploy environment URL must come from the deployment output.');
assert(Array.isArray(deploy.steps) && deploy.steps.length === 1, 'Deploy job must contain exactly one approved deployment step.');
assertActionStep(deploy.steps[0], 'Deploy to GitHub Pages', 'actions/deploy-pages', 'Deploy to GitHub Pages', { id: 'deployment' });

const actionReferences = [];
walk(workflow.jobs, (value, path) => {
  if (isObject(value) && Object.hasOwn(value, 'uses')) actionReferences.push([value.uses, path]);
  if (isObject(value) && Object.hasOwn(value, 'run')) assertNoDangerousRun(value.run, path);
});
assert(actionReferences.length === 6, `Expected exactly 6 approved Action references, found ${actionReferences.length}.`);
for (const [reference, path] of actionReferences) parseAction(reference, path);

console.log(`Validated structural workflow policy across ${workflowFiles.length} workflow and ${Object.keys(workflow.jobs).length} exact jobs: immutable Actions, Bun 1.3.14, exact PR-head checkout, frozen install, least privilege and positive Pages guards.`);
