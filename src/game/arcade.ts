// The Lucky Gull arcade: a roulette strip, a slot machine and Flying Fish (cash out before the
// gull gets it). Pure: no DOM, no three.js. Every game pays back a little under what is staked on
// average, so coins drift back to the gull, never far; the slots and the wheel's gull can pay
// tokens, which are what chests cost.
import { rng } from '../core/rng';

/** How much can be staked, and the steps the stake buttons go in. */
export const STAKES = [10, 25, 50, 100, 250, 500, 1000] as const;

// ---------- The Gull Wheel ----------

/** One slot on the wheel's strip. */
export type Pocket = 'crab' | 'mussel' | 'gull';
/** The strip's pattern, repeated: one gull, then crabs and mussels in turn (seven of each). */
export const WHEEL: readonly Pocket[] = ['gull', 'crab', 'mussel', 'crab', 'mussel', 'crab', 'mussel', 'crab', 'mussel', 'crab', 'mussel', 'crab', 'mussel', 'crab', 'mussel'];
/** What each pays for each coin staked on it (the stake included). */
export const WHEEL_PAYS: Record<Pocket, number> = { crab: 2, mussel: 2, gull: 14 };
/** A gull also pays a token for every 100 coins staked on it. */
export const GULL_TOKENS_PER = 100;

/** Spin the wheel: which pocket of the pattern it stops on. */
export function spinWheel(rand: () => number): number {
  return Math.floor(rand() * WHEEL.length) % WHEEL.length;
}

/** What a bet on `on` brings back when the wheel stops on `pocket`: coins (stake included) and tokens. */
export function wheelPayout(on: Pocket, stake: number, pocket: Pocket): { coins: number; tokens: number } {
  if (on !== pocket) return { coins: 0, tokens: 0 };
  return { coins: stake * WHEEL_PAYS[on], tokens: on === 'gull' ? Math.floor(stake / GULL_TOKENS_PER) : 0 };
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

export type Reel = 'worm' | 'bobber' | 'shell' | 'fish' | 'boot' | 'gold' | 'pearl';
/** How often each symbol comes up on a reel (relative weights). */
export const REEL_WEIGHTS: Record<Reel, number> = { worm: 30, bobber: 22, shell: 17, fish: 12, boot: 12, gold: 3, pearl: 4 };
/** Three of a kind pays this many times the stake. Three pearls pay tokens instead (see below). */
export const THREE_PAYS: Record<Reel, number> = { worm: 4, bobber: 7, shell: 12, fish: 22, boot: 3, gold: 150, pearl: 0 };
/** Two golden fish anywhere pay this; one pays the stake back. */
export const TWO_GOLD = 6;
/** Two of a kind: worms and bobbers give the stake back, shells and fish double it. */
export const PAIR_PAYS: Partial<Record<Reel, number>> = { worm: 1, bobber: 1, shell: 2, fish: 2 };
/** Pearls: tokens for each pearl showing when the stake is at least 100 (three pay many more). */
export const PEARL_TOKENS = { one: 0, two: 1, three: 6 } as const;
export const PEARL_MIN_STAKE = 50;

export interface SlotResult {
  reels: [Reel, Reel, Reel];
  /** Coins back, stake included (0 is a loss). */
  coins: number;
  tokens: number;
  /** What to call it. */
  kind: 'none' | 'small' | 'three' | 'jackpot' | 'boots';
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

/** What a line of three pays. */
export function scoreSlots(reels: [Reel, Reel, Reel], stake: number): SlotResult {
  const [a, b, c] = reels;
  const golds = reels.filter((x) => x === 'gold').length;
  const pearls = reels.filter((x) => x === 'pearl').length;
  const tokens = stake >= PEARL_MIN_STAKE ? (pearls === 3 ? PEARL_TOKENS.three : pearls === 2 ? PEARL_TOKENS.two : 0) : 0;
  if (a === b && b === c && a !== 'pearl') {
    return { reels, coins: stake * THREE_PAYS[a], tokens, kind: a === 'gold' ? 'jackpot' : a === 'boot' ? 'boots' : 'three' };
  }
  if (golds === 2) return { reels, coins: stake * TWO_GOLD, tokens, kind: 'small' };
  if (golds === 1) return { reels, coins: stake, tokens, kind: 'small' };
  if (pearls === 3) return { reels, coins: stake * 2, tokens, kind: 'jackpot' };
  const pair = a === b || a === c ? a : b === c ? b : null;
  if (pair && PAIR_PAYS[pair]) return { reels, coins: stake * PAIR_PAYS[pair]!, tokens, kind: 'small' };
  return { reels, coins: 0, tokens, kind: tokens ? 'small' : 'none' };
}

/** Pull the lever. */
export function spinSlots(stake: number, rand: () => number): SlotResult {
  return scoreSlots([pickReel(rand()), pickReel(rand()), pickReel(rand())], stake);
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

/**
 * Where the gull will snatch the fish: a multiplier, 1 or more. Chosen so that cashing out at any
 * m is reached with chance (1 - SNATCH_AT_ONCE) / m: every target pays back 96% on average.
 */
export function snatchPoint(rand: () => number): number {
  const u = rand();
  if (u < SNATCH_AT_ONCE) return 1;
  const m = (1 - SNATCH_AT_ONCE) / (1 - u);
  return Math.min(MAX_FLIGHT, Math.max(1, Math.floor(m * 100) / 100));
}

export const flightAt = (t: number): number => Math.floor(Math.exp(RATE * t) * 100) / 100;
export const timeTo = (m: number): number => Math.log(Math.max(1, m)) / RATE;

/** How grand a win is, for the fanfare: by how many times the stake came back. */
export type Grandness = 'none' | 'small' | 'big' | 'huge' | 'jackpot';
export function grandness(back: number, stake: number, tokens = 0): Grandness {
  const x = stake > 0 ? back / stake : 0;
  if (x >= 40 || tokens >= 5) return 'jackpot';
  if (x >= 10 || tokens >= 2) return 'huge';
  if (x >= 3 || tokens >= 1) return 'big';
  if (x > 1) return 'small';
  return 'none';
}
