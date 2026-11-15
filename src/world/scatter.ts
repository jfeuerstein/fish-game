// Where the trees, bushes, flowers and rocks grow: scattered from a seed, kept off paths,
// water, buildings and anywhere people gather. Pure.
import { fbm, rng } from '../core/rng';
import { Heightfield, pathDistance, waterAt } from './island';
import { HOME } from './isle';
import { KETTLE } from './kettle';
import { BRIDGE, CAMP, CHALK, CREEK, CREEK_WIDTH, PIER, PLACED, PLAZA, POND, type Placed, bridgeLocal, nearestOnLine } from './layout';

/** Places kept clear of anything growing, as circles. */
function clearings(): { x: number; z: number; r: number }[] {
  const out = [
    { x: PLAZA.x, z: PLAZA.z, r: PLAZA.r + 5 },
    { x: CAMP.x, z: CAMP.z, r: 10 },
    { x: CHALK.x, z: CHALK.z, r: CHALK.size },
    { x: 0, z: 0, r: 9 },
  ];
  for (const p of PLACED) {
    const big = p.id === 'shop' || p.id === 'lighthouse' || p.id === 'fishing-hut' || p.id === 'arcade' ? 9 : p.id === 'cliff' ? 6 : 3;
    if (!p.id.startsWith('tree')) out.push({ x: p.x, z: p.z, r: big });
  }
  return out;
}

/** The bridge's deck and the banks at its ends, with a margin: nothing grows through the planks. */
export function onBridge(x: number, z: number): boolean {
  const { along, across } = bridgeLocal(x, z);
  return Math.abs(along) < BRIDGE.halfLen + 2.5 && Math.abs(across) < BRIDGE.halfWidth + 1;
}

export interface GrowRule {
  id: string;
  count: number;
  /** Smallest and largest scale. */
  scale: [number, number];
  /** Whether a spot suits it. */
  fits: (s: Spot) => boolean;
  /** Metres to keep from others of any kind that keep distance. */
  space: number;
  /** How many tries per thing wanted (rare spots need more). */
  tries?: number;
}

export interface Spot {
  x: number;
  z: number;
  h: number;
  slope: number;
  path: number;
  /** Forest density, -1 to 1. */
  wood: number;
  /** Distance to the nearest water's edge (roughly), metres; 0 in water. */
  shore: number;
}

export function spotAt(field: Heightfield, x: number, z: number): Spot {
  const h = field.heightAt(x, z);
  const pondD = Math.hypot(x - POND.x, z - POND.z) - POND.r;
  const creekD = nearestOnLine(CREEK, x, z).d - CREEK_WIDTH;
  const sea = h < 0 ? 0 : h * 4;
  return { x, z, h, slope: field.slopeAt(x, z), path: pathDistance(x, z), wood: fbm(x * 0.03 + 3, z * 0.03 - 7, 3, 21) + (z < -20 ? 0.25 : 0) + (x < -30 ? 0.15 : 0), shore: Math.max(0, Math.min(pondD, creekD, sea)) };
}

const dry = (s: Spot): boolean => s.h > 1.0 && s.shore > 1.5;

const COVE_RULES: GrowRule[] = [
  { id: 'tree-pine', count: 150, scale: [0.75, 1.25], space: 3.2, fits: (s) => dry(s) && s.wood > 0.05 && s.slope < 0.9 && s.path > 3 && s.shore > 3 },
  { id: 'tree-round', count: 55, scale: [0.75, 1.15], space: 4, fits: (s) => dry(s) && s.wood > -0.25 && s.wood < 0.25 && s.slope < 0.6 && s.path > 3.5 && s.shore > 3 },
  { id: 'tree-birch', count: 50, scale: [0.75, 1.2], space: 3, fits: (s) => dry(s) && s.wood > -0.15 && s.slope < 0.7 && s.path > 3 && s.shore > 2 },
  { id: 'bush', count: 110, scale: [0.7, 1.3], space: 1.6, fits: (s) => dry(s) && s.path > 2 && s.slope < 0.7 },
  { id: 'rock-a', count: 40, scale: [0.6, 1.4], space: 3, fits: (s) => s.h > 0.6 && s.path > 2.5 && (s.slope > 0.35 || s.h < 1.6) },
  { id: 'rock-b', count: 45, scale: [0.6, 1.3], space: 2, fits: (s) => s.h > -0.4 && s.path > 2 && (s.slope > 0.3 || s.h < 1.4) },
  { id: 'log', count: 10, scale: [0.9, 1.2], space: 3, fits: (s) => dry(s) && s.wood > 0.1 && s.path > 2.5 && s.slope < 0.4 },
  { id: 'mushrooms', count: 30, scale: [0.8, 1.3], space: 1, fits: (s) => dry(s) && s.wood > 0.2 && s.path > 1.8 },
];

/** Kettle Isle is wilder: more of everything, palms along the low shores, and nothing but rock inside the crater. */
const outOfCrater = (s: Spot): boolean => Math.hypot(s.x - KETTLE.x, s.z - KETTLE.z) > KETTLE.rim + 1;
const KETTLE_RULES: GrowRule[] = [
  { id: 'tree-pine', count: 210, scale: [0.75, 1.3], space: 3.2, fits: (s) => dry(s) && outOfCrater(s) && s.h > 3.2 && s.wood > -0.1 && s.slope < 0.9 && s.path > 3 && s.shore > 3 },
  { id: 'tree-round', count: 60, scale: [0.75, 1.15], space: 4, fits: (s) => dry(s) && outOfCrater(s) && s.h < 5 && s.wood > -0.3 && s.wood < 0.3 && s.slope < 0.5 && s.path > 3.5 && s.shore > 3 },
  { id: 'tree-palm', count: 46, scale: [0.8, 1.25], space: 4.5, tries: 200, fits: (s) => s.h > 1.0 && s.h < 2.7 && s.slope < 0.35 && s.path > 3 && s.shore > 2 },
  { id: 'tree-birch', count: 30, scale: [0.75, 1.2], space: 3, fits: (s) => dry(s) && outOfCrater(s) && s.wood > 0 && s.slope < 0.7 && s.path > 3 && s.shore > 2 },
  { id: 'bush', count: 140, scale: [0.7, 1.3], space: 1.6, fits: (s) => dry(s) && s.path > 2 && s.slope < 0.7 },
  { id: 'rock-a', count: 60, scale: [0.6, 1.5], space: 3, fits: (s) => s.h > 0.6 && s.path > 2.5 && (s.slope > 0.35 || s.h < 1.6) },
  { id: 'rock-b', count: 70, scale: [0.6, 1.3], space: 2, fits: (s) => s.h > -0.4 && s.path > 2 && (s.slope > 0.3 || s.h < 1.4) },
  { id: 'log', count: 14, scale: [0.9, 1.2], space: 3, fits: (s) => dry(s) && outOfCrater(s) && s.wood > 0.1 && s.path > 2.5 && s.slope < 0.4 },
  { id: 'mushrooms', count: 30, scale: [0.8, 1.3], space: 1, fits: (s) => dry(s) && s.wood > 0.2 && s.path > 1.8 },
];
export const RULES: GrowRule[] = HOME ? COVE_RULES : KETTLE_RULES;

/** Little things that do not get in anyone's way. */
export const FLOWER_RULES: GrowRule[] = [
  { id: 'flowers', count: 220, scale: [0.8, 1.4], space: 0.8, fits: (s) => dry(s) && s.path > 1.6 && s.slope < 0.5 && s.wood < 0.3 },
  { id: 'grass-tuft', count: 380, scale: [0.8, 1.5], space: 0.6, fits: (s) => s.h > 0.9 && s.path > 1.5 && s.slope < 0.7 },
  { id: 'cattails', count: 46, scale: [0.8, 1.3], space: 1, tries: 900, fits: (s) => s.shore < 2 && s.h > 0.5 && s.path > 1.5 },
];

/** Scatter every rule over the island. The same seed always gives the same island. */
export function scatter(field: Heightfield, rules: GrowRule[] = RULES, seed = 1): Placed[] {
  const r = rng(seed);
  const clear = clearings();
  const out: Placed[] = [];
  const taken: { x: number; z: number; r: number }[] = [];
  const pierClear = (x: number, z: number): boolean => !(x > PIER.x0 - 4 && x < PIER.x1 + 4 && z > PIER.head.z0 - 4 && z < PIER.head.z1 + 4);
  for (const rule of rules) {
    let placed = 0;
    for (let tries = 0; tries < rule.count * (rule.tries ?? 40) && placed < rule.count; tries++) {
      const x = (r() - 0.5) * field.half * 1.9;
      const z = (r() - 0.5) * field.half * 1.9;
      if (!pierClear(x, z)) continue;
      if (onBridge(x, z)) continue;
      if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
      const s = spotAt(field, x, z);
      if (!rule.fits(s) || waterAt(field, x, z)) continue;
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < Math.max(t.r, rule.space))) continue;
      const scale = rule.scale[0] + r() * (rule.scale[1] - rule.scale[0]);
      out.push({ id: rule.id, x, z, yaw: r() * Math.PI * 2, scale });
      taken.push({ x, z, r: rule.space });
      placed++;
    }
  }
  return out;
}

/** Lily pads, floating on the pond. */
export function lilypads(seed = 3): Placed[] {
  const r = rng(seed);
  const out: Placed[] = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = POND.r * (0.45 + r() * 0.45);
    out.push({ id: 'lilypad', x: POND.x + Math.cos(a) * d, z: POND.z + Math.sin(a) * d, yaw: r() * 6.28, scale: 0.8 + r() * 0.6, y: POND.level + 0.02 });
  }
  return out;
}

/** Coral on Kettle Isle's reef flat: clumps standing on the bottom where the water is shallow, some breaking the surface. */
export function corals(field: Heightfield, seed = 5): Placed[] {
  if (HOME) return [];
  const r = rng(seed);
  const out: Placed[] = [];
  for (let tries = 0; out.length < 46 && tries < 6000; tries++) {
    const x = (r() - 0.5) * field.half * 1.9;
    const z = (r() - 0.5) * field.half * 1.9;
    const w = waterAt(field, x, z);
    if (!w || w.zone !== 'reef' || w.depth < 0.35 || w.depth > 1.3) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 4)) continue;
    out.push({ id: 'coral', x, z, yaw: r() * Math.PI * 2, scale: 0.8 + r() * 0.9, y: field.heightAt(x, z) - 0.05 });
  }
  return out;
}
