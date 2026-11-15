// The Lucky Gull arcade: every game is the same roll (rollPrize in crates.ts: a pearl in, a
// cosmetic out) shown a different way. A strip of prizes slowing past a marker, three reels that
// land on the prize, a fish that leaps as high as the prize is rare, a scratch card of three.
// These are the shapes of those shows, decided once the prize is known. Pure.
import { rng } from '../core/rng';
import { type Prize, type Rarity, rollPrize } from './crates';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Three reels for the slots: random prizes spinning past, each ending on the prize. Longer reels for the rarer prizes, so they tease. */
export function reelStrips(winner: Prize, seed: number): Prize[][] {
  const r = rng(seed);
  const rare = RARITIES.indexOf(winner.rarity) >= 3;
  return [0, 1, 2].map((i) => {
    const len = 18 + i * 7 + (i === 2 && rare ? 14 : 0);
    const reel = Array.from({ length: len - 1 }, () => rollPrize(r));
    reel.push(winner);
    return reel;
  });
}

/** How high the fish leaps for each rarity: the bands it climbs through, and where it peaks. */
export const FLIGHT_BANDS: readonly { at: number; rarity: Rarity }[] = [
  { at: 1, rarity: 'common' },
  { at: 2, rarity: 'uncommon' },
  { at: 4, rarity: 'rare' },
  { at: 8, rarity: 'epic' },
  { at: 16, rarity: 'legendary' },
];
/** The height the fish reaches for a prize: inside its rarity's band, short of the next. */
export function peakFor(rarity: Rarity, rand: () => number): number {
  const i = RARITIES.indexOf(rarity);
  const lo = FLIGHT_BANDS[i].at;
  const hi = FLIGHT_BANDS[i + 1]?.at ?? lo * 1.8;
  return lo + (hi - lo) * (0.25 + rand() * 0.6);
}
/** The band a height is in. */
export function bandAt(h: number): Rarity {
  let b: Rarity = 'common';
  for (const t of FLIGHT_BANDS) if (h >= t.at) b = t.rarity;
  return b;
}

/** A scratch card: nine squares, the prize three times and nothing else three times. */
export function scratchCard(winner: Prize, seed: number): Prize[] {
  const r = rng(seed);
  const cells: Prize[] = [winner, winner, winner];
  const count = new Map<string, number>([[winner.id, 3]]);
  for (let guard = 0; cells.length < 9 && guard < 500; guard++) {
    const p = rollPrize(r);
    const n = count.get(p.id) ?? 0;
    if (p.id === winner.id || n >= 2) continue;
    count.set(p.id, n + 1);
    cells.push(p);
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

/** How grand a win is, for the fanfare. */
export type Grandness = 'none' | 'small' | 'big' | 'huge' | 'jackpot';
export const GRAND: Record<Rarity, Grandness> = { common: 'small', uncommon: 'small', rare: 'big', epic: 'huge', legendary: 'jackpot' };
