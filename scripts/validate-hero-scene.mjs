import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const [particles, rings, core, postFx, experience, nodes, sceneNodes, sceneNav, indexHtml] = await Promise.all([
  readFile(resolve(root, 'src/webgl/Particles.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Rings.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Core.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/PostFX.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Experience.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Nodes.ts'), 'utf8'),
  readFile(resolve(root, 'src/scene-nodes.ts'), 'utf8'),
  readFile(resolve(root, 'src/ui/sceneNav.ts'), 'utf8'),
  readFile(resolve(root, 'index.html'), 'utf8'),
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

/* ── Interactive layer: the scene must stay a navigable content surface ── */

assert(/new THREE\.InstancedMesh\(/u.test(nodes), 'Interactive node layer must remain a single instanced draw call.');
const formations = ['swarm', 'pillars', 'ring', 'ellipse', 'spiral', 'lattice', 'collapse'];
for (const formation of formations) {
  assert(new RegExp(`case '${formation}'`, 'u').test(nodes), `Node formation '${formation}' is missing.`);
}
assert(/worldPosition\(/u.test(nodes), 'Node world positions must stay resolvable for picking and focus.');

assert(/from '\.\/content'/u.test(sceneNodes), 'Scene node registry must derive its labels from the content registry.');
for (const section of ['hero', 'about', 'services', 'projects', 'process', 'skills', 'contact']) {
  assert(new RegExp(`\\b${section}:`, 'u').test(sceneNodes), `Scene node registry no longer covers the '${section}' section.`);
}

assert(/this\.scene\.add\(this\.nodes\.group\)/u.test(experience), 'Hero scene graph no longer includes the interactive node layer.');
assert(/private updatePicking\(\)/u.test(experience), 'Screen-space node picking is missing.');
assert(/this\.onNodeSelect\?\.\(/u.test(experience) && /this\.onNodeHover\?\.\(/u.test(experience), 'Node interaction no longer reaches the DOM bridge.');
assert(/isBlockedTarget\(/u.test(experience), 'Scene pointer handling must yield to interactive DOM.');

const shockwaveParts = [
  ['core ripple', /this\.core\.impact\(/u],
  ['particle impulse', /this\.particles\.impulse\(/u],
  ['ring pulse', /this\.rings\.pulse\(/u],
  ['bloom flash', /this\.postfx\.flash\(/u],
];
for (const [label, pattern] of shockwaveParts) {
  assert(pattern.test(experience), `Click shockwave lost its ${label}.`);
}
const shockwaveBody = /private shockwave\([\s\S]*?\n {2}\}/u.exec(experience)?.[0] ?? '';
assert(
  /this\.reducedMotion/u.test(shockwaveBody),
  'The shockwave is a per-frame decay and must stay disabled under prefers-reduced-motion.',
);
assert(/uVelocity/u.test(core) && /uRipple/u.test(core), 'Core pointer-reactivity uniforms are missing.');

assert(/scrollToElement\(/u.test(sceneNav), 'Scene selection must resolve to ordinary page navigation.');
assert(/setAttribute\('aria-hidden', 'true'\)/u.test(sceneNav), 'Scene node label must stay hidden from assistive technology.');
assert(/<canvas id="gl" aria-hidden="true">/u.test(indexHtml), 'The scene must remain a shortcut: the canvas stays out of the accessibility tree.');

console.log('Validated hero scene contract: intrusive spherical comets absent; core, shader particles, rings, shards and bloom preserved; interactive node layer, picking, shockwave and DOM navigation bridge intact.');
