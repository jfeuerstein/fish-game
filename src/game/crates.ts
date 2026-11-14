// Pearls (the save calls them tokens) are the premium currency: only the rarest catches give
// them, and they are spent at the Lucky Gull on chests and games that pay out cosmetics, never
// coins. A chest: a strip of prizes spins past and slows to a stop on one. Pure.
import { rng } from '../core/rng';
import type { Variant } from '../fishing/fish';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Prize {
  id: string;
  name: string;
  rarity: Rarity;
  kind: 'hat' | 'character' | 'furniture' | 'extra';
}

/** Everything a chest can hold. Some things (the frog and raccoon, the crown) come only from chests. */
export const PRIZES: readonly Prize[] = [
  { id: 'hat-bucket', name: 'Bucket Hat', rarity: 'common', kind: 'hat' },
  { id: 'hat-beanie', name: 'Pom Beanie', rarity: 'common', kind: 'hat' },
  { id: 'hat-straw', name: 'Straw Hat', rarity: 'common', kind: 'hat' },
  { id: 'hat-sailor', name: 'Sailor Hat', rarity: 'common', kind: 'hat' },
  { id: 'hat-party', name: 'Party Hat', rarity: 'common', kind: 'hat' },
  { id: 'f-cooler', name: 'Picnic Cooler', rarity: 'common', kind: 'furniture' },
  { id: 'f-plant', name: 'Potted Plant', rarity: 'common', kind: 'furniture' },
  { id: 'hat-flowers', name: 'Flower Crown', rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-cowboy', name: 'Cowboy Hat', rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-chef', name: 'Chef Hat', rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-propeller', name: 'Propeller Cap', rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-cake', name: 'Birthday Cake', rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-cone', name: 'Traffic Cone', rarity: 'uncommon', kind: 'hat' },
  { id: 'f-flamingo', name: 'Lawn Flamingo', rarity: 'uncommon', kind: 'furniture' },
  { id: 'f-gnome', name: 'Fishing Gnome', rarity: 'uncommon', kind: 'furniture' },
  { id: 'hat-captain', name: "Captain's Hat", rarity: 'rare', kind: 'hat' },
  { id: 'hat-top', name: 'Top Hat', rarity: 'rare', kind: 'hat' },
  { id: 'hat-frog', name: 'Frog Hat', rarity: 'rare', kind: 'hat' },
  { id: 'hat-mushroom', name: 'Mushroom Cap', rarity: 'rare', kind: 'hat' },
  { id: 'hat-duck', name: 'Rubber Duck', rarity: 'rare', kind: 'hat' },
  { id: 'hat-bread', name: 'Loaf of Bread', rarity: 'rare', kind: 'hat' },
  { id: 'x-mustache', name: 'Fine Mustache', rarity: 'rare', kind: 'extra' },
  { id: 'f-tiki', name: 'Tiki Torch', rarity: 'rare', kind: 'furniture' },
  { id: 'f-radio', name: 'Radio', rarity: 'rare', kind: 'furniture' },
  { id: 'hat-pirate', name: 'Pirate Hat', rarity: 'epic', kind: 'hat' },
  { id: 'hat-viking', name: 'Viking Helmet', rarity: 'epic', kind: 'hat' },
  { id: 'hat-fish', name: 'Fish Hat', rarity: 'epic', kind: 'hat' },
  { id: 'hat-crab', name: 'Grumpy Crab', rarity: 'epic', kind: 'hat' },
  { id: 'hat-shark', name: 'Shark Hood', rarity: 'epic', kind: 'hat' },
  { id: 'x-snorkel', name: 'Snorkel Mask', rarity: 'epic', kind: 'extra' },
  { id: 'f-telescope', name: 'Telescope', rarity: 'epic', kind: 'furniture' },
  { id: 'char-raccoon', name: 'Raccoon', rarity: 'epic', kind: 'character' },
  { id: 'hat-crown', name: 'Little Crown', rarity: 'legendary', kind: 'hat' },
  { id: 'hat-wizard', name: 'Wizard Hat', rarity: 'legendary', kind: 'hat' },
  { id: 'char-frog', name: 'Frog', rarity: 'legendary', kind: 'character' },
  { id: 'f-snowman', name: 'Snowman', rarity: 'legendary', kind: 'furniture' },
];

export const RARITY_COLOR: Record<Rarity, string> = { common: '#8d9aa6', uncommon: '#4aa85e', rare: '#3b82d6', epic: '#9b4fd0', legendary: '#e0a020' };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

export interface Chest {
  id: string;
  name: string;
  cost: number;
  /** Chance of each rarity, summing to 1. */
  odds: Record<Rarity, number>;
  blurb: string;
}

export const CHESTS: readonly Chest[] = [
  { id: 'tide', name: 'Tide Chest', cost: 2, odds: { common: 0.55, uncommon: 0.26, rare: 0.13, epic: 0.05, legendary: 0.01 }, blurb: 'Washed up on the beach. Mostly hats.' },
  { id: 'gilded', name: 'Gilded Chest', cost: 5, odds: { common: 0.2, uncommon: 0.32, rare: 0.28, epic: 0.15, legendary: 0.05 }, blurb: 'Heavier. Something rattles inside.' },
];

/**
 * How many pearls a catch is worth: only the rarest. A golden fish 1, a prismatic one 3, any
 * legendary fish 2 more (and 2 again the first time), the first of each epic kind 1.
 */
export function tokensFor(variant: Variant, tier = 'common', first = false): number {
  const v = ({ normal: 0, fine: 0, shiny: 0, golden: 1, prismatic: 3 } as const)[variant];
  const t = tier === 'legendary' ? 2 + (first ? 2 : 0) : tier === 'epic' && first ? 1 : 0;
  return v + t;
}

/** What a prize already owned is worth instead, in tokens. */
export const REFUND: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 4 };

function pickRarity(odds: Record<Rarity, number>, r: number): Rarity {
  let acc = 0;
  for (const k of ['legendary', 'epic', 'rare', 'uncommon', 'common'] as Rarity[]) {
    acc += odds[k];
    if (r < acc) return k;
  }
  return 'common';
}

/**
 * A prize of a rarity, from everything a chest or game can give. What the player does not have
 * yet is three times as likely, so the shelves fill rather than repeat.
 */
export function pickPrize(rarity: Rarity, owned: (p: Prize) => boolean, rand: () => number): Prize {
  const pool = PRIZES.filter((p) => p.rarity === rarity);
  const weights = pool.map((p) => (owned(p) ? 1 : 3));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Open a chest: which prize it gives. */
export function openChest(chest: Chest, rand: () => number, owned: (p: Prize) => boolean = () => false): Prize {
  return pickPrize(pickRarity(chest.odds, rand()), owned, rand);
}

/** How many tiles the strip has, and where the winner sits on it. */
export const STRIP_LENGTH = 56;
export const WIN_AT = 48;

/** The strip that spins past: random prizes (by the chest's odds), with the winner at WIN_AT. */
export function makeStrip(chest: Chest, winner: Prize, seed: number): Prize[] {
  const r = rng(seed);
  const strip: Prize[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) strip.push(i === WIN_AT ? winner : openChest(chest, r));
  // A near miss just after the winner makes the stop more exciting.
  if (winner.rarity !== 'legendary' && r() < 0.5) {
    const shiny = PRIZES.filter((p) => p.rarity === 'legendary');
    strip[WIN_AT + 1] = shiny[Math.floor(r() * shiny.length)];
  }
  return strip;
}
