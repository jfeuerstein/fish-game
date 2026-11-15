// A gull of your own. One gull keeps to the end of the pier and does not fly off. Feed it a
// fish on three days running and it is yours: it follows you about, and now and then brings
// you something. Miss a day before then and it starts again. Pure.
import { valueOf, type Catch } from '../fishing/fish';

export interface GullKept {
  /** The calendar day it was last fed, or -1. */
  fed: number;
  /** Days running it has been fed. */
  streak: number;
  /** It follows the player. */
  tame: boolean;
  /** The day it last brought something, and how many times that day. */
  giftDay: number;
  gifts: number;
}

export const NEW_GULL: GullKept = { fed: -1, streak: 0, tame: false, giftDay: -1, gifts: 0 };

/** Days running it must be fed. */
export const GULL_DAYS = 3;
/** How many things it brings in a day at most. */
export const GULL_GIFTS = 2;

/** Whether it will take a fish today: once a day, and not once it is tame (it finds its own). */
export const gullHungry = (g: GullKept, day: number): boolean => !g.tame && g.fed !== day;

/** The fish in the bag to give it: the cheapest ordinary one, never a shiny or better. -1 if there is none. */
export function gullFish(bag: readonly Catch[]): number {
  let at = -1;
  bag.forEach((c, i) => {
    if (c.variant !== 'normal' && c.variant !== 'fine') return;
    if (at < 0 || valueOf(c) < valueOf(bag[at])) at = i;
  });
  return at;
}

/** Feed it today. Yesterday's feed carries the run on; any longer gap starts it again. */
export function feedGull(g: GullKept, day: number): GullKept {
  if (!gullHungry(g, day)) return g;
  const streak = g.fed === day - 1 ? g.streak + 1 : 1;
  return { ...g, fed: day, streak, tame: streak >= GULL_DAYS };
}

/** What it says of how things stand, after a feed. */
export function gullSays(g: GullKept): string {
  if (g.tame) return 'The gull hops down beside you. It seems to have decided you are its person.';
  const left = GULL_DAYS - g.streak;
  return left === 1 ? 'The gull swallows it whole and eyes you. Come back tomorrow.' : `The gull swallows it whole. ${left} more days and it might trust you.`;
}

export interface GullGift {
  coins: number;
  bait: { id: string; count: number } | null;
  says: string;
}

/** Whether a tame gull has something more to bring today. */
export const gullBrings = (g: GullKept, day: number): boolean => g.tame && (g.giftDay !== day || g.gifts < GULL_GIFTS);

/** What it brings: mostly a few coins it found, sometimes bait. `roll` is 0 to 1. */
export function gullGift(roll: number): GullGift {
  if (roll < 0.25) return { coins: 0, bait: { id: 'bait-cricket', count: 2 }, says: 'Your gull drops two crickets at your feet. Still wriggling.' };
  if (roll < 0.4) return { coins: 0, bait: { id: 'bait-minnow', count: 1 }, says: 'Your gull brings you a minnow. It only ate half.' };
  const coins = 8 + Math.floor(roll * 40);
  return { coins, bait: null, says: `Your gull lands with something shiny: ${coins} coins.` };
}

/** The gull after it has brought something on a day. */
export function gullGave(g: GullKept, day: number): GullKept {
  return { ...g, giftDay: day, gifts: g.giftDay === day ? g.gifts + 1 : 1 };
}
