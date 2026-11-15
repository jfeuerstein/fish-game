// Small life, nothing to catch, only to see: crabs that scuttle off along the sand, frogs that
// plop into the pond, butterflies by day and fireflies by night, gulls on the posts that take
// off when anyone comes near, one gull at the end of the pier that does not, and rings on the
// water where fish are feeding. Everything is made in code from the island's inks and moved in
// steps. Only what is near the player is moved at all.
import * as THREE from 'three';
import { model } from '../assets/models';
import { rng } from '../core/rng';
import { type Rise, byRise, riseSpots } from '../game/rises';
import { lit } from '../look/material';
import { BEAT } from '../look/skylife';
import { type Heightfield, fishingZone, waterAt } from './island';
import { PIER, POND, floorAt } from './layout';
import { feathers, flapper } from './skyLife';
import { splatAt } from './terrain';

const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

/** A number from 0 to 1 that is the same for the same step of a clock and creature. */
const jitter = (beat: number, n: number): number => Math.abs((Math.sin((beat + n * 7.3) * 12.9898) * 43758.5453) % 1);

interface Crab {
  obj: THREE.Group;
  to: THREE.Vector2;
  wait: number;
}
interface Frog {
  obj: THREE.Group;
  home: THREE.Vector3;
  away: number;
  hop: number;
}
interface Perch {
  at: THREE.Vector3;
  sitting: THREE.Object3D | null;
  flying: { body: THREE.Group; left: THREE.Mesh; right: THREE.Mesh };
  /** Seconds it has been in the air, or -1 when it is sitting. */
  air: number;
  dir: THREE.Vector2;
}

export interface WildlifeHooks {
  ring(at: THREE.Vector3, size: number): void;
  splash(at: THREE.Vector3, amount: number): void;
  play(sound: string, opts?: { volume?: number; rate?: number }): void;
}

/** Where the gull that can be tamed keeps: the far corner of the pier head. */
export const PIER_GULL = new THREE.Vector3(PIER.head.x1 - 0.8, PIER.deck, PIER.head.z1 - 0.9);

export class Wildlife {
  readonly group = new THREE.Group();
  private crabs: Crab[] = [];
  private frogs: Frog[] = [];
  private flutter: { obj: THREE.Group; home: THREE.Vector3; a: number }[] = [];
  private flies: THREE.InstancedMesh;
  private flySeeds: number[] = [];
  private perches: Perch[] = [];
  private rises: Rise[] = [];
  private riseTurn = -1;
  private riseDue: number[] = [];
  private jumper: THREE.Mesh;
  private jump = { t: -1, at: new THREE.Vector3() };
  private clock = 0;
  private m = new THREE.Matrix4();
  /** The gull at the end of the pier, sitting and flying. */
  private own: { sitting: THREE.Object3D | null; flying: ReturnType<typeof flapper>; pos: THREE.Vector3; flyingNow: boolean } | null = null;
  private wings = feathers();

  constructor(private field: Heightfield, private hooks: WildlifeHooks) {
    const r = rng(60606);
    // Crabs: on dry sand near the water.
    const shell = lit({ color: 0xd65a3c });
    const dark = lit({ color: 0x10181f });
    for (let tries = 0; this.crabs.length < 7 && tries < 4000; tries++) {
      const x = (r() * 2 - 1) * 100;
      const z = (r() * 2 - 1) * 100;
      if (!this.onSand(x, z) || this.crabs.some((c) => Math.hypot(c.obj.position.x - x, c.obj.position.z - z) < 6)) continue;
      const obj = new THREE.Group();
      obj.add(box(0.26, 0.1, 0.18, 0, 0.09, 0, shell), box(0.09, 0.07, 0.09, 0.17, 0.11, 0.07, shell), box(0.09, 0.07, 0.09, -0.17, 0.11, 0.07, shell), box(0.04, 0.06, 0.04, 0.06, 0.17, 0.07, dark), box(0.04, 0.06, 0.04, -0.06, 0.17, 0.07, dark));
      obj.position.set(x, field.heightAt(x, z), z);
      this.group.add(obj);
      this.crabs.push({ obj, to: new THREE.Vector2(x, z), wait: r() * 4 });
    }
    // Frogs: round the pond's rim, facing the water.
    const skin = lit({ color: 0x93b85a });
    const stripe = lit({ color: 0x35633a });
    const white = lit({ color: 0xfffdf6 });
    const belly = lit({ color: 0xcbdc8e });
    for (let i = 0; i < 16 && this.frogs.length < 5; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      // Out from the middle of the pond to the first dry ground, and a step further.
      let d: number = POND.r - 4;
      while (d < POND.r + 5 && waterAt(field, POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d)) d += 0.25;
      d += 0.35;
      const x = POND.x + Math.cos(a) * d;
      const z = POND.z + Math.sin(a) * d;
      const y = field.heightAt(x, z);
      if (waterAt(field, x, z) || y > POND.level + 1.2 || i % 3 === 1) continue;
      const obj = new THREE.Group();
      obj.add(
        box(0.26, 0.15, 0.3, 0, 0.11, 0, skin),
        box(0.22, 0.05, 0.26, 0, 0.03, 0, belly),
        box(0.1, 0.04, 0.3, 0, 0.19, 0, stripe),
        box(0.09, 0.09, 0.09, 0.09, 0.22, 0.1, white),
        box(0.09, 0.09, 0.09, -0.09, 0.22, 0.1, white),
        box(0.05, 0.06, 0.03, 0.09, 0.22, 0.15, dark),
        box(0.05, 0.06, 0.03, -0.09, 0.22, 0.15, dark),
      );
      obj.position.set(x, y, z);
      obj.rotation.y = Math.atan2(POND.x - x, POND.z - z);
      this.group.add(obj);
      this.frogs.push({ obj, home: obj.position.clone(), away: 0, hop: -1 });
    }
    // Butterflies: over open grass, a pair of wings each.
    for (let tries = 0; this.flutter.length < 9 && tries < 3000; tries++) {
      const x = (r() * 2 - 1) * 70;
      const z = (r() * 2 - 1) * 70;
      if (!this.onGrass(x, z) || this.flutter.some((f) => Math.hypot(f.home.x - x, f.home.z - z) < 8)) continue;
      const paint = new THREE.MeshBasicMaterial({ color: [0xf8e6b0, 0xf2a8b0, 0xc6e4f4, 0xf08c62][this.flutter.length % 4], side: THREE.DoubleSide });
      const obj = new THREE.Group();
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2).translate(0.08, 0, 0).rotateX(-Math.PI / 2), paint);
      const rr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2).translate(-0.08, 0, 0).rotateX(-Math.PI / 2), paint);
      obj.add(l, rr, box(0.03, 0.03, 0.2, 0, 0, 0, dark));
      this.group.add(obj);
      this.flutter.push({ obj, home: new THREE.Vector3(x, field.heightAt(x, z) + 0.8, z), a: r() * 6 });
    }
    // Fireflies: a handful of lights kept round the player after dark.
    this.flies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0xf8e6b0, fog: false }), 28);
    this.flies.frustumCulled = false;
    this.flies.visible = false;
    for (let i = 0; i < 28; i++) this.flySeeds.push(r() * 1000);
    this.group.add(this.flies);
    // A fish that jumps where fish are rising: a small dark shape.
    this.jumper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: 0x2b4250 }));
    this.jumper.visible = false;
    this.group.add(this.jumper);
  }

  private onSand(x: number, z: number): boolean {
    const y = this.field.heightAt(x, z);
    return y > 0.25 && y < 1.6 && splatAt(this.field, x, z)[0] > 0.75 && !waterAt(this.field, x, z) && floorAt(x, z) === null;
  }

  private onGrass(x: number, z: number): boolean {
    const y = this.field.heightAt(x, z);
    const [sand, earth, rock, cobble] = splatAt(this.field, x, z);
    return y > 1 && sand < 0.2 && earth < 0.3 && rock < 0.2 && cobble < 0.1 && !waterAt(this.field, x, z);
  }

  /** Stand gulls on the tops of things (given as places), and the one that can be tamed at the end of the pier. */
  async perch(tops: THREE.Vector3[]): Promise<void> {
    for (const at of [...tops, PIER_GULL]) {
      const sitting = await model('gull', 0.5);
      const flying = flapper(this.wings);
      flying.body.scale.setScalar(1.1);
      flying.body.visible = false;
      this.group.add(flying.body);
      if (sitting) {
        sitting.position.copy(at);
        sitting.rotation.y = at.x * 1.7;
        this.group.add(sitting);
      }
      if (at === PIER_GULL) this.own = { sitting, flying, pos: at.clone(), flyingNow: false };
      else this.perches.push({ at, sitting, flying, air: -1, dir: new THREE.Vector2(1, 0) });
    }
  }

  /** Where the pier's gull is now. */
  get gullAt(): THREE.Vector3 | null {
    return this.own?.pos ?? null;
  }

  /** Whether a bobber at a place is by fish that are rising. */
  byRise(x: number, z: number): boolean {
    return byRise(this.rises, x, z);
  }

  /**
   * `night` and `rain` run 0 to 1. `tame` says the pier's gull follows the player, and `follow`
   * that it may now (not while the player is in the boat or indoors).
   */
  update(dt: number, player: THREE.Vector3, night: number, rain: number, turn: number, tame: boolean, follow: boolean): void {
    this.clock += dt;
    const beat = Math.floor(this.clock * 8);
    const near = (x: number, z: number, d: number): boolean => Math.hypot(x - player.x, z - player.z) < d;

    for (const [n, c] of this.crabs.entries()) {
      const p = c.obj.position;
      c.obj.visible = near(p.x, p.z, 45);
      if (!c.obj.visible) continue;
      const scared = near(p.x, p.z, 2.4);
      c.wait -= dt;
      if (scared || c.wait <= 0) {
        // Somewhere new on the sand: away from the player if they are close, anywhere otherwise.
        const a = scared ? Math.atan2(p.z - player.z, p.x - player.x) + (jitter(beat, n) - 0.5) : jitter(beat, n) * Math.PI * 2;
        const far = scared ? 3 : 1 + jitter(beat, n + 3) * 2;
        const x = p.x + Math.cos(a) * far;
        const z = p.z + Math.sin(a) * far;
        if (this.onSand(x, z)) c.to.set(x, z);
        c.wait = scared ? 0.4 : 2 + jitter(beat, n + 5) * 4;
      }
      const dx = c.to.x - p.x;
      const dz = c.to.y - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const step = Math.min(d, (scared ? 3.2 : 1.1) * dt);
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        p.y = this.field.heightAt(p.x, p.z) + (beat % 2 ? 0.02 : 0);
        // A crab goes sideways.
        c.obj.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
      }
    }

    for (const f of this.frogs) {
      if (f.away > 0) {
        f.away -= dt;
        if (f.away <= 0 && !near(f.home.x, f.home.z, 9)) {
          f.obj.position.copy(f.home);
          f.obj.visible = true;
        } else if (f.away <= 0) f.away = 2;
        continue;
      }
      if (f.hop >= 0) {
        // In the air on its way to the water.
        f.hop += dt / 0.5;
        const k = Math.min(1, f.hop);
        const tox = POND.x + (f.home.x - POND.x) * 0.72;
        const toz = POND.z + (f.home.z - POND.z) * 0.72;
        f.obj.position.set(f.home.x + (tox - f.home.x) * k, f.home.y + Math.sin(k * Math.PI) * 0.6 - (f.home.y - POND.level) * k, f.home.z + (toz - f.home.z) * k);
        if (k >= 1) {
          const at = new THREE.Vector3(tox, POND.level + 0.02, toz);
          this.hooks.ring(at, 0.8);
          this.hooks.splash(at, 0.15);
          this.hooks.play('plop', { volume: 0.4, rate: 1.2 });
          f.obj.visible = false;
          f.hop = -1;
          f.away = 22;
        }
      } else if (near(f.home.x, f.home.z, 2.3)) f.hop = 0;
    }

    const day = night < 0.4 && rain < 0.3;
    for (const [n, b] of this.flutter.entries()) {
      b.obj.visible = day && near(b.home.x, b.home.z, 40);
      if (!b.obj.visible) continue;
      b.a += dt * (0.5 + (n % 3) * 0.15);
      b.obj.position.set(b.home.x + Math.cos(b.a) * 1.6 + Math.sin(b.a * 2.3) * 0.5, b.home.y + Math.sin(b.a * 1.7) * 0.3, b.home.z + Math.sin(b.a) * 1.6);
      b.obj.rotation.y = -b.a;
      const up = (beat + n) % 2 ? 1.15 : 0.3;
      b.obj.children[0].rotation.z = up;
      b.obj.children[1].rotation.z = -up;
    }

    this.flies.visible = night > 0.6 && rain < 0.3;
    if (this.flies.visible) {
      for (let i = 0; i < 28; i++) {
        const s = this.flySeeds[i];
        // Each drifts about a place of its own in a box that goes with the player, and blinks.
        const x = Math.round(player.x / 6) * 6 + ((s * 7.1) % 26) - 13 + Math.sin(this.clock * 0.3 + s) * 1.2;
        const z = Math.round(player.z / 6) * 6 + ((s * 3.7) % 26) - 13 + Math.cos(this.clock * 0.25 + s * 2) * 1.2;
        const lit = jitter(Math.floor(this.clock * 2 + s), i) > 0.45 && !waterAt(this.field, x, z);
        const size = lit ? 1 : 0;
        this.m.makeScale(size, size, size);
        this.m.setPosition(x, this.field.heightAt(x, z) + 0.6 + ((s * 1.3) % 1.4) + Math.sin(this.clock * 0.6 + s) * 0.2, z);
        this.flies.setMatrixAt(i, this.m);
      }
      this.flies.instanceMatrix.needsUpdate = true;
    }

    // Gulls on the posts: off when someone comes close, back when they have gone.
    for (const [n, p] of this.perches.entries()) {
      const close = near(p.at.x, p.at.z, 4.5) && player.y > p.at.y - 6;
      if (p.air < 0) {
        if (close) {
          p.air = 0;
          p.dir.set(p.at.x - player.x, p.at.z - player.z).normalize();
          if (p.sitting) p.sitting.visible = false;
          p.flying.body.visible = true;
        }
      } else {
        p.air += dt;
        const b = p.flying.body;
        b.position.set(p.at.x + p.dir.x * p.air * 7, p.at.y + 0.3 + p.air * 3.2, p.at.z + p.dir.y * p.air * 7);
        b.rotation.y = Math.atan2(p.dir.x, p.dir.y);
        const w = BEAT[(beat + n) % BEAT.length];
        p.flying.left.rotation.z = w;
        p.flying.right.rotation.z = -w;
        if (p.air > 5) b.visible = false;
        if (p.air > 30 && !near(p.at.x, p.at.z, 16)) {
          p.air = -1;
          b.visible = false;
          if (p.sitting) p.sitting.visible = true;
        }
      }
    }

    // The pier's gull: where it sits until it is tame, and beside the player after.
    if (this.own) {
      const o = this.own;
      const goal = tame && follow ? new THREE.Vector3(player.x - 1.2, player.y, player.z + 0.9) : PIER_GULL;
      const d = o.pos.distanceTo(goal);
      // Far behind, it flies to catch up; close, it hops.
      if (d > 5) o.flyingNow = true;
      if (o.flyingNow) {
        o.pos.lerp(goal, 1 - Math.exp(-dt * 2.4));
        o.pos.y = Math.max(o.pos.y, goal.y + Math.min(2.5, d * 0.5));
        if (d < 1.2) o.flyingNow = false;
      } else if (d > 0.9) {
        o.pos.lerp(goal, 1 - Math.exp(-dt * 3));
        o.pos.y = goal.y + (beat % 2 ? 0.08 : 0);
      } else o.pos.y = goal.y;
      const yaw = Math.atan2(goal.x - o.pos.x, goal.z - o.pos.z);
      if (o.sitting) {
        o.sitting.visible = !o.flyingNow;
        o.sitting.position.copy(o.pos);
        if (d > 0.9) o.sitting.rotation.y = yaw;
      }
      o.flying.body.visible = o.flyingNow;
      o.flying.body.position.copy(o.pos);
      o.flying.body.rotation.y = yaw;
      const w = BEAT[beat % BEAT.length];
      o.flying.left.rotation.z = w;
      o.flying.right.rotation.z = -w;
    }

    // Fish rising: new places every so often, a ring at each now and then, and the odd jump.
    if (turn !== this.riseTurn) {
      this.riseTurn = turn;
      const reach = (x: number, z: number): boolean => {
        for (let a = 0; a < 8; a++) {
          const sx = x + Math.cos(a * 0.785) * 9;
          const sz = z + Math.sin(a * 0.785) * 9;
          if (floorAt(sx, sz) !== null || (this.field.heightAt(sx, sz) > 0.3 && !waterAt(this.field, sx, sz))) return true;
        }
        return false;
      };
      this.rises = riseSpots(turn, (x, z) => fishingZone(this.field, x, z) !== null, reach);
      this.riseDue = this.rises.map((_, i) => 1 + i * 0.7);
    }
    for (const [i, s] of this.rises.entries()) {
      this.riseDue[i] -= dt;
      if (this.riseDue[i] > 0) continue;
      this.riseDue[i] = 2 + jitter(beat, i) * 3.5;
      if (!near(s.x, s.z, 55)) continue;
      const level = waterAt(this.field, s.x, s.z)?.level ?? 0;
      const at = new THREE.Vector3(s.x + (jitter(beat, i + 2) - 0.5) * 1.6, level + 0.02, s.z + (jitter(beat, i + 4) - 0.5) * 1.6);
      this.hooks.ring(at, 1.1);
      this.hooks.ring(at, 0.5);
      if (jitter(beat, i + 9) > 0.72 && this.jump.t < 0) {
        this.jump.t = 0;
        this.jump.at.copy(at);
      }
    }
    if (this.jump.t >= 0) {
      this.jump.t += dt / 0.7;
      const k = this.jump.t;
      this.jumper.visible = k < 1;
      this.jumper.position.set(this.jump.at.x + k * 0.6, this.jump.at.y + Math.sin(k * Math.PI) * 0.55, this.jump.at.z);
      this.jumper.rotation.z = (0.5 - k) * 2.2;
      if (k >= 1) {
        this.hooks.splash(new THREE.Vector3(this.jump.at.x + 0.6, this.jump.at.y, this.jump.at.z), 0.12);
        this.jump.t = -1;
      }
    }
  }
}
