// The trader who comes by boat. Some mornings there is a second rowboat pulled up on the beach
// and a stall beside it; by dark it is gone. They sell what Gus does not: a couple of things to
// set down that nobody else has, good bait by the bundle, and, once a visit, a pearl for coins.
// Which days, and what is on the stall, come from the day alone. Pure.
import type { Save } from './save';

export const TRADER_NAME = 'Tansy';

/** The hours the stall is up. */
export const TRADER_HOURS: readonly [number, number] = [7, 19.5];

const stir = (n: number): number => {
  let h = (n ^ 0x51ed270b) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
};

/** Whether the trader comes on a day: about two days in seven, never two days running. */
export function traderDay(day: number): boolean {
  const comes = (d: number): boolean => stir(d) % 7 < 3;
  return comes(day) && !comes(day - 1);
}

/** Whether the stall is up now. */
export const traderHere = (day: number, hour: number): boolean => traderDay(day) && hour >= TRADER_HOURS[0] && hour < TRADER_HOURS[1];

export interface Ware {
  id: string;
  name: string;
  blurb: string;
  price: number;
  /** What buying it gives. */
  gives: { furniture?: string; bait?: { id: string; count: number }; pearls?: number; chart?: boolean };
  /** The picture it is shown with. */
  icon: string;
}

/** Everything the trader ever carries. Two things to set down are always on the stall; the rest come and go. */
export const WARES: readonly Ware[] = [
  { id: 'chime', name: 'Shell Wind Chime', blurb: 'Shells on strings. It knocks about in any wind.', price: 380, gives: { furniture: 'f-chime' }, icon: 'f-chime' },
  { id: 'bottle', name: 'Ship in a Bottle', blurb: 'Nobody will say how the ship got in.', price: 520, gives: { furniture: 'f-shipbottle' }, icon: 'f-shipbottle' },
  { id: 'pearl', name: 'A Pearl', blurb: 'One, from far off. For the gull, I expect.', price: 900, gives: { pearls: 1 }, icon: 'ticket-lucky' },
  { id: 'chart', name: 'Sea Chart', blurb: 'The way to Kettle Isle, past the buoy south of the pier head. Nobody lives there. Mind the reef.', price: 600, gives: { chart: true }, icon: 'icon-map' },
  { id: 'glow', name: 'Glow Grubs, a dozen', blurb: 'Cheaper than Gus, and livelier.', price: 150, gives: { bait: { id: 'bait-glow', count: 12 } }, icon: 'bait-glow' },
  { id: 'minnows', name: 'Minnows, a bucket', blurb: 'Twenty, give or take the ones that got out.', price: 110, gives: { bait: { id: 'bait-minnow', count: 20 } }, icon: 'bait-minnow' },
  { id: 'golden', name: 'Golden Flies, three', blurb: 'From an island where everything is a bit much.', price: 420, gives: { bait: { id: 'bait-golden', count: 3 } }, icon: 'bait-golden' },
  { id: 'crawlers', name: 'Night Crawlers, a tin', blurb: 'Dug them myself. Do not ask where.', price: 90, gives: { bait: { id: 'bait-crawler', count: 8 } }, icon: 'bait-crawler' },
];

/** How many of the wares are on the stall every visit (the rest are bait, two a day). */
const ALWAYS = 4;

/** What is on the stall on a day: the two things to set down, the pearl, the chart, and two of the baits. */
export function stock(day: number): Ware[] {
  const baits = WARES.slice(ALWAYS);
  const first = stir(day * 7 + 1) % baits.length;
  const second = (first + 1 + (stir(day * 7 + 2) % (baits.length - 1))) % baits.length;
  return [...WARES.slice(0, ALWAYS), baits[first], baits[second]];
}

/** Whether a ware has been bought on this visit: each is sold once a visit. */
export const sold = (save: Save, day: number, ware: Ware): boolean => (ware.gives.chart && save.seaChart) || (save.trader.day === day && save.trader.bought.includes(ware.id));

/** Buy a ware. False if it was bought already this visit or there are not the coins. */
export function buyWare(save: Save, day: number, ware: Ware): boolean {
  if (sold(save, day, ware) || save.coins < ware.price) return false;
  save.coins -= ware.price;
  if (save.trader.day !== day) save.trader = { day, bought: [] };
  save.trader.bought.push(ware.id);
  if (ware.gives.furniture) save.furniture[ware.gives.furniture] = (save.furniture[ware.gives.furniture] ?? 0) + 1;
  if (ware.gives.bait) save.baits[ware.gives.bait.id] = (save.baits[ware.gives.bait.id] ?? 0) + ware.gives.bait.count;
  if (ware.gives.pearls) save.tokens += ware.gives.pearls;
  if (ware.gives.chart) {
    save.seaChart = true;
    if (!save.charts.includes('kettle')) save.charts.push('kettle');
  }
  return true;
}

export const TRADER_LINES: readonly string[] = [
  'Morning. I row in when the wind lets me and out again before dark.',
  'The next island over has a pond you could lose a boat in. Fish in it the size of doors.',
  'I do not sell hats. Ask the gull about hats.',
  'Your shopkeeper and I have an understanding. He sells the useful things.',
  'Somebody on the trawler waves at me every time. I have never once seen their face.',
  'If the lights are in the sky tonight, I shall be sorry to have left.',
];
