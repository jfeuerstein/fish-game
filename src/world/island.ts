// The island's ground: a height for every point, the water over it, and what kind of water a
// bobber lands in. Pure, no three.js, so it runs under Vitest.
import { clamp, fbm, smoothstep } from '../core/rng';
import { BEACH_ANGLE, CREEK, CREEK_WIDTH, HILL, PATHS, PATH_WIDTH, PLAZA, POND, STEP, WORLD_SIZE, creekLevel, floorAt, nearestOnLine } from './layout';

/** Distance from the centre to the shore at an angle (radians, atan2(z, x)). */
export function shoreRadius(angle: number): number {
  return 62 + 6 * Math.sin(2 * angle + 0.6) + 4 * Math.sin(3 * angle - 1.1) + 3.5 * fbm(Math.cos(angle) * 2.2 + 5, Math.sin(angle) * 2.2 + 5, 3, 11);
}

/** How cliff-like the coast is at an angle: the north shore drops away steeply. */
function cliffiness(angle: number): number {
  // North is -z, which is angle -pi/2.
  const d = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
  return smoothstep(1.1, 0.3, d);
}

/** How beach-like it is: the south shore slopes gently into the sea. */
function beachiness(angle: number): number {
  const d = Math.abs(Math.atan2(Math.sin(angle - BEACH_ANGLE), Math.cos(angle - BEACH_ANGLE)));
  return smoothstep(0.9, 0.2, d);
}

/** The ground's height before it is sampled onto a grid. */
export function rawHeight(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const d = Math.hypot(x, z);
  const inland = shoreRadius(angle) - d;
  const cliff = cliffiness(angle);
  const beach = beachiness(angle);
  let h: number;
  if (inland >= 0) {
    const rise = 4 + 14 * beach - 3 * cliff;
    h = 0.35 + (1.9 + 1.6 * cliff) * smoothstep(0, rise, inland) + 0.35 * fbm(x * 0.05, z * 0.05, 3, 3) * smoothstep(0, 10, inland);
    // The lighthouse hill, flat on top.
    const hd = Math.hypot(x - HILL.x, z - HILL.z);
    h += HILL.h * smoothstep(HILL.r, HILL.r * 0.22, hd);
    // A softer rise in the west woods.
    h += 2.4 * smoothstep(26, 4, Math.hypot(x + 40, z + 2));
    // The ground rises round the pond so the pond sits above the sea.
    h += 1.4 * smoothstep(POND.r + 16, POND.r, Math.hypot(x - POND.x, z - POND.z));
  } else {
    const out = -inland;
    const drop = 7 - 4 * cliff + 10 * beach;
    h = 0.35 - 3.2 * smoothstep(0, drop, out) - 10 * smoothstep(drop * 0.6, drop + 34, out);
  }
  // The square, levelled.
  const pd = Math.hypot(x - PLAZA.x, z - PLAZA.z);
  h += (PLAZA.h - h) * smoothstep(PLAZA.r + 7, PLAZA.r, pd);
  // The pond's hollow.
  const pondD = Math.hypot(x - POND.x, z - POND.z);
  if (pondD < POND.r + 3) {
    const bed = POND.level - 2.4 * (1 - Math.pow(Math.min(1, pondD / POND.r), 2)) - 0.3;
    const bank = POND.level + 0.5;
    const target = pondD < POND.r ? bed : bed + (bank - bed) * smoothstep(POND.r, POND.r + 3, pondD);
    h = Math.min(h, target);
  }
  // The creek's channel.
  const c = nearestOnLine(CREEK, x, z);
  if (c.d < CREEK_WIDTH * 2.6) {
    const level = creekLevel(c.t);
    const bed = level - 0.9;
    const bank = level + 0.5;
    const target = c.d < CREEK_WIDTH ? bed + 0.4 * (c.d / CREEK_WIDTH) : bed + 0.4 + (bank - bed - 0.4) * smoothstep(CREEK_WIDTH, CREEK_WIDTH * 2.6, c.d);
    h = Math.min(h, target);
  }
  return h;
}

/**
 * The ground, sampled every STEP metres. `heightAt` reads it with the same triangle split as the
 * mesh that draws it, so the ground you see is the ground you stand on.
 */
export class Heightfield {
  readonly n: number;
  readonly half = WORLD_SIZE / 2;
  readonly heights: Float32Array;

  constructor(fn: (x: number, z: number) => number = rawHeight) {
    this.n = Math.round(WORLD_SIZE / STEP) + 1;
    this.heights = new Float32Array(this.n * this.n);
    for (let j = 0; j < this.n; j++)
      for (let i = 0; i < this.n; i++) this.heights[j * this.n + i] = fn(i * STEP - this.half, j * STEP - this.half);
  }

  sample(i: number, j: number): number {
    const n = this.n;
    return this.heights[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  }

  /** The height of the drawn ground. Each cell is split from its (0,0) corner to its (1,1) corner. */
  heightAt(x: number, z: number): number {
    const gx = (x + this.half) / STEP;
    const gz = (z + this.half) / STEP;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const fx = gx - i;
    const fz = gz - j;
    const h00 = this.sample(i, j);
    const h11 = this.sample(i + 1, j + 1);
    if (fx >= fz) {
      const h10 = this.sample(i + 1, j);
      return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
    }
    const h01 = this.sample(i, j + 1);
    return h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  }

  /** How steep the ground is: rise over run. */
  slopeAt(x: number, z: number): number {
    const e = STEP;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }
}

export type Zone = 'ocean' | 'deep' | 'pond' | 'creek';

/** The surface of whatever water is at a point, or null where it is dry. */
export function waterAt(field: Heightfield, x: number, z: number): { level: number; zone: Zone; depth: number } | null {
  const ground = field.heightAt(x, z);
  const pondD = Math.hypot(x - POND.x, z - POND.z);
  if (pondD < POND.r + 2 && ground < POND.level) return { level: POND.level, zone: 'pond', depth: POND.level - ground };
  const c = nearestOnLine(CREEK, x, z);
  if (c.d < CREEK_WIDTH * 1.6) {
    const level = creekLevel(c.t);
    // Where the creek meets the sea, the sea's level wins.
    if (level > 0.15 && ground < level) return { level, zone: 'creek', depth: level - ground };
  }
  if (ground < 0) return { level: 0, zone: ground < -5.5 ? 'deep' : 'ocean', depth: -ground };
  return null;
}

/** The kind of water a bobber has landed in, if it is deep enough to fish. */
export function fishingZone(field: Heightfield, x: number, z: number): Zone | null {
  const w = waterAt(field, x, z);
  return w && w.depth > 0.35 ? w.zone : null;
}

/** Where someone on foot stands: on the pier's boards, or on the ground. */
export function standHeight(field: Heightfield, x: number, z: number): number {
  const ground = field.heightAt(x, z);
  const floor = floorAt(x, z);
  return floor !== null && floor > ground ? floor : ground;
}

/** Whether someone on foot may stand here: dry ground, a floor, or water no deeper than the knees. */
export function walkable(field: Heightfield, x: number, z: number): boolean {
  if (floorAt(x, z) !== null) return true;
  if (Math.abs(x) > field.half - 2 || Math.abs(z) > field.half - 2) return false;
  const w = waterAt(field, x, z);
  return !w || w.depth < 0.45;
}

/** Whether a boat may float here. */
export function floatable(field: Heightfield, x: number, z: number): boolean {
  if (Math.abs(x) > field.half - 6 || Math.abs(z) > field.half - 6) return false;
  if (floorAt(x, z) !== null) return false;
  return field.heightAt(x, z) < -0.7;
}

/** How near the nearest footpath is, in metres. */
export function pathDistance(x: number, z: number): number {
  let best = Infinity;
  for (const line of PATHS) best = Math.min(best, nearestOnLine(line, x, z).d);
  return best;
}

export function onPath(x: number, z: number): boolean {
  return pathDistance(x, z) < PATH_WIDTH;
}
