// Rimefall's ground. A low island of snow with one long hill in the north-west and, in the
// middle, a lake frozen flat: it is walked on, and fished through holes cut in the ice. The sea
// round it is cold and has its own fish. Pure, and it knows nothing of layout.ts or island.ts.
import { fbm, smoothstep } from '../core/rng';
import type { Pool } from './kettle';

/** The frozen lake, and the hill to sled down. */
export const RIME = { lake: { x: 8, z: 4, r: 24, level: 2.2 }, hill: { x: -36, z: -28, r: 38, h: 13 } } as const;

export function rimeShore(angle: number): number {
  return 68 + 5 * Math.sin(2 * angle - 0.7) + 4 * Math.sin(3 * angle + 1.9) + 3 * fbm(Math.cos(angle) * 2.2 + 9, Math.sin(angle) * 2.2 - 4, 3, 53);
}

/** The holes in the ice: a little below its top, and deep. */
const hole = (dx: number, dz: number): Pool => ({ x: RIME.lake.x + dx, z: RIME.lake.z + dz, r: 1.7, level: RIME.lake.level - 0.04, depth: 1.8 });
export const HOLES: readonly Pool[] = [hole(-11, -6), hole(3, -13), hole(12, 2), hole(-3, 9), hole(-14, 8)];

export function rimeHeight(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const inland = rimeShore(angle) - Math.hypot(x, z);
  let h: number;
  if (inland >= 0) {
    h = 0.35 + 2.0 * smoothstep(0, 7, inland) + 0.45 * fbm(x * 0.06, z * 0.06, 3, 61) * smoothstep(0, 10, inland);
    // The long hill, rounded on top, and a knoll in the north-east.
    h += RIME.hill.h * smoothstep(RIME.hill.r, RIME.hill.r * 0.12, Math.hypot(x - RIME.hill.x, z - RIME.hill.z));
    h += 4.5 * smoothstep(17, 3, Math.hypot(x - 36, z + 36));
    // The lake: flat as ice is, with the land easing down to it.
    const ld = Math.hypot(x - RIME.lake.x, z - RIME.lake.z);
    h += (RIME.lake.level - h) * smoothstep(RIME.lake.r + 7, RIME.lake.r, ld);
  } else {
    const out = -inland;
    h = 0.35 - 3.2 * smoothstep(0, 6, out) - 10 * smoothstep(4, 40, out);
  }
  for (const p of HOLES) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) h = Math.min(h, p.level - 0.05 - p.depth * (1 - Math.pow(d / p.r, 4)));
  }
  return h;
}
