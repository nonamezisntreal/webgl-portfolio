import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const repositoryRoot = process.cwd();
const evidenceRoot = resolve(process.env.EVIDENCE_DIR ?? '');
const browserArtifacts = process.env.BROWSER_ARTIFACT_DIR ? resolve(process.env.BROWSER_ARTIFACT_DIR) : undefined;
const buildArtifacts = process.env.BUILD_EVIDENCE_DIR ? resolve(process.env.BUILD_EVIDENCE_DIR) : undefined;
const campaignId = 'WEBGL-PORTFOLIO-REMEDIATION-03-AND-RELEASE-CANDIDATE';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? repositoryRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && /\.cmd$/iu.test(executable),
  });
  return { command: [executable, ...args].join(' '), exitCode: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function must(result, label) {
  if (result.exitCode !== 0) throw new Error(`${label} failed:\n${result.stdout}${result.stderr}`);
  return result.stdout.trim();
}

async function filesUnder(root) {
  const output = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  await walk(root);
  return output.sort((a, b) => a.localeCompare(b, 'en'));
}

async function copyIfPresent(source, destination) {
  if (!source) return;
  try {
    await stat(source);
    await cp(source, destination, { recursive: true });
  } catch (error) {
    throw new Error(`Required evidence input is unavailable: ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeJson(path, value) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeManifest(binding) {
  const controls = new Set(['artifact-manifest.json', 'artifact-manifest.sha256']);
  const files = (await filesUnder(evidenceRoot)).filter((file) => !controls.has(relative(evidenceRoot, file).split(sep).join('/')));
  const entries = [];
  const authorities = new Set();
  for (const file of files) {
    const path = relative(evidenceRoot, file).split(sep).join('/');
    assert(!path.includes('\\') && path === path.normalize('NFC'), `Non-canonical evidence path: ${path}`);
    const authority = path.toLocaleLowerCase('en-US');
    assert(!authorities.has(authority), `Evidence path collision: ${path}`);
    authorities.add(authority);
    const bytes = await readFile(file);
    entries.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const manifestBytes = Buffer.from(`${JSON.stringify({ schemaVersion: 1, campaignId, binding, entries }, null, 2)}\n`, 'utf8');
  await writeFile(resolve(evidenceRoot, 'artifact-manifest.json'), manifestBytes);
  await writeFile(resolve(evidenceRoot, 'artifact-manifest.sha256'), `${sha256(manifestBytes)}\n`, 'utf8');
}

assert(process.env.EVIDENCE_DIR, 'EVIDENCE_DIR is required.');
try {
  await stat(evidenceRoot);
  throw new Error(`Evidence directory already exists: ${evidenceRoot}`);
} catch (error) {
  if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
}
await mkdir(evidenceRoot, { recursive: false });

const git = (...args) => must(run('git', args), `git ${args.join(' ')}`);
const branch = git('branch', '--show-current');
const commit = git('rev-parse', 'HEAD');
const parent = git('show', '-s', '--format=%P', 'HEAD').split(/\s+/u)[0];
const tree = git('rev-parse', 'HEAD^{tree}');
const status = git('status', '--porcelain=v1', '--untracked-files=no');
assert(status === '', 'Tracked repository state must be clean before evidence generation.');
const binding = { repository: 'nonamezisntreal/webgl-portfolio', branch, commit, parent, tree };

await writeJson(resolve(evidenceRoot, 'metadata.json'), {
  schemaVersion: 1,
  campaignId,
  ...binding,
  sourceCandidate: 'f4093c5443bfb5e21f2be225f54e23c422dcf415',
  status: 'READY_FOR_INDEPENDENT_REVIEW',
});

const changed = git('diff', '--name-status', 'f4093c5443bfb5e21f2be225f54e23c422dcf415..HEAD').split(/\r?\n/u).filter(Boolean).map((line) => {
  const [change, ...parts] = line.split('\t');
  const path = parts.at(-1);
  const classification = path.startsWith('scripts/') ? 'validator-test-or-evidence-tool'
    : path.startsWith('src/webgl/') ? 'webgl-runtime'
      : path.startsWith('src/') || path === 'index.html' ? 'product-ui-runtime'
        : path.startsWith('docs/') ? 'review-documentation'
          : path === 'package.json' || path === 'bun.lock' ? 'dependency-control'
            : path.startsWith('.github/') ? 'workflow'
              : 'repository-control';
  return { change, path, classification };
});
await writeJson(resolve(evidenceRoot, 'changed-paths.json'), { schemaVersion: 1, base: 'f4093c5443bfb5e21f2be225f54e23c422dcf415', head: commit, paths: changed });

const bundle = run('git', ['bundle', 'create', resolve(evidenceRoot, 'subject.bundle'), branch]);
must(bundle, 'subject bundle creation');

await mkdir(resolve(evidenceRoot, 'documents'), { recursive: true });
for (const document of [
  'docs/plans/2026-08-04-portfolio-static-seo-remediation-03-finding-ledger.md',
  'docs/plans/2026-08-04-portfolio-static-seo-remediation-03-dependency-decision.md',
  'docs/plans/2026-08-04-portfolio-static-seo-remediation-03-self-review.md',
  'docs/plans/2026-08-04-portfolio-static-seo-remediation-03-independent-review-request.md',
]) await cp(resolve(repositoryRoot, document), resolve(evidenceRoot, 'documents', document.split('/').at(-1)));
await cp(resolve(repositoryRoot, 'scripts/verify-remediation-03-evidence.mjs'), resolve(evidenceRoot, 'verify-remediation-03-evidence.mjs'));
await cp(resolve(repositoryRoot, 'scripts/test-remediation-03-evidence.mjs'), resolve(evidenceRoot, 'test-remediation-03-evidence.mjs'));

const testDir = resolve(evidenceRoot, 'tests');
await mkdir(testDir, { recursive: true });
const commands = [
  { id: 'FROZEN-INSTALL', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['install', '--frozen-lockfile'] },
  { id: 'BUILD', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'build'] },
  { id: 'ADVERSARIAL', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'test:adversarial'], env: { ADVERSARIAL_REPORT: resolve(testDir, 'adversarial-results.json') } },
  { id: 'REVIEW03', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'test:review03'], env: { REVIEW03_REPORT: resolve(testDir, 'review03-regressions.json') } },
  { id: 'WORKFLOW', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'validate:workflow'] },
  { id: 'CONTENT', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'validate:content'] },
  { id: 'DIST-CLAIMS', executable: process.platform === 'win32' ? 'bun.cmd' : 'bun', args: ['run', 'validate:dist'] },
];
const testMatrix = [];
for (const command of commands) {
  const result = run(command.executable, command.args, { env: command.env });
  testMatrix.push({ id: command.id, command: result.command, exitCode: result.exitCode, status: result.exitCode === 0 ? 'PASS' : 'FAIL', stdout: result.stdout, stderr: result.stderr });
  if (result.exitCode !== 0) throw new Error(`${command.id} failed during evidence generation.`);
}
await writeJson(resolve(testDir, 'test-matrix.json'), { schemaVersion: 1, commit, total: testMatrix.length, passed: testMatrix.length, failed: 0, tests: testMatrix });

const audit = run(process.platform === 'win32' ? 'bun.cmd' : 'bun', ['audit', '--json']);
assert(audit.exitCode === 0, `Dependency audit failed: ${audit.stdout}${audit.stderr}`);
await writeFile(resolve(evidenceRoot, 'dependency-audit.json'), audit.stdout.trim() || '{}', 'utf8');

const trackedFiles = git('ls-files').split(/\r?\n/u).filter(Boolean);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bgh[oprsu]_[A-Za-z0-9_]{30,}\b/u,
  /\bsk-[A-Za-z0-9_-]{20,}\b/u,
  /\b(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/iu,
];
const secretHits = [];
for (const path of trackedFiles) {
  let source;
  try { source = await readFile(resolve(repositoryRoot, path), 'utf8'); } catch { continue; }
  for (const pattern of secretPatterns) if (pattern.test(source)) secretHits.push({ path, pattern: pattern.source });
}
assert(secretHits.length === 0, `Secret scan found ${secretHits.length} potential secrets.`);
await writeJson(resolve(evidenceRoot, 'secret-scan.json'), { schemaVersion: 1, trackedFiles: trackedFiles.length, hits: secretHits, status: 'PASS' });

await copyIfPresent(browserArtifacts, resolve(evidenceRoot, 'browser'));
await copyIfPresent(buildArtifacts, resolve(evidenceRoot, 'builds'));

await writeManifest(binding);
const baselineVerifier = run(process.execPath, [resolve(repositoryRoot, 'scripts/verify-remediation-03-evidence.mjs'), evidenceRoot, repositoryRoot]);
assert(baselineVerifier.exitCode === 0, `Generated evidence does not verify: ${baselineVerifier.stdout}${baselineVerifier.stderr}`);
await writeFile(resolve(evidenceRoot, 'verification-result.json'), baselineVerifier.stdout, 'utf8');
await writeManifest(binding);

const mutationReport = resolve(evidenceRoot, 'evidence-mutation-tests.json');
const mutationResult = run(process.execPath, [resolve(repositoryRoot, 'scripts/test-remediation-03-evidence.mjs'), evidenceRoot, repositoryRoot], { env: { EVIDENCE_MUTATION_REPORT: mutationReport } });
assert(mutationResult.exitCode === 0, `Evidence mutation tests failed: ${mutationResult.stdout}${mutationResult.stderr}`);
await writeManifest(binding);

const finalVerifier = run(process.execPath, [resolve(repositoryRoot, 'scripts/verify-remediation-03-evidence.mjs'), evidenceRoot, repositoryRoot]);
assert(finalVerifier.exitCode === 0, `Final evidence verification failed: ${finalVerifier.stdout}${finalVerifier.stderr}`);
await writeFile(resolve(evidenceRoot, 'verification-result.json'), finalVerifier.stdout, 'utf8');
await writeManifest(binding);
const finalFinalVerifier = run(process.execPath, [resolve(repositoryRoot, 'scripts/verify-remediation-03-evidence.mjs'), evidenceRoot, repositoryRoot]);
assert(finalFinalVerifier.exitCode === 0, `Final sealed evidence verification failed: ${finalFinalVerifier.stdout}${finalFinalVerifier.stderr}`);

console.log(JSON.stringify({ schemaVersion: 1, evidenceRoot, binding, status: 'PASS' }, null, 2));
