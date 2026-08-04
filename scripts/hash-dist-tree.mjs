import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const dist = resolve(projectRoot, process.env.DIST_DIR ?? 'dist');
const output = process.argv[2] ? resolve(process.argv[2]) : null;

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const files = (await listFiles(dist)).sort((left, right) => left.localeCompare(right, 'en'));
const records = [];
for (const file of files) {
  const bytes = await readFile(file);
  records.push({
    path: relative(dist, file).replaceAll('\\', '/'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: (await stat(file)).size,
  });
}

const manifest = {
  schemaVersion: 1,
  algorithm: 'sha256',
  fileCount: records.length,
  files: records,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (output) await writeFile(output, serialized, 'utf8');
else process.stdout.write(serialized);

if (records.length !== 37) throw new Error(`Expected 37 dist files, found ${records.length}.`);
