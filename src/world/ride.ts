// What the player is riding, as it is seen: the skateboard under their feet (and turning over
// in a kickflip), the pogo stick under them, the balloons over their head. The rules are in
// src/game/toys.ts and the moving in src/player/player.ts; this only puts the thing where it
// belongs each frame.
import * as THREE from 'three';
import { model } from '../assets/models';
import { STILTS, TRICK_SECS, type Trick } from '../game/toys';
import { lit } from '../look/material';

/** How far a toy lifts whoever is on it, metres. */
const LIFT: Record<string, number> = { 'toy-skateboard': 0.2, 'toy-pogo': 0.22, 'toy-balloons': 0, 'toy-sled': 0.02, 'toy-stilts': STILTS.lift };
/** How tall each is made (the skateboard is made bigger than its file says: a metre long, for big feet). */
const TALL: Record<string, number> = { 'toy-skateboard': 0.3, 'toy-sled': 0.42 };
/** Which way each model's length lies from the way the player faces, as it comes from being made. */
const TURN: Record<string, number> = { 'toy-skateboard': 0, 'toy-pogo': 0, 'toy-balloons': 0 };

const up = new THREE.Vector3(0, 1, 0);

/** A pair of stilts: a pole under each foot, with a block to stand on. */
function stilts(): THREE.Object3D {
  const pair = new THREE.Group();
  const wood = lit({ color: 0xa97c52 });
  for (const side of [-1, 1]) {
    const one = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.09, STILTS.lift + 0.75, 0.09), wood);
    pole.position.set(side * 0.2, (STILTS.lift + 0.75) / 2, -0.06);
    pole.castShadow = true;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.26), wood);
    block.position.set(side * 0.2, STILTS.lift - 0.04, 0.06);
    one.add(pole, block);
    pair.add(one);
  }
  return pair;
}

export class Ride {
  private obj: THREE.Object3D | null = null;
  private id: string | null = null;
  private clock = 0;

  /** Get on something (or, with null, off). */
  async set(id: string | null, scene: THREE.Object3D): Promise<void> {
    this.id = id;
    if (this.obj) {
      this.obj.parent?.remove(this.obj);
      this.obj = null;
    }
    if (!id) return;
    // Stilts are two poles, made here: there is no model of them.
    const m = id === 'toy-stilts' ? stilts() : await model(id, TALL[id]);
    if (!m || this.id !== id) return;
    this.obj = m;
    scene.add(m);
  }

  /**
   * Put it where it belongs. `body` is the player's own group, already where the player stands:
   * it is lifted onto the toy, and turned with a spin. `ground` is the height under the player.
   */
  place(dt: number, body: THREE.Object3D, yaw: number, ground: number, trick: { kind: Trick; t: number } | null, moving = 0): void {
    this.clock += dt;
    const o = this.obj;
    const id = this.id;
    if (!id) return;
    body.position.y += LIFT[id] ?? 0;
    const k = trick ? Math.min(1, trick.t / TRICK_SECS) : 0;
    const spin = trick?.kind === 'spin' ? k * Math.PI * 2 : 0;
    if (spin) body.rotation.y = yaw + spin;
    if (!o) return;
    const facing = yaw + spin + (TURN[id] ?? 0);
    if (id === 'toy-skateboard') {
      o.position.set(body.position.x, body.position.y - (LIFT[id] ?? 0), body.position.z);
      // A kickflip turns the board over about its own length.
      const along = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
      o.quaternion.setFromAxisAngle(up, facing);
      if (trick?.kind === 'kickflip') o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(along, k * Math.PI * 2));
      if (trick?.kind === 'kickflip') o.position.y += Math.sin(k * Math.PI) * 0.12;
    } else if (id === 'toy-sled') {
      o.position.set(body.position.x, body.position.y - (LIFT[id] ?? 0), body.position.z);
      o.rotation.set(0, facing, 0);
    } else if (id === 'toy-stilts') {
      // The poles stand on the ground (the bed, in water) under each foot, and go one before the other.
      o.position.set(body.position.x, body.position.y - (LIFT[id] ?? 0), body.position.z);
      o.rotation.set(0, yaw, 0);
      const step = Math.round(Math.sin(this.clock * 5) * 2) * 0.07 * Math.min(1, moving);
      o.children[0].position.z = step;
      o.children[1].position.z = -step;
    } else if (id === 'toy-pogo') {
      // The stick's foot is on the ground as it lands and leaves; its spring gives as it does.
      const off = Math.max(0, body.position.y - (LIFT[id] ?? 0) - ground);
      const squeeze = Math.max(0, 1 - off / 0.45);
      // It stands in front of whoever is on it, where their hands are: a round body would hide it.
      o.position.set(body.position.x + Math.sin(yaw) * 0.3, body.position.y - (LIFT[id] ?? 0), body.position.z + Math.cos(yaw) * 0.3);
      o.scale.set(1, 1 - squeeze * 0.22, 1);
      o.rotation.set(0, facing, 0);
    } else {
      // The balloons: over the head, a little behind, bobbing in steps.
      o.position.set(body.position.x - Math.sin(yaw) * 0.1, body.position.y + 1.55 + Math.round(Math.sin(this.clock * 2) * 2) * 0.02, body.position.z - Math.cos(yaw) * 0.1);
      o.rotation.set(0, yaw + Math.round(Math.sin(this.clock * 0.9) * 3) * 0.06, Math.round(Math.sin(this.clock * 1.3) * 2) * 0.04);
    }
  }
}
