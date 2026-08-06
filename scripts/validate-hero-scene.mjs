import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const [particles, rings, core, postFx, experience, nodes, sceneNodes, sceneNav, intro, scroll, projects, styles, indexHtml] = await Promise.all([
  readFile(resolve(root, 'src/webgl/Particles.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Rings.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Core.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/PostFX.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Experience.ts'), 'utf8'),
  readFile(resolve(root, 'src/webgl/Nodes.ts'), 'utf8'),
  readFile(resolve(root, 'src/scene-nodes.ts'), 'utf8'),
  readFile(resolve(root, 'src/ui/sceneNav.ts'), 'utf8'),
  readFile(resolve(root, 'src/ui/intro.ts'), 'utf8'),
  readFile(resolve(root, 'src/ui/scroll.ts'), 'utf8'),
  readFile(resolve(root, 'src/ui/projects.ts'), 'utf8'),
  readFile(resolve(root, 'src/styles/main.css'), 'utf8'),
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
assert(/usedIds/u.test(sceneNav) && /Scene node id/u.test(sceneNav), 'Scene node IDs must be globally unique and fail closed.');
assert(/addEventListener\('pointerout'/u.test(sceneNav) && /removeEventListener\('pointerout'/u.test(sceneNav)
  && /addEventListener\('blur'/u.test(sceneNav) && /removeEventListener\('blur'/u.test(sceneNav),
  'DOM hover must clear when the pointer leaves the document or the window loses focus.');

/* ── Idle demonstration and the signal a selection sends ── */

assert(/hint\(active: boolean\): boolean/u.test(experience), 'The scene must be able to point one node out on its own.');
assert(/hint: true/u.test(experience), 'The DOM bridge must be able to tell a hint from a real hover.');
assert(/if \(this\.hintIndex >= 0\) return false;/u.test(experience), 'An idle hint must survive the frames where picking finds nothing.');
const pointerDownBody = /private onPointerDown\([\s\S]*?\n {2}\}/u.exec(experience)?.[0] ?? '';
assert(/this\.cancelHint\(\)/u.test(pointerDownBody), 'A press must cancel the complete idle-hint state before activation arbitration.');
assert(/setDomHover\(id: string \| null\): void[\s\S]*?if \(id !== null\) this\.cancelHint\(false\)/u.test(experience),
  'A real DOM hover must atomically replace an active idle hint.');

assert(/DEMO_DELAY_MS/u.test(sceneNav) && /DEMO_HOLD_MS/u.test(sceneNav), 'The idle demonstration lost its timing contract.');
assert(/ACTIVITY_EVENTS = \['pointermove'/u.test(sceneNav), 'Pointer exploration must cancel the idle demonstration before it interferes with picking.');
assert(/const stopDemo/u.test(sceneNav) && /onHint\(false\)/u.test(sceneNav), 'Idle-demo cancellation must clear the full scene hint state.');
assert(/hasEngaged\(\)/u.test(sceneNav), 'The demonstration must stand down once the visitor acts on their own.');
assert(/window\.clearTimeout\(demoTimer\)/u.test(sceneNav), 'The demonstration must not outlive the scene it belongs to.');
assert(/if \(!pointer\.hint\) cursor/u.test(sceneNav), 'A hint must not pretend the cursor is on the node.');
assert(/scene-tip--hint/u.test(sceneNav), 'A hinted label must be distinguishable from a hovered one.');
assert(/pulse\.animate\(/u.test(sceneNav) && /pulse\.className = 'scene-pulse'/u.test(sceneNav), 'A selection must send a visible signal to the element it chose.');
const selectBody = /select\(pointer\) \{[\s\S]*?\n {4}\},/u.exec(sceneNav)?.[0] ?? '';
assert(/if \(reducedMotion\)/u.test(selectBody) && /signal\(pointer, target\)/u.test(selectBody),
  'The travelling signal is motion and must stay out of the reduced-motion path.');

/* ── Hero activation: choreography over an already usable page ── */

const igniteBody = /ignite\(\): void \{[\s\S]*?\n {2}\}/u.exec(experience)?.[0] ?? '';
assert(/this\.reducedMotion/u.test(igniteBody), 'The activation pulse decays per frame and must stay out of reduced motion.');
assert(/if \(reducedMotion \|\| hasBeenActive\(\)\)/u.test(intro),
  'Neither reduced motion nor a visitor who already acted may have the activation staged for them.');
assert(/SKIP_EVENTS/u.test(intro) && /removeEventListener\(type, markActed\)/u.test(intro),
  'The activation must end the moment the visitor acts, and let go of its listeners.');
assert(/navigator\.userActivation/u.test(intro) && /activation\?\.hasBeenActive/u.test(intro),
  'A gesture that landed before this bundle ran still counts as the visitor having acted.');
assert(/bindIgnite\(callback\) \{[\s\S]*?if \(finished \|\| ignited\) return;/u.test(intro),
  'The scene must receive its ignition exactly once, and never after the visitor took over.');
assert(/dispose\(\)/u.test(intro) && /removeEngagementListeners\(\)/u.test(intro),
  'Intro teardown must release global listeners.');
assert(!/dataset|classList/u.test(intro),
  'Hero visibility must not depend on the runtime: the activation module may not stage the document.');

/* ── The case a project card turns into ── */

assert(/is-case-source/u.test(projects) && /panel\.animate\(/u.test(projects),
  'A case must grow out of the card that opened it, and that card must step aside while it does.');
assert(/if \(reducedMotion \|\| !card\) return null;/u.test(projects),
  'Reduced motion must open the case where it stands instead of flying it in.');
assert(/const close = \(\) => \{[\s\S]*?setBackgroundInert\(false\);[\s\S]*?lastFocused\?\.focus\(\);[\s\S]*?case--closing/u.test(projects),
  'Closing must hand the page back before the panel animates out: the outro is a ghost, not a gate.');
assert(/\.case--closing \{ visibility: visible; pointer-events: none; \}/u.test(styles),
  'The outro must stay visible without catching pointers meant for the page behind it.');
assert(/\.case \{ transition-property: none !important; \}/u.test(styles),
  'Under reduced motion every property is transitioned, visibility included, which leaves the case unfocusable as it opens.');

/* ── Passage out of the hero ── */

assert(/setPassage\(value: number\): void/u.test(rings) && /ringDrift/u.test(rings) && /ringTilt/u.test(rings),
  'The passage must move the rings from their resting tilt without fighting the wander accumulated beside it.');
assert(/setPassage\(value: number\): void \{[\s\S]*?this\.reducedMotion \? 0/u.test(experience),
  'Reduced motion must keep its distance from the passage instead of being flown through it.');
assert(/PASSAGE_DIVE/u.test(experience) && /this\.rings\.setPassage\(this\.passage\)/u.test(experience),
  'The camera and the rings must cross the passage together, or neither reads as a passage.');
assert(/onPassage/u.test(scroll) && /Math\.sin\(Math\.PI \* travelled\)/u.test(scroll),
  'Leaving the hero must return to rest, so scrolling back plays the crossing in reverse.');

assert(/@keyframes hero-arrive/u.test(styles) && /@keyframes hero-open/u.test(styles),
  'The hero must carry its own arrival, so it plays from the first painted frame.');
assert(!/\[data-intro\]/u.test(styles) && !/is-intro-/u.test(styles),
  'A hero gated on a runtime marker stays invisible until the bundle arrives.');
assert(/\.hero__title \.reveal \{ animation: none; clip-path: none; \}/u.test(styles),
  'Reduced motion must land on the open hero instead of replaying its beats instantly.');

assert(!/scene-guide/u.test(indexHtml) && !/scene-pulse/u.test(indexHtml) && !/data-intro/u.test(indexHtml),
  'Scene onboarding and activation state must be applied at runtime without changing static index markup.');
assert(!/\bid="loader"\b/u.test(indexHtml) && !/loader__/u.test(indexHtml),
  'The homepage must not block its already-usable content behind synthetic loader markup.');
assert(/<canvas id="gl" aria-hidden="true">/u.test(indexHtml), 'The scene must remain a shortcut: the canvas stays out of the accessibility tree.');

console.log('Validated hero scene contract: intrusive spherical comets absent; core, shader particles, rings, shards and bloom preserved; interactive node layer, picking, shockwave, DOM navigation bridge and two-way hover link intact.');
