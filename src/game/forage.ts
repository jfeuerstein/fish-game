// Bait for the patient: fat worms come up out of the wet ground when it rains and for a while
// after, and crickets sing in the grass at dusk. Walk up to one and take it. Pure: where they
// are and when.
import { rng } from '../core/rng';

export type Forage = 'worms' | 'crickets';

export interface ForageSpot {
  kind: Forage;
  x: number;
  z: number;
  /** A name for it that is the same every time it is worked out, so that one taken stays taken. */
  key: string;
}

/** What each gives: which bait, and how many. */
export const FORAGE_GIVES: Record<Forage, { bait: string; count: number; says: string }> = {
  worms: { bait: 'bait-crawler', count: 3, says: 'Night crawlers! Three fat ones.' },
  crickets: { bait: 'bait-cricket', count: 2, says: 'Got two crickets.' },
};

/** How many of each are about at once. */
export const FORAGE_SPOTS = 9;

/** Whether worms are up (it is raining, or the ground is still wet from it) and whether crickets are singing (dusk into the evening, on a dry night). */
export function forageNow(hour: number, wet: number): Forage | null {
  if (wet > 0.3) return 'worms';
  return hour >= 17.5 && hour < 21.5 ? 'crickets' : null;
}

/**
 * Where they are. `turn` is which spell of rain or which evening it is, so that each has its
 * own places; `fits` says whether a place is open grass or earth (dry land, off the paths).
 */
export function forageSpots(kind: Forage, turn: number, fits: (x: number, z: number) => boolean, half = 80): ForageSpot[] {
  const r = rng(4242 + turn * 131 + (kind === 'worms' ? 0 : 7));
  const out: ForageSpot[] = [];
  for (let tries = 0; out.length < FORAGE_SPOTS && tries < 600; tries++) {
    const x = Math.round((r() * 2 - 1) * half);
    const z = Math.round((r() * 2 - 1) * half);
    if (!fits(x, z) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 9)) continue;
    out.push({ kind, x, z, key: `${kind}-${turn}-${out.length}` });
  }
  return out;
}
