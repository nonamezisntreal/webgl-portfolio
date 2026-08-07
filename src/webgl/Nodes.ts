import * as THREE from 'three';
import type { Formation, SceneNode, SectionScene } from '../scene-nodes';
import { approach } from '../motion';

interface NodeState {
  readonly target: THREE.Vector3;
  readonly current: THREE.Vector3;
  /** Where the node set out from when the section last changed. */
  readonly origin: THREE.Vector3;
  /** Where the instance was actually drawn last frame — picking uses this. */
  readonly rendered: THREE.Vector3;
  readonly color: THREE.Color;
  readonly restColor: THREE.Color;
  /** Base formation scale before fade/hover/breathe/selection effects. */
  assemblyScale: number;
  /** Last rendered/effected scale. */
  scale: number;
  targetScale: number;
  hover: number;
  targetHover: number;
  /** The size the node held when the section last changed. */
  originScale: number;
  /** 0..1 progress of the re-formation this node is part of. */
  travel: number;
  /** 0..1 place in the assembly order of its formation. */
  order: number;
  phase: number;
  spin: number;
}

const GOLDEN_ANGLE = Math.PI * (1 + Math.sqrt(5));
/** How far, in world units, a hovered node may reach toward the pointer. */
const PULL_REACH = 0.26;
/** Seconds a whole formation takes to assemble, and the share of that spent staggering. */
const REFORM_SECONDS = 1.1;
const REFORM_STAGGER = 0.5;
/** Approach rates per second; see motion.ts for why they are not per frame. */
const ATTENTION_RATE = 7.67;
const HOVER_RATE = 9.05;
const SCALE_RATE = 5.66;

const inverseWorld = new THREE.Matrix4();
const localPull = new THREE.Vector3();
const pullOffset = new THREE.Vector3();

/** Resolve the resting position of one node inside a formation. */
function layout(formation: Formation, index: number, count: number, weight: number, out: THREE.Vector3): void {
  switch (formation) {
    case 'swarm': {
      const k = index + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = GOLDEN_ANGLE * k;
      out.set(
        Math.cos(theta) * Math.sin(phi) * 2.05,
        Math.cos(phi) * 1.5,
        Math.sin(theta) * Math.sin(phi) * 2.05,
      );
      break;
    }
    case 'pillars': {
      const a = (index / count) * Math.PI * 2;
      out.set(Math.cos(a) * 2.7, (index - (count - 1) / 2) * 0.66, Math.sin(a) * 2.7);
      break;
    }
    case 'ring': {
      const a = (index / count) * Math.PI * 2;
      out.set(Math.cos(a) * 3.0, Math.sin(a * 2) * 0.26, Math.sin(a) * 3.0);
      break;
    }
    case 'ellipse': {
      const a = (index / count) * Math.PI * 2 + Math.PI / 4;
      out.set(Math.cos(a) * 3.4, Math.sin(a) * 0.55, Math.sin(a) * 1.7);
      break;
    }
    case 'spiral': {
      const t = count > 1 ? index / (count - 1) : 0;
      const a = t * Math.PI * 1.7;
      const radius = 1.9 + t * 1.5;
      out.set(Math.cos(a) * radius, (t - 0.5) * 2.5, Math.sin(a) * radius);
      break;
    }
    case 'lattice': {
      const k = index + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = GOLDEN_ANGLE * k;
      const radius = 1.9 + weight * 1.5;
      out.set(
        Math.cos(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius * 0.8,
        Math.sin(theta) * Math.sin(phi) * radius,
      );
      break;
    }
    case 'collapse':
      out.setScalar(0);
      break;
  }
}

/**
 * The order a formation assembles in, read off the shape itself: 0 lands first,
 * 1 last. Section identity lives in how the constellation gathers, not only in
 * what it ends up as.
 */
function arrivalOrder(formation: Formation, index: number, count: number, weight: number): number {
  const t = count > 1 ? index / (count - 1) : 0;
  switch (formation) {
    // pillars stand up from the ground, the ring draws itself around, the
    // spiral unwinds one numbered step at a time
    case 'pillars':
    case 'ring':
    case 'spiral':
      return t;
    // the ellipse fills in from the side nearest the viewer
    case 'ellipse':
      return (1 - Math.sin((index / count) * Math.PI * 2 + Math.PI / 4)) / 2;
    // magnitude is what the lattice encodes, so the strongest lands first
    case 'lattice':
      return 1 - weight;
    // a swarm has no order to speak of, and a collapse is over at once
    default:
      return 0;
  }
}

/**
 * Interactive content layer: a pooled instanced constellation where every
 * visible node stands for one item of the active section.
 */
export class Nodes {
  group = new THREE.Group();

  private readonly mesh: THREE.InstancedMesh;
  private readonly states: NodeState[] = [];
  private readonly dummy = new THREE.Object3D();
  /** Default per-instance accent, used whenever a node brings no color of its own. */
  private readonly gradient: THREE.Color[] = [];
  private visible: SceneNode[] = [];
  private selected = -1;
  private hovered = -1;
  private spread = 1;
  /** 0..1 — how strongly the constellation is focused on a single node. */
  private attention = 0;
  private readonly pull = new THREE.Vector3();
  private pulling = false;

  constructor(colorA: THREE.Color, colorB: THREE.Color, capacity: number) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      capacity,
    );
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.mesh);

    for (let i = 0; i < capacity; i++) {
      const accent = colorA.clone().lerp(colorB, i / Math.max(1, capacity - 1));
      this.gradient.push(accent);
      this.states.push({
        target: new THREE.Vector3(),
        current: new THREE.Vector3(),
        origin: new THREE.Vector3(),
        rendered: new THREE.Vector3(),
        color: accent.clone(),
        restColor: accent.clone(),
        assemblyScale: 0,
        scale: 0,
        targetScale: 0,
        hover: 0,
        targetHover: 0,
        originScale: 0,
        travel: 1,
        order: 0,
        phase: (i * GOLDEN_ANGLE) % (Math.PI * 2),
        spin: 0.25 + (i % 5) * 0.11,
      });
      this.mesh.setColorAt(i, this.states[i].color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Nodes currently represented in the scene, in instance order. */
  get activeNodes(): readonly SceneNode[] {
    return this.visible;
  }

  /** True once every node has finished the move its section asked for. */
  get settled(): boolean {
    for (const state of this.states) if (state.travel < 1) return false;
    return true;
  }

  /** Re-form the constellation for a section; unused instances collapse into the core. */
  setSection(scene: SectionScene): void {
    if (scene.nodes.length > this.states.length) {
      throw new Error(`Scene requires ${scene.nodes.length} nodes but capacity is ${this.states.length}.`);
    }
    this.visible = [...scene.nodes];
    this.selected = -1;
    this.hovered = -1;

    for (let i = 0; i < this.states.length; i++) {
      const state = this.states[i];
      const node = this.visible[i];
      state.targetHover = 0;
      // the move is measured from wherever the node stands, so an interrupted
      // re-formation carries on from where it got to rather than snapping back
      state.origin.copy(state.current);
      state.originScale = state.assemblyScale;
      state.travel = 0;

      if (!node) {
        state.target.setScalar(0);
        state.targetScale = 0;
        state.order = 0;
        continue;
      }

      layout(scene.formation, i, this.visible.length, node.weight, state.target);
      state.order = arrivalOrder(scene.formation, i, this.visible.length, node.weight);
      state.targetScale = 0.78 + node.weight * 0.58;
      if (node.color) state.restColor.set(node.color);
      else state.restColor.copy(this.gradient[i]);
    }
  }

  /** Horizontal compression (0.3..1) so formations stay on screen on narrow viewports. */
  setSpread(scale: number): void {
    this.spread = Math.min(1, Math.max(0.3, scale));
  }

  setHovered(index: number): void {
    this.hovered = index;
    for (let i = 0; i < this.states.length; i++) this.states[i].targetHover = i === index ? 1 : 0;
  }

  /** World point the hovered node reaches toward, or null to let it rest. */
  setPull(point: THREE.Vector3 | null): void {
    this.pulling = point !== null;
    if (point) this.pull.copy(point);
  }

  setSelected(index: number): void {
    this.selected = index;
  }

  /** World-space position of an instance, used for picking and camera focus. */
  worldPosition(index: number, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.states[index].rendered).applyMatrix4(this.group.matrixWorld);
  }

  update(time: number, delta: number, scroll: number): void {
    this.renderState(time, delta, scroll, false);
  }

  /** Render the exact resting formation without advancing any temporal state. */
  renderStatic(time: number, scroll: number): void {
    this.renderState(time, 0, scroll, true);
  }

  private renderState(time: number, delta: number, scroll: number, staticFrame: boolean): void {
    // content sections must stay readable, so the layer calms down as the page scrolls
    const fade = 1 - scroll * 0.35;

    // one node under attention pushes the rest of the constellation into the background
    const attentionTarget = this.hovered >= 0 ? 1 : 0;
    this.attention = staticFrame
      ? attentionTarget
      : this.attention + (attentionTarget - this.attention) * approach(ATTENTION_RATE, delta);
    const ambient = 1 - this.attention * 0.42;

    // the reach is a temporal pointer response, so it has no meaning in a static frame
    const reaching = this.pulling && !staticFrame;
    if (reaching) {
      inverseWorld.copy(this.group.matrixWorld).invert();
      localPull.copy(this.pull).applyMatrix4(inverseWorld);
    }

    for (let i = 0; i < this.states.length; i++) {
      const state = this.states[i];

      if (staticFrame) {
        state.travel = 1;
        state.current.copy(state.target);
        state.assemblyScale = state.targetScale;
        state.hover = state.targetHover;
      } else {
        // every node moves for the same stretch; its place in the order only
        // decides when that stretch starts, so the shape assembles as a shape
        state.travel = Math.min(1, state.travel + delta / REFORM_SECONDS);
        const moved = THREE.MathUtils.clamp(
          (state.travel - state.order * REFORM_STAGGER) / (1 - REFORM_STAGGER), 0, 1,
        );
        const eased = 1 - Math.pow(1 - moved, 3);
        state.current.lerpVectors(state.origin, state.target, eased);
        // Assembly scale is geometric state. Effects below never become the origin
        // of a later formation, so fade/hover/pulse cannot be double-applied.
        state.assemblyScale = THREE.MathUtils.lerp(state.originScale, state.targetScale, eased);
        state.hover += (state.targetHover - state.hover) * approach(HOVER_RATE, delta);
      }

      const selectedPulse = i === this.selected
        ? staticFrame ? 0.18 : 0.18 + Math.sin(time * 4) * 0.06
        : 0;
      const breathe = staticFrame ? 1 : 1 + Math.sin(time * 0.9 + state.phase) * 0.05;
      const wanted = state.assemblyScale * breathe * fade * (1 + state.hover * 0.85 + selectedPulse);
      if (staticFrame) state.scale = wanted;
      else state.scale += (wanted - state.scale) * approach(SCALE_RATE, delta);

      state.rendered.set(
        state.current.x * this.spread,
        state.current.y + (staticFrame ? 0 : Math.sin(time * 0.6 + state.phase) * 0.07),
        state.current.z * this.spread,
      );
      // hover phase 1: the node leans toward the pointer, and its hitbox with it
      if (reaching && state.hover > 0.001) {
        pullOffset.subVectors(localPull, state.rendered).clampLength(0, PULL_REACH);
        state.rendered.addScaledVector(pullOffset, state.hover);
      }

      this.dummy.position.copy(state.rendered);
      if (staticFrame) this.dummy.rotation.set(0, 0, 0);
      else this.dummy.rotation.set(time * state.spin, time * state.spin * 0.7, 0);
      this.dummy.scale.setScalar(Math.max(state.scale, 0));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // idle nodes stay subdued so hover reads as a real affordance
      const glow = 0.75 * ambient + state.hover * 1.75 + selectedPulse * 2;
      state.color.copy(state.restColor).multiplyScalar(glow);
      this.mesh.setColorAt(i, state.color);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.group.rotation.y = staticFrame ? 0 : time * 0.03;
    this.group.updateMatrixWorld(true);
  }
}
