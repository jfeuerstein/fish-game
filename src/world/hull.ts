// A rowboat's shape, read from its model: which end is the bow, where its floor and its
// benches are, and where an oar would sit on its rim. Pure. The model comes back from being
// made any way round, and the boat went stern first for as long as nobody asked which end was
// which.
//
// The points are the model's corners, three numbers each, with the boat's length along z and
// its bottom about y = 0.

export interface Hull {
  /** Which way along z the bow points: the narrow end. */
  bow: 1 | -1;
  /** Where along z the boat begins and ends, and how wide it is at its widest (half of it). */
  z0: number;
  z1: number;
  half: number;
  /** The top of the floor inside it. */
  floor: number;
  /** The bench to row from: its middle along z, and its top. */
  seat: { z: number; y: number };
  /** Where an oar rests, on the rim before whoever sits on that bench facing the stern: how far along, how far out, how high. */
  lock: { z: number; x: number; y: number };
}

/** How many slices the boat's length is read in. */
const SLICES = 24;
/** How far before the rower, toward the stern, the oars are. */
const REACH = 0.4;

export function readHull(points: ArrayLike<number>): Hull {
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < points.length; i += 3) {
    z0 = Math.min(z0, points[i + 2]);
    z1 = Math.max(z1, points[i + 2]);
  }
  const long = z1 - z0 || 1;
  // By slices of its length: how wide it is, how high its rim is, and how high it is down the middle.
  const wide = new Array<number>(SLICES).fill(0);
  const rim = new Array<number>(SLICES).fill(-Infinity);
  const mid = new Array<number>(SLICES).fill(-Infinity);
  let half = 0;
  for (let i = 0; i < points.length; i += 3) half = Math.max(half, Math.abs(points[i]));
  for (let i = 0; i < points.length; i += 3) {
    const k = Math.min(SLICES - 1, Math.floor(((points[i + 2] - z0) / long) * SLICES));
    const x = Math.abs(points[i]);
    wide[k] = Math.max(wide[k], x);
    rim[k] = Math.max(rim[k], points[i + 1]);
    if (x < half * 0.18) mid[k] = Math.max(mid[k], points[i + 1]);
  }
  // The bow is the narrow end: the stern is cut off square.
  const ends = Math.max(2, Math.round(SLICES / 8));
  const width = (from: number): number => wide.slice(from, from + ends).reduce((a, b) => a + b, 0) / ends;
  const bow: 1 | -1 = width(SLICES - ends) < width(0) ? 1 : -1;
  // The floor: the lowest the middle gets, away from the ends. A bench is where the middle stands well above it.
  const inner = (k: number): boolean => k >= ends && k < SLICES - ends && mid[k] > -Infinity;
  let floor = Infinity;
  for (let k = 0; k < SLICES; k++) if (inner(k)) floor = Math.min(floor, mid[k]);
  if (floor === Infinity) floor = 0;
  let top = -Infinity;
  for (let k = 0; k < SLICES; k++) if (inner(k)) top = Math.max(top, mid[k]);
  const raised = (k: number): boolean => inner(k) && mid[k] > floor + Math.max(0.06, (top - floor) * 0.5);
  const benches: { z: number; y: number }[] = [];
  for (let k = 0; k < SLICES; k++) {
    if (!raised(k)) continue;
    let end = k;
    while (end + 1 < SLICES && raised(end + 1)) end++;
    let y = -Infinity;
    for (let j = k; j <= end; j++) y = Math.max(y, mid[j]);
    benches.push({ z: z0 + (((k + end + 1) / 2) * long) / SLICES, y });
    k = end;
  }
  // The rower's is the one nearest a little bow-ward of the middle: there is room before it for the oars.
  const want = (z0 + z1) / 2 + bow * long * 0.1;
  const seat = benches.length ? benches.reduce((a, b) => (Math.abs(b.z - want) < Math.abs(a.z - want) ? b : a)) : { z: want, y: floor + 0.25 };
  const lockZ = seat.z - bow * REACH;
  const at = Math.min(SLICES - 1, Math.max(0, Math.floor(((lockZ - z0) / long) * SLICES)));
  return { bow, z0, z1, half, floor, seat, lock: { z: lockZ, x: wide[at] || half, y: rim[at] > -Infinity ? rim[at] : floor + 0.4 } };
}

/** How fast the oars go round, radians a second: a stroke every second and a half. */
export const STROKE_RATE = 4.2;

/**
 * Where an oar is in its stroke. `phase` goes round once a stroke: from 0 the blades are in the
 * water and pulled from bow to stern (the drive), and from half way they are lifted and carried
 * back. `effort` is how hard the rower is rowing, 0 to 1: with none, the oars rest level,
 * straight out. Returns how far the oar is swung (positive: its blade toward the stern), how
 * far its blade is tipped down, and how hard the stroke is pulling the boat just now (0 to 1).
 */
export function oarAt(phase: number, effort: number): { sweep: number; dip: number; pull: number } {
  const drive = Math.sin(phase);
  return { sweep: -OAR.swing * Math.cos(phase) * effort, dip: OAR.rest + (OAR.level - OAR.rest + OAR.dig * drive) * effort, pull: Math.max(0, drive) * effort };
}

/** An oar: how long it is outboard of the rim and inboard of it, how far it swings each way, and how far its blade is tipped down at rest, on the level of the water, and deeper in the drive (radians). */
export const OAR = { out: 1.7, inn: 0.62, swing: 0.55, rest: 0.22, level: 0.36, dig: 0.15 } as const;
