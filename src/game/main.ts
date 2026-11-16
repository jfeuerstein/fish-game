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
import { GUS_LINES, NPCS, Npc, Shopkeeper } from '../npc/npcs';
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
import { Coach } from '../ui/coach';
import { tackleSheet } from '../ui/tackle';
import { newSets } from './sets';
import { FORAGE_GIVES, forageNow, type ForageSpot } from './forage';
import { Foraging } from '../world/forage';
import { Wildlife } from '../world/wildlife';
import { GUS_INSIDE, Indoors, type RoomId } from '../world/indoors';
import { aquariumSheet } from '../ui/aquarium';
import { chestSheet, signSheet } from '../ui/chest';
import { traderSheet } from '../ui/trader';
import { Trader } from '../npc/trader';
import { TRADER_NAME, traderHere } from './trader';
import { BELL, BOTTLE_SECS, TRICK_SECS, comboSays, restLeft, sayRest, toyById, useToy, type Trick } from './toys';
import { Ride } from '../world/ride';
import { SIGHTS, sighted, type Sight } from './lookout';
import { feedGull, gullBrings, gullFish, gullGave, gullGift, gullHungry, gullSays } from './gull';
import { floorAt } from '../world/layout';
import { MS_PER_HOUR } from './clock';
import { NAMES, doFavour, favourInBag, talk, type Who } from '../npc/talk';
import { bountyFilled, bountyFor, calendarDay, isBounty } from './bounty';
import { coachDue, coachNext, type CoachStep } from './coach';
import { TURN } from '../player/steer';
import { BENCH_SECS, BENCH_SETTLE, BENCH_STEPS, benchReport, readout, summarise, type BenchLine } from '../debug/bench';
import { shopSheet } from '../ui/shop';
import { Uke } from '../ui/uke';
import { Boat } from '../world/boat';
import { fishingZone, shoreRadius, standHeight, waterAt } from '../world/island';
import { splatAt } from '../world/terrain';
import { BEACONS, CAMP, CANNERY, CAVE, CROSSING, ICE_HUT, PIER, PLACES, PLACED, POND, POOLS, POTS, START } from '../world/layout';
import { CROSSING_KEY, HOME, ISLE, ISLE_KEY, ISLE_NAME, type IsleId } from '../world/isle';
import { CANNERY_PAGES, rummage } from './kettle';
import { BIOMES } from '../look/biome';
import { CHART_FOUND, type FarIsle, awake, bottleHolds, burning, giveChart, haulPot, hasChart, lightBeacon, newDeeds, potLeft, potState, setPot } from './isles';
import { voyageSheet } from '../ui/voyage';
import { World } from '../world/world';
import { PlacedThings, ghostOf } from '../world/placed';
import type { Seat } from '../world/props';
import { bitesAt, dayNumber, hourAt, pinnedHour, sayHour, weatherAt, type Weather } from './clock';
import { FURNITURE, HATS, PAINTS, baitById, hookById, levelFor, lineById, lureById, rigged, rodById, type Rod } from './economy';
import { SEASON_LOOK, pinnedSeason, seasonAt, type Season } from '../look/season';
import { STYLE_SAYS } from '../fishing/reel';
import { RARE_SAYS, RARE_SKIES, rareSkyAt, type RareSky } from '../look/rare';
import { newTitles } from './titles';
import { buriedToday, digUp, SHROOMS, SEA_GLASS } from '../world/secrets';
import { Finds } from '../world/finds';
import { applyCatch } from './progress';
import { noteCatch } from './chart';
import { BACKUP_KEY, SAVE_KEY, type PlacedThing, type Save, backupFor, parseSave } from './save';
import type { Emote, Session } from './session';

type Mode = 'walk' | 'sit' | 'boat' | 'emote' | 'uke' | 'chalk' | 'dig' | 'inside' | 'tower';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
/** What islanders say when the player honks nearby, or slaps them with a fish. */
const HONKED = ['Was that you?', 'HONK to you too.', 'Bless you?', 'Who let the goose in?', 'I felt that in my fins.', 'Please never do that again.', 'Beautiful. Truly.'];
const SLAPPED = ['Ow! Rude.', 'Was that a FISH?', 'I did not deserve that.', 'Smells like mackerel now. Thanks.', 'Fair. I had it coming.', 'Slap me again and I tell Gus.', 'My dignity!'];
const MISSED = ['You slap the air with a fish. It feels good.', 'Nobody to slap. The fish is relieved.', 'A mighty swing, at nothing.'];

export class Game implements Session {
  /** Where things are on this island, for the tools (which reach the game only through `window.__cove`). */
  static readonly layout = { CROSSING, PLACES };
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
  private sheets!: Record<'shop' | 'journal' | 'bag' | 'board' | 'more' | 'fun' | 'arcade' | 'tackle' | 'aquarium' | 'chest' | 'sign' | 'trader' | 'voyage', Sheet>;
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
  /** Kettle Isle: the cannery's door. */
  private canneryDoor = new THREE.Vector3(9000, 0, 9000);
  /** The fishing hut's door, and the lighthouse: where it stands, how wide it is and how high its gallery. */
  private hutFront = new THREE.Vector3(48, 0, 6);
  private tower = { x: 31, z: -37, r: 3, top: 20 };
  /** The rooms that are gone into (src/world/indoors.ts), and where the camera was looking before. */
  private indoors = new Indoors();
  private outsideYaw = 0;
  private gusOutside: { pos: THREE.Vector3; yaw: number } | null = null;
  /** Up the lighthouse: the telescope is to the eye, and what it has been held on, for how long. */
  private scope = false;
  private scopeEl = document.createElement('div');
  private held: { sight: Sight | null; secs: number } = { sight: null, secs: 0 };
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
  /** What is being dug up. */
  private digSpot: { x: number; z: number; key: string } | null = null;
  private titleClock = 0;
  private viewClock = 0;

  constructor() {
    let text: string | null = null;
    try {
      if (!this.cfg.fresh) {
        // If the save is ever lost or broken, an older copy is still there (see backupFor).
        const now = backupFor(localStorage.getItem(SAVE_KEY), localStorage.getItem(BACKUP_KEY), Math.floor(Date.now() / 86_400_000));
        text = now.text;
        if (now.backup) localStorage.setItem(BACKUP_KEY, now.backup);
      }
    } catch {
      /* No storage: the game plays and forgets. */
    }
    this.save = parseSave(text);
    this.pin = { time: this.cfg.time, weather: this.cfg.weather, season: this.cfg.season };
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
    this.world.onLightning = () => this.audio.thunder(Math.random());
    this.scene.add(this.fx.group);
    // Rain lands on the ground, or on the water where there is water.
    this.fx.ground = (x, z) => waterAt(this.world.field, x, z)?.level ?? this.world.field.heightAt(x, z);
    const bar = document.getElementById('load-bar')!;
    this.body = new Character(this.save.character, 1.1);
    this.scene.add(this.body.group);
    this.player = new Player(this.body, this.world.field, this.world.solid);
    this.boat = new Boat(this.world.field);
    this.gus = new Shopkeeper(this.scene);
    // The islanders live at the cove.
    this.npcs = HOME ? NPCS.map((d) => new Npc(d, this.world.field, this.scene)) : [];
    const models = this.cfg.models;
    await Promise.all([
      this.world.populate((d, n) => (bar.style.width = `${Math.round((d / n) * 100)}%`), models),
      models ? this.body.load() : Promise.resolve(),
      models ? this.boat.load(this.scene) : Promise.resolve(),
    ]);
    // Where the cove's doors and counters are. Kettle Isle has none of them: there they are nowhere, and nothing is ever near them.
    const nowhere = 9000;
    for (const v of [this.shopFront, this.arcadeFront, this.hutFront, this.board]) v.set(nowhere, 0, nowhere);
    this.tower = { x: nowhere, z: nowhere, r: 1, top: 0 };
    this.scopeEl.className = 'scope';
    this.scopeEl.hidden = true;
    this.app.append(this.scopeEl);
    const shop = PLACED.find((p) => p.id === 'shop') ?? { x: 0, z: 0 };
    if (HOME) {
      // The shop's counter, and the board, from the sizes of their models.
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
      const hut = PLACED.find((p) => p.id === 'fishing-hut')!;
      const hutDepth = this.world.props.sizes.get('fishing-hut')?.z ?? 4;
      this.hutFront.set(hut.x + Math.sin(hut.yaw ?? 0) * (hutDepth / 2 + 1.2), 0, hut.z + Math.cos(hut.yaw ?? 0) * (hutDepth / 2 + 1.2));
      const light = PLACED.find((p) => p.id === 'lighthouse')!;
      const lightSize = this.world.props.sizes.get('lighthouse');
      this.tower = { x: light.x, z: light.z, r: Math.max(lightSize?.x ?? 5, lightSize?.z ?? 5) / 2, top: this.world.field.heightAt(light.x, light.z) + (lightSize?.y ?? 12) * 0.74 };
      const boardAt = PLACED.find((p) => p.id === 'notice-board')!;
      this.board.set(boardAt.x + Math.sin(boardAt.yaw ?? 0) * 1.6, 0, boardAt.z + Math.cos(boardAt.yaw ?? 0) * 1.6);
    } else if (ISLE === 'kettle') {
      // The cannery's door, from the size of its model.
      const deep = this.world.props.sizes.get('cannery')?.z ?? 6;
      this.canneryDoor.set(CANNERY.x + Math.sin(CANNERY.yaw) * (deep / 2 + 1.3), 0, CANNERY.z + Math.cos(CANNERY.yaw) * (deep / 2 + 1.3));
    } else if (ISLE === 'rime') {
      // The ice hut is gone into as the cove's fishing hut is: it is the same room inside, stove and all.
      const deep = this.world.props.sizes.get('ice-hut')?.z ?? 3;
      this.hutFront.set(ICE_HUT.x + Math.sin(ICE_HUT.yaw) * (deep / 2 + 1.2), 0, ICE_HUT.z + Math.cos(ICE_HUT.yaw) * (deep / 2 + 1.2));
    }
    if (models) {
      await this.body.setRod(this.save.rod);
      this.body.setRodLook(PAINTS.find((q) => q.id === this.save.rodPaint)?.colour ?? null, this.save.charm, !!PAINTS.find((q) => q.id === this.save.rodPaint)?.glows);
      await this.body.setHat(this.save.hat);
      if (HOME) await Promise.all([this.gus.load(new THREE.Vector3(shop.x + 2.6, this.world.field.heightAt(shop.x + 2.6, this.shopFront.z - 0.4), this.shopFront.z - 0.4), 0), ...this.npcs.map((n) => n.load())]);
      else this.gus.body.group.position.set(nowhere, 0, nowhere);
    }
    // Whoever has just rowed across steps off where the boat ties up; otherwise, where a visit begins.
    try {
      this.arriving = sessionStorage.getItem(CROSSING_KEY) !== null;
      sessionStorage.removeItem(CROSSING_KEY);
    } catch {
      /* No storage. */
    }
    const at = PLACES[this.cfg.at ?? (this.arriving ? 'boat' : START)] ?? PLACES[START];
    this.player.place(at.x, at.z, at.yaw);
    this.player.onStep = (surface) => {
      // On wheels there are no footsteps: a clack of the board over whatever is under it.
      if (this.riding === 'toy-skateboard') {
        if (!this.player.airborne) this.audio.play('tick', { volume: surface === 'wood' ? 0.16 : 0.07, rate: 0.55 + Math.random() * 0.1 });
        return;
      }
      this.audio.play(surface === 'wood' ? 'stepwood' : surface === 'water' ? 'splashstep' : 'step', { volume: 0.18, rate: 0.9 + Math.random() * 0.2 });
      this.footfall(surface);
    };
    this.rig = new CameraRig(this.camera, this.world.field);
    this.rig.obstacles = this.world.props.group.children.filter((c) => /^(shop|arcade|lighthouse|fishing-hut|tent|well|cannery|ice-hut|stilt-shack)/.test(c.name));
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
    this.placed.campName = this.save.campName;
    // Only what was set down on this island stands on it.
    for (const p of this.save.placed) if (this.onThisIsle(p)) await this.placed.add(p);
    this.finds = new Finds(this.world.field);
    this.forage = new Foraging(this.world.field, (x, z) => this.openGround(x, z));
    this.scene.add(this.forage.group);
    this.world.group.add(this.finds.group);
    this.trader = new Trader(this.scene, this.world.field);
    if (models) void this.trader.load();
    this.wild = new Wildlife(this.world.field, { ring: (at, size) => this.fx.ring(at, size), splash: (at, amount) => this.fx.splash(at, amount), play: (n, o) => this.audio.play(n, o) });
    this.scene.add(this.wild.group);
    if (models) {
      // Gulls on the tops of things: two of the pier's lamps and the signpost in the square.
      const lamp = (x: number, z: number): THREE.Vector3 => {
        const g = [...this.world.props.glows].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
        return g ? g.clone().setY(g.y + 0.2) : new THREE.Vector3(x, PIER.deck + 3.6, z);
      };
      const sign = PLACED.find((q) => q.id === 'signpost')!;
      // (On Kettle Isle one gull keeps to the jetty's lamp; the pier's own gull is there only if it is tame and has come along.)
      void this.wild.perch(HOME ? [lamp(61, 12.8), lamp(101, 7.6), new THREE.Vector3(sign.x, this.world.field.heightAt(sign.x, sign.z) + (this.world.props.sizes.get('signpost')?.y ?? 2.2), sign.z)] : [lamp(97, 14.1)], HOME || this.save.gull.tame);
    }
    this.hud.onBait = () => this.openSheet('tackle');
    if (models) {
      if (HOME) await this.finds.load(this.save.glass);
      await this.body.setExtra(this.save.extra);
    }
    this.player.onLand = (v) => {
      if (this.riding === 'toy-skateboard') this.landTricks();
      if (this.riding === 'toy-pogo') this.audio.boing(v > 8);
      if (v > 6) {
        this.audio.play('stepwood', { volume: 0.5, rate: 0.7 });
        this.rig.bump(Math.min(0.15, v * 0.01));
      }
      // A puff of dust (or a splash) where the feet come down.
      if (v > 3.5) {
        const p = this.player.pos;
        const wet = waterAt(this.world.field, p.x, p.z);
        if (wet && p.y < wet.level + 0.3) this.fx.splash(new THREE.Vector3(p.x, wet.level, p.z), 0.5);
        else this.fx.puff(p, Math.min(1, v / 9));
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
      tackle: tackleSheet(this.app, this),
      chest: chestSheet(this.app, this),
      trader: traderSheet(this.app, this),
      voyage: voyageSheet(this.app, this, (to) => this.sailTo(to)),
      sign: signSheet(this.app, this, (name) => this.placed.rename(name)),
      aquarium: aquariumSheet(this.app, this, () => void this.indoors.stock(this.save.aquarium, (id) => `${import.meta.env.BASE_URL}icons/fish-${id}.webp`)),
      more: moreSheet(this.app, this, openChests, { field: this.world.field, at: () => ({ x: this.player.pos.x, z: this.player.pos.z }), trader: () => (this.traderIn ? this.trader.pos : null) }),
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
    // Off the boat from the other island: straight in, no button to press.
    if (!this.cfg.title || this.arriving) go();

    if (this.cfg.zoo) await this.zoo(this.cfg.zoo);
    if (this.cfg.stats) this.setStats(true);
    // From the address, the benchmark starts by itself once things have settled (for the tools).
    if (this.cfg.bench) setTimeout(() => void this.runBench(), 500);
    this.ready = true;
    (window as unknown as Record<string, unknown>).__cove = this.api();
    this.renderer.setAnimationLoop(() => this.frame());
    // The phone may take the picture away (another app wanted the graphics card, or the game
    // was long in the background). Nothing can be drawn until it is given back, and what was
    // built is gone with it: keep the save, and begin again when it returns.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.renderer.setAnimationLoop(null);
      this.keep(true);
    });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
  }

  ready = false;

  private welcome(): void {
    if (this.cfg.hud === false) return;
    if (!HOME) {
      // A far island: what it is, said the first time, and its name each time after.
      const first = !this.save.hints.includes(ISLE);
      if (first) {
        this.save.hints.push(ISLE);
        this.checkTitles();
        this.changed();
      }
      setTimeout(() => this.hud.toast(first ? BIOMES[ISLE].first : `${ISLE_NAME[ISLE]}.`, first ? 'gold' : ''), 400);
      if (first) setTimeout(() => this.hud.toast(BIOMES[ISLE].know), 3600);
      return;
    }
    if (!this.save.hints.includes('welcome')) {
      this.save.hints.push('welcome');
      this.changed();
      setTimeout(() => this.hud.toast('Welcome to Driftwood Cove!'), 400);
      if (!this.coachBegin()) setTimeout(() => this.hud.toast('Walk to the water, face it, and hold Cast.'), 3200);
    } else this.coachBegin();
  }

  /** The fish landed last, for the islanders to remark on, and how many times each has been spoken to. */
  private lastCatch: Catch | null = null;
  private turns: Record<string, number> = {};

  /**
   * Speak to an islander: hand over the fish they asked for if it is in the bag, or else hear
   * what they have to say (src/npc/talk.ts). `voice` puts the words over their head.
   */
  private speakTo(who: Who, voice: (words: string) => void, lines: readonly string[]): void {
    const given = who !== 'npc-pelican' ? doFavour(this.save, who) : null;
    const said = given ?? talk(this.save, who, { day: this.today, now: Date.now(), raining: this.raining, night: this.world.sky.palette.night > 0.5, caught: this.lastCatch }, lines, (this.turns[who] = (this.turns[who] ?? 0) + 1) - 1);
    voice(said.text);
    this.audio.play('wave', { volume: 0.4, rate: 0.9 + Math.random() * 0.3 });
    if (said.did?.kind === 'favour') {
      this.audio.play('quest');
      this.hud.toast(`${NAMES[who]} is pleased: +${said.did.coins} coins${said.did.pearl ? ' and a pearl' : ''}.`, 'good');
    } else if (said.did?.kind === 'rival') this.hud.toast(`You out-fished ${NAMES[who]} today!`, 'gold');
    this.changed();
  }

  /** The rod as it is rigged: with the line and the hook that are on it. */
  get rod(): Rod {
    return rigged(rodById(this.save.rod), lineById(this.save.line), hookById(this.save.hook));
  }

  /** The weather now (rain and storm both count as raining), and the season. */
  weather: Weather = 'clear';
  season: Season = 'summer';
  private dressed = false;

  /** The calendar day where the player is: the day's bounty goes by it. */
  get today(): number {
    return calendarDay(Date.now(), new Date().getTimezoneOffset());
  }
  /** The day the player was last told what Gus wants. */
  private bountyTold = -1;

  // ---------- The first minute ----------

  private coach: Coach | null = null;
  private coachStep: CoachStep = 'walk';
  /** What the player has done since the step began, and how many fish they had when the coach began. */
  private coachDid = { walked: 0, turned: 0, from: new THREE.Vector2(NaN, NaN), caught: 0 };

  /** Start walking someone new through their first fish. Says whether it did. */
  private coachBegin(): boolean {
    if (!HOME || this.coach || !this.cfg.coach || !this.cfg.hud || !coachDue(this.save.hints, this.save.stats.caught)) return false;
    this.coach = new Coach(this.app);
    this.coach.onSkip = () => this.coachEnd();
    this.coachStep = 'walk';
    this.coachDid = { walked: 0, turned: 0, from: new THREE.Vector2(NaN, NaN), caught: this.save.stats.caught };
    this.coach.show('walk');
    return true;
  }

  /** The coach is over, done or skipped: it is not offered again. */
  private coachEnd(): void {
    this.coach?.remove();
    this.coach = null;
    if (!this.save.hints.includes('coach')) {
      this.save.hints.push('coach');
      this.changed();
    }
  }

  /** Each frame while coaching: count what the player is doing and move on when a step is done. `swung` is how far the view was turned this frame. */
  private coachWatch(swung: number): void {
    if (!this.coach || this.coachStep === 'done') return;
    const p = this.player.pos;
    const d = this.coachDid;
    const moved = Number.isNaN(d.from.x) ? 0 : Math.hypot(p.x - d.from.x, p.z - d.from.y);
    d.from.set(p.x, p.z);
    // Walked, not carried somewhere.
    if (moved < 1 && this.mode === 'walk') d.walked += moved;
    d.turned += Math.abs(swung);
    const next = coachNext(this.coachStep, { walked: d.walked, turned: d.turned, fishing: this.fishing.state, caught: this.save.stats.caught - d.caught });
    if (next === this.coachStep) return;
    this.coachStep = next;
    d.walked = d.turned = 0;
    this.coach.show(next);
    this.audio.play('click', { volume: 0.5 });
    // The goodbye stays up long enough to be read, and goes by itself.
    if (next === 'done') setTimeout(() => this.coachEnd(), 8000);
  }

  private fishingHooks(): ConstructorParameters<typeof Fishing>[3] {
    return {
      conditions: (zone) => ({ zone, hour: this.hour, raining: this.raining, weather: this.weather, season: this.season, woken: awake(this.save, Date.now()), rod: this.rod, bait: baitById(this.save.bait), lure: lureById(this.save.lure) }),
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
      byRise: (x, z) => this.wild.byRise(x, z),
      hurry: () => (performance.now() < this.bellUntil ? BELL.hurry : 1),
    };
  }

  private landed(c: Catch, zone: Parameters<typeof applyCatch>[2], second = false): void {
    if (c.species === 'treasure') return this.treasure();
    // Now and then a bottle has more in it than a note.
    if (c.species === 'bottle' && bottleHolds(this.save, Math.random()) && giveChart(this.save, 'glow')) setTimeout(() => this.hud.toast(CHART_FOUND.glow, 'gold'), 2600);
    const night = !bitesAt('day', this.hour);
    const r = applyCatch(this.save, c, zone, night, this.raining);
    noteCatch(this.save, zone, c.species);
    this.lastCatch = { ...c, at: Date.now() };
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
    if (isBounty(c.species, this.today) && !bountyFilled(this.save.bounty, this.today)) notes.push('The one Gus wants today!');
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
    // The coach is already saying it.
    if (this.coach && (id === 'bite' || id === 'reel')) return;
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
    // A far island's deed done: paid on the spot.
    for (const [i, d] of newDeeds(this.save).entries()) {
      setTimeout(() => {
        this.hud.toast(`${d.name}! ${ISLE_NAME[d.isle]} gives you ${d.prize}.`, 'gold');
        this.audio.play('quest', { volume: 0.6 });
      }, 1200 + i * 2600);
      this.changed();
    }
    for (const t of newTitles(this.save)) {
      setTimeout(() => this.hud.toast(`New title: ${t}! Show it from More › Wardrobe.`, 'gold'), 2400);
      this.changed();
    }
    // A set of fish finished: stamped in the journal, and its prize paid.
    for (const set of newSets(this.save)) {
      setTimeout(() => {
        this.hud.toast(`Set complete: ${set.name}! +${set.coins} coins${set.pearl ? ' and a pearl' : ''}.`, 'gold');
        this.audio.play('quest');
      }, 3400);
      this.changed();
    }
  }

  // ---------- Bait to be found ----------

  private forage!: Foraging;
  private steamClock = 0;
  /** This load is the end of a crossing from the other island. */
  private arriving = false;
  /** The toy being ridden (src/game/toys.ts), as it is seen, and the tricks of this jump: the one being done and those done. */
  riding: string | null = null;
  private ride = new Ride();
  private trick: { kind: Trick; t: number } | null = null;
  private combo: Trick[] = [];
  /** Until when the dinner bell hurries the fish. */
  private bellUntil = 0;
  /** The trader who comes by boat some days, and whether they are here and have been spoken of today. */
  private trader!: Trader;
  private traderIn = false;
  private traderTold = -1;
  /** A thing taken up to be set down somewhere: what it is, how it is turned from the way the player faces, and its ghost. */
  private carrying: { id: string; turn: number; ghost: THREE.Object3D } | null = null;
  /** The rare sky last spoken of, so each is announced once as it comes. */
  private skyTold: RareSky | null = null;
  private wild!: Wildlife;
  /** Seconds until a tame gull next brings something. */
  private gullDue = 70 + Math.random() * 90;
  /** How wet the ground is, 0 to 1: it rises in rain and dries over a few island hours. */
  private wet = 0;

  /** Whether a place is open grass or earth where a worm or a cricket might be. */
  private openGround(x: number, z: number): boolean {
    const f = this.world.field;
    if (f.heightAt(x, z) < 0.5 || waterAt(f, x, z) || floorAt(x, z) !== null) return false;
    const [sand, , rock, cobble] = splatAt(f, x, z);
    if (sand > 0.4 || rock > 0.4 || cobble > 0.2) return false;
    // Nothing standing there: a body set down on the spot is not pushed off it.
    const [px, pz] = this.player.solid.resolve(x, z, 0.5);
    return Math.hypot(px - x, pz - z) < 0.01;
  }

  private forageUpdate(dt: number, now: number): void {
    const raining = this.weather === 'rain' || this.weather === 'storm';
    this.wet = raining ? Math.min(1, this.wet + dt / 20) : Math.max(0, this.wet - dt / 150);
    const kind = this.started ? forageNow(this.hour, this.wet) : null;
    // Worms have new places each spell of rain; crickets each evening.
    const turn = kind === 'worms' ? Math.floor(now / (MS_PER_HOUR * 4)) : dayNumber(now, 'island');
    this.forage.set(kind, turn);
    this.forage.update(dt, this.player.pos);
  }

  private takeForage(spot: ForageSpot): void {
    const gives = FORAGE_GIVES[spot.kind];
    this.forage.take(spot);
    this.save.baits[gives.bait] = (this.save.baits[gives.bait] ?? 0) + gives.count;
    this.hud.toast(gives.says, 'good');
    this.audio.play('plop', { volume: 0.5 });
    this.changed();
  }

  private stepSide = 1;

  /** What a step leaves in the shallows: a ring and a few drops. */
  private footfall(surface: 'grass' | 'wood' | 'water'): void {
    const p = this.player.pos;
    this.stepSide = -this.stepSide;
    // A little to the side of the middle, left foot then right.
    const x = p.x + Math.cos(this.player.yaw) * 0.14 * this.stepSide;
    const z = p.z - Math.sin(this.player.yaw) * 0.14 * this.stepSide;
    if (surface === 'water') {
      const level = waterAt(this.world.field, p.x, p.z)?.level ?? 0;
      const at = new THREE.Vector3(x, level + 0.02, z);
      this.fx.ring(at, 0.45);
      this.fx.splash(at, 0.12);
    }
  }

  private trod = new THREE.Vector2(NaN, NaN);
  private trodFar = 0;
  /**
   * Prints in the sand: one for every short pace walked on it, left foot then right. (A step as
   * the player's own clock counts it, which the sound goes by, is too long a stride to leave a trail.)
   */
  private tread(): void {
    const p = this.player.pos;
    const moved = Number.isNaN(this.trod.x) ? 0 : Math.hypot(p.x - this.trod.x, p.z - this.trod.y);
    this.trod.set(p.x, p.z);
    // Carried somewhere, not walked: no trail.
    if (moved > 1 || this.mode !== 'walk' || this.player.airborne) return;
    this.trodFar += moved;
    if (this.trodFar < 0.36) return;
    this.trodFar = 0;
    this.stepSide = -this.stepSide;
    const x = p.x + Math.cos(this.player.yaw) * 0.13 * this.stepSide;
    const z = p.z - Math.sin(this.player.yaw) * 0.13 * this.stepSide;
    if (waterAt(this.world.field, x, z) || splatAt(this.world.field, x, z)[0] < 0.6) return;
    this.fx.print(x, this.world.field.heightAt(x, z), z, this.player.yaw);
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

  // ---------- The other island ----------

  /**
   * Row across to the other island. The game is put away and begun again there, behind a card
   * that says so: only one island is ever loaded.
   */
  private cross(): void {
    this.openSheet('voyage');
  }

  /** Row to an island there is a chart to (or home). The game is put away and begun again there. */
  sailTo(to: IsleId): void {
    if (to === ISLE || !hasChart(this.save, to)) return;
    this.fishing.cancel();
    this.keep(true);
    try {
      sessionStorage.setItem(CROSSING_KEY, to);
      if (!this.cfg.fresh) localStorage.setItem(ISLE_KEY, to);
    } catch {
      /* No storage: the address carries it. */
    }
    const url = new URL(location.href);
    // A save that is kept remembers the island itself; the tools' unkept one is told in the address.
    if (this.cfg.fresh || url.searchParams.has('isle')) url.searchParams.set('isle', to);
    url.searchParams.delete('at');
    this.audio.play('row');
    setTimeout(() => location.replace(url.toString()), 400);
  }

  /** Come by a chart to a far island, and say so. */
  private foundChart(isle: FarIsle): void {
    if (!giveChart(this.save, isle)) return;
    this.hud.toast(CHART_FOUND[isle], 'gold');
    this.audio.play('quest', { volume: 0.5 });
    this.changed();
  }

  // ---------- Mirewood's crab pots ----------

  /** The place for a pot the player stands beside, if any. */
  private potNear(): { id: string; x: number; z: number } | null {
    const p = this.player.pos;
    return POTS.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 4.2) ?? null;
  }

  private usePot(pot: { id: string; x: number; z: number }): void {
    const now = Date.now();
    const state = potState(this.save, pot.id, now);
    if (state === 'empty') {
      setPot(this.save, pot.id, now);
      this.audio.play('plop', { volume: 0.6, rate: 0.8 });
      this.fx.splash(new THREE.Vector3(pot.x, 0, pot.z), 0.4);
      this.hud.toast('The pot goes down with a bit of bait in it. Give it six minutes or so: it keeps while you are away.');
    } else if (state === 'soaking') {
      const left = potLeft(this.save, pot.id, now);
      this.hud.toast(`Nothing in it yet. About ${left >= 90 ? `${Math.round(left / 60)} minutes` : 'a minute'} more.`);
    } else {
      // Up it comes: one to three things, each as a catch.
      const n = haulPot(this.save, pot.id, now, Math.random());
      this.audio.play('splash', { volume: 0.5 });
      this.fx.splash(new THREE.Vector3(pot.x, 0, pot.z), 0.6);
      for (let i = 0; i < n; i++) {
        const c = rollCatch({ zone: 'pots', hour: this.hour, raining: this.raining, rod: this.rod, bait: baitById(this.save.bait) }, Math.random);
        setTimeout(() => this.landed({ ...c, at: Date.now() }, 'pots', i > 0), i * 1900);
      }
      setTimeout(() => this.checkTitles(), n * 1900);
    }
    this.changed();
  }

  // ---------- Glowmere's beacons ----------

  private beaconFires: ({ flame: THREE.Object3D; lamp: THREE.PointLight | null } | null)[] = [null, null, null];

  private beaconNear(): number {
    const p = this.player.pos;
    return BEACONS.findIndex((b) => Math.hypot(b.x - p.x, b.z - p.z) < 2.8);
  }

  private lightTheBeacon(i: number): void {
    const { woke } = lightBeacon(this.save, i, Date.now());
    this.audio.play('fire', { volume: 0.5 });
    const lit = BEACONS.filter((_, k) => burning(this.save, k, Date.now())).length;
    if (woke) {
      this.hud.toast('All three are burning. Out in the shallows the light goes down, and comes back brighter. The water is awake.', 'gold');
      this.audio.play('rare', { volume: 0.6 });
    } else this.hud.toast(lit === 1 ? 'It catches. There are two more, and they do not burn for ever.' : `${lit} of three alight.`);
    this.checkTitles();
    this.changed();
  }

  /** Each beacon has a flame while it burns, and none when it has gone out. */
  private tendBeacons(): void {
    const now = Date.now();
    const up = awake(this.save, now);
    if (!up && this.world.woken === 1 && this.started) this.hud.toast('The water has gone back to sleep.');
    this.world.woken = up ? 1 : 0;
    for (const [i, b] of BEACONS.entries()) {
      const on = burning(this.save, i, now);
      const fire = this.beaconFires[i];
      if (on && !fire) {
        const top = new THREE.Vector3(b.x, this.world.field.heightAt(b.x, b.z) + (this.world.props.sizes.get('beacon')?.y ?? 1.9) * 0.92, b.z);
        this.beaconFires[i] = { flame: this.world.addFlame(top, 1.3), lamp: this.world.borrowLamp(top.clone().setY(top.y + 0.6), 12, 3.4, 0xff9448, true) };
      } else if (!on && fire) {
        this.world.removeFlame(fire.flame);
        if (fire.lamp) this.world.returnLamp(fire.lamp);
        this.beaconFires[i] = null;
        if (this.started) this.hud.toast('A beacon has burned down.');
      }
    }
  }

  /** Sit in the hot spring. */
  private soak(): void {
    const hot = POOLS.find((q) => q.hot);
    if (!hot) return;
    const p = this.player.pos;
    this.sitOn({ x: p.x, z: p.z, y: hot.level - 0.42, yaw: this.player.yaw, lift: 0.36, kind: 'spring' });
    if (!this.save.hints.includes('soaked')) {
      this.save.hints.push('soaked');
      this.hud.toast('Oh, that is warm. Stay as long as you like.', 'gold');
      this.checkTitles();
      this.changed();
    }
  }

  /** Steam off the hot spring, when the player is near enough to see it. */
  private steam(dt: number): void {
    const hot = POOLS.find((q) => q.hot);
    if (!hot || Math.hypot(hot.x - this.player.pos.x, hot.z - this.player.pos.z) > 45) return;
    this.steamClock -= dt;
    if (this.steamClock > 0) return;
    this.steamClock = 0.45;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * hot.r * 0.8;
    this.fx.puff(new THREE.Vector3(hot.x + Math.cos(a) * d, hot.level + 0.15, hot.z + Math.sin(a) * d), 0.55);
  }

  /** The cannery's ledger: a page each time it is read, in order, and round again. */
  private readLedger(): void {
    const page = this.save.cannery.pages % CANNERY_PAGES.length;
    this.save.cannery.pages++;
    this.hud.toast(`“${CANNERY_PAGES[page]}”`);
    this.audio.play('card', { volume: 0.4 });
    // In the back, behind the last page: a chart.
    if (page === CANNERY_PAGES.length - 1) setTimeout(() => this.foundChart('mire'), 2800);
    this.changed();
  }

  /** The crate in the cannery: something in it once a day. */
  private rummageCrate(): void {
    const got = rummage(this.save, this.today, Math.random());
    this.audio.play(got.empty ? 'click' : 'coin', { volume: 0.4 });
    this.hud.toast(got.says, got.pearl ? 'gold' : '');
    this.changed();
  }

  // ---------- Toys ----------

  /** Get on a toy that is ridden (or off it), or use one that is used. */
  useToy(id: string): void {
    const toy = toyById(id);
    if (!toy || !this.save.toys.includes(id)) return;
    if (toy.gear) {
      if (this.riding === id) this.hopOff();
      else this.hopOn(id);
      return;
    }
    const left = restLeft(this.save, id, Date.now());
    if (left || !useToy(this.save, id, Date.now())) {
      this.hud.toast(`The ${toy.name.toLowerCase()} is not ready: ${sayRest(left)}.`);
      return;
    }
    if (id === 'toy-bell') {
      this.bellUntil = performance.now() + (BELL.secs * 1000) / this.cfg.warp;
      this.audio.bell();
      if (this.mode === 'walk' && !this.fishing.busy) {
        // Rung over the head, where the wave is.
        this.emote('wave');
        void this.body.hold('toy-bell', 0.32);
        setTimeout(() => this.body.action !== 'uke' && void this.body.hold(null), 2800);
      }
      this.hud.toast('The bell carries out over the water. For a minute and a half, the fish come quick.', 'gold');
    } else {
      this.cloudUntil = performance.now() + (BOTTLE_SECS * 1000) / this.cfg.warp;
      this.audio.thunder(0.8);
      this.hud.toast('The cork comes out with a rumble. A rain cloud of your own, for four minutes.', 'gold');
    }
    this.changed();
  }

  private hopOn(id: string): void {
    const toy = toyById(id);
    this.stopActivity();
    this.putAway();
    if (!toy?.gear || this.mode !== 'walk') {
      this.hud.toast('Not in here.');
      return;
    }
    this.riding = id;
    this.player.gear = toy.gear;
    this.trick = null;
    this.combo = [];
    void this.ride.set(id, this.scene);
    this.audio.play('click');
    const hint = `ride-${toy.gear}`;
    if (!this.save.hints.includes(hint)) {
      this.save.hints.push(hint);
      const says = {
        skate: 'Push the stick to get rolling: it keeps going. Jump to ollie, then Kickflip or 360 before you land.',
        pogo: 'It never stops. Jump makes the next bounce a big one.',
        balloons: 'Jump, and float. Jump again in the air for a little more lift, twice.',
        sled: 'Point it downhill and let go. On the flat it hardly moves at all.',
        stilts: 'Slow and tall. Water that would stop you on foot will not stop you now.',
      };
      this.hud.toast(says[toy.gear]);
      this.changed();
    }
  }

  private hopOff(): void {
    if (!this.riding) return;
    this.riding = null;
    this.player.gear = null;
    this.trick = null;
    this.combo = [];
    this.body.strain = 0;
    this.body.power = 0;
    if (this.body.action === 'skate' || this.body.action === 'pogo' || this.body.action === 'float') this.body.action = 'idle';
    void this.ride.set(null, this.scene);
  }

  /** Begin a trick, in the air on the skateboard, if none is under way. */
  private doTrick(kind: Trick): void {
    if (this.trick || !this.player.airborne || this.riding !== 'toy-skateboard') return;
    this.trick = { kind, t: 0 };
    this.audio.play('cast', { volume: 0.3, rate: kind === 'spin' ? 1.2 : 1.6 });
  }

  /** The board has come down: what was done in the air is landed, or, with a trick half done, it is a bail. */
  private landTricks(): void {
    const now = performance.now();
    if (this.trick) {
      this.trick = null;
      this.combo = [];
      this.player.stop();
      this.rig.bump(0.12);
      this.body.express('squint', 0.8);
      this.audio.play('stepwood', { volume: 0.5, rate: 0.6 });
      this.shouting = { text: 'Bail!', until: now + 1300 };
      return;
    }
    if (!this.combo.length) return;
    this.save.tricks += this.combo.length;
    this.shouting = { text: `${comboSays(this.combo)}!`, until: now + 1700 };
    this.audio.play(this.combo.length > 1 ? 'catch' : 'coin', { volume: 0.4 });
    this.combo = [];
    this.changed();
  }

  dressRod(paint: string | null, charm: string | null): void {
    this.save.rodPaint = paint;
    this.save.charm = charm;
    this.body.setRodLook(PAINTS.find((q) => q.id === paint)?.colour ?? null, charm, !!PAINTS.find((q) => q.id === paint)?.glows);
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
      fresh.setRodLook(PAINTS.find((q) => q.id === this.save.rodPaint)?.colour ?? null, this.save.charm, !!PAINTS.find((q) => q.id === this.save.rodPaint)?.glows);
      await fresh.setHat(this.save.hat);
      await fresh.setExtra(this.save.extra);
      // The old body's line and bobber go with it.
      this.fishing.dispose();
      this.fishing = new Fishing(this.world.field, fresh, this.fx, this.fishingHooks(), this.scene);
      this.player.sync();
    });
  }

  /**
   * Take a thing out of the bag to set down. It is carried in front of the player, see-through,
   * until they say where it goes: Set down, Turn, or Put away.
   */
  setDown(id: string): void {
    if (!(this.save.furniture[id] > 0)) return;
    this.putAway();
    void this.carry(id, Math.PI);
  }

  /** Pick up something that is standing, to move it. */
  private move(thing: PlacedThing): void {
    this.putAway();
    this.placed.remove(thing);
    this.save.placed = this.save.placed.filter((x) => x !== thing);
    // It is in the bag while it is carried: a game put away mid-carry loses nothing.
    this.save.furniture[thing.id] = (this.save.furniture[thing.id] ?? 0) + 1;
    void this.carry(thing.id, thing.yaw - this.player.yaw);
    this.audio.play('click');
    this.changed();
  }

  private async carry(id: string, turn: number): Promise<void> {
    const ghost = await ghostOf(id, this.save.campName);
    if (!ghost) return;
    this.carrying = { id, turn, ghost };
    this.scene.add(ghost);
    if (!this.save.hints.includes('arrange')) {
      this.save.hints.push('arrange');
      this.hud.toast('Walk it to where you want it. Turn it, then Set down.');
    }
  }

  /** Whether a thing set down was set down on the island the game is on. */
  private onThisIsle(p: PlacedThing): boolean {
    return (p.isle ?? 'cove') === ISLE;
  }

  /** Where the thing being carried would stand, and whether it may. */
  private carriedTo(): { x: number; z: number; yaw: number; ok: boolean } {
    const yaw = this.player.yaw;
    const x = this.player.pos.x + Math.sin(yaw) * 1.7;
    const z = this.player.pos.z + Math.cos(yaw) * 1.7;
    const wet = waterAt(this.world.field, x, z) !== null && floorAt(x, z) === null;
    return { x, z, yaw: yaw + (this.carrying?.turn ?? 0), ok: !wet && Math.abs(x) < this.world.field.half - 4 && Math.abs(z) < this.world.field.half - 4 };
  }

  private setCarried(): void {
    const c = this.carrying;
    if (!c) return;
    const to = this.carriedTo();
    if (!to.ok) {
      this.hud.toast('Not in the water.');
      return;
    }
    this.scene.remove(c.ghost);
    this.carrying = null;
    if (!(this.save.furniture[c.id] > 0)) return;
    this.save.furniture[c.id]--;
    const thing: PlacedThing = ISLE === 'cove' ? { id: c.id, x: to.x, z: to.z, yaw: to.yaw } : { id: c.id, x: to.x, z: to.z, yaw: to.yaw, isle: ISLE };
    this.save.placed.push(thing);
    void this.placed.add(thing);
    this.audio.play('click');
    this.changed();
  }

  /** Back into the bag with whatever is being carried. */
  private putAway(): void {
    const c = this.carrying;
    if (!c) return;
    this.scene.remove(c.ghost);
    this.carrying = null;
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
    this.emoteTimer = name === 'dance' || name === 'sit' || name === 'flop' || name === 'lean' || name === 'warm' ? Infinity : name === 'spin' ? 2.4 : name === 'honk' ? 1.4 : name === 'slap' ? 1.1 : name === 'skip' ? 1.6 : 3;
    if (name === 'skip') {
      // A stone skipped out over whatever water is ahead: three rings, each further and smaller.
      this.body.power = 0;
      const yaw = this.player.yaw;
      const from = this.player.pos.clone();
      for (const [i, far] of [4.5, 7.5, 9.6].entries()) {
        setTimeout(() => {
          const x = from.x + Math.sin(yaw) * far;
          const z = from.z + Math.cos(yaw) * far;
          const w = waterAt(this.world.field, x, z);
          if (!w) return;
          const at = new THREE.Vector3(x, w.level + 0.02, z);
          this.fx.ring(at, 0.7 - i * 0.15);
          if (i === 2) this.fx.splash(at, 0.1);
          this.audio.play('plop', { volume: 0.35 - i * 0.08, rate: 1.3 + i * 0.25 });
        }, 620 + i * 260);
      }
    }
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
    for (const who of [...this.npcs, this.gus, ...(this.traderIn && this.trader.body ? [{ saying: this.trader.saying, body: this.trader.body }] : [])]) {
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
    const reach = this.rod.reach;
    for (let d = 3; d <= reach; d += 1.5) {
      if (fishingZone(this.world.field, this.player.pos.x + f.x * d, this.player.pos.z + f.z * d)) return true;
    }
    // A small water (a hole in the ice, a tide pool) is easily stepped over by that: one near enough ahead counts.
    const p = this.player.pos;
    return POOLS.some((q) => {
      if (q.hot) return false;
      const dx = q.x - p.x;
      const dz = q.z - p.z;
      const d = Math.hypot(dx, dz);
      return d < reach + q.r && d > 0.5 && (dx * f.x + dz * f.z) / d > 0.8;
    });
  }

  /** Whether the player stands by a fire: the camp's, or one of their own. */
  private nearFire(): boolean {
    const p = this.player.pos;
    const camp = PLACED.find((x) => x.id === 'campfire');
    if (camp && Math.hypot(camp.x - p.x, camp.z - p.z) < 2.4) return true;
    return this.save.placed.some((t) => t.id === 'f-firepit' && this.onThisIsle(t) && Math.hypot(t.x - p.x, t.z - p.z) < 2.4);
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
    const rod = this.rod;
    const f = this.fishing;
    const p = this.player.pos;
    const sheetOpen = !!Sheet.current;
    if (this.mode === 'chalk' || this.mode === 'uke' || sheetOpen) {
      hud.setAction(null);
      hud.setSecond(null);
      return;
    }
    hud.setThird(null);
    if (this.mode === 'inside') {
      const spot = this.indoors.near();
      hud.setSecond('Leave', () => this.leaveInside());
      if (!spot) hud.setAction(null);
      else if (spot.id === 'counter') hud.setAction('Shop', () => this.openSheet('shop'), undefined, 'green');
      else if (spot.id === 'bench') hud.setAction('Tackle', () => this.openSheet('tackle'), undefined, 'green');
      else if (spot.id === 'stove') hud.setAction('Warm hands', () => (this.body.action = 'warm'), undefined, 'blue');
      else if (spot.id === 'ledger') hud.setAction('Read', () => this.readLedger(), undefined, 'blue');
      else if (spot.id === 'crate') hud.setAction('Rummage', () => this.rummageCrate(), undefined, 'green');
      else hud.setAction('Tank', () => this.openSheet('aquarium'), undefined, 'green');
      return;
    }
    if (this.mode === 'tower') {
      hud.setSecond('Climb down', () => this.climbDown());
      hud.setAction(this.scope ? 'Lower' : 'Scope', () => this.setScope(!this.scope), undefined, 'blue');
      return;
    }
    if (this.carrying && this.mode === 'walk') {
      hud.setAction('Set down', () => this.setCarried(), undefined, 'green');
      hud.setSecond('Turn', () => {
        if (this.carrying) this.carrying.turn += Math.PI / 4;
        this.audio.play('tick', { volume: 0.3 });
      });
      hud.setThird('Put away', () => this.putAway());
      return;
    }
    if (this.riding === 'toy-skateboard' && this.player.airborne && this.mode === 'walk' && !f.busy) {
      hud.setAction('Kickflip', () => this.doTrick('kickflip'), undefined, 'blue');
      hud.setSecond('360', () => this.doTrick('spin'));
      hud.setThird('Hop off', () => this.hopOff());
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
      if (this.riding) this.hopOff();
      if (this.mode === 'emote') this.stopActivity();
      f.press(aim, rod);
    };
    // The secondary button: whatever is close by.
    const npc = this.npcs.find((n) => n.pos.distanceTo(p) < 2.8);
    const gusNear = this.gus.body.group.position.distanceTo(p) < 3;
    const seat = this.mode === 'walk' ? this.nearSeat() : null;
    const thing = this.mode === 'walk' ? this.placed.near(p) : null;
    const dig = this.nearBuried;
    const found = this.forage.near(p);
    if (this.mode === 'dig') hud.setSecond(null);
    else if (dig && this.detecting && this.mode === 'walk') hud.setSecond('Dig', () => this.startDig(dig));
    else if (this.mode === 'boat') {
      // Beside the buoy the way is open to the other island.
      if (Math.hypot(this.boat.pos.x - CROSSING.x, this.boat.pos.z - CROSSING.z) < CROSSING.reach) hud.setSecond('Row out', () => this.cross());
      else hud.setSecond(this.boat.nearMooring(this.boat.pos) ? 'Get out' : null, () => this.leaveBoat());
    }
    else if (this.mode === 'sit') hud.setSecond('Stand up', () => this.stopActivity());
    else if (npc) {
      // With the fish they asked for in the bag, the button hands it over.
      const who = npc.def.id as Who;
      const ready = favourInBag(this.save, who);
      hud.setSecond(ready >= 0 ? `Give ${BY_ID[this.save.bag[ready].species]?.name ?? 'fish'}` : 'Chat', () => this.speakTo(who, (words) => npc.chat(performance.now(), words), npc.def.lines));
    } else if (gusNear && this.shopFront.distanceTo(new THREE.Vector3(p.x, 0, p.z)) >= 3.2) hud.setSecond('Chat', () => this.speakTo('npc-pelican', (words) => this.gus.chat(performance.now(), words), GUS_LINES));
    else if (this.mode === 'walk' && this.gullNear()) hud.setSecond('Feed gull', () => this.feedTheGull());
    else if (this.mode === 'walk' && this.potNear()) {
      const pot = this.potNear()!;
      const state = potState(this.save, pot.id, Date.now());
      hud.setSecond(state === 'empty' ? 'Set pot' : state === 'ready' ? 'Haul pot' : 'Pot soaking', () => this.usePot(pot));
    } else if (this.mode === 'walk' && this.beaconNear() >= 0 && !burning(this.save, this.beaconNear(), Date.now())) {
      const i = this.beaconNear();
      hud.setSecond('Light', () => this.lightTheBeacon(i));
    } else if (this.mode === 'walk' && Math.hypot(p.x - this.canneryDoor.x, p.z - this.canneryDoor.z) < 2.6) hud.setSecond('Go inside', () => void this.goInside('cannery'));
    else if (this.mode === 'walk' && waterAt(this.world.field, p.x, p.z)?.zone === 'spring') hud.setSecond('Soak', () => this.soak());
    else if (this.mode === 'walk' && this.traderIn && this.trader.pos.distanceTo(p) < 3.2) hud.setSecond('Chat', () => this.trader.chat(performance.now()));
    else if (this.mode === 'walk' && Math.hypot(p.x - this.shopFront.x, p.z - this.shopFront.z) < 3.2) hud.setSecond('Go inside', () => void this.goInside('shop'));
    else if (this.mode === 'walk' && Math.hypot(p.x - this.hutFront.x, p.z - this.hutFront.z) < 2.4) hud.setSecond('Go inside', () => void this.goInside('hut'));
    else if (this.mode === 'walk' && Math.hypot(p.x - this.tower.x, p.z - this.tower.z) < this.tower.r + 2.6) {
      hud.setSecond('Climb', () => this.climb());
      hud.setThird('Aquarium', () => void this.goInside('aquarium'));
    }
    else if (found && this.mode === 'walk') hud.setSecond(found.kind === 'worms' ? 'Dig up' : 'Catch', () => this.takeForage(found));
    else if (seat) hud.setSecond('Sit', () => this.sitOn(seat));
    else if (this.mode === 'walk' && this.nearFire()) hud.setSecond('Warm hands', () => this.emote('warm'));
    else if (this.boat.nearMooring(p) && p.y > 2) hud.setSecond(this.save.boat ? 'Row' : 'Boat', () => (this.save.boat ? this.boardBoat() : this.hud.toast('The rowboat needs a licence. Gus sells them (Upgrades).')));
    else if (Chalk.near(p)) hud.setSecond('Draw', () => this.startChalk());
    else hud.setSecond(null);
    // Something set down is within reach: a chest is opened and a sign named; anything can be moved.
    if (thing && this.mode === 'walk' && !this.detecting) {
      const what = FURNITURE.find((q) => q.id === thing.id);
      const extra: [string, () => void] | null = what?.store ? ['Open', () => this.openSheet('chest')] : thing.id === 'f-campsign' ? ['Name', () => this.openSheet('sign')] : null;
      const offer = (label: string, tap: () => void): void => (hud.hasSecond ? hud.setThird(label, tap) : hud.setSecond(label, tap));
      if (extra && !hud.hasSecond) {
        hud.setSecond(extra[0], extra[1]);
        hud.setThird('Move', () => this.move(thing));
      } else offer('Move', () => this.move(thing));
    }
    if (this.riding && !hud.hasThird) hud.setThird('Hop off', () => this.hopOff());
    // The main button.
    const flat = new THREE.Vector3(p.x, 0, p.z);
    if (this.mode === 'walk' && this.traderIn && this.trader.pos.distanceTo(p) < 3.2) hud.setAction('Trade', () => this.openSheet('trader'), undefined, 'green');
    else if (this.mode !== 'boat' && flat.distanceTo(this.shopFront) < 3.2) hud.setAction('Shop', () => this.openSheet('shop'), undefined, 'green');
    else if (this.mode !== 'boat' && flat.distanceTo(this.board) < 2.6) hud.setAction('Errands', () => this.openSheet('board'), undefined, 'green');
    else if (this.mode !== 'boat' && flat.distanceTo(this.arcadeFront) < 3.4) hud.setAction('Play', () => this.openSheet('arcade'), undefined, 'gold');
    else if (this.detecting && this.mode === 'walk') hud.setAction('Put away', () => this.toggleDetector(), undefined, 'blue');
    else if ((this.mode === 'walk' || this.mode === 'boat' || this.mode === 'emote') && this.waterAhead()) hud.setAction('Cast', cast, () => f.release(rod));
    else hud.setAction(null);
  }

  // ---------- Indoors, and up the lighthouse ----------

  /** Go into a room. The island is not drawn while the player is in it. */
  private async goInside(room: RoomId): Promise<void> {
    this.stopActivity();
    if (this.mode !== 'walk' || !(await this.indoors.enter(room))) return;
    this.mode = 'inside';
    this.player.free = false;
    this.outsideYaw = this.rig.yaw;
    this.body.moveTo(this.indoors.scene);
    if (room === 'shop') {
      // Gus comes in from his window to stand behind the counter.
      const g = this.gus.body.group;
      this.gusOutside = { pos: g.position.clone(), yaw: g.rotation.y };
      this.gus.body.moveTo(this.indoors.scene);
      g.position.copy(this.indoors.at(GUS_INSIDE.fx, GUS_INSIDE.fz));
      g.rotation.y = GUS_INSIDE.yaw;
    }
    if (room === 'aquarium') void this.indoors.stock(this.save.aquarium, (id) => `${import.meta.env.BASE_URL}icons/fish-${id}.webp`);
    const v = this.indoors.view()!;
    this.rig.override = { pos: v.pos, dist: v.dist, pitch: v.pitch };
    this.rig.yaw = v.yaw;
    this.rig.first = true;
    this.audio.play('open', { volume: 0.4, rate: 0.8 });
  }

  private leaveInside(): void {
    if (this.mode !== 'inside') return;
    this.body.moveTo(this.scene);
    if (this.gusOutside) {
      const g = this.gus.body.group;
      this.gus.body.moveTo(this.scene);
      g.position.copy(this.gusOutside.pos);
      g.rotation.y = this.gusOutside.yaw;
      this.gusOutside = null;
    }
    this.indoors.leave();
    this.rig.override = null;
    this.rig.yaw = this.outsideYaw;
    this.rig.first = true;
    this.mode = 'walk';
    this.player.free = true;
    this.body.action = 'idle';
    this.player.sync();
    this.audio.play('open', { volume: 0.4, rate: 0.7 });
  }

  /** Up to the lighthouse's gallery, to look out over the island and the sea. */
  private climb(): void {
    this.stopActivity();
    if (this.mode !== 'walk') return;
    this.mode = 'tower';
    this.player.free = false;
    this.body.group.visible = false;
    this.outsideYaw = this.rig.yaw;
    this.rig.pitch = 0.4;
    this.audio.play('stepwood', { volume: 0.4, rate: 0.8 });
    if (!this.save.hints.includes('tower')) {
      this.save.hints.push('tower');
      this.hud.toast('Drag to look round. The telescope picks things out, held still on them.');
      this.changed();
    }
  }

  private climbDown(): void {
    if (this.mode !== 'tower') return;
    this.setScope(false);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.body.group.visible = true;
    this.mode = 'walk';
    this.player.free = true;
    this.rig.yaw = this.outsideYaw;
    this.rig.pitch = 0.5;
    this.rig.first = true;
  }

  private setScope(on: boolean): void {
    this.scope = on;
    this.scopeEl.hidden = !on;
    this.held = { sight: null, secs: 0 };
    this.audio.play('click', { volume: 0.4 });
  }

  /** The view from the gallery: the camera goes round the lantern, looking out the way it is turned. */
  private lookout(dt: number): void {
    const t = this.tower;
    const out = this.rig.forward();
    const lift = 0.14 - (this.rig.pitch - 0.08) * 0.42;
    const cam = this.camera;
    cam.position.set(t.x + out.x * (t.r * 0.5 + 0.5), t.top, t.z + out.z * (t.r * 0.5 + 0.5));
    const dir = new THREE.Vector3(out.x * Math.cos(lift), Math.sin(lift), out.z * Math.cos(lift));
    cam.lookAt(cam.position.clone().add(dir));
    const fov = this.scope ? 9 : 58;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 9));
      cam.updateProjectionMatrix();
    }
    if (!this.scope) return;
    // What the glass is on: held there a moment, it is picked out.
    const camp = this.save.placed.find((q) => q.id === 'f-tent' && this.onThisIsle(q));
    const where: Record<Sight, THREE.Vector3 | null> = {
      trawler: this.world.trawler,
      pier: new THREE.Vector3(PIER.head.x1, PIER.deck + 1, PIER.z),
      pond: new THREE.Vector3(POND.x, POND.level, POND.z),
      cave: new THREE.Vector3(CAVE.x, 2, CAVE.z),
      camp: camp ? new THREE.Vector3(camp.x, this.world.field.heightAt(camp.x, camp.z) + 1, camp.z) : null,
      // (Only on a clear day: mist and rain hide it.)
      ice: this.weather === 'clear' ? World.ICEBERG.clone().setY(14) : null,
    };
    const on = sighted(cam.position, dir, where);
    if (on !== this.held.sight) this.held = { sight: on, secs: 0 };
    else if (on) {
      this.held.secs += dt;
      if (this.held.secs > 0.7 && this.held.secs - dt <= 0.7) {
        const first = !this.save.spotted.includes(on);
        if (first) {
          this.save.spotted.push(on);
          if (on === 'trawler') this.save.tokens += 1;
          this.changed();
        }
        if (on === 'ice') setTimeout(() => this.foundChart('rime'), 2600);
        this.hud.toast(SIGHTS[on] + (first && on === 'trawler' ? ' +1 pearl' : ''), first ? 'gold' : '');
        this.audio.play(first ? 'quest' : 'click', { volume: 0.4 });
      }
    }
  }

  /** Whether the pier's gull is close by and would take a fish today. */
  private gullNear(): boolean {
    const at = this.wild.gullAt;
    return !!at && at.distanceTo(this.player.pos) < 2.6 && gullHungry(this.save.gull, this.today);
  }

  private feedTheGull(): void {
    const i = gullFish(this.save.bag);
    if (i < 0) {
      this.hud.toast('The gull looks at your empty hands. It would like a fish: any ordinary one.');
      return;
    }
    const [fish] = this.save.bag.splice(i, 1);
    this.save.gull = feedGull(this.save.gull, this.today);
    this.audio.play('plop', { volume: 0.5, rate: 1.4 });
    this.hud.toast(`You toss it a ${BY_ID[fish.species]?.name ?? 'fish'}. ${gullSays(this.save.gull)}`, this.save.gull.tame ? 'gold' : undefined);
    this.changed();
  }

  /** A tame gull brings something now and then: a few coins it found, or bait. */
  private gullCalls(dt: number): void {
    if (!this.started || !this.save.gull.tame || this.mode !== 'walk' || this.fishing.busy || Sheet.current || !gullBrings(this.save.gull, this.today)) return;
    this.gullDue -= dt;
    if (this.gullDue > 0) return;
    this.gullDue = 150 + Math.random() * 200;
    const gift = gullGift(Math.random());
    this.save.coins += gift.coins;
    if (gift.bait) this.save.baits[gift.bait.id] = (this.save.baits[gift.bait.id] ?? 0) + gift.bait.count;
    this.save.gull = gullGave(this.save.gull, this.today);
    this.audio.play('coin', { volume: 0.4 });
    this.hud.toast(gift.says);
    this.changed();
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
    this.putAway();
    this.fishing.cancel();
    this.controls.release();
    this.controls.enabled = false;
    this.audio.play('open', { volume: 0.5 });
    this.sheets[name].show();
  }

  // ---------- The frame ----------

  /** A frame, timed: the gap since the last one, and how long the game's own part of it took. */
  private frame(): void {
    const t0 = performance.now();
    this.step();
    const gap = this.lastFrame ? t0 - this.lastFrame : 0;
    this.lastFrame = t0;
    // A gap of a second or more is the game having been put away, not a slow frame.
    if (gap <= 0 || gap > 1000) return;
    const work = performance.now() - t0;
    this.meter?.gaps.push(gap);
    this.meter?.work.push(work);
    if (this.showStats) {
      this.recent.gaps.push(gap);
      this.recent.work.push(work);
      if (this.recent.gaps.length >= 30) {
        this.statsEl.textContent = readout(this.recent.gaps, this.recent.work);
        this.recent = { gaps: [], work: [] };
      }
    }
  }

  // ---------- For testing: the frame rate and the benchmark ----------

  showStats = false;
  private statsEl = Object.assign(document.createElement('div'), { className: 'fps', hidden: true });
  private lastFrame = 0;
  private recent: { gaps: number[]; work: number[] } = { gaps: [], work: [] };
  /** While a benchmark step is being timed: every frame's gap and work. */
  private meter: { gaps: number[]; work: number[] } | null = null;
  private benching = false;
  /** The last benchmark's text, for the tools. */
  benchText = '';

  setStats(on: boolean): void {
    this.showStats = on;
    this.statsEl.hidden = !on;
    this.statsEl.textContent = '';
    if (!this.statsEl.parentElement) this.app.append(this.statsEl);
  }

  /**
   * Stand in each of the benchmark's places in turn, turning slowly, and time every frame; then
   * put the player back and show what it came to as text to copy. Nothing is saved.
   */
  async runBench(): Promise<void> {
    if (this.benching) return;
    this.benching = true;
    Sheet.current?.close();
    this.stopActivity();
    const was = { time: this.pin.time, weather: this.pin.weather, x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw, look: this.rig.yaw };
    const note = Object.assign(document.createElement('div'), { className: 'bench-note' });
    this.app.append(note);
    const wait = (secs: number): Promise<void> => new Promise((done) => setTimeout(done, secs * 1000));
    const secs = this.cfg.benchsecs ?? BENCH_SECS;
    const lines: BenchLine[] = [];
    for (const [i, s] of BENCH_STEPS.entries()) {
      note.textContent = `Benchmark ${i + 1} of ${BENCH_STEPS.length}: ${s.name}`;
      this.teleport(s.at);
      this.pin.time = s.time;
      this.pin.weather = s.weather;
      this.rain = s.weather === 'rain' ? 1 : 0;
      await wait(Math.min(BENCH_SETTLE, secs));
      this.meter = { gaps: [], work: [] };
      await wait(secs);
      const m = this.meter;
      this.meter = null;
      lines.push({ name: s.name, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, ...summarise(m.gaps, m.work) });
    }
    note.remove();
    this.pin.time = was.time;
    this.pin.weather = was.weather;
    this.player.place(was.x, was.z, was.yaw);
    this.rig.yaw = was.look;
    this.benching = false;
    const gl = this.renderer.getContext();
    const card = gl.getExtension('WEBGL_debug_renderer_info');
    const canvas = this.renderer.domElement;
    this.benchText = benchReport(
      [
        `${new Date().toISOString().slice(0, 10)}, screen ${window.innerWidth} x ${window.innerHeight} at ${window.devicePixelRatio}x, canvas ${canvas.width} x ${canvas.height}`,
        `${this.look.lofi ? 'lo-fi' : 'smooth'} look, shadows ${this.renderer.shadowMap.enabled ? 'on' : 'off'}, chunkier pixels ${this.save.settings.pixels ? 'on' : 'off'}, grain ${this.save.settings.grain}`,
        `${card ? String(gl.getParameter(card.UNMASKED_RENDERER_WEBGL)) : 'graphics card not named'}, ${secs} s a step`,
      ],
      lines,
    );
    const text = this.benchText;
    const sheet = new Sheet(this.app, 'Benchmark', (body) => {
      const out = Object.assign(document.createElement('textarea'), { className: 'bench-text', value: text, readOnly: true });
      const copy = Object.assign(document.createElement('button'), { className: 'big-btn', textContent: 'Copy' });
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = 'Copied';
        } catch {
          out.select();
          copy.textContent = 'Select all, then copy';
        }
      };
      body.append(out, copy);
    });
    sheet.show();
  }

  private step(): void {
    const dt = Math.min(0.05, this.clock.getDelta()) * this.cfg.warp;
    this.frames++;
    const now = Date.now();
    const mode = this.save.settings.clock;
    const tz = new Date().getTimezoneOffset();
    // (Where it is always one hour, or one season, it is.)
    this.hour = pinnedHour(this.pin.time) ?? BIOMES[ISLE].hour ?? hourAt(now, mode, tz);
    this.weather = this.pin.weather ?? weatherAt(now, mode, tz);
    const skyRain = this.weather === 'rain' || this.weather === 'storm';
    // The season, by the calendar (or pinned): the island is dressed for it when it changes.
    const season = pinnedSeason(this.pin.season) ?? BIOMES[ISLE].season ?? seasonAt(now, tz);
    if (season !== this.season || !this.dressed) {
      this.season = season;
      this.dressed = true;
      this.world.setSeason(season);
    }
    // A sky that is not there every day, when the weather is clear.
    const pinnedSky = RARE_SKIES.find((k) => k === this.cfg.sky) ?? null;
    // On Rimefall the northern lights are out every clear night.
    const lights = !!BIOMES[ISLE].aurora && this.weather === 'clear' && (this.hour >= 20.5 || this.hour < 4.5);
    const rare: RareSky | null = pinnedSky ?? (this.benching ? null : lights ? 'aurora' : rareSkyAt(dayNumber(now, mode, tz), this.hour, this.weather === 'clear'));
    if (rare === 'aurora' && ISLE === 'rime' && this.started && !this.save.hints.includes('rime-lights')) {
      this.save.hints.push('rime-lights');
      this.checkTitles();
      this.changed();
    }
    this.world.air.rare = rare;
    this.world.air.rareNow = !!pinnedSky;
    if (rare && rare !== this.skyTold && this.started && !pinnedSky) {
      this.hud.toast(RARE_SAYS[rare], 'gold');
      if (!this.save.skies.includes(rare)) {
        this.save.skies.push(rare);
        this.changed();
      }
    }
    this.skyTold = rare;
    const cloud = performance.now() < this.cloudUntil;
    this.raining = skyRain || cloud;
    this.rain += ((skyRain ? 1 : 0) - this.rain) * (1 - Math.exp(-dt * 0.4));
    if (this.frames < 3) this.rain = skyRain ? 1 : 0;

    const look = this.controls.takeLook();
    // Indoors the camera keeps its place; through the telescope it turns a little at a time.
    const fine = this.mode === 'tower' && this.scope ? 0.16 : 1;
    if (this.mode !== 'inside') this.rig.turn(look.x * fine, look.y * fine);
    this.coachWatch(look.x * TURN);
    this.rig.zoomBy(look.zoom);
    const stick = this.controls.enabled && !this.benching ? this.controls.stick() : { x: 0, y: 0 };
    // The benchmark looks all round each place, slowly.
    if (this.benching) this.rig.yaw += dt * 0.5;
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
      // The first time the boat comes under the cave's mouth.
      if (!this.save.hints.includes('cave') && waterAt(this.world.field, seatAt.x, seatAt.z)?.zone === 'cave') {
        this.save.hints.push('cave');
        this.hud.toast('The water goes still and dark under the rock. Something lives in here that lives nowhere else.', 'gold');
        this.changed();
      }
      if (this.boat.effort > 0.3 && Math.floor(performance.now() / 950) !== Math.floor((performance.now() - dt * 1000) / 950)) this.audio.play('row', { volume: 0.35 });
    } else {
      this.boat.update(dt, { x: 0, y: 0 }, 0);
      if (this.mode === 'walk') this.player.update(dt, stick, this.rig.yaw);
      else this.player.update(dt, { x: 0, y: 0 }, this.rig.yaw);
      this.tread();
    }
    if (this.riding) {
      if (this.mode !== 'walk' || this.fishing.busy) this.hopOff();
      else {
        if (this.trick && (this.trick.t += dt) >= TRICK_SECS) {
          this.combo.push(this.trick.kind);
          this.trick = null;
          this.audio.play('tick', { volume: 0.3, rate: 1.4 });
        }
        this.ride.place(dt, this.body.group, this.player.yaw, standHeight(this.world.field, this.player.pos.x, this.player.pos.z), this.trick, this.player.pace * 2);
      }
    }
    if (this.mode === 'inside') {
      // The body is in the room, not where the player's place on the island says.
      const pace = this.indoors.move(dt, stick, this.rig.yaw);
      this.body.group.position.copy(this.indoors.pos);
      this.body.group.rotation.y = this.indoors.yaw;
      this.body.action = pace > 0 ? 'walk' : this.body.action === 'warm' ? 'warm' : 'idle';
      this.body.speed = 0;
      if (this.indoors.out) this.leaveInside();
    }
    if (this.mode === 'sit' && this.seat) this.body.group.position.y = this.seat.y + this.seat.lift - 0.36;
    if (this.mode === 'emote') {
      this.emoteTimer -= dt;
      if (this.body.action === 'skip') this.body.power = Math.min(1, this.body.power + dt / 0.9);
      if (this.emoteTimer <= 0) this.stopActivity();
    }

    const rod = this.rod;
    this.fishing.update(dt, this.hud.held, rod, baitById(this.save.bait));
    this.fishing.setCamera(this.camera.position);
    // While casting or reeling, the camera swings round behind the line.
    if (this.fishing.state === 'bite') this.body.express('wide', 0.2);
    if (this.fishing.state === 'aiming') this.body.group.rotation.y = this.rig.yaw + Math.PI;
    if (this.fishing.state === 'aiming' || this.fishing.state === 'flying') this.player.yaw = this.rig.yaw + Math.PI;
    this.body.update(dt);
    for (const n of this.npcs) n.update(dt, this.player.pos, this.hour);
    if (HOME) this.gus.update(dt, this.player.pos);
    // The trader: here by day on their days, gone by dark.
    const here = HOME && !this.benching && (this.cfg.trader ?? traderHere(this.today, this.hour));
    if (here !== this.traderIn) {
      this.traderIn = here;
      void this.trader.show(here, this.save.character);
    }
    if (here && this.started && this.traderTold !== this.today && !this.coach) {
      this.traderTold = this.today;
      this.hud.toast(`A second boat is pulled up on the beach: ${TRADER_NAME} the trader is in today.`, 'gold');
    }
    this.trader.update(dt, this.player.pos);

    this.rig.update(dt, this.mode === 'sit' || this.mode === 'boat' ? this.player.pos.clone().setY(this.player.pos.y - 0.2) : this.player.pos);
    if (this.mode === 'tower') this.lookout(dt);
    if (this.carrying) {
      // Whatever is being carried goes where it would stand, a little off the ground; put away if the player does anything else.
      if (this.mode !== 'walk' || this.fishing.busy) this.putAway();
      else {
        const to = this.carriedTo();
        const g = this.carrying.ghost;
        g.position.set(to.x, standHeight(this.world.field, to.x, to.z) + 0.12 + Math.round(Math.sin(performance.now() / 300)) * 0.03, to.z);
        g.rotation.y = to.yaw;
        g.visible = to.ok || Math.floor(performance.now() / 200) % 2 === 0;
      }
    }
    this.world.update(dt, this.hour, this.rain, this.player.pos, this.weather);
    this.animateGull(dt);
    this.viewClock -= dt;
    if (this.viewClock <= 0) {
      this.viewClock = 0.15;
      this.world.props.clearView(this.rig.override ? this.rig.override.pos : this.player.pos);
    }
    // In winter what falls is snow.
    this.fx.setRain(Math.max(this.rain, cloud ? 0.7 : 0), SEASON_LOOK[this.season].snow);
    this.finds.update(dt);
    this.wild.update(dt, this.player.pos, this.world.sky.palette.night, this.rain, Math.floor(Date.now() / 360_000), this.save.gull.tame, this.mode !== 'boat');
    this.gullCalls(dt);
    this.forageUpdate(dt, now);
    this.finds.setCloud(cloud, this.player.pos);
    if (this.started) this.secrets(dt, now);
    if (!HOME) this.steam(dt);
    if (BEACONS.length) this.tendBeacons();
    this.fx.update(dt, this.camera, this.player.pos);

    if (this.started) {
      this.context();
      this.hud.setReel(this.fishing.reelState ? this.fishing.reelState.progress : null, this.fishing.reelState?.tension ?? 0, this.fishing.reelState?.thrashing ?? false, this.fishing.fishIcon, this.fishing.reelState?.sulking ? 'It sulks on the bottom. Keep winding…' : this.fishing.fighting ? STYLE_SAYS[this.fishing.fighting] : undefined);
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
    // The bait on the line, by the Cast key: tap it to change bait or lure on the spot.
    if (this.hud) {
      const fishingNow = this.mode === 'walk' && this.started && !this.coach && !Sheet.current && this.cfg.hud;
      this.hud.setBait(fishingNow ? this.save.bait : null, this.save.bait === 'bait-worm' ? '∞' : String(this.save.baits[this.save.bait] ?? 0));
    }
    // The day's bounty, under the clock. Gus is at home, so it is only shown there. (Not while the first minute is being taught: one thing at a time.)
    if (this.hud && this.started && !this.coach && HOME) {
      const wanted = bountyFor(this.today);
      this.hud.setBounty(wanted.id, wanted.name, bountyFilled(this.save.bounty, this.today));
      if (this.bountyTold !== this.today && this.cfg.hud) {
        this.bountyTold = this.today;
        if (!bountyFilled(this.save.bounty, this.today)) this.hud.toast(`Gus wants a ${wanted.name} today. Double coins, and a bounty for the first.`, 'gold');
      }
    }
    this.keep();
    this.screen.render(this.mode === 'inside' ? this.indoors.scene : this.scene, this.camera);
  }

  /** Sea glass, bounce mushrooms, the metal detector, digging, and titles. */
  private secrets(dt: number, now: number): void {
    const p = this.player.pos;
    // Bounce mushrooms throw anyone who steps on them.
    if (HOME && this.mode === 'walk' && !this.player.airborne) {
      const i = this.finds.shroomUnder(p);
      if (i !== null) {
        const sh = SHROOMS[i];
        this.player.launch(sh.up, sh.yaw, sh.forward);
        this.finds.boing(i);
        this.audio.play('bite', { rate: 1.7, volume: 0.8 });
        if (!this.save.hints.includes('tip-shroom')) {
          this.save.hints.push('tip-shroom');
          this.hud.toast('Boing!');
          this.changed();
        }
      }
    }
    // Sea glass, picked up by walking into it.
    const g = HOME ? this.finds.glassNear(p) : null;
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
    this.digSpot = spot;
    this.audio.play('splashstep', { rate: 0.6, volume: 0.6 });
  }

  private finishDig(): void {
    const spot = this.digSpot;
    this.digSpot = null;
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

  /**
   * What `window.__cove` offers scripts. Looking and getting about are there for anyone. Whatever
   * changes the game (coins, catches, the game itself) is there only with `fresh=1`, on a save
   * that is not kept, which is how every tool runs: the real save cannot be given anything.
   */
  api(): Record<string, unknown> {
    const looking = {
      ready: true,
      /** The last benchmark's text (empty until one has finished). */
      bench: () => this.benchText,
      state: () => ({
        frames: this.frames,
        hour: +this.hour.toFixed(2),
        rain: +this.rain.toFixed(2),
        isle: ISLE,
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
    };
    if (!this.cfg.fresh) return looking;
    return {
      ...looking,
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
