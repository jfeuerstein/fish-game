// The other islanders: three who wander between their favourite fishing spots and fish there,
// and Gus the pelican behind the shop counter. Each has a few things to say.
import { hauntNow } from './hours';
import { lit } from '../look/material';
import * as THREE from 'three';
import { rng } from '../core/rng';
import { SPECIES } from '../fishing/fish';
import { Character } from '../player/character';
import { Heightfield, standHeight, waterAt } from '../world/island';
import type { V2 } from '../world/layout';

interface Spot {
  /** Where to stand, and which way to face to fish. */
  at: V2;
  yaw: number;
}

export interface NpcDef {
  id: string;
  name: string;
  /** A walking route between spots: each spot's path from the previous one. */
  route: { via: V2[]; spot: Spot }[];
  lines: string[];
}

export const NPCS: NpcDef[] = [
  {
    id: 'npc-duck',
    name: 'Puddle',
    route: [
      { via: [[50, 13], [59, 14], [80, 14]], spot: { at: [101, 18], yaw: Math.PI / 2 } },
      { via: [[80, 14], [59, 14], [40, 12]], spot: { at: [70, 15.4], yaw: Math.PI / 2 + 1.4 } },
      { via: [[59, 14], [40, 12], [22, 11], [9, 13]], spot: { at: [4, 44], yaw: Math.PI } },
    ],
    lines: [
      'Quack! The end of the pier is where the big ones are. Deep water!',
      'I caught a squid here once at night. Under the lamps.',
      'Shiny fish sparkle a little when you pull them up. Keep an eye out.',
      'If the line goes red, let go! Then reel again. Easy does it.',
    ],
  },
  {
    id: 'npc-beaver',
    name: 'Birch',
    route: [
      { via: [[-7, 6], [-12, -4], [-18, -11]], spot: { at: [-17, -18], yaw: -Math.PI / 2 - 0.6 } },
      { via: [[-26, -9], [-34, -13], [-40, -18]], spot: { at: [-44, -25.5], yaw: Math.PI } },
      { via: [[-34, -13], [-26, -9], [-18, -11], [-12, -4], [-7, 6]], spot: { at: [-20, -11], yaw: -Math.PI / 2 - 0.2 } },
    ],
    lines: [
      'The creek has trout by day and eels by night. Bit slippery, eels.',
      'Did you know there\'s a golden trout? Only bites when it rains.',
      'The koi in the pond come up at dawn and dusk. Pretty things.',
      'I built that bridge. Well. I helped.',
    ],
  },
  {
    id: 'npc-bear',
    name: 'Juniper',
    route: [
      { via: [[2, 25], [4, 36]], spot: { at: [-6, 47], yaw: Math.PI + 0.4 } },
      { via: [[4, 36], [2, 25], [-9, 17], [-22, 19]], spot: { at: [-36, 21], yaw: 0.2 } },
      { via: [[-22, 19], [-9, 17], [2, 25], [4, 36]], spot: { at: [14, 48], yaw: Math.PI - 0.3 } },
    ],
    lines: [
      'Mmm, campfire weather. The night sky is lovely from the camp.',
      'Gus will buy anything. Even old boots. Okay, maybe not boots.',
      'I spent all my pearls at the Lucky Gull. No regrets! Okay, one regret.',
      'Errands on the board pay well. And every third one, a little extra.',
    ],
  },
];

/** How long a line stays up, ms: longer for a longer line. */
export const readingTime = (text: string): number => Math.max(4000, 1500 + text.length * 60);

export const GUS_LINES = [
  'Welcome to the shop! I buy fish, I sell everything else.',
  'Better bait means fussier fish. Fussier fish means more coins!',
  'Got pearls? The gull by the plaza will take them. Prizes only, mind.',
  'A bigger cooler means fewer trips back here. Not that I mind the company.',
  'The Starlight Rod hums near rare fish. Or so they tell me.',
];

const SPEED = 1.7;

type Mode = 'walk' | 'fish' | 'reel' | 'show' | 'wave' | 'rest';

export class Npc {
  readonly body: Character;
  private leg = 0;
  private path: THREE.Vector3[] = [];
  private mode: Mode = 'fish';
  private timer = 0;
  private rand: () => number;
  private line = 0;
  private bobber: THREE.Mesh;
  private string: THREE.Line;
  readonly pos = new THREE.Vector3();
  private yaw = 0;
  saying: { text: string; until: number } | null = null;

  constructor(readonly def: NpcDef, private field: Heightfield, private scene: THREE.Scene) {
    this.body = new Character(def.id, def.id === 'npc-bear' ? 1.2 : 1.05);
    this.body.fidgets = true;
    this.rand = rng(def.id.length * 977);
    this.bobber = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lit({ color: 0xd65a3c }));
    this.string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xf3f0ea }));
    this.bobber.visible = this.string.visible = false;
    scene.add(this.bobber, this.string);
  }

  async load(): Promise<void> {
    this.scene.add(this.body.group);
    await this.body.load();
    await this.body.setRod('rod-2');
    // Start at a spot along the route, already fishing.
    this.leg = Math.floor(this.rand() * this.def.route.length);
    const s = this.def.route[this.leg].spot;
    this.pos.set(s.at[0], standHeight(this.field, s.at[0], s.at[1]), s.at[1]);
    this.yaw = s.yaw;
    this.startFishing();
  }

  private startFishing(): void {
    this.mode = 'fish';
    this.body.rodOut = true;
    this.timer = 25 + this.rand() * 40;
    this.body.action = 'hold';
    this.body.rodOut = true;
  }

  /** Say something: what is given, or the next of their own lines. It stays up long enough to read. */
  chat(now: number, words?: string): string {
    const text = words ?? this.def.lines[this.line++ % this.def.lines.length];
    this.saying = { text, until: now + readingTime(text) };
    if (this.mode === 'rest') return text;
    if (this.mode === 'fish' || this.mode === 'walk') {
      this.mode = 'wave';
      this.timer = 2;
      this.body.action = 'wave';
      this.bobber.visible = this.string.visible = false;
    }
    return text;
  }

  /** `hour` is the island's: each islander keeps hours of their own (src/npc/hours.ts). */
  update(dt: number, player: THREE.Vector3, hour = 12): void {
    this.timer -= dt;
    const haunt = hauntNow(this.def.id, hour);
    // Their time is over: back to fishing where they are.
    if (this.mode === 'rest' && !haunt) this.startFishing();
    switch (this.mode) {
      case 'rest':
        this.body.action = haunt?.action ?? 'idle';
        break;
      case 'walk': {
        const target = this.path[0];
        if (!target) {
          const s = this.def.route[this.leg].spot;
          this.yaw = s.yaw;
          // Arrived where they keep their hours: the rod is put away.
          if (haunt && haunt.leg === this.leg) {
            this.mode = 'rest';
            this.body.rodOut = false;
            this.body.action = haunt.action;
          } else this.startFishing();
          break;
        }
        const dx = target.x - this.pos.x;
        const dz = target.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        // Step aside for the player rather than walk through them.
        const toPlayer = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
        if (toPlayer < 1.1) {
          this.body.action = 'idle';
          break;
        }
        if (d < 0.3) this.path.shift();
        else {
          const want = Math.atan2(dx, dz);
          let turn = want - this.yaw;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          this.yaw += turn * (1 - Math.exp(-dt * 8));
          this.pos.x += (dx / d) * SPEED * dt;
          this.pos.z += (dz / d) * SPEED * dt;
          this.pos.y = standHeight(this.field, this.pos.x, this.pos.z);
          this.body.action = 'walk';
          this.body.speed = 0.1;
        }
        break;
      }
      case 'fish': {
        this.showLine();
        // When it is their time to be somewhere else, they do not linger.
        if (haunt && haunt.leg !== this.leg) this.timer = 0;
        else if (haunt && this.mode === 'fish') {
          this.bobber.visible = this.string.visible = false;
          this.mode = 'rest';
          this.body.rodOut = false;
          break;
        }
        if (this.timer <= 0) {
          // Off to the next spot.
          this.bobber.visible = this.string.visible = false;
          this.leg = (this.leg + 1) % this.def.route.length;
          const r = this.def.route[this.leg];
          this.path = [...r.via, r.spot.at].map(([x, z]) => new THREE.Vector3(x, 0, z));
          this.mode = 'walk';
        } else if (this.rand() < dt / 14) {
          this.mode = 'reel';
          this.timer = 2 + this.rand() * 2;
          this.body.action = 'reel';
          this.body.strain = 0.5;
        }
        break;
      }
      case 'reel':
        this.showLine();
        if (this.timer <= 0) {
          this.mode = 'show';
          this.timer = 2.2;
          this.body.action = 'show';
          this.bobber.visible = this.string.visible = false;
          const pool = SPECIES.filter((s) => s.tier === 'common' || s.tier === 'uncommon');
          void this.body.hold(`fish-${pool[Math.floor(this.rand() * pool.length)].id}`, 0.5);
        }
        break;
      case 'show':
        if (this.timer <= 0) {
          void this.body.hold(null);
          this.startFishing();
        }
        break;
      case 'wave':
        this.yaw += Math.atan2(Math.sin(Math.atan2(player.x - this.pos.x, player.z - this.pos.z) - this.yaw), Math.cos(Math.atan2(player.x - this.pos.x, player.z - this.pos.z) - this.yaw)) * (1 - Math.exp(-dt * 6));
        if (this.timer <= 0) {
          if (this.path.length) this.mode = 'walk';
          else this.startFishing();
        }
        break;
    }
    this.body.group.position.copy(this.pos);
    // Sitting on the ground, not hovering over it.
    if (this.mode === 'rest' && this.body.action === 'sit') this.body.group.position.y -= 0.24;
    this.body.group.rotation.y = this.yaw;
    // Everyone keeps an eye on the player.
    this.body.watching = player;
    this.body.update(dt);
  }

  private showLine(): void {
    const tip = this.body.rodTip;
    const out = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(6).add(this.pos);
    const w = waterAt(this.field, out.x, out.z);
    out.y = (w ? w.level : this.field.heightAt(out.x, out.z)) - (this.mode === 'reel' ? 0.06 : 0) + Math.sin(performance.now() / 450) * 0.02;
    this.bobber.position.copy(out);
    this.bobber.visible = this.string.visible = true;
    const pos = this.string.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, out.x, out.y, out.z);
    pos.needsUpdate = true;
  }
}

/** Gus, the shopkeeper, in the shop's window. */
export class Shopkeeper {
  readonly body = new Character('npc-pelican', 1.25);
  line = 0;
  saying: { text: string; until: number } | null = null;
  constructor(private scene: THREE.Scene) {}
  async load(at: THREE.Vector3, yaw: number): Promise<void> {
    this.scene.add(this.body.group);
    await this.body.load();
    this.body.rodOut = false;
    this.body.fidgets = true;
    this.body.group.position.copy(at);
    this.body.group.rotation.y = yaw;
  }
  chat(now: number, words?: string): string {
    const text = words ?? GUS_LINES[this.line++ % GUS_LINES.length];
    this.saying = { text, until: now + readingTime(text) };
    this.body.action = 'wave';
    setTimeout(() => (this.body.action = 'idle'), 2000);
    return text;
  }
  update(dt: number, player: THREE.Vector3): void {
    this.body.watching = player;
    this.body.update(dt);
  }
}
