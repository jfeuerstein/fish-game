// Pearls (the save calls them tokens) are the premium currency: only the rarest catches give
// them, and they are spent at the Lucky Gull on chests and games that pay out cosmetics, never
// coins. Pure.
import { rng } from '../core/rng';
import type { Variant } from '../fishing/fish';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** The Lucky Gull's four games. */
export type GameId = 'wheel' | 'bandit' | 'fish' | 'scratch';
export const GAMES: readonly GameId[] = ['wheel', 'bandit', 'fish', 'scratch'];
export const GAME_NAME: Record<GameId, string> = { wheel: 'the Gull Wheel', bandit: 'the Bait Bandit', fish: 'Flying Fish', scratch: 'the scratch cards' };

export interface Prize {
  id: string;
  name: string;
  rarity: Rarity;
  kind: 'hat' | 'character' | 'furniture' | 'extra' | 'paint' | 'charm' | 'toy';
  /** The one game it can be won at. Without this, any of them. */
  only?: GameId;
}

/**
 * Everything the Lucky Gull's games can give. None of it is sold for coins: these are the
 * things only pearls win (a few gift hats also wash up in treasure and in the sand). Most of
 * what there is to wear is here, not in Gus's shop: the owner wanted cosmetics won, not bought.
 * Each game has prizes that come from it alone (`only`), of every rarity, beside the ones any
 * game gives: the wheel has the grand hats, the bandit dresses the rod, the flying fish has
 * the sea and the sky, the scratch cards have the silly things.
 */
export const PRIZES: readonly Prize[] = [
  // Any game.
  { id: 'f-flamingo', name: 'Lawn Flamingo', rarity: 'common', kind: 'furniture' },
  { id: 'f-radio', name: 'Radio', rarity: 'common', kind: 'furniture' },
  { id: 'paint-moss', name: 'Moss Paint', rarity: 'common', kind: 'paint' },
  { id: 'hat-duck', name: 'Rubber Duck', rarity: 'uncommon', kind: 'hat' },
  { id: 'f-gnome', name: 'Fishing Gnome', rarity: 'uncommon', kind: 'furniture' },
  { id: 'f-tiki', name: 'Tiki Torch', rarity: 'uncommon', kind: 'furniture' },
  { id: 'x-glasses', name: 'Round Glasses', rarity: 'uncommon', kind: 'extra' },
  { id: 'hat-mushroom', name: 'Mushroom Cap', rarity: 'rare', kind: 'hat' },
  { id: 'hat-frog', name: 'Frog Hat', rarity: 'rare', kind: 'hat' },
  { id: 'hat-crab', name: 'Grumpy Crab', rarity: 'rare', kind: 'hat' },
  { id: 'f-telescope', name: 'Telescope', rarity: 'rare', kind: 'furniture' },
  { id: 'hat-viking', name: 'Viking Helmet', rarity: 'epic', kind: 'hat' },
  { id: 'x-snorkel', name: 'Snorkel Mask', rarity: 'epic', kind: 'extra' },
  { id: 'x-backpack', name: 'Backpack', rarity: 'epic', kind: 'extra' },
  { id: 'paint-ink', name: 'Ink Paint', rarity: 'epic', kind: 'paint' },
  { id: 'char-raccoon', name: 'Raccoon', rarity: 'epic', kind: 'character' },
  { id: 'char-frog', name: 'Frog', rarity: 'legendary', kind: 'character' },
  // The toys (src/game/toys.ts): the rarest prizes, which change how the island is got about or fished.
  { id: 'toy-skateboard', name: 'Skateboard', rarity: 'legendary', kind: 'toy' },
  // Only the Gull Wheel: the grand hats.
  { id: 'hat-sailor', name: 'Sailor Hat', rarity: 'common', kind: 'hat', only: 'wheel' },
  { id: 'hat-captain', name: "Captain's Hat", rarity: 'uncommon', kind: 'hat', only: 'wheel' },
  { id: 'charm-feather', name: 'Gull Feather', rarity: 'uncommon', kind: 'charm', only: 'wheel' },
  { id: 'hat-top', name: 'Top Hat', rarity: 'rare', kind: 'hat', only: 'wheel' },
  { id: 'hat-pirate', name: 'Pirate Hat', rarity: 'epic', kind: 'hat', only: 'wheel' },
  { id: 'hat-crown', name: 'Little Crown', rarity: 'legendary', kind: 'hat', only: 'wheel' },
  { id: 'toy-bottle', name: 'Storm in a Bottle', rarity: 'legendary', kind: 'toy', only: 'wheel' },
  // Only the Bait Bandit: things for the rod, and for someone who means business.
  { id: 'x-bowtie', name: 'Bow Tie', rarity: 'common', kind: 'extra', only: 'bandit' },
  { id: 'hat-cowboy', name: 'Cowboy Hat', rarity: 'uncommon', kind: 'hat', only: 'bandit' },
  { id: 'paint-coral', name: 'Coral Paint', rarity: 'uncommon', kind: 'paint', only: 'bandit' },
  { id: 'hat-chef', name: 'Chef Hat', rarity: 'rare', kind: 'hat', only: 'bandit' },
  { id: 'charm-bell', name: 'Brass Bell', rarity: 'rare', kind: 'charm', only: 'bandit' },
  { id: 'hat-fish', name: 'Fish Hat', rarity: 'epic', kind: 'hat', only: 'bandit' },
  { id: 'charm-fish', name: 'Wooden Fish', rarity: 'epic', kind: 'charm', only: 'bandit' },
  { id: 'paint-brass', name: 'Gilt Paint', rarity: 'legendary', kind: 'paint', only: 'bandit' },
  { id: 'toy-bell', name: 'Dinner Bell', rarity: 'legendary', kind: 'toy', only: 'bandit' },
  // Only Flying Fish: the sea and the sky.
  { id: 'hat-propeller', name: 'Propeller Cap', rarity: 'common', kind: 'hat', only: 'fish' },
  { id: 'hat-flowers', name: 'Flower Crown', rarity: 'uncommon', kind: 'hat', only: 'fish' },
  { id: 'paint-sea', name: 'Sea Blue Paint', rarity: 'uncommon', kind: 'paint', only: 'fish' },
  { id: 'x-shades', name: 'Sunglasses', rarity: 'rare', kind: 'extra', only: 'fish' },
  { id: 'charm-star', name: 'Lucky Star', rarity: 'rare', kind: 'charm', only: 'fish' },
  { id: 'hat-shark', name: 'Shark Hood', rarity: 'epic', kind: 'hat', only: 'fish' },
  { id: 'charm-moon', name: 'Tin Moon', rarity: 'epic', kind: 'charm', only: 'fish' },
  { id: 'hat-wizard', name: 'Wizard Hat', rarity: 'legendary', kind: 'hat', only: 'fish' },
  { id: 'toy-balloons', name: 'Bunch of Balloons', rarity: 'legendary', kind: 'toy', only: 'fish' },
  // Only the scratch cards: the silly things.
  { id: 'hat-cake', name: 'Birthday Cake', rarity: 'common', kind: 'hat', only: 'scratch' },
  { id: 'hat-cone', name: 'Traffic Cone', rarity: 'uncommon', kind: 'hat', only: 'scratch' },
  { id: 'x-mustache', name: 'Fine Mustache', rarity: 'uncommon', kind: 'extra', only: 'scratch' },
  { id: 'charm-shell', name: 'Pink Shell', rarity: 'uncommon', kind: 'charm', only: 'scratch' },
  { id: 'hat-lampshade', name: 'Lampshade', rarity: 'rare', kind: 'hat', only: 'scratch' },
  { id: 'paint-rose', name: 'Rose Paint', rarity: 'rare', kind: 'paint', only: 'scratch' },
  { id: 'hat-bread', name: 'Loaf of Bread', rarity: 'epic', kind: 'hat', only: 'scratch' },
  { id: 'f-snowman', name: 'Snowman', rarity: 'legendary', kind: 'furniture', only: 'scratch' },
  { id: 'toy-pogo', name: 'Pogo Stick', rarity: 'legendary', kind: 'toy', only: 'scratch' },
];

/** What a game can give: what any game gives, and what only it does. */
export const prizesOf = (game?: GameId): Prize[] => PRIZES.filter((p) => !p.only || p.only === game);

/** Rarities, commonest first. */
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

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
 * A prize of a rarity, from everything a game can give. What the player does not have yet is
 * three times as likely, so the shelves fill rather than repeat.
 */
export function pickPrize(rarity: Rarity, owned: (p: Prize) => boolean, rand: () => number, game?: GameId): Prize {
  const pool = prizesOf(game).filter((p) => p.rarity === rarity);
  const weights = pool.map((p) => (owned(p) ? 1 : 3));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** The roll: a prize, by the odds, favouring what is not owned yet. At a game, from that game's prizes. */
export function rollPrize(rand: () => number, owned: (p: Prize) => boolean = () => false, game?: GameId): Prize {
  return pickPrize(pickRarity(ODDS, rand()), owned, rand, game);
}

/** How many tiles the strip has, and where the winner sits on it. */
export const STRIP_LENGTH = 56;
export const WIN_AT = 48;

/** The strip that spins past: random prizes (by the odds), with the winner at WIN_AT. */
export function makeStrip(winner: Prize, seed: number, game: GameId = 'wheel'): Prize[] {
  const r = rng(seed);
  const strip: Prize[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) strip.push(i === WIN_AT ? winner : rollPrize(r, undefined, game));
  // A near miss just after the winner makes the stop more exciting.
  if (winner.rarity !== 'legendary' && r() < 0.5) {
    const shiny = prizesOf(game).filter((p) => p.rarity === 'legendary');
    strip[WIN_AT + 1] = shiny[Math.floor(r() * shiny.length)];
  }
  return strip;
}
