import { readFile, readdir, stat, utimes, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const manifestPath = resolve(dist, 'routes-manifest.json');
const registryPath = resolve(dist, 'portfolio-links.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
  throw new Error('Cannot normalize an empty routes manifest.');
}

const latestContentDate = [...manifest.routes]
  .map((route) => route.updatedAt)
  .sort()
  .at(-1);

if (!/^\d{4}-\d{2}-\d{2}$/.test(latestContentDate)) {
  throw new Error(`Invalid route updatedAt value: ${latestContentDate}`);
}

const generatedAt = `${latestContentDate}T00:00:00.000Z`;
manifest.generatedAt = generatedAt;
registry.generatedAt = generatedAt;

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

const timestamp = new Date(generatedAt);

async function normalizeTimes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await normalizeTimes(path);
    else if (entry.isFile()) await utimes(path, timestamp, timestamp);
  }
  await utimes(directory, timestamp, timestamp);
}

await normalizeTimes(dist);

const [normalizedManifest, normalizedRegistry] = await Promise.all([
  readFile(manifestPath, 'utf8').then(JSON.parse),
  readFile(registryPath, 'utf8').then(JSON.parse),
]);

if (normalizedManifest.generatedAt !== generatedAt || normalizedRegistry.generatedAt !== generatedAt) {
  throw new Error('Artifact metadata normalization did not persist.');
}

const manifestStat = await stat(manifestPath);
if (Math.trunc(manifestStat.mtimeMs / 1000) !== Math.trunc(timestamp.getTime() / 1000)) {
  throw new Error('Artifact file timestamps are not normalized.');
}

console.log(`Normalized artifact metadata and mtimes to ${generatedAt}.`);
