// The Lucky Gull arcade: a roulette strip, a slot machine and Flying Fish (cash out before the
// gull gets it). Every game costs pearls (the premium currency, from the rarest catches) and pays
// out a cosmetic of some rarity, never coins: a game only decides how rare the prize is, and
// crates.ts picks the prize. Pure: no DOM, no three.js.
import { rng } from '../core/rng';
import type { Rarity } from './crates';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// ---------- The Gull Wheel ----------

/** One pocket on the wheel's strip, and the prize a bet on it wins. */
export type Pocket = 'shell' | 'crab' | 'gull';
export const POCKET_PRIZE: Record<Pocket, Rarity> = { shell: 'uncommon', crab: 'rare', gull: 'legendary' };
/** The strip's pattern, repeated: one gull, eight crabs and sixteen shells, the crabs spread out. */
export const WHEEL: readonly Pocket[] = ['gull', ...Array.from({ length: 24 }, (_, i): Pocket => (i % 3 === 1 ? 'crab' : 'shell'))];
export const WHEEL_COST = 1;

/** Spin the wheel: which pocket of the pattern it stops on. */
export function spinWheel(rand: () => number): number {
  return Math.floor(rand() * WHEEL.length) % WHEEL.length;
}

/** What a bet on `on` wins when the wheel stops on `pocket`: a prize's rarity, or nothing. */
export function wheelPrize(on: Pocket, pocket: Pocket): Rarity | null {
  return on === pocket ? POCKET_PRIZE[on] : null;
}

/**
 * The strip shown spinning past: `length` pockets following the pattern, positioned so that the
 * pocket at `stopAt` is the result. Returns the pattern index of each tile.
 */
export function wheelStrip(result: number, length: number, stopAt: number): number[] {
  const n = WHEEL.length;
  const first = (((result - stopAt) % n) + n) % n;
  return Array.from({ length }, (_, i) => (first + i) % n);
}

// ---------- The Bait Bandit (slots) ----------

export type Reel = 'worm' | 'bobber' | 'fish' | 'gold' | 'crown' | 'boot' | 'pearl';
/** How often each symbol comes up on a reel (relative weights). */
export const REEL_WEIGHTS: Record<Reel, number> = { worm: 30, bobber: 22, fish: 14, gold: 7, crown: 5, boot: 10, pearl: 6 };
/** The rarity each symbol stands for (see scoreSlots). */
export const REEL_PRIZE: Partial<Record<Reel, Rarity>> = { worm: 'common', bobber: 'uncommon', fish: 'rare', gold: 'epic', crown: 'legendary' };
export const SLOTS_COST = 1;

export interface SlotResult {
  reels: [Reel, Reel, Reel];
  /** The prize won, if any. */
  prize: Rarity | null;
  /** Pearls given back (three pearls, or three boots for the laugh). */
  pearls: number;
  kind: 'none' | 'pair' | 'three' | 'jackpot' | 'boots' | 'pearls';
}

function pickReel(r: number): Reel {
  const total = Object.values(REEL_WEIGHTS).reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const [k, w] of Object.entries(REEL_WEIGHTS) as [Reel, number][]) {
    acc += w / total;
    if (r < acc) return k;
  }
  return 'worm';
}

/** What a line of three wins: two alike that symbol's rarity (two crowns, an epic), three alike one rarity up. */
export function scoreSlots(reels: [Reel, Reel, Reel]): SlotResult {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    if (a === 'pearl') return { reels, prize: null, pearls: 3, kind: 'pearls' };
    if (a === 'boot') return { reels, prize: null, pearls: 1, kind: 'boots' };
    const r = REEL_PRIZE[a]!;
    const won = RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(r) + 1)];
    return { reels, prize: won, pearls: a === 'crown' ? 3 : 0, kind: won === 'legendary' || won === 'epic' ? 'jackpot' : 'three' };
  }
  const pair = a === b || a === c ? a : b === c ? b : null;
  const pr = pair ? REEL_PRIZE[pair] : undefined;
  if (pr) return { reels, prize: pair === 'crown' ? 'epic' : pr, pearls: 0, kind: 'pair' };
  return { reels, prize: null, pearls: 0, kind: 'none' };
}

/** Pull the lever. */
export function spinSlots(rand: () => number): SlotResult {
  return scoreSlots([pickReel(rand()), pickReel(rand()), pickReel(rand())]);
}

/** A reel's strip as it spins: random symbols ending on the result. */
export function reelStrip(result: Reel, length: number, seed: number): Reel[] {
  const r = rng(seed);
  const out: Reel[] = [];
  for (let i = 0; i < length - 1; i++) out.push(pickReel(r()));
  out.push(result);
  return out;
}

// ---------- Flying Fish (crash) ----------

/** The chance the gull snatches the fish the moment it leaves the water. */
export const SNATCH_AT_ONCE = 0.04;
/** How fast the multiplier grows: m(t) = e^(RATE * t), t in seconds. */
export const RATE = 0.16;
/** The highest it can go. */
export const MAX_FLIGHT = 100;
export const FLIGHT_COST = 1;
/** How high the fish must fly for each rarity of prize; cashed out lower, the pearl comes back. */
export const FLIGHT_TIERS: readonly { at: number; rarity: Rarity }[] = [
  { at: 1.4, rarity: 'common' },
  { at: 2, rarity: 'uncommon' },
  { at: 3.5, rarity: 'rare' },
  { at: 7, rarity: 'epic' },
  { at: 25, rarity: 'legendary' },
];

/** Where the gull will snatch the fish: a multiplier, 1 or more; reaching m has chance (1 - SNATCH_AT_ONCE) / m. */
export function snatchPoint(rand: () => number): number {
  const u = rand();
  if (u < SNATCH_AT_ONCE) return 1;
  const m = (1 - SNATCH_AT_ONCE) / (1 - u);
  return Math.min(MAX_FLIGHT, Math.max(1, Math.floor(m * 100) / 100));
}

export const flightAt = (t: number): number => Math.floor(Math.exp(RATE * t) * 100) / 100;
export const timeTo = (m: number): number => Math.log(Math.max(1, m)) / RATE;

/** The prize for cashing out at a multiplier, or null below the first tier (the pearl comes back). */
export function flightPrize(m: number): Rarity | null {
  let won: Rarity | null = null;
  for (const t of FLIGHT_TIERS) if (m >= t.at) won = t.rarity;
  return won;
}

/** The next tier up from a multiplier, for the display: what is reached at what height. */
export function nextTier(m: number): { at: number; rarity: Rarity } | null {
  return FLIGHT_TIERS.find((t) => m < t.at) ?? null;
}

// ---------- The fanfare ----------

/** How grand a win is, for the fanfare. */
export type Grandness = 'none' | 'small' | 'big' | 'huge' | 'jackpot';
export const GRAND: Record<Rarity, Grandness> = { common: 'small', uncommon: 'small', rare: 'big', epic: 'huge', legendary: 'jackpot' };
