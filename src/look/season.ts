// The seasons, by the calendar where the player is. A season changes which fish bite, the
// colour of the leaves and the grass, and the light; winter's rain falls as snow. Pure.

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export const SEASONS: readonly Season[] = ['spring', 'summer', 'fall', 'winter'];
export const SEASON_LABEL: Record<Season, string> = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

/** The season at a moment: March to May is spring, and so on round (the northern year). */
export function seasonAt(nowMs: number, tzOffsetMin = 0): Season {
  const month = new Date(nowMs - tzOffsetMin * 60_000).getUTCMonth();
  return month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'fall' : 'winter';
}

/** A season named in the address or Settings, if it is one. */
export function pinnedSeason(name: string | null): Season | null {
  return SEASONS.includes(name as Season) ? (name as Season) : null;
}

export interface SeasonLook {
  /** What each kind of tree's leaves are multiplied by (white: as painted). Pines keep their green. */
  leaves: Record<string, string>;
  /** What the grass is multiplied by. */
  grass: string;
  /** What the sunlight is multiplied by, and the sky's fill light. */
  sun: string;
  fill: string;
  /** Rain falls as snow. */
  snow: boolean;
  /** How much of the grass lies under frost (0 to 1), and the pale colour laid over every leaf (black: none). */
  frost: number;
  rime: string;
}

/**
 * How each season looks. Summer is the island as it was painted. The broadleaved trees turn in
 * fall and thin to grey in winter; the grass goes fresh, deep, tawny and frosted; the light a
 * little green-gold, full, amber and blue.
 */
export const SEASON_LOOK: Record<Season, SeasonLook> = {
  spring: { leaves: { 'tree-round': '#d6f0a8', 'tree-birch': '#e2f4b4', bush: '#dcf2b0', 'tree-pine': '#f2fff0', 'tree-palm': '#ffffff' }, grass: '#eaffd0', sun: '#fffbe8', fill: '#f4fff4', snow: false, frost: 0, rime: '#000000' },
  summer: { leaves: { 'tree-round': '#ffffff', 'tree-birch': '#ffffff', bush: '#ffffff', 'tree-pine': '#ffffff', 'tree-palm': '#ffffff' }, grass: '#ffffff', sun: '#ffffff', fill: '#ffffff', snow: false, frost: 0, rime: '#000000' },
  fall: { leaves: { 'tree-round': '#ffb060', 'tree-birch': '#ffd870', bush: '#f0a868', 'tree-pine': '#f4f0e0', 'tree-palm': '#fff4e0' }, grass: '#f0dc9c', sun: '#ffe6c0', fill: '#fff0e0', snow: false, frost: 0, rime: '#000000' },
  winter: { leaves: { 'tree-round': '#c4ccd0', 'tree-birch': '#d8dcdc', bush: '#c8d0d0', 'tree-pine': '#e0f0f4', 'tree-palm': '#e8f0f0' }, grass: '#e4f0f4', sun: '#e8f2ff', fill: '#e4f0ff', snow: true, frost: 0.7, rime: '#46565c' },
};
