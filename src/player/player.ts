// The player on foot: walks where the stick points (as the camera sees it), kept out of deep
// water and solid things, standing on the ground or the pier's boards.
import * as THREE from 'three';
import { Colliders } from '../world/colliders';
import { Heightfield, standHeight, walkable, waterAt } from '../world/island';
import { floorAt } from '../world/layout';
import type { Character } from './character';
import { heading } from './steer';

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
  /** Where the player last stood on firm ground, to go back to after a jump into deep water. */
  private lastFirm = new THREE.Vector3();
  /** Called on landing, with how hard. */
  onLand: ((speed: number) => void) | null = null;

  constructor(readonly body: Character, private field: Heightfield, readonly solid: Colliders) {}

  /** Hop. */
  jump(): void {
    if (this.airborne || !this.free) return;
    this.vy = 5.6;
    this.airborne = true;
  }

  /** Thrown into the air by a bounce mushroom. */
  launch(up: number, yaw: number, forward: number): void {
    this.vy = up;
    this.fling.set(Math.sin(yaw) * forward, Math.cos(yaw) * forward);
    this.airborne = true;
  }

  place(x: number, z: number, yaw: number): void {
    this.vy = 0;
    this.airborne = false;
    this.fling.set(0, 0);
    this.pos.set(x, standHeight(this.field, x, z), z);
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
    const want = push < 0.08 ? 0 : (push > 0.82 ? RUN_SPEED : WALK_SPEED * Math.max(0.45, push / 0.82)) * (wading ? 0.6 : 1);
    this.speed += (want - this.speed) * (1 - Math.exp(-dt * (want > this.speed ? 7 : 10)));
    if (push >= 0.08) {
      // Stick up is away from the camera; stick right is the screen's right.
      const target = heading(stick, cameraYaw);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-dt * 12));
    }
    if (this.speed > 0.02 || this.airborne) {
      const step = this.speed * dt;
      let nx = this.pos.x + Math.sin(this.yaw) * step + this.fling.x * dt;
      let nz = this.pos.z + Math.cos(this.yaw) * step + this.fling.y * dt;
      [nx, nz] = this.solid.resolve(nx, nz, 0.32);
      // In the air anything goes, short of the edge of the world; on foot, only where it may be walked.
      const ok = (x: number, z: number): boolean => (this.airborne ? Math.abs(x) < this.field.half - 3 && Math.abs(z) < this.field.half - 3 && standHeight(this.field, x, z) < this.pos.y + 0.5 : walkable(this.field, x, z) && this.climbable(x, z));
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
      const stride = 0.55 + this.pace * 0.3;
      if (this.stepClock > stride && !this.airborne) {
        this.stepClock = 0;
        const floor = floorAt(this.pos.x, this.pos.z);
        this.onStep?.(floor !== null ? 'wood' : wading ? 'water' : 'grass');
      }
    }
    const ground = standHeight(this.field, this.pos.x, this.pos.z);
    if (this.airborne) {
      this.vy -= 15 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= ground && this.vy < 0) {
        const hit = -this.vy;
        this.airborne = false;
        this.vy = 0;
        this.fling.set(0, 0);
        this.pos.y = ground;
        // Landed in water too deep to stand in: back to where the jump began.
        if (!walkable(this.field, this.pos.x, this.pos.z)) this.pos.copy(this.lastFirm);
        this.onLand?.(hit);
      }
    } else {
      this.pos.y += (ground - this.pos.y) * (1 - Math.exp(-dt * 20));
      if (walkable(this.field, this.pos.x, this.pos.z) && !waterAt(this.field, this.pos.x, this.pos.z)) this.lastFirm.copy(this.pos);
    }
    this.sync();
    this.body.action = this.airborne ? 'jump' : this.speed > 0.25 ? 'walk' : this.body.action === 'walk' || this.body.action === 'jump' ? 'idle' : this.body.action;
    this.body.speed = Math.min(1, Math.max(0, (this.speed - WALK_SPEED * 0.6) / (RUN_SPEED - WALK_SPEED * 0.6)));
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
