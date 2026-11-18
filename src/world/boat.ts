// The rowboat: tied up by the pier until the player has a licence and climbs in. Rowed with the
// stick, it glides on, turns gently, and keeps to water deep enough to float in. It goes bow
// first, and is rowed with its oars: whoever rows sits on the bench with their back to the bow
// and pulls (src/world/hull.ts has the rules: which end is which, where the oars sit, and
// where an oar is in its stroke).
import * as THREE from 'three';
import { model } from '../assets/models';
import { Heightfield, floatable } from './island';
import { BOAT_MOORING } from './layout';
import { heading } from '../player/steer';
import { lit } from '../look/material';
import { type Hull, OAR, STROKE_RATE, oarAt, readHull } from './hull';

/** How many times a second the oars are moved: as often as whoever is rowing is (movement on twos). */
const STEPS = 12;

/** An oar, lying along +x from its handle to its blade, turning about the place where it rests on the rim. */
function oar(): THREE.Group {
  const wood = lit({ color: 0xa97c52 });
  const pale = lit({ color: 0xcfa57a });
  const whole = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(OAR.inn + OAR.out - 0.4, 0.055, 0.055), wood);
  shaft.position.x = (OAR.out - 0.4 - OAR.inn) / 2;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.2), pale);
  blade.position.x = OAR.out - 0.25;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), pale);
  grip.position.x = -OAR.inn + 0.08;
  // A collar where it sits in its lock.
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.085, 0.085), lit({ color: 0x474e54 }));
  for (const part of [shaft, blade, grip, collar]) part.castShadow = true;
  whole.add(shaft, blade, grip, collar);
  return whole;
}

/** How far an oar is swung back to lie along the rim when nobody is rowing, and how far below a seat's top a sitter's own place is (as on a bench). */
const SHIPPED = 1.32;
const SAT = 0.36;

export class Boat {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3(BOAT_MOORING.x, 0, BOAT_MOORING.z);
  yaw: number = BOAT_MOORING.yaw;
  private vel = new THREE.Vector2();
  private t = 0;
  aboard = false;
  /** How hard the player is rowing, 0 to 1, for their pose and the sound. */
  effort = 0;
  /** Where the oars are in their stroke: it goes round once a stroke (`oarAt` in hull.ts), in steps. */
  stroke = 0;
  /** Called as the blades go in, with where each does: for the splash and the sound. */
  onCatch: ((blades: THREE.Vector3[]) => void) | null = null;
  private hull: Hull = { bow: 1, z0: -1.5, z1: 1.5, half: 0.8, floor: 0.4, seat: { z: 0.3, y: 0.65 }, lock: { z: -0.1, x: 0.78, y: 0.78 } };
  /** The oars: starboard's and port's, each on its place on the rim. */
  private oars: THREE.Group[] = [];
  private strokeAt = 0;

  constructor(private field: Heightfield) {}

  async load(scene: THREE.Scene): Promise<void> {
    const m = await model('rowboat', 1.0);
    if (m) {
      // Long way along +z, like everything else that faces forward: and bow first.
      const size = m.userData.size as THREE.Vector3;
      if (size && size.x > size.z) m.rotation.y = Math.PI / 2;
      if (this.read(m).bow < 0) m.rotation.y += Math.PI;
      this.hull = this.read(m);
      this.group.add(m);
      for (const side of [1, -1]) {
        const o = oar();
        // (Port's is starboard's turned about: its blade the other way out.)
        const holder = new THREE.Group();
        holder.position.set(side * (this.hull.lock.x - 0.04), this.hull.lock.y + 0.03, this.hull.lock.z);
        if (side < 0) o.rotation.y = Math.PI;
        holder.add(o);
        this.group.add(holder);
        this.oars.push(holder);
      }
    }
    scene.add(this.group);
    this.sync();
  }

  /**
   * The model's shape, as it stands now: read from points all over its surface, not only its
   * corners (a flat floor is two great triangles, with no corner anywhere near its middle).
   */
  private read(m: THREE.Object3D): Hull {
    m.updateMatrixWorld(true);
    const points: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.getIndex();
      const count = index ? index.count : pos.count;
      const corner = (v: THREE.Vector3, i: number): THREE.Vector3 => v.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      for (let i = 0; i + 2 < count; i += 3) {
        corner(a, i);
        corner(b, i + 1);
        corner(c, i + 2);
        // A point every few centimetres across the triangle.
        const n = Math.min(16, Math.max(1, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / 0.07)));
        for (let u = 0; u <= n; u++)
          for (let v = 0; u + v <= n; v++) {
            const w = n - u - v;
            points.push((a.x * u + b.x * v + c.x * w) / n, (a.y * u + b.y * v + c.y * w) / n, (a.z * u + b.z * v + c.z * w) / n);
          }
      }
    });
    return readHull(points);
  }

  /** Close enough to the mooring to climb in or out. */
  nearMooring(p: THREE.Vector3): boolean {
    return Math.hypot(p.x - BOAT_MOORING.x, p.z - (BOAT_MOORING.z - 2.4)) < 3.2;
  }

  /** Back to its mooring. */
  tieUp(): void {
    this.pos.set(BOAT_MOORING.x, 0, BOAT_MOORING.z);
    this.yaw = BOAT_MOORING.yaw;
    this.vel.set(0, 0);
    this.aboard = false;
  }

  update(dt: number, stick: { x: number; y: number }, cameraYaw: number): void {
    this.t += dt;
    if (this.aboard) {
      const push = Math.min(1, Math.hypot(stick.x, stick.y));
      this.effort += (push - this.effort) * (1 - Math.exp(-dt * 4));
      if (push > 0.1) {
        const want = heading(stick, cameraYaw);
        let turn = want - this.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        this.yaw += turn * (1 - Math.exp(-dt * 1.8));
        // Pull forward along the boat's own heading: hardest while the blades are in the water.
        const accel = 3.2 * push * Math.max(0, Math.cos(turn)) * (0.55 + 0.9 * oarAt(this.stroke, 1).pull);
        this.vel.x += Math.sin(this.yaw) * accel * dt;
        this.vel.y += Math.cos(this.yaw) * accel * dt;
      }
      // Water drag.
      this.vel.multiplyScalar(Math.exp(-dt * 0.8));
      const max = 5;
      if (this.vel.length() > max) this.vel.setLength(max);
      const nx = this.pos.x + this.vel.x * dt;
      const nz = this.pos.z + this.vel.y * dt;
      if (floatable(this.field, nx, nz)) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else {
        // Bump: a soft stop against the shore or the pier.
        this.vel.multiplyScalar(-0.2);
      }
      // The stroke goes round while there is any rowing, and comes to rest between strokes when there is none.
      if (this.effort > 0.06) this.strokeAt += dt * STROKE_RATE;
      const was = this.stroke;
      this.stroke = (Math.floor((this.strokeAt / STROKE_RATE) * STEPS) / STEPS) * STROKE_RATE;
      const turns = (a: number): number => Math.floor(a / (Math.PI * 2));
      if (turns(this.stroke) !== turns(was) && this.effort > 0.25) this.onCatch?.(this.blades());
    } else this.effort = 0;
    this.sync();
  }

  get speed(): number {
    return this.vel.length();
  }

  private sync(): void {
    this.group.position.set(this.pos.x, Math.sin(this.t * 1.3) * 0.05 - 0.15, this.pos.z);
    this.group.rotation.set(Math.sin(this.t * 1.1) * 0.03, this.yaw, Math.sin(this.t * 0.9) * 0.04);
    // The oars: rowed when somebody is aboard, and lying back along the rim when nobody is.
    const at = oarAt(this.stroke, Math.min(1, this.effort * 1.4));
    for (const [i, o] of this.oars.entries()) {
      const side = i === 0 ? 1 : -1;
      const sweep = this.aboard ? at.sweep : SHIPPED;
      const dip = this.aboard ? at.dip : 0.03;
      // Swung about the upright, then tipped about the boat's length: starboard's blade goes down as port's does.
      o.rotation.set(0, side * sweep * this.hull.bow, -side * dip, 'YZX');
    }
  }

  /** Where each blade is, in the world. */
  blades(): THREE.Vector3[] {
    this.group.updateMatrixWorld(true);
    return this.oars.map((o) => o.children[0].localToWorld(new THREE.Vector3(OAR.out - 0.2, 0, 0)));
  }

  /** Where the rower sits: on the bench, whose top is a seat's height above where their feet would be. */
  seat(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0, this.hull.seat.y - SAT, this.hull.seat.z));
  }

  /** Which way the rower faces: the stern, as anyone rowing does. */
  get facing(): number {
    return this.yaw + (this.hull.bow > 0 ? Math.PI : 0);
  }
}
