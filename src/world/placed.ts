// Things the player has set down around the island: drawn, solid enough to sit on if they are
// seats, glowing at night if they are lamps, and picked back up from where they stand.
import * as THREE from 'three';
import { model } from '../assets/models';
import { FURNITURE } from '../game/economy';
import type { PlacedThing } from '../game/save';
import { Heightfield, standHeight } from './island';
import type { Seat } from './props';
import type { World } from './world';

export class PlacedThings {
  private items: { thing: PlacedThing; obj: THREE.Object3D; glow: THREE.Sprite | null }[] = [];
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
    this.items.push({ thing, obj: m, glow });
  }

  remove(thing: PlacedThing): void {
    const i = this.items.findIndex((x) => x.thing === thing);
    if (i < 0) return;
    const it = this.items[i];
    this.world.group.remove(it.obj);
    if (it.glow) this.world.removeGlow(it.glow);
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
      .map(({ thing, obj }) => ({ x: thing.x, z: thing.z, y: obj.position.y, yaw: thing.yaw + Math.PI, lift: thing.id === 'f-hammock' ? 0.55 : 0.45, kind: thing.id }));
  }

  /** Whether a radio is playing near a point. */
  radioNear(p: THREE.Vector3): number {
    let best = 0;
    for (const { thing } of this.items) if (thing.id === 'f-radio') best = Math.max(best, 1 - Math.hypot(thing.x - p.x, thing.z - p.z) / 14);
    return Math.max(0, best);
  }
}
