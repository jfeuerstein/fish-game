// What Thistledown and Sandglass Key have that is made here, not from a model: the tops of
// the cloud the one stands above, the wind coming up out of its ground, its kites; and the
// other's pools of soft sand, going slowly round. Each returns what moves it, to be called
// with the world's clock. Everything is in the inks and moves in steps.
import * as THREE from 'three';
import { rng } from '../core/rng';
import { lit } from '../look/material';
import { SINKS } from './dune';
import type { Heightfield } from './island';
import { MILL, PIER, VENTS } from './layout';
import { SKY, skyShore } from './thistle';

type Moves = (clock: number) => void;
const UP = new THREE.Vector3(0, 1, 0);

/** The sea of cloud: lumps of it standing out of the flat white, all the way to the horizon. */
function cloudTops(group: THREE.Group): Moves {
  const r = rng(71);
  const n = 190;
  // (They hold some light of their own: lit only by a low sun, their shaded sides were dark holes in the white.)
  const tops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lit({ color: 0xfffdf6, emissive: 0x8f7f86 }), n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let made = 0;
  for (let tries = 0; made < n && tries < 4000; tries++) {
    const a = r() * Math.PI * 2;
    // Thick round the island's foot, thinner far out.
    const out = 5 + Math.pow(r(), 1.6) * 330;
    const d = skyShore(a) + out;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    // Not where the boat lies, nor on its way out.
    if (x > PIER.x0 - 6 && x < 130 && Math.abs(z - 16) < 26) continue;
    const size = 3 + r() * 6 + out * 0.035;
    q.setFromAxisAngle(UP, r() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, -size * 0.2, z), q, new THREE.Vector3(size * (1 + r() * 0.8), size * 0.42, size * (1 + r() * 0.8)));
    tops.setMatrixAt(made++, m);
  }
  tops.count = made;
  tops.receiveShadow = true;
  group.add(tops);
  // The whole of it breathes, a hand's width, in steps.
  return (clock) => {
    tops.position.y = Math.round(Math.sin(clock * 0.5) * 3) * 0.06;
  };
}

/** Where the wind comes up: a pale ring on the ground and flecks going up in a spiral over it. */
function updrafts(group: THREE.Group, field: Heightfield): Moves {
  const each = 16;
  const tall = 15;
  const flecks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xfffdf6 }), VENTS.length * each);
  const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(1.25, 0.07, 4, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf4eee3 }), VENTS.length);
  const m = new THREE.Matrix4();
  const foot = VENTS.map((v) => field.heightAt(v.x, v.z));
  for (const [i, v] of VENTS.entries()) ring.setMatrixAt(i, m.makeTranslation(v.x, foot[i] + 0.06, v.z));
  group.add(flecks, ring);
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  return (clock) => {
    // Twelve times a second, as everything here moves.
    const t = Math.floor(clock * 12) / 12;
    for (const [i, v] of VENTS.entries())
      for (let k = 0; k < each; k++) {
        const up = ((t * 4.2 + (k / each) * tall + i * 3.1) % tall + tall) % tall;
        const a = k * 2.4 + up * 0.85 + i;
        const wide = 0.35 + up * 0.075;
        // Each grows as it leaves the ground and thins out at the top.
        const size = Math.min(1, up * 0.8) * (1 - up / tall) * 1.6 + 0.2;
        p.set(v.x + Math.cos(a) * wide, foot[i] + 0.2 + up, v.z + Math.sin(a) * wide);
        m.compose(p, q.setFromAxisAngle(UP, a), s.setScalar(size));
        flecks.setMatrixAt(i * each + k, m);
      }
    flecks.instanceMatrix.needsUpdate = true;
  };
}

/** Kites, each on a line from a post: a diamond with a tail of bows, tugging about in steps. */
function kites(group: THREE.Group, field: Heightfield): Moves {
  const at: { x: number; z: number; ink: number; tail: number; lean: number }[] = [
    { x: MILL.x + 7.5, z: MILL.z + 6.5, ink: 0xd65a3c, tail: 0xf8e6b0, lean: 0.6 },
    { x: 14, z: 30, ink: 0xecc77d, tail: 0xd65a3c, lean: 2.4 },
    { x: SKY.spire.x + 7.8, z: SKY.spire.z - 3.4, ink: 0x62c0b0, tail: 0xfffdf6, lean: 4.1 },
  ];
  const wood = lit({ color: 0x7d5436 });
  const flying: { kite: THREE.Group; line: THREE.Line; post: THREE.Vector3; lean: number; high: number }[] = [];
  for (const k of at) {
    const y = field.heightAt(k.x, k.z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), wood);
    post.position.set(k.x, y + 0.65, k.z);
    post.castShadow = true;
    const kite = new THREE.Group();
    // The diamond, seen from both sides, with a cross of sticks.
    const shape = new THREE.Shape().moveTo(0, 0.9).lineTo(0.62, 0.15).lineTo(0, -0.9).lineTo(-0.62, 0.15).closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: k.ink, side: THREE.DoubleSide }));
    kite.add(sail);
    for (let b = 0; b < 4; b++) {
      const bow = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: k.tail }));
      bow.position.set(0, -1.2 - b * 0.5, 0);
      bow.scale.set(1.6, 0.7, 0.5);
      kite.add(bow);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xf4eee3 }));
    line.frustumCulled = false;
    group.add(post, kite, line);
    flying.push({ kite, line, post: new THREE.Vector3(k.x, y + 1.3, k.z), lean: k.lean, high: 9 + (k.x % 3) });
  }
  return (clock) => {
    const t = Math.floor(clock * 6) / 6;
    for (const [i, f] of flying.entries()) {
      const sway = Math.sin(t * 0.7 + i * 2) * 1.6;
      const lift = Math.sin(t * 1.1 + i) * 0.7;
      f.kite.position.set(f.post.x + Math.cos(f.lean) * (5 + sway * 0.4) - Math.sin(f.lean) * sway, f.post.y + f.high + lift, f.post.z + Math.sin(f.lean) * (5 + sway * 0.4) + Math.cos(f.lean) * sway);
      f.kite.rotation.set(-0.5, -f.lean + Math.PI / 2 + sway * 0.12, sway * 0.1);
      // The tail swings behind the diamond.
      for (let b = 1; b < f.kite.children.length; b++) f.kite.children[b].position.x = Math.sin(t * 2 + b * 0.9 + i) * 0.1 * b;
      const pts = f.line.geometry.attributes.position as THREE.BufferAttribute;
      pts.setXYZ(0, f.post.x, f.post.y, f.post.z);
      pts.setXYZ(1, f.kite.position.x, f.kite.position.y - 0.2, f.kite.position.z);
      pts.needsUpdate = true;
    }
  };
}

/** Rings wound round a middle, drawn as pixels: a pool seen from above, in whatever inks it is given. */
function rings(inks: string[], middle: string): THREE.Material {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2;
      const dy = y + 0.5 - size / 2;
      const d = Math.hypot(dx, dy) / (size / 2);
      // A spiral: the rings are wound round the middle, which is darkest.
      const turn = Math.atan2(dy, dx) / (Math.PI * 2);
      const band = Math.floor((d * 4.2 + turn + 6) * 1.5) % inks.length;
      g.fillStyle = d < 0.14 ? middle : inks[band];
      g.fillRect(x, y, 1, 1);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.colorSpace = THREE.SRGBColorSpace;
  return lit({ map });
}

/** The Aerie: the one water on Thistledown that is water, so it is drawn here in its own colours (the island's water is cloud). */
function aerie(group: THREE.Group): Moves {
  const pool = new THREE.Mesh(new THREE.CircleGeometry(SKY.aerie.r + 1.4, 28).rotateX(-Math.PI / 2), rings(['#2c8a8a', '#62c0b0', '#2c8a8a', '#3f86c8', '#62c0b0', '#b4e4d4'], '#1b5a66'));
  pool.position.set(SKY.aerie.x, SKY.aerie.level + 0.03, SKY.aerie.z);
  pool.receiveShadow = true;
  pool.renderOrder = 1;
  group.add(pool);
  // The wind keeps it moving.
  return (clock) => {
    pool.rotation.y = Math.floor(clock * 5) * (Math.PI / 48);
  };
}

/** A pool of soft sand: rings of two sands, going slowly round as if something under them were stirring. */
function sinks(group: THREE.Group): Moves {
  const sand = rings(['#c8963e', '#ecc77d', '#96691f', '#ecc77d', '#c8963e', '#f8e6b0'], '#5e3f12');
  const discs: THREE.Mesh[] = [];
  for (const p of SINKS) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r + 0.7, 28).rotateX(-Math.PI / 2), sand);
    disc.position.set(p.x, p.level, p.z);
    disc.receiveShadow = true;
    disc.renderOrder = 1;
    group.add(disc);
    discs.push(disc);
  }
  // Round a sixteenth of a turn at a time, five times a second.
  return (clock) => {
    for (const [i, d] of discs.entries()) d.rotation.y = -Math.floor(clock * 5 + i * 3) * (Math.PI / 40);
  };
}

/** Thistledown's, and what moves them. */
export function dressSky(group: THREE.Group, field: Heightfield): Moves[] {
  return [cloudTops(group), updrafts(group, field), kites(group, field), aerie(group)];
}

/** Sandglass Key's. */
export function dressDune(group: THREE.Group): Moves[] {
  return [sinks(group)];
}
