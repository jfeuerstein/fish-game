// Indoors: the shop, the fishing hut and the aquarium are rooms of their own, each a model made
// like a dolls' house (two or three walls and a floor, open toward the camera). A room is not on
// the island: it is a scene by itself, with its own light, drawn in place of the island while
// the player is in it. Where the floor may be walked is found from the model, by looking down
// on it for what is level with the floor.
import * as THREE from 'three';
import { model } from '../assets/models';
import { pixelled } from '../look/material';
import { heading } from '../player/steer';

export type RoomId = 'shop' | 'hut' | 'aquarium';

export interface RoomSpot {
  id: string;
  /** What the button says there. */
  label: string;
  /** Where it is, as parts of the room's half width and half depth (-1 to 1; -z is the back wall). */
  fx: number;
  fz: number;
  reach: number;
}

export interface Room {
  name: string;
  model: string;
  /** Where the camera looks in from: 0 is the open front, a little more looks in across the corner. */
  yaw: number;
  dist: number;
  spots: RoomSpot[];
}

export const ROOMS: Record<RoomId, Room> = {
  shop: { name: "Gus's shop", model: 'room-shop', yaw: 0.55, dist: 10.2, spots: [{ id: 'counter', label: 'Shop', fx: -0.3, fz: 0.05, reach: 1.7 }] },
  hut: {
    name: 'The fishing hut',
    model: 'room-hut',
    yaw: 0.5,
    dist: 9.6,
    spots: [
      { id: 'bench', label: 'Tackle', fx: -0.35, fz: -0.2, reach: 1.4 },
      { id: 'stove', label: 'Warm hands', fx: 0.4, fz: -0.25, reach: 1.3 },
    ],
  },
  aquarium: { name: 'The aquarium', model: 'room-aquarium', yaw: 0.12, dist: 9.4, spots: [{ id: 'tank', label: 'Tank', fx: 0, fz: -0.35, reach: 2.2 }] },
};

/** Where Gus stands in his shop: behind the counter, in the corner by the shelves. */
export const GUS_INSIDE = { fx: -0.8, fz: -0.5, yaw: 0.9 } as const;

const CELL = 0.2;
const WALK = 2.6;

interface Built {
  root: THREE.Object3D;
  half: THREE.Vector2;
  floor: number;
  /** Which cells of the floor may be stood on, row by row from the back wall. */
  open: Uint8Array;
  cols: number;
  rows: number;
}

export class Indoors {
  readonly scene = new THREE.Scene();
  room: RoomId | null = null;
  /** Where the player is in the room, and which way they face. */
  readonly pos = new THREE.Vector3();
  yaw = Math.PI;
  /** The player has walked out of the open front. */
  out = false;
  private built = new Map<RoomId, Built>();
  private fish: { sprite: THREE.Sprite; x: number; y: number; speed: number; phase: number }[] = [];
  private fishGroup = new THREE.Group();
  private clock = 0;
  private loader = new THREE.TextureLoader();

  constructor() {
    this.scene.background = new THREE.Color(0x10181f);
    this.scene.add(new THREE.HemisphereLight(0xfff0d8, 0x7d5436, 1.25));
    const lamp = new THREE.DirectionalLight(0xffe2b0, 1.7);
    lamp.position.set(5, 9, 7);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(512, 512);
    const cam = lamp.shadow.camera;
    cam.left = cam.bottom = -7;
    cam.right = cam.top = 7;
    cam.near = 1;
    cam.far = 30;
    lamp.shadow.bias = -0.002;
    this.scene.add(lamp, lamp.target, this.fishGroup);
  }

  private async build(id: RoomId): Promise<Built | null> {
    const have = this.built.get(id);
    if (have) return have;
    const root = await model(ROOMS[id].model);
    if (!root) return null;
    root.updateMatrixWorld(true);
    const size = root.userData.size as THREE.Vector3;
    const half = new THREE.Vector2(size.x / 2, size.z / 2);
    const meshes: THREE.Object3D[] = [];
    root.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o));
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const top = (x: number, z: number): number | null => {
      ray.set(new THREE.Vector3(x, size.y + 1, z), down);
      const hit = ray.intersectObjects(meshes, false)[0];
      return hit ? hit.point.y : null;
    };
    // The floor's height: what most of the middle of the room is level with.
    const heights: number[] = [];
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 3; j++) heights.push(top(i * half.x * 0.2, j * half.y * 0.2) ?? 0);
    heights.sort((a, b) => a - b);
    const floor = heights[Math.floor(heights.length * 0.3)];
    const cols = Math.ceil(size.x / CELL);
    const rows = Math.ceil(size.z / CELL);
    const open = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const y = top(-half.x + (c + 0.5) * CELL, -half.y + (r + 0.5) * CELL);
        open[r * cols + c] = y !== null && Math.abs(y - floor) < 0.16 ? 1 : 0;
      }
    const made: Built = { root, half, floor, open, cols, rows };
    this.built.set(id, made);
    return made;
  }

  private free(b: Built, x: number, z: number): boolean {
    // A body's width: the cell and those beside it.
    for (const [dx, dz] of [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) {
      const c = Math.floor((x + dx + b.half.x) / CELL);
      const r = Math.floor((z + dz + b.half.y) / CELL);
      if (c < 0 || r < 0 || c >= b.cols || r >= b.rows || !b.open[r * b.cols + c]) return false;
    }
    return true;
  }

  /** Go into a room: the player stands just inside its open front. False if it could not be loaded. */
  async enter(id: RoomId): Promise<boolean> {
    const b = await this.build(id);
    if (!b) return false;
    for (const other of this.built.values()) this.scene.remove(other.root);
    this.scene.add(b.root);
    this.room = id;
    this.fishGroup.visible = id === 'aquarium';
    // In from the front, as far forward as there is floor.
    let z = b.half.y - 0.5;
    let x = 0;
    search: for (; z > -b.half.y; z -= CELL) for (const tryX of [0, 0.6, -0.6, 1.2, -1.2]) if (this.free(b, tryX, z)) {
      x = tryX;
      break search;
    }
    this.pos.set(x, b.floor, z);
    this.yaw = Math.PI;
    this.out = false;
    return true;
  }

  leave(): void {
    this.room = null;
  }

  /** What the camera looks at and from where. */
  view(): { pos: THREE.Vector3; dist: number; pitch: number; yaw: number } | null {
    const b = this.room && this.built.get(this.room);
    if (!b || !this.room) return null;
    return { pos: new THREE.Vector3(0, b.floor + 0.9, 0), dist: ROOMS[this.room].dist, pitch: 0.62, yaw: ROOMS[this.room].yaw };
  }

  /** A place in the room, from parts of its half width and depth. */
  at(fx: number, fz: number): THREE.Vector3 {
    const b = this.room && this.built.get(this.room);
    return b ? new THREE.Vector3(fx * b.half.x, b.floor, fz * b.half.y) : new THREE.Vector3();
  }

  /** Walk as the stick says. Returns how fast the player is going, 0 to 1. */
  move(dt: number, stick: { x: number; y: number }, cameraYaw: number): number {
    const b = this.room && this.built.get(this.room);
    this.clock += dt;
    this.swim(dt);
    if (!b) return 0;
    const push = Math.min(1, Math.hypot(stick.x, stick.y));
    if (push < 0.08) return 0;
    const want = heading(stick, cameraYaw);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-dt * 12));
    const step = WALK * Math.max(0.45, push) * dt;
    const nx = this.pos.x + Math.sin(this.yaw) * step;
    const nz = this.pos.z + Math.cos(this.yaw) * step;
    this.out = nz > b.half.y - 0.2 && Math.cos(this.yaw) > 0.4;
    if (this.free(b, nx, nz)) this.pos.set(nx, b.floor, nz);
    else if (this.free(b, nx, this.pos.z)) this.pos.x = nx;
    else if (this.free(b, this.pos.x, nz)) this.pos.z = nz;
    else return 0;
    return push;
  }

  /** The spot within reach, if any. */
  near(): RoomSpot | null {
    if (!this.room) return null;
    for (const s of ROOMS[this.room].spots) if (this.at(s.fx, s.fz).distanceTo(this.pos) < s.reach) return s;
    return null;
  }

  /** The fish in the aquarium's tank: a card for each kind given, swimming to and fro behind the glass. */
  async stock(species: readonly string[], iconOf: (id: string) => string): Promise<void> {
    const b = await this.build('aquarium');
    if (!b) return;
    this.fishGroup.clear();
    this.fish = [];
    for (const [i, id] of species.entries()) {
      const tex = pixelled(this.loader.load(iconOf(id)));
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, color: 0xd6e6e6 }));
      const size = 0.42 + ((i * 37) % 10) * 0.022;
      sprite.scale.set(size, size, 1);
      this.fishGroup.add(sprite);
      this.fish.push({ sprite, x: ((i * 0.37) % 1) * 2 - 1, y: 0.2 + ((i * 0.61) % 1) * 0.6, speed: 0.25 + ((i * 0.83) % 1) * 0.35, phase: i * 1.7 });
    }
  }

  private swim(dt: number): void {
    const b = this.built.get('aquarium');
    if (!b || this.room !== 'aquarium') return;
    const t = Math.floor(this.clock * 8) / 8;
    for (const f of this.fish) {
      // Across the back tank and round again, each at its own depth, bobbing a little.
      const along = Math.sin(t * f.speed + f.phase);
      const toward = Math.cos(t * f.speed + f.phase);
      f.sprite.position.set(along * b.half.x * 0.62, b.floor + 1.05 + f.y * 1.15 + Math.sin(t * 1.3 + f.phase) * 0.05, -b.half.y + 0.55);
      // A sprite cannot be turned, so its picture is flipped to face the way it swims.
      f.sprite.material.map!.repeat.x = toward > 0 ? 1 : -1;
      f.sprite.material.map!.offset.x = toward > 0 ? 0 : 1;
    }
    void dt;
  }
}
