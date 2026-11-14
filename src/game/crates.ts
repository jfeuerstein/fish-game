// Pearls (the save calls them tokens) are the premium currency: only the rarest catches give
// them, and they are spent at the Lucky Gull on chests and games that pay out cosmetics, never
// coins. Pure.
import { rng } from '../core/rng';
import type { Variant } from '../fishing/fish';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Prize {
  id: string;
  name: string;
  rarity: Rarity;
  kind: 'hat' | 'character' | 'furniture' | 'extra';
}

/**
 * Everything the Lucky Gull's games and chests can give. None of it is sold for coins: these are
 * the things only pearls win (a few gift hats also wash up in treasure and in the sand).
 */
export const PRIZES: readonly Prize[] = [
  { id: 'hat-propeller', name: 'Propeller Cap', rarity: 'common', kind: 'hat' },
  { id: 'hat-cake', name: 'Birthday Cake', rarity: 'common', kind: 'hat' },
  { id: 'f-flamingo', name: 'Lawn Flamingo', rarity: 'common', kind: 'furniture' },
  { id: 'f-radio', name: 'Radio', rarity: 'common', kind: 'furniture' },
  { id: 'hat-captain', name: "Captain's Hat", rarity: 'uncommon', kind: 'hat' },
  { id: 'hat-duck', name: 'Rubber Duck', rarity: 'uncommon', kind: 'hat' },
  { id: 'x-mustache', name: 'Fine Mustache', rarity: 'uncommon', kind: 'extra' },
  { id: 'f-gnome', name: 'Fishing Gnome', rarity: 'uncommon', kind: 'furniture' },
  { id: 'f-tiki', name: 'Tiki Torch', rarity: 'uncommon', kind: 'furniture' },
  { id: 'hat-top', name: 'Top Hat', rarity: 'rare', kind: 'hat' },
  { id: 'hat-mushroom', name: 'Mushroom Cap', rarity: 'rare', kind: 'hat' },
  { id: 'hat-frog', name: 'Frog Hat', rarity: 'rare', kind: 'hat' },
  { id: 'hat-crab', name: 'Grumpy Crab', rarity: 'rare', kind: 'hat' },
  { id: 'f-telescope', name: 'Telescope', rarity: 'rare', kind: 'furniture' },
  { id: 'hat-pirate', name: 'Pirate Hat', rarity: 'epic', kind: 'hat' },
  { id: 'hat-viking', name: 'Viking Helmet', rarity: 'epic', kind: 'hat' },
  { id: 'hat-fish', name: 'Fish Hat', rarity: 'epic', kind: 'hat' },
  { id: 'hat-shark', name: 'Shark Hood', rarity: 'epic', kind: 'hat' },
  { id: 'x-snorkel', name: 'Snorkel Mask', rarity: 'epic', kind: 'extra' },
  { id: 'char-raccoon', name: 'Raccoon', rarity: 'epic', kind: 'character' },
  { id: 'hat-crown', name: 'Little Crown', rarity: 'legendary', kind: 'hat' },
  { id: 'hat-wizard', name: 'Wizard Hat', rarity: 'legendary', kind: 'hat' },
  { id: 'char-frog', name: 'Frog', rarity: 'legendary', kind: 'character' },
  { id: 'f-snowman', name: 'Snowman', rarity: 'legendary', kind: 'furniture' },
];

export const RARITY_COLOR: Record<Rarity, string> = { common: '#8d9aa6', uncommon: '#4aa85e', rare: '#3b82d6', epic: '#9b4fd0', legendary: '#e0a020' };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

/**
 * The one roll every game at the Lucky Gull makes: a pearl in, a cosmetic out, of a rarity drawn
 * from these odds. The games (a strip, reels, a leaping fish, a scratch card) only show it.
 */
export const PULL_COST = 1;
export const ODDS: Record<Rarity, number> = { common: 0.46, uncommon: 0.3, rare: 0.15, epic: 0.07, legendary: 0.02 };

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
export const REFUND: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 3, legendary: 5 };

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

/** The roll: a prize, by the odds, favouring what is not owned yet. */
export function rollPrize(rand: () => number, owned: (p: Prize) => boolean = () => false): Prize {
  return pickPrize(pickRarity(ODDS, rand()), owned, rand);
}

/** How many tiles the strip has, and where the winner sits on it. */
export const STRIP_LENGTH = 56;
export const WIN_AT = 48;

/** The strip that spins past: random prizes (by the odds), with the winner at WIN_AT. */
export function makeStrip(winner: Prize, seed: number): Prize[] {
  const r = rng(seed);
  const strip: Prize[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) strip.push(i === WIN_AT ? winner : rollPrize(r));
  // A near miss just after the winner makes the stop more exciting.
  if (winner.rarity !== 'legendary' && r() < 0.5) {
    const shiny = PRIZES.filter((p) => p.rarity === 'legendary');
    strip[WIN_AT + 1] = shiny[Math.floor(r() * shiny.length)];
  }
  return strip;
}
