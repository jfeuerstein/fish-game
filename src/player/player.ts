// The player on foot: walks where the stick points (as the camera sees it), kept out of deep
// water and solid things, standing on the ground or the pier's boards.
import * as THREE from 'three';
import { Colliders } from '../world/colliders';
import { Heightfield, standHeight, walkable, waterAt } from '../world/island';
import { floorAt, walled } from '../world/layout';
import { UPDRAFT } from '../game/isles';
import type { Character } from './character';
import { heading } from './steer';
import { BALLOONS, CLOUD, POGO, SKATE, SLED, STILTS, type Gear } from '../game/toys';

export const WALK_SPEED = 3.0;
export const RUN_SPEED = 5.4;

export class Player {
  readonly pos = new THREE.Vector3();
  yaw = 0;
  private speed = 0;
  private stepClock = 0;
  /** Called on each footstep with what was underfoot. */
  onStep: ((surface: 'grass' | 'wood' | 'water') => void) | null = null;
  /** Whether the player is free to walk (not sitting, fishing, rowing...). */
  free = true;
  /** Up and down speed while in the air. */
  private vy = 0;
  /** A push carried through the air (from a bounce mushroom). */
  private fling = new THREE.Vector2();
  airborne = false;
  /** What is being ridden, if anything (src/game/toys.ts): it changes how the player moves. */
  gear: Gear | null = null;
  /** On a pogo stick: the next bounce is the big one. With balloons: puffs of lift used this flight. */
  private big = false;
  private pumps = 0;
  /** Taken up by an updraft (Thistledown): down again slowly, steered, until the feet touch. */
  lofted = false;
  /** On a skateboard: how hard the back foot is pushing, 0 to 1. */
  pushing = 0;
  /** Where the player last stood on firm ground, to go back to after a jump into deep water. */
  private lastFirm = new THREE.Vector3();
  /** Called on landing, with how hard. */
  onLand: ((speed: number) => void) | null = null;

  constructor(readonly body: Character, private field: Heightfield, readonly solid: Colliders) {}

  /** Hop. On a skateboard, an ollie; on a pogo stick, the next bounce is a great one; with balloons, up and away (and a little more lift twice in the air). */
  jump(): void {
    if (!this.free) return;
    if (this.gear === 'pogo') {
      this.big = true;
      return;
    }
    if (this.airborne) {
      if (this.gear === 'balloons' && this.pumps < BALLOONS.pumps) {
        this.pumps++;
        this.vy = Math.max(this.vy, 0) + BALLOONS.pump;
      }
      return;
    }
    // (Nobody jumps on stilts, or off a cloud.)
    if (this.gear === 'stilts' || this.gear === 'cloud') return;
    this.vy = this.gear === 'skate' ? SKATE.ollie : this.gear === 'balloons' ? BALLOONS.lift : this.gear === 'sled' ? 3.2 : 5.6;
    this.pumps = 0;
    this.airborne = true;
  }

  /** Stop dead (a trick that was not landed). */
  stop(): void {
    this.speed = 0;
  }

  /** Thrown into the air by a bounce mushroom. */
  launch(up: number, yaw: number, forward: number): void {
    this.vy = up;
    this.fling.set(Math.sin(yaw) * forward, Math.cos(yaw) * forward);
    this.airborne = true;
  }

  /** Taken up by the wind: a long way up, and gently down. */
  loft(): void {
    this.vy = UPDRAFT.up;
    this.fling.set(0, 0);
    this.airborne = true;
    this.lofted = true;
  }

  /** Somewhere to come back to: dry ground, or boards (the pier is over water, and is as firm as anywhere). */
  private firm(): boolean {
    return floorAt(this.pos.x, this.pos.z) !== null || !waterAt(this.field, this.pos.x, this.pos.z);
  }

  /** Off a cloud over water: back to where the feet last were. */
  ashore(): void {
    if (walkable(this.field, this.pos.x, this.pos.z)) return;
    this.pos.copy(this.lastFirm);
    this.speed = 0;
    this.sync();
  }

  /** What a cloud rides over at a place: the ground, a floor, or the top of the water. */
  private surface(x: number, z: number): number {
    const w = waterAt(this.field, x, z);
    return Math.max(standHeight(this.field, x, z), w ? w.level : -Infinity);
  }

  place(x: number, z: number, yaw: number): void {
    this.vy = 0;
    this.airborne = false;
    this.lofted = false;
    this.fling.set(0, 0);
    this.pos.set(x, standHeight(this.field, x, z), z);
    if (walkable(this.field, x, z) && this.firm()) this.lastFirm.copy(this.pos);
    this.yaw = yaw;
    this.speed = 0;
    this.sync();
  }

  /** How fast the player is moving, 0 to 1 of a run. */
  get pace(): number {
    return this.speed / RUN_SPEED;
  }

  update(dt: number, stick: { x: number; y: number }, cameraYaw: number): void {
    const push = Math.min(1, Math.hypot(stick.x, stick.y));
    if (!this.free) {
      this.speed = 0;
      this.sync();
      return;
    }
    const wading = waterAt(this.field, this.pos.x, this.pos.z) !== null && floorAt(this.pos.x, this.pos.z) === null;
    const gear = this.gear;
    let turning = 12;
    // On stilts the water is only water when it is over them.
    const wade = gear === 'stilts' ? STILTS.wade : 0.45;
    const board = gear === 'skate' ? SKATE : gear === 'sled' ? SLED : null;
    if (board) {
      // A board gets up to speed slowly and keeps it: left alone it rolls on. A slope pulls it. (A sled is all slope.)
      const want = push < 0.08 ? 0 : board.top * Math.max(0.5, push) * (wading ? 0.3 : 1);
      this.pushing = !this.airborne && want > this.speed + 0.5 ? 1 : 0;
      if (!this.airborne) {
        this.speed += (want - this.speed) * (1 - Math.exp(-dt * (want > this.speed ? board.push : push < 0.08 ? (wading ? 3 : board.roll) : want < this.speed ? board.roll : 1.1)));
        // (Only ground that can be rolled onto: the drop off the pier's edge is not a hill.)
        const ax = this.pos.x + Math.sin(this.yaw) * 1.2;
        const az = this.pos.z + Math.cos(this.yaw) * 1.2;
        const slope = walkable(this.field, ax, az) && !waterAt(this.field, ax, az) ? (standHeight(this.field, this.pos.x, this.pos.z) - standHeight(this.field, ax, az)) / 1.2 : 0;
        this.speed = Math.min(board.most, Math.max(0, this.speed + Math.max(-0.6, Math.min(0.6, slope)) * board.hill * dt));
      }
      turning = board.carve;
    } else {
      const top = this.lofted ? UPDRAFT.speed : gear === 'cloud' ? CLOUD.speed : gear === 'pogo' ? POGO.speed : gear === 'balloons' && this.airborne ? BALLOONS.speed : gear === 'stilts' ? STILTS.speed : RUN_SPEED;
      const want = push < 0.08 ? 0 : (push > 0.82 ? top : Math.min(top, WALK_SPEED) * Math.max(0.45, push / 0.82)) * (wading && gear !== 'stilts' && gear !== 'cloud' ? 0.6 : 1);
      this.speed += (want - this.speed) * (1 - Math.exp(-dt * (want > this.speed ? 7 : 10)));
    }
    if (push >= 0.08) {
      // Stick up is away from the camera; stick right is the screen's right.
      const target = heading(stick, cameraYaw);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-dt * turning));
    }
    // A pogo stick does not stand still: every landing is the next bounce.
    if (gear === 'pogo' && !this.airborne) {
      this.vy = this.big ? POGO.big : POGO.bounce;
      this.big = false;
      this.airborne = true;
    }
    if (this.speed > 0.02 || this.airborne) {
      const step = this.speed * dt;
      let nx = this.pos.x + Math.sin(this.yaw) * step + this.fling.x * dt;
      let nz = this.pos.z + Math.cos(this.yaw) * step + this.fling.y * dt;
      [nx, nz] = this.solid.resolve(nx, nz, 0.32);
      // In the air anything goes, short of the edge of the world; on foot, only where it may be walked.
      // (A cloud goes over water as over land, but not up a cliff, and not off the edge of the world.)
      const inWorld = (x: number, z: number): boolean => Math.abs(x) < this.field.half - 3 && Math.abs(z) < this.field.half - 3;
      const ok = (x: number, z: number): boolean =>
        this.airborne
          ? inWorld(x, z) && standHeight(this.field, x, z) < this.pos.y + 0.5
          : gear === 'cloud'
            ? inWorld(x, z) && this.surface(x, z) - this.surface(this.pos.x, this.pos.z) < 0.6 && !walled(this.pos.x, this.pos.z, x, z)
            : walkable(this.field, x, z, wade) && this.climbable(x, z) && !walled(this.pos.x, this.pos.z, x, z);
      if (ok(nx, nz)) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else if (ok(nx, this.pos.z)) {
        this.pos.x = nx;
      } else if (ok(this.pos.x, nz)) {
        this.pos.z = nz;
      } else {
        this.speed *= 0.5;
        this.fling.multiplyScalar(0.3);
      }
      this.stepClock += step;
      const stride = gear === 'skate' ? 1.6 : 0.55 + this.pace * 0.3;
      if (this.stepClock > stride && !this.airborne) {
        this.stepClock = 0;
        const floor = floorAt(this.pos.x, this.pos.z);
        this.onStep?.(floor !== null ? 'wood' : wading ? 'water' : 'grass');
      }
    }
    const ground = gear === 'cloud' ? this.surface(this.pos.x, this.pos.z) : standHeight(this.field, this.pos.x, this.pos.z);
    if (this.airborne) {
      // Balloons: up slowly and down more slowly still. The wind: up fast, and down like a seed.
      if (this.lofted) this.vy = Math.max(-UPDRAFT.sink, this.vy - UPDRAFT.fall * dt);
      else if (gear === 'balloons') this.vy = Math.max(-BALLOONS.sink, this.vy - BALLOONS.fall * dt);
      else this.vy -= 15 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= ground && this.vy < 0) {
        const hit = this.lofted ? 0.5 : -this.vy;
        this.airborne = false;
        this.lofted = false;
        this.vy = 0;
        this.fling.set(0, 0);
        this.pos.y = ground;
        // Landed in water too deep to stand in: back to where the jump began. (A cloud does not mind.)
        if (gear !== 'cloud' && !walkable(this.field, this.pos.x, this.pos.z, wade)) {
          this.pos.copy(this.lastFirm);
          this.speed = 0;
        } else if (this.firm()) this.lastFirm.copy(this.pos);
        this.onLand?.(hit);
      }
    } else {
      this.pos.y += (ground - this.pos.y) * (1 - Math.exp(-dt * 20));
      if (gear !== 'cloud' && walkable(this.field, this.pos.x, this.pos.z, wade) && this.firm()) this.lastFirm.copy(this.pos);
    }
    this.sync();
    const was = this.body.action;
    // (On a cloud the player sits, but may fish from it: a cast or a reel is left as it is.)
    const cloudSat = gear === 'cloud' && (was === 'idle' || was === 'walk' || was === 'jump' || was === 'sit' || was === 'float');
    const riding = this.lofted ? 'float' : gear === 'skate' ? 'skate' : gear === 'pogo' ? 'pogo' : gear === 'balloons' && this.airborne ? 'float' : gear === 'sled' || cloudSat ? 'sit' : gear === 'cloud' ? was : null;
    this.body.action = riding ?? (this.airborne ? 'jump' : this.speed > 0.25 ? 'walk' : was === 'walk' || was === 'jump' || was === 'skate' || was === 'pogo' || was === 'float' || (was === 'sit' && gear !== 'sled' && gear !== 'cloud' && this.free && this.speed > 0.25) ? 'idle' : was);
    this.body.speed = gear === 'skate' ? Math.min(1, this.speed / SKATE.top) : gear === 'stilts' || gear === 'cloud' ? 0 : Math.min(1, Math.max(0, (this.speed - WALK_SPEED * 0.6) / (RUN_SPEED - WALK_SPEED * 0.6)));
    if (gear === 'skate') {
      this.body.strain = this.pushing;
      this.body.power = this.airborne ? 1 : 0;
    } else if (gear === 'pogo') this.body.power = Math.max(0, 1 - Math.abs(this.pos.y - ground) / 0.5);
  }

  /** Not up a cliff in one step: the pier's edge and steep rock stop the player. */
  private climbable(x: number, z: number): boolean {
    const here = standHeight(this.field, this.pos.x, this.pos.z);
    const there = standHeight(this.field, x, z);
    return there - here < 0.6;
  }

  sync(): void {
    this.body.group.position.copy(this.pos);
    this.body.group.rotation.y = this.yaw;
  }
}
