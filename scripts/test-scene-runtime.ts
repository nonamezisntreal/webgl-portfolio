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
nodes.update(2.5, 0, true);
assert(nodes.activeNodes.length === sceneNodes.length, 'Low-power scene capacity dropped content nodes.');

const firstPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.some((position) => position.length() > 1), 'Immediate node update did not reach the final formation.');
nodes.update(9.5, 0, true);
const secondPositions = sceneNodes.map((_, index) => nodes.worldPosition(index, new THREE.Vector3()).clone());
assert(firstPositions.every((position, index) => position.distanceTo(secondPositions[index]) < 1e-9), 'Reduced-motion node positions still drift between static renders.');

const reach = new Nodes(colorA, colorB, sceneNodes.length);
reach.setSection(scene);
reach.update(2.5, 0, true);
const restPosition = reach.worldPosition(0, new THREE.Vector3()).clone();
reach.setHovered(0);
reach.setPull(new THREE.Vector3(50, 50, 50));
reach.update(2.5, 0, true);
assert(
  restPosition.distanceTo(reach.worldPosition(0, new THREE.Vector3())) < 1e-9,
  'Static render applied the pointer reach instead of ignoring it.',
);
for (let frame = 0; frame < 60; frame++) reach.update(2.5, 0);
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

const undersized = new Nodes(colorA, colorB, 1);
let overflowRejected = false;
try {
  undersized.setSection({ formation: 'ring', nodes: sceneNodes.slice(0, 2) });
} catch {
  overflowRejected = true;
}
assert(overflowRejected, 'Node capacity overflow was silently truncated instead of rejected.');

console.log('Scene runtime regression tests passed: shared delta decay, static reduced motion, full capacity, bounded reach, hint replacement and overflow rejection.');
