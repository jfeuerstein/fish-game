// Things the player has set down around the island: drawn, solid enough to sit on if they are
// seats, glowing at night if they are lamps, and picked back up from where they stand.
import * as THREE from 'three';
import { model } from '../assets/models';
import { FURNITURE } from '../game/economy';
import { lit, pixelled } from '../look/material';
import type { PlacedThing } from '../game/save';
import { Heightfield, standHeight } from './island';
import type { Seat } from './props';
import type { World } from './world';

/** How high off the ground each thing is sat on, where it is not a chair's height. */
const SEAT_HEIGHT: Record<string, number> = { 'f-hammock': 0.55, 'f-bedroll': 0.14, 'f-stump': 0.5 };

/** What is painted on a camp's sign when it has no name yet. */
const UNNAMED = 'My Camp';

/**
 * A camp's sign, made here and not from a model, so that it can say what the camp is called:
 * two posts, a board, and the name set on it in the game's own letters.
 */
function campSign(name: string): THREE.Object3D {
  const sign = new THREE.Group();
  const wood = lit({ color: 0x7d5436 });
  for (const x of [-0.5, 0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), wood);
    post.position.set(x, 0.575, 0);
    post.castShadow = true;
    sign.add(post);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 48;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.44, 0.07), [wood, wood, wood, wood, lit({ map: pixelled(new THREE.CanvasTexture(canvas)) }), wood]);
  board.position.set(0, 0.95, 0.02);
  board.castShadow = true;
  sign.add(board);
  sign.userData.size = new THREE.Vector3(1.3, 1.2, 0.1);
  sign.userData.write = (said: string): void => {
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#f4eee3';
    g.fillRect(0, 0, 144, 48);
    g.strokeStyle = '#10181f';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 140, 44);
    g.fillStyle = '#10181f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // As large as the name allows.
    let px = 32;
    do {
      g.font = `${px}px "Jersey 15", monospace`;
      px -= 2;
    } while (g.measureText(said).width > 128 && px > 10);
    g.fillText(said, 72, 26);
    const map = (board.material as THREE.MeshToonMaterial[])[4].map!;
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
  };
  (sign.userData.write as (said: string) => void)(name || UNNAMED);
  return sign;
}

/** A thing as it is while it is being carried to where it will stand: the model itself, see-through. */
export async function ghostOf(id: string, name: string): Promise<THREE.Object3D | null> {
  const m = id === 'f-campsign' ? campSign(name) : await model(id);
  if (!m) return null;
  m.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const see = (mat: THREE.Material): THREE.Material => {
      const c = mat.clone();
      c.transparent = true;
      c.opacity = 0.62;
      c.depthWrite = false;
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(see) : see(mesh.material);
    mesh.castShadow = false;
  });
  return m;
}

export class PlacedThings {
  private items: { thing: PlacedThing; obj: THREE.Object3D; glow: THREE.Sprite | null; flame: THREE.Object3D | null; lamp: THREE.PointLight | null }[] = [];
  /** What the camp is called, for any sign set down. */
  campName = '';
  constructor(private world: World, private field: Heightfield) {}

  /** The camp has a new name: every sign says it. */
  rename(name: string): void {
    this.campName = name;
    for (const it of this.items) (it.obj.userData.write as ((said: string) => void) | undefined)?.(name || UNNAMED);
  }

  async add(thing: PlacedThing): Promise<void> {
    const m = thing.id === 'f-campsign' ? campSign(this.campName) : await model(thing.id);
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
