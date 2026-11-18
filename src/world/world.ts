// Puts the island together: ground, water, sky, everything standing on it, and what is solid.
import * as THREE from 'three';
import { rng } from '../core/rng';
import type { Look } from '../look/look';
import { Colliders } from './colliders';
import { Heightfield } from './island';
import { PLACED, type Placed, pierSections, railPosts } from './layout';
import { Props } from './props';
import { FLOWER_RULES, RULES, lilypads, scatter, corals } from './scatter';
import { BIOMES } from '../look/biome';
import { lit } from '../look/material';
import { ISLE } from './isle';
import { HOLES, RIME } from './rime';
import { dressDune, dressSky } from './dressing';

const BIOME = BIOMES[ISLE];
import type { Weather } from '../game/clock';
import { SEASON_LOOK, type Season } from '../look/season';
import type { Air } from './sky';
import { SkyLife } from './skyLife';
import { Sky } from './sky';
import { buildTerrain } from './terrain';
import { Water } from './water';

export class World {
  readonly field = new Heightfield();
  readonly solid = new Colliders();
  readonly group = new THREE.Group();
  readonly sky: Sky;
  readonly water: Water;
  readonly props: Props;
  /** Glowing lamps after dark: one sprite each. */
  private glows: THREE.Sprite[] = [];
  private glowMat: THREE.SpriteMaterial;
  /** What an island has that moves by the clock alone (Thistledown's cloud, wind and kites; Sandglass Key's sand). */
  private moving: ((clock: number) => void)[] = [];
  /** Glowmere's mushrooms' own light. */
  private extraGlow: THREE.SpriteMaterial | null = null;
  /** What is lit after dark: lamps, the fire, the shop's counter, the lighthouse. */
  private lamps: { light: THREE.PointLight; strength: number; flickers: boolean; spare?: boolean }[] = [];
  private flames: THREE.Object3D[] = [];
  private beam: THREE.Object3D | null = null;
  private lofi = false;
  private terrain!: THREE.Mesh;
  /** Gulls, the boat on the horizon, shooting stars. */
  private life = new SkyLife();
  private clock = 0;

  constructor(readonly scene: THREE.Scene, shadows: boolean, look?: Look) {
    this.lofi = !!look?.lofi;
    if (look?.lofi) stepLamplight();
    this.sky = new Sky(scene, shadows, look);
    this.water = new Water(this.field, look);
    this.props = new Props(this.field, this.solid);
    this.terrain = buildTerrain(this.field, look);
    this.group.add(this.terrain, this.water.group, this.props.group, this.sky.group, this.life.group);
    scene.add(this.group);
    // The bridge's rails are solid, so nobody walks off the side of it into the creek.
    for (const p of railPosts()) this.solid.addCircle({ x: p.x, z: p.z, r: 0.22 });
    this.glowMat = new THREE.SpriteMaterial({ map: look?.lofi ? pixelGlow() : glowTexture(), color: 0xffd48a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  }

  /** Everything that has to be loaded. `progress` is called as each kind of thing arrives. */
  async populate(progress: (done: number, of: number) => void, models: boolean): Promise<void> {
    if (!models) return;
    const things = [...PLACED, ...pierSections(), ...scatter(this.field, RULES, 1), ...scatter(this.field, FLOWER_RULES, 2), ...lilypads(), ...corals(this.field)];
    const kinds = new Set(things.map((t) => t.id)).size + 1;
    let done = 0;
    const tick = (): void => progress(++done, kinds);
    await this.props.add(things, tick);
    this.dress(things);
    // Clouds drifting over.
    const r = rng(44);
    const { model } = await import('../assets/models');
    const proto = await model('cloud');
    tick();
    if (proto) {
      // One material for every cloud, in a colour the sky sets: white by day, dim plum at night.
      let paint: THREE.MeshBasicMaterial | null = null;
      for (let i = 0; i < 14; i++) {
        const c = proto.clone(true);
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = false;
            m.receiveShadow = false;
            paint ??= new THREE.MeshBasicMaterial({ color: 0xffffff, map: (m.material as THREE.MeshLambertMaterial).map, fog: false });
            paint.color = this.sky.cloudInk;
            m.material = paint;
          }
        });
        c.scale.setScalar(2.5 + r() * 3);
        c.position.set((r() - 0.5) * 680, 70 + r() * 50, (r() - 0.5) * 500);
        c.rotation.y = r() * 6;
        this.sky.addCloud(c);
      }
      // And a bank of bigger ones far out and low, where the camera looks: those overhead are
      // seldom in the picture.
      for (let i = 0; i < 12; i++) {
        const c = proto.clone(true);
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && paint) {
            m.castShadow = false;
            m.receiveShadow = false;
            m.material = paint;
          }
        });
        c.scale.setScalar(6 + r() * 6);
        const far = r() < 0.5 ? -1 : 1;
        c.position.set((r() - 0.5) * 680, 38 + r() * 40, far * (330 + r() * 160));
        c.rotation.y = r() * 6;
        this.sky.addCloud(c);
      }
    }
    for (const p of this.props.glows) {
      this.addGlow(p, 1.6);
      this.addLamp(p.clone().setY(p.y - 0.25), 7.5, 2.6);
    }
    this.lightUp();
  }

  /**
   * A flame that is its own light: two faceted tongues, one inside the other, that no lamp or
   * hour darkens. (A fire's flame as its model has it is painted, and so is lit like wood: at
   * dusk and in rain it was a dark red lump.) It jumps a few times a second, in steps.
   * Returns the flame, to take away again with `removeFlame`.
   */
  addFlame(at: THREE.Vector3, height: number): THREE.Object3D {
    const flame = new THREE.Group();
    for (const [colour, wide, tall, up] of [
      [0xf08c62, 0.3, 0.85, 0],
      [0xecc77d, 0.21, 0.64, 0.02],
      [0xfffdf6, 0.11, 0.38, 0.04],
    ] as const) {
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(wide * height, tall * height, 5).translate(0, (tall * height) / 2 + up * height, 0), new THREE.MeshBasicMaterial({ color: colour, fog: false }));
      flame.add(tongue);
    }
    flame.position.copy(at);
    this.group.add(flame);
    this.flames.push(flame);
    return flame;
  }

  /**
   * A light for something set down after the island was lit: one of a few spares, made with the
   * rest and kept dark. (A new light made on the spot would have every material on the island
   * made again for the new count of lights: a long stall on a phone.) Gives the light, or null
   * if the spares are all out, in which case the thing only glows.
   */
  borrowLamp(at: THREE.Vector3, reach: number, strength: number, colour = 0xffc98a, flickers = false): THREE.PointLight | null {
    const spare = this.lamps.find((l) => l.spare && l.strength === 0);
    if (!spare) return null;
    spare.light.position.copy(at);
    spare.light.distance = reach;
    spare.light.color.set(colour);
    spare.strength = strength;
    spare.flickers = flickers;
    return spare.light;
  }

  returnLamp(light: THREE.PointLight): void {
    const l = this.lamps.find((x) => x.light === light);
    if (l) l.strength = 0;
  }

  removeFlame(flame: THREE.Object3D): void {
    this.group.remove(flame);
    this.flames = this.flames.filter((f) => f !== flame);
  }

  /** Something that gives light after dark: it reaches `reach` metres, in flat steps. */
  addLamp(at: THREE.Vector3, reach: number, strength: number, colour = 0xffc98a, flickers = false): void {
    const light = new THREE.PointLight(colour, 0, reach, 1);
    light.position.copy(at);
    this.group.add(light);
    this.lamps.push({ light, strength, flickers });
  }

  /**
   * Night on the island: the campfire, a light at the counter of the shop, the arcade and the
   * fishing hut (so their fronts glow as lit windows do), and the lighthouse's lamp and beam.
   */
  private lightUp(): void {
    const at = (id: string): Placed | undefined => PLACED.find((p) => p.id === id);
    const ground = (x: number, z: number): number => this.field.heightAt(x, z);
    /** A point out in front of a building's door, `out` metres past its front wall and `up` above the ground. */
    const front = (p: Placed, out: number, up: number): THREE.Vector3 => {
      const depth = this.props.sizes.get(p.id)?.z ?? 4;
      const yaw = p.yaw ?? 0;
      const x = p.x + Math.sin(yaw) * (depth / 2 + out);
      const z = p.z + Math.cos(yaw) * (depth / 2 + out);
      return new THREE.Vector3(x, ground(x, z) + up, z);
    };
    const fire = at('campfire');
    if (fire) {
      const p = new THREE.Vector3(fire.x, ground(fire.x, fire.z) + 0.7, fire.z);
      this.addLamp(p, 9, 3, 0xff9448, true);
      this.addGlow(p, 1.4);
      this.addFlame(new THREE.Vector3(fire.x, ground(fire.x, fire.z) + 0.22, fire.z), 1.0);
    }
    // Spares, dark until something the player sets down asks for one (see `borrowLamp`).
    for (let i = 0; i < SPARE_LAMPS; i++) {
      this.addLamp(new THREE.Vector3(0, -50, 0), 1, 0);
      this.lamps[this.lamps.length - 1].spare = true;
    }
    const shop = at('shop');
    if (shop) this.addLamp(front(shop, 0.4, 1.9), 7, 2.4);
    const arcade = at('arcade');
    if (arcade) this.addLamp(front(arcade, 0.4, 1.8), 7, 2.8, 0xffd27a);
    const hut = at('fishing-hut');
    if (hut) this.addLamp(front(hut, 0.4, 1.7), 6, 2.2);
    const tower = at('lighthouse');
    if (tower) {
      const h = this.props.sizes.get('lighthouse')?.y ?? 13;
      const top = new THREE.Vector3(tower.x, ground(tower.x, tower.z) + h * 0.84, tower.z);
      this.addLamp(top, 16, 2.2, 0xfff0c0);
      this.addGlow(top, 3.2);
      // The beam: two pale cones, back to back, going round.
      const beam = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.14, depthWrite: false, fog: false, side: THREE.DoubleSide });
      for (const turn of [0, Math.PI]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 70, 6, 1, true).translate(0, -35, 0).rotateZ(Math.PI / 2 - 0.06), mat);
        cone.rotation.y = turn;
        beam.add(cone);
      }
      beam.position.copy(top);
      beam.visible = false;
      this.group.add(beam);
      this.beam = beam;
    }
  }

  addGlow(at: THREE.Vector3, size: number): THREE.Sprite {
    const s = new THREE.Sprite(this.glowMat);
    s.position.copy(at);
    s.scale.setScalar(size);
    s.renderOrder = 2;
    this.group.add(s);
    this.glows.push(s);
    return s;
  }

  removeGlow(s: THREE.Sprite): void {
    this.group.remove(s);
    this.glows = this.glows.filter((g) => g !== s);
  }

  /** Where the ice is far off on the cove's northern horizon: a thing for the telescope to find. */
  static readonly ICEBERG = new THREE.Vector3(70, 0, -430);

  /** What an island has that is made here, not from a model: Rimefall's ice, Glowmere's light, and the iceberg off the cove. */
  private dress(things: readonly Placed[]): void {
    if (ISLE === 'sky') {
      this.moving = dressSky(this.group, this.field);
      // The dandelion clocks keep some light of their own: in a low sun the shaded side of a white ball was nearly black.
      for (const o of this.props.group.children) {
        const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
        if (o.name === 'tree-dandelion' && m?.emissive) m.emissive.set(0x57524a);
      }
    }
    if (ISLE === 'dune') this.moving = dressDune(this.group);
    if (ISLE === 'cove') {
      // A long way north, white on the horizon on a clear day.
      const berg = new THREE.Mesh(new THREE.ConeGeometry(26, 34, 5, 1), new THREE.MeshBasicMaterial({ color: 0xf4eee3, fog: true }));
      berg.position.copy(World.ICEBERG).setY(12);
      berg.rotation.y = 0.4;
      this.group.add(berg);
    }
    if (ISLE === 'rime') {
      // The lake's ice: one flat sheet with the holes cut out of it, a finger above the ground it lies on.
      const lake = new THREE.Shape().absarc(0, 0, RIME.lake.r + 1.5, 0, Math.PI * 2, false);
      for (const h of HOLES) lake.holes.push(new THREE.Path().absarc(h.x - RIME.lake.x, -(h.z - RIME.lake.z), h.r + 0.25, 0, Math.PI * 2, true));
      const ice = new THREE.Mesh(new THREE.ShapeGeometry(lake, 40).rotateX(-Math.PI / 2), lit({ color: 0xc6e4f4 }));
      ice.position.set(RIME.lake.x, RIME.lake.level + 0.03, RIME.lake.z);
      ice.receiveShadow = true;
      this.group.add(ice);
      // Scratches across it, as skates and sleds and wind leave: darker lines, lying every way.
      const r = rng(9);
      const scratch = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.09).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fbbe6 }), 70);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * (RIME.lake.r - 2);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
        m.compose(new THREE.Vector3(RIME.lake.x + Math.cos(a) * d, RIME.lake.level + 0.045, RIME.lake.z + Math.sin(a) * d), q, new THREE.Vector3(2 + r() * 5, 1, 1));
        scratch.setMatrixAt(i, m);
      }
      this.group.add(scratch);
      // Floes on the sea round the island: flat slabs, each a different size, riding a little out of the water.
      const floes = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.08, 0.5, 6), lit({ color: 0xf4eee3 }), 46);
      let n = 0;
      for (let tries = 0; n < 46 && tries < 3000; tries++) {
        const a = r() * Math.PI * 2;
        const d = 74 + r() * 44;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        // Not where the boat rows out, and only over water.
        if (this.field.heightAt(x, z) > -1 || (x > 55 && Math.abs(z - 14) < 22)) continue;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
        const size = 1.5 + r() * 3.5;
        m.compose(new THREE.Vector3(x, 0.02, z), q, new THREE.Vector3(size, 1, size * (0.7 + r() * 0.5)));
        floes.setMatrixAt(n++, m);
      }
      floes.count = n;
      floes.receiveShadow = true;
      this.group.add(floes);
    }
    if (ISLE === 'glow') {
      // Every other giant mushroom gives off its own light: a teal glow under its cap, that no hour puts out (it is always night here).
      const shine = new THREE.SpriteMaterial({ map: this.glowMat.map, color: 0x62c0b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
      this.extraGlow = shine;
      // And every one of them holds a little of its colour against the dark.
      for (const o of this.props.group.children) {
        const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
        if (o.name === 'tree-shroom' && m?.emissive) m.emissive.set(0x1b5a66);
        if (o.name === 'mushrooms' && m?.emissive) m.emissive.set(0x35633a);
      }
      let i = 0;
      for (const t of things) {
        if (t.id !== 'tree-shroom' || i++ % 2) continue;
        const s = new THREE.Sprite(shine);
        const tall = 8 * (t.scale ?? 1);
        s.position.set(t.x, this.field.heightAt(t.x, t.z) + tall * 0.7, t.z);
        s.scale.setScalar(tall * 0.9);
        s.renderOrder = 2;
        this.group.add(s);
        this.glows.push(s);
      }
    }
  }

  /** Dress the island for a season: the leaves, the grass and the light. */
  setSeason(season: Season): void {
    const look = SEASON_LOOK[season];
    this.props.tint(look.leaves, look.rime, look.lying);
    (this.terrain.userData.grass as { value: THREE.Color }).value.set(look.grass).multiply(new THREE.Color(BIOME.grass ?? '#ffffff'));
    (this.terrain.userData.frost as { value: number }).value = look.frost;
    this.air.sun.set(look.sun);
    this.air.fill.set(look.fill);
  }

  /** Where the trawler is, out at sea. */
  get trawler(): THREE.Vector3 {
    return this.life.boat.position;
  }

  /** The air: fog and storm are eased toward what the weather is; lightning comes and goes by itself in a storm. */
  readonly air: Air = { fog: 0, storm: 0, flash: 0, sun: new THREE.Color(0xffffff), fill: new THREE.Color(0xffffff) };
  private strikeIn = 6;
  private tintDeep = new THREE.Color(BIOME.water?.deep ?? '#ffffff');
  private tintShallow = new THREE.Color(BIOME.water?.shallow ?? '#ffffff');
  /** Glowmere's water, woken by the beacons: 0 asleep, 1 awake. Eased toward `woken`. */
  woken = 0;
  private wake = 0;
  private static AWAKE = new THREE.Color('#7fe0c4');
  private aired = 0;
  /** Called when lightning strikes, for the thunder. */
  onLightning: (() => void) | null = null;

  update(dt: number, hour: number, rain: number, focus: THREE.Vector3, weather: Weather = 'clear'): void {
    // The first frames take the weather as it is; after that it comes and goes slowly.
    const ease = this.aired++ < 3 ? 1 : 1 - Math.exp(-dt * 0.5);
    // (Some islands are never clear: the mist there is the least the fog can be.)
    this.air.fog += (Math.max(weather === 'fog' ? 1 : 0, BIOME.mist ?? 0) - this.air.fog) * ease;
    this.air.storm += ((weather === 'storm' ? 1 : 0) - this.air.storm) * ease;
    this.air.flash = Math.max(0, this.air.flash - dt * 5);
    if (this.air.storm > 0.6) {
      this.strikeIn -= dt;
      if (this.strikeIn <= 0) {
        this.strikeIn = 5 + Math.random() * 11;
        this.air.flash = 1;
        this.onLightning?.();
      }
    }
    const look = this.sky.update(dt, hour, rain, focus, this.air);
    const night0 = this.sky.palette.night;
    this.props.blow(dt * (1 + rain * 0.8), this.lofi ? 6 : 0);
    (this.terrain.userData.wet as { value: number }).value = rain;
    // An island's water has its own colour, whatever the hour gives it.
    if (BIOME.water) {
      look.deep = look.deep.clone().lerp(this.tintDeep, BIOME.water.by);
      look.shallow = look.shallow.clone().lerp(this.tintShallow, BIOME.water.by * (1 - night0 * 0.35));
    }
    // Woken, the shallows give off light of their own, and the deep takes a little of it.
    this.wake += (this.woken - this.wake) * Math.min(1, dt * 0.8);
    if (this.wake > 0.01) {
      look.shallow = look.shallow.clone().lerp(World.AWAKE, this.wake * 0.7);
      look.deep = look.deep.clone().lerp(World.AWAKE, this.wake * 0.16);
    }
    this.water.update(dt, look, rain);
    (this.terrain.userData.surf as { value: number }).value = this.water.clock;
    const night = this.sky.palette.night;
    this.life.update(dt, night, rain, focus);
    const on = Math.min(1, night * 1.2 + rain * 0.4);
    this.glowMat.opacity = on;
    if (this.extraGlow) this.extraGlow.opacity = on * 0.75;
    for (const g of this.glows) g.visible = on > 0.02;
    // A fire's light jumps about, a few times a second.
    this.clock += dt;
    for (const move of this.moving) move(this.clock);
    const jump = 0.8 + 0.2 * Math.abs(Math.sin(Math.floor(this.clock * 7) * 12.9898) * 43758.5453 % 1);
    for (const l of this.lamps) l.light.intensity = l.strength * on * (l.flickers ? jump : 1);
    // Flames lean and stretch on the same beat, each a little differently.
    const beat = Math.floor(this.clock * 7);
    for (const [i, f] of this.flames.entries()) {
      const k = Math.abs((Math.sin((beat + i * 3) * 12.9898) * 43758.5453) % 1);
      f.scale.set(1, 0.85 + k * 0.3, 1);
      f.rotation.z = (k - 0.5) * 0.25;
      f.rotation.y = beat * 1.3 + i;
    }
    if (this.beam) {
      this.beam.visible = night > 0.4;
      this.beam.rotation.y = this.clock * 0.45;
    }
  }
}

/** Lights kept ready for what the player sets down: campfires and strings of lights. */
const SPARE_LAMPS = 4;

/**
 * In the lo-fi look lamplight does not fade: it falls in three flat steps and stops, so a lamp
 * throws a hard-edged pool. three.js's own falloff is changed for everything it lights, once.
 */
function stepLamplight(): void {
  const chunk = THREE.ShaderChunk.lights_pars_begin;
  if (chunk.includes('LOFI_LAMPS')) return;
  THREE.ShaderChunk.lights_pars_begin = chunk.replace(
    'return distanceFalloff;',
    `// LOFI_LAMPS
	float reach = cutoffDistance > 0.0 ? lightDistance / cutoffDistance : 2.0;
	return reach < 0.42 ? 1.0 : ( reach < 0.72 ? 0.5 : ( reach < 1.0 ? 0.18 : 0.0 ) );`,
  );
}

/** A glow in hard steps: a pale middle, a warm ring and a dim one, sixteen pixels across. */
function pixelGlow(): THREE.Texture {
  const n = 16;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const [r, g, b, a] = d < 0.3 ? [255, 244, 210, 255] : d < 0.62 ? [255, 208, 138, 150] : d < 1 ? [255, 180, 96, 60] : [0, 0, 0, 0];
      data.set([r, g, b, a], (y * n + x) * 4);
    }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

/** A soft round glow, drawn once. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,210,140,0.7)');
  grad.addColorStop(1, 'rgba(255,180,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
