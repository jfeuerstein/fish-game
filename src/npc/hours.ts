// The hours the islanders keep. Each has one time of day when they are always to be found at
// one of their spots, doing something other than fishing: knowing where to find someone is part
// of knowing the island. Pure.

export interface Haunt {
  /** Which of their route's spots it is (they walk their own route to get there). */
  leg: number;
  /** From this hour up to that one (it may run past midnight). */
  from: number;
  to: number;
  /** What they do there. */
  action: 'sit' | 'idle';
  /** Where it is and what they are doing, for anyone who asks after them. */
  says: string;
}

export const HAUNTS: Record<string, Haunt> = {
  // Asleep on the end of the pier at noon.
  'npc-duck': { leg: 0, from: 11.5, to: 13.5, action: 'sit', says: 'asleep at the end of the pier, round noon' },
  // By the creek near the bridge at first light, watching the water.
  'npc-beaver': { leg: 2, from: 5, to: 7.5, action: 'idle', says: 'by the creek below the bridge at dawn, just looking' },
  // At the camp by the fire once it is dark.
  'npc-bear': { leg: 1, from: 20.5, to: 5, action: 'sit', says: 'at the camp by the fire, all night' },
};

/** Where an islander is to be found at this hour, if this is their time. */
export function hauntNow(id: string, hour: number): Haunt | null {
  const h = HAUNTS[id];
  if (!h) return null;
  const within = h.from <= h.to ? hour >= h.from && hour < h.to : hour >= h.from || hour < h.to;
  return within ? h : null;
}
