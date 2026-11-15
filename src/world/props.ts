// Everything standing on the island: each kind of thing loaded once and drawn as one instanced
// mesh, however many there are. Also records what is solid, what can be sat on, and what can
// be used.
import * as THREE from 'three';
import { model } from '../assets/models';
import { Colliders } from './colliders';
import { Heightfield } from './island';
import type { Placed } from './layout';

export interface Seat {
  x: number;
  z: number;
  y: number;
  /** Which way someone sitting faces. */
  yaw: number;
  /** Height of the seat above the ground under it. */
  lift: number;
  kind: string;
}

/** How much of a thing's footprint is solid, by kind: a circle of this fraction of its width, or a box. */
const SOLID: Record<string, { circle?: number; box?: number }> = {
  'tree-pine': { circle: 0.1 },
  'tree-round': { circle: 0.09 },
  'tree-birch': { circle: 0.08 },
  'tree-palm': { circle: 0.08 },
  'rock-a': { circle: 0.42 },
  'rock-b': { circle: 0.38 },
  cliff: { circle: 0.4 },
  bush: { circle: 0.3 },
  shop: { box: 0.85 },
  arcade: { box: 0.8 },
  lighthouse: { circle: 0.42 },
  'fishing-hut': { box: 0.85 },
  'notice-board': { box: 0.8 },
  well: { circle: 0.45 },
  tent: { box: 0.85 },
  'picnic-table': { box: 0.85 },
  campfire: { circle: 0.4 },
  crates: { box: 0.85 },
  barrel: { circle: 0.45 },
  bench: { box: 0.75 },
  'lamp-post': { circle: 0.25 },
  signpost: { circle: 0.15 },
  mailbox: { circle: 0.25 },
  fence: { box: 0.9 },
};

/**
 * What moves in the wind, and how: `bend` is how far a point a metre up is pushed, and `power`
 * how the push grows with height (2: a trunk that is still at its foot and swings at its top).
 */
const SWAY: Record<string, { bend: number; power: number }> = {
  'tree-pine': { bend: 0.0022, power: 2 },
  'tree-round': { bend: 0.003, power: 2 },
  'tree-birch': { bend: 0.0036, power: 2 },
  'tree-palm': { bend: 0.0045, power: 2 },
  bush: { bend: 0.035, power: 1 },
  'grass-tuft': { bend: 0.13, power: 1 },
  flowers: { bend: 0.11, power: 1 },
  cattails: { bend: 0.1, power: 1 },
};

/** Things too small to bother casting shadows. */
const NO_SHADOW = new Set(['flowers', 'grass-tuft', 'mushrooms', 'lilypad', 'cattails', 'shell']);

export class Props {
  readonly group = new THREE.Group();
  readonly seats: Seat[] = [];
  readonly glows: THREE.Vector3[] = [];
  /** The size of each kind, as loaded. */
  readonly sizes = new Map<string, THREE.Vector3>();

  /** Trees (and cliffs) that step out of the camera's way, with where each one stands. */
  private thinnable: { inst: THREE.InstancedMesh; list: Placed[]; kept: THREE.Matrix4[]; size: THREE.Vector3; hidden: Uint8Array }[] = [];
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);

  /** The wind's clock, shared by everything that sways, and how many times a second what sways is moved (0: every frame). */
  private wind = { value: 0 };
  private gust = { value: 0 };

  constructor(private field: Heightfield, private solid: Colliders) {}

  /**
   * Let the wind move what grows. In the lo-fi look it is moved a few times a second, like the
   * islanders, not smoothly.
   */
  blow(dt: number, steps: number): void {
    this.wind.value += dt;
    this.gust.value = steps;
  }

  /** Make a material bend what it is on in the wind: each instance to its own time, from where it stands. */
  private sway(material: THREE.Material, how: { bend: number; power: number }): void {
    if (material.userData.sways) return;
    material.userData.sways = true;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = this.wind;
      shader.uniforms.uGust = this.gust;
      shader.uniforms.uBend = { value: new THREE.Vector2(how.bend, how.power) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind, uGust;\nuniform vec2 uBend;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 swayAt = instanceMatrix[3].xyz;
#else
  vec3 swayAt = vec3(0.0);
#endif
  float swayT = uGust > 0.0 ? floor(uWind * uGust) / uGust : uWind;
  float swayK = uBend.x * pow(max(transformed.y, 0.0), uBend.y);
  transformed.x += sin(swayT * 1.7 + swayAt.x * 0.9 + swayAt.z * 1.3) * swayK;
  transformed.z += cos(swayT * 1.3 + swayAt.x * 1.1 - swayAt.z * 0.7) * swayK * 0.6;`,
        );
    };
    material.needsUpdate = true;
  }

  /**
   * Hide any tree that would stand between the camera and the player, or crowd the camera
   * itself, so the view is never a wall of leaves. Trees beyond the player are left alone.
   */
  clearView(camera: THREE.Vector3, target: THREE.Vector3): void {
    const ax = target.x;
    const az = target.z;
    const bx = camera.x;
    const bz = camera.z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    for (const t of this.thinnable) {
      let changed = false;
      t.list.forEach((p, i) => {
        const s = p.scale ?? 1;
        const crown = Math.max(t.size.x, t.size.z) * 0.5 * s;
        const u = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / len2));
        const d = Math.hypot(p.x - (ax + dx * u), p.z - (az + dz * u));
        const nearCam = Math.hypot(p.x - bx, p.z - bz) < crown + 5;
        // Between the two (not right by the player), anywhere in the camera's view there: the view
        // widens away from the camera, about a third of the distance either side on an upright screen.
        const fromCam = (1 - u) * Math.sqrt(len2);
        // A tree standing just past the player but tall enough to cover them counts too.
        const between = u > 0.04 && d < crown + 0.8 + fromCam * 0.34;
        // Or standing so close that its crown is over the player.
        const over = Math.hypot(p.x - ax, p.z - az) < crown + 0.4;
        const hide = nearCam || between || over ? 1 : 0;
        if (hide !== t.hidden[i]) {
          t.hidden[i] = hide;
          t.inst.setMatrixAt(i, hide ? this.zero : t.kept[i]);
          changed = true;
        }
      });
      if (changed) t.inst.instanceMatrix.needsUpdate = true;
    }
  }

  /** Stand a thing's feet on the ground: the lowest point under its footprint, so nothing floats on a slope. */
  groundUnder(x: number, z: number, r: number): number {
    let h = this.field.heightAt(x, z);
    for (let a = 0; a < 4; a++) h = Math.min(h, this.field.heightAt(x + Math.cos(a * 1.57) * r, z + Math.sin(a * 1.57) * r));
    return h;
  }

  async add(things: Placed[], onLoaded?: () => void): Promise<void> {
    const kinds = new Map<string, Placed[]>();
    for (const t of things) {
      if (!kinds.has(t.id)) kinds.set(t.id, []);
      kinds.get(t.id)!.push(t);
    }
    await Promise.all(
      [...kinds.entries()].map(async ([id, list]) => {
        const m = await model(id);
        onLoaded?.();
        if (!m) return;
        const size = (m.userData.size as THREE.Vector3) ?? new THREE.Vector3(1, 1, 1);
        this.sizes.set(id, size);
        m.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        m.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
        });
        const mat = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        for (const mesh of meshes) {
          const geo = toFloat(mesh.geometry.clone()).applyMatrix4(mesh.matrixWorld);
          if (SWAY[id]) this.sway(mesh.material as THREE.Material, SWAY[id]);
          const inst = new THREE.InstancedMesh(geo, mesh.material, list.length);
          inst.castShadow = !NO_SHADOW.has(id);
          inst.receiveShadow = true;
          list.forEach((p, i) => {
            const s = p.scale ?? 1;
            const y = p.y ?? this.groundUnder(p.x, p.z, Math.min(size.x, size.z) * 0.3 * s);
            q.setFromAxisAngle(up, p.yaw ?? 0);
            mat.compose(new THREE.Vector3(p.x, y - 0.03 * s, p.z), q, new THREE.Vector3(s, s, s));
            inst.setMatrixAt(i, mat);
          });
          inst.computeBoundingSphere();
          inst.name = id;
          this.group.add(inst);
          if (id.startsWith('tree-') || id === 'cliff') {
            const kept: THREE.Matrix4[] = [];
            for (let i = 0; i < list.length; i++) kept.push(inst.instanceMatrix ? new THREE.Matrix4().fromArray(inst.instanceMatrix.array as Float32Array, i * 16) : new THREE.Matrix4());
            this.thinnable.push({ inst, list, kept, size, hidden: new Uint8Array(list.length) });
          }
        }
        for (const p of list) this.record(id, p, size);
      }),
    );
  }

  private record(id: string, p: Placed, size: THREE.Vector3): void {
    const s = p.scale ?? 1;
    const solid = SOLID[id];
    if (solid?.circle) this.solid.addCircle({ x: p.x, z: p.z, r: Math.max(size.x, size.z) * solid.circle * s });
    if (solid?.box) this.solid.addBox({ x: p.x, z: p.z, hw: (size.x / 2) * solid.box * s, hd: (size.z / 2) * solid.box * s, yaw: p.yaw ?? 0 });
    const y = p.y ?? this.field.heightAt(p.x, p.z);
    if (id === 'bench') this.seats.push({ x: p.x + Math.sin(p.yaw ?? 0) * 0.15, z: p.z + Math.cos(p.yaw ?? 0) * 0.15, y, yaw: p.yaw ?? 0, lift: size.y * 0.45, kind: 'bench' });
    if (id === 'log') {
      // Sit on a log facing whichever way is toward the camp's fire, or along its length otherwise.
      this.seats.push({ x: p.x, z: p.z, y, yaw: (p.yaw ?? 0) + Math.PI / 2, lift: size.y * 0.75 * s, kind: 'log' });
    }
    if (id === 'lamp-post') this.glows.push(new THREE.Vector3(p.x, y + size.y * 0.92, p.z));
  }
}

/**
 * Compressed models store positions as small integers that the node's scale turns back into
 * metres. Baking a transform into such an attribute would clamp it, so widen it to floats first.
 */
export function toFloat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.getAttribute(name) as THREE.BufferAttribute;
    if (a.array instanceof Float32Array && !(a as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
    geo.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  return geo;
}
