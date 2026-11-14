// What bites, how big it is, and how long the wait is. Pure: everything random comes from `rand`.
import { bitesAt } from '../game/clock';
import { type Bait, type Rod } from '../game/economy';
import type { Zone } from '../world/island';
import { type Catch, SPECIES, type Species, type Tier, type Variant } from './fish';

export interface Conditions {
  zone: Zone;
  hour: number;
  raining: boolean;
  rod: Rod;
  bait: Bait;
}

/** How often each tier bites, before bait and rod have their say. */
export const TIER_WEIGHT: Record<Tier, number> = { junk: 9, common: 100, uncommon: 38, rare: 11, epic: 3.2, legendary: 0.7 };

/** Everything that could bite here and now, with how likely each is. */
export function candidates(c: Conditions): { species: Species; weight: number }[] {
  const out: { species: Species; weight: number }[] = [];
  const night = !bitesAt('day', c.hour);
  for (const s of SPECIES) {
    if (!s.zones.includes(c.zone)) continue;
    if (!bitesAt(s.watch, c.hour)) continue;
    if (s.rain && !c.raining) continue;
    let w = TIER_WEIGHT[s.tier] * (c.bait.boost[s.tier] ?? 1);
    if (s.tier === 'rare' || s.tier === 'epic' || s.tier === 'legendary') w *= 1 + c.rod.luck;
    if (night && c.bait.night && s.tier !== 'junk' && s.tier !== 'common') w *= c.bait.night;
    // A fish that keeps to a particular hour or weather is easier to find in it.
    if (s.watch !== 'any') w *= 1.25;
    if (s.rain) w *= 1.6;
    // Something that lives in several kinds of water is spread thinner in each.
    w /= Math.sqrt(s.zones.length);
    out.push({ species: s, weight: w });
  }
  return out;
}

function pick<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Roll a catch. */
export function rollCatch(c: Conditions, rand: () => number, now = Date.now()): Catch {
  const { species } = pick(candidates(c), rand);
  const [lo, hi] = species.size;
  // Most are smallish; the bait can push them bigger.
  const skew = 1.9 - (c.bait.size ?? 0) * 1.6;
  let u = Math.pow(rand(), Math.max(0.5, skew));
  const huge = species.tier !== 'junk' && rand() < 0.035 + (c.bait.size ?? 0) * 0.05;
  if (huge) u = 0.92 + rand() * 0.08;
  const size = Math.round((lo + (hi - lo) * u) * 10) / 10;
  let variant: Variant = 'normal';
  if (species.tier !== 'junk') {
    const r = rand();
    const luck = 1 + c.rod.luck * 1.5;
    if (r < 0.01 * luck) variant = 'golden';
    else if (r < 0.06 * luck) variant = 'shiny';
  }
  return { species: species.id, size, variant, huge, at: now };
}

/** Seconds until something bites. */
export function biteDelay(c: Conditions, rand: () => number): number {
  return (3 + rand() * 9) * c.bait.speed * (c.raining ? 0.8 : 1);
}

/** How many little nibbles come before the real bite. */
export function nibbles(rand: () => number): number {
  return Math.floor(rand() * 4);
}
