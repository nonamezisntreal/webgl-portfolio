import * as THREE from 'three';
import { coreVertex, coreFragment, haloVertex, haloFragment } from './shaders';

/**
 * The "energy core": a noise-displaced glassy orb with a glowing rim
 * plus an additive halo billboard behind it.
 */
export class Core {
  group = new THREE.Group();

  private orbMaterial: THREE.ShaderMaterial;
  private haloMaterial: THREE.ShaderMaterial;
  private halo: THREE.Mesh;

  constructor(colorA: THREE.Color, colorB: THREE.Color) {
    this.orbMaterial = new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uColorA: { value: colorA },
        uColorB: { value: colorB },
        uHueShift: { value: 0 },
        uDim: { value: 1 },
      },
    });

    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 64), this.orbMaterial);
    this.group.add(orb);

    // wireframe shell — faint technical layer floating above the surface
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.62, 2),
      new THREE.MeshBasicMaterial({
        color: colorA.clone().lerp(colorB, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0.05,
      }),
    );
    this.group.add(shell);

    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: colorA.clone().lerp(colorB, 0.35) },
        uIntensity: { value: 0.5 },
      },
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), this.haloMaterial);
    this.halo.position.z = -1.5;
    this.group.add(this.halo);
  }

  /**
   * @param time   elapsed seconds
   * @param mouse  normalized mouse (-1..1)
   * @param scroll page scroll progress (0..1)
   */
  update(time: number, mouse: THREE.Vector2, scroll: number): void {
    const u = this.orbMaterial.uniforms;
    u.uTime.value = time;
    u.uMouse.value.lerp(mouse, 0.05);
    u.uAmp.value = THREE.MathUtils.lerp(u.uAmp.value, 0.25 + scroll * 0.4, 0.04);
    u.uHueShift.value = THREE.MathUtils.lerp(u.uHueShift.value, scroll, 0.05);
    // fade the energy down as the user scrolls so content stays readable
    u.uDim.value = THREE.MathUtils.lerp(u.uDim.value, 1 - scroll * 0.72, 0.05);

    this.group.rotation.y = time * 0.08 + mouse.x * 0.25;
    this.group.rotation.x = mouse.y * 0.15 + scroll * 0.6;

    const breathe = 1 + Math.sin(time * 0.6) * 0.02;
    const scale = breathe * (1 - scroll * 0.3);
    this.group.scale.setScalar(scale);

    this.haloMaterial.uniforms.uIntensity.value =
      (0.45 + Math.sin(time * 0.8) * 0.06) * (1 - scroll * 0.7);
    this.halo.lookAt(0, 0, 10); // keep billboard facing camera direction
  }
}
