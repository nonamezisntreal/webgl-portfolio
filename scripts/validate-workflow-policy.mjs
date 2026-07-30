import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const workflowRoot = resolve(projectRoot, process.env.WORKFLOW_ROOT ?? '.github/workflows');
const deployPath = resolve(workflowRoot, 'deploy.yml');
const deployCondition = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
const exactCheckoutRef = "${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(source, value) {
  return source.split(value).length - 1;
}

function extractJob(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert(start >= 0, `Workflow job ${name} is missing.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function extractStep(job, name) {
  const lines = job.split('\n');
  const marker = `      - name: ${name}`;
  const start = lines.findIndex((line) => line === marker);
  assert(start >= 0, `Workflow step ${name} is missing.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('      - name: ')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function jobPermissions(job, name) {
  const lines = job.split('\n');
  const start = lines.findIndex((line) => line === '    permissions:');
  assert(start >= 0, `${name} job permissions are missing.`);
  const entries = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^      ([A-Za-z0-9_-]+): (read|write|none)$/);
    if (!match) break;
    entries.push([match[1], match[2]]);
  }
  return entries;
}

async function listWorkflowFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listWorkflowFiles(path));
    else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) files.push(path);
  }
  return files;
}

const workflowFiles = await listWorkflowFiles(workflowRoot);
assert(workflowFiles.length === 1 && workflowFiles[0] === deployPath, 'deploy.yml must remain the only active workflow authority.');
const source = await readFile(deployPath, 'utf8');

assert(!/^\s*pull_request_target:/m.test(source), 'pull_request_target is forbidden for this repository.');
assert(/^  pull_request:\s*$/m.test(source), 'Pull-request validation trigger is missing.');
assert(/^  push:\s*$/m.test(source) && /^    branches: \[main\]\s*$/m.test(source), 'Push deployment must be restricted to main.');
assert(/^  workflow_dispatch:\s*$/m.test(source), 'Manual workflow dispatch trigger is missing.');
assert(/^permissions: \{\}\s*$/m.test(source), 'Workflow-level permissions must fail closed with permissions: {}.');
assert(!/continue-on-error:\s*true/i.test(source), 'Validation or deployment steps may not continue on error.');

const usesLines = source.split(/\r?\n/).filter((line) => /^\s+uses:\s*/.test(line));
assert(usesLines.length === 6, `Expected exactly 6 GitHub Action references, found ${usesLines.length}.`);
for (const line of usesLines) {
  assert(/^\s+uses:\s+[^\s@]+@[0-9a-f]{40}(?:\s+#.*)?$/.test(line), `Action reference is not pinned to a full commit SHA: ${line.trim()}`);
}

const build = extractJob(source, 'build');
const deploy = extractJob(source, 'deploy');
assert(/^    runs-on: ubuntu-24\.04\s*$/m.test(build), 'Build runner must be pinned to ubuntu-24.04.');
assert(/^    timeout-minutes: 10\s*$/m.test(build), 'Build timeout must remain explicit.');
assert(JSON.stringify(jobPermissions(build, 'Build')) === JSON.stringify([['contents', 'read']]), 'Build job must grant exactly contents: read.');
assert(/^    runs-on: ubuntu-24\.04\s*$/m.test(deploy), 'Deploy runner must be pinned to ubuntu-24.04.');
assert(/^    timeout-minutes: 15\s*$/m.test(deploy), 'Deploy timeout must remain explicit.');
assert(JSON.stringify(jobPermissions(deploy, 'Deploy')) === JSON.stringify([['pages', 'write'], ['id-token', 'write']]), 'Deploy job permissions must be exactly Pages and OIDC write.');
assert(deploy.includes(`    if: ${deployCondition}`), 'Deploy job condition does not use the positive main-event allowlist.');

const checkout = extractStep(build, 'Checkout exact subject');
assert(/uses: actions\/checkout@[0-9a-f]{40}/.test(checkout), 'Checkout action is missing or unpinned.');
assert(checkout.includes(`          ref: ${exactCheckoutRef}`), 'Pull-request checkout is not bound to the exact PR head SHA.');
assert(checkout.includes('          persist-credentials: false'), 'Checkout credentials must not persist.');

const setupBun = extractStep(build, 'Set up Bun');
assert(/uses: oven-sh\/setup-bun@[0-9a-f]{40}/.test(setupBun), 'Bun setup action is missing or unpinned.');
assert(setupBun.includes('          bun-version: 1.3.14'), 'Bun must be pinned to 1.3.14.');

const install = extractStep(build, 'Install dependencies');
assert(install.includes('        run: bun install --frozen-lockfile'), 'Dependency installation must use the frozen Bun lockfile.');
const buildStep = extractStep(build, 'Build and validate');
assert(buildStep.includes('        run: bun run build'), 'Workflow must execute the complete build validation pipeline.');
assert(buildStep.includes('          SITE_ORIGIN: https://nonamezisntreal.github.io'), 'Canonical site origin is missing from the build environment.');
assert(buildStep.includes('          BASE_PATH: /${{ github.event.repository.name }}/'), 'Repository project base path is missing from the build environment.');

const reviewArtifact = extractStep(build, 'Upload review artifact');
assert(reviewArtifact.includes("        if: github.event_name == 'pull_request'"), 'Review artifact upload must be restricted to pull requests.');
assert(reviewArtifact.includes('          name: portfolio-dist-${{ github.event.pull_request.head.sha }}'), 'Review artifact name is not bound to the exact PR head SHA.');

for (const name of ['Configure GitHub Pages', 'Upload GitHub Pages artifact']) {
  const step = extractStep(build, name);
  assert(step.includes(`        if: ${deployCondition}`), `${name} condition does not use the positive main-event allowlist.`);
}
assert(count(source, deployCondition) === 3, 'Exactly three Pages deployment guards are required.');

console.log(`Validated workflow policy across ${workflowFiles.length} workflow: pinned Actions, Bun 1.3.14, exact PR-head checkout, least privilege and positive deployment guards.`);
