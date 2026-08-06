import * as THREE from 'three';
import { Core } from './Core';
import { Particles } from './Particles';
import { Rings } from './Rings';
import { PostFX } from './PostFX';
import { Nodes } from './Nodes';
import type { SceneNode, SceneSection, SectionScene } from '../scene-nodes';

const ACCENT_A = new THREE.Color('#67e8f9');
const ACCENT_B = new THREE.Color('#a78bfa');
/** Screen-space pick radius in CSS pixels. */
const PICK_RADIUS = 46;
/** Maximum pointer travel still treated as a tap rather than a scroll/drag. */
const TAP_SLOP = 12;
/** Interactive DOM always owns its gestures; the WebGL shortcut only uses empty space. */
const BLOCKED_TARGET_SELECTOR = 'a, button, input, textarea, select, option, label, summary, [role="button"], [contenteditable="true"], [data-project], .case';
/** Seconds the camera lingers on a node after it is selected. */
const FOCUS_HOLD = 0.9;
/** Resting distance between the camera and the core. */
const CAMERA_DISTANCE = 6.2;
/** Horizontal world radius the node formations are expected to fit within. */
const FORMATION_REACH = 2.6;
/** How far the camera leans into the composition while crossing out of the hero. */
const PASSAGE_DIVE = 0.9;

export interface NodePointer {
  node: SceneNode;
  index: number;
  x: number;
  y: number;
  /** The scene pointed this node out on its own; the pointer is elsewhere. */
  hint?: boolean;
}

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  scenes: Record<SceneSection, SectionScene>;
  onFps?: (fps: number) => void;
  onNodeHover?: (pointer: NodePointer | null) => void;
  onNodeSelect?: (pointer: NodePointer) => void;
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** WebGL scene lifecycle with bounded adaptive quality and graceful recovery. */
export class Experience {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();

  private readonly core: Core;
  private readonly particles: Particles;
  private readonly rings: Rings;
  private readonly postfx: PostFX;
  private readonly nodes: Nodes;

  private readonly mouse = new THREE.Vector2();
  private readonly smoothMouse = new THREE.Vector2();
  private readonly sectionOffset = new THREE.Vector3();
  private readonly targetSectionOffset = new THREE.Vector3();
  private scroll = 0;
  /** Live and target crossing weight for the hero → page passage. */
  private passage = 0;
  private targetPassage = 0;

  private readonly scenes: Record<SceneSection, SectionScene>;
  private readonly pointerClient = new THREE.Vector2(-1e4, -1e4);
  private readonly hoverScreen = new THREE.Vector2();
  private readonly worldScratch = new THREE.Vector3();
  private readonly screenScratch = new THREE.Vector2();
  private readonly projectScratch = new THREE.Vector3();
  private readonly impactScratch = new THREE.Vector3();
  private readonly impactPoint = new THREE.Vector3();
  private readonly coreCenter = new THREE.Vector3();
  private readonly cameraFacing = new THREE.Vector3();
  private readonly impactRay = new THREE.Ray();
  private readonly impactPlane = new THREE.Plane();
  private readonly focusScratch = new THREE.Vector3();
  private readonly cameraBase = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly pointerDownClient = new THREE.Vector2();
  private readonly pullScratch = new THREE.Vector3();
  private readonly pullPoint = new THREE.Vector3();
  private readonly atmosphereColor = new THREE.Color();
  private pointerSeen = false;
  private pointerSpeed = 0;
  private lastPointerTime = 0;
  private activePointerId = -1;
  private pointerDragged = false;
  private hoverIndex = -1;
  private domHoverIndex = -1;
  private hintIndex = -1;
  private focusIndex = -1;
  private focusHold = 0;
  private focusWeight = 0;
  private elapsedTime = 0;

  private readonly reducedMotion: boolean;
  private readonly isLowPower: boolean;
  private readonly onFps?: (fps: number) => void;
  private readonly onNodeHover?: (pointer: NodePointer | null) => void;
  private readonly onNodeSelect?: (pointer: NodePointer) => void;
  private requestedRunning = false;
  private running = false;
  private contextLost = false;
  private disposed = false;

  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsTimer = 0;
  private slowWindows = 0;
  private fastWindows = 0;
  private qualityScale: number;

  private readonly handleResize = () => this.resize();
  private readonly handlePointerMove = (event: PointerEvent) => this.onPointerMove(event);
  private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event);
  private readonly handlePointerUp = (event: PointerEvent) => this.onPointerUp(event);
  private readonly handlePointerCancel = (event: PointerEvent) => this.onPointerCancel(event);
  private readonly handleVisibility = () => {
    if (document.hidden) this.pauseLoop();
    else if (this.requestedRunning && !this.reducedMotion) this.resumeLoop();
  };
  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.pauseLoop();
  };
  private readonly handleContextRestored = () => {
    this.contextLost = false;
    this.resize();
    if (this.reducedMotion) this.renderOnce();
    else if (this.requestedRunning && !document.hidden) this.resumeLoop();
  };

  constructor({ canvas, reducedMotion, scenes, onFps, onNodeHover, onNodeSelect }: ExperienceOptions) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.scenes = scenes;
    this.onFps = onFps;
    this.onNodeHover = onNodeHover;
    this.onNodeSelect = onNodeSelect;
    this.isLowPower = this.detectLowPower();
    this.qualityScale = this.isLowPower ? 0.72 : 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: this.isLowPower ? 'low-power' : 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setClearColor('#06060b', 1);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this.camera.position.set(0, 0, CAMERA_DISTANCE);

    this.core = new Core(ACCENT_A, ACCENT_B);
    this.particles = new Particles(ACCENT_A, ACCENT_B, this.isLowPower ? 480 : 1600);
    this.rings = new Rings(ACCENT_A, ACCENT_B);
    this.scene.add(this.core.group, this.particles.group, this.rings.group);
    this.scene.fog = new THREE.FogExp2('#06060b', 0.045);
    this.postfx = new PostFX(this.renderer, this.scene, this.camera, this.isLowPower ? 'low' : 'high');

    const requested = Object.values(scenes).reduce((max, scene) => Math.max(max, scene.nodes.length), 0);
    this.nodes = new Nodes(ACCENT_A, ACCENT_B, requested);
    this.scene.add(this.nodes.group);
    this.nodes.setSection(scenes.hero);

    this.resize();
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', this.handlePointerCancel, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibility);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  setScroll(progress: number): void {
    this.scroll = Math.min(1, Math.max(0, progress));
  }

  /**
   * Crossing weight for the passage out of the hero: the camera leans in, the
   * rings turn square to it and open past the frame, then everything settles
   * once the next section owns the view. Reduced motion keeps its distance.
   */
  setPassage(value: number): void {
    this.targetPassage = this.reducedMotion ? 0 : Math.min(1, Math.max(0, value));
  }

  setSection(name: string): void {
    const offsets: Record<string, [number, number, number]> = {
      hero: [0, 0, 0],
      about: [1.4, 0.25, 0.4],
      services: [-1.2, -0.2, 0.6],
      projects: [-1.5, 0.35, 0.9],
      process: [1.3, 0.3, 1.1],
      skills: [1.1, -0.3, 1.3],
      contact: [0, 0.15, 1.7],
    };
    const [x, y, z] = offsets[name] ?? [0, 0, 0];
    this.targetSectionOffset.set(x, y, z);

    const scene = this.scenes[name as SceneSection];
    if (!scene) return;
    this.cancelHint(false);
    this.setDomHover(null);
    this.nodes.setSection(scene);
    this.clearHover();
    this.releaseFocus();
    if (this.reducedMotion) this.renderOnce();
  }

  /**
   * Light up the node that stands for a DOM element the pointer rests on, so
   * the page and the scene read as one interface. The card is its own label,
   * so this direction never opens the scene tooltip.
   */
  setDomHover(id: string | null): void {
    if (this.disposed) return;
    if (id !== null) this.cancelHint(false);
    const nodes = this.nodes.activeNodes;
    let index = -1;
    if (id !== null) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          index = i;
          break;
        }
      }
    }
    if (index === this.domHoverIndex) return;

    this.clearHover();
    this.domHoverIndex = index;
    this.nodes.setPull(null);
    if (index >= 0) {
      this.hoverIndex = index;
      this.nodes.setHovered(index);
    }

    const accent = index >= 0 ? nodes[index].color : undefined;
    this.postfx.setAtmosphere(accent ? this.atmosphereColor.set(accent) : null, this.reducedMotion);
    if (this.reducedMotion) this.renderOnce();
  }

  /**
   * Point one on-screen node out for a moment so an idle visitor learns the
   * layer is interactive. Reports whether anything was worth pointing at, and
   * never fires while the visitor is already hovering something themselves.
   */
  hint(active: boolean): boolean {
    if (this.disposed || this.contextLost) return false;

    if (!active) {
      this.cancelHint();
      return false;
    }

    if (this.hoverIndex >= 0 || this.domHoverIndex >= 0) return false;
    const nodes = this.nodes.activeNodes;
    this.nodes.group.updateMatrixWorld();

    const centreX = window.innerWidth / 2;
    const centreY = window.innerHeight / 2;
    let best = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      this.nodes.worldPosition(i, this.worldScratch);
      if (!this.projectToScreen(this.worldScratch, this.screenScratch)) continue;
      // a node sitting under a card or a button is a confusing thing to point at
      if (this.isBlockedTarget(document.elementFromPoint(this.screenScratch.x, this.screenScratch.y))) continue;
      const distance = Math.hypot(this.screenScratch.x - centreX, this.screenScratch.y - centreY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
        this.hoverScreen.copy(this.screenScratch);
      }
    }
    if (best === -1) return false;

    this.hintIndex = best;
    this.hoverIndex = best;
    this.nodes.setHovered(best);
    this.onNodeHover?.({ node: nodes[best], index: best, x: this.hoverScreen.x, y: this.hoverScreen.y, hint: true });
    if (this.reducedMotion) this.renderOnce();
    return true;
  }

  /**
   * Scripted activation pulse, aimed straight down the camera axis so the core
   * lights up evenly as the page opens. It is the same strike a click sends,
   * and like that one it decays per frame, so reduced motion never fires it.
   */
  ignite(): void {
    if (this.disposed || this.contextLost || this.reducedMotion) return;
    this.core.group.getWorldPosition(this.coreCenter);
    this.cameraFacing.copy(this.camera.position).sub(this.coreCenter).normalize();
    this.core.impact(this.cameraFacing, 0.8);
    this.particles.impulse(0.65);
    this.rings.pulse(0.9);
    this.postfx.flash(0.55);
  }

  /** Drop any node focus and let the camera return to its scroll position. */
  releaseFocus(): void {
    this.focusIndex = -1;
    this.focusHold = 0;
    this.nodes.setSelected(-1);
  }

  start(): void {
    if (this.disposed) return;
    this.requestedRunning = true;
    if (this.reducedMotion) {
      this.renderOnce();
      return;
    }
    this.resumeLoop();
  }

  stop(): void {
    this.requestedRunning = false;
    this.pauseLoop();
  }

  renderOnce(): void {
    if (this.disposed || this.contextLost) return;
    const time = 2.5;
    const delta = 0;
    this.core.update(time, delta, this.smoothMouse, this.scroll);
    this.particles.update(time, delta, this.scroll);
    this.rings.update(time, delta, this.smoothMouse, this.scroll);
    this.nodes.update(time, this.scroll, true);
    this.postfx.render(time, delta);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.requestedRunning = false;
    this.pauseLoop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerCancel);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) this.disposeMaterial(material);
    });
    this.postfx.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private detectLowPower(): boolean {
    const extended = navigator as ExtendedNavigator;
    return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
      || extended.connection?.saveData === true
      || (extended.deviceMemory !== undefined && extended.deviceMemory <= 4)
      || navigator.hardwareConcurrency <= 4;
  }

  private disposeMaterial(material: THREE.Material): void {
    const values = Object.values(material as unknown as Record<string, unknown>);
    for (const value of values) if (value instanceof THREE.Texture) value.dispose();
    material.dispose();
  }

  private resumeLoop(): void {
    if (this.running || this.disposed || this.contextLost || document.hidden) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private pauseLoop(): void {
    if (!this.running) return;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.clock.stop();
  }

  private onPointerMove(event: PointerEvent): void {
    this.mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );

    const now = performance.now();
    if (this.pointerSeen) {
      const travelled = Math.hypot(event.clientX - this.pointerClient.x, event.clientY - this.pointerClient.y);
      const elapsed = Math.max(16, now - this.lastPointerTime);
      this.pointerSpeed = Math.max(this.pointerSpeed, Math.min(1, travelled / elapsed / 2.4));
    }
    this.lastPointerTime = now;
    this.pointerSeen = true;
    this.pointerClient.set(event.clientX, event.clientY);

    if (event.pointerId === this.activePointerId
      && this.pointerDownClient.distanceTo(this.pointerClient) > TAP_SLOP) {
      this.pointerDragged = true;
    }

    // reduced motion has no animation loop: render only when hover state changes
    if (this.reducedMotion && this.updatePicking()) this.renderOnce();
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.disposed || this.contextLost || event.button !== 0 || !event.isPrimary) return;
    // A hint is a complete UI state, not just an index: cancel it atomically.
    this.cancelHint();
    this.activePointerId = -1;
    this.pointerDragged = false;
    if (this.isBlockedTarget(event.target)) return;

    this.activePointerId = event.pointerId;
    this.pointerDownClient.set(event.clientX, event.clientY);
    this.pointerClient.copy(this.pointerDownClient);
    this.pointerSeen = true;
  }

  private onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    if (this.disposed || this.contextLost) {
      this.activePointerId = -1;
      this.pointerDragged = false;
      return;
    }
    this.pointerClient.set(event.clientX, event.clientY);
    const dragged = this.pointerDragged || this.pointerDownClient.distanceTo(this.pointerClient) > TAP_SLOP;
    this.activePointerId = -1;
    this.pointerDragged = false;

    // the pointer is resting on a card: that DOM element owns the gesture
    if (this.domHoverIndex >= 0) return;

    if (dragged || this.isBlockedTarget(event.target) || this.isBlockedPoint()) {
      const hoverChanged = this.hoverIndex !== -1;
      this.clearHover();
      if (this.reducedMotion && hoverChanged) this.renderOnce();
      return;
    }
    this.pointerSeen = true;
    this.updatePicking();

    if (this.hoverIndex >= 0) {
      this.selectNode(this.hoverIndex);
      return;
    }
    this.shockwave(event.clientX, event.clientY);
  }

  private onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = -1;
    this.pointerDragged = false;
    const hoverChanged = this.hoverIndex !== -1;
    this.clearHover();
    if (this.reducedMotion && hoverChanged) this.renderOnce();
  }

  /** DOM owns its own gestures; the scene only reacts to empty space. */
  private isBlockedTarget(target: EventTarget | null): boolean {
    const element = target instanceof Element ? target : null;
    return Boolean(element?.closest(BLOCKED_TARGET_SELECTOR));
  }

  private isBlockedPoint(): boolean {
    if (!this.pointerSeen) return false;
    return this.isBlockedTarget(document.elementFromPoint(this.pointerClient.x, this.pointerClient.y));
  }

  private selectNode(index: number): void {
    const node = this.nodes.activeNodes[index];
    if (!node) return;
    this.nodes.setSelected(index);
    this.focusIndex = index;
    this.focusHold = FOCUS_HOLD;
    this.onNodeSelect?.({ node, index, x: this.hoverScreen.x, y: this.hoverScreen.y });
    // the flash is a per-frame decay, and reduced motion renders no continuous frames
    if (this.reducedMotion) this.renderOnce();
    else this.postfx.flash(0.45);
  }

  /** Strike the scene from a screen position; intensity falls off away from the core. */
  private shockwave(clientX: number, clientY: number): void {
    // every part of the strike decays per frame; with no animation loop it would
    // freeze at full strength instead of fading, so reduced motion gets no strike
    if (this.reducedMotion) return;

    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    this.impactScratch.set(ndcX, ndcY, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
    this.impactRay.set(this.camera.position, this.impactScratch);

    this.core.group.getWorldPosition(this.coreCenter);
    this.cameraFacing.copy(this.camera.position).sub(this.coreCenter).normalize();
    this.impactPlane.setFromNormalAndCoplanarPoint(this.cameraFacing, this.coreCenter);
    if (this.impactRay.intersectPlane(this.impactPlane, this.impactPoint)) {
      this.impactScratch.subVectors(this.impactPoint, this.coreCenter).addScaledVector(this.cameraFacing, 1.35).normalize();
    } else {
      this.impactScratch.copy(this.cameraFacing);
    }

    const reach = Math.min(window.innerWidth, window.innerHeight) * 0.55;
    let strength = 0.3;
    if (this.projectToScreen(this.coreCenter, this.screenScratch)) {
      const distance = this.screenScratch.distanceTo(this.pointerClient);
      strength = THREE.MathUtils.clamp(1 - distance / reach, 0.28, 1);
    }

    this.core.impact(this.impactScratch, strength);
    this.particles.impulse(strength * 0.8);
    this.rings.pulse(strength);
    this.postfx.flash(strength * 0.7);
  }

  private clearHover(): void {
    if (this.hoverIndex === -1) return;
    this.hoverIndex = -1;
    this.nodes.setHovered(-1);
    this.onNodeHover?.(null);
  }

  /** Cancel the complete idle-demo state before another interaction takes over. */
  private cancelHint(renderStatic = true): boolean {
    if (this.hintIndex === -1) return false;
    this.hintIndex = -1;
    this.clearHover();
    if (renderStatic && this.reducedMotion) this.renderOnce();
    return true;
  }

  /** Screen-space picking: forgiving, bounded and independent of node size. */
  private updatePicking(): boolean {
    // a hovered card already owns the highlight; scene picking must not fight it
    if (this.domHoverIndex >= 0) return false;
    const previous = this.hoverIndex;
    const nodes = this.nodes.activeNodes;
    if (!this.pointerSeen || nodes.length === 0 || this.isBlockedPoint()) {
      // an idle hint keeps the highlight it asked for until it expires
      if (this.hintIndex >= 0) return false;
      this.clearHover();
      return previous !== -1;
    }

    this.nodes.group.updateMatrixWorld();
    let best = -1;
    let bestDistance = PICK_RADIUS;
    for (let i = 0; i < nodes.length; i++) {
      this.nodes.worldPosition(i, this.worldScratch);
      if (!this.projectToScreen(this.worldScratch, this.screenScratch)) continue;
      const distance = this.screenScratch.distanceTo(this.pointerClient);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
        this.hoverScreen.copy(this.screenScratch);
      }
    }

    if (best === -1) {
      if (this.hintIndex >= 0) return false;
      this.clearHover();
      return previous !== -1;
    }

    // a real hover always wins over the hint and clears its DOM state first
    this.cancelHint(false);
    this.hoverIndex = best;
    this.nodes.setHovered(best);
    this.onNodeHover?.({ node: nodes[best], index: best, x: this.hoverScreen.x, y: this.hoverScreen.y });
    return best !== previous;
  }

  private projectToScreen(world: THREE.Vector3, out: THREE.Vector2): boolean {
    this.projectScratch.copy(world).project(this.camera);
    if (this.projectScratch.z > 1) return false;
    out.set(
      (this.projectScratch.x * 0.5 + 0.5) * window.innerWidth,
      (-this.projectScratch.y * 0.5 + 0.5) * window.innerHeight,
    );
    return true;
  }

  private resize(): void {
    if (this.disposed || this.contextLost) return;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const deviceLimit = this.isLowPower ? 1.5 : 2;
    const pixelRatio = Math.max(0.75, Math.min(window.devicePixelRatio, deviceLimit) * this.qualityScale);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // portrait viewports are limited by horizontal FOV, so pull the formations in
    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * CAMERA_DISTANCE;
    this.nodes.setSpread((halfHeight * this.camera.aspect) / FORMATION_REACH);

    this.postfx.setSize(width, height, pixelRatio);
    if (this.reducedMotion) this.renderOnce();
  }

  private adaptQuality(fps: number): void {
    if (this.reducedMotion || this.contextLost) return;
    if (fps < 35) {
      this.slowWindows += 1;
      this.fastWindows = 0;
    } else if (fps > 54) {
      this.fastWindows += 1;
      this.slowWindows = 0;
    } else {
      this.slowWindows = 0;
      this.fastWindows = 0;
    }

    if (this.slowWindows >= 3 && this.qualityScale > 0.5) {
      this.qualityScale = Math.max(0.5, this.qualityScale - 0.12);
      this.slowWindows = 0;
      this.resize();
    } else if (this.fastWindows >= 6 && this.qualityScale < 1) {
      this.qualityScale = Math.min(1, this.qualityScale + 0.08);
      this.fastWindows = 0;
      this.resize();
    }
  }

  private tick(): void {
    if (this.disposed || this.contextLost) return;
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += delta;
    const time = this.elapsedTime;

    this.smoothMouse.lerp(this.mouse, 0.06);
    this.sectionOffset.lerp(this.targetSectionOffset, 0.035);
    this.pointerSpeed *= Math.exp(-delta * 4);
    this.core.setVelocity(this.pointerSpeed);

    this.focusHold = Math.max(0, this.focusHold - delta);
    const focusing = this.focusIndex >= 0 && this.focusHold > 0 && !this.reducedMotion;
    this.focusWeight += ((focusing ? 1 : 0) - this.focusWeight) * 0.08;

    this.passage += (this.targetPassage - this.passage) * 0.1;

    this.cameraBase.set(
      this.smoothMouse.x * 0.55 + this.sectionOffset.x,
      this.smoothMouse.y * 0.35 + this.sectionOffset.y - this.scroll * 0.4,
      CAMERA_DISTANCE + this.sectionOffset.z + this.scroll * 2.4 - this.passage * PASSAGE_DIVE,
    );
    this.lookTarget.set(0, 0, 0);

    if (this.focusIndex >= 0 && this.focusWeight > 0.001) {
      this.nodes.worldPosition(this.focusIndex, this.worldScratch);
      this.lookTarget.lerp(this.worldScratch, this.focusWeight * 0.8);
      this.focusScratch.copy(this.worldScratch).multiplyScalar(1.5).setZ(this.worldScratch.z + 3.4);
      this.cameraBase.lerp(this.focusScratch, this.focusWeight * 0.55);
    }

    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.lookTarget);

    // the hovered node reaches toward the pointer, sampled at its own depth
    if (this.hoverIndex >= 0 && this.domHoverIndex < 0 && this.hintIndex < 0) {
      this.nodes.worldPosition(this.hoverIndex, this.worldScratch);
      this.pullScratch.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
      this.pullPoint.copy(this.camera.position)
        .addScaledVector(this.pullScratch, this.worldScratch.distanceTo(this.camera.position));
      this.nodes.setPull(this.pullPoint);
    } else {
      this.nodes.setPull(null);
    }

    this.postfx.setBloomScale((1 - this.scroll * 0.45) * (1 + this.passage * 0.12));
    this.core.update(time, delta, this.smoothMouse, this.scroll);
    this.particles.update(time, delta, this.scroll);
    this.rings.setPassage(this.passage);
    this.rings.update(time, delta, this.smoothMouse, this.scroll);
    this.nodes.update(time, this.scroll);
    this.updatePicking();
    this.postfx.render(time, delta);

    this.fpsAccum += delta;
    this.fpsFrames += 1;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1 && this.fpsAccum > 0) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.onFps?.(fps);
      this.adaptQuality(fps);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }
  }
}
