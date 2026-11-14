// The rowboat: tied up by the pier until the player has a licence and climbs in. Rowed with the
// stick, it glides on, turns gently, and keeps to water deep enough to float in.
import * as THREE from 'three';
import { model } from '../assets/models';
import { Heightfield, floatable } from './island';
import { BOAT_MOORING } from './layout';

export class Boat {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3(BOAT_MOORING.x, 0, BOAT_MOORING.z);
  yaw: number = BOAT_MOORING.yaw;
  private vel = new THREE.Vector2();
  private t = 0;
  aboard = false;
  /** How hard the player is rowing, 0 to 1, for their pose and the sound. */
  effort = 0;

  constructor(private field: Heightfield) {}

  async load(scene: THREE.Scene): Promise<void> {
    const m = await model('rowboat', 1.0);
    if (m) {
      // Long way along +z, like everything else that faces forward.
      const size = m.userData.size as THREE.Vector3;
      if (size && size.x > size.z) m.rotation.y = Math.PI / 2;
      this.group.add(m);
    }
    scene.add(this.group);
    this.sync();
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
        const fx = -Math.sin(cameraYaw);
        const fz = -Math.cos(cameraYaw);
        const dx = fx * stick.y + fz * stick.x;
        const dz = fz * stick.y - fx * stick.x;
        const want = Math.atan2(dx, dz);
        let turn = want - this.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        this.yaw += turn * (1 - Math.exp(-dt * 1.8));
        // Pull forward along the boat's own heading.
        const accel = 3.2 * push * Math.max(0, Math.cos(turn));
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
    } else this.effort = 0;
    this.sync();
  }

  get speed(): number {
    return this.vel.length();
  }

  private sync(): void {
    this.group.position.set(this.pos.x, Math.sin(this.t * 1.3) * 0.05 - 0.15, this.pos.z);
    this.group.rotation.set(Math.sin(this.t * 1.1) * 0.03, this.yaw, Math.sin(this.t * 0.9) * 0.04);
  }

  /** Where the rower sits. */
  seat(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.group.position.y + 0.25, this.pos.z);
  }
}
