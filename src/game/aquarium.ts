// The aquarium, under the lighthouse: one of every kind of fish, given by the player. A fish
// given is gone from the bag and swims in the tank from then on. Pure.
import { BY_ID, JOURNAL_SPECIES, valueOf, type Catch } from '../fishing/fish';
import type { Save } from './save';

/** Odds and ends are not fish: the tank does not want a boot. */
export const TANK_SPECIES = JOURNAL_SPECIES.filter((s) => s.tier !== 'junk');

/** A pearl for every so many kinds given. */
export const PEARL_EVERY = 5;

/** What the keeper pays for a fish, over what Gus would: it is going somewhere it will be looked at. */
export const TANK_PAYS = 1.5;

/** Whether the tank would take this fish: a kind it does not have. */
export const wanted = (save: Save, c: Catch): boolean => !!BY_ID[c.species] && BY_ID[c.species].tier !== 'junk' && !save.aquarium.includes(c.species);

/** The fish in the bag the tank would take: one of each kind, the plainest of it (a golden one is not asked for). */
export function givable(save: Save): number[] {
  const best = new Map<string, number>();
  save.bag.forEach((c, i) => {
    if (!wanted(save, c)) return;
    const had = best.get(c.species);
    if (had === undefined || valueOf(c) < valueOf(save.bag[had])) best.set(c.species, i);
  });
  return [...best.values()].sort((a, b) => a - b);
}

export interface Given {
  species: string;
  coins: number;
  pearls: number;
  /** How many kinds the tank has now. */
  kinds: number;
}

/** Give the fish at a place in the bag to the tank. Null if the tank does not want it. */
export function give(save: Save, bagIndex: number): Given | null {
  const c = save.bag[bagIndex];
  if (!c || !wanted(save, c)) return null;
  save.bag.splice(bagIndex, 1);
  save.aquarium.push(c.species);
  const coins = Math.round(valueOf(c) * TANK_PAYS);
  const pearls = save.aquarium.length % PEARL_EVERY === 0 ? 1 : 0;
  save.coins += coins;
  save.tokens += pearls;
  return { species: c.species, coins, pearls, kinds: save.aquarium.length };
}
