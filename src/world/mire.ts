// Mirewood's ground. A low, flat island cut through by channels of still water that cannot be
// waded: one from sea to sea across it, one running south from that, and a round basin (the
// bayou) joined to the first. The land is in pieces, and boardwalks join them. Pure, and it
// knows nothing of layout.ts or island.ts.
import { fbm, smoothstep } from '../core/rng';

type V2 = readonly [number, number];

/** The channels, as lines down their middles, and half their width. */
export const CHANNELS: readonly (readonly V2[])[] = [
  [[-84, -6], [-50, -14], [-20, -4], [8, -12], [34, -6], [60, -12], [92, -6]],
  [[-20, -4], [-26, 20], [-14, 44], [-18, 86]],
  [[26, 9], [30, -7]],
];
export const CHANNEL_HALF = 3.4;
/** The bayou: a round basin of the same water. */
export const BAYOU = { x: 26, z: 22, r: 13 } as const;
/** How deep the still water is. */
const DEEP = 1.5;

export function mireShore(angle: number): number {
  return 78 + 6 * Math.sin(2 * angle + 1) + 5 * Math.sin(4 * angle) + 3 * fbm(Math.cos(angle) * 2.2 - 6, Math.sin(angle) * 2.2 + 2, 3, 71);
}

/** How far inside the shore a place is (negative out at sea). */
export const mireInland = (x: number, z: number): number => mireShore(Math.atan2(z, x)) - Math.hypot(x, z);

function toLine(line: readonly V2[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const dx = bx - ax;
    const dz = bz - az;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - (ax + dx * u), z - (az + dz * u)));
  }
  return best;
}

/** How far a place is from the edge of the still water: nothing or less in it. */
export function toStillWater(x: number, z: number): number {
  let d = Math.hypot(x - BAYOU.x, z - BAYOU.z) - BAYOU.r;
  for (const c of CHANNELS) d = Math.min(d, toLine(c, x, z) - CHANNEL_HALF);
  return d;
}

export function mireHeight(x: number, z: number): number {
  const inland = mireInland(x, z);
  let h: number;
  if (inland >= 0) h = 0.3 + 1.7 * smoothstep(0, 9, inland) + 0.5 * fbm(x * 0.07, z * 0.07, 3, 77) * smoothstep(0, 10, inland);
  else {
    const out = -inland;
    h = 0.3 - 3.0 * smoothstep(0, 8, out) - 10 * smoothstep(6, 44, out);
  }
  // The still water: a flat bed, and a bank that comes up to the land in a few metres.
  const d = toStillWater(x, z);
  if (d < 4) {
    const bed = -DEEP + 0.4 * smoothstep(-2.5, 0, d);
    h = Math.min(h, d < 0 ? bed : bed + (Math.max(h, 0.6) - bed) * smoothstep(0, 4, d));
  }
  return h;
}
