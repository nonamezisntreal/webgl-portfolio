import * as THREE from 'three';
import { approach, UI_POINTER_RATE, UI_TILT_RATE } from '../src/motion';
import { Core } from '../src/webgl/Core';
import { Experience } from '../src/webgl/Experience';
import { Nodes } from '../src/webgl/Nodes';
import { Particles } from '../src/webgl/Particles';
import { PostFX } from '../src/webgl/PostFX';
import { Rings } from '../src/webgl/Rings';
import type { SceneNode, SectionScene } from '../src/scene-nodes';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function near(actual: number, expected: number, tolerance: number, message: string): void {
  assert(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function privateValue<T>(value: object, key: string): T {
  return (value as unknown as Record<string, T>)[key];
}

const colorA = new THREE.Color('#67e8f9');
const colorB = new THREE.Color('#a78bfa');
const mouse = new THREE.Vector2();

/* Transients decay from the shared frame delta, not absolute shader time. */
const core = new Core(colorA, colorB);
core.impact(new THREE.Vector3(1, 0, 1), 1);
core.update(100, 0.05, mouse, 0);
const coreMaterial = privateValue<THREE.ShaderMaterial>(core, 'orbMaterial');
const coreBeforeReset = coreMaterial.uniforms.uRipple.value as number;
core.update(0, 0.05, mouse, 0);
const coreAfterReset = coreMaterial.uniforms.uRipple.value as number;
assert(coreAfterReset < coreBeforeReset, 'Core ripple stopped decaying when absolute time moved backwards.');

const particles = new Particles(colorA, colorB, 8);
particles.impulse(1);
particles.update(100, 0.05, 0);
const particleMaterial = privateValue<THREE.ShaderMaterial>(particles, 'material');
const particleBeforeReset = particleMaterial.uniforms.uImpulse.value as number;
particles.update(0, 0.05, 0);
const particleAfterReset = particleMaterial.uniforms.uImpulse.value as number;
assert(particleAfterReset < particleBeforeReset, 'Particle impulse stopped decaying when absolute time moved backwards.');

const rings = new Rings(colorA, colorB);
rings.pulse(1);
rings.update(100, 0.05, mouse, 0);
const ringBeforeReset = privateValue<number>(rings, 'pulseValue');
rings.update(0, 0.05, mouse, 0);
const ringAfterReset = privateValue<number>(rings, 'pulseValue');
assert(ringAfterReset < ringBeforeReset, 'Ring pulse stopped decaying when absolute time moved backwards.');

/* The passage is a position on the page, not an accumulated effect. */
const gate = new Rings(colorA, colorB);
const gateRings = privateValue<THREE.Mesh[]>(gate, 'rings');
gate.update(10, 0.016, mouse, 0);
const restTilt = gateRings[2].rotation.x;
gate.setPassage(1);
gate.update(10, 0.016, mouse, 0);
assert(gateRings[2].position.z > 1, 'The outer ring stayed put instead of riding past the viewer.');
assert(gateRings[2].position.z > gateRings[0].position.z, 'The rings moved as one shell instead of the outer one leading.');
assert(Math.abs(gateRings[2].rotation.x) < Math.abs(restTilt) * 0.5, 'The ring stayed edge-on instead of turning to face the crossing.');
gate.setPassage(4);
gate.update(10, 0.016, mouse, 0);
const clampedReach = gateRings[2].position.z;
gate.setPassage(1);
gate.update(10, 0.016, mouse, 0);
near(gateRings[2].position.z, clampedReach, 1e-9, 'Passage weight beyond its range carried the rings further.');
gate.setPassage(0);
gate.update(10, 0.016, mouse, 0);
assert(Math.abs(gateRings[2].rotation.x - restTilt) < 1e-9 && Math.abs(gateRings[2].position.z) < 1e-9,
  'Scrolling back out of the passage left the rings displaced.');

function postFxHarness(): PostFX {
  const postFx = Object.create(PostFX.prototype) as PostFX;
  Object.assign(postFx as unknown as Record<string, unknown>, {
    baseBloom: 1,
    bloomScale: 1,
    flashValue: 1,
    atmosphere: new THREE.Color('#ffffff'),
    atmosphereWeight: 0,
    tint: new THREE.Color('#ffffff'),
    tintAmount: 0,
    bloom: { strength: 1 },
    grade: { uniforms: { uTime: { value: 0 }, uTintAmount: { value: 0 } } },
    composer: { render() {} },
  });
  return postFx;
}

const postFx = postFxHarness();
postFx.render(100, 0.05);
const flashBeforeReset = privateValue<number>(postFx, 'flashValue');
postFx.render(0, 0.05);
const flashAfterReset = privateValue<number>(postFx, 'flashValue');
assert(flashAfterReset < flashBeforeReset, 'Bloom flash stopped decaying when absolute time moved backwards.');

const sceneNodes: SceneNode[] = Array.from({ length: 12 }, (_, index) => ({
  id: `runtime-${index}`,
  label: `Runtime ${index}`,
  target: `[data-runtime="${index}"]`,
  weight: 0.6,
}));
const scene: SectionScene = { formation: 'swarm', nodes: sceneNodes };
const nodes = new Nodes(colorA, colorB, sceneNodes.length);
nodes.setSection(scene);
nodes.renderStatic(2.5, 0);
assert(nodes.activeNodes.length === sceneNodes.length, 'Low-power scene capacity dropped content nodes.');

const firstPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.some((position) => position.length() > 1), 'Static node render did not reach the final formation.');
nodes.renderStatic(9.5, 0);
const secondPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.every((position, index) => position.distanceTo(secondPositions[index]) < 1e-9), 'Reduced-motion node positions still drift between static renders.');

/* F1-A/B: static rendering is an exact idempotent projection of logical state. */
const staticCore = new Core(colorA, colorB);
staticCore.impact(new THREE.Vector3(1, 0, 0), 1);
staticCore.renderStatic(2.5, mouse, 1);
const staticCoreMaterial = privateValue<THREE.ShaderMaterial>(staticCore, 'orbMaterial');
const coreSnapshot = {
  dim: staticCoreMaterial.uniforms.uDim.value as number,
  amp: staticCoreMaterial.uniforms.uAmp.value as number,
  hue: staticCoreMaterial.uniforms.uHueShift.value as number,
  ripple: staticCoreMaterial.uniforms.uRipple.value as number,
};
near(coreSnapshot.dim, 0.28, 1e-12, 'Static core did not land on the exact scroll dim target.');
near(coreSnapshot.amp, 0.65, 1e-12, 'Static core did not land on the exact amplitude target.');
near(coreSnapshot.hue, 1, 1e-12, 'Static core did not land on the exact hue target.');
near(coreSnapshot.ripple, 0, 1e-12, 'Static core preserved a transient ripple.');
staticCore.renderStatic(2.5, mouse, 1);
near(staticCoreMaterial.uniforms.uDim.value as number, coreSnapshot.dim, 1e-12, 'Repeated static core render changed dim state.');

const staticParticles = new Particles(colorA, colorB, 8);
staticParticles.impulse(1);
staticParticles.renderStatic(2.5, 1);
const staticParticleMaterial = privateValue<THREE.ShaderMaterial>(staticParticles, 'material');
near(staticParticleMaterial.uniforms.uSpread.value as number, 1, 1e-12, 'Static particles did not land on the exact spread target.');
near(staticParticleMaterial.uniforms.uImpulse.value as number, 0, 1e-12, 'Static particles preserved a transient impulse.');
staticParticles.renderStatic(2.5, 1);
near(staticParticleMaterial.uniforms.uSpread.value as number, 1, 1e-12, 'Repeated static particle render changed spread.');

const staticNodes = new Nodes(colorA, colorB, sceneNodes.length);
staticNodes.setSection({ formation: 'ring', nodes: sceneNodes });
staticNodes.setHovered(0);
staticNodes.setSelected(0);
staticNodes.renderStatic(2.5, 0.6);
type RuntimeNodeState = {
  travel: number;
  current: THREE.Vector3;
  target: THREE.Vector3;
  origin: THREE.Vector3;
  assemblyScale: number;
  originScale: number;
  targetScale: number;
  scale: number;
  hover: number;
};
const staticStates = privateValue<RuntimeNodeState[]>(staticNodes, 'states');
const staticScale = staticStates[0].scale;
assert(staticStates[0].travel === 1 && staticStates[0].current.distanceTo(staticStates[0].target) < 1e-12,
  'Static nodes did not land exactly on their formation target.');
near(staticStates[0].assemblyScale, staticStates[0].targetScale, 1e-12, 'Static node assembly scale did not snap to its target.');
near(privateValue<number>(staticNodes, 'attention'), 1, 1e-12, 'Static node attention did not snap to active hover.');
staticNodes.renderStatic(2.5, 0.6);
near(staticStates[0].scale, staticScale, 1e-12, 'Repeated static node render changed effected scale.');

const staticPostFx = postFxHarness();
staticPostFx.setBloomScale(0.55);
staticPostFx.setAtmosphere(new THREE.Color('#ff3366'));
staticPostFx.flash(1);
staticPostFx.renderStatic(2.5);
const staticTint = privateValue<THREE.Color>(staticPostFx, 'tint').clone();
near(privateValue<number>(staticPostFx, 'tintAmount'), 0.5, 1e-12, 'Static grade did not snap to atmosphere weight.');
near(privateValue<number>(staticPostFx, 'flashValue'), 0, 1e-12, 'Static grade preserved a bloom flash.');
near(privateValue<{ strength: number }>(staticPostFx, 'bloom').strength, 0.55, 1e-12, 'Static bloom did not land on its scroll target.');
staticPostFx.renderStatic(2.5);
assert(privateValue<THREE.Color>(staticPostFx, 'tint').equals(staticTint), 'Repeated static grade render changed tint.');

const staticRings = new Rings(colorA, colorB);
const heldPointer = new THREE.Vector2(0, 1);
staticRings.pulse(1);
staticRings.renderStatic(2.5, heldPointer, 1);
const driftBeforeRepeat = [...privateValue<number[]>(staticRings, 'ringDrift')];
near(privateValue<number>(staticRings, 'pulseValue'), 0, 1e-12, 'Static rings preserved a transient pulse.');
staticRings.renderStatic(2.5, heldPointer, 1);
assert(privateValue<number[]>(staticRings, 'ringDrift').every((value, index) => value === driftBeforeRepeat[index]),
  'A repeated static render accumulated ring drift.');
staticRings.update(2.5, 0.5, heldPointer, 1);
assert(privateValue<number[]>(staticRings, 'ringDrift').some((value, index) => value !== driftBeforeRepeat[index]),
  'The rings stopped drifting while the scene is running.');

/* Experience itself must snap camera/section state, not only its child layers. */
const staticExperience = Object.create(Experience.prototype) as Experience;
const staticCamera = new THREE.PerspectiveCamera();
let staticDraws = 0;
Object.assign(staticExperience as unknown as Record<string, unknown>, {
  disposed: false,
  contextLost: false,
  smoothMouse: new THREE.Vector2(0.8, -0.7),
  sectionOffset: new THREE.Vector3(-9, -9, -9),
  targetSectionOffset: new THREE.Vector3(1.4, 0.25, 0.4),
  passage: 0.9,
  targetPassage: 0.7,
  focusWeight: 0.8,
  focusHold: 0.4,
  scroll: 0.6,
  cameraBase: new THREE.Vector3(),
  lookTarget: new THREE.Vector3(),
  camera: staticCamera,
  nodes: { setPull() {}, renderStatic() { staticDraws += 1; } },
  rings: { setPassage() {}, renderStatic() {} },
  postfx: { setBloomScale() {}, renderStatic() {} },
  core: { renderStatic() {} },
  particles: { renderStatic() {} },
});
staticExperience.renderOnce();
const firstCamera = staticCamera.position.clone();
near(firstCamera.x, 1.4, 1e-12, 'Static camera did not snap to section X.');
near(firstCamera.y, 0.25 - 0.6 * 0.4, 1e-12, 'Static camera did not reflect exact scroll Y.');
near(firstCamera.z, 6.2 + 0.4 + 0.6 * 2.4, 1e-12, 'Static camera did not reflect exact section/scroll Z.');
assert(privateValue<THREE.Vector2>(staticExperience, 'smoothMouse').lengthSq() === 0, 'Static camera retained temporal pointer parallax.');
staticExperience.renderOnce();
assert(staticCamera.position.distanceTo(firstCamera) < 1e-12 && staticDraws === 2, 'Repeated Experience.renderOnce changed camera state.');

/* F1-C unit side: changed RM scroll invalidates exactly once; unchanged input does not. */
const rmScroll = Object.create(Experience.prototype) as Experience;
let rmRenders = 0;
Object.assign(rmScroll as unknown as Record<string, unknown>, {
  scroll: 0,
  reducedMotion: true,
  renderOnce() { rmRenders += 1; },
});
rmScroll.setScroll(0.25);
rmScroll.setScroll(0.25);
assert(rmRenders === 1, 'Reduced-motion scroll either failed to redraw or redrew unchanged progress.');

/* A section is recognisable by the way it gathers, and every node lands exactly. */
const assembly = new Nodes(colorA, colorB, sceneNodes.length);
assembly.setSection({ formation: 'pillars', nodes: sceneNodes });
const groundIndex = 0;
const skyIndex = sceneNodes.length - 1;
const rest = new THREE.Vector3();
assembly.update(0, 0.3, 0);
const groundStart = assembly.worldPosition(groundIndex, rest).clone();
const skyStart = assembly.worldPosition(skyIndex, rest).clone();
assert(groundStart.length() > skyStart.length(), 'The pillars rose as one block instead of standing up from the ground.');
for (let frame = 0; frame < 120; frame++) assembly.update(frame * 0.016, 0.016, 0);
const assembled = privateValue<RuntimeNodeState[]>(assembly, 'states');
assert(assembled[skyIndex].travel === 1 && assembled[skyIndex].current.distanceTo(assembled[skyIndex].target) < 1e-6,
  'The last node of the formation never arrived on its mark.');
near(assembled[skyIndex].assemblyScale, assembled[skyIndex].targetScale, 1e-6, 'Final assembly scale did not reach its exact target.');

/* F6: with the symmetric split, the first lands exactly when the last starts. */
const boundary = new Nodes(colorA, colorB, sceneNodes.length);
boundary.setSection({ formation: 'ring', nodes: sceneNodes });
boundary.update(0.55, 0.55, 0);
const boundaryStates = privateValue<RuntimeNodeState[]>(boundary, 'states');
assert(boundaryStates[groundIndex].current.distanceTo(boundaryStates[groundIndex].target) < 1e-12,
  'At the stagger boundary the first node has not landed.');
assert(boundaryStates[skyIndex].current.distanceTo(boundaryStates[skyIndex].origin) < 1e-12,
  'At the stagger boundary the last node has already started instead of starting exactly there.');
boundary.update(0.566, 0.016, 0);
assert(boundaryStates[skyIndex].current.distanceTo(boundaryStates[skyIndex].origin) > 1e-6,
  'The last node did not start immediately after the first landed.');

/* F5: interrupted formation preserves both position and base-scale continuity,
   even while rendered scale also contains hover/selection/fade effects. */
const interrupted = new Nodes(colorA, colorB, sceneNodes.length);
interrupted.setSection({ formation: 'ring', nodes: sceneNodes });
interrupted.setHovered(0);
interrupted.setSelected(0);
interrupted.update(0.1, 0.1, 0.55);
const interruptedStates = privateValue<RuntimeNodeState[]>(interrupted, 'states');
const caughtPosition = interrupted.worldPosition(groundIndex, rest).clone();
const caughtScale = interruptedStates[groundIndex].scale;
const caughtAssemblyScale = interruptedStates[groundIndex].assemblyScale;
assert(caughtPosition.length() > 0.05, 'The early interrupt probe never let the node leave the core.');
interrupted.setSection({ formation: 'spiral', nodes: sceneNodes });
near(interruptedStates[groundIndex].originScale, caughtAssemblyScale, 1e-12,
  'Interrupted formation captured an effected/target scale instead of current assembly scale.');
interrupted.setHovered(0);
interrupted.setSelected(0);
interrupted.update(0.116, 0.016, 0.55);
const afterInterruptPosition = interrupted.worldPosition(groundIndex, rest).clone();
const afterInterruptScale = interruptedStates[groundIndex].scale;
assert(caughtPosition.distanceTo(afterInterruptPosition) < 0.25,
  'A section change mid-assembly teleported the node instead of turning it.');
assert(Math.abs(afterInterruptScale - caughtScale) < 0.12,
  `A section change mid-assembly popped scale (${caughtScale} -> ${afterInterruptScale}).`);
for (let frame = 0; frame < 120; frame++) interrupted.update(0.132 + frame * 0.016, 0.016, 0.55);
assert(interruptedStates[groundIndex].travel === 1
  && interruptedStates[groundIndex].current.distanceTo(interruptedStates[groundIndex].target) < 1e-6,
'Interrupted formation did not still reach its final positional target.');
near(interruptedStates[groundIndex].assemblyScale, interruptedStates[groundIndex].targetScale, 1e-6,
  'Interrupted formation did not still reach its final scale target.');

const reach = new Nodes(colorA, colorB, sceneNodes.length);
reach.setSection(scene);
reach.renderStatic(2.5, 0);
const restPosition = reach.worldPosition(0, new THREE.Vector3()).clone();
reach.setHovered(0);
reach.setPull(new THREE.Vector3(50, 50, 50));
reach.renderStatic(2.5, 0);
assert(restPosition.distanceTo(reach.worldPosition(0, new THREE.Vector3())) < 1e-9,
  'Static render applied the pointer reach instead of ignoring it.');
for (let frame = 0; frame < 60; frame++) reach.update(2.5, 0.016, 0);
assert(reach.worldPosition(0, new THREE.Vector3()).distanceTo(restPosition) < 0.4,
  'Pointer reach accumulated past its bound instead of staying a fixed offset.');

let fakeHovered = 0;
const interaction = Object.create(Experience.prototype) as Experience;
Object.assign(interaction as unknown as Record<string, unknown>, {
  disposed: false,
  contextLost: false,
  reducedMotion: false,
  hintIndex: 0,
  hoverIndex: 0,
  domHoverIndex: -1,
  nodes: {
    activeNodes: [{ id: 'dom-node', label: 'DOM node', target: '[data-dom-node]', weight: 0.5 }],
    setHovered(index: number) { fakeHovered = index; },
    setPull() {},
  },
  postfx: { setAtmosphere() {} },
  atmosphereColor: new THREE.Color(),
  onNodeHover: () => {},
});
interaction.setDomHover('dom-node');
assert(privateValue<number>(interaction, 'hintIndex') === -1, 'DOM hover did not cancel the active idle hint.');
assert(privateValue<number>(interaction, 'domHoverIndex') === 0, 'DOM hover did not claim its scene node.');
assert(privateValue<number>(interaction, 'hoverIndex') === 0 && fakeHovered === 0, 'DOM hover lost its node while replacing the hint.');
interaction.hint(false);
assert(privateValue<number>(interaction, 'hoverIndex') === 0 && fakeHovered === 0, 'The expired hint timer cleared a newer DOM hover.');

/* Finale semantics: traversal ending only, one beat, re-arm after genuine leave. */
function endingHarness(reducedMotion: boolean, initialContact = false) {
  const struck: number[] = [];
  const experience = Object.create(Experience.prototype) as Experience;
  const nodeStub = { settled: false, activeNodes: [], setSection() {}, setSelected() {}, setPull() {}, setHovered() {} };
  Object.assign(experience as unknown as Record<string, unknown>, {
    disposed: false,
    contextLost: false,
    reducedMotion,
    section: 'hero',
    closing: false,
    closed: false,
    suppressInitialContactFinale: initialContact,
    hintIndex: -1,
    hoverIndex: -1,
    domHoverIndex: -1,
    focusIndex: -1,
    focusHold: 0,
    scenes: { skills: { formation: 'lattice', nodes: [] }, contact: { formation: 'collapse', nodes: [] } },
    nodes: nodeStub,
    targetSectionOffset: new THREE.Vector3(),
    coreCenter: new THREE.Vector3(),
    cameraFacing: new THREE.Vector3(),
    atmosphereColor: new THREE.Color(),
    camera: new THREE.PerspectiveCamera(),
    core: { group: new THREE.Group(), impact: (_: THREE.Vector3, strength: number) => struck.push(strength) },
    particles: { impulse() {} },
    rings: { pulse() {} },
    postfx: { flash() {}, setAtmosphere() {} },
    renderOnce() {},
  });
  const settle = () => {
    nodeStub.settled = true;
    (experience as unknown as { closeIfSettled(): void }).closeIfSettled();
  };
  return { experience, nodeStub, struck, settle };
}

const ending = endingHarness(false);
ending.experience.setSection('contact');
(ending.experience as unknown as { closeIfSettled(): void }).closeIfSettled();
assert(ending.struck.length === 0, 'The ending played before the constellation had gathered.');
ending.settle();
assert(ending.struck.length === 1, 'Normal traversal to the end played no closing beat.');
ending.settle();
ending.experience.setSection('contact');
ending.settle();
assert(ending.struck.length === 1, 'Repeated contact callbacks replayed the closing beat.');
ending.nodeStub.settled = false;
ending.experience.setSection('skills');
ending.settle();
assert(ending.struck.length === 1, 'The closing beat fired on a section that is not the end.');
ending.nodeStub.settled = false;
ending.experience.setSection('contact');
ending.settle();
assert(ending.struck.length === 2, 'Leaving the end and returning to it never re-armed exactly one closing beat.');

const deepLinkedEnding = endingHarness(false, true);
deepLinkedEnding.experience.setSection('contact');
deepLinkedEnding.settle();
deepLinkedEnding.experience.setSection('contact');
deepLinkedEnding.settle();
assert(deepLinkedEnding.struck.length === 0, 'Direct initial #contact arrival falsely played a completed-traversal finale.');
deepLinkedEnding.nodeStub.settled = false;
deepLinkedEnding.experience.setSection('skills');
deepLinkedEnding.settle();
deepLinkedEnding.nodeStub.settled = false;
deepLinkedEnding.experience.setSection('contact');
deepLinkedEnding.settle();
assert(deepLinkedEnding.struck.length === 1, 'A real leave/return after deep-link arrival did not re-arm exactly one finale.');

const stillEnding = endingHarness(true);
stillEnding.experience.setSection('contact');
stillEnding.settle();
stillEnding.experience.setSection('skills');
stillEnding.experience.setSection('contact');
stillEnding.settle();
assert(stillEnding.struck.length === 0, 'Reduced motion fired a finale transient.');

/* WebGL and UI continuous smoothing are measured in elapsed seconds. */
function settleOverOneSecond(fps: number) {
  const orb = new Core(colorA, colorB);
  const field = new Particles(colorA, colorB, 8);
  const layer = new Nodes(colorA, colorB, sceneNodes.length);
  layer.setSection(scene);
  layer.setHovered(0);
  const step = 1 / fps;
  for (let frame = 0; frame < fps; frame++) {
    const at = frame * step;
    orb.update(at, step, mouse, 1);
    field.update(at, step, 1);
    layer.update(at, step, 1);
  }
  return {
    dim: privateValue<THREE.ShaderMaterial>(orb, 'orbMaterial').uniforms.uDim.value as number,
    spread: privateValue<THREE.ShaderMaterial>(field, 'material').uniforms.uSpread.value as number,
    attention: privateValue<number>(layer, 'attention'),
  };
}
const slowMachine = settleOverOneSecond(30);
const normalMachine = settleOverOneSecond(60);
const fastMachine = settleOverOneSecond(120);
assert(slowMachine.dim < 0.95 && slowMachine.spread > 0.05 && slowMachine.attention > 0.05,
  'The frame-rate check never let the scene move at all.');
for (const [name, value30, value60, value120] of [
  ['core dim', slowMachine.dim, normalMachine.dim, fastMachine.dim],
  ['particle spread', slowMachine.spread, normalMachine.spread, fastMachine.spread],
  ['node attention', slowMachine.attention, normalMachine.attention, fastMachine.attention],
] as const) {
  near(value30, value60, 1e-9, `${name} differs at 30/60 fps.`);
  near(value60, value120, 1e-9, `${name} differs at 60/120 fps.`);
}

function uiApproachAfterSecond(rate: number, fps: number): number {
  let value = 0;
  const delta = 1 / fps;
  for (let frame = 0; frame < fps; frame++) value += (1 - value) * approach(rate, delta);
  return value;
}
for (const [label, rate] of [['tilt', UI_TILT_RATE], ['pointer', UI_POINTER_RATE]] as const) {
  const at30 = uiApproachAfterSecond(rate, 30);
  const at60 = uiApproachAfterSecond(rate, 60);
  const at120 = uiApproachAfterSecond(rate, 120);
  near(at30, at60, 1e-12, `UI ${label} smoothing differs at 30/60 fps.`);
  near(at60, at120, 1e-12, `UI ${label} smoothing differs at 60/120 fps.`);
}

const undersized = new Nodes(colorA, colorB, 1);
let overflowRejected = false;
try {
  undersized.setSection({ formation: 'ring', nodes: sceneNodes.slice(0, 2) });
} catch {
  overflowRejected = true;
}
assert(overflowRejected, 'Node capacity overflow was silently truncated instead of rejected.');

console.log('Scene runtime regressions passed: exact/idempotent static state, RM invalidation, elapsed-time smoothing, scale-safe interruption, exact assembly boundary, traversal-only finale, reversible passage, bounded reach, hint replacement and overflow rejection.');
