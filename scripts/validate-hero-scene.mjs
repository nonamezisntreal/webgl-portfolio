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
assert(/new THREE\.OctahedronGeometry\(0\.2, 0\)/u.test(nodes), 'Interactive nodes must remain visually distinct from decorative particles.');
const formations = ['swarm', 'pillars', 'ring', 'ellipse', 'spiral', 'lattice', 'collapse'];
for (const formation of formations) {
  assert(new RegExp(`case '${formation}'`, 'u').test(nodes), `Node formation '${formation}' is missing.`);
}
assert(/worldPosition\(/u.test(nodes), 'Node world positions must stay resolvable for picking and focus.');
assert(/scene\.nodes\.length > this\.states\.length/u.test(nodes), 'Node capacity overflow must fail closed.');
assert(!/scene\.nodes\.slice\(/u.test(nodes), 'Scene nodes must not be silently truncated.');
assert(/update\(time: number, scroll: number, immediate = false\)/u.test(nodes), 'Reduced-motion nodes need an immediate static update path.');

assert(/from '\.\/content'/u.test(sceneNodes), 'Scene node registry must derive its labels from the content registry.');
assert(/data-scene-target/u.test(sceneNodes) && !/nth-child/u.test(sceneNodes), 'Scene targets must use stable identifiers rather than positional selectors.');
for (const section of ['hero', 'about', 'services', 'projects', 'process', 'skills', 'contact']) {
  assert(new RegExp(`\\b${section}:`, 'u').test(sceneNodes), `Scene node registry no longer covers the '${section}' section.`);
}

assert(/this\.scene\.add\(this\.nodes\.group\)/u.test(experience), 'Hero scene graph no longer includes the interactive node layer.');
assert(/new Nodes\(ACCENT_A, ACCENT_B, requested\)/u.test(experience), 'Every content node must remain represented on low-power devices.');
assert(/private updatePicking\(\): boolean/u.test(experience), 'Screen-space node picking is missing its state-change contract.');
assert(/this\.onNodeSelect\?\.\(/u.test(experience) && /this\.onNodeHover\?\.\(/u.test(experience), 'Node interaction no longer reaches the DOM bridge.');
assert(/isBlockedTarget\(/u.test(experience) && /this\.isBlockedPoint\(\)/u.test(experience), 'Scene pointer handling must yield to interactive DOM for hover and activation.');
assert(/window\.addEventListener\('pointerup'/u.test(experience) && /private onPointerUp\(event: PointerEvent\)/u.test(experience), 'Scene activation must be committed on pointerup.');
assert(/TAP_SLOP/u.test(experience) && /pointerDragged/u.test(experience), 'Scene activation must distinguish taps from scroll or drag gestures.');
assert(/this\.elapsedTime \+= delta/u.test(experience), 'Scene time must remain monotonic across visibility pause/resume.');
assert(/this\.nodes\.update\(time, this\.scroll, true\)/u.test(experience), 'Reduced motion must render nodes directly in their static final state.');
assert(/impactRay\.intersectPlane/u.test(experience), 'Shockwave direction must derive from the clicked side of the core.');

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
const transientSources = [core, particles, rings, postFx].join('\n');
assert(!/\blastTime\b/u.test(transientSources), 'Transient decay must use the frame delta supplied by Experience.');
assert(/this\.core\.update\(time, delta/u.test(experience)
  && /this\.particles\.update\(time, delta/u.test(experience)
  && /this\.rings\.update\(time, delta/u.test(experience)
  && /this\.postfx\.render\(time, delta\)/u.test(experience), 'Experience must supply one shared frame delta to every transient effect.');

assert(/scrollToElement\(/u.test(sceneNav), 'Scene selection must resolve to ordinary page navigation.');
assert(/assertSceneTargets\(/u.test(sceneNav), 'Scene navigation must fail closed when a DOM target is missing or ambiguous.');
assert(/interface SceneGuideCopy/u.test(sceneNav) && /guideCopy: SceneGuideCopy/u.test(sceneNav), 'Scene onboarding copy must be localized through the content registry.');
assert(/guide\.className = 'scene-guide'/u.test(sceneNav) && /tip\.dataset\.action = guideCopy\.tip/u.test(sceneNav), 'Scene onboarding and actionable hover labels are missing.');
assert(/setSection\(name: string\): void/u.test(sceneNav) && /scene-guide--hidden/u.test(sceneNav), 'Scene onboarding must only remain visible in the hero section.');
assert(/dispose\(\)/u.test(sceneNav) && /removeEventListener\('keydown'/u.test(sceneNav) && /guide\.remove\(\)/u.test(sceneNav), 'Scene navigation must clean up its global listener, tooltip and onboarding guide.');
assert(/setAttribute\('aria-hidden', 'true'\)/u.test(sceneNav), 'Scene node label must stay hidden from assistive technology.');
/* ── Two-way link: the page and the scene must read as one interface ── */

assert(/setPull\(point: THREE\.Vector3 \| null\): void/u.test(nodes), 'A hovered node must be able to reach toward the pointer.');
assert(/this\.attention/u.test(nodes), 'Nodes must recede while one of them holds attention.');
assert(/const reaching = this\.pulling && !immediate/u.test(nodes), 'The pointer reach is a per-frame offset and must stay out of the static render.');
assert(/setDomHover\(id: string \| null\): void/u.test(experience), 'Hovering a card must light up the node that stands for it.');
assert(/if \(this\.domHoverIndex >= 0\) return false;/u.test(experience), 'Scene picking must yield to the card under the pointer.');
assert(/if \(this\.domHoverIndex >= 0\) return;/u.test(experience), 'A hovered card must own its own activation gesture.');
assert(/this\.postfx\.setAtmosphere\(/u.test(experience), 'Project hover must reach the grade pass.');
assert(/setAtmosphere\(color: THREE\.Color \| null, immediate = false\): void/u.test(postFx)
  && /uTint/u.test(postFx), 'Project atmosphere must ease in the loop and snap under reduced motion.');
assert(/addEventListener\('pointerover'/u.test(sceneNav) && /removeEventListener\('pointerover'/u.test(sceneNav), 'The DOM→scene bridge must be registered and cleaned up.');
assert(/is-scene-linked/u.test(sceneNav), 'Scene hover must mark the card its node points at.');
assert(/resolve to the same element/u.test(sceneNav), 'Two scene nodes must never claim one DOM element.');

/* ── Idle demonstration and the signal a selection sends ── */

assert(/hint\(active: boolean\): boolean/u.test(experience), 'The scene must be able to point one node out on its own.');
assert(/hint: true/u.test(experience), 'The DOM bridge must be able to tell a hint from a real hover.');
assert(/if \(this\.hintIndex >= 0\) return false;/u.test(experience), 'An idle hint must survive the frames where picking finds nothing.');
const pointerDownBody = /private onPointerDown\([\s\S]*?\n {2}\}/u.exec(experience)?.[0] ?? '';
assert(/this\.hintIndex = -1;/u.test(pointerDownBody), 'A press must never resolve an idle hint into a selection.');

assert(/DEMO_DELAY_MS/u.test(sceneNav) && /DEMO_HOLD_MS/u.test(sceneNav), 'The idle demonstration lost its timing contract.');
assert(/ACTIVITY_EVENTS/u.test(sceneNav) && /engaged = true/u.test(sceneNav), 'The demonstration must stand down once the visitor acts on their own.');
assert(/window\.clearTimeout\(demoTimer\)/u.test(sceneNav), 'The demonstration must not outlive the scene it belongs to.');
assert(/if \(!pointer\.hint\) cursor/u.test(sceneNav), 'A hint must not pretend the cursor is on the node.');
assert(/scene-tip--hint/u.test(sceneNav), 'A hinted label must be distinguishable from a hovered one.');
assert(/pulse\.animate\(/u.test(sceneNav) && /pulse\.className = 'scene-pulse'/u.test(sceneNav), 'A selection must send a visible signal to the element it chose.');
const selectBody = /select\(pointer\) \{[\s\S]*?\n {4}\},/u.exec(sceneNav)?.[0] ?? '';
assert(/if \(reducedMotion\)/u.test(selectBody) && /signal\(pointer, target\)/u.test(selectBody),
  'The travelling signal is motion and must stay out of the reduced-motion path.');

assert(!/scene-guide/u.test(indexHtml) && !/scene-pulse/u.test(indexHtml), 'Scene onboarding must be created at runtime without changing static index markup.');
assert(/<canvas id="gl" aria-hidden="true">/u.test(indexHtml), 'The scene must remain a shortcut: the canvas stays out of the accessibility tree.');

console.log('Validated hero scene contract: intrusive spherical comets absent; core, shader particles, rings, shards and bloom preserved; interactive node layer, picking, shockwave, DOM navigation bridge and two-way hover link intact.');
