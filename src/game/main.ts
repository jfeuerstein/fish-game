// The game: builds the island, runs the frame loop, and ties together the player, fishing,
// the islanders, the boat, the menus and the save.
import * as THREE from 'three';
import { loadIndex } from '../assets/models';
import { Audio } from '../audio/audio';
import { parseConfig } from '../config';
import { BY_ID, TIER_COLOR, TIER_LABEL, type Catch, quip, sayLength } from '../fishing/fish';
import { rollCatch } from '../fishing/roll';
import { Fishing } from '../fishing/fishing';
import { Effects } from '../fx/particles';
import { Screen } from '../fx/screen';
import { type Look, lookFor } from '../look/look';
import { setLook } from '../look/material';
import { Controls } from '../input/controls';
import { NPCS, Npc, Shopkeeper } from '../npc/npcs';
import { CameraRig } from '../player/camera';
import { Character } from '../player/character';
import { Player } from '../player/player';
import { bagSheet } from '../ui/bag';
import { boardSheet } from '../ui/board';
import { Chalk } from '../ui/chalk';
import { arcadeSheet } from '../ui/arcade';
import { Fanfare } from '../ui/fanfare';
import { model } from '../assets/models';
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
import { HATS, baitById, levelFor, lureById, rodById } from './economy';
import { newTitles } from './titles';
import { buriedToday, digUp, SHROOMS, SEA_GLASS } from '../world/secrets';
import { Finds } from '../world/finds';
import { applyCatch } from './progress';
import { BACKUP_KEY, SAVE_KEY, type Save, parseSave } from './save';
import type { Emote, Session } from './session';

type Mode = 'walk' | 'sit' | 'boat' | 'emote' | 'uke' | 'chalk' | 'dig';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
/** What islanders say when the player honks nearby, or slaps them with a fish. */
const HONKED = ['Was that you?', 'HONK to you too.', 'Bless you?', 'Who let the goose in?', 'I felt that in my fins.', 'Please never do that again.', 'Beautiful. Truly.'];
const SLAPPED = ['Ow! Rude.', 'Was that a FISH?', 'I did not deserve that.', 'Smells like mackerel now. Thanks.', 'Fair. I had it coming.', 'Slap me again and I tell Gus.', 'My dignity!'];
const MISSED = ['You slap the air with a fish. It feels good.', 'Nobody to slap. The fish is relieved.', 'A mighty swing, at nothing.'];

export class Game implements Session {
  readonly cfg = parseConfig(location.search);
  renderer!: THREE.WebGLRenderer;
  screen!: Screen;
  look!: Look;
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
  private sheets!: Record<'shop' | 'journal' | 'bag' | 'board' | 'more' | 'fun' | 'arcade', Sheet>;
  fanfare!: Fanfare;
  /** The arcade's counter, and its gull: what it is feeling, and for how much longer. */
  private arcadeFront = new THREE.Vector3(-14, 0, 9);
  private gull: THREE.Object3D | null = null;
  private gullHome = new THREE.Vector3();
  private gullYaw = 0;
  private gullMood: { mood: 'smug' | 'shocked'; t: number } | null = null;
  /** A honk hanging in the air over the player. */
  private shouting: { text: string; until: number } | null = null;
  private app!: HTMLElement;
  private shopFront = new THREE.Vector3(0, 0, 9);
  private board = new THREE.Vector3(10, 0, 9);
  private started = false;
  private lastStats = '';
  finds!: Finds;
  detecting = false;
  /** The island's rain cloud, following the player after a lucky catch, until this time (ms). */
  private cloudUntil = 0;
  private digging = 0;
  private buried: { x: number; z: number; key: string }[] = [];
  private buriedDay = -1;
  private beepClock = 0;
  private beepGap = 1;
  private nearBuried: { x: number; z: number; key: string } | null = null;
  private titleClock = 0;
  private viewClock = 0;

  constructor() {
    let text: string | null = null;
    try {
      text = this.cfg.fresh ? null : localStorage.getItem(SAVE_KEY);
      if (!this.cfg.fresh) {
        // If the save is ever lost or broken, an older copy is still there.
        let good = false;
        try {
          good = !!text && typeof JSON.parse(text) === 'object';
        } catch {
          good = false;
        }
        const backup = localStorage.getItem(BACKUP_KEY);
        if (!good && backup) text = JSON.parse(backup).save;
        else if (good) {
          const kept = backup ? (JSON.parse(backup) as { day: number }).day : -1;
          const today = Math.floor(Date.now() / 86_400_000);
          if (kept !== today) localStorage.setItem(BACKUP_KEY, JSON.stringify({ day: today, save: text }));
        }
      }
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
    const look = (this.look = lookFor(this.cfg.look, this.save.settings.pixels));
    setLook(look);
    Character.look = look;
    Character.eyes = this.cfg.eyes;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !look.lofi, powerPreference: 'high-performance' });
    this.screen = new Screen(this.renderer, look);
    this.renderer.shadowMap.enabled = !low;
    // A shadow in the lo-fi look is one flat tone with a hard, stepped edge.
    this.renderer.shadowMap.type = look.lofi ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = look.lofi ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const resize = (): void => {
      const w = this.app.clientWidth;
      const h = this.app.clientHeight;
      this.screen.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.fov = w < h ? 58 : 50;
      this.camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(this.app);

    await loadIndex();
    this.world = new World(this.scene, !low, look);
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
    const booth = PLACED.find((p) => p.id === 'arcade')!;
    const boothDepth = this.world.props.sizes.get('arcade')?.z ?? 4;
    const by = booth.yaw ?? 0;
    this.arcadeFront.set(booth.x + Math.sin(by) * (boothDepth / 2 + 1.4), 0, booth.z + Math.cos(by) * (boothDepth / 2 + 1.4));
    // The gull stands on the corner of the counter, beside whoever is playing.
    this.gullYaw = by;
    const side = new THREE.Vector3(Math.cos(by), 0, -Math.sin(by));
    this.gullHome.set(booth.x + Math.sin(by) * (boothDepth / 2 + 0.5) + side.x * 2.2, 0, booth.z + Math.cos(by) * (boothDepth / 2 + 0.5) + side.z * 2.2);
    this.gullHome.y = this.world.field.heightAt(this.gullHome.x, this.gullHome.z);
    if (models) {
      void model('gull').then((g) => {
        if (!g) return;
        this.gull = g;
        g.position.copy(this.gullHome);
        g.rotation.y = by;
        this.scene.add(g);
      });
    }
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
    this.rig.obstacles = this.world.props.group.children.filter((c) => /^(shop|lighthouse|fishing-hut|tent|well)/.test(c.name));
    this.rig.yaw = this.cfg.yaw ?? at.yaw + Math.PI;
    if (this.cfg.zoom) this.rig.zoom = this.cfg.zoom;
    this.controls = new Controls(this.app);
    this.controls.onPush = () => this.stopActivity();
    this.audio.muted = this.cfg.mute;
    this.audio.lofi = look.lofi;
    this.hud = new Hud(document.getElementById('hud')!, () => this.audio.unlock());
    if (!this.cfg.hud) this.hud.show(false);
    this.fishing = new Fishing(this.world.field, this.body, this.fx, this.fishingHooks(), this.scene);
    this.chalk = new Chalk(this.app, this.camera);
    this.chalk.onDone = () => this.endChalk();
    this.chalk.onStroke = () => this.audio.play('chalk', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
    this.world.group.add(this.chalk.mesh);
    this.uke = new Uke(this.app, this.audio, () => this.save);
    this.uke.onChange = () => this.changed();
    this.uke.onNote = () => (this.body.pluck = 1);
    this.uke.onDone = () => this.stopActivity();
    this.placed = new PlacedThings(this.world, this.world.field);
    for (const p of this.save.placed) await this.placed.add(p);
    this.finds = new Finds(this.world.field);
    this.world.group.add(this.finds.group);
    if (models) {
      await this.finds.load(this.save.glass);
      await this.body.setExtra(this.save.extra);
    }
    this.player.onLand = (v) => {
      if (v > 6) {
        this.audio.play('stepwood', { volume: 0.5, rate: 0.7 });
        this.rig.bump(Math.min(0.15, v * 0.01));
      }
    };
    this.hud.onJump = () => this.jump();
    window.addEventListener('keydown', (e) => e.key === ' ' && this.jump());

    // The chests are the Lucky Gull's wheel now: anything that offered them opens it there.
    const openChests = (): void => this.sheets.arcade.show('Wheel');
    this.fanfare = new Fanfare(this.app, this.audio);
    this.sheets = {
      arcade: arcadeSheet(this.app, this, {
        fanfare: this.fanfare,
        gull: (mood) => {
          this.gullMood = { mood, t: 0 };
          if (mood === 'smug') this.audio.squawk();
        },
        cheer: () => {
          if (this.mode === 'walk' && !this.fishing.busy) setTimeout(() => this.emote('cheer'), 300);
        },
      }),
      shop: shopSheet(this.app, this, openChests),
      journal: journalSheet(this.app, this),
      bag: bagSheet(this.app, this),
      board: boardSheet(this.app, this),
      more: moreSheet(this.app, this, openChests),
      fun: funSheet(this.app, this, () => Chalk.near(this.player.pos)),
    };
    // The stick comes back when the last sheet goes, not when one sheet gives way to another.
    for (const s of Object.values(this.sheets)) s.onClose = () => queueMicrotask(() => {
      if (!Sheet.current) this.controls.enabled = true;
    });
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

    if (this.cfg.zoo) await this.zoo(this.cfg.zoo);
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
      conditions: (zone) => ({ zone, hour: this.hour, raining: this.raining, rod: rodById(this.save.rod), bait: baitById(this.save.bait), lure: lureById(this.save.lure) }),
      tip: (id) => this.tip(id),
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

  private landed(c: Catch, zone: Parameters<typeof applyCatch>[2], second = false): void {
    if (c.species === 'treasure') return this.treasure();
    const night = !bitesAt('day', this.hour);
    const r = applyCatch(this.save, c, zone, night, this.raining);
    const s = BY_ID[c.species];
    const lure = lureById(this.save.lure);
    const notes: string[] = [];
    // A lucky clover sometimes brings a little bag of coins with the fish.
    if (lure.effect === 'lucky' && Math.random() < 0.22) {
      const bag = Math.round(10 + r.value * 0.6);
      this.save.coins += bag;
      notes.push(`+${bag} coin bag!`);
    }
    // A lucky catch can call a rain cloud, with rain fish under it.
    if (!second && Math.random() < (lure.effect === 'rain' ? 0.3 : 0.05)) {
      this.cloudUntil = performance.now() + 75000 / this.cfg.warp;
      setTimeout(() => this.hud.toast('A little rain cloud has gathered over you. Rain fish are biting!', 'good'), 2200);
    }
    this.hud.showCatch({ icon: `${import.meta.env.BASE_URL}icons/fish-${c.species}.webp`, name: s.name, size: sayLength(c.size) + (c.huge ? ' · huge!' : ''), tier: TIER_LABEL[s.tier], tierColor: TIER_COLOR[s.tier], variant: c.variant, value: r.value, first: r.first, best: r.best, tokens: r.tokens, quip: quip(c), note: [second ? 'Twin catch!' : '', ...notes].filter(Boolean).join(' ') || undefined });
    this.audio.play(c.variant === 'golden' || c.variant === 'prismatic' || c.variant === 'shiny' || s.tier === 'legendary' || s.tier === 'epic' ? 'rare' : 'catch', { volume: 0.8 });
    // The rarest catches get the arcade's fanfare too.
    if (s.tier === 'legendary' || c.variant === 'prismatic') this.fanfare.win('jackpot', s.tier === 'legendary' ? 'LEGENDARY!' : 'PRISMATIC!', s.name, TIER_COLOR[s.tier]);
    else if (c.variant === 'golden' || s.tier === 'epic') this.fanfare.burst(120, 0.5, 0.3, false);
    if (!r.kept) this.hud.toast('Your cooler is full, so you let it go. Sell some at the shop!');
    if (c.variant !== 'normal') this.tip('quality');
    if (r.tokens) setTimeout(() => this.hud.toast(`+${r.tokens} pearl${r.tokens > 1 ? 's' : ''}! Spend them at the Lucky Gull.`, 'gold'), 700);
    for (const _ of r.finished) setTimeout(() => this.hud.toast('An errand is done! Hand it in at the board.', 'good'), 1200);
    if (r.levelUp) {
      setTimeout(() => {
        this.audio.play('levelup');
        this.hud.toast(`Level ${r.levelUp}! New things at the shop.`, 'gold');
      }, 1600);
    }
    // A twin hook sometimes brings up a second fish.
    const cond = this.fishing.lastConditions;
    if (!second && lure.effect === 'twin' && cond && Math.random() < 0.18) {
      const extra = rollCatch({ ...cond, lure: undefined }, Math.random);
      if (extra.species !== 'treasure') setTimeout(() => this.landed(extra, zone, true), 1800);
    }
    this.checkTitles();
    this.changed();
  }

  /** A treasure chest on the line: opened on the spot. */
  private treasure(): void {
    const level = levelFor(this.save.xp).level;
    const coins = Math.round((60 + Math.random() * 160) * (1 + level * 0.08));
    this.save.coins += coins;
    const token = Math.random() < 0.3 ? 1 : 0;
    this.save.tokens += token;
    const missing = HATS.filter((h) => h.gift && !this.save.hats.includes(h.id));
    let hat = '';
    if (missing.length && Math.random() < 0.1) {
      const h = missing[Math.floor(Math.random() * missing.length)];
      this.save.hats.push(h.id);
      hat = h.name;
    }
    if (!this.save.journal.treasure) this.save.journal.treasure = { count: 0, best: 50, variants: ['normal'], first: Date.now() };
    this.save.journal.treasure.count++;
    this.hud.showCatch({ icon: `${import.meta.env.BASE_URL}icons/fish-treasure.webp`, name: 'Treasure Chest', size: 'It rattles!', tier: 'Treasure', tierColor: '#d79a1c', variant: 'golden', value: coins, first: false, best: false, tokens: token, quip: hat ? `Inside, wrapped in seaweed: a ${hat}!` : 'Coins, a little damp.', note: undefined });
    this.audio.play('rare');
    this.audio.play('coin');
    this.changed();
  }

  /** A word of help the first time something happens. */
  private tip(id: string): void {
    const key = `tip-${id}`;
    if (this.save.hints.includes(key) || !this.cfg.hud) return;
    this.save.hints.push(key);
    const words: Record<string, string> = {
      bite: 'A bite! Tap Hook! before it lets go.',
      reel: 'Hold Reel to wind it in.',
      thrash: 'It is thrashing! Let go for a moment, then reel again.',
      quality: 'A finer fish! Better bait finds more of these, and they are worth much more.',
    };
    if (words[id]) this.hud.toast(words[id]);
    this.changed();
  }

  private checkTitles(): void {
    for (const t of newTitles(this.save)) {
      setTimeout(() => this.hud.toast(`New title: ${t}! Show it from More › Wardrobe.`, 'gold'), 2400);
      this.changed();
    }
  }

  private jump(): void {
    if (this.mode !== 'walk' || this.fishing.busy || Sheet.current) return;
    this.player.jump();
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

  wearExtra(id: string | null): void {
    this.save.extra = id;
    void this.body.setExtra(id);
    this.changed();
  }

  showTitle(title: string | null): void {
    this.save.title = title;
    this.changed();
  }

  toggleDetector(): void {
    this.stopActivity();
    this.detecting = !this.detecting && this.save.detector;
    this.body.rodOut = !this.detecting;
    void this.body.hold(this.detecting ? 'detector' : null, 1.0);
    if (this.detecting) this.hud.toast('Detector on. Walk about: it beeps faster near buried things.');
    else this.finds.showMound(null);
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
      await fresh.setExtra(this.save.extra);
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
    if (this.detecting) this.toggleDetector();
    this.mode = 'uke';
    this.player.free = false;
    this.body.action = 'uke';
    void this.body.hold('ukulele', 0.62);
    this.uke.show();
  }

  emote(name: Emote): void {
    this.stopActivity();
    this.mode = 'emote';
    this.player.free = false;
    this.body.action = name;
    this.emoteTimer = name === 'dance' || name === 'sit' || name === 'flop' ? Infinity : name === 'spin' ? 2.4 : name === 'honk' ? 1.4 : name === 'slap' ? 1.1 : 3;
    if (name === 'wave') this.audio.play('wave', { volume: 0.5 });
    if (name === 'flop') this.audio.play('splash', { volume: 0.4, rate: 1.4 });
    if (name === 'spin') this.audio.play('cast', { volume: 0.4, rate: 1.5 });
    if (name === 'honk') {
      this.audio.honk();
      this.shouting = { text: pick(['HONK!', 'HONK!', 'HONK!!', 'HOONK!']), until: performance.now() + 1300 };
      this.reactNearby(9, HONKED);
    }
    if (name === 'slap') {
      // Whatever was caught last, or a mackerel kept for the purpose.
      const last = this.save.bag.at(-1)?.species ?? 'mackerel';
      void this.body.hold(`fish-${last}`, 0.55);
      setTimeout(() => {
        this.audio.play('splash', { volume: 0.6, rate: 1.8 });
        const hit = this.reactNearby(2.8, SLAPPED, true);
        if (!hit) this.hud.toast(pick(MISSED));
      }, 420);
      setTimeout(() => {
        if (this.body.action !== 'slap') return;
        void this.body.hold(null);
      }, 1100);
    }
  }

  /** Islanders within reach say something about what the player just did; true if anyone did. */
  private reactNearby(reach: number, lines: readonly string[], inFront = false): boolean {
    const now = performance.now();
    const p = this.player.pos;
    const fwd = new THREE.Vector2(Math.sin(this.player.yaw), Math.cos(this.player.yaw));
    let any = false;
    for (const who of [...this.npcs, this.gus]) {
      const d = new THREE.Vector2(who.body.group.position.x - p.x, who.body.group.position.z - p.z);
      if (d.length() > reach) continue;
      if (inFront && d.normalize().dot(fwd) < 0.3) continue;
      who.saying = { text: pick(lines), until: now + 2800 };
      who.body.express(inFront ? 'squint' : 'wide', 1.6);
      any = true;
    }
    return any;
  }

  setBigHeads(on: boolean): void {
    Character.bigHeads = on;
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
    Character.bigHeads = this.save.settings.bigHeads;
    this.screen.setGrain(this.save.settings.grain);
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
      if (this.body.action === 'slap') void this.body.hold(null);
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
    if (this.detecting) this.toggleDetector();
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
    const dig = this.nearBuried;
    if (this.mode === 'dig') hud.setSecond(null);
    else if (dig && this.detecting && this.mode === 'walk') hud.setSecond('Dig', () => this.startDig(dig));
    else if (this.mode === 'boat') hud.setSecond(this.boat.nearMooring(this.boat.pos) ? 'Get out' : null, () => this.leaveBoat());
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
    else if (this.mode !== 'boat' && flat.distanceTo(this.arcadeFront) < 3.4) hud.setAction('Play', () => this.openSheet('arcade'), undefined, 'gold');
    else if (this.detecting && this.mode === 'walk') hud.setAction('Put away', () => this.toggleDetector(), undefined, 'blue');
    else if ((this.mode === 'walk' || this.mode === 'boat' || this.mode === 'emote') && this.waterAhead()) hud.setAction('Cast', cast, () => f.release(rod));
    else hud.setAction(null);
  }

  /** The arcade's gull: bobs and looks about; smug when the player loses, astonished at a big win. */
  private animateGull(dt: number): void {
    const g = this.gull;
    if (!g) return;
    const t = performance.now() / 1000;
    const m = this.gullMood;
    let hop = 0;
    let spin = 0;
    let lean = Math.sin(t * 1.7) * 0.05;
    if (m) {
      m.t += dt;
      if (m.mood === 'smug') {
        // Puffs up and waggles from side to side.
        lean = Math.sin(m.t * 14) * 0.25;
        hop = Math.abs(Math.sin(m.t * 7)) * 0.12;
      } else {
        // Leaps and spins round twice.
        hop = Math.sin(Math.min(1, m.t / 1.1) * Math.PI) * 1.1;
        spin = Math.min(1, m.t / 1.1) * Math.PI * 4;
      }
      if (m.t > (m.mood === 'smug' ? 1.4 : 1.2)) this.gullMood = null;
    }
    // Turned a little toward the player when they are near.
    const p = this.player.pos;
    const near = Math.hypot(p.x - this.gullHome.x, p.z - this.gullHome.z) < 9;
    const look = near ? Math.atan2(p.x - this.gullHome.x, p.z - this.gullHome.z) : this.gullYaw + Math.sin(t * 0.4) * 0.6;
    g.position.set(this.gullHome.x, this.gullHome.y + hop + Math.abs(Math.sin(t * 2.2)) * 0.03, this.gullHome.z);
    g.rotation.set(0, look + spin, lean);
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
    const skyRain = this.pin.weather ? this.pin.weather === 'rain' : rainingAt(now, mode);
    const cloud = performance.now() < this.cloudUntil;
    this.raining = skyRain || cloud;
    this.rain += ((skyRain ? 1 : 0) - this.rain) * (1 - Math.exp(-dt * 0.4));
    if (this.frames < 3) this.rain = skyRain ? 1 : 0;

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
    if (this.fishing.state === 'bite') this.body.express('wide', 0.2);
    if (this.fishing.state === 'aiming') this.body.group.rotation.y = this.rig.yaw + Math.PI;
    if (this.fishing.state === 'aiming' || this.fishing.state === 'flying') this.player.yaw = this.rig.yaw + Math.PI;
    this.body.update(dt);
    for (const n of this.npcs) n.update(dt, this.player.pos);
    this.gus.update(dt, this.player.pos);

    this.rig.update(dt, this.mode === 'sit' || this.mode === 'boat' ? this.player.pos.clone().setY(this.player.pos.y - 0.2) : this.player.pos);
    this.world.update(dt, this.hour, this.rain, this.player.pos);
    this.animateGull(dt);
    this.viewClock -= dt;
    if (this.viewClock <= 0) {
      this.viewClock = 0.15;
      this.world.props.clearView(this.camera.position, this.rig.override ? this.rig.override.pos : this.player.pos);
    }
    this.fx.setRain(Math.max(this.rain, cloud ? 0.7 : 0));
    this.finds.update(dt);
    this.finds.setCloud(cloud, this.player.pos);
    if (this.started) this.secrets(dt, now);
    this.fx.update(dt, this.camera);

    if (this.started) {
      this.context();
      this.hud.setReel(this.fishing.reelState ? this.fishing.reelState.progress : null, this.fishing.reelState?.tension ?? 0, this.fishing.reelState?.thrashing ?? false, this.fishing.fishIcon);
      this.hud.setPower(this.fishing.castPower);
      this.overheads();
      this.hud.setJump(this.mode === 'walk' && !this.fishing.busy && !Sheet.current && !this.detecting);
      this.sound(dt);
    }
    const lv = levelFor(this.save.xp);
    const stats = `${this.save.coins}|${this.save.tokens}|${lv.level}|${lv.into}`;
    if (stats !== this.lastStats && !this.hud?.hold) {
      this.lastStats = stats;
      this.hud?.setStats(this.save.coins, this.save.tokens, lv.level, lv.into / lv.need);
    }
    this.hud?.setClock(sayHour(this.hour), this.raining, this.world.sky.palette.night > 0.5);
    this.keep();
    this.screen.render(this.scene, this.camera);
  }

  /** Sea glass, bounce mushrooms, the metal detector, digging, and titles. */
  private secrets(dt: number, now: number): void {
    const p = this.player.pos;
    // Bounce mushrooms throw anyone who steps on them.
    if (this.mode === 'walk' && !this.player.airborne) {
      const i = this.finds.shroomUnder(p);
      if (i !== null) {
        const sh = SHROOMS[i];
        this.player.launch(sh.up, sh.yaw, sh.forward);
        this.finds.boing(i);
        this.audio.play('bite', { rate: 1.7, volume: 0.8 });
        if (!this.save.hints.includes('tip-shroom')) {
          this.save.hints.push('tip-shroom');
          this.hud.toast('Boing!');
        }
      }
    }
    // Sea glass, picked up by walking into it.
    const g = this.finds.glassNear(p);
    if (g !== null && !this.save.glass.includes(g)) {
      const at = this.finds.take(g);
      this.save.glass.push(g);
      this.save.tokens += 1;
      if (at) this.fx.sparkle(at, false);
      this.audio.play('rare', { volume: 0.7 });
      const n = this.save.glass.length;
      this.hud.toast(n >= SEA_GLASS.length ? 'All twelve pieces of sea glass! +1 pearl, and the title Beachcomber.' : `Sea glass! ${n} of ${SEA_GLASS.length} found. +1 pearl`, 'gold');
      this.checkTitles();
      this.changed();
    }
    // The metal detector beeps faster, and higher, the nearer something buried is.
    this.nearBuried = null;
    if (this.detecting) {
      const day = dayNumber(now, this.save.settings.clock, new Date().getTimezoneOffset());
      if (day !== this.buriedDay) {
        this.buriedDay = day;
        this.buried = buriedToday(this.world.field, day);
      }
      let best = Infinity;
      let spot: { x: number; z: number; key: string } | null = null;
      for (const b of this.buried) {
        if (this.save.dug.includes(b.key)) continue;
        const d = Math.hypot(b.x - p.x, b.z - p.z);
        if (d < best) {
          best = d;
          spot = b;
        }
      }
      this.beepGap = best < 30 ? 0.12 + (best / 30) * 1.1 : 2;
      this.beepClock += dt;
      if (best < 30 && this.beepClock > this.beepGap) {
        this.beepClock = 0;
        this.audio.play('nibble', { rate: 1.6 + (1 - best / 30) * 1.2, volume: 0.5 });
      }
      this.finds.showMound(best < 3 ? spot : null);
      if (best < 1.9) this.nearBuried = spot;
      if (this.mode === 'walk' && this.player.pace < 0.05 && this.body.action === 'idle') this.body.action = 'sweep';
    }
    if (this.mode === 'dig') {
      this.digging -= dt;
      if (this.digging <= 0) this.finishDig();
    }
    this.titleClock -= dt;
    if (this.titleClock <= 0) {
      this.titleClock = 6;
      this.checkTitles();
    }
  }

  private startDig(spot: { x: number; z: number; key: string }): void {
    this.mode = 'dig';
    this.player.free = false;
    this.body.action = 'dig';
    this.digging = 1.4;
    this.nearBuried = spot;
    (this as unknown as { digSpot: typeof spot }).digSpot = spot;
    this.audio.play('splashstep', { rate: 0.6, volume: 0.6 });
  }

  private finishDig(): void {
    const spot = (this as unknown as { digSpot: { x: number; z: number; key: string } }).digSpot;
    this.mode = 'walk';
    this.player.free = true;
    this.body.action = 'idle';
    if (!spot || this.save.dug.includes(spot.key)) return;
    this.save.dug.push(spot.key);
    const missing = HATS.filter((h) => h.gift && !this.save.hats.includes(h.id)).map((h) => ({ id: h.id, name: h.name }));
    const find = digUp(Math.floor(spot.x * 1000 + spot.z * 7), levelFor(this.save.xp).level, missing);
    if (find.kind === 'coins') {
      this.save.coins += find.coins;
      this.hud.toast(`You dug up ${find.name}! Worth ${find.coins} coins.`, 'good');
      this.audio.play('coin');
    } else if (find.kind === 'token') {
      this.save.tokens += find.tokens;
      this.hud.toast(`You dug up ${find.name}! +1 pearl`, 'gold');
      this.audio.play('rare');
    } else {
      this.save.hats.push(find.id);
      this.hud.toast(`You dug up a ${find.name}! It's a little muddy.`, 'gold');
      this.audio.play('rare');
    }
    this.finds.showMound(null);
    this.fx.splash(new THREE.Vector3(spot.x, this.world.field.heightAt(spot.x, spot.z), spot.z), 0.5, 0x8a6440);
    this.checkTitles();
    this.changed();
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
    const head = toScreen(this.player.pos.clone().add(new THREE.Vector3(0, this.save.hat ? 1.75 : 1.5, 0)));
    this.hud.setTag(this.save.title && head.on && this.mode !== 'chalk' ? this.save.title : null, head.x, head.y);
    if (this.shouting && this.shouting.until > now) {
      const top = toScreen(this.player.pos.clone().add(new THREE.Vector3(0, 2.1, 0)));
      this.hud.shout(top.on ? this.shouting.text : null, top.x, top.y);
    } else this.hud.shout(null);
    if (this.detecting) {
      const top = toScreen(this.player.pos.clone().add(new THREE.Vector3(0, 2.0, 0)));
      this.hud.setBlip(top.on, top.x, top.y, this.beepClock > this.beepGap - 0.12);
    } else this.hud.setBlip(false);
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
    this.audio.keepPlaying = radio > 0;
    this.audio.setVolumes({ sfx: this.save.settings.sfx, ambience: this.save.settings.ambience, music: Math.min(1, this.save.settings.music * (1 + radio * 1.2)) });
  }

  /** Models in rows on the square, to look them over (`zoo=fish`, `zoo=hat`, `zoo=all`). */
  private async zoo(prefix: string): Promise<void> {
    const { fit, model } = await import('../assets/models');
    const index = (await (await fetch(`${import.meta.env.BASE_URL}models/index.json`)).json()) as Record<string, { h: number | null }>;
    const ids = Object.keys(index).filter((id) => prefix === 'all' || id.startsWith(prefix)).sort();
    const cols = 5;
    await Promise.all(
      ids.map(async (id, i) => {
        const long = id.startsWith('fish-');
        const m = await model(id, long ? undefined : Math.min(2, index[id].h ?? 1));
        if (!m) return;
        const holder = long ? fit(m, 1.1, true) : m;
        holder.position.set(-5 + (i % cols) * 2.5, 2.25, 6 + Math.floor(i / cols) * 2.5);
        this.scene.add(holder);
      }),
    );
    this.rig.override = { pos: new THREE.Vector3(0, 2.4, 6 + Math.ceil(ids.length / cols) * 1.25), dist: 5 + ids.length * 0.3, pitch: 0.7 };
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
      catchNow: (species: string, variant: Catch['variant'] = 'normal') => {
        const s = BY_ID[species];
        this.landed({ species, size: (s.size[0] + s.size[1]) / 2, variant, huge: false, at: Date.now() }, s.zones[0]);
      },
      emote: (n: Parameters<Game['emote']>[0]) => this.emote(n),
      bigHeads: (on: boolean) => this.setBigHeads(on),
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
