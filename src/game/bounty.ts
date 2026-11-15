// The day's bounty: each day Gus wants one kind of fish. He pays double for every one of them,
// and a bounty on top for the first: something to set out for each time the game is opened.
// It goes by the calendar where the player is, not the island's own short day, so it is the
// same fish all day and a new one tomorrow. Pure.
import { BY_ID, SPECIES, WATCH_LABEL, ZONE_LABEL, type Catch, type Species } from '../fishing/fish';
import { chance } from '../look/skylife';

/** What the day's fish sells for, against its usual price. */
export const BOUNTY_PAYS = 2;

/** The day of the calendar where the player is: the same number from midnight to midnight. */
export function calendarDay(nowMs: number, tzOffsetMin: number): number {
  return Math.floor((nowMs - tzOffsetMin * 60_000) / 86_400_000);
}

/**
 * The fish that can be asked for: real fish that can be caught on any day. Never an odd or end,
 * never a legend (those are a long hunt, not a day's errand), and never one that only bites in
 * rain, which a dry day would make impossible.
 */
export const BOUNTY_FISH: readonly Species[] = SPECIES.filter((s) => s.tier !== 'junk' && s.tier !== 'legendary' && !s.rain);

const rounds = new Map<number, number[]>();

/** The order the fish are asked for in one round of them all: shuffled, the same every time for the same round. */
function round(n: number): number[] {
  let order = rounds.get(n);
  if (!order) {
    order = BOUNTY_FISH.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(chance(n * 97 + i, 7) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    rounds.set(n, order);
  }
  return order;
}

/**
 * The fish wanted on a day. Every fish that can be asked for is asked for once before any is
 * asked for again, in an order shuffled afresh each time round, and never the same two days
 * running (where one round ends on the fish the next begins with, the next begins with its
 * second instead).
 */
export function bountyFor(day: number): Species {
  const n = BOUNTY_FISH.length;
  const r = Math.floor(day / n);
  const i = ((day % n) + n) % n;
  const order = round(r);
  const before = round(r - 1);
  const clash = order[0] === before[n - 1];
  // Swap the first two of a round that would repeat the last of the round before.
  const at = clash && i < 2 ? 1 - i : i;
  return BOUNTY_FISH[order[at]];
}

/** The bounty paid, once a day, for the first of the day's fish sold: more for a rarer fish. */
export function bountyPrize(s: Species): number {
  return Math.round((40 + s.value * 4) / 5) * 5;
}

/** Where and when to look for a fish, in a few words: "Ocean, Deep water · Daytime". */
export function whereabouts(s: Species): string {
  return `${s.zones.map((z) => ZONE_LABEL[z]).join(', ')} · ${WATCH_LABEL[s.watch]}`;
}

/** What is kept of the bounty: the day it was last filled. */
export interface BountyKept {
  /** The calendar day the bounty was last filled, or -1. */
  filled: number;
  /** How many have been filled in all. */
  count: number;
}

export const bountyFilled = (kept: BountyKept, day: number): boolean => kept.filled === day;

/** What a catch is worth to Gus on a day: double if it is the day's fish. */
export function priceOn(c: Catch, day: number, value: (c: Catch) => number): number {
  return value(c) * (c.species === bountyFor(day).id ? BOUNTY_PAYS : 1);
}

/** Whether a catch is the fish wanted on a day. */
export const isBounty = (species: string, day: number): boolean => !!BY_ID[species] && bountyFor(day).id === species;
