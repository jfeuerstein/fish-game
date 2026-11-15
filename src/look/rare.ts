// Skies that are not there every day: the northern lights, a blood moon, and a sunrise that
// fills the sky. Each is decided by the island's day alone, so it is the same for the whole of
// that night or dawn, and only shows when the weather is clear. Pure.

export type RareSky = 'aurora' | 'bloodmoon' | 'sunrise';

export const RARE_SKIES: readonly RareSky[] = ['aurora', 'bloodmoon', 'sunrise'];

/** How often each comes: one night (or dawn) in so many. */
export const RARE_EVERY: Record<RareSky, number> = { aurora: 7, bloodmoon: 13, sunrise: 5 };

/** The hours each is seen between (a night's wrap past midnight). */
export const RARE_HOURS: Record<RareSky, readonly [number, number]> = { aurora: [21, 4.2], bloodmoon: [20.6, 4.6], sunrise: [5.1, 7.8] };

const stir = (n: number): number => {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

const within = (hour: number, [from, to]: readonly [number, number]): boolean => (from <= to ? hour >= from && hour < to : hour >= from || hour < to);

/** The night an hour belongs to: the evening's day, so the small hours are the night before's. */
export const nightOf = (day: number, hour: number): number => (hour >= 12 ? day : day - 1);

/** Which of them a night has, if any. A blood moon comes first: the lights would be lost in it. */
export function nightSky(night: number): RareSky | null {
  if (stir(night * 3 + 1) % RARE_EVERY.bloodmoon === 0) return 'bloodmoon';
  if (stir(night * 3 + 2) % RARE_EVERY.aurora === 0) return 'aurora';
  return null;
}

/** Whether a day begins with the great sunrise. */
export const dawnSky = (day: number): boolean => stir(day * 3) % RARE_EVERY.sunrise === 0;

/** What is in the sky on a day of the island at an hour, in clear weather. */
export function rareSkyAt(day: number, hour: number, clear: boolean): RareSky | null {
  if (!clear) return null;
  if (within(hour, RARE_HOURS.sunrise)) return dawnSky(day) ? 'sunrise' : null;
  const sky = nightSky(nightOf(day, hour));
  return sky && within(hour, RARE_HOURS[sky]) ? sky : null;
}

/** What is said the first moment each is seen on a night. */
export const RARE_SAYS: Record<RareSky, string> = {
  aurora: 'The northern lights are out tonight.',
  bloodmoon: 'The moon has come up red.',
  sunrise: 'The whole sky is on fire this morning.',
};
