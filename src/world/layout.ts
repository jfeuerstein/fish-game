// Where everything on the island is. Pure data and a few helpers, no three.js.
//
// Coordinates: +x east, +z south, +y up, metres. The island is centred on the origin; the sea
// surface is y = 0.

import { GLOW } from './glow';
import { ISLE, pick } from './isle';
import { KETTLE, POOLS as KETTLE_POOLS, SPRING_AT, type Pool } from './kettle';
import { BAYOU } from './mire';
import { HOLES, RIME, rimeShore } from './rime';

const HOME = ISLE === 'cove';

export type V2 = readonly [number, number];

/** Somewhere off the map, for a thing an island does not have: nothing is ever near it. */
export const NOWHERE = 900;
const NO_PLACE = { x: NOWHERE, z: NOWHERE } as const;

export const SEA_LEVEL = 0;
/** The square of world the ground covers, centred on the origin. */
export const WORLD_SIZE = 240;
/** Metres between height samples. */
export const STEP = 1;

/** The freshwater pond, in a hollow in the north-west woods. */
/** (On Kettle Isle the "pond" is the crater lake: the same kind of thing, much bigger and higher up.) */
export const POND: { readonly x: number; readonly z: number; readonly r: number; readonly level: number } = pick({
  cove: { x: -26, z: -24, r: 11, level: 2.6 },
  kettle: { x: KETTLE.x, z: KETTLE.z, r: KETTLE.lake, level: KETTLE.level },
  // Rimefall's lake is frozen: it is ground, and its water is the holes in it (`POOLS`).
  rime: { ...NO_PLACE, r: 1, level: 0 },
  // Mirewood's is the bayou, level with the sea.
  mire: { x: BAYOU.x, z: BAYOU.z, r: BAYOU.r, level: 0 },
  // Glowmere's is the Mere.
  glow: GLOW.mere,
});

/** Small waters cut into the ground: Kettle Isle's tide pools and its hot spring, and the holes in Rimefall's ice. */
export const POOLS: readonly Pool[] = pick({ cove: [], kettle: KETTLE_POOLS, rime: HOLES, mire: [], glow: [] });

/** The creek: out of the pond's west side, down to the sea. Water level falls along it. */
export const CREEK: readonly V2[] = HOME
  ? [
      [-35, -26],
      [-41, -30],
      [-47, -30],
      [-53, -33],
      [-59, -37],
      [-66, -40],
      [-80, -44],
    ]
  : // No other island has a creek.
    [
      [NOWHERE, NOWHERE],
      [NOWHERE + 1, NOWHERE],
    ];
export const CREEK_WIDTH = 2.6;

/** The village square, in front of the shop. */
export const PLAZA: { readonly x: number; readonly z: number; readonly r: number; readonly h: number } = HOME ? { x: 0, z: 14, r: 12, h: 2.2 } : { ...NO_PLACE, r: 12, h: 2.2 };

/** The lighthouse hill, north-east. */
export const HILL = { x: 30, z: -36, r: 20, h: 8.5 } as const;

/** The camp in the western meadow. */
/** (On Kettle Isle: an old fire ring by the cannery. On Rimefall: the fire by the ice hut.) */
export const CAMP: { readonly x: number; readonly z: number } = pick({ cove: { x: -38, z: 18 }, kettle: { x: 63, z: 30 }, rime: { x: 47, z: 22 }, mire: NO_PLACE, glow: NO_PLACE });

/** The pier: east from the shore along z, with a wider head at the end. */
/** The pier: whole 3 m sections of deck, so the boards cover every metre that can be walked on. */
export interface Pier {
  readonly x0: number;
  readonly x1: number;
  readonly z: number;
  readonly width: number;
  readonly deck: number;
  readonly head: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number };
}
/** (Kettle Isle's is a short jetty, where the boat lands.) */
export const PIER: Pier = pick({
  cove: { x0: 59, x1: 104, z: 14, width: 3, deck: 2.4, head: { x0: 98, x1: 104, z0: 7, z1: 22 } },
  kettle: { x0: 76, x1: 100, z: 18, width: 3, deck: 2.0, head: { x0: 94, x1: 100, z0: 13.5, z1: 22.5 } },
  rime: { x0: 63, x1: 87, z: 8, width: 3, deck: 2.0, head: { x0: 81, x1: 87, z0: 3.5, z1: 12.5 } },
  mire: { x0: 81, x1: 105, z: 24, width: 3, deck: 2.0, head: { x0: 99, x1: 105, z0: 19.5, z1: 28.5 } },
  glow: { x0: 58, x1: 82, z: 10, width: 3, deck: 2.0, head: { x0: 76, x1: 82, z0: 5.5, z1: 14.5 } },
});

/** Where the rowboat ties up, beside the pier. */
/** (Every island's is beside its jetty's head, on the south side.) */
export const BOAT_MOORING: { readonly x: number; readonly z: number; readonly yaw: number } = HOME ? { x: 80, z: 17.6, yaw: Math.PI / 2 } : { x: PIER.head.x0 - 6, z: PIER.z + 3.6, yaw: Math.PI / 2 };

/** The buoy that marks the way out to the other islands: a boat beside it may row out. */
export const CROSSING: { readonly x: number; readonly z: number; readonly reach: number } = pick({
  cove: { x: 104, z: 36, reach: 9 },
  kettle: { x: 108, z: 32, reach: 9 },
  rime: { x: 99, z: 22, reach: 9 },
  mire: { x: 111, z: 38, reach: 9 },
  glow: { x: 96, z: 24, reach: 9 },
});

/** The patch of the square that takes chalk. */
export const CHALK: { readonly x: number; readonly z: number; readonly size: number } = HOME ? { x: -5, z: 19, size: 8 } : { ...NO_PLACE, size: 8 };

/** Footpaths, as polylines. */
const COVE_PATHS: readonly (readonly V2[])[] = [
  // Square to pier
  [[9, 13], [22, 11], [38, 12], [50, 13], [60, 14]],
  // Square to pond
  [[-7, 6], [-12, -4], [-18, -11]],
  // Round the pond's south and east bank
  [[-18, -11], [-26, -9], [-34, -13]],
  // Square to camp
  [[-9, 17], [-22, 19], [-33, 18]],
  // Camp north over the creek to the north-west shore
  [[-40, 13], [-45, 0], [-49, -18], [-52.9, -25.6], [-47.5, -36.4], [-46, -40], [-44, -44]],
  // Square up to the lighthouse
  [[6, 3], [13, -9], [21, -22], [27, -31]],
  // Square down to the beach
  [[2, 25], [4, 36], [6, 47]],
];
/** Kettle Isle's: from the jetty past the cannery, up through the notch to the lake, to the hot spring and the tide pools, and along the south shore to the reef. */
const KETTLE_PATHS: readonly (readonly V2[])[] = [
  // Jetty to the cannery's yard
  [[77, 18], [70, 17], [62, 15]],
  // Up through the notch to the lake's shore
  [[62, 15], [50, 11], [38, 6], [27, 2], [19, -1], [13, -4.5]],
  // Round the mountain's foot to the hot spring
  [[38, 6], [44, -6], [44, -20], [SPRING_AT.x + 4.5, SPRING_AT.z + 2]],
  // On to the shelf and its pools
  [[SPRING_AT.x + 4.5, SPRING_AT.z + 2], [46, -35], [51, -37]],
  // Along the south shore to the reef flat
  [[62, 15], [52, 28], [36, 40], [14, 48], [-10, 50], [-34, 44], [-50, 34]],
];
/** Rimefall's: from the jetty to the ice hut and the lake, and from the lake's far side up the hill. */
const RIME_PATHS: readonly (readonly V2[])[] = [
  [[64, 8], [56, 12], [48, 17]],
  [[48, 17], [40, 12], [34, 7]],
  [[-17, -4], [-26, -14], [-33, -24]],
];
/** Mirewood's: from the jetty to each boardwalk, and on beyond them. */
const MIRE_PATHS: readonly (readonly V2[])[] = [
  [[82, 24], [70, 24], [56, 23], [43.5, 22]],
  [[56, 23], [51, 13], [47, 4.5]],
  [[47, -22.5], [30, -30], [4, -34], [-24, -30]],
  [[56, 23], [42, 40], [14, 44], [-7, 32]],
  [[-33.5, 32], [-48, 26], [-60, 12]],
];
/** Glowmere's: from the jetty to the Mere, and to each beacon. */
const GLOW_PATHS: readonly (readonly V2[])[] = [
  [[59, 10], [46, 6], [30, 0], [14, -4], [8, -6]],
  [[30, 0], [30, -12], [27.5, -21]],
  [[14, -4], [8, 9], [-10, 11], [-24, 10], [-35, 10]],
  [[8, 9], [6, 24], [6, 43]],
];
export const PATHS: readonly (readonly V2[])[] = pick({ cove: COVE_PATHS, kettle: KETTLE_PATHS, rime: RIME_PATHS, mire: MIRE_PATHS, glow: GLOW_PATHS });
export const PATH_WIDTH = 1.7;

/** Where the beach is widest: the south shore. */
export const BEACH_ANGLE = Math.PI / 2;

/**
 * The footbridge over the creek: it stands on the creek's surface (not its bed) and spans it the
 * short way, with an arched deck that can be walked on (see floorAt).
 */
const BRIDGE_AT = HOME ? { x: -50.2, z: -31.0 } : NO_PLACE;
const CREEK_DIR = Math.atan2(-3, -6);
export const BRIDGE = {
  ...BRIDGE_AT,
  /** Turned so its walkway runs across the creek. */
  yaw: -CREEK_DIR,
  base: creekLevelAt(BRIDGE_AT.x, BRIDGE_AT.z) - 0.05,
  /** The model is about 4.7 m long at scale 1. */
  scale: 1.7,
  /**
   * Its deck, measured on the model at this scale (by casting rays down onto it): it spans
   * 3.25 m either side of the middle, 1.18 m above the base at the ends and 1.54 m in the middle.
   */
  halfLen: 3.25,
  /** Planks run out to 2.8 m either side, with the rails at 2.9: those are solid (see railPosts). */
  halfWidth: 2.75,
  endHeight: 1.18,
  rise: 0.36,
  /** Earth banks are raised up to each end of the deck, falling away this steeply (rise per metre). */
  bankSlope: 0.32,
  bankWidth: 3.6,
} as const;

function creekLevelAt(x: number, z: number): number {
  return creekLevel(nearestOnLine(CREEK, x, z).t);
}

/**
 * The sea cave, in the cliffs of the north shore: a mound of rock with a dark mouth, standing in
 * the water with its back in the hill. It can only be come at by boat. The water before the
 * mouth, within `r` of the middle given here, is the cave's own (zone `cave`).
 */
export const CAVE: { readonly x: number; readonly z: number; readonly r: number; readonly mouth: { readonly x: number; readonly z: number; readonly yaw: number } } = HOME ? { x: -24.3, z: -60.3, r: 5.5, mouth: { x: -22.7, z: -56.1, yaw: -2.757 } } : { x: NOWHERE, z: -NOWHERE, r: 5.5, mouth: { x: NOWHERE, z: -NOWHERE, yaw: 0 } };

export type PropId = string;

/** One placed model: which, where, which way it faces (radians about +y), and an optional scale. */
export interface Placed {
  id: PropId;
  x: number;
  z: number;
  yaw?: number;
  scale?: number;
  /** Stand on a floor of this height rather than the ground (the pier). */
  y?: number;
}

/** The buildings, landmarks and village things, placed by hand. Trees, rocks and flowers are scattered (see scatter.ts). */
const COVE_PLACED: readonly Placed[] = [
  { id: 'shop', x: 0, z: 2.5, yaw: 0 },
  /** The Lucky Gull arcade, on the west side of the plaza, facing into it. */
  { id: 'arcade', x: -17, z: 8, yaw: 1.2 },
  { id: 'notice-board', x: 10, z: 9, yaw: -0.5 },
  { id: 'lighthouse', x: 31, z: -37, yaw: 0.6 },
  { id: 'fishing-hut', x: 50, z: 5, yaw: -1.2 },
  { id: 'well', x: 8, z: 21, yaw: 0.3 },
  { id: 'mailbox', x: -6.5, z: 5, yaw: 0.2 },
  { id: 'signpost', x: 12, z: 16, yaw: -0.8 },
  { id: 'lamp-post', x: -9, z: 3.5 },
  { id: 'lamp-post', x: 10, z: 21 },
  { id: 'lamp-post', x: -9, z: 23 },
  { id: 'lamp-post', x: 8, z: 4 },
  { id: 'lamp-post', x: 61, z: 12.8, y: PIER.deck },
  { id: 'lamp-post', x: 80, z: 12.8, y: PIER.deck },
  { id: 'lamp-post', x: 101, z: 7.6, y: PIER.deck },
  { id: 'bench', x: -11, z: 14, yaw: Math.PI / 2 },
  { id: 'bench', x: 12, z: 6, yaw: -Math.PI / 2 - 0.4 },
  { id: 'bench', x: 5, z: 26, yaw: Math.PI },
  // At the end of the pier, looking out to sea.
  { id: 'bench', x: 102, z: 20.4, y: PIER.deck, yaw: 0 },
  { id: 'bench', x: 25, z: -30, yaw: 2.2 },
  { id: 'bench', x: -20, z: -8, yaw: Math.PI + 0.3 },
  { id: 'crates', x: -4.5, z: 0.5, yaw: 0.3 },
  { id: 'barrel', x: 4.6, z: 0.8 },
  { id: 'barrel', x: 53, z: 3 },
  { id: 'crates', x: 64, z: 13, y: PIER.deck, yaw: 1.3 },
  { id: 'picnic-table', x: 16, z: 26, yaw: 0.4 },
  { id: 'campfire', x: -38, z: 18 },
  { id: 'log', x: -38, z: 14.6, yaw: 0 },
  { id: 'log', x: -41.6, z: 19.5, yaw: Math.PI / 2 + 0.3 },
  { id: 'log', x: -34.6, z: 20, yaw: -Math.PI / 2 + 0.2 },
  { id: 'tent', x: -45, z: 23, yaw: 0.9 },
  { id: 'bridge', x: BRIDGE.x, z: BRIDGE.z, yaw: BRIDGE.yaw, y: BRIDGE.base, scale: BRIDGE.scale },
  { id: 'buoy', x: 114, z: 2 },
  { id: 'buoy', x: 104, z: 36 },
  { id: 'buoy', x: -86, z: -10 },
  { id: 'fence', x: 18, z: -20, yaw: 1.1 },
  { id: 'fence', x: 20, z: -17.8, yaw: 1.1 },
  { id: 'driftwood', x: -6, z: 50, yaw: 0.4 },
  { id: 'driftwood', x: 18, z: 51, yaw: 2.1 },
  { id: 'shell', x: 10, z: 54, yaw: 0.7 },
  { id: 'shell', x: -14, z: 52, yaw: 2.7 },
  { id: 'tree-palm', x: -10, z: 46, yaw: 0.3 },
  { id: 'tree-palm', x: 14, z: 45, yaw: 2.3 },
  { id: 'tree-palm', x: 26, z: 47, yaw: 4 },
  { id: 'cliff', x: -12, z: -60, yaw: 0.4 },
  { id: 'cliff', x: 6, z: -63, yaw: 2.4 },
  { id: 'cliff', x: 52, z: -42, yaw: 1.6 },
  { id: 'cave-mouth', x: CAVE.mouth.x, z: CAVE.mouth.z, yaw: CAVE.mouth.yaw, y: -0.7 },
];

/** Where the cannery stands on Kettle Isle, and which way its door faces. */
export const CANNERY = { x: 58, z: 5, yaw: 0.55 } as const;
/** The wreck on the reef. */
export const WRECK = { x: -73, z: 58, yaw: 0.8 } as const;

/** Kettle Isle's: a jetty with a lamp, a ruined cannery, an old fire ring, a wreck out on the reef, and the buoy home. */
const KETTLE_PLACED: readonly Placed[] = [
  { id: 'cannery', x: CANNERY.x, z: CANNERY.z, yaw: CANNERY.yaw },
  { id: 'lamp-post', x: 79, z: 16.8, y: PIER.deck },
  { id: 'lamp-post', x: 97, z: 14.1, y: PIER.deck },
  { id: 'crates', x: 83, z: 17.2, y: PIER.deck, yaw: 0.4 },
  { id: 'barrel', x: 66, z: 9 },
  { id: 'barrel', x: 67.2, z: 10.2 },
  { id: 'crates', x: 52, z: 12, yaw: 2.1 },
  { id: 'campfire', x: CAMP.x, z: CAMP.z },
  { id: 'log', x: CAMP.x, z: CAMP.z - 3.3, yaw: 0 },
  { id: 'log', x: CAMP.x + 3.4, z: CAMP.z + 1.4, yaw: -Math.PI / 2 + 0.2 },
  { id: 'signpost', x: 64, z: 17.5, yaw: 1.2 },
  { id: 'bench', x: 16.5, z: -6.5, yaw: -1.1 },
  { id: 'wreck', x: WRECK.x, z: WRECK.z, yaw: WRECK.yaw, y: -0.9 },
  { id: 'buoy', x: CROSSING.x, z: CROSSING.z },
  { id: 'buoy', x: -100, z: 20 },
  { id: 'driftwood', x: 20, z: 54, yaw: 0.4 },
  { id: 'driftwood', x: -40, z: 50, yaw: 2.1 },
  { id: 'shell', x: 2, z: 56, yaw: 0.7 },
  { id: 'shell', x: -24, z: 55, yaw: 2.7 },
];
/** Floors the player can stand on above the ground: the pier, and Mirewood's boardwalks. Axis-aligned rectangles. */
export interface Floor {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

/** How high Mirewood's boardwalks stand. */
const WALK_DECK = 2.1;
/**
 * Mirewood's boardwalks, in whole three-metre sections: one over the long channel to the north
 * bank, one over the south channel to the west bank, and one out into the bayou to a platform.
 */
export const WALKS: readonly Floor[] = pick<readonly Floor[]>({
  cove: [],
  kettle: [],
  rime: [],
  mire: [
    { x0: 45.5, x1: 48.5, z0: -22, z1: 5, y: WALK_DECK },
    { x0: -33, x1: -6, z0: 30.5, z1: 33.5, y: WALK_DECK },
    { x0: 27, x1: 45, z0: 20.5, z1: 23.5, y: WALK_DECK },
    { x0: 18, x1: 27, z0: 17.5, z1: 26.5, y: WALK_DECK },
  ],
  glow: [],
});

/** Where crab pots may be set on Mirewood: in the still water beside a boardwalk, each with a name for the save. */
export const POTS: readonly { id: string; x: number; z: number }[] = pick<readonly { id: string; x: number; z: number }[]>({
  cove: [],
  kettle: [],
  rime: [],
  mire: [
    { id: 'north', x: 50.6, z: -9 },
    { id: 'west', x: -20, z: 35.6 },
    { id: 'bayou', x: 35, z: 25.6 },
    { id: 'shack', x: 22.5, z: 28.6 },
  ],
  glow: [],
});

/** Glowmere's beacons. */
export const BEACONS: readonly { x: number; z: number }[] = pick<readonly { x: number; z: number }[]>({ cove: [], kettle: [], rime: [], mire: [], glow: GLOW.beacons });

/** Rimefall's ice hut, and Mirewood's shack on stilts. */
export const ICE_HUT = { x: 46, z: 28, yaw: Math.PI + 0.5 } as const;
export const SHACK = { x: 13.5, z: 22, yaw: Math.PI / 2 } as const;

/** Rimefall's: a jetty, an ice hut with a fire by it, and seals on the shore. */
const RIME_PLACED: readonly Placed[] = [
  { id: 'ice-hut', x: ICE_HUT.x, z: ICE_HUT.z, yaw: ICE_HUT.yaw },
  { id: 'campfire', x: CAMP.x, z: CAMP.z },
  { id: 'log', x: CAMP.x + 0.4, z: CAMP.z - 3.2, yaw: 0.1 },
  { id: 'lamp-post', x: 65, z: 6.8, y: PIER.deck },
  { id: 'lamp-post', x: 84, z: 4.1, y: PIER.deck },
  { id: 'crates', x: 70, z: 7.2, y: PIER.deck, yaw: 0.4 },
  { id: 'signpost', x: 58, z: 10.5, yaw: 1.2 },
  // Seals hauled out on the shore, two together in the north-east and one by itself in the south.
  ...[-0.98, -0.9, 1.72].map((a, i): Placed => ({ id: 'seal', x: Math.cos(a) * (rimeShore(a) - 2.5), z: Math.sin(a) * (rimeShore(a) - 2.5), yaw: 2.4 + i * 1.3 })),
  { id: 'bench', x: -31, z: -22, yaw: 2.2 },
  { id: 'buoy', x: CROSSING.x, z: CROSSING.z },
];
/** Mirewood's: a jetty, a shack on stilts in the bayou, a lamp at each end of every boardwalk, and a float over each place a pot may be set. */
const MIRE_PLACED: readonly Placed[] = [
  { id: 'stilt-shack', x: SHACK.x, z: SHACK.z, yaw: SHACK.yaw, y: -1.2 },
  { id: 'lamp-post', x: 83, z: 22.8, y: PIER.deck },
  { id: 'lamp-post', x: 102, z: 20.1, y: PIER.deck },
  { id: 'lamp-post', x: 44.6, z: 5.6 },
  { id: 'lamp-post', x: 44.6, z: -22.8 },
  { id: 'lamp-post', x: -5.4, z: 29.6 },
  { id: 'lamp-post', x: -33.6, z: 29.6 },
  { id: 'lamp-post', x: 45.6, z: 19.6 },
  { id: 'lamp-post', x: 26.2, z: 18.3, y: WALK_DECK },
  { id: 'crates', x: 19.6, z: 25, y: WALK_DECK, yaw: 0.6 },
  { id: 'barrel', x: 25, z: 25.2, y: WALK_DECK },
  { id: 'signpost', x: 58, z: 26, yaw: -0.4 },
  // A pot's float where each may be set: the pot itself is under the water.
  ...POTS.map((q): Placed => ({ id: 'crab-pot', x: q.x, z: q.z, y: -0.42, yaw: q.x })),
  { id: 'buoy', x: CROSSING.x, z: CROSSING.z },
];
/** Glowmere's: a jetty, three beacons, and a bench by the Mere. */
const GLOW_PLACED: readonly Placed[] = [
  ...GLOW.beacons.map((b): Placed => ({ id: 'beacon', x: b.x, z: b.z })),
  { id: 'lamp-post', x: 60, z: 8.8, y: PIER.deck },
  { id: 'lamp-post', x: 79, z: 6.1, y: PIER.deck },
  { id: 'bench', x: 9.5, z: -9, yaw: -1.5 },
  { id: 'signpost', x: 52, z: 10.5, yaw: 1.2 },
  { id: 'buoy', x: CROSSING.x, z: CROSSING.z },
];
export const PLACED: readonly Placed[] = pick({ cove: COVE_PLACED, kettle: KETTLE_PLACED, rime: RIME_PLACED, mire: MIRE_PLACED, glow: GLOW_PLACED });

/** Where the pier's deck sections go (each model is a square section about three metres across). */
export function pierSections(): Placed[] {
  const out: Placed[] = [];
  // The model is posts and deck, 2.4 m tall: its top is the deck.
  const y = PIER.deck - 2.4 + 0.02;
  // The planks run across the way along, as on a real pier.
  const n = Math.round((PIER.head.x0 - PIER.x0) / 3);
  for (let i = 0; i < n; i++) out.push({ id: 'pier', x: PIER.x0 + 1.5 + i * 3, z: PIER.z, yaw: Math.PI / 2, y });
  for (let x = PIER.head.x0 + 1.5; x < PIER.head.x1; x += 3)
    for (let z = PIER.head.z0 + 1.5; z < PIER.head.z1; z += 3) out.push({ id: 'pier', x, z, yaw: Math.PI / 2, y });
  // The boardwalks are the same sections, their planks across the way they run.
  for (const w of WALKS) {
    const alongX = w.x1 - w.x0 > w.z1 - w.z0;
    for (let x = w.x0 + 1.5; x < w.x1; x += 3) for (let z = w.z0 + 1.5; z < w.z1; z += 3) out.push({ id: 'pier', x, z, yaw: alongX ? Math.PI / 2 : 0, y: w.y - 2.4 + 0.02 });
  }
  return out;
}

export const FLOORS: readonly Floor[] = [
  { x0: PIER.x0, x1: PIER.head.x0, z0: PIER.z - PIER.width / 2, z1: PIER.z + PIER.width / 2, y: PIER.deck },
  { x0: PIER.head.x0, x1: PIER.head.x1, z0: PIER.head.z0, z1: PIER.head.z1, y: PIER.deck },
  ...WALKS,
];

/** The bridge's deck at a point, or null off it: low at each end, highest in the middle. */
/** Where a point is relative to the bridge: along its walkway (positive is north) and across it. */
export function bridgeLocal(x: number, z: number): { along: number; across: number } {
  const ax = -Math.sin(CREEK_DIR);
  const az = Math.cos(CREEK_DIR);
  const dx = x - BRIDGE.x;
  const dz = z - BRIDGE.z;
  return { along: dx * ax + dz * az, across: dx * az - dz * ax };
}

/** The bridge's deck at a point, or null off it: it follows the model's arched planks. */
export function bridgeAt(x: number, z: number): number | null {
  const { along, across } = bridgeLocal(x, z);
  if (Math.abs(along) > BRIDGE.halfLen || Math.abs(across) > BRIDGE.halfWidth) return null;
  const k = along / BRIDGE.halfLen;
  return BRIDGE.base + BRIDGE.endHeight + BRIDGE.rise * (1 - k * k);
}

/** Points along the bridge's two rails, to make them solid. */
export function railPosts(): { x: number; z: number }[] {
  const ax = -Math.sin(CREEK_DIR);
  const az = Math.cos(CREEK_DIR);
  const out: { x: number; z: number }[] = [];
  for (const side of [-1, 1])
    for (let s = -BRIDGE.halfLen; s <= BRIDGE.halfLen + 0.01; s += 0.4) {
      const across = side * 2.95;
      out.push({ x: BRIDGE.x + ax * s + az * across, z: BRIDGE.z + az * s - ax * across });
    }
  return out;
}

/** The raised earth bank leading up to an end of the bridge, or null away from it. */
export function bridgeBank(x: number, z: number): number | null {
  const { along, across } = bridgeLocal(x, z);
  // A flat abutment from a metre under the deck's end to just past it, then the bank falls away.
  if (Math.abs(along) < BRIDGE.halfLen - 1 || Math.abs(across) > BRIDGE.bankWidth) return null;
  const past = Math.max(0, Math.abs(along) - BRIDGE.halfLen - 0.3);
  // Rounded off at the sides, so it is a mound and not a wall.
  const side = Math.max(0, (Math.abs(across) - BRIDGE.halfWidth) / (BRIDGE.bankWidth - BRIDGE.halfWidth));
  return BRIDGE.base + BRIDGE.endHeight - 0.03 - past * BRIDGE.bankSlope - side * side * 0.6;
}

export function floorAt(x: number, z: number): number | null {
  let best: number | null = bridgeAt(x, z);
  for (const f of FLOORS) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) best = best === null ? f.y : Math.max(best, f.y);
  return best;
}

/** Distance from a point to a polyline, with how far along it (0..1) the nearest point is. */
export function nearestOnLine(line: readonly V2[], x: number, z: number): { d: number; t: number } {
  let total = 0;
  const lengths: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const l = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    lengths.push(l);
    total += l;
  }
  let best = Infinity;
  let bestAlong = 0;
  let along = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(x - (ax + dx * u), z - (az + dz * u));
    if (d < best) {
      best = d;
      bestAlong = along + lengths[i - 1] * u;
    }
    along += lengths[i - 1];
  }
  return { d: best, t: total ? bestAlong / total : 0 };
}

/** The creek's water level a fraction t of the way from the pond to the sea. */
export function creekLevel(t: number): number {
  // Level through the meadow, then a quicker drop near the sea.
  const k = Math.min(1, Math.max(0, t));
  return POND.level - 0.25 - (POND.level - 0.05) * Math.pow(k, 1.6);
}

/** Named places, for the address bar (`at=`) and the tools. Each is where to stand and which way to face. */
const COVE_PLACES: Record<string, { x: number; z: number; yaw: number }> = {
  // The day begins here, looking up the square at the shop.
  plaza: { x: 3, z: 20, yaw: Math.PI },
  shop: { x: 0, z: 9, yaw: Math.PI },
  pier: { x: 90, z: 14, yaw: 0 },
  pierhead: { x: 101, z: 14, yaw: Math.PI / 2 },
  pond: { x: -18, z: -11.5, yaw: -2.6 },
  creek: { x: -45, z: -24, yaw: -2.82 },
  camp: { x: -36, z: 22, yaw: 0.3 },
  beach: { x: 4, z: 48, yaw: 0 },
  lighthouse: { x: 26, z: -30, yaw: 2.52 },
  boat: { x: 80, z: 15.2, yaw: 0 },
  chalk: { x: -5, z: 22, yaw: Math.PI },
  arcade: { x: -11.5, z: 10.5, yaw: -1.94 },
};

const KETTLE_PLACES: Record<string, { x: number; z: number; yaw: number }> = {
  // The boat lands here.
  jetty: { x: 84, z: 18, yaw: -Math.PI / 2 },
  cannery: { x: 62, z: 13, yaw: -2.6 },
  notch: { x: 24, z: 1, yaw: -1.9 },
  lake: { x: 12.5, z: -5, yaw: -2.1 },
  spring: { x: SPRING_AT.x + 5, z: SPRING_AT.z + 2, yaw: -1.9 },
  pools: { x: 50.5, z: -38, yaw: 2.4 },
  reef: { x: -50, z: 36, yaw: -0.9 },
  camp: { x: CAMP.x - 3, z: CAMP.z + 3, yaw: 2.4 },
  boat: { x: BOAT_MOORING.x, z: BOAT_MOORING.z - 2.4, yaw: 0 },
};
const boat = { x: BOAT_MOORING.x, z: BOAT_MOORING.z - 2.4, yaw: 0 };
const RIME_PLACES: Record<string, { x: number; z: number; yaw: number }> = {
  jetty: { x: 72, z: 8, yaw: -Math.PI / 2 },
  hut: { x: 46, z: 22, yaw: 0.4 },
  lake: { x: 30, z: 6, yaw: -Math.PI / 2 },
  hole: { x: HOLES[2].x + 3.4, z: HOLES[2].z, yaw: -Math.PI / 2 },
  hill: { x: RIME.hill.x + 2, z: RIME.hill.z + 2, yaw: 0.9 },
  seals: { x: Math.cos(-0.94) * (rimeShore(-0.94) - 8), z: Math.sin(-0.94) * (rimeShore(-0.94) - 8), yaw: 2.2 },
  boat,
};
const MIRE_PLACES: Record<string, { x: number; z: number; yaw: number }> = {
  jetty: { x: 90, z: 24, yaw: -Math.PI / 2 },
  bayou: { x: 44, z: 22, yaw: -Math.PI / 2 },
  shack: { x: 24, z: 22, yaw: -Math.PI / 2 },
  walk: { x: 47, z: 2, yaw: Math.PI },
  north: { x: 47, z: -24, yaw: Math.PI },
  west: { x: -36, z: 32, yaw: -Math.PI / 2 },
  boat,
};
const GLOW_PLACES: Record<string, { x: number; z: number; yaw: number }> = {
  jetty: { x: 68, z: 10, yaw: -Math.PI / 2 },
  mere: { x: 9, z: -6, yaw: -1.7 },
  beacon: { x: GLOW.beacons[0].x + 1.5, z: GLOW.beacons[0].z + 2.5, yaw: 3.6 },
  west: { x: GLOW.beacons[1].x + 3, z: GLOW.beacons[1].z, yaw: -Math.PI / 2 },
  south: { x: GLOW.beacons[2].x, z: GLOW.beacons[2].z - 3, yaw: 0 },
  boat,
};
export const PLACES: Record<string, { x: number; z: number; yaw: number }> = pick({ cove: COVE_PLACES, kettle: KETTLE_PLACES, rime: RIME_PLACES, mire: MIRE_PLACES, glow: GLOW_PLACES });
/** Where a visit begins, when the address does not say. */
export const START = HOME ? 'plaza' : 'jetty';

/** What the chart pins on this island (the cove's are worked out in the chart, from its buildings), and how much of the world it shows. */
export const PINS: readonly { x: number; z: number; label: string }[] = pick<readonly { x: number; z: number; label: string }[]>({
  cove: [],
  kettle: [],
  rime: [
    { x: PIER.x0 + 6, z: PIER.z, label: 'Jetty' },
    { x: ICE_HUT.x, z: ICE_HUT.z, label: 'Ice hut' },
    { x: RIME.lake.x, z: RIME.lake.z, label: 'The ice' },
    { x: RIME.hill.x, z: RIME.hill.z, label: 'Sled hill' },
  ],
  mire: [
    { x: PIER.x0 + 6, z: PIER.z, label: 'Jetty' },
    { x: SHACK.x, z: SHACK.z, label: 'Shack' },
    { x: 47, z: -9, label: 'Boardwalk' },
    { x: -20, z: 32, label: 'Boardwalk' },
  ],
  glow: [
    { x: PIER.x0 + 6, z: PIER.z, label: 'Jetty' },
    { x: GLOW.mere.x, z: GLOW.mere.z, label: 'The Mere' },
    ...GLOW.beacons.map((b) => ({ x: b.x, z: b.z, label: 'Beacon' })),
  ],
});
export const CHART_VIEW: { readonly x: number; readonly z: number; readonly half: number } = pick({ cove: { x: 14, z: -4, half: 98 }, kettle: { x: 0, z: 0, half: 116 }, rime: { x: 8, z: 4, half: 104 }, mire: { x: 4, z: 4, half: 116 }, glow: { x: 6, z: 4, half: 100 } });
