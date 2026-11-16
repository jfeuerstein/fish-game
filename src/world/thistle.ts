// Thistledown's ground. A small island that stands above a sea of cloud: cliffs all round, a
// knoll with a windmill on it, and a spire of rock too steep to climb with a pool on top (the
// Aerie), which is got to by the updraft at its foot. Pure, and it knows nothing of layout.ts
// or island.ts.
import { fbm, smoothstep } from '../core/rng';

/** How high the spire's flat top stands. */
const TOP = 16.5;

export const SKY = {
  /** The spire: its foot's radius, its flat top's, and the height of the top. */
  spire: { x: -22, z: -18, r: 12, flat: 9.6, top: TOP },
  /** The pool on top of it. */
  aerie: { x: -22, z: -18, r: 4.2, level: TOP - 0.35 },
  mill: { x: 26, z: -24 },
  /** Where the wind comes up out of the ground: the first is the way up the spire. */
  vents: [
    { x: -6.5, z: -13.5 },
    { x: 22, z: 26 },
    { x: -26, z: 24 },
  ],
} as const;

export function skyShore(angle: number): number {
  return 54 + 5 * Math.sin(2 * angle + 1.1) + 4 * Math.sin(3 * angle - 0.4) + 2.5 * fbm(Math.cos(angle) * 2.2 - 3, Math.sin(angle) * 2.2 + 7, 3, 101);
}

export function skyHeight(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const inland = skyShore(angle) - Math.hypot(x, z);
  let h: number;
  if (inland >= 0) {
    // Cliffs: the ground is up at its height within a few metres of the edge.
    h = 0.35 + 3.0 * smoothstep(0, 3.5, inland) + 0.6 * fbm(x * 0.05, z * 0.05, 3, 103) * smoothstep(0, 8, inland);
    h += 3.6 * smoothstep(16, 4, Math.hypot(x - SKY.mill.x, z - SKY.mill.z));
    // The spire: a wall of rock, flat on top.
    const sd = Math.hypot(x - SKY.spire.x, z - SKY.spire.z);
    h += (SKY.spire.top - h) * smoothstep(SKY.spire.r, SKY.spire.flat, sd);
  } else {
    const out = -inland;
    // Nothing shelves: it is a long way down.
    h = 0.35 - 6 * smoothstep(0, 3, out) - 8 * smoothstep(2, 30, out);
  }
  // The Aerie's hollow.
  const ad = Math.hypot(x - SKY.aerie.x, z - SKY.aerie.z);
  if (ad < SKY.aerie.r + 2) {
    const bed = SKY.aerie.level - 0.2 - 1.9 * (1 - Math.pow(Math.min(1, ad / SKY.aerie.r), 2));
    const bank = SKY.aerie.level + 0.35;
    h = Math.min(h, ad < SKY.aerie.r ? bed : bed + (bank - bed) * smoothstep(SKY.aerie.r, SKY.aerie.r + 2, ad));
  }
  return h;
}
