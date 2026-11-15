// What moves in the sky and out at sea: gulls wheeling over the island by day, a boat far out
// going round it, and now and then a shooting star at night. Pure: where each is at a moment,
// from the clock alone, so nothing is kept and nothing is simulated.

const TAU = Math.PI * 2;

/** A number from 0 to 1 that is always the same for the same `n` (and differs by `salt`). */
export function chance(n: number, salt = 0): number {
  const s = Math.sin(n * 127.1 + salt * 311.7 + 0.5) * 43758.5453;
  return s - Math.floor(s);
}

// ---------- Gulls ----------

export const GULLS = 5;
/** A gull's wings are moved this many times a second: on twos, like everything else. */
export const FLAP_RATE = 6;
/** The wings' angles through one beat, radians up from level. */
export const BEAT = [0.55, 0.15, -0.4, 0.05] as const;
/** Held out flat on a glide. */
export const GLIDE = 0.12;

export interface GullAt {
  x: number;
  y: number;
  z: number;
  /** The way it is flying: yaw 0 faces +z. */
  yaw: number;
  /** How far its wings are raised, radians. */
  wings: number;
}

/** Where gull `i` is at `t` seconds: each goes round a wide ring of its own over the island, flapping a while and gliding a while. */
export function gullAt(i: number, t: number): GullAt {
  const radius = 30 + i * 14;
  const way = i % 2 ? -1 : 1;
  const speed = (6.5 + i * 0.8) / radius;
  const a = way * t * speed + i * 2.1;
  // The ring's middle is not the island's: each is off to one side, so they cross.
  const cx = Math.cos(i * 2.4) * 22;
  const cz = Math.sin(i * 2.4) * 22;
  const x = cx + Math.cos(a) * radius;
  const z = cz + Math.sin(a) * radius;
  const y = 19 + i * 2.5 + Math.sin(t * 0.21 + i) * 2;
  // Flying along the ring: the tangent.
  const yaw = Math.atan2(-Math.sin(a) * way, Math.cos(a) * way);
  const spell = Math.floor(t / 2.6 + i * 0.37);
  const gliding = chance(spell, i) < 0.45;
  const wings = gliding ? GLIDE : BEAT[Math.floor(t * FLAP_RATE + i * 1.3) % BEAT.length];
  return { x, y, z, yaw, wings };
}

/** How many gulls are out: all of them by day, fewer in the rain and at dusk, none at night. */
export function gullsOut(night: number, rain: number): number {
  if (night > 0.6) return 0;
  return Math.max(1, Math.round(GULLS * (1 - night) * (1 - rain * 0.7)));
}

// ---------- The boat ----------

/** How far out the boat goes round, metres, and how long once round takes, seconds. */
export const BOAT_OUT = 330;
export const BOAT_ROUND = 2400;

/** Where the boat on the horizon is at `t` seconds, and which way it points (yaw 0 faces +z). */
export function boatAt(t: number): { x: number; z: number; yaw: number } {
  const a = (t / BOAT_ROUND) * TAU + 0.6;
  return { x: Math.cos(a) * BOAT_OUT, z: Math.sin(a) * BOAT_OUT, yaw: Math.atan2(-Math.sin(a), Math.cos(a)) };
}

// ---------- Shooting stars ----------

/** One may fall in each stretch of this many seconds, and takes this long to cross. */
export const STAR_EVERY = 24;
export const STAR_LASTS = 0.7;
/** How many stretches in ten have one. */
export const STAR_ODDS = 0.55;

export interface StarAt {
  /** Where in the sky it is: a compass angle and a height above the horizon, radians. */
  az: number;
  el: number;
  /** How far through its fall, 0 to 1. */
  k: number;
}

/** The shooting star in the sky at `t` seconds, if there is one. */
export function shootingStar(t: number): StarAt | null {
  const n = Math.floor(t / STAR_EVERY);
  if (chance(n, 1) >= STAR_ODDS) return null;
  const from = chance(n, 2) * (STAR_EVERY - STAR_LASTS);
  const k = (t - n * STAR_EVERY - from) / STAR_LASTS;
  if (k < 0 || k >= 1) return null;
  const az = chance(n, 3) * TAU + k * 0.22;
  // Low enough to be seen: the camera never looks far up.
  const el = 0.2 + chance(n, 4) * 0.22 - k * 0.08;
  return { az, el, k };
}
