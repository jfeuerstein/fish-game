// Fishing in the world: hold to wind up, let go to cast, wait for the bobber to go under, tap to
// hook, then hold to reel against the fish. Lands a fish, or the line snaps, or it slips away;
// either way the next cast is a tap away.
import * as THREE from 'three';
import { model } from '../assets/models';
import { rng } from '../core/rng';
import type { Bait, Rod } from '../game/economy';
import type { Character } from '../player/character';
import type { Effects } from '../fx/particles';
import { type Zone, fishingZone, waterAt } from '../world/island';
import type { Heightfield } from '../world/island';
import { BY_ID, type Catch, VARIANT_STARS } from './fish';
import { type Conditions, biteDelay, nibbles, rollCatch } from './roll';
import { type ReelState, fighterFor, startReel, stepReel } from './reel';

export type FishState = 'ready' | 'aiming' | 'flying' | 'waiting' | 'bite' | 'reeling' | 'landing' | 'returning';

export interface FishingHooks {
  conditions(zone: Zone): Conditions;
  /** A fish is landed: the game records it and says how to announce it. */
  landed(c: Catch, zone: Zone): void;
  snapped(): void;
  escaped(): void;
  play(sound: string, opts?: { volume?: number; rate?: number }): void;
  reelSound(volume: number, rate: number): void;
  toast(text: string): void;
  bump(amount: number): void;
  /** Whether the bag has room for another fish. */
  room(): boolean;
  /** Show or hide the "!" over the player's head. */
  exclaim?(on: boolean): void;
  /** Something happened for the first time that is worth a word of help. */
  tip?(id: 'bite' | 'reel' | 'thrash' | 'snap'): void;
}

const UP = new THREE.Vector3(0, 1, 0);

export class Fishing {
  state: FishState = 'ready';
  readonly bobber = new THREE.Group();
  private line: THREE.Mesh;
  private linePos: Float32Array;
  private power = 0;
  private powerT = 0;
  private flight = { from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 0.8 };
  private zone: Zone | null = null;
  private level = 0;
  private timer = 0;
  private nibblesLeft = 0;
  private nextNibble = 0;
  private dip = 0;
  private reel: ReelState | null = null;
  private fish: Catch | null = null;
  private conditionsNow: Conditions | null = null;
  private rand = rng(Date.now() % 100000);
  private t = 0;
  private aimYaw = 0;
  /** How long the player has to hook a fish that bites, from the rod. */
  private hookWindow = 1;
  /** For the HUD. */
  fishIcon = '';
  constructor(private field: Heightfield, private body: Character, private fx: Effects, private hooks: FishingHooks, scene: THREE.Scene) {
    this.bobber.visible = false;
    scene.add(this.bobber);
    void model('bobber', 0.18).then((m) => {
      if (m) this.bobber.add(m);
      else this.bobber.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8453c })));
    });
    const segs = 24;
    this.linePos = new Float32Array((segs + 1) * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    const idx: number[] = [];
    for (let i = 0; i < segs; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    this.line = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf6f3ea, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
  }

  get busy(): boolean {
    return this.state !== 'ready';
  }

  /** The bobber's position, for the camera and the HUD. */
  get bobberPos(): THREE.Vector3 {
    return this.bobber.position;
  }

  get castPower(): number | null {
    return this.state === 'aiming' ? this.power : null;
  }

  get reelState(): ReelState | null {
    return this.state === 'reeling' ? this.reel : null;
  }

  /** The main button went down. */
  press(aimYaw: number, rod: Rod): void {
    // Generous: this is not a test of reflexes.
    this.hookWindow = rod.hook * 1.35;
    switch (this.state) {
      case 'ready':
        if (!this.hooks.room()) {
          this.hooks.toast('Your cooler is full! Sell some fish at the shop.');
          return;
        }
        this.state = 'aiming';
        this.powerT = 0;
        this.aimYaw = aimYaw;
        this.body.action = 'castBack';
        break;
      case 'waiting':
        this.reelIn();
        break;
      case 'bite':
        this.hook();
        break;
      default:
        break;
    }
  }

  /** The main button came up. */
  release(rod: Rod): void {
    if (this.state === 'aiming') this.cast(rod);
  }

  /** Stop whatever is happening and bring the line in (the player walked off). */
  cancel(): void {
    if (this.state === 'ready' || this.state === 'returning') return;
    if (this.state === 'aiming' || this.state === 'landing') {
      this.state = 'ready';
      this.body.action = 'idle';
      this.body.hold(null);
      return;
    }
    if (this.state === 'reeling') this.hooks.escaped();
    this.reelIn();
  }

  private cast(rod: Rod): void {
    const dist = 3 + (rod.reach - 3) * this.power;
    const dir = new THREE.Vector3(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw));
    const from = this.body.rodTip.clone();
    const to = this.body.group.position.clone().addScaledVector(dir, dist);
    const w = waterAt(this.field, to.x, to.z);
    // Water under the pier's boards is not water to cast into.
    this.zone = fishingZone(this.field, to.x, to.z);
    this.level = w ? w.level : this.field.heightAt(to.x, to.z);
    to.y = this.level;
    this.flight = { from, to, t: 0, dur: 0.55 + dist * 0.025 };
    this.state = 'flying';
    this.body.action = 'castThrow';
    this.body.power = 0;
    this.bobber.visible = true;
    this.line.visible = true;
    this.hooks.play('cast', { volume: 0.7, rate: 0.9 + this.power * 0.2 });
  }

  private reelIn(): void {
    this.state = 'returning';
    this.flight = { from: this.bobber.position.clone(), to: this.body.rodTip.clone(), t: 0, dur: 0.35 };
    this.body.action = 'hold';
    this.hooks.exclaim?.(false);
  }

  private hook(): void {
    if (!this.conditionsNow || !this.zone) return;
    this.fish = rollCatch(this.conditionsNow, this.rand);
    const s = BY_ID[this.fish.species];
    const frac = (this.fish.size - s.size[0]) / (s.size[1] - s.size[0] || 1);
    this.reel = startReel(this.rand);
    this.state = 'reeling';
    this.fishIcon = `${import.meta.env.BASE_URL}icons/fish-${this.fish.species}.webp`;
    this.body.action = 'reel';
    this.hooks.play('splash', { volume: 0.5 });
    this.hooks.bump(0.12);
    this.fx.splash(this.bobber.position, 0.6);
    // A finer fish fights a little harder.
    const f = fighterFor(s.fight, frac);
    f.fight *= 1 + VARIANT_STARS[this.fish.variant] * 0.07;
    (this.reel as ReelState & { fighter?: ReturnType<typeof fighterFor> }).fighter = f;
    this.hooks.tip?.('reel');
  }

  update(dt: number, held: boolean, rod: Rod, bait: Bait): void {
    this.t += dt;
    void bait;
    const tip = this.body.rodTip;
    switch (this.state) {
      case 'aiming': {
        // The meter rises and falls, so timing the release matters.
        this.powerT += dt;
        this.power = 0.5 - 0.5 * Math.cos(this.powerT * 3.4);
        this.body.power = this.power;
        this.body.group.rotation.y = this.aimYaw;
        break;
      }
      case 'flying': {
        const f = this.flight;
        f.t += dt / f.dur;
        this.body.power = Math.min(1, f.t * 2);
        const k = Math.min(1, f.t);
        this.bobber.position.lerpVectors(f.from, f.to, k);
        this.bobber.position.y += Math.sin(k * Math.PI) * (2 + f.from.distanceTo(f.to) * 0.18);
        if (k >= 1) {
          this.landBobber();
        }
        break;
      }
      case 'waiting': {
        this.timer -= dt;
        this.nextNibble -= dt;
        if (this.nibblesLeft > 0 && this.nextNibble <= 0) {
          this.nibblesLeft--;
          this.nextNibble = 0.8 + this.rand() * 1.4;
          this.dip = 0.35;
          this.hooks.play('nibble', { volume: 0.6, rate: 0.9 + this.rand() * 0.3 });
          this.fx.ring(this.bobber.position, 0.5);
        }
        if (this.timer <= 0 && this.nibblesLeft === 0) {
          this.state = 'bite';
          this.timer = this.hookWindow;
          this.dip = 1;
          this.hooks.play('bite', { volume: 0.9 });
          this.hooks.tip?.('bite');
          this.fx.splash(this.bobber.position, 0.5);
          this.hooks.bump(0.06);
        }
        this.floatBobber(dt);
        break;
      }
      case 'bite': {
        this.timer -= dt;
        this.dip = Math.max(this.dip, 0.7 + Math.sin(this.t * 30) * 0.3);
        this.floatBobber(dt);
        if (this.timer <= 0) {
          this.hooks.toast('It got away… wait for the next bite.');
          this.startWaiting();
        }
        break;
      }
      case 'reeling': {
        const r = this.reel!;
        const fighter = (r as ReelState & { fighter?: { fight: number } }).fighter ?? { fight: 0.3 };
        this.reel = stepReel(r, dt, held, fighter, rod, this.rand);
        const n = this.reel;
        this.body.strain = n.tension;
        this.hooks.reelSound(held ? 0.5 : 0, held ? 1 + n.tension * 0.4 : 1);
        // The bobber comes in toward the player as the fish does, darting about when it fights.
        const home = new THREE.Vector3(this.body.group.position.x, this.level, this.body.group.position.z);
        const start = this.flight.to;
        const p = start.clone().lerp(home, n.progress * 0.82);
        if (n.thrashing) {
          if (!r.thrashing) this.hooks.tip?.('thrash');
          p.x += Math.sin(this.t * 17) * 0.35;
          p.z += Math.cos(this.t * 13) * 0.35;
          if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) this.fx.splash(p, 0.35);
        }
        p.y = this.level - 0.05;
        this.bobber.position.lerp(p, 1 - Math.exp(-dt * 8));
        if (n.outcome === 'landed') this.land();
        else if (n.outcome === 'snapped') {
          this.hooks.reelSound(0, 1);
          this.hooks.play('snap');
          this.hooks.bump(0.2);
          this.hooks.snapped();
          this.finish();
        } else if (n.outcome === 'escaped') {
          this.hooks.reelSound(0, 1);
          this.hooks.escaped();
          this.finish();
        }
        break;
      }
      case 'landing': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.body.hold(null);
          this.body.action = 'idle';
          this.state = 'ready';
        }
        break;
      }
      case 'returning': {
        const f = this.flight;
        f.t += dt / f.dur;
        const k = Math.min(1, f.t);
        this.bobber.position.lerpVectors(f.from, tip, k);
        this.bobber.position.y += Math.sin(k * Math.PI) * 1.2;
        if (k >= 1) {
          this.bobber.visible = false;
          this.line.visible = false;
          this.state = 'ready';
          if (this.body.action !== 'walk') this.body.action = 'idle';
        }
        break;
      }
      default:
        break;
    }
    if (this.line.visible) this.drawLine();
  }

  private landBobber(): void {
    if (!this.zone) {
      this.hooks.toast('That landed on dry land! Aim at the water.');
      this.state = 'waiting';
      this.timer = 999;
      this.nibblesLeft = 0;
      setTimeout(() => this.state === 'waiting' && this.reelIn(), 900);
      return;
    }
    this.hooks.play('plop', { volume: 0.8 });
    this.fx.splash(this.bobber.position, 0.35);
    this.startWaiting();
  }

  private startWaiting(): void {
    if (!this.zone) return;
    this.conditionsNow = this.hooks.conditions(this.zone);
    this.state = 'waiting';
    this.timer = biteDelay(this.conditionsNow, this.rand);
    this.nibblesLeft = nibbles(this.rand);
    this.nextNibble = 0.6 + this.rand() * Math.max(0.5, this.timer * 0.4);
    this.body.action = 'hold';
    this.hooks.exclaim?.(false);
  }

  private floatBobber(dt: number): void {
    this.dip = Math.max(0, this.dip - dt * 2.2);
    const bob = Math.sin(this.t * 2.2) * 0.025 - this.dip * 0.16;
    this.bobber.position.y = this.level + bob;
  }

  private land(): void {
    const c = this.fish!;
    this.hooks.reelSound(0, 1);
    this.hooks.play('splash');
    this.fx.splash(this.bobber.position, 1);
    this.bobber.visible = false;
    this.line.visible = false;
    this.state = 'landing';
    this.timer = 2.6;
    this.body.action = 'show';
    const s = BY_ID[c.species];
    const length = Math.min(1.6, Math.max(0.4, (c.size / 100) * 1.1 + 0.15));
    void this.body.hold(`fish-${c.species}`, s.tier === 'junk' ? 0.45 : length);
    if (c.variant !== 'normal') this.fx.sparkle(this.body.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)), c.variant === 'golden');
    this.hooks.landed(c, this.zone!);
  }

  /** The conditions the last fish was hooked in, for the game's extras (a second fish on a twin hook). */
  get lastConditions(): Conditions | null {
    return this.conditionsNow;
  }

  private finish(): void {
    this.bobber.visible = false;
    this.line.visible = false;
    this.state = 'ready';
    this.body.action = 'idle';
  }

  /** The line, from the rod tip to the bobber, sagging when slack and straight when it is pulled. */
  private drawLine(): void {
    const a = this.body.rodTip;
    const b = this.bobber.position;
    const tight = this.state === 'reeling' ? 0.15 + (1 - (this.reel?.tension ?? 0)) * 0.3 : this.state === 'flying' || this.state === 'returning' ? 0.1 : 1;
    const span = a.distanceTo(b);
    const sag = span * 0.12 * tight;
    const cam = (this.line as THREE.Mesh & { camPos?: THREE.Vector3 }).camPos ?? new THREE.Vector3();
    const n = this.linePos.length / 6;
    const p = new THREE.Vector3();
    const prev = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      p.lerpVectors(a, b, k);
      p.y -= Math.sin(k * Math.PI) * sag + k * k * 0.0;
      // Wide enough to see from where the camera is: about a pixel and a half.
      const w = Math.max(0.006, cam.distanceTo(p) * 0.0016);
      const along = i === 0 ? b.clone().sub(a) : p.clone().sub(prev);
      side.crossVectors(along, cam.clone().sub(p)).normalize().multiplyScalar(w);
      if (!Number.isFinite(side.x)) side.set(w, 0, 0);
      this.linePos.set([p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z], i * 6);
      prev.copy(p);
    }
    (this.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    void UP;
  }

  /** Where the camera is, so the line can be drawn facing it. */
  setCamera(pos: THREE.Vector3): void {
    (this.line as THREE.Mesh & { camPos?: THREE.Vector3 }).camPos = pos;
  }
}

