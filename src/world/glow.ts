// Glowmere's ground. A hilly island where it is always night: two hills and a south headland,
// each with a beacon on it, a still pond in a hollow (the Mere), and a shallow sea all round
// that glows. Pure, and it knows nothing of layout.ts or island.ts.
import { fbm, smoothstep } from '../core/rng';

/** The Mere, and where the three beacons stand. */
export const GLOW = {
  mere: { x: -6, z: -8, r: 11, level: 2.6 },
  beacons: [
    { x: 26, z: -24 },
    { x: -38, z: 10 },
    { x: 6, z: 46 },
  ],
} as const;

export function glowShore(angle: number): number {
  return 64 + 7 * Math.sin(2 * angle + 0.3) + 5 * Math.sin(3 * angle - 2.0) + 3 * fbm(Math.cos(angle) * 2.2 + 1, Math.sin(angle) * 2.2 - 9, 3, 83);
}

export function glowHeight(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const inland = glowShore(angle) - Math.hypot(x, z);
  let h: number;
  if (inland >= 0) {
    h = 0.35 + 2.0 * smoothstep(0, 8, inland) + 0.4 * fbm(x * 0.05, z * 0.05, 3, 89) * smoothstep(0, 10, inland);
    // Two hills and a rise on the south headland, flat enough on top to stand a beacon on.
    h += 9 * smoothstep(24, 4, Math.hypot(x - GLOW.beacons[0].x, z - GLOW.beacons[0].z));
    h += 6 * smoothstep(19, 4, Math.hypot(x - GLOW.beacons[1].x, z - GLOW.beacons[1].z));
    h += 2.5 * smoothstep(12, 3, Math.hypot(x - GLOW.beacons[2].x, z - GLOW.beacons[2].z));
    h += 1.3 * smoothstep(GLOW.mere.r + 15, GLOW.mere.r, Math.hypot(x - GLOW.mere.x, z - GLOW.mere.z));
  } else {
    const out = -inland;
    // The sea stays shallow a good way out: it is the shallows that glow.
    h = 0.35 - 2.6 * smoothstep(0, 9, out) - 1.2 * smoothstep(9, 26, out) - 10 * smoothstep(24, 56, out);
  }
  // The Mere's hollow.
  const md = Math.hypot(x - GLOW.mere.x, z - GLOW.mere.z);
  if (md < GLOW.mere.r + 3) {
    const bed = Math.max(0.5, GLOW.mere.level - 2.2 * (1 - Math.pow(Math.min(1, md / GLOW.mere.r), 2)) - 0.2);
    const bank = GLOW.mere.level + 0.5;
    h = Math.min(h, md < GLOW.mere.r ? bed : bed + (bank - bed) * smoothstep(GLOW.mere.r, GLOW.mere.r + 3, md));
  }
  return h;
}
