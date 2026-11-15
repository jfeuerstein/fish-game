// Puts the island together: ground, water, sky, everything standing on it, and what is solid.
import * as THREE from 'three';
import { rng } from '../core/rng';
import type { Look } from '../look/look';
import { Colliders } from './colliders';
import { Heightfield } from './island';
import { PLACED, type Placed, pierSections, railPosts } from './layout';
import { Props } from './props';
import { FLOWER_RULES, RULES, lilypads, scatter } from './scatter';
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
  /** What is lit after dark: lamps, the fire, the shop's counter, the lighthouse. */
  private lamps: { light: THREE.PointLight; strength: number; flickers: boolean }[] = [];
  private beam: THREE.Object3D | null = null;
  private clock = 0;

  constructor(readonly scene: THREE.Scene, shadows: boolean, look?: Look) {
    if (look?.lofi) stepLamplight();
    this.sky = new Sky(scene, shadows, look);
    this.water = new Water(this.field, look);
    this.props = new Props(this.field, this.solid);
    this.group.add(buildTerrain(this.field, look), this.water.group, this.props.group, this.sky.group);
    scene.add(this.group);
    // The bridge's rails are solid, so nobody walks off the side of it into the creek.
    for (const p of railPosts()) this.solid.addCircle({ x: p.x, z: p.z, r: 0.22 });
    this.glowMat = new THREE.SpriteMaterial({ map: look?.lofi ? pixelGlow() : glowTexture(), color: 0xffd48a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  }

  /** Everything that has to be loaded. `progress` is called as each kind of thing arrives. */
  async populate(progress: (done: number, of: number) => void, models: boolean): Promise<void> {
    if (!models) return;
    const things = [...PLACED, ...pierSections(), ...scatter(this.field, RULES, 1), ...scatter(this.field, FLOWER_RULES, 2), ...lilypads()];
    const kinds = new Set(things.map((t) => t.id)).size + 1;
    let done = 0;
    const tick = (): void => progress(++done, kinds);
    await this.props.add(things, tick);
    // Clouds drifting over.
    const r = rng(44);
    const { model } = await import('../assets/models');
    const proto = await model('cloud');
    tick();
    if (proto) {
      for (let i = 0; i < 14; i++) {
        const c = proto.clone(true);
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = false;
            m.receiveShadow = false;
            m.material = new THREE.MeshBasicMaterial({ color: 0xffffff, map: (m.material as THREE.MeshLambertMaterial).map, fog: false });
          }
        });
        c.scale.setScalar(2.5 + r() * 3);
        c.position.set((r() - 0.5) * 680, 70 + r() * 50, (r() - 0.5) * 500);
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

  update(dt: number, hour: number, rain: number, focus: THREE.Vector3): void {
    const look = this.sky.update(dt, hour, rain, focus);
    this.water.update(dt, look, rain);
    const night = this.sky.palette.night;
    const on = Math.min(1, night * 1.2 + rain * 0.4);
    this.glowMat.opacity = on;
    for (const g of this.glows) g.visible = on > 0.02;
    // A fire's light jumps about, a few times a second.
    this.clock += dt;
    const jump = 0.8 + 0.2 * Math.abs(Math.sin(Math.floor(this.clock * 7) * 12.9898) * 43758.5453 % 1);
    for (const l of this.lamps) l.light.intensity = l.strength * on * (l.flickers ? jump : 1);
    if (this.beam) {
      this.beam.visible = night > 0.4;
      this.beam.rotation.y = this.clock * 0.45;
    }
  }
}

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
