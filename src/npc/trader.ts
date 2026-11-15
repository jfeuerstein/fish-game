// The trader as they are seen: a stall on the beach with a second rowboat pulled up beside it,
// and somebody standing by it. They are one of the characters the player could be (whichever
// the player is not), in a straw hat with a pack on, so they need no model of their own.
import * as THREE from 'three';
import { model } from '../assets/models';
import { TRADER_LINES } from '../game/trader';
import { Character } from '../player/character';
import type { Heightfield } from '../world/island';
import { readingTime } from './npcs';

/** Where the trader stands: on the open sand east of the rocks, facing up the beach to whoever comes down the path. */
export const TRADER_AT = { x: 10, z: 53.2, yaw: Math.PI - 0.2 } as const;

export class Trader {
  readonly group = new THREE.Group();
  body: Character | null = null;
  line = 0;
  saying: { text: string; until: number } | null = null;
  private wearing = '';

  constructor(private scene: THREE.Scene, private field: Heightfield) {
    this.group.visible = false;
    scene.add(this.group);
  }

  get pos(): THREE.Vector3 {
    return new THREE.Vector3(TRADER_AT.x, this.field.heightAt(TRADER_AT.x, TRADER_AT.z), TRADER_AT.z);
  }

  /** The stall and the boat. */
  async load(): Promise<void> {
    const ground = (x: number, z: number): number => this.field.heightAt(x, z);
    const side = new THREE.Vector3(Math.cos(TRADER_AT.yaw), 0, -Math.sin(TRADER_AT.yaw));
    const stall = await model('stall');
    if (stall) {
      const at = this.pos.addScaledVector(side, 1.9);
      stall.position.set(at.x, ground(at.x, at.z) - 0.03, at.z);
      stall.rotation.y = TRADER_AT.yaw;
      this.group.add(stall);
    }
    const boat = await model('rowboat', 1.0);
    if (boat) {
      const at = this.pos.addScaledVector(side, -3.2).add(new THREE.Vector3(0, 0, 2.4));
      boat.position.set(at.x, ground(at.x, at.z) + 0.05, at.z);
      boat.rotation.set(0, TRADER_AT.yaw + 1.2, 0.12);
      this.group.add(boat);
    }
  }

  /** Come or go. The first time they come, they are made: as whoever the player is not. */
  async show(on: boolean, playerIs: string): Promise<void> {
    this.group.visible = on;
    if (this.body) this.body.group.visible = on;
    if (!on) return;
    const as = playerIs === 'char-frog' ? 'char-raccoon' : 'char-frog';
    if (this.wearing === as) return;
    this.wearing = as;
    if (this.body) this.scene.remove(this.body.group);
    const body = new Character(as, 1.15);
    this.body = body;
    this.scene.add(body.group);
    await body.load();
    body.rodOut = false;
    body.fidgets = true;
    await body.setHat('hat-straw');
    await body.setExtra('x-backpack');
    body.group.position.copy(this.pos);
    body.group.rotation.y = TRADER_AT.yaw;
    body.group.visible = this.group.visible;
  }

  chat(now: number): string {
    const text = TRADER_LINES[this.line++ % TRADER_LINES.length];
    this.saying = { text, until: now + readingTime(text) };
    if (this.body) {
      this.body.action = 'wave';
      setTimeout(() => this.body && (this.body.action = 'idle'), 2000);
    }
    return text;
  }

  update(dt: number, player: THREE.Vector3): void {
    if (!this.body || !this.group.visible) return;
    this.body.watching = player;
    this.body.update(dt);
  }
}
