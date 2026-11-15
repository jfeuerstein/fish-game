// Bait to be found, drawn: a knot of fat worms on the wet ground, or a pair of crickets hopping
// in the grass (where and when is src/game/forage.ts). Small things made in code from the
// island's inks, moved in steps. Only those near the player are drawn.
import * as THREE from 'three';
import { type Forage, type ForageSpot, forageSpots } from '../game/forage';
import { lit } from '../look/material';
import type { Heightfield } from './island';

export class Foraging {
  readonly group = new THREE.Group();
  private spots: { spot: ForageSpot; obj: THREE.Group }[] = [];
  private taken = new Set<string>();
  private shown = '';
  private clock = 0;
  private worm = lit({ color: 0xcf6e86 });
  private cricket = lit({ color: 0x35633a });

  constructor(private field: Heightfield, private fits: (x: number, z: number) => boolean) {}

  /** Show what is about: `kind` (or nothing) for this `turn` of rain or evening. */
  set(kind: Forage | null, turn: number): void {
    const key = kind ? `${kind}-${turn}` : '';
    if (key === this.shown) return;
    this.shown = key;
    for (const s of this.spots) this.group.remove(s.obj);
    this.spots = [];
    if (!kind) return;
    for (const spot of forageSpots(kind, turn, this.fits)) {
      if (this.taken.has(spot.key)) continue;
      const obj = new THREE.Group();
      const n = kind === 'worms' ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const bit = new THREE.Mesh(kind === 'worms' ? new THREE.BoxGeometry(0.34, 0.08, 0.09) : new THREE.BoxGeometry(0.14, 0.1, 0.2), kind === 'worms' ? this.worm : this.cricket);
        bit.position.set(Math.cos(i * 2.1) * 0.18, 0.05, Math.sin(i * 2.1) * 0.18);
        bit.rotation.y = i * 1.3;
        bit.castShadow = true;
        obj.add(bit);
      }
      obj.position.set(spot.x, this.field.heightAt(spot.x, spot.z), spot.z);
      this.group.add(obj);
      this.spots.push({ spot, obj });
    }
  }

  /** The one within reach, if any. */
  near(p: THREE.Vector3, reach = 1.5): ForageSpot | null {
    for (const s of this.spots) if (Math.hypot(s.spot.x - p.x, s.spot.z - p.z) < reach) return s.spot;
    return null;
  }

  take(spot: ForageSpot): void {
    this.taken.add(spot.key);
    const i = this.spots.findIndex((s) => s.spot === spot);
    if (i < 0) return;
    this.group.remove(this.spots[i].obj);
    this.spots.splice(i, 1);
  }

  update(dt: number, player: THREE.Vector3): void {
    this.clock += dt;
    const beat = Math.floor(this.clock * 6);
    for (const [n, s] of this.spots.entries()) {
      s.obj.visible = Math.hypot(s.spot.x - player.x, s.spot.z - player.z) < 40;
      if (!s.obj.visible) continue;
      s.obj.children.forEach((bit, i) => {
        const k = Math.abs((Math.sin((beat + n * 5 + i * 3) * 12.9898) * 43758.5453) % 1);
        if (s.spot.kind === 'worms') bit.rotation.y = i * 1.3 + (k - 0.5) * 0.9;
        // A cricket sits, and now and then hops.
        else bit.position.y = 0.05 + (k > 0.8 ? 0.22 : 0);
      });
    }
  }
}
