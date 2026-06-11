import * as THREE from 'three';
import { Core } from './Core';
import { Particles } from './Particles';
import { Rings } from './Rings';
import { PostFX } from './PostFX';

const ACCENT_A = new THREE.Color('#67e8f9'); // cyan
const ACCENT_B = new THREE.Color('#a78bfa'); // violet

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  onFps?: (fps: number) => void;
}

/**
 * Orchestrates the whole WebGL layer: renderer, camera, scene modules,
 * the render loop, and the mouse / scroll inputs coming from the UI layer.
 *
 * The UI never touches Three.js directly — it only calls
 * `setScroll()` / `setSection()`, keeping the two layers decoupled.
 */
export class Experience {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private core: Core;
  private particles: Particles;
  private rings: Rings;
  private postfx: PostFX;

  private mouse = new THREE.Vector2();
  private smoothMouse = new THREE.Vector2();
  private scroll = 0;
  private sectionOffset = new THREE.Vector3();
  private targetSectionOffset = new THREE.Vector3();

  private reducedMotion: boolean;
  private running = false;
  private isLowPower: boolean;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsTimer = 0;
  private onFps?: (fps: number) => void;

  constructor({ canvas, reducedMotion, onFps }: ExperienceOptions) {
    this.reducedMotion = reducedMotion;
    this.onFps = onFps;
    this.isLowPower = window.matchMedia('(max-width: 768px)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // post chain + bloom makes MSAA unnecessary
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor('#06060b', 1);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this.camera.position.set(0, 0, 6.2);

    this.core = new Core(ACCENT_A, ACCENT_B);
    this.particles = new Particles(ACCENT_A, ACCENT_B, this.isLowPower ? 600 : 1600);
    this.rings = new Rings(ACCENT_A, ACCENT_B);
    this.scene.add(this.core.group, this.particles.group, this.rings.group);
    this.scene.fog = new THREE.FogExp2('#06060b', 0.045);

    this.postfx = new PostFX(this.renderer, this.scene, this.camera, this.isLowPower ? 'low' : 'high');

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: true });
    document.addEventListener('visibilitychange', () => {
      document.hidden ? this.stop() : this.start();
    });
  }

  /* ── public API for the UI layer ───────────────────────────── */

  /** Page scroll progress, 0..1 */
  setScroll(progress: number): void {
    this.scroll = progress;
  }

  /** Active section drives a cinematic camera re-framing */
  setSection(name: string): void {
    const offsets: Record<string, [number, number, number]> = {
      hero: [0, 0, 0],
      about: [1.4, 0.25, 0.4],
      projects: [-1.5, 0.35, 0.9],
      skills: [1.1, -0.3, 1.3],
      contact: [0, 0.15, 1.7],
    };
    const [x, y, z] = offsets[name] ?? [0, 0, 0];
    this.targetSectionOffset.set(x, y, z);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  /** Render one static frame (reduced-motion fallback). */
  renderOnce(): void {
    this.core.update(2.5, this.smoothMouse, 0);
    this.particles.update(2.5, 0);
    this.rings.update(2.5, this.smoothMouse, 0);
    this.postfx.render(2.5);
  }

  /* ── internals ─────────────────────────────────────────────── */

  private onPointerMove(e: PointerEvent): void {
    this.mouse.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
    if (this.reducedMotion) this.renderOnce();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, this.isLowPower ? 1.5 : 2);
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postfx.setSize(w, h, dpr);
    if (this.reducedMotion) this.renderOnce();
  }

  private tick(): void {
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    this.smoothMouse.lerp(this.mouse, 0.06);
    this.sectionOffset.lerp(this.targetSectionOffset, 0.035);

    // camera: gentle parallax + scroll dolly + section framing
    this.camera.position.x = this.smoothMouse.x * 0.55 + this.sectionOffset.x;
    this.camera.position.y = this.smoothMouse.y * 0.35 + this.sectionOffset.y - this.scroll * 0.4;
    this.camera.position.z = 6.2 + this.sectionOffset.z + this.scroll * 2.4;
    this.camera.lookAt(0, 0, 0);

    // calm the glow down while reading content sections
    this.postfx.setBloomScale(1 - this.scroll * 0.45);

    this.core.update(t, this.smoothMouse, this.scroll);
    this.particles.update(t, this.scroll);
    this.rings.update(t, this.smoothMouse, this.scroll);
    this.postfx.render(t);

    // fps meter (updated ~once per second)
    this.fpsAccum += dt;
    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1 && this.onFps) {
      this.onFps(Math.round(this.fpsFrames / this.fpsAccum));
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }
  }
}
