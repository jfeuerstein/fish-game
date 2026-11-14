// Everything that can be caught, as data. Pure.
import type { Zone } from '../world/island';

export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'junk';
export type Watch = 'any' | 'day' | 'night' | 'twilight';

export interface Species {
  id: string;
  name: string;
  zones: Zone[];
  tier: Tier;
  /** Length in centimetres: smallest and largest. */
  size: [number, number];
  /** What an average one sells for, in coins. */
  value: number;
  /** When it bites. */
  watch: Watch;
  /** Only in the rain. */
  rain?: boolean;
  /** How hard it fights, 0 to 1. */
  fight: number;
  /** A line for the journal. */
  note: string;
}

export const SPECIES: readonly Species[] = [
  // Ocean (off the beach, the near pier, the rocks)
  { id: 'sardine', name: 'Sardine', zones: ['ocean'], tier: 'common', size: [10, 22], value: 6, watch: 'any', fight: 0.1, note: 'Never alone. Somewhere out there are its thousand cousins.' },
  { id: 'mackerel', name: 'Mackerel', zones: ['ocean', 'deep'], tier: 'common', size: [25, 45], value: 10, watch: 'day', fight: 0.25, note: 'Wears its stripes like it means it.' },
  { id: 'flounder', name: 'Flounder', zones: ['ocean'], tier: 'common', size: [20, 50], value: 12, watch: 'any', fight: 0.2, note: 'Spends its life lying down. Respect.' },
  { id: 'sea-bass', name: 'Sea Bass', zones: ['ocean'], tier: 'uncommon', size: [30, 70], value: 26, watch: 'twilight', fight: 0.45, note: 'Likes the hour when the light goes gold.' },
  { id: 'red-snapper', name: 'Red Snapper', zones: ['ocean', 'deep'], tier: 'uncommon', size: [30, 80], value: 30, watch: 'day', fight: 0.45, note: 'Pink, proud, and a little bit dramatic.' },
  { id: 'pufferfish', name: 'Pufferfish', zones: ['ocean'], tier: 'uncommon', size: [12, 35], value: 34, watch: 'day', fight: 0.3, note: 'Puffs up when surprised. Same, honestly.' },
  { id: 'crab', name: 'Shore Crab', zones: ['ocean'], tier: 'common', size: [8, 20], value: 9, watch: 'night', fight: 0.2, note: 'Walks sideways out of every conversation.' },
  { id: 'squid', name: 'Squid', zones: ['ocean', 'deep'], tier: 'uncommon', size: [20, 60], value: 28, watch: 'night', fight: 0.4, note: 'Comes up to the lamps on the pier after dark.' },
  { id: 'seahorse', name: 'Seahorse', zones: ['ocean'], tier: 'rare', size: [8, 20], value: 70, watch: 'day', fight: 0.2, note: 'Tiny, upright and very polite.' },
  { id: 'jellyfish', name: 'Moon Jelly', zones: ['ocean'], tier: 'rare', size: [15, 40], value: 60, watch: 'night', rain: true, fight: 0.15, note: 'Drifts in on rainy nights like a little lamp.' },
  // Deep (the pier's head, and from the boat)
  { id: 'tuna', name: 'Bluefin Tuna', zones: ['deep'], tier: 'rare', size: [80, 220], value: 120, watch: 'day', fight: 0.8, note: 'All muscle. Bring snacks for the fight.' },
  { id: 'swordfish', name: 'Swordfish', zones: ['deep'], tier: 'epic', size: [120, 300], value: 260, watch: 'twilight', fight: 0.9, note: 'Shows up at dawn and dusk, sword first.' },
  { id: 'anglerfish', name: 'Anglerfish', zones: ['deep'], tier: 'epic', size: [20, 90], value: 220, watch: 'night', fight: 0.6, note: 'Brings its own night light.' },
  { id: 'octopus', name: 'Octopus', zones: ['deep', 'ocean'], tier: 'rare', size: [30, 120], value: 95, watch: 'night', fight: 0.65, note: 'Eight arms, and it uses all of them to hold on.' },
  { id: 'oarfish', name: 'Oarfish', zones: ['deep'], tier: 'legendary', size: [300, 800], value: 900, watch: 'any', rain: true, fight: 1, note: 'Sailors called it a sea serpent. It only rises in the rain.' },
  { id: 'coelacanth', name: 'Coelacanth', zones: ['deep'], tier: 'legendary', size: [120, 200], value: 1200, watch: 'night', fight: 0.95, note: 'Older than the dinosaurs, and in no hurry about it.' },
  // Pond
  { id: 'bluegill', name: 'Bluegill', zones: ['pond'], tier: 'common', size: [8, 25], value: 5, watch: 'day', fight: 0.1, note: 'The first fish everyone catches. A good friend.' },
  { id: 'perch', name: 'Yellow Perch', zones: ['pond', 'creek'], tier: 'common', size: [12, 35], value: 9, watch: 'any', fight: 0.2, note: 'Striped like a little bumblebee.' },
  { id: 'carp', name: 'Mirror Carp', zones: ['pond'], tier: 'uncommon', size: [30, 90], value: 24, watch: 'any', fight: 0.55, note: 'Heavy and patient. Wins most staring contests.' },
  { id: 'goldfish', name: 'Goldfish', zones: ['pond'], tier: 'uncommon', size: [6, 25], value: 22, watch: 'day', fight: 0.1, note: 'Somebody let it go years ago. It is thriving.' },
  { id: 'catfish', name: 'Catfish', zones: ['pond', 'creek'], tier: 'uncommon', size: [30, 120], value: 32, watch: 'night', fight: 0.6, note: 'Feels its way around with its whiskers.' },
  { id: 'turtle', name: 'Pond Turtle', zones: ['pond'], tier: 'rare', size: [15, 35], value: 65, watch: 'day', fight: 0.35, note: 'Was not, technically, trying to be caught.' },
  { id: 'koi', name: 'Koi', zones: ['pond'], tier: 'epic', size: [30, 90], value: 200, watch: 'twilight', fight: 0.5, note: 'Said to bring luck to whoever lets it go.' },
  { id: 'axolotl', name: 'Axolotl', zones: ['pond'], tier: 'legendary', size: [15, 30], value: 700, watch: 'night', rain: true, fight: 0.4, note: 'Smiles permanently. Comes out on rainy nights.' },
  // Creek
  { id: 'minnow', name: 'Minnow', zones: ['creek', 'pond'], tier: 'common', size: [4, 10], value: 3, watch: 'any', fight: 0.05, note: 'Small, quick, and everywhere.' },
  { id: 'trout', name: 'Rainbow Trout', zones: ['creek'], tier: 'common', size: [20, 60], value: 14, watch: 'day', fight: 0.35, note: 'A little rainbow down its side.' },
  { id: 'crayfish', name: 'Crayfish', zones: ['creek'], tier: 'common', size: [6, 15], value: 8, watch: 'night', fight: 0.15, note: 'A lobster that lives in the woods.' },
  { id: 'salmon', name: 'Salmon', zones: ['creek', 'ocean'], tier: 'uncommon', size: [40, 110], value: 40, watch: 'twilight', fight: 0.7, note: 'Always on its way somewhere upstream.' },
  { id: 'eel', name: 'River Eel', zones: ['creek'], tier: 'rare', size: [40, 120], value: 75, watch: 'night', fight: 0.6, note: 'Slippery in every sense.' },
  { id: 'pike', name: 'Pike', zones: ['creek', 'pond'], tier: 'rare', size: [50, 130], value: 85, watch: 'any', fight: 0.75, note: 'Waits in the reeds with a grin.' },
  { id: 'sturgeon', name: 'Sturgeon', zones: ['creek'], tier: 'epic', size: [100, 250], value: 240, watch: 'any', fight: 0.9, note: 'Armoured, whiskered, ancient. A creek elder.' },
  { id: 'golden-trout', name: 'Golden Trout', zones: ['creek'], tier: 'legendary', size: [25, 60], value: 650, watch: 'day', rain: true, fight: 0.6, note: 'Shines like a coin. Only bites in the rain.' },
  // Not fish
  { id: 'boot', name: 'Old Boot', zones: ['ocean', 'deep', 'pond', 'creek'], tier: 'junk', size: [25, 32], value: 1, watch: 'any', fight: 0.05, note: 'One day you will find the other one.' },
  { id: 'can', name: 'Tin Can', zones: ['ocean', 'deep', 'pond', 'creek'], tier: 'junk', size: [10, 14], value: 1, watch: 'any', fight: 0.05, note: 'Recycling it anyway.' },
  { id: 'seaweed', name: 'Seaweed', zones: ['ocean', 'deep'], tier: 'junk', size: [20, 60], value: 2, watch: 'any', fight: 0.05, note: 'Smells like the seaside.' },
  { id: 'bottle', name: 'Message in a Bottle', zones: ['ocean', 'deep'], tier: 'junk', size: [25, 30], value: 25, watch: 'any', fight: 0.05, note: '"Hope you are having a nice day." Signed, a stranger.' },
];

export const BY_ID: Readonly<Record<string, Species>> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export const TIER_COLOR: Record<Tier, string> = {
  common: '#7d8a96',
  uncommon: '#3f9a5c',
  rare: '#2f7fd1',
  epic: '#9b4fd0',
  legendary: '#e0a020',
  junk: '#9a7b5c',
};

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  junk: 'Junk',
};

export const ZONE_LABEL: Record<Zone, string> = { ocean: 'Ocean', deep: 'Deep water', pond: 'Pond', creek: 'Creek' };
export const WATCH_LABEL: Record<Watch, string> = { any: 'Any time', day: 'Daytime', night: 'Night', twilight: 'Dawn & dusk' };

/** A fish as caught: which, how long, and whether it is something special. */
export type Variant = 'normal' | 'shiny' | 'golden';
export interface Catch {
  species: string;
  size: number;
  variant: Variant;
  /** A size in the top few percent of its kind. */
  huge: boolean;
  /** When it was caught (ms since 1970). */
  at: number;
}

export const VARIANT_VALUE: Record<Variant, number> = { normal: 1, shiny: 2.5, golden: 6 };

/** What a catch sells for. */
export function valueOf(c: Catch): number {
  const s = BY_ID[c.species];
  if (!s) return 0;
  const [lo, hi] = s.size;
  const frac = hi > lo ? (c.size - lo) / (hi - lo) : 0.5;
  return Math.max(1, Math.round(s.value * (0.6 + 0.8 * frac) * VARIANT_VALUE[c.variant] * (c.huge ? 1.5 : 1)));
}

/** A length in centimetres, said nicely. */
export function sayLength(cm: number): string {
  return cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${cm.toFixed(1)} cm`;
}
