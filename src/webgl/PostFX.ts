import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { gradeVertex, gradeFragment } from './shaders';

/**
 * Post-processing chain: render → bloom → final grade
 * (subtle chromatic aberration + vignette + film grain).
 */
export class PostFX {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private baseBloom: number;
  private bloomScale = 1;
  private flashValue = 0;
  /** Target project accent and its weight; the live pair below eases toward them. */
  private readonly atmosphere = new THREE.Color('#ffffff');
  private atmosphereWeight = 0;
  private readonly tint = new THREE.Color('#ffffff');
  private tintAmount = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quality: 'high' | 'low',
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      quality === 'high' ? 0.75 : 0.55, // strength
      0.85, // radius
      0.18, // threshold
    );
    this.baseBloom = this.bloom.strength;
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uAberration: { value: quality === 'high' ? 0.012 : 0.0 },
        uVignette: { value: 1.15 },
        uTint: { value: this.tint },
        uTintAmount: { value: 0 },
      },
      vertexShader: gradeVertex,
      fragmentShader: gradeFragment,
    });
    this.composer.addPass(this.grade);
  }

  /** Scale bloom strength (used to calm the scene as the page scrolls). */
  setBloomScale(scale: number): void {
    this.bloomScale = scale;
  }

  /** Brief bloom surge on impact; decays on its own. */
  flash(strength: number): void {
    this.flashValue = Math.min(1, strength);
  }

  /**
   * Take on the accent of the project under the pointer, or return to the
   * neutral grade. Reduced motion snaps: it renders no continuous frames.
   */
  setAtmosphere(color: THREE.Color | null, immediate = false): void {
    if (color) this.atmosphere.copy(color);
    this.atmosphereWeight = color ? 0.5 : 0;
    if (!immediate) return;
    this.tint.copy(this.atmosphere);
    this.tintAmount = this.atmosphereWeight;
    this.grade.uniforms.uTintAmount.value = this.tintAmount;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
  }

  render(time: number, delta: number): void {
    this.flashValue *= Math.exp(-delta * 3.2);

    this.tint.lerp(this.atmosphere, 0.09);
    this.tintAmount += (this.atmosphereWeight - this.tintAmount) * 0.09;

    this.bloom.strength = this.baseBloom * this.bloomScale * (1 + this.flashValue * 1.6);
    this.grade.uniforms.uTime.value = time;
    this.grade.uniforms.uTintAmount.value = this.tintAmount;
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}
