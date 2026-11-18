// Little effects: water splashing up, rings spreading on the water, sparkles round a special
// catch, a puff of dust where feet land, footprints in the sand, and the rain with the marks it
// makes where it lands. Each is one mesh, reused, and nothing is smooth: drops are faceted
// lumps, rain is short thick streaks, and a print is a few of the ground's own pixels.
import * as THREE from 'three';

interface Drop {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  colour: THREE.Color;
  /** How hard it falls (water drops fall; dust hangs). */
  fall: number;
}

const MAX = 220;
/** Streaks of rain in the box round the camera, and marks where it lands. */
const STREAKS = 520;
const MARKS = 120;
/** The box of rain: how wide and how tall, metres. It is kept round whoever the camera is watching. */
/** A snowflake is five numbers; and how fast one falls, slowest and fastest, metres a second (rain falls at fourteen). */
const FLAKE = 5;
const SNOW_FALL: [number, number] = [1.1, 2.1];
const RAIN_WIDE = 26;
const RAIN_TALL = 18;
/** Footprints kept on the sand, and how long each stays, seconds. */
const PRINTS = 40;
const PRINT_STAYS = 30;
/** The ground's pixels are this many to the metre (terrain.ts): prints are laid on the same grid. */
const GRID = 16;

export class Effects {
  readonly group = new THREE.Group();
  private drops: Drop[] = [];
  private dropMesh: THREE.InstancedMesh;
  private rings: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = [];
  private ringGeo = new THREE.RingGeometry(0.82, 1, 32).rotateX(-Math.PI / 2);
  private rain: THREE.InstancedMesh;
  private rainOn = 0;
  private snowing = false;
  private snow: THREE.InstancedMesh;
  /** Every flake: where it began in its box, how fast it falls, and where in its sway it is. */
  private flakes = new Float32Array(STREAKS * FLAKE);
  private snowClock = 0;
  private marks: THREE.InstancedMesh;
  private markAt: { x: number; y: number; z: number; born: number }[] = [];
  private markNext = 0;
  private markDue = 0;
  private prints: THREE.InstancedMesh;
  private printBorn: number[] = new Array(PRINTS).fill(-Infinity);
  private printNext = 0;
  private clock = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private none = new THREE.Matrix4().makeScale(0, 0, 0);
  private up = new THREE.Vector3(0, 1, 0);
  /** How high the ground (or the water over it) is at a place: where rain lands. Set by the game. */
  ground: ((x: number, z: number) => number) | null = null;

  constructor() {
    this.dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropMesh.count = 0;
    this.dropMesh.frustumCulled = false;
    this.group.add(this.dropMesh);
    // Rain: short thick streaks in a box that follows the camera. How hard it rains is how many are drawn.
    this.rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xc6e4f4 }), STREAKS);
    for (let i = 0; i < STREAKS; i++) {
      this.m.makeTranslation((Math.random() - 0.5) * RAIN_WIDE, Math.random() * RAIN_TALL, (Math.random() - 0.5) * RAIN_WIDE);
      this.rain.setMatrixAt(i, this.m);
    }
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.group.add(this.rain);
    // Snow: square flakes in a box of the same size, each falling slowly at its own pace and drifting from side to side.
    this.snow = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshBasicMaterial({ color: 0xfffdf6 }), STREAKS);
    this.snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < STREAKS; i++) {
      this.flakes[i * FLAKE] = Math.random() * RAIN_WIDE;
      this.flakes[i * FLAKE + 1] = Math.random() * RAIN_TALL;
      this.flakes[i * FLAKE + 2] = Math.random() * RAIN_WIDE;
      this.flakes[i * FLAKE + 3] = SNOW_FALL[0] + Math.random() * (SNOW_FALL[1] - SNOW_FALL[0]);
      this.flakes[i * FLAKE + 4] = Math.random() * Math.PI * 2;
      this.snow.setMatrixAt(i, this.none);
    }
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.group.add(this.snow);
    // Where a drop lands: a pale pixel on the ground that widens once and goes.
    this.marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc6e4f4 }), MARKS);
    this.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MARKS; i++) {
      this.marks.setMatrixAt(i, this.none);
      this.markAt.push({ x: 0, y: 0, z: 0, born: -Infinity });
    }
    this.marks.frustumCulled = false;
    this.group.add(this.marks);
    // Footprints: a darker patch of sand the shape of a foot, on the ground's own grid.
    // Lit smoothly, as the ground under it is (not in the look's steps), so that a print is a
    // tone darker than the sand round it at any hour.
    const paper = new THREE.MeshLambertMaterial({ color: 0xc8963e, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(3 / GRID, 4 / GRID).rotateX(-Math.PI / 2), paper, PRINTS);
    for (let i = 0; i < PRINTS; i++) this.prints.setMatrixAt(i, this.none);
    this.prints.frustumCulled = false;
    this.group.add(this.prints);
  }

  /** Water thrown up at a point. */
  splash(at: THREE.Vector3, amount = 1, colour = 0xffffff): void {
    const c = new THREE.Color(colour);
    const n = Math.round(10 + 16 * amount);
    for (let i = 0; i < n && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.6 + Math.random() * 1.6) * (0.6 + amount * 0.6);
      this.drops.push({ pos: at.clone(), vel: new THREE.Vector3(Math.cos(a) * s * 0.6, 2 + Math.random() * 2.5 * amount, Math.sin(a) * s * 0.6), life: 0, max: 0.5 + Math.random() * 0.4, size: 0.04 + Math.random() * 0.05 * amount, colour: c, fall: 9 });
    }
    this.ring(at, 0.8 + amount);
  }

  /** Sparkles rising round a special catch. */
  sparkle(at: THREE.Vector3, golden: boolean): void {
    const c = new THREE.Color(golden ? 0xffd34a : 0xbfe6ff);
    for (let i = 0; i < 30 && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      this.drops.push({ pos: at.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.6, Math.sin(a) * r)), vel: new THREE.Vector3(0, 0.6 + Math.random(), 0), life: 0, max: 1 + Math.random() * 0.6, size: 0.03 + Math.random() * 0.04, colour: c, fall: 9 });
    }
  }

  /** Dust kicked out along the ground where feet come down: a few pale lumps that drift and go. */
  puff(at: THREE.Vector3, amount = 1): void {
    const c = new THREE.Color(0xd6cbb2);
    const n = Math.round(5 + 5 * amount);
    for (let i = 0; i < n && this.drops.length < MAX; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = 0.9 + Math.random() * 0.8 * amount;
      this.drops.push({ pos: at.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15)), vel: new THREE.Vector3(Math.cos(a) * s, 0.35 + Math.random() * 0.3, Math.sin(a) * s), life: 0, max: 0.35 + Math.random() * 0.25, size: 0.07 + Math.random() * 0.05 * amount, colour: c, fall: 1.2 });
    }
  }

  /**
   * A footprint left in sand at a place, by someone facing `yaw`. It lies on the ground as the
   * ground slopes (`ground` set), or it would be half buried on a beach. The oldest gives way
   * to the newest.
   */
  print(x: number, y: number, z: number, yaw: number): void {
    const i = this.printNext;
    this.printNext = (i + 1) % PRINTS;
    this.q.setFromAxisAngle(this.up, yaw);
    if (this.ground) {
      const d = 0.2;
      const tilt = new THREE.Vector3(this.ground(x - d, z) - this.ground(x + d, z), 2 * d, this.ground(x, z - d) - this.ground(x, z + d)).normalize();
      this.q.premultiply(new THREE.Quaternion().setFromUnitVectors(this.up, tilt));
    }
    this.m.compose(new THREE.Vector3(Math.round(x * GRID) / GRID, y + 0.02, Math.round(z * GRID) / GRID), this.q, new THREE.Vector3(1, 1, 1));
    this.prints.setMatrixAt(i, this.m);
    this.prints.instanceMatrix.needsUpdate = true;
    this.printBorn[i] = this.clock;
  }

  /** A ring spreading on the water. */
  ring(at: THREE.Vector3, size = 1): void {
    const mesh = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    mesh.position.copy(at);
    mesh.position.y += 0.03;
    mesh.renderOrder = 3;
    this.group.add(mesh);
    this.rings.push({ mesh, life: 0, max: 1.1, size });
  }

  /** How hard it is coming down, and whether it comes down as snow. */
  setRain(amount: number, snow = false): void {
    this.rainOn = amount;
    this.snowing = snow;
  }

  /** `focus` is what the camera is looking at (the player): rain is seen to land round there. */
  update(dt: number, camera: THREE.Camera, focus?: THREE.Vector3): void {
    this.clock += dt;
    let n = 0;
    this.drops = this.drops.filter((d) => (d.life += dt) < d.max);
    for (const d of this.drops) {
      d.vel.y -= d.fall * dt;
      d.pos.addScaledVector(d.vel, dt);
      const s = d.size * (1 - d.life / d.max);
      this.m.compose(d.pos, this.q.identity(), new THREE.Vector3(s, s, s));
      this.dropMesh.setMatrixAt(n, this.m);
      this.dropMesh.setColorAt(n, d.colour);
      n++;
    }
    this.dropMesh.count = n;
    this.dropMesh.instanceMatrix.needsUpdate = true;
    if (this.dropMesh.instanceColor) this.dropMesh.instanceColor.needsUpdate = true;
    this.rings = this.rings.filter((r) => {
      r.life += dt;
      const k = r.life / r.max;
      r.mesh.scale.setScalar(0.2 + k * r.size);
      // Fades in three steps, not smoothly.
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (Math.ceil((1 - k) * 3) / 3) * 0.8;
      if (k >= 1) {
        this.group.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });
    // Old footprints go.
    let gone = false;
    for (let i = 0; i < PRINTS; i++) {
      if (this.printBorn[i] > -Infinity && this.clock - this.printBorn[i] > PRINT_STAYS) {
        this.prints.setMatrixAt(i, this.none);
        this.printBorn[i] = -Infinity;
        gone = true;
      }
    }
    if (gone) this.prints.instanceMatrix.needsUpdate = true;
    this.snow.visible = this.snowing && this.rainOn > 0.05;
    if (this.snow.visible) {
      // Each flake is where it is in the world, and falls there: the box that holds them goes
      // with whoever is watched, and a flake that leaves it by one side comes in at the other,
      // out at the edge where it is not seen. (The whole box once slid down a little way and
      // jumped back, about once a second, and jumped two metres whenever the player had walked
      // two: at rain's speed that is a blur, and at snow's the owner saw every jump.)
      this.snow.count = Math.round(STREAKS * Math.min(1, this.rainOn));
      const p = focus ?? camera.position;
      this.snowClock += dt;
      const t = this.snowClock;
      const foot = p.y - 3;
      const within = (v: number, size: number): number => ((v % size) + size) % size;
      for (let i = 0; i < this.snow.count; i++) {
        const o = i * FLAKE;
        const sway = Math.sin(t * 0.9 + this.flakes[o + 4]) * 0.4;
        const x = p.x - RAIN_WIDE / 2 + within(this.flakes[o] + sway - p.x, RAIN_WIDE);
        const y = foot + within(this.flakes[o + 1] - this.flakes[o + 3] * t - foot, RAIN_TALL);
        const z = p.z - RAIN_WIDE / 2 + within(this.flakes[o + 2] + Math.cos(t * 0.7 + this.flakes[o + 4]) * 0.3 - p.z, RAIN_WIDE);
        this.snow.setMatrixAt(i, this.m.makeTranslation(x, y, z));
      }
      this.snow.instanceMatrix.needsUpdate = true;
    }
    this.rain.visible = !this.snowing && this.rainOn > 0.05;
    if (this.rain.visible) {
      this.rain.count = Math.round(STREAKS * Math.min(1, this.rainOn));
      const p = focus ?? camera.position;
      // Falling: the box slides down and wraps.
      this.rain.position.set(Math.round(p.x / 2) * 2, p.y - 3 - ((performance.now() / 1000) * 14) % 1.4, Math.round(p.z / 2) * 2);
    }
    this.land(dt, focus);
  }

  /** Rain landing: new marks round the focus while it rains, each a small pixel, then a wider one, then gone. */
  private land(dt: number, focus?: THREE.Vector3): void {
    const LIFE = 0.22;
    if (focus && this.ground && this.rainOn > 0.05 && !this.snowing) {
      this.markDue += dt * 260 * this.rainOn;
      while (this.markDue >= 1) {
        this.markDue -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 11;
        const x = Math.round((focus.x + Math.cos(a) * r) * 8) / 8;
        const z = Math.round((focus.z + Math.sin(a) * r) * 8) / 8;
        const at = this.markAt[this.markNext];
        this.markNext = (this.markNext + 1) % MARKS;
        at.x = x;
        at.z = z;
        at.y = this.ground(x, z) + 0.03;
        at.born = this.clock;
      }
    }
    for (let i = 0; i < MARKS; i++) {
      const at = this.markAt[i];
      const age = this.clock - at.born;
      if (age > LIFE) {
        if (at.born > -Infinity) {
          this.marks.setMatrixAt(i, this.none);
          at.born = -Infinity;
        }
        continue;
      }
      const s = age < LIFE / 2 ? 0.0625 : 0.125;
      this.m.compose(new THREE.Vector3(at.x, at.y, at.z), this.q.identity(), new THREE.Vector3(s, 1, s));
      this.marks.setMatrixAt(i, this.m);
    }
    this.marks.instanceMatrix.needsUpdate = true;
  }
}
