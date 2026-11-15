// The chart of the island: what the map knows. Which kinds of fish have been caught in which
// water is kept as they are caught; nothing not yet caught is shown, so the map never says
// where to find a fish, only where one was found. Pure.
import { BY_ID } from '../fishing/fish';
import type { Zone } from '../world/island';
import type { Save } from './save';

export const WATERS: readonly Zone[] = ['ocean', 'deep', 'pond', 'creek', 'cave'];

/** A fish was landed from a water: the chart remembers. */
export function noteCatch(save: Save, zone: Zone, species: string): void {
  if (!BY_ID[species] || BY_ID[species].tier === 'junk' || species === 'treasure') return;
  const list = (save.caughtAt[zone] ??= []);
  if (!list.includes(species)) list.push(species);
}

/**
 * The kinds known to have been caught in a water. A save from before the chart kept this has
 * only its journal: a kind in the journal that lives in one water alone must have come from it.
 */
export function caughtIn(save: Save, zone: Zone): string[] {
  const known = new Set(save.caughtAt[zone] ?? []);
  for (const id of Object.keys(save.journal)) {
    const s = BY_ID[id];
    if (s && s.tier !== 'junk' && s.zones.length === 1 && s.zones[0] === zone) known.add(id);
  }
  return [...known];
}

/** Whether the cave is on the chart yet: once it has been seen from the lighthouse or fished. */
export const caveKnown = (save: Save): boolean => save.spotted.includes('cave') || (save.caughtAt.cave ?? []).length > 0 || Object.keys(save.journal).some((id) => BY_ID[id]?.zones.includes('cave'));
