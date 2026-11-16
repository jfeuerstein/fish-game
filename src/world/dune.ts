// Sandglass Key's ground. A desert island shaped like an hourglass: two lobes, east and west,
// joined by a narrow waist where the sundial stands. The east lobe has a great dune and a flat
// pan with pools of soft sand in it (the Sinks), which are fished; the west has an oasis.
// Pure, and it knows nothing of layout.ts or island.ts.
import { fbm, smoothstep } from '../core/rng';
import type { Pool } from './kettle';

export const DUNE = {
  oasis: { x: -40, z: 2, r: 8, level: 1.7 },
  /** The flat the Sinks are in. */
  pan: { x: 34, z: 17, r: 13, level: 1.9 },
  /** The sundial's terrace, at the waist. */
  dial: { x: 0, z: 0, r: 5, h: 2.3 },
  /** The great dune, for sliding down. */
  big: { x: 33, z: -19, r: 19, h: 7.5 },
} as const;

/** The Sinks: pools of sand too soft to stand on, a little below the pan, and deep. */
const sink = (dx: number, dz: number): Pool => ({ x: DUNE.pan.x + dx, z: DUNE.pan.z + dz, r: 2.7, level: DUNE.pan.level - 0.04, depth: 1.7 });
export const SINKS: readonly Pool[] = [sink(-6.5, -3.5), sink(4.5, 2), sink(-3.5, 7)];

export function duneShore(angle: number): number {
  return 43 + 21 * Math.cos(2 * angle) + 2.2 * fbm(Math.cos(angle) * 2.2 + 4, Math.sin(angle) * 2.2 - 2, 3, 107);
}

/** How green the ground is: only round the oasis. 0 to 1. */
export function duneGreen(x: number, z: number): number {
  return smoothstep(DUNE.oasis.r + 9, DUNE.oasis.r + 2.5, Math.hypot(x - DUNE.oasis.x, z - DUNE.oasis.z));
}

export function duneHeight(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const inland = duneShore(angle) - Math.hypot(x, z);
  let h: number;
  if (inland >= 0) {
    h = 0.35 + 1.7 * smoothstep(0, 9, inland);
    // Dunes: long ridges, the same way round as the wind left them.
    const ridge = 0.5 + 0.5 * Math.sin(x * 0.19 + 1.6 * Math.sin(z * 0.08) + 0.7);
    h += 1.5 * ridge * ridge * smoothstep(5, 16, inland);
    h += DUNE.big.h * smoothstep(DUNE.big.r, DUNE.big.r * 0.15, Math.hypot(x - DUNE.big.x, z - DUNE.big.z));
    // The pan, flat; the sundial's terrace; and level ground round the oasis.
    h += (DUNE.pan.level - h) * smoothstep(DUNE.pan.r + 6, DUNE.pan.r, Math.hypot(x - DUNE.pan.x, z - DUNE.pan.z));
    h += (DUNE.dial.h - h) * smoothstep(DUNE.dial.r + 5, DUNE.dial.r, Math.hypot(x - DUNE.dial.x, z - DUNE.dial.z));
    h += (DUNE.oasis.level + 0.55 - h) * smoothstep(DUNE.oasis.r + 12, DUNE.oasis.r + 3, Math.hypot(x - DUNE.oasis.x, z - DUNE.oasis.z));
  } else {
    const out = -inland;
    h = 0.35 - 3.2 * smoothstep(0, 11, out) - 10 * smoothstep(8, 44, out);
  }
  // The oasis's hollow.
  const od = Math.hypot(x - DUNE.oasis.x, z - DUNE.oasis.z);
  if (od < DUNE.oasis.r + 3) {
    const bed = Math.max(0.4, DUNE.oasis.level - 0.2 - 1.6 * (1 - Math.pow(Math.min(1, od / DUNE.oasis.r), 2)));
    const bank = DUNE.oasis.level + 0.5;
    h = Math.min(h, od < DUNE.oasis.r ? bed : bed + (bank - bed) * smoothstep(DUNE.oasis.r, DUNE.oasis.r + 3, od));
  }
  for (const p of SINKS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) h = Math.min(h, p.level - 0.05 - p.depth * (1 - Math.pow(d / p.r, 4)));
  }
  return h;
}
