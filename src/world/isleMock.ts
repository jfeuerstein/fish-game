// For the tests: what `./isle` says when a test wants to be on a particular island. It imports
// nothing, so that a mock made from it cannot wait on the very module it stands in for.
export const mockIsle = (ISLE: string): Record<string, unknown> => ({
  ISLE,
  HOME: ISLE === 'cove',
  ISLES: ['cove', 'kettle', 'rime', 'mire', 'glow', 'sky', 'dune'],
  ISLE_NAME: { cove: 'Driftwood Cove', kettle: 'Kettle Isle', rime: 'Rimefall', mire: 'Mirewood', glow: 'Glowmere', sky: 'Thistledown', dune: 'Sandglass Key' },
  ISLE_KEY: 'cove.isle',
  CROSSING_KEY: 'cove.crossing',
  pick: (by: Record<string, unknown>) => by[ISLE],
});

