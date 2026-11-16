// Which island this is. There are five: Driftwood Cove, where the game begins, and four more a
// boat's row away, each its own kind of place: Kettle Isle (an old crater), Rimefall (ice and
// snow), Mirewood (a swamp) and Glowmere (where it is always night). Only one is ever loaded: the crossing puts the game away and
// begins it again on the other (behind a card that says so), so everything that says where
// things are (layout.ts, island.ts) is chosen once, here, as the page loads. Under the tests
// there is no page, and it is the cove unless a test says otherwise.

export type IsleId = 'cove' | 'kettle' | 'rime' | 'mire' | 'glow';
export const ISLES: readonly IsleId[] = ['cove', 'kettle', 'rime', 'mire', 'glow'];

export const ISLE_NAME: Record<IsleId, string> = { cove: 'Driftwood Cove', kettle: 'Kettle Isle', rime: 'Rimefall', mire: 'Mirewood', glow: 'Glowmere' };
const isIsle = (v: string | null): v is IsleId => !!v && (ISLES as readonly string[]).includes(v);

/** Where the choice is kept between visits, so the game opens on the island it was put away on. */
export const ISLE_KEY = 'cove.isle';
/** Set for the length of a crossing: the next load shows the rowing card instead of the title. */
export const CROSSING_KEY = 'cove.crossing';

function which(): IsleId {
  if (typeof location === 'undefined') return 'cove';
  const p = new URLSearchParams(location.search);
  const asked = p.get('isle');
  if (isIsle(asked)) return asked;
  // A save that is not kept (the tools) always begins at the cove.
  if (p.get('fresh') === '1') return 'cove';
  try {
    const kept = localStorage.getItem(ISLE_KEY);
    return isIsle(kept) ? kept : 'cove';
  } catch {
    return 'cove';
  }
}

export const ISLE: IsleId = which();
/** On Driftwood Cove: the shop, the Lucky Gull, the islanders and the rest are only here. */
export const HOME = ISLE === 'cove';

/** This island's one of a thing that every island has its own of. */
export function pick<T>(by: Record<IsleId, T>): T {
  return by[ISLE];
}
