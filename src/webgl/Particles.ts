import * as THREE from 'three';
import { particlesVertex, particlesFragment } from './shaders';
import { approach } from '../motion';

/** Approach rate per second; see motion.ts for why it is not per frame. */
const SPREAD_RATE = 3.08;

/** Ambient starfield-style particles in a spherical shell around the core. */
export class Particles {
  group = new THREE.Group();

  private material: THREE.ShaderMaterial;

  constructor(colorA: THREE.Color, colorB: THREE.Color, count: number) {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // spherical shell distribution (radius 2.6 .. 9)
      const r = 2.6 + Math.pow(Math.random(), 0.65) * 6.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      positions[i * 3 + 2] = r * Math.cos(phi);

      scales[i] = 0.4 + Math.random() * 1.1;
      speeds[i] = 0.4 + Math.random() * 1.6;
      offsets[i] = Math.random() * Math.PI * 2;

      tmp.copy(colorA).lerp(colorB, Math.random());
      // a few neutral white sparks for depth
      if (Math.random() < 0.18) tmp.setRGB(0.85, 0.88, 0.95);
      colors[i * 3 + 0] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: particlesVertex,
      fragmentShader: particlesFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.035 },
        uSpread: { value: 0 },
        uImpulse: { value: 0 },
      },
    });

    this.group.add(new THREE.Points(geometry, this.material));
  }

  /** Push the field outward once; the shove decays on its own. */
  impulse(strength: number): void {
    this.material.uniforms.uImpulse.value = Math.min(1, strength);
  }

  update(time: number, delta: number, scroll: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uImpulse.value *= Math.exp(-delta * 2.2);
    this.material.uniforms.uSpread.value = THREE.MathUtils.lerp(
      this.material.uniforms.uSpread.value,
      scroll,
      approach(SPREAD_RATE, delta),
    );
    this.group.rotation.y = time * 0.012;
  }

  /** Render the exact non-transient state represented by scroll. */
  renderStatic(time: number, scroll: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uImpulse.value = 0;
    this.material.uniforms.uSpread.value = scroll;
    this.group.rotation.y = time * 0.012;
  }
}
