// Toys: the rarest prizes at the Lucky Gull, and the only ones that change how the island is
// got about or fished. Three are ridden (a skateboard, a pogo stick, a bunch of balloons) and
// two are used now and then (a dinner bell for fish, a storm kept in a bottle). Pure: what
// they are, their numbers, and what a run of tricks is called.
import type { Save } from './save';

export type ToyId = 'toy-skateboard' | 'toy-pogo' | 'toy-balloons' | 'toy-bell' | 'toy-bottle' | 'toy-sled' | 'toy-stilts';
/** How a ridden toy changes the way the player moves (src/player/player.ts). */
export type Gear = 'skate' | 'pogo' | 'balloons' | 'sled' | 'stilts';

export interface Toy {
  id: ToyId;
  name: string;
  /** What it does, for the menu. */
  blurb: string;
  /** Ridden: how the player moves on it. */
  gear?: Gear;
  /** Used, not ridden: how long before it can be used again, seconds. */
  rest?: number;
  /** Not a prize at the Lucky Gull: earned on a far island (src/game/isles.ts). */
  earned?: boolean;
}

export const TOYS: readonly Toy[] = [
  { id: 'toy-skateboard', name: 'Skateboard', blurb: 'Faster than feet, and it rolls on by itself. Jump to ollie, then Kickflip or 360 before you land.', gear: 'skate' },
  { id: 'toy-pogo', name: 'Pogo Stick', blurb: 'Never stops bouncing. Jump for one great big bounce, up ledges and over fences.', gear: 'pogo' },
  { id: 'toy-balloons', name: 'Bunch of Balloons', blurb: 'Jump and float. Jump again in the air for a little more lift: twice, and then down you come, slowly.', gear: 'balloons' },
  { id: 'toy-bell', name: 'Dinner Bell', blurb: 'Ring it and the fish come to see: bites come much sooner for a minute and a half.', rest: 15 * 60 },
  { id: 'toy-sled', name: 'Sled', blurb: 'Sit on it at the top of a slope and let go. It does not much care for the flat.', gear: 'sled', earned: true },
  { id: 'toy-stilts', name: 'Stilts', blurb: 'Slow, tall and dry: walk through water that would be over your head. Mirewood\'s channels are just shallow enough.', gear: 'stilts', earned: true },
  { id: 'toy-bottle', name: 'Storm in a Bottle', blurb: 'Pull the cork and a rain cloud follows you about for four minutes. Rain fish bite under it.', rest: 20 * 60 },
];

export const toyById = (id: string): Toy | undefined => TOYS.find((t) => t.id === id);

/** The skateboard. Speeds in metres a second. */
export const SKATE = {
  /** As fast as pushing gets it on the flat (a run on foot is 5.4). */
  top: 9,
  /** As fast as a hill can get it. */
  most: 14,
  /** How quickly it gets up to speed, and how slowly it loses it when left to roll. */
  push: 1.5,
  roll: 0.3,
  /** How hard a slope pulls it. */
  hill: 9,
  /** How quickly it comes round to where the stick points: slower than feet, so it carves. */
  carve: 4.5,
  ollie: 6.4,
} as const;

/** The sled: the board's own way of going, with next to no push and a great deal of hill. */
export const SLED = { top: 2.2, most: 16, push: 2.5, roll: 0.25, hill: 15, carve: 2.6 } as const;
/** Stilts: how fast they go, how deep they wade, and how far up they lift whoever is on them. */
export const STILTS = { speed: 2.4, wade: 1.65, lift: 1.5 } as const;
export const POGO = { bounce: 5.2, big: 10.5, speed: 3.8 } as const;
export const BALLOONS = { lift: 5, pump: 3.6, pumps: 2, fall: 3.5, sink: 1.4, speed: 3.6 } as const;

/** The bell: for this long after it is rung, a bite comes in this much of the time. */
export const BELL = { secs: 90, hurry: 0.35 } as const;
/** The bottle: how long its cloud lasts. */
export const BOTTLE_SECS = 240;

export type Trick = 'kickflip' | 'spin';
export const TRICK_NAME: Record<Trick, string> = { kickflip: 'Kickflip', spin: '360' };
/** How long a trick takes in the air. Land before it is done and it is a bail. */
export const TRICK_SECS = 0.42;

/** What a run of tricks landed together is called: "Kickflip", "Kickflip + 360", "Double Kickflip + 360". */
export function comboSays(tricks: readonly Trick[]): string {
  const said: string[] = [];
  for (let i = 0; i < tricks.length; ) {
    let n = 1;
    while (tricks[i + n] === tricks[i]) n++;
    const many = n === 1 ? '' : n === 2 ? 'Double ' : n === 3 ? 'Triple ' : `${n}x `;
    said.push(many + TRICK_NAME[tricks[i]]);
    i += n;
  }
  return said.join(' + ');
}

/** Seconds until a toy that rests can be used again (0 when it is ready). */
export function restLeft(save: Save, id: string, nowMs: number): number {
  const rest = toyById(id)?.rest ?? 0;
  const used = save.toyAt[id] ?? 0;
  // A clock set back (or a save from another device) does not lock a toy away.
  if (used > nowMs) return 0;
  return Math.max(0, Math.ceil(rest - (nowMs - used) / 1000));
}

/** Use a toy that rests. False if it is not owned or not ready. */
export function useToy(save: Save, id: string, nowMs: number): boolean {
  if (!save.toys.includes(id) || restLeft(save, id, nowMs) > 0) return false;
  save.toyAt[id] = nowMs;
  return true;
}

/** "in 12 min", "in 40 s". */
export const sayRest = (secs: number): string => (secs >= 90 ? `in ${Math.round(secs / 60)} min` : `in ${secs} s`);
