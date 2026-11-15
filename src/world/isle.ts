// Which island this is. There are two: Driftwood Cove, where the game begins, and Kettle Isle,
// a wilder one a boat's row away. Only one is ever loaded: the crossing puts the game away and
// begins it again on the other (behind a card that says so), so everything that says where
// things are (layout.ts, island.ts) is chosen once, here, as the page loads. Under the tests
// there is no page, and it is the cove unless a test says otherwise.

export type IsleId = 'cove' | 'kettle';

export const ISLE_NAME: Record<IsleId, string> = { cove: 'Driftwood Cove', kettle: 'Kettle Isle' };

/** Where the choice is kept between visits, so the game opens on the island it was put away on. */
export const ISLE_KEY = 'cove.isle';
/** Set for the length of a crossing: the next load shows the rowing card instead of the title. */
export const CROSSING_KEY = 'cove.crossing';

function which(): IsleId {
  if (typeof location === 'undefined') return 'cove';
  const p = new URLSearchParams(location.search);
  const asked = p.get('isle');
  if (asked === 'kettle' || asked === 'cove') return asked;
  // A save that is not kept (the tools) always begins at the cove.
  if (p.get('fresh') === '1') return 'cove';
  try {
    return localStorage.getItem(ISLE_KEY) === 'kettle' ? 'kettle' : 'cove';
  } catch {
    return 'cove';
  }
}

export const ISLE: IsleId = which();
/** On Driftwood Cove: the shop, the Lucky Gull, the islanders and the rest are only here. */
export const HOME = ISLE === 'cove';
