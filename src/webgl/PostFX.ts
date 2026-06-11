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
      },
      vertexShader: gradeVertex,
      fragmentShader: gradeFragment,
    });
    this.composer.addPass(this.grade);
  }

  /** Scale bloom strength (used to calm the scene as the page scrolls). */
  setBloomScale(scale: number): void {
    this.bloom.strength = this.baseBloom * scale;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
  }

  render(time: number): void {
    this.grade.uniforms.uTime.value = time;
    this.composer.render();
  }
}
