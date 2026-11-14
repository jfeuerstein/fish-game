// The game: builds the island, runs the frame loop, and ties together the player, fishing,
// the islanders, the boat, the menus and the save.
import * as THREE from 'three';
import { loadIndex } from '../assets/models';
import { Audio } from '../audio/audio';
import { parseConfig } from '../config';
import { BY_ID, TIER_COLOR, TIER_LABEL, type Catch, sayLength } from '../fishing/fish';
import { Fishing } from '../fishing/fishing';
import { Effects } from '../fx/particles';
import { Controls } from '../input/controls';
import { NPCS, Npc, Shopkeeper } from '../npc/npcs';
import { CameraRig } from '../player/camera';
import { Character } from '../player/character';
import { Player } from '../player/player';
import { bagSheet } from '../ui/bag';
import { boardSheet } from '../ui/board';
import { Chalk } from '../ui/chalk';
import { chestSheet } from '../ui/chests';
import { funSheet } from '../ui/fun';
import { Hud } from '../ui/hud';
import { journalSheet } from '../ui/journal';
import { moreSheet } from '../ui/more';
import { Sheet } from '../ui/sheet';
import { shopSheet } from '../ui/shop';
import { Uke } from '../ui/uke';
import { Boat } from '../world/boat';
import { fishingZone, shoreRadius } from '../world/island';
import { CAMP, PIER, PLACES, PLACED } from '../world/layout';
import { PlacedThings } from '../world/placed';
import type { Seat } from '../world/props';
import { World } from '../world/world';
import { bitesAt, dayNumber, hourAt, pinnedHour, rainingAt, sayHour } from './clock';
import { baitById, levelFor, rodById } from './economy';
import { applyCatch } from './progress';
import { SAVE_KEY, type Save, parseSave } from './save';
import type { Session } from './session';

type Mode = 'walk' | 'sit' | 'boat' | 'emote' | 'uke' | 'chalk';

export class Game implements Session {
  readonly cfg = parseConfig(location.search);
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 1, 0.2, 1500);
  world!: World;
  player!: Player;
  body!: Character;
  rig!: CameraRig;
  controls!: Controls;
  hud!: Hud;
  audio = new Audio();
  fx = new Effects();
  fishing!: Fishing;
  npcs: Npc[] = [];
  gus!: Shopkeeper;
  boat!: Boat;
  chalk!: Chalk;
  uke!: Uke;
  placed!: PlacedThings;
  save: Save;
  hour = 12;
  raining = false;
  rain = 0;
  pin: Session['pin'];
  private mode: Mode = 'walk';
  private seat: Seat | null = null;
  private emoteTimer = 0;
  private clock = new THREE.Clock();
  private frames = 0;
  private dirty = false;
  private savedAt = 0;
  private sheets!: Record<'shop' | 'journal' | 'bag' | 'board' | 'chests' | 'more' | 'fun', Sheet>;
  private app!: HTMLElement;
  private shopFront = new THREE.Vector3(0, 0, 9);
  private board = new THREE.Vector3(10, 0, 9);
  private started = false;
  private lastStats = '';

  constructor() {
    let text: string | null = null;
    try {
      text = this.cfg.fresh ? null : localStorage.getItem(SAVE_KEY);
    } catch {
      /* No storage: the game plays and forgets. */
    }
    this.save = parseSave(text);
    this.pin = { time: this.cfg.time, weather: this.cfg.weather };
  }

  async boot(): Promise<void> {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.app = document.getElementById('app')!;
    const low = this.cfg.low || this.save.settings.quality === 'low';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.5 : 2));
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const resize = (): void => {
      const w = this.app.clientWidth;
      const h = this.app.clientHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.fov = w < h ? 58 : 50;
      this.camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(this.app);

    await loadIndex();
    this.world = new World(this.scene, !low);
    this.scene.add(this.fx.group);
    const bar = document.getElementById('load-bar')!;
    this.body = new Character(this.save.character, 1.1);
    this.scene.add(this.body.group);
    this.player = new Player(this.body, this.world.field, this.world.solid);
    this.boat = new Boat(this.world.field);
    this.gus = new Shopkeeper(this.scene);
    this.npcs = NPCS.map((d) => new Npc(d, this.world.field, this.scene));
    const models = this.cfg.models;
    await Promise.all([
      this.world.populate((d, n) => (bar.style.width = `${Math.round((d / n) * 100)}%`), models),
      models ? this.body.load() : Promise.resolve(),
      models ? this.boat.load(this.scene) : Promise.resolve(),
    ]);
    // The shop's counter, and the board, from the sizes of their models.
    const shop = PLACED.find((p) => p.id === 'shop')!;
    const depth = this.world.props.sizes.get('shop')?.z ?? 6;
    this.shopFront.set(shop.x, 0, shop.z + depth / 2 + 1.4);
    const boardAt = PLACED.find((p) => p.id === 'notice-board')!;
    this.board.set(boardAt.x + Math.sin(boardAt.yaw ?? 0) * 1.6, 0, boardAt.z + Math.cos(boardAt.yaw ?? 0) * 1.6);
    if (models) {
      await this.body.setRod(this.save.rod);
      await this.body.setHat(this.save.hat);
      await Promise.all([this.gus.load(new THREE.Vector3(shop.x + 2.6, this.world.field.heightAt(shop.x + 2.6, this.shopFront.z - 0.4), this.shopFront.z - 0.4), 0), ...this.npcs.map((n) => n.load())]);
    }
    const at = PLACES[this.cfg.at ?? 'plaza'] ?? PLACES.plaza;
    this.player.place(at.x, at.z, at.yaw);
    this.player.onStep = (surface) => this.audio.play(surface === 'wood' ? 'stepwood' : surface === 'water' ? 'splashstep' : 'step', { volume: 0.18, rate: 0.9 + Math.random() * 0.2 });
    this.rig = new CameraRig(this.camera, this.world.field);
    this.rig.yaw = this.cfg.yaw ?? at.yaw + Math.PI;
    if (this.cfg.zoom) this.rig.zoom = this.cfg.zoom;
    this.controls = new Controls(this.app);
    this.controls.onPush = () => this.stopActivity();
    this.audio.muted = this.cfg.mute;
    this.hud = new Hud(document.getElementById('hud')!, () => this.audio.unlock());
    if (!this.cfg.hud) this.hud.show(false);
    this.fishing = new Fishing(this.world.field, this.body, this.fx, this.fishingHooks(), this.scene);
    this.chalk = new Chalk(this.app, this.camera);
    this.chalk.onDone = () => this.endChalk();
    this.chalk.onStroke = () => this.audio.play('chalk', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
    this.world.group.add(this.chalk.mesh);
    this.uke = new Uke(this.app, this.audio);
    this.uke.onNote = () => (this.body.pluck = 1);
    this.uke.onDone = () => this.stopActivity();
    this.placed = new PlacedThings(this.world, this.world.field);
    for (const p of this.save.placed) await this.placed.add(p);

    const openChests = (): void => this.sheets.chests.show();
    this.sheets = {
      shop: shopSheet(this.app, this, openChests),
      journal: journalSheet(this.app, this),
      bag: bagSheet(this.app, this),
      board: boardSheet(this.app, this),
      chests: chestSheet(this.app, this),
      more: moreSheet(this.app, this, openChests),
      fun: funSheet(this.app, this, () => Chalk.near(this.player.pos)),
    };
    for (const s of Object.values(this.sheets)) s.onClose = () => (this.controls.enabled = true);
    const open = (s: Sheet): void => {
      this.fishing.cancel();
      this.controls.release();
      this.controls.enabled = false;
      this.audio.play('open', { volume: 0.5 });
      s.show();
    };
    this.hud.menu.bag.onclick = () => open(this.sheets.bag);
    this.hud.menu.journal.onclick = () => open(this.sheets.journal);
    this.hud.menu.fun.onclick = () => open(this.sheets.fun);
    this.hud.menu.more.onclick = () => open(this.sheets.more);
    this.applySettings();

    window.addEventListener('pointerdown', () => this.audio.unlock(), { capture: true });
    document.addEventListener('visibilitychange', () => document.hidden && this.keep(true));
    window.addEventListener('pagehide', () => this.keep(true));

    const start = document.getElementById('start') as HTMLButtonElement;
    start.disabled = false;
    start.textContent = 'Go fishing';
    const title = document.getElementById('title')!;
    const go = (): void => {
      this.audio.unlock();
      title.classList.add('gone');
      setTimeout(() => title.remove(), 700);
      this.started = true;
      this.welcome();
    };
    start.onclick = go;
    if (!this.cfg.title) go();

    this.ready = true;
    (window as unknown as Record<string, unknown>).__cove = this.api();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  ready = false;

  private welcome(): void {
    if (this.cfg.hud === false) return;
    if (!this.save.hints.includes('welcome')) {
      this.save.hints.push('welcome');
      this.changed();
      setTimeout(() => this.hud.toast('Welcome to Driftwood Cove!'), 400);
      setTimeout(() => this.hud.toast('Walk to the water, face it, and hold Cast.'), 3200);
    }
  }

  private fishingHooks(): ConstructorParameters<typeof Fishing>[3] {
    return {
      conditions: (zone) => ({ zone, hour: this.hour, raining: this.raining, rod: rodById(this.save.rod), bait: baitById(this.save.bait) }),
      landed: (c, zone) => this.landed(c, zone),
      snapped: () => {
        this.save.stats.snapped++;
        if (this.save.bait !== 'bait-worm') {
          this.save.baits[this.save.bait] = Math.max(0, (this.save.baits[this.save.bait] ?? 0) - 1);
          if (!this.save.baits[this.save.bait]) this.save.bait = 'bait-worm';
        }
        this.hud.toast('Snap! The line broke. Let go sooner next time.');
        this.changed();
      },
      escaped: () => this.hud.toast('It slipped off the hook.'),
      play: (n, o) => this.audio.play(n, o),
      reelSound: (v, r) => this.audio.loop('reel', v, 'sfx', r),
      toast: (t) => this.hud.toast(t),
      bump: (a) => this.rig.bump(a),
      room: () => true,
      exclaim: () => undefined,
    };
  }

  private landed(c: Catch, zone: Parameters<typeof applyCatch>[2]): void {
    const night = !bitesAt('day', this.hour);
    const r = applyCatch(this.save, c, zone, night, this.raining);
    const s = BY_ID[c.species];
    this.hud.showCatch({ icon: `${import.meta.env.BASE_URL}icons/fish-${c.species}.webp`, name: s.name, size: sayLength(c.size) + (c.huge ? ' · huge!' : ''), tier: TIER_LABEL[s.tier], tierColor: TIER_COLOR[s.tier], variant: c.variant, value: r.value, first: r.first, best: r.best, tokens: r.tokens });
    this.audio.play(c.variant !== 'normal' || s.tier === 'legendary' || s.tier === 'epic' ? 'rare' : 'catch', { volume: 0.8 });
    if (!r.kept) this.hud.toast('Your cooler is full, so you let it go. Sell some at the shop!');
    if (r.tokens) setTimeout(() => this.hud.toast(`+${r.tokens} token${r.tokens > 1 ? 's' : ''}! Open a chest at the shop.`, 'gold'), 700);
    for (const _ of r.finished) setTimeout(() => this.hud.toast('An errand is done! Hand it in at the board.', 'good'), 1200);
    if (r.levelUp) {
      setTimeout(() => {
        this.audio.play('levelup');
        this.hud.toast(`Level ${r.levelUp}! New things at the shop.`, 'gold');
      }, 1600);
    }
    this.changed();
  }

  // ---------- Session ----------

  changed(): void {
    this.dirty = true;
  }

  private keep(now = false): void {
    if (this.cfg.fresh || !this.dirty) return;
    if (!now && performance.now() - this.savedAt < 2000) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
      this.dirty = false;
      this.savedAt = performance.now();
    } catch {
      /* Not kept. */
    }
  }

  wear(hat: string | null): void {
    this.save.hat = hat;
    void this.body.setHat(hat);
    this.changed();
  }

  become(character: string): void {
    if (!this.save.characters.includes(character) || character === this.save.character) return;
    this.save.character = character;
    this.changed();
    // A new body, holding what the old one held.
    const old = this.body;
    const fresh = new Character(character, 1.1);
    this.scene.add(fresh.group);
    void fresh.load().then(async () => {
      old.dispose();
      this.body = fresh;
      (this.player as unknown as { body: Character }).body = fresh;
      await fresh.setRod(this.save.rod);
      await fresh.setHat(this.save.hat);
      this.fishing = new Fishing(this.world.field, fresh, this.fx, this.fishingHooks(), this.scene);
      this.player.sync();
    });
  }

  setDown(id: string): void {
    if (!(this.save.furniture[id] > 0)) return;
    const yaw = this.player.yaw;
    const x = this.player.pos.x + Math.sin(yaw) * 1.6;
    const z = this.player.pos.z + Math.cos(yaw) * 1.6;
    const thing = { id, x, z, yaw: yaw + Math.PI };
    this.save.furniture[id]--;
    this.save.placed.push(thing);
    void this.placed.add(thing);
    this.audio.play('click');
    this.changed();
  }

  playUke(): void {
    this.stopActivity();
    this.mode = 'uke';
    this.player.free = false;
    this.body.action = 'uke';
    void this.body.hold('ukulele', 0.62);
    this.uke.show();
  }

  emote(name: 'wave' | 'dance' | 'cheer' | 'clap' | 'sit'): void {
    this.stopActivity();
    this.mode = 'emote';
    this.player.free = false;
    this.body.action = name;
    this.emoteTimer = name === 'dance' || name === 'sit' ? Infinity : 3;
    if (name === 'sit') this.body.group.position.y -= 0.32;
    if (name === 'wave') this.audio.play('wave', { volume: 0.5 });
  }

  teleport(name: string): void {
    const p = PLACES[name];
    if (!p) return;
    this.stopActivity();
    if (this.mode === 'boat') this.leaveBoat();
    this.player.place(p.x, p.z, p.yaw);
    this.rig.yaw = p.yaw + Math.PI;
  }

  applySettings(): void {
    this.audio.setVolumes({ sfx: this.save.settings.sfx, ambience: this.save.settings.ambience, music: this.save.settings.music });
  }

  // ---------- Activities ----------

  /** The stick was pushed: stand up, stop dancing, put the ukulele away, reel in. */
  private stopActivity(): void {
    if (this.fishing?.busy && this.fishing.state !== 'landing') this.fishing.cancel();
    if (this.mode === 'sit' || this.mode === 'emote' || this.mode === 'uke') {
      if (this.mode === 'uke') {
        void this.body.hold(null);
        if (this.uke.open) this.uke.hide();
      }
      this.mode = 'walk';
      this.seat = null;
      this.player.free = true;
      this.body.action = 'idle';
      this.player.place(this.player.pos.x, this.player.pos.z, this.player.yaw);
    }
  }

  private sitOn(seat: Seat): void {
    this.stopActivity();
    this.mode = 'sit';
    this.seat = seat;
    this.player.free = false;
    this.player.pos.set(seat.x, seat.y, seat.z);
    this.player.yaw = seat.yaw;
    this.player.sync();
    this.body.group.position.y = seat.y + seat.lift - 0.36;
    this.body.action = 'sit';
  }

  private boardBoat(): void {
    this.stopActivity();
    this.mode = 'boat';
    this.boat.aboard = true;
    this.player.free = false;
    this.body.action = 'row';
    this.audio.play('row');
    this.hud.toast('Push the stick to row. Cast from the boat as anywhere else.');
  }

  private leaveBoat(): void {
    this.fishing.cancel();
    this.boat.tieUp();
    this.mode = 'walk';
    this.player.free = true;
    this.body.action = 'idle';
    this.player.place(PLACES.boat.x, PLACES.boat.z, PLACES.boat.yaw);
  }

  private startChalk(): void {
    this.stopActivity();
    this.mode = 'chalk';
    this.player.free = false;
    this.controls.enabled = false;
    this.hud.show(false);
    this.rig.override = { pos: this.chalk.mesh.position.clone(), dist: 9.5, pitch: 1.5 };
    this.chalk.start();
  }

  private endChalk(): void {
    this.mode = 'walk';
    this.player.free = true;
    this.controls.enabled = true;
    this.rig.override = null;
    if (this.cfg.hud) this.hud.show(true);
  }

  /** Is there water to cast into, out ahead of the camera? */
  private waterAhead(): boolean {
    const f = this.rig.forward();
    const reach = rodById(this.save.rod).reach;
    for (let d = 3; d <= reach; d += 1.5) {
      if (fishingZone(this.world.field, this.player.pos.x + f.x * d, this.player.pos.z + f.z * d)) return true;
    }
    return false;
  }

  private nearSeat(): Seat | null {
    let best: Seat | null = null;
    let bd = 1.7;
    for (const s of [...this.world.props.seats, ...this.placed.seats()]) {
      const d = Math.hypot(s.x - this.player.pos.x, s.z - this.player.pos.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** What the two buttons offer here and now. */
  private context(): void {
    const hud = this.hud;
    const rod = rodById(this.save.rod);
    const f = this.fishing;
    const p = this.player.pos;
    const sheetOpen = !!Sheet.current;
    if (this.mode === 'chalk' || this.mode === 'uke' || sheetOpen) {
      hud.setAction(null);
      hud.setSecond(null);
      return;
    }
    // Fishing comes first once a line is out.
    if (f.busy) {
      hud.setSecond(null);
      switch (f.state) {
        case 'aiming':
          hud.setAction('Cast!', undefined, () => f.release(rod), 'blue');
          return;
        case 'waiting':
          hud.setAction('Reel in', () => f.press(this.rig.yaw + Math.PI, rod), undefined, 'blue');
          return;
        case 'bite':
          hud.setAction('Hook!', () => f.press(this.rig.yaw + Math.PI, rod), undefined, 'pulse');
          return;
        case 'reeling':
          hud.setAction('Reel', () => undefined, () => undefined, 'blue');
          return;
        default:
          hud.setAction(null);
          return;
      }
    }
    const aim = this.rig.yaw + Math.PI;
    const cast = (): void => {
      if (this.mode === 'emote') this.stopActivity();
      f.press(aim, rod);
    };
    // The secondary button: whatever is close by.
    const npc = this.npcs.find((n) => n.pos.distanceTo(p) < 2.8);
    const gusNear = this.gus.body.group.position.distanceTo(p) < 3;
    const seat = this.mode === 'walk' ? this.nearSeat() : null;
    const thing = this.mode === 'walk' ? this.placed.near(p) : null;
    if (this.mode === 'boat') hud.setSecond(this.boat.nearMooring(this.boat.pos) ? 'Get out' : null, () => this.leaveBoat());
    else if (this.mode === 'sit') hud.setSecond('Stand up', () => this.stopActivity());
    else if (npc) hud.setSecond(`Chat`, () => {
      npc.chat(performance.now());
      this.audio.play('wave', { volume: 0.4, rate: 0.9 + Math.random() * 0.3 });
    });
    else if (gusNear && this.shopFront.distanceTo(new THREE.Vector3(p.x, 0, p.z)) >= 3.2) hud.setSecond('Chat', () => this.gus.chat(performance.now()));
    else if (seat) hud.setSecond('Sit', () => this.sitOn(seat));
    else if (this.boat.nearMooring(p) && p.y > 2) hud.setSecond(this.save.boat ? 'Row' : 'Boat', () => (this.save.boat ? this.boardBoat() : this.hud.toast('The rowboat needs a licence. Gus sells them (Upgrades).')));
    else if (Chalk.near(p)) hud.setSecond('Draw', () => this.startChalk());
    else if (thing) hud.setSecond('Pick up', () => {
      this.placed.remove(thing);
      this.save.placed = this.save.placed.filter((x) => x !== thing);
      this.save.furniture[thing.id] = (this.save.furniture[thing.id] ?? 0) + 1;
      this.audio.play('click');
      this.changed();
    });
    else hud.setSecond(null);
    // The main button.
    const flat = new THREE.Vector3(p.x, 0, p.z);
    if (this.mode !== 'boat' && flat.distanceTo(this.shopFront) < 3.2) hud.setAction('Shop', () => this.openSheet('shop'), undefined, 'green');
    else if (this.mode !== 'boat' && flat.distanceTo(this.board) < 2.6) hud.setAction('Errands', () => this.openSheet('board'), undefined, 'green');
    else if ((this.mode === 'walk' || this.mode === 'boat' || this.mode === 'emote') && this.waterAhead()) hud.setAction('Cast', cast, () => f.release(rod));
    else hud.setAction(null);
  }

  openSheet(name: keyof Game['sheets']): void {
    this.fishing.cancel();
    this.controls.release();
    this.controls.enabled = false;
    this.audio.play('open', { volume: 0.5 });
    this.sheets[name].show();
  }

  // ---------- The frame ----------

  private frame(): void {
    const dt = Math.min(0.05, this.clock.getDelta()) * this.cfg.warp;
    this.frames++;
    const now = Date.now();
    const mode = this.save.settings.clock;
    const tz = new Date().getTimezoneOffset();
    this.hour = pinnedHour(this.pin.time) ?? hourAt(now, mode, tz);
    this.raining = this.pin.weather ? this.pin.weather === 'rain' : rainingAt(now, mode);
    this.rain += ((this.raining ? 1 : 0) - this.rain) * (1 - Math.exp(-dt * 0.4));
    if (this.frames < 3) this.rain = this.raining ? 1 : 0;
    void dayNumber;

    const look = this.controls.takeLook();
    this.rig.turn(look.x, look.y);
    this.rig.zoomBy(look.zoom);
    const stick = this.controls.enabled ? this.controls.stick() : { x: 0, y: 0 };
    // Walking off ends whatever was going on (the keyboard has no push event, so check here too).
    if (Math.hypot(stick.x, stick.y) > 0.3 && (this.mode === 'sit' || this.mode === 'emote' || (this.fishing.busy && this.fishing.state !== 'landing' && this.mode !== 'boat'))) this.stopActivity();

    if (this.mode === 'boat') {
      this.boat.update(dt, this.fishing.busy ? { x: 0, y: 0 } : stick, this.rig.yaw);
      const seatAt = this.boat.seat();
      this.player.pos.copy(seatAt);
      if (!this.fishing.busy) this.player.yaw = this.boat.yaw;
      this.player.sync();
      if (!this.fishing.busy) {
        this.body.action = 'row';
        this.body.speed = this.boat.effort;
      }
      this.audio.loop('row', 0, 'sfx');
      if (this.boat.effort > 0.3 && Math.floor(performance.now() / 950) !== Math.floor((performance.now() - dt * 1000) / 950)) this.audio.play('row', { volume: 0.35 });
    } else {
      this.boat.update(dt, { x: 0, y: 0 }, 0);
      if (this.mode === 'walk') this.player.update(dt, stick, this.rig.yaw);
      else this.player.update(dt, { x: 0, y: 0 }, this.rig.yaw);
    }
    if (this.mode === 'sit' && this.seat) this.body.group.position.y = this.seat.y + this.seat.lift - 0.36;
    if (this.mode === 'emote') {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) this.stopActivity();
    }

    const rod = rodById(this.save.rod);
    this.fishing.update(dt, this.hud.held, rod, baitById(this.save.bait));
    this.fishing.setCamera(this.camera.position);
    // While casting or reeling, the camera swings round behind the line.
    if (this.fishing.state === 'aiming') this.body.group.rotation.y = this.rig.yaw + Math.PI;
    if (this.fishing.state === 'aiming' || this.fishing.state === 'flying') this.player.yaw = this.rig.yaw + Math.PI;
    this.body.update(dt);
    for (const n of this.npcs) n.update(dt, this.player.pos);
    this.gus.update(dt);

    this.rig.update(dt, this.mode === 'sit' || this.mode === 'boat' ? this.player.pos.clone().setY(this.player.pos.y - 0.2) : this.player.pos);
    this.world.update(dt, this.hour, this.rain, this.player.pos);
    this.fx.setRain(this.rain);
    this.fx.update(dt, this.camera);

    if (this.started) {
      this.context();
      this.hud.setReel(this.fishing.reelState ? this.fishing.reelState.progress : null, this.fishing.reelState?.tension ?? 0, this.fishing.reelState?.thrashing ?? false, this.fishing.fishIcon);
      this.hud.setPower(this.fishing.castPower);
      this.overheads();
      this.sound(dt);
    }
    const lv = levelFor(this.save.xp);
    const stats = `${this.save.coins}|${this.save.tokens}|${lv.level}|${lv.into}`;
    if (stats !== this.lastStats) {
      this.lastStats = stats;
      this.hud?.setStats(this.save.coins, this.save.tokens, lv.level, lv.into / lv.need);
    }
    this.hud?.setClock(sayHour(this.hour), this.raining, this.world.sky.palette.night > 0.5);
    this.keep();
    this.renderer.render(this.scene, this.camera);
  }

  /** Speech bubbles over islanders, and the "!" over the player when a fish bites. */
  private overheads(): void {
    const toScreen = (v: THREE.Vector3): { x: number; y: number; on: boolean } => {
      const p = v.clone().project(this.camera);
      return { x: (p.x * 0.5 + 0.5) * this.app.clientWidth, y: (-p.y * 0.5 + 0.5) * this.app.clientHeight, on: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
    };
    const now = performance.now();
    let said = false;
    for (const who of [...this.npcs, this.gus]) {
      if (who.saying && who.saying.until > now) {
        const s = toScreen(who.body.group.position.clone().add(new THREE.Vector3(0, 1.7, 0)));
        if (s.on) {
          this.hud.say(who.saying.text, s.x, s.y);
          said = true;
        }
      }
    }
    if (!said) this.hud.say(null);
    if (this.fishing.state === 'bite') {
      const s = toScreen(this.player.pos.clone().add(new THREE.Vector3(0, 1.75, 0)));
      this.hud.exclaim(true, s.x, s.y);
    } else this.hud.exclaim(false);
  }

  /** The ambience of wherever the player is, and the music for the hour and weather. */
  private sound(dt: number): void {
    void dt;
    const p = this.player.pos;
    const shore = shoreRadius(Math.atan2(p.z, p.x)) - Math.hypot(p.x, p.z);
    const onPier = p.x > PIER.x0 - 2;
    const sea = onPier || this.mode === 'boat' ? 1 : Math.max(0, Math.min(1, 1 - shore / 30));
    const night = this.world.sky.palette.night;
    this.audio.loop('waves', 0.25 + 0.6 * sea);
    this.audio.loop('birds', (1 - night) * (1 - this.rain) * 0.45);
    this.audio.loop('night', night * (1 - this.rain) * 0.5);
    this.audio.loop('rain', this.rain * 0.7);
    const fire = Math.max(0, 1 - Math.hypot(p.x - CAMP.x, p.z - CAMP.z) / 16);
    this.audio.loop('fire', fire * 0.6);
    this.audio.setMusic(this.rain > 0.5 ? 'rain' : night > 0.5 ? 'night' : 'day');
    const radio = this.placed.radioNear(p);
    this.audio.setVolumes({ sfx: this.save.settings.sfx, ambience: this.save.settings.ambience, music: Math.min(1, this.save.settings.music * (1 + radio * 1.2)) });
  }

  api(): Record<string, unknown> {
    return {
      ready: true,
      state: () => ({
        frames: this.frames,
        hour: +this.hour.toFixed(2),
        rain: +this.rain.toFixed(2),
        mode: this.mode,
        fishing: this.fishing.state,
        pos: this.player.pos.toArray().map((v) => +v.toFixed(2)),
        coins: this.save.coins,
        tokens: this.save.tokens,
        bag: this.save.bag.length,
        caught: this.save.stats.caught,
        calls: this.renderer.info.render.calls,
        tris: this.renderer.info.render.triangles,
      }),
      teleport: (name: string) => this.teleport(name),
      face: (yaw: number) => {
        this.rig.yaw = yaw + Math.PI;
        this.player.yaw = yaw;
        this.player.sync();
      },
      press: () => this.hudPress(true),
      release: () => this.hudPress(false),
      open: (name: keyof Game['sheets'], tab?: string) => {
        this.openSheet(name);
        if (tab) this.sheets[name].show(tab);
      },
      give: (coins: number, tokens = 0) => {
        this.save.coins += coins;
        this.save.tokens += tokens;
        this.changed();
      },
      catchNow: (species: string, variant: 'normal' | 'shiny' | 'golden' = 'normal') => {
        const s = BY_ID[species];
        this.landed({ species, size: (s.size[0] + s.size[1]) / 2, variant, huge: false, at: Date.now() }, s.zones[0]);
      },
      emote: (n: Parameters<Game['emote']>[0]) => this.emote(n),
      game: this,
    };
  }

  /** For the tools: press or release the main button. */
  private hudPress(down: boolean): void {
    const btn = document.querySelector('.act-main') as HTMLElement | null;
    if (!btn || btn.hidden) return;
    const r = btn.getBoundingClientRect();
    const opts = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 77, pointerType: 'touch' };
    btn.dispatchEvent(new PointerEvent(down ? 'pointerdown' : 'pointerup', opts));
  }
}
