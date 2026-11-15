// Where everything on the island is. Pure data and a few helpers, no three.js.
//
// Coordinates: +x east, +z south, +y up, metres. The island is centred on the origin; the sea
// surface is y = 0.

export type V2 = readonly [number, number];

export const SEA_LEVEL = 0;
/** The square of world the ground covers, centred on the origin. */
export const WORLD_SIZE = 240;
/** Metres between height samples. */
export const STEP = 1;

/** The freshwater pond, in a hollow in the north-west woods. */
export const POND = { x: -26, z: -24, r: 11, level: 2.6 } as const;

/** The creek: out of the pond's west side, down to the sea. Water level falls along it. */
export const CREEK: readonly V2[] = [
  [-35, -26],
  [-41, -30],
  [-47, -30],
  [-53, -33],
  [-59, -37],
  [-66, -40],
  [-80, -44],
];
export const CREEK_WIDTH = 2.6;

/** The village square, in front of the shop. */
export const PLAZA = { x: 0, z: 14, r: 12, h: 2.2 } as const;

/** The lighthouse hill, north-east. */
export const HILL = { x: 30, z: -36, r: 20, h: 8.5 } as const;

/** The camp in the western meadow. */
export const CAMP = { x: -38, z: 18 } as const;

/** The pier: east from the shore along z, with a wider head at the end. */
/** The pier: whole 3 m sections of deck, so the boards cover every metre that can be walked on. */
export const PIER = { x0: 59, x1: 104, z: 14, width: 3, deck: 2.4, head: { x0: 98, x1: 104, z0: 7, z1: 22 } } as const;

/** Where the rowboat ties up, beside the pier. */
export const BOAT_MOORING = { x: 80, z: 17.6, yaw: Math.PI / 2 } as const;

/** The patch of the square that takes chalk. */
export const CHALK = { x: -5, z: 19, size: 8 } as const;

/** Footpaths, as polylines. */
export const PATHS: readonly (readonly V2[])[] = [
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
export const PATH_WIDTH = 1.7;

/** Where the beach is widest: the south shore. */
export const BEACH_ANGLE = Math.PI / 2;

/**
 * The footbridge over the creek: it stands on the creek's surface (not its bed) and spans it the
 * short way, with an arched deck that can be walked on (see floorAt).
 */
const BRIDGE_AT = { x: -50.2, z: -31.0 };
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
export const CAVE = { x: -24.3, z: -60.3, r: 5.5, mouth: { x: -22.7, z: -56.1, yaw: -2.757 } } as const;

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
export const PLACED: readonly Placed[] = [
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
  return out;
}

/** Floors the player can stand on above the ground: the pier. Axis-aligned rectangles. */
export interface Floor {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}
export const FLOORS: readonly Floor[] = [
  { x0: PIER.x0, x1: PIER.head.x0, z0: PIER.z - PIER.width / 2, z1: PIER.z + PIER.width / 2, y: PIER.deck },
  { x0: PIER.head.x0, x1: PIER.head.x1, z0: PIER.head.z0, z1: PIER.head.z1, y: PIER.deck },
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
export const PLACES: Record<string, { x: number; z: number; yaw: number }> = {
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
