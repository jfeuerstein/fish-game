// Fish that show themselves: here and there a ring spreads on the water, and now and then
// something jumps. A cast that lands by one gets a bite sooner. Pure: where they are.
import { rng } from '../core/rng';

export interface Rise {
  x: number;
  z: number;
}

/** How many places there are at once, and how close a bobber must land to one to count, metres. */
export const RISES = 7;
export const RISE_REACH = 3;
/** How much sooner the bite comes by a rise. */
export const RISE_SOONER = 0.55;

/**
 * Where fish are rising in this stretch of time (`turn`). `fishable` says whether a place is
 * water deep enough to fish; `inReach` whether it is close enough to somewhere to stand to be
 * cast to.
 */
export function riseSpots(turn: number, fishable: (x: number, z: number) => boolean, inReach: (x: number, z: number) => boolean, half = 115): Rise[] {
  const r = rng(977 + turn * 53);
  const out: Rise[] = [];
  for (let tries = 0; out.length < RISES && tries < 900; tries++) {
    const x = Math.round((r() * 2 - 1) * half * 2) / 2;
    const z = Math.round((r() * 2 - 1) * half * 2) / 2;
    if (!fishable(x, z) || !inReach(x, z) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 12)) continue;
    out.push({ x, z });
  }
  return out;
}

/** Whether a bobber at a place is by one of them. */
export const byRise = (rises: readonly Rise[], x: number, z: number): boolean => rises.some((s) => Math.hypot(s.x - x, s.z - z) <= RISE_REACH);
