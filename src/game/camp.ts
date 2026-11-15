// The player's own campsite. There is no plot: a camp is wherever its things are set down. What
// makes a camp a camp is a tent, a fire and somewhere to sit, close together. Pure.
import type { Catch } from '../fishing/fish';
import { COOLERS, FURNITURE } from './economy';
import type { Save } from './save';

/** How close together, metres, a camp's things must stand to be one camp. */
export const CAMP_REACH = 9;

interface Stood {
  id: string;
  x: number;
  z: number;
}

const seat = (id: string): boolean => !!FURNITURE.find((f) => f.id === id)?.seat;
const fire = (id: string): boolean => !!FURNITURE.find((f) => f.id === id)?.fire;

/** Whether, among things set down, there is a tent with a fire and a seat within reach of it. */
export function campMade(placed: readonly Stood[]): boolean {
  return placed
    .filter((p) => p.id === 'f-tent')
    .some((tent) => {
      const near = placed.filter((p) => Math.hypot(p.x - tent.x, p.z - tent.z) <= CAMP_REACH);
      return near.some((p) => fire(p.id)) && near.some((p) => seat(p.id));
    });
}

/** How many of the camp catalogue's different things stand within reach of some tent: for the title of someone who has the lot. */
export function campKinds(placed: readonly Stood[]): number {
  let best = 0;
  for (const tent of placed.filter((p) => p.id === 'f-tent')) {
    const kinds = new Set(placed.filter((p) => Math.hypot(p.x - tent.x, p.z - tent.z) <= CAMP_REACH && FURNITURE.find((f) => f.id === p.id)?.camp).map((p) => p.id));
    best = Math.max(best, kinds.size);
  }
  return best;
}

/** How many fish a camp chest holds. However many chests are set down, they are one store. */
export const CHEST_HOLDS = 30;

/** Put a fish from the bag into the chest. False if the chest is full or there is no such fish. */
export function store(save: Save, bagIndex: number): boolean {
  if (save.stored.length >= CHEST_HOLDS || !save.bag[bagIndex]) return false;
  save.stored.push(...save.bag.splice(bagIndex, 1));
  return true;
}

/** Take a fish out of the chest into the bag. False if the bag is full or there is no such fish. */
export function takeOut(save: Save, storedIndex: number): boolean {
  if (save.bag.length >= COOLERS[save.cooler].capacity || !save.stored[storedIndex]) return false;
  save.bag.push(...save.stored.splice(storedIndex, 1));
  return true;
}

/** A camp's name as it is kept: trimmed, one line, no longer than fits the sign. */
export const NAME_FITS = 18;
export const campNamed = (said: string): string => said.replace(/\s+/g, ' ').trim().slice(0, NAME_FITS);

/** Where the camp is, for the map: its sign if it has one, or else its tent. */
export function campAt(placed: readonly Stood[]): Stood | null {
  return placed.find((p) => p.id === 'f-campsign') ?? placed.find((p) => p.id === 'f-tent') ?? null;
}

/** What a fish in the chest is, for a list. */
export type Stored = Catch;
