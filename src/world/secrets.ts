// The island's secrets: sea glass tucked into nooks, mushrooms that bounce you high, and things
// buried in the ground for the metal detector (new each day). Pure.
import { rng } from '../core/rng';
import { Heightfield, onPath, waterAt, walkable } from './island';
import type { V2 } from './layout';

/** Where the twelve pieces of sea glass are hidden. Nothing points at them. */
export const SEA_GLASS: readonly V2[] = [
  [35, -43],
  [-43, -37],
  [-61, -26],
  [-47, 26],
  [-6, -51],
  [46, -30],
  [24, 50],
  [-22, 50],
  [-40, -4],
  [4, -28],
  [53, 24],
  [-57, 6],
];

export const GLASS_COLOURS = ['#7fd3c3', '#9cc8f0', '#b8e0a0', '#f0c9e0', '#f6dc8a', '#c3b6f0'];

/** Bounce mushrooms: where they grow, which way they throw you, and how hard. */
export interface Shroom {
  x: number;
  z: number;
  yaw: number;
  up: number;
  forward: number;
}
export const SHROOMS: readonly Shroom[] = [
  { x: 17, z: -8, yaw: Math.PI * 0.85, up: 14, forward: 6 },
  { x: -30, z: 12, yaw: -2.4, up: 12, forward: 7 },
  { x: 14, z: 38, yaw: 0.2, up: 12, forward: 8 },
];

/** Six things buried today, on dry ground off the paths. */
export function buriedToday(field: Heightfield, day: number): { x: number; z: number; key: string }[] {
  const r = rng(7919 + day * 104729);
  const out: { x: number; z: number; key: string }[] = [];
  for (let tries = 0; out.length < 6 && tries < 600; tries++) {
    const x = (r() - 0.5) * 150;
    const z = (r() - 0.5) * 130;
    const h = field.heightAt(x, z);
    if (h < 0.6 || h > 9 || waterAt(field, x, z) || !walkable(field, x, z) || onPath(x, z) || field.slopeAt(x, z) > 0.5) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 18)) continue;
    out.push({ x, z, key: `${day}:${out.length}` });
  }
  return out;
}

export type DigFind = { kind: 'coins'; coins: number; name: string } | { kind: 'token'; tokens: number; name: string } | { kind: 'hat'; id: string; name: string };

/** What comes up out of the ground. */
export function digUp(seed: number, level: number, hatsMissing: { id: string; name: string }[]): DigFind {
  const r = rng(seed);
  const x = r();
  if (x < 0.04 && hatsMissing.length) {
    const h = hatsMissing[Math.floor(r() * hatsMissing.length)];
    return { kind: 'hat', id: h.id, name: h.name };
  }
  if (x < 0.14) return { kind: 'token', tokens: 1, name: 'a shining pearl' };
  const finds: [string, number][] = [
    ['an old button', 15],
    ['a bottle cap', 10],
    ['an old coin', 40],
    ['a rusty ring', 70],
    ['a pocket watch', 160],
    ['a silver spoon', 90],
  ];
  const [name, base] = finds[Math.floor(r() * finds.length)];
  return { kind: 'coins', coins: Math.round(base * (1 + level * 0.06)), name };
}
