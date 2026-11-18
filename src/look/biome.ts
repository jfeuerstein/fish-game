// What kind of place each island is: its season if it has only one, its hour if it has only
// one, how misty it never stops being, what its water and grass are tinted, and what is said
// on stepping ashore. The cove and Kettle Isle follow the calendar and the clock; the other
// others are each their own weather. Pure.
import type { IsleId } from '../world/isle';
import type { Season } from './season';

export interface Biome {
  /** It is always this season here (the calendar's, when not given). */
  season?: Season;
  /** It is always this hour here (the clock's, when not given). */
  hour?: number;
  /** The air is never clearer than this, 0 to 1. */
  mist?: number;
  /** The water's colours are drawn this far toward these, 0 to 1. */
  water?: { deep: string; shallow: string; by: number };
  /** What the grass is multiplied by. */
  grass?: string;
  /** The northern lights are out every clear night. */
  aurora?: boolean;
  /** The sea is cloud: the island is above the weather, so the sky over it is always clear. */
  cloud?: boolean;
  /** Said on first stepping ashore, and what there is to know. */
  first: string;
  know: string;
}

export const BIOMES: Record<IsleId, Biome> = {
  cove: { first: 'Welcome to Driftwood Cove!', know: '' },
  kettle: { first: 'Kettle Isle. Nobody has lived here for a long time.', know: 'There is no shop: what you catch goes home in the cooler. The boat is at the jetty.' },
  // Always winter. The lake is ice, and the lights are out whenever the sky is clear.
  rime: { season: 'winter', aurora: true, water: { deep: '#1d3f5c', shallow: '#7fb2c8', by: 0.6 }, first: 'Rimefall. The lake is frozen right across.', know: 'The fish are under the ice: cast into one of the holes. Mind the seals.' },
  // Never clear: a green mist over still green water.
  mire: { mist: 0.34, water: { deep: '#1f3a2a', shallow: '#5c7f4a', by: 0.75 }, grass: '#d8e6b8', first: 'Mirewood. The water does not move, and you cannot wade it.', know: 'The boardwalks cross it. The floats mark where a crab pot can be set: set one, and come back to it.' },
  // Always night, and everything that grows gives off its own light.
  // Above the weather: always the golden hour, over a sea of cloud.
  // (It keeps one season, as it keeps one hour: no snow lies on a dandelion clock.)
  sky: { season: 'fall', hour: 17.3, cloud: true, water: { deep: '#f4eee3', shallow: '#fffdf6', by: 0.94 }, grass: '#e6f0b0', first: 'Thistledown. That is not sea down there. Do not look down.', know: 'Where the wind comes up out of the ground, step into it. It is the only way up the rock.' },
  // Sand, and an hour that does not pass until the sundial is turned. Always summer: it is a desert, and snow on a palm is wrong.
  dune: { season: 'summer', water: { deep: '#1f6f8a', shallow: '#6fd0c8', by: 0.5 }, first: 'Sandglass Key. The shadows here have not moved in years.', know: 'The sundial at the waist of the island sets the hour. The fish are in the soft sand, and they keep hours.' },
  glow: { hour: 23.2, water: { deep: '#102a4a', shallow: '#2fb8b0', by: 0.7 }, grass: '#9fb8e0', first: 'Glowmere. It is night here. It is always night here.', know: 'Three beacons stand on the hills, unlit. Something in the water is waiting for them.' },
};
