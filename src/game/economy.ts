// Rods, bait, things to buy, and levels. Pure data.
import type { Tier } from '../fishing/fish';

export interface Rod {
  id: string;
  name: string;
  price: number;
  level: number;
  /** Furthest cast, metres. */
  reach: number;
  /** How quickly line comes in. */
  power: number;
  /** How much strain the line takes before it snaps (higher is gentler). */
  control: number;
  /** Raises the odds of rare fish and special variants. */
  luck: number;
  /** How well the hook holds a fish that is getting away (1 when not given: set by `rigged`). */
  hold?: number;
  /** Seconds to hook a fish once it bites. */
  hook: number;
  blurb: string;
}

export const RODS: readonly Rod[] = [
  { id: 'rod-1', name: 'Willow Stick', price: 0, level: 1, reach: 15, power: 1, control: 1, luck: 0, hook: 0.9, blurb: 'A stick, some string and a lot of hope.' },
  { id: 'rod-2', name: 'Lakeside Rod', price: 450, level: 3, reach: 19, power: 1.2, control: 1.15, luck: 0.1, hook: 1.0, blurb: 'Fibreglass, cork handle, a reel that clicks nicely.' },
  { id: 'rod-3', name: 'Harbour Rod', price: 1600, level: 7, reach: 23, power: 1.45, control: 1.35, luck: 0.22, hook: 1.1, blurb: 'Built for the pier. Laughs at mackerel.' },
  { id: 'rod-4', name: 'Regal Rod', price: 5200, level: 12, reach: 27, power: 1.75, control: 1.6, luck: 0.38, hook: 1.2, blurb: 'Gold rings, deep purple, very fancy.' },
  { id: 'rod-5', name: 'Starlight Rod', price: 14000, level: 18, reach: 31, power: 2.1, control: 1.9, luck: 0.6, hook: 1.35, blurb: 'Hums softly when something rare is near.' },
];

export interface Bait {
  id: string;
  name: string;
  /** Coins for a pack of `pack`. */
  price: number;
  pack: number;
  level: number;
  /** Multiplies the weight of each tier. */
  boost: Partial<Record<Tier, number>>;
  /** Shortens the wait for a bite (1 is no change). */
  speed: number;
  /** Extra boost at night. */
  night?: number;
  /** Pushes sizes toward the top of the range. */
  size?: number;
  /** Chances of a fine, shiny, golden or prismatic catch. */
  quality: [number, number, number, number];
  /** Never sold: found on the island (see src/game/forage.ts). */
  found?: boolean;
  blurb: string;
}

export const BAITS: readonly Bait[] = [
  { id: 'bait-worm', name: 'Worms', price: 0, pack: 0, level: 1, boost: {}, speed: 1, quality: [0.08, 0.025, 0.005, 0.001], blurb: 'Free, wriggly, and every fish likes them a bit.' },
  { id: 'bait-cricket', name: 'Crickets', price: 40, pack: 10, level: 2, boost: { uncommon: 1.6, junk: 0.6 }, speed: 0.85, quality: [0.14, 0.045, 0.01, 0.002], blurb: 'Chirpy. Fish bite sooner, and fussier fish take notice.' },
  { id: 'bait-minnow', name: 'Minnows', price: 120, pack: 10, level: 5, boost: { uncommon: 1.4, rare: 2, epic: 1.4, junk: 0.4 }, speed: 0.9, size: 0.15, quality: [0.18, 0.07, 0.015, 0.003], blurb: 'Big fish eat little fish.' },
  { id: 'bait-glow', name: 'Glow Worms', price: 160, pack: 10, level: 8, boost: { rare: 1.6, epic: 1.6, legendary: 1.3, junk: 0.4 }, speed: 0.85, night: 2, quality: [0.2, 0.09, 0.025, 0.005], blurb: 'They shine in the dark water. Night fish love them, and shinier fish too.' },
  { id: 'bait-lure', name: 'Shrimp Paste', price: 300, pack: 10, level: 10, boost: { rare: 1.5, epic: 1.8 }, speed: 0.8, size: 0.35, quality: [0.24, 0.12, 0.035, 0.008], blurb: 'Smelly. Pulls in the biggest of each kind.' },
  { id: 'bait-golden', name: 'Gold Flakes', price: 900, pack: 5, level: 15, boost: { common: 0.5, rare: 2.4, epic: 3, legendary: 4, junk: 0.1 }, speed: 0.75, size: 0.2, quality: [0.28, 0.16, 0.07, 0.02], blurb: 'Legends rise for it, and so do the finest fish.' },
  { id: 'bait-crawler', name: 'Night Crawlers', price: 0, pack: 0, level: 1, found: true, boost: { uncommon: 1.5, rare: 1.5, junk: 0.5 }, speed: 0.8, size: 0.1, quality: [0.16, 0.06, 0.012, 0.003], blurb: 'Fat worms that come up after rain. Never sold: dig them up yourself.' },
];

/**
 * Line and hooks: the second thing to upgrade beside the rod. A stronger line takes more strain
 * before it snaps; a finer hook holds a fish that is getting away for longer, loses less line
 * to a leaping one, and gives a little longer to strike at a bite.
 */
export interface Line {
  id: string;
  name: string;
  price: number;
  level: number;
  /** Multiplies how much strain the line takes. */
  strength: number;
  blurb: string;
}
export interface Hook {
  id: string;
  name: string;
  price: number;
  level: number;
  /** Multiplies how well a fish is held. */
  hold: number;
  blurb: string;
}
export const LINES: readonly Line[] = [
  { id: 'line-1', name: 'Cotton Line', price: 0, level: 1, strength: 1, blurb: 'It came with the stick.' },
  { id: 'line-2', name: 'Braided Line', price: 380, level: 4, strength: 1.15, blurb: 'Three strands are stronger than one.' },
  { id: 'line-3', name: 'Sea Line', price: 1500, level: 9, strength: 1.3, blurb: 'What the trawlers use. Smells of it, too.' },
  { id: 'line-4', name: 'Spider Silk', price: 5400, level: 15, strength: 1.5, blurb: 'Almost nothing, and almost nothing breaks it.' },
];
export const HOOKS: readonly Hook[] = [
  { id: 'hook-1', name: 'Bent Pin', price: 0, level: 1, hold: 1, blurb: 'A pin, bent. It mostly works.' },
  { id: 'hook-2', name: 'Barbed Hook', price: 320, level: 3, hold: 1.25, blurb: 'What goes on stays on a little longer.' },
  { id: 'hook-3', name: 'Circle Hook', price: 1300, level: 8, hold: 1.5, blurb: 'Sets itself in the corner of the mouth.' },
  { id: 'hook-4', name: 'Lucky Hook', price: 4800, level: 14, hold: 1.8, blurb: 'Has never let one go. So Gus says.' },
];
export const lineById = (id: string): Line => LINES.find((l) => l.id === id) ?? LINES[0];
export const hookById = (id: string): Hook => HOOKS.find((h) => h.id === id) ?? HOOKS[0];

/** A rod as it is rigged: with its line's strength and its hook's hold. */
export function rigged(rod: Rod, line: Line, hook: Hook): Rod {
  return { ...rod, control: rod.control * line.strength, hook: rod.hook * (1 + (hook.hold - 1) * 0.35), hold: hook.hold };
}

/** Lures change how a catch is chosen. One at a time, never used up. */
export type LureEffect = 'none' | 'big' | 'small' | 'sparkle' | 'magnet' | 'twin' | 'lucky' | 'rain';
export interface Lure {
  id: string;
  name: string;
  price: number;
  level: number;
  effect: LureEffect;
  blurb: string;
}
export const LURES: readonly Lure[] = [
  { id: 'lure-none', name: 'Plain Hook', price: 0, level: 1, effect: 'none', blurb: 'Does the job.' },
  { id: 'lure-big', name: 'Chunky Lure', price: 500, level: 3, effect: 'big', blurb: 'Of three fish that might bite, the biggest does.' },
  { id: 'lure-small', name: 'Fly Hook', price: 300, level: 2, effect: 'small', blurb: 'Of three, the smallest bites. For tiny things.' },
  { id: 'lure-sparkle', name: 'Sparkle Lure', price: 1800, level: 8, effect: 'sparkle', blurb: 'Of three, the rarest bites.' },
  { id: 'lure-magnet', name: 'Magnet', price: 900, level: 5, effect: 'magnet', blurb: 'Treasure chests come up far more often. So does junk.' },
  { id: 'lure-twin', name: 'Twin Hook', price: 2400, level: 10, effect: 'twin', blurb: 'Sometimes two fish come up at once.' },
  { id: 'lure-lucky', name: 'Lucky Clover', price: 1500, level: 7, effect: 'lucky', blurb: 'A catch sometimes comes with a little bag of coins.' },
  { id: 'lure-rain', name: 'Rain Charm', price: 1200, level: 6, effect: 'rain', blurb: 'Catches often call a little rain cloud, and rain fish with it.' },
];
export const lureById = (id: string): Lure => LURES.find((l) => l.id === id) ?? LURES[0];

/** A metal detector, for buried things. */
export const DETECTOR = { price: 350, level: 2 } as const;

export interface Cooler {
  level: number;
  capacity: number;
  price: number;
}
export const COOLERS: readonly Cooler[] = [
  { level: 0, capacity: 12, price: 0 },
  { level: 1, capacity: 24, price: 600 },
  { level: 2, capacity: 40, price: 2400 },
  { level: 3, capacity: 70, price: 8000 },
];

/** Hats, bought at the shop (or given for errands done at the board). */
export interface Hat {
  id: string;
  name: string;
  price: number;
  /** Not sold: found in treasure and in the sand, or won at the Lucky Gull. */
  gift?: boolean;
  /** Not sold, and not found either: won only at the Lucky Gull. */
  prize?: boolean;
}
export const HATS: readonly Hat[] = [
  { id: 'hat-party', name: 'Party Hat', price: 90 },
  { id: 'hat-bucket', name: 'Bucket Hat', price: 120 },
  { id: 'hat-beanie', name: 'Pom Beanie', price: 150 },
  { id: 'hat-straw', name: 'Straw Hat', price: 220 },
  { id: 'hat-sailor', name: 'Sailor Hat', price: 0, prize: true },
  { id: 'hat-flowers', name: 'Flower Crown', price: 0, prize: true },
  { id: 'hat-cowboy', name: 'Cowboy Hat', price: 0, prize: true },
  { id: 'hat-cone', name: 'Traffic Cone', price: 0, prize: true },
  { id: 'hat-lampshade', name: 'Lampshade', price: 0, prize: true },
  { id: 'hat-bread', name: 'Loaf of Bread', price: 0, prize: true },
  { id: 'hat-captain', name: "Captain's Hat", price: 0, prize: true },
  { id: 'hat-propeller', name: 'Propeller Cap', price: 0, prize: true },
  { id: 'hat-chef', name: 'Chef Hat', price: 0, prize: true },
  { id: 'hat-top', name: 'Top Hat', price: 0, prize: true },
  { id: 'hat-pirate', name: 'Pirate Hat', price: 0, prize: true },
  { id: 'hat-viking', name: 'Viking Helmet', price: 0, prize: true },
  { id: 'hat-wizard', name: 'Wizard Hat', price: 0, prize: true },
  { id: 'hat-cake', name: 'Birthday Cake', price: 0, gift: true },
  { id: 'hat-duck', name: 'Rubber Duck', price: 0, gift: true },
  { id: 'hat-crab', name: 'Grumpy Crab', price: 0, prize: true },
  { id: 'hat-shark', name: 'Shark Hood', price: 0, prize: true },
  { id: 'hat-frog', name: 'Frog Hat', price: 0, gift: true },
  { id: 'hat-mushroom', name: 'Mushroom Cap', price: 0, gift: true },
  { id: 'hat-fish', name: 'Fish Hat', price: 0, prize: true },
  { id: 'hat-crown', name: 'Little Crown', price: 0, prize: true },
];

/** Things to set down around the island. */
export interface Furniture {
  id: string;
  name: string;
  price: number;
  /** Can be sat on. */
  seat?: boolean;
  /** Glows after dark. */
  glow?: boolean;
  /** Not sold: won only at the Lucky Gull. */
  prize?: boolean;
  /** Plays music nearby. */
  music?: boolean;
  /** In the camp catalogue: the things a campsite is made of. */
  camp?: boolean;
  /** Fish can be kept in it. */
  store?: boolean;
  /** Not sold by Gus: only by the trader who comes by boat. */
  trader?: boolean;
  /** Not sold or won: earned on a far island. */
  earned?: boolean;
  /** A fire: it has a flame, and throws a flickering light after dark. */
  fire?: boolean;
  /** Throws real light after dark, not only a glow. */
  lamp?: boolean;
}
export const FURNITURE: readonly Furniture[] = [
  { id: 'f-chair', name: 'Camp Chair', price: 180, seat: true, camp: true },
  { id: 'f-cooler', name: 'Picnic Cooler', price: 120, camp: true },
  { id: 'f-lantern', name: 'Lantern', price: 260, glow: true, camp: true },
  { id: 'f-plant', name: 'Potted Plant', price: 200 },
  { id: 'f-umbrella', name: 'Beach Umbrella', price: 340 },
  { id: 'f-radio', name: 'Radio', price: 0, prize: true, music: true },
  { id: 'f-flamingo', name: 'Lawn Flamingo', price: 0, prize: true },
  { id: 'f-gnome', name: 'Fishing Gnome', price: 0, prize: true },
  { id: 'f-tiki', name: 'Tiki Torch', price: 0, prize: true, glow: true },
  { id: 'f-hammock', name: 'Hammock', price: 900, seat: true, camp: true },
  { id: 'f-telescope', name: 'Telescope', price: 0, prize: true },
  { id: 'f-snowman', name: 'Snowman', price: 0, prize: true },
  // The camp catalogue: with the chair, cooler, lantern and hammock above, what a campsite is made of.
  { id: 'f-tent', name: 'Canvas Tent', price: 650, camp: true },
  { id: 'f-firepit', name: 'Campfire', price: 320, camp: true, fire: true, glow: true },
  { id: 'f-bedroll', name: 'Bedroll', price: 220, camp: true, seat: true },
  { id: 'f-stump', name: 'Stump Stool', price: 90, camp: true, seat: true },
  { id: 'f-table', name: 'Camp Table', price: 240, camp: true },
  { id: 'f-stove', name: 'Stove and Kettle', price: 300, camp: true },
  { id: 'f-woodpile', name: 'Woodpile', price: 140, camp: true },
  { id: 'f-lights', name: 'String Lights', price: 480, camp: true, glow: true, lamp: true },
  { id: 'f-washline', name: 'Washing Line', price: 200, camp: true },
  { id: 'f-chest', name: 'Camp Chest', price: 450, camp: true, store: true },
  { id: 'f-campsign', name: 'Camp Sign', price: 120, camp: true },
  // Sold only by the trader who comes by boat (src/game/trader.ts).
  { id: 'f-chime', name: 'Shell Wind Chime', price: 380, trader: true },
  { id: 'f-shipbottle', name: 'Ship in a Bottle', price: 520, trader: true },
  // Earned on Glowmere.
  { id: 'f-glowshroom', name: 'Pot of Glowshrooms', price: 0, earned: true, glow: true, lamp: true },
];

/** Things to wear besides hats. `prize` ones are won at the Lucky Gull, not sold. */
export const EXTRAS: readonly { id: string; name: string; price: number; prize?: boolean }[] = [
  { id: 'x-flower', name: 'Flower Pin', price: 200 },
  { id: 'x-bowtie', name: 'Bow Tie', price: 0, prize: true },
  { id: 'x-glasses', name: 'Round Glasses', price: 0, prize: true },
  { id: 'x-scarf', name: 'Cosy Scarf', price: 350 },
  { id: 'x-shades', name: 'Sunglasses', price: 0, prize: true },
  { id: 'x-backpack', name: 'Backpack', price: 0, prize: true },
  { id: 'x-mustache', name: 'Fine Mustache', price: 0, prize: true },
  { id: 'x-snorkel', name: 'Snorkel Mask', price: 0, prize: true },
];

/** Characters the player can be. */
export const CHARACTERS = [
  { id: 'char-otter', name: 'Otter' },
  { id: 'char-frog', name: 'Frog' },
  { id: 'char-raccoon', name: 'Raccoon' },
] as const;

/** The rowboat's licence, sold at the shop once the player has found their feet. */
export const BOAT_LICENCE = { price: 800, level: 4 } as const;

/** Experience for a catch of each tier. */
export const TIER_XP: Record<Tier, number> = { junk: 2, common: 8, uncommon: 18, rare: 40, epic: 90, legendary: 250 };

/** Experience needed to go from `level` to the next. */
export function xpToNext(level: number): number {
  return Math.round(40 + 22 * Math.pow(level, 1.45));
}

/** The level for a total of experience, and how far into it. */
export function levelFor(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let left = xp;
  while (left >= xpToNext(level) && level < 99) {
    left -= xpToNext(level);
    level++;
  }
  return { level, into: left, need: xpToNext(level) };
}

export const rodById = (id: string): Rod => RODS.find((r) => r.id === id) ?? RODS[0];
export const baitById = (id: string): Bait => BAITS.find((b) => b.id === id) ?? BAITS[0];

/** Paint for the rod: won at the Lucky Gull, never sold. The colour is what the rod's own is multiplied by. */
export const PAINTS: readonly { id: string; name: string; colour: number; earned?: boolean; glows?: boolean }[] = [
  { id: 'paint-coral', name: 'Coral Paint', colour: 0xf08c62 },
  { id: 'paint-sea', name: 'Sea Blue Paint', colour: 0x7fbbe6 },
  { id: 'paint-moss', name: 'Moss Paint', colour: 0x93b85a },
  { id: 'paint-brass', name: 'Gilt Paint', colour: 0xecc77d },
  { id: 'paint-rose', name: 'Rose Paint', colour: 0xf2a8b0 },
  { id: 'paint-ink', name: 'Ink Paint', colour: 0x4f6d7c },
  // Earned on the far islands (src/game/isles.ts), not won. The last gives off its own light.
  { id: 'paint-frost', name: 'Frost Paint', colour: 0xc6e4f4, earned: true },
  { id: 'paint-mire', name: 'Mire Paint', colour: 0x5c8f44, earned: true },
  { id: 'paint-glow', name: 'Glow Paint', colour: 0x62c0b0, earned: true, glows: true },
  { id: 'paint-sky', name: 'Sky Paint', colour: 0x7fbbe6, earned: true },
  { id: 'paint-sand', name: 'Sand Paint', colour: 0xecc77d, earned: true },
];

/** Charms to hang from the rod: won at the Lucky Gull, never sold. */
export const CHARMS: readonly { id: string; name: string; earned?: boolean }[] = [
  { id: 'charm-bell', name: 'Brass Bell' },
  { id: 'charm-feather', name: 'Gull Feather' },
  { id: 'charm-shell', name: 'Pink Shell' },
  { id: 'charm-star', name: 'Lucky Star' },
  { id: 'charm-fish', name: 'Wooden Fish' },
  { id: 'charm-moon', name: 'Tin Moon' },
  { id: 'charm-icicle', name: 'Icicle', earned: true },
  { id: 'charm-claw', name: 'Crab Claw', earned: true },
  { id: 'charm-ember', name: 'Ember', earned: true },
  { id: 'charm-seed', name: 'Dandelion Seed', earned: true },
  { id: 'charm-hourglass', name: 'Hourglass', earned: true },
];
