import * as THREE from 'three';
import { Core } from './Core';
import { Particles } from './Particles';
import { Rings } from './Rings';
import { PostFX } from './PostFX';

const ACCENT_A = new THREE.Color('#67e8f9');
const ACCENT_B = new THREE.Color('#a78bfa');

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  onFps?: (fps: number) => void;
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

  private readonly mouse = new THREE.Vector2();
  private readonly smoothMouse = new THREE.Vector2();
  private readonly sectionOffset = new THREE.Vector3();
  private readonly targetSectionOffset = new THREE.Vector3();
  private scroll = 0;

  private readonly reducedMotion: boolean;
  private readonly isLowPower: boolean;
  private readonly onFps?: (fps: number) => void;
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

  constructor({ canvas, reducedMotion, onFps }: ExperienceOptions) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.onFps = onFps;
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
    this.camera.position.set(0, 0, 6.2);

    this.core = new Core(ACCENT_A, ACCENT_B);
    this.particles = new Particles(ACCENT_A, ACCENT_B, this.isLowPower ? 480 : 1600);
    this.rings = new Rings(ACCENT_A, ACCENT_B);
    this.scene.add(this.core.group, this.particles.group, this.rings.group);
    this.scene.fog = new THREE.FogExp2('#06060b', 0.045);
    this.postfx = new PostFX(this.renderer, this.scene, this.camera, this.isLowPower ? 'low' : 'high');

    this.resize();
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibility);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  setScroll(progress: number): void {
    this.scroll = Math.min(1, Math.max(0, progress));
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
    this.core.update(2.5, this.smoothMouse, this.scroll);
    this.particles.update(2.5, this.scroll);
    this.rings.update(2.5, this.smoothMouse, this.scroll);
    this.postfx.render(2.5);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.requestedRunning = false;
    this.pauseLoop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
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
    if (this.reducedMotion) this.renderOnce();
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
    const time = this.clock.getElapsedTime();

    this.smoothMouse.lerp(this.mouse, 0.06);
    this.sectionOffset.lerp(this.targetSectionOffset, 0.035);
    this.camera.position.x = this.smoothMouse.x * 0.55 + this.sectionOffset.x;
    this.camera.position.y = this.smoothMouse.y * 0.35 + this.sectionOffset.y - this.scroll * 0.4;
    this.camera.position.z = 6.2 + this.sectionOffset.z + this.scroll * 2.4;
    this.camera.lookAt(0, 0, 0);

    this.postfx.setBloomScale(1 - this.scroll * 0.45);
    this.core.update(time, this.smoothMouse, this.scroll);
    this.particles.update(time, this.scroll);
    this.rings.update(time, this.smoothMouse, this.scroll);
    this.postfx.render(time);

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
