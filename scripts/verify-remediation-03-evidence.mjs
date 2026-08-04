import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertExactKeys, parseJsonStrict } from './validation-utils.mjs';

const evidenceRoot = resolve(process.argv[2] ?? '');
const repositoryRoot = resolve(process.argv[3] ?? process.cwd());
const manifestPath = resolve(evidenceRoot, 'artifact-manifest.json');
const manifestHashPath = resolve(evidenceRoot, 'artifact-manifest.sha256');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function git(args, cwd = repositoryRoot) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function filesUnder(root) {
  const output = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) output.push(path);
      else throw new Error(`Evidence contains unsupported filesystem entry: ${path}`);
    }
  }
  await walk(root);
  return output.sort((a, b) => a.localeCompare(b, 'en'));
}

function canonicalPath(path, label) {
  assert(typeof path === 'string' && path.length > 0, `${label} path is empty.`);
  assert(!path.includes('\\'), `${label} path contains a forbidden backslash.`);
  assert(path === path.normalize('NFC'), `${label} path is not NFC-normalized.`);
  assert(!path.startsWith('/') && !/^[a-z]:/iu.test(path), `${label} path is absolute.`);
  const segments = path.split('/');
  assert(segments.every((segment) => segment && segment !== '.' && segment !== '..'), `${label} path contains traversal or empty segments.`);
  return path;
}

try {
  const rootInfo = await stat(evidenceRoot);
  assert(rootInfo.isDirectory(), 'Evidence root is not a directory.');
  const manifestBytes = await readFile(manifestPath);
  const declaredManifestHash = (await readFile(manifestHashPath, 'utf8')).trim();
  assert(/^[0-9a-f]{64}$/u.test(declaredManifestHash), 'artifact-manifest.sha256 is malformed.');
  assert(sha256(manifestBytes) === declaredManifestHash, 'artifact manifest hash mismatch.');

  const manifest = parseJsonStrict(manifestBytes.toString('utf8'), 'artifact-manifest.json');
  assertExactKeys(manifest, ['schemaVersion', 'campaignId', 'binding', 'entries'], 'artifact manifest');
  assert(manifest.schemaVersion === 1, 'Unsupported artifact manifest schema.');
  assert(manifest.campaignId === 'WEBGL-PORTFOLIO-REMEDIATION-03-AND-RELEASE-CANDIDATE', 'Evidence campaign ID mismatch.');
  assertExactKeys(manifest.binding, ['repository', 'branch', 'commit', 'parent', 'tree'], 'artifact manifest binding');
  assert(manifest.binding.repository === 'nonamezisntreal/webgl-portfolio', 'Evidence repository identity mismatch.');
  for (const key of ['commit', 'parent', 'tree']) assert(/^[0-9a-f]{40}$/u.test(manifest.binding[key]), `Evidence ${key} is malformed.`);
  assert(Array.isArray(manifest.entries) && manifest.entries.length > 0, 'Evidence manifest has no entries.');

  const paths = new Set();
  const authorities = new Map();
  for (const [index, entry] of manifest.entries.entries()) {
    assertExactKeys(entry, ['path', 'bytes', 'sha256'], `artifact manifest entry ${index + 1}`);
    const path = canonicalPath(entry.path, `artifact manifest entry ${index + 1}`);
    assert(path !== 'artifact-manifest.json' && path !== 'artifact-manifest.sha256', 'Manifest control files must not be self-declared.');
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, `${path}: invalid byte length.`);
    assert(/^[0-9a-f]{64}$/u.test(entry.sha256), `${path}: invalid SHA-256.`);
    assert(!paths.has(path), `Duplicate manifest path: ${path}`);
    paths.add(path);
    const authority = path.toLocaleLowerCase('en-US');
    assert(!authorities.has(authority), `Case-insensitive manifest collision: ${authorities.get(authority)} and ${path}`);
    authorities.set(authority, path);
  }

  const actualFiles = await filesUnder(evidenceRoot);
  const actualPaths = actualFiles.map((file) => relative(evidenceRoot, file).split(sep).join('/'));
  const allowedControlFiles = new Set(['artifact-manifest.json', 'artifact-manifest.sha256']);
  const actualPayloadPaths = actualPaths.filter((path) => !allowedControlFiles.has(path));
  assert(actualPayloadPaths.length === paths.size, `Evidence entry count mismatch: ${actualPayloadPaths.length} files, ${paths.size} declared.`);
  for (const path of actualPayloadPaths) {
    canonicalPath(path, 'actual evidence');
    assert(paths.has(path), `Undeclared evidence file: ${path}`);
  }
  for (const entry of manifest.entries) {
    const bytes = await readFile(resolve(evidenceRoot, ...entry.path.split('/')));
    assert(bytes.length === entry.bytes, `${entry.path}: byte length mismatch.`);
    assert(sha256(bytes) === entry.sha256, `${entry.path}: SHA-256 mismatch.`);
  }

  const metadata = parseJsonStrict(await readFile(resolve(evidenceRoot, 'metadata.json'), 'utf8'), 'metadata.json');
  assertExactKeys(metadata, ['schemaVersion', 'campaignId', 'repository', 'branch', 'commit', 'parent', 'tree', 'sourceCandidate', 'status'], 'metadata');
  assert(metadata.schemaVersion === 1 && metadata.campaignId === manifest.campaignId, 'Evidence metadata schema/campaign mismatch.');
  for (const key of ['repository', 'branch', 'commit', 'parent', 'tree']) assert(metadata[key] === manifest.binding[key], `Evidence metadata ${key} mismatch.`);
  assert(metadata.status === 'READY_FOR_INDEPENDENT_REVIEW', 'Evidence status is not review-gated.');

  const bundle = resolve(evidenceRoot, 'subject.bundle');
  git(['bundle', 'verify', bundle]);
  const heads = git(['bundle', 'list-heads', bundle]);
  assert(heads.split(/\r?\n/u).some((line) => line === `${manifest.binding.commit} refs/heads/${manifest.binding.branch}`), 'subject.bundle does not advertise the declared branch at the declared commit.');

  const bare = await mkdtemp(resolve(tmpdir(), 'webgl-evidence-bare-'));
  try {
    git(['init', '--bare', bare]);
    git(['-C', bare, 'fetch', bundle, `refs/heads/${manifest.binding.branch}:refs/heads/evidence`]);
    const importedCommit = git(['-C', bare, 'rev-parse', 'refs/heads/evidence']);
    const importedTree = git(['-C', bare, 'rev-parse', 'refs/heads/evidence^{tree}']);
    const importedParent = git(['-C', bare, 'show', '-s', '--format=%P', 'refs/heads/evidence']).split(/\s+/u)[0];
    assert(importedCommit === manifest.binding.commit, 'subject.bundle commit does not match the declared commit.');
    assert(importedTree === manifest.binding.tree, 'subject.bundle tree does not match the declared tree.');
    assert(importedParent === manifest.binding.parent, 'subject.bundle parent does not match the declared parent.');
  } finally {
    await rm(bare, { recursive: true, force: true });
  }

  const currentCommit = git(['rev-parse', manifest.binding.commit]);
  const currentTree = git(['rev-parse', `${manifest.binding.commit}^{tree}`]);
  const currentParent = git(['show', '-s', '--format=%P', manifest.binding.commit]).split(/\s+/u)[0];
  assert(currentCommit === manifest.binding.commit && currentTree === manifest.binding.tree && currentParent === manifest.binding.parent, 'Local repository does not contain the declared exact snapshot.');

  console.log(JSON.stringify({
    schemaVersion: 1,
    evidence: basename(evidenceRoot),
    manifestBytes: manifestBytes.length,
    manifestSha256: declaredManifestHash,
    entries: manifest.entries.length,
    binding: manifest.binding,
    status: 'PASS',
  }, null, 2));
} catch (error) {
  console.error(`EVIDENCE_VERIFICATION_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
