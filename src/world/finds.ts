// The island's secrets in the world: sea glass glinting in its nooks, bounce mushrooms, the
// mound that shows where something is buried once the detector is close, and the little rain
// cloud that follows a lucky angler about.
import { lit } from '../look/material';
import * as THREE from 'three';
import { model } from '../assets/models';
import { Heightfield } from './island';
import { GLASS_COLOURS, SEA_GLASS, SHROOMS } from './secrets';

export class Finds {
  readonly group = new THREE.Group();
  private glass = new Map<number, THREE.Object3D>();
  private shrooms: THREE.Object3D[] = [];
  private squash = SHROOMS.map(() => 0);
  private mound: THREE.Mesh;
  private cloud: THREE.Object3D | null = null;
  private cloudOn = 0;
  private t = 0;

  constructor(private field: Heightfield) {
    this.mound = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lit({ color: 0x7d5436, flatShading: true }));
    this.mound.scale.y = 0.4;
    this.mound.visible = false;
    this.group.add(this.mound);
  }

  async load(found: number[]): Promise<void> {
    const [glass, shroom, cloud] = await Promise.all([model('seaglass', 0.12), model('bounce-shroom', 1.4), model('cloud', 4)]);
    SEA_GLASS.forEach(([x, z], i) => {
      if (found.includes(i)) return;
      const g = new THREE.Group();
      const piece = glass ? glass.clone(true) : new THREE.Mesh(new THREE.OctahedronGeometry(0.1), lit());
      // Each piece its own soft colour, a little see-through-looking and glowing.
      const colour = new THREE.Color(GLASS_COLOURS[i % GLASS_COLOURS.length]);
      piece.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = lit({ color: colour, emissive: colour.clone().multiplyScalar(0.45), flatShading: true });
      });
      piece.scale.multiplyScalar(2.2);
      g.add(piece);
      g.position.set(x, this.field.heightAt(x, z) + 0.25, z);
      this.group.add(g);
      this.glass.set(i, g);
    });
    for (const s of SHROOMS) {
      const m = shroom ? shroom.clone(true) : new THREE.Mesh(new THREE.CylinderGeometry(1, 0.4, 1), lit({ color: 0xd65a3c }));
      m.position.set(s.x, this.field.heightAt(s.x, s.z) - 0.05, s.z);
      m.rotation.y = s.yaw;
      this.group.add(m);
      this.shrooms.push(m);
    }
    if (cloud) {
      cloud.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          m.material = lit({ color: 0x9aa6b4, map: (m.material as THREE.MeshLambertMaterial).map });
        }
      });
      cloud.visible = false;
      this.cloud = cloud;
      this.group.add(cloud);
    }
  }

  /** The piece of sea glass within reach, if any. */
  glassNear(p: THREE.Vector3): number | null {
    for (const [i, g] of this.glass) if (Math.hypot(g.position.x - p.x, g.position.z - p.z) < 1.3 && Math.abs(g.position.y - p.y) < 2) return i;
    return null;
  }

  take(i: number): THREE.Vector3 | null {
    const g = this.glass.get(i);
    if (!g) return null;
    this.group.remove(g);
    this.glass.delete(i);
    return g.position.clone();
  }

  /** The mushroom being stood on, if any. */
  shroomUnder(p: THREE.Vector3): number | null {
    for (const [i, s] of SHROOMS.entries()) if (Math.hypot(s.x - p.x, s.z - p.z) < 1.2) return i;
    return null;
  }

  boing(i: number): void {
    this.squash[i] = 1;
  }

  /** Show the mound of a buried thing (or none). */
  showMound(at: { x: number; z: number } | null): void {
    this.mound.visible = !!at;
    if (at) this.mound.position.set(at.x, this.field.heightAt(at.x, at.z), at.z);
  }

  /** The rain cloud's strength, 0 (gone) to 1, and where to hang it. */
  setCloud(on: boolean, over: THREE.Vector3): void {
    this.cloudOn += ((on ? 1 : 0) - this.cloudOn) * 0.05;
    if (!this.cloud) return;
    this.cloud.visible = this.cloudOn > 0.02;
    if (this.cloud.visible) {
      this.cloud.position.lerp(new THREE.Vector3(over.x, over.y + 10, over.z), 0.05);
      this.cloud.scale.setScalar(0.4 + this.cloudOn * 0.6);
    }
  }

  update(dt: number): void {
    this.t += dt;
    for (const [i, g] of this.glass) {
      g.rotation.y += dt * 1.2;
      g.children[0].position.y = Math.sin(this.t * 2 + i) * 0.06;
    }
    this.shrooms.forEach((m, i) => {
      this.squash[i] = Math.max(0, this.squash[i] - dt * 3);
      const k = Math.sin(this.squash[i] * Math.PI) * 0.3;
      m.scale.set(1 + k, 1 - k, 1 + k);
    });
  }
}
