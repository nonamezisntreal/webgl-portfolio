import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(process.argv[2] ?? '');
const repositoryRoot = resolve(process.argv[3] ?? process.cwd());
const reportPath = resolve(process.env.EVIDENCE_MUTATION_REPORT ?? resolve(tmpdir(), 'webgl-remediation-03-evidence-mutations.json'));
const verifier = resolve(repositoryRoot, 'scripts/verify-remediation-03-evidence.mjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function run(args, cwd = repositoryRoot) {
  return spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8', windowsHide: true });
}

async function rewriteManifest(root, mutate = (value) => value) {
  const manifestPath = resolve(root, 'artifact-manifest.json');
  const manifest = mutate(JSON.parse(await readFile(manifestPath, 'utf8')));
  for (const entry of manifest.entries) {
    const path = resolve(root, ...entry.path.split('/'));
    try {
      const bytes = await readFile(path);
      entry.bytes = bytes.length;
      entry.sha256 = sha256(bytes);
    } catch { /* lexical path mutations are intentionally unresolved */ }
  }
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(manifestPath, bytes);
  await writeFile(resolve(root, 'artifact-manifest.sha256'), `${sha256(bytes)}\n`, 'utf8');
}

async function verifierResult(root) {
  const result = run([process.execPath, verifier, root, repositoryRoot]);
  return { exitCode: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

const results = [];
async function test(id, mutation, expectedDiagnostic, mutate) {
  const temp = await mkdtemp(resolve(tmpdir(), 'webgl-evidence-mutant-'));
  const mutant = resolve(temp, 'evidence');
  let result;
  let setupError;
  try {
    await cp(packageRoot, mutant, { recursive: true });
    await mutate(mutant);
    result = await verifierResult(mutant);
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  const diagnostic = setupError ?? result.output;
  const pass = !setupError && result.exitCode !== 0 && diagnostic.toLocaleLowerCase('en-US').includes(expectedDiagnostic.toLocaleLowerCase('en-US'));
  results.push({ id, mutation, expectedDiagnostic, exitCode: result?.exitCode ?? null, diagnostic, status: pass ? 'PASS' : 'FAIL' });
  console.log(`${id} ${pass ? 'PASS' : 'FAIL'}`);
}

const baseline = await verifierResult(packageRoot);
assert(baseline.exitCode === 0, `Evidence baseline does not verify:\n${baseline.output}`);
results.push({ id: 'EV-R03-BASELINE', mutation: 'none', expectedDiagnostic: 'PASS', exitCode: 0, diagnostic: baseline.output, status: 'PASS' });

await test('EV-R03-CORRUPT-BYTE', 'append one byte to a declared payload without changing the manifest', 'byte length mismatch', async (root) => {
  const path = resolve(root, 'metadata.json');
  await writeFile(path, `${await readFile(path, 'utf8')} `, 'utf8');
});

await test('EV-R03-BACKSLASH-PATH', 'replace one manifest path with a backslash spelling and update manifest hash', 'forbidden backslash', async (root) => {
  await rewriteManifest(root, (manifest) => {
    manifest.entries[0].path = manifest.entries[0].path.replace('/', '\\') || 'dir\\file.txt';
    if (!manifest.entries[0].path.includes('\\')) manifest.entries[0].path = `dir\\${manifest.entries[0].path}`;
    return manifest;
  });
});

await test('EV-R03-WRONG-COMMIT', 'change declared commit in both metadata and manifest and rehash package metadata', 'subject.bundle does not advertise', async (root) => {
  const metadataPath = resolve(root, 'metadata.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  metadata.commit = '0000000000000000000000000000000000000000';
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  await rewriteManifest(root, (manifest) => {
    manifest.binding.commit = metadata.commit;
    return manifest;
  });
});

await test('EV-R03-VALID-OTHER-BUNDLE', 'replace subject.bundle with a valid bundle from an unrelated repository and rehash it', 'does not advertise the declared branch', async (root) => {
  const other = await mkdtemp(resolve(tmpdir(), 'webgl-other-repo-'));
  try {
    run(['git', 'init', '-b', 'main', other]);
    await writeFile(resolve(other, 'README.md'), 'unrelated evidence bundle\n', 'utf8');
    run(['git', '-C', other, 'add', 'README.md']);
    const commit = run(['git', '-C', other, '-c', 'user.name=Evidence Mutation', '-c', 'user.email=evidence@example.invalid', 'commit', '-m', 'unrelated']);
    assert(commit.status === 0, `Unable to create unrelated commit: ${commit.stderr}`);
    const bundle = run(['git', '-C', other, 'bundle', 'create', resolve(root, 'subject.bundle'), 'main']);
    assert(bundle.status === 0, `Unable to create unrelated bundle: ${bundle.stderr}`);
    await rewriteManifest(root);
  } finally {
    await rm(other, { recursive: true, force: true });
  }
});

await test('EV-R03-DUPLICATE-JSON-KEY', 'insert a duplicate campaignId key into artifact-manifest.json and update its detached hash', 'duplicate JSON key', async (root) => {
  const path = resolve(root, 'artifact-manifest.json');
  const source = await readFile(path, 'utf8');
  const mutated = source.replace('"campaignId":', '"campaignId":"contradictory",\n  "campaignId":');
  await writeFile(path, mutated, 'utf8');
  await writeFile(resolve(root, 'artifact-manifest.sha256'), `${sha256(Buffer.from(mutated))}\n`, 'utf8');
});

await test('EV-R03-UNDECLARED-FILE', 'add an undeclared payload file', 'entry count mismatch', async (root) => {
  await mkdir(resolve(root, 'unexpected'), { recursive: true });
  await writeFile(resolve(root, 'unexpected/file.txt'), 'unexpected\n', 'utf8');
});

await test('EV-R03-MISSING-FILE', 'remove a declared payload file', 'entry count mismatch', async (root) => {
  const manifest = JSON.parse(await readFile(resolve(root, 'artifact-manifest.json'), 'utf8'));
  const victim = manifest.entries.find((entry) => entry.path !== 'subject.bundle');
  assert(victim, 'No removable manifest entry.');
  await rm(resolve(root, ...victim.path.split('/')), { force: true });
});

const report = {
  schemaVersion: 1,
  subject: 'WEBGL-PORTFOLIO-REMEDIATION-03-EVIDENCE-MUTATIONS',
  total: results.length,
  passed: results.filter((result) => result.status === 'PASS').length,
  failed: results.filter((result) => result.status === 'FAIL').length,
  results,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (report.failed) throw new Error(`Evidence mutation tests failed: ${report.failed}/${report.total}. Report: ${reportPath}`);
console.log(`Evidence mutation tests passed: ${report.passed}/${report.total}. Report: ${reportPath}`);
