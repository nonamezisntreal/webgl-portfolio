import * as THREE from 'three';
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

function privateValue<T>(value: object, key: string): T {
  return (value as unknown as Record<string, T>)[key];
}

const colorA = new THREE.Color('#67e8f9');
const colorB = new THREE.Color('#a78bfa');
const mouse = new THREE.Vector2();

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

/* The passage is a position on the page, not an accumulated effect: crossing it
   and scrolling back must leave the rings exactly where they were found. */
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
assert(Math.abs(gateRings[2].position.z - clampedReach) < 1e-9, 'Passage weight beyond its range carried the rings further.');
gate.setPassage(0);
gate.update(10, 0.016, mouse, 0);
assert(Math.abs(gateRings[2].rotation.x - restTilt) < 1e-9 && Math.abs(gateRings[2].position.z) < 1e-9,
  'Scrolling back out of the passage left the rings displaced.');

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
nodes.update(2.5, 0, 0, true);
assert(nodes.activeNodes.length === sceneNodes.length, 'Low-power scene capacity dropped content nodes.');

const firstPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.some((position) => position.length() > 1), 'Immediate node update did not reach the final formation.');
nodes.update(9.5, 0, 0, true);
const secondPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.every((position, index) => position.distanceTo(secondPositions[index]) < 1e-9), 'Reduced-motion node positions still drift between static renders.');

/* A section is recognisable by the way it gathers, not only by the shape it
   ends up in: the pillars stand up from the ground, and every node still has to
   land exactly on its mark. */
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
const assembled = privateValue<{ travel: number; current: THREE.Vector3; target: THREE.Vector3 }[]>(assembly, 'states');
assert(
  assembled[skyIndex].travel === 1 && assembled[skyIndex].current.distanceTo(assembled[skyIndex].target) < 1e-6,
  'The last node of the formation never arrived on its mark.',
);

/* Turning away mid-assembly must carry on from where the nodes stand. */
const interrupted = new Nodes(colorA, colorB, sceneNodes.length);
interrupted.setSection({ formation: 'ring', nodes: sceneNodes });
interrupted.update(0, 0.25, 0);
const caught = interrupted.worldPosition(groundIndex, rest).clone();
assert(caught.length() > 1, 'The mid-assembly check never let the node leave the core.');
interrupted.setSection({ formation: 'spiral', nodes: sceneNodes });
interrupted.update(0.3, 0.016, 0);
assert(caught.distanceTo(interrupted.worldPosition(groundIndex, rest)) < 0.25, 'A section change mid-assembly teleported the nodes instead of turning them.');

const reach = new Nodes(colorA, colorB, sceneNodes.length);
reach.setSection(scene);
reach.update(2.5, 0, 0, true);
const restPosition = reach.worldPosition(0, new THREE.Vector3()).clone();
reach.setHovered(0);
reach.setPull(new THREE.Vector3(50, 50, 50));
reach.update(2.5, 0, 0, true);
assert(
  restPosition.distanceTo(reach.worldPosition(0, new THREE.Vector3())) < 1e-9,
  'Static render applied the pointer reach instead of ignoring it.',
);
for (let frame = 0; frame < 60; frame++) reach.update(2.5, 0.016, 0);
assert(
  reach.worldPosition(0, new THREE.Vector3()).distanceTo(restPosition) < 0.4,
  'Pointer reach accumulated past its bound instead of staying a fixed offset.',
);

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

/* The page ends on a beat, and that beat waits for the constellation to get
   home, fires once, and re-arms only when the visitor leaves and comes back. */
function endingHarness(reducedMotion: boolean) {
  const struck: number[] = [];
  const experience = Object.create(Experience.prototype) as Experience;
  const nodeStub = { settled: false, activeNodes: [], setSection() {}, setSelected() {}, setPull() {}, setHovered() {} };
  Object.assign(experience as unknown as Record<string, unknown>, {
    disposed: false,
    contextLost: false,
    reducedMotion,
    section: 'skills',
    closing: false,
    closed: false,
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
assert(ending.struck.length === 1, 'Reaching the end of the page played no closing beat.');
ending.settle();
assert(ending.struck.length === 1, 'The closing beat repeated itself while the visitor stayed put.');
ending.nodeStub.settled = false;
ending.experience.setSection('skills');
ending.settle();
assert(ending.struck.length === 1, 'The closing beat fired on a section that is not the end.');
ending.nodeStub.settled = false;
ending.experience.setSection('contact');
ending.settle();
assert(ending.struck.length === 2, 'Leaving the end and returning to it never re-armed the closing beat.');

const stillEnding = endingHarness(true);
stillEnding.experience.setSection('contact');
stillEnding.settle();
assert(stillEnding.struck.length === 0, 'Reduced motion fired a per-frame decay it renders no frames for.');

const undersized = new Nodes(colorA, colorB, 1);
let overflowRejected = false;
try {
  undersized.setSection({ formation: 'ring', nodes: sceneNodes.slice(0, 2) });
} catch {
  overflowRejected = true;
}
assert(overflowRejected, 'Node capacity overflow was silently truncated instead of rejected.');

console.log('Scene runtime regression tests passed: shared delta decay, static reduced motion, full capacity, ordered assembly, re-armable ending, bounded reach, reversible passage, hint replacement and overflow rejection.');
