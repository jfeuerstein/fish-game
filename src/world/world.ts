// Puts the island together: ground, water, sky, everything standing on it, and what is solid.
import * as THREE from 'three';
import { rng } from '../core/rng';
import { Colliders } from './colliders';
import { Heightfield } from './island';
import { PLACED, pierSections, railPosts } from './layout';
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

  constructor(readonly scene: THREE.Scene, shadows: boolean) {
    this.sky = new Sky(scene, shadows);
    this.water = new Water(this.field);
    this.props = new Props(this.field, this.solid);
    this.group.add(buildTerrain(this.field), this.water.group, this.props.group, this.sky.group);
    scene.add(this.group);
    // The bridge's rails are solid, so nobody walks off the side of it into the creek.
    for (const p of railPosts()) this.solid.addCircle({ x: p.x, z: p.z, r: 0.22 });
    this.glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd48a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
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
    for (const p of this.props.glows) this.addGlow(p, 1.6);
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
    this.glowMat.opacity = Math.min(1, night * 1.2 + rain * 0.4);
    for (const g of this.glows) g.visible = this.glowMat.opacity > 0.02;
  }
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
