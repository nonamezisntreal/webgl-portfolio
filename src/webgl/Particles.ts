import * as THREE from 'three';
import { particlesVertex, particlesFragment } from './shaders';

/**
 * Ambient starfield-style particles in a spherical shell around the core,
 * plus a few bright "comet" particles whose motion + bloom read as light trails.
 */
export class Particles {
  group = new THREE.Group();

  private material: THREE.ShaderMaterial;
  private comets: THREE.Mesh[] = [];
  private cometData: { radius: number; speed: number; tilt: number; phase: number }[] = [];

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
      },
    });

    this.group.add(new THREE.Points(geometry, this.material));
    this.createComets(colorA, colorB);
  }

  private createComets(colorA: THREE.Color, colorB: THREE.Color): void {
    const cometGeometry = new THREE.SphereGeometry(0.025, 8, 8);
    for (let i = 0; i < 5; i++) {
      const color = colorA.clone().lerp(colorB, i / 4);
      const mesh = new THREE.Mesh(
        cometGeometry,
        new THREE.MeshBasicMaterial({ color: color.multiplyScalar(2.2) }),
      );
      this.comets.push(mesh);
      this.cometData.push({
        radius: 2.2 + i * 0.45,
        speed: 0.25 + Math.random() * 0.3,
        tilt: (Math.random() - 0.5) * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
      this.group.add(mesh);
    }
  }

  update(time: number, scroll: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uSpread.value = THREE.MathUtils.lerp(
      this.material.uniforms.uSpread.value,
      scroll,
      0.05,
    );
    this.group.rotation.y = time * 0.012;

    for (let i = 0; i < this.comets.length; i++) {
      const d = this.cometData[i];
      const a = time * d.speed + d.phase;
      const comet = this.comets[i];
      comet.position.set(
        Math.cos(a) * d.radius,
        Math.sin(a * 0.9) * d.radius * 0.35 + Math.sin(d.tilt) * 0.6,
        Math.sin(a) * d.radius * Math.cos(d.tilt),
      );
    }
  }
}
