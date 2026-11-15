// Things the player has set down around the island: drawn, solid enough to sit on if they are
// seats, glowing at night if they are lamps, and picked back up from where they stand.
import * as THREE from 'three';
import { model } from '../assets/models';
import { FURNITURE } from '../game/economy';
import type { PlacedThing } from '../game/save';
import { Heightfield, standHeight } from './island';
import type { Seat } from './props';
import type { World } from './world';

/** How high off the ground each thing is sat on, where it is not a chair's height. */
const SEAT_HEIGHT: Record<string, number> = { 'f-hammock': 0.55, 'f-bedroll': 0.14, 'f-stump': 0.5 };

export class PlacedThings {
  private items: { thing: PlacedThing; obj: THREE.Object3D; glow: THREE.Sprite | null; flame: THREE.Object3D | null; lamp: THREE.PointLight | null }[] = [];
  constructor(private world: World, private field: Heightfield) {}

  async add(thing: PlacedThing): Promise<void> {
    const m = await model(thing.id);
    if (!m) return;
    m.position.set(thing.x, standHeight(this.field, thing.x, thing.z), thing.z);
    m.rotation.y = thing.yaw;
    this.world.group.add(m);
    const info = FURNITURE.find((f) => f.id === thing.id);
    let glow: THREE.Sprite | null = null;
    if (info?.glow) {
      const size = (m.userData.size as THREE.Vector3)?.y ?? 1;
      glow = this.world.addGlow(m.position.clone().add(new THREE.Vector3(0, size * 0.8, 0)), 1.4);
    }
    // A fire has a flame of its own and throws a jumping light; a string of lights a steady one.
    const tall = (m.userData.size as THREE.Vector3)?.y ?? 1;
    const flame = info?.fire ? this.world.addFlame(m.position.clone().add(new THREE.Vector3(0, tall * 0.32, 0)), tall * 0.95) : null;
    const lamp = info?.fire ? this.world.borrowLamp(m.position.clone().add(new THREE.Vector3(0, tall, 0)), 9, 3, 0xff9448, true) : info?.lamp ? this.world.borrowLamp(m.position.clone().add(new THREE.Vector3(0, tall * 0.8, 0)), 7, 2.4) : null;
    this.items.push({ thing, obj: m, glow, flame, lamp });
  }

  remove(thing: PlacedThing): void {
    const i = this.items.findIndex((x) => x.thing === thing);
    if (i < 0) return;
    const it = this.items[i];
    this.world.group.remove(it.obj);
    if (it.glow) this.world.removeGlow(it.glow);
    if (it.flame) this.world.removeFlame(it.flame);
    if (it.lamp) this.world.returnLamp(it.lamp);
    this.items.splice(i, 1);
  }

  /** The nearest thing within reach. */
  near(p: THREE.Vector3, reach = 1.6): PlacedThing | null {
    let best: PlacedThing | null = null;
    let bd = reach;
    for (const { thing } of this.items) {
      const d = Math.hypot(thing.x - p.x, thing.z - p.z);
      if (d < bd) {
        bd = d;
        best = thing;
      }
    }
    return best;
  }

  seats(): Seat[] {
    return this.items
      .filter(({ thing }) => FURNITURE.find((f) => f.id === thing.id)?.seat)
      .map(({ thing, obj }) => ({ x: thing.x, z: thing.z, y: obj.position.y, yaw: thing.yaw + Math.PI, lift: SEAT_HEIGHT[thing.id] ?? 0.45, kind: thing.id }));
  }

  /** Whether a radio is playing near a point. */
  radioNear(p: THREE.Vector3): number {
    let best = 0;
    for (const { thing } of this.items) if (thing.id === 'f-radio') best = Math.max(best, 1 - Math.hypot(thing.x - p.x, thing.z - p.z) / 14);
    return Math.max(0, best);
  }
}
