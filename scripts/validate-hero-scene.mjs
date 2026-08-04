import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const [particles, rings, core, postFx, experience] = await Promise.all([
  readFile(resolve(root, 'src/webgl/Particles.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Rings.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Core.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/PostFX.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Experience.ts'), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const forbiddenCometContracts = [
  ['SphereGeometry', /\bSphereGeometry\b/u],
  ['createComets', /\bcreateComets\b/u],
  ['cometData', /\bcometData\b/u],
  ['comets collection', /\bcomets\b/u],
  ['overbright comet multiplier', /multiplyScalar\(\s*2\.2\s*\)/u],
];
for (const [label, pattern] of forbiddenCometContracts) {
  assert(!pattern.test(particles), `Particles.ts reintroduced the intrusive spherical-comet contract: ${label}.`);
}

assert(/new THREE\.Points\(/u.test(particles), 'Ambient shader particle field is missing.');
assert(/new THREE\.BufferGeometry\(/u.test(particles), 'Ambient particle geometry is missing.');
assert(/new THREE\.ShaderMaterial\(/u.test(particles), 'Ambient particle shader material is missing.');
assert(/new THREE\.TorusGeometry\(/u.test(rings), 'Orbital rings are missing.');
assert(/new THREE\.OctahedronGeometry\(/u.test(rings), 'Floating shards are missing.');
assert(/new THREE\.IcosahedronGeometry\(1\.35, 64\)/u.test(core), 'Central energy core geometry is missing.');
assert(/UnrealBloomPass/u.test(postFx) && /this\.composer\.addPass\(this\.bloom\)/u.test(postFx), 'Primary bloom composition is missing.');
assert(/this\.scene\.add\(this\.core\.group, this\.particles\.group, this\.rings\.group\)/u.test(experience), 'Hero scene graph no longer includes the core, particles and rings together.');

console.log('Validated hero scene contract: intrusive spherical comets absent; core, shader particles, rings, shards and bloom preserved.');
