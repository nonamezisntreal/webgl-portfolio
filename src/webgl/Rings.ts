import * as THREE from 'three';

/**
 * Thin orbital rings + floating shards around the core —
 * the "technology" layer of the composition.
 */
export class Rings {
  group = new THREE.Group();

  private rings: THREE.Mesh[] = [];
  private shards: THREE.Mesh[] = [];
  private shardData: { radius: number; speed: number; y: number; phase: number; rot: number }[] = [];

  constructor(colorA: THREE.Color, colorB: THREE.Color) {
    const ringConfigs = [
      { radius: 2.3, tilt: 0.45, opacity: 0.32, color: colorA },
      { radius: 2.9, tilt: -0.32, opacity: 0.20, color: colorB },
      { radius: 3.6, tilt: 0.18, opacity: 0.10, color: colorA.clone().lerp(colorB, 0.5) },
    ];

    for (const cfg of ringConfigs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius, 0.006, 8, 220),
        new THREE.MeshBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: cfg.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2 + cfg.tilt;
      this.rings.push(ring);
      this.group.add(ring);
    }

    // floating crystal shards
    const shardGeometry = new THREE.OctahedronGeometry(0.09, 0);
    for (let i = 0; i < 9; i++) {
      const color = colorA.clone().lerp(colorB, Math.random());
      const shard = new THREE.Mesh(
        shardGeometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.5,
          wireframe: Math.random() < 0.4,
        }),
      );
      const scale = 0.5 + Math.random() * 1.3;
      shard.scale.setScalar(scale);
      this.shards.push(shard);
      this.shardData.push({
        radius: 2.4 + Math.random() * 1.8,
        speed: 0.08 + Math.random() * 0.14,
        y: (Math.random() - 0.5) * 2.4,
        phase: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 1.6,
      });
      this.group.add(shard);
    }
  }

  update(time: number, mouse: THREE.Vector2, scroll: number): void {
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const dir = i % 2 === 0 ? 1 : -1;
      ring.rotation.z = time * 0.05 * dir;
      ring.rotation.x += (mouse.y * 0.0006 - scroll * 0.0002) * dir;
    }

    for (let i = 0; i < this.shards.length; i++) {
      const d = this.shardData[i];
      const shard = this.shards[i];
      const a = time * d.speed + d.phase;
      shard.position.set(
        Math.cos(a) * d.radius,
        d.y + Math.sin(time * 0.4 + d.phase) * 0.25,
        Math.sin(a) * d.radius,
      );
      shard.rotation.x = time * d.rot;
      shard.rotation.y = time * d.rot * 0.7;
    }

    this.group.rotation.y = -time * 0.02 + mouse.x * 0.12;
  }
}
