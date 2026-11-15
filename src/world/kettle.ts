// Kettle Isle's ground. A bigger, wilder island than the cove: an old crater in the middle with
// a lake in it (the Kettle), a way in through a notch in its rim, a reef flat off the south-west
// shore where the sea stays shallow a long way out, a shelf of rock on the north-east shore
// with tide pools in it, and a hot spring on the mountain's east flank. Pure, and it knows
// nothing of layout.ts or island.ts, which both read from it.
import { fbm, smoothstep } from '../core/rng';

/** The crater: where it is, how far out its rim and its lake are, the lake's level, and which way the notch in the rim faces. */
export const KETTLE = { x: -8, z: -16, rim: 31, lake: 21, level: 8.4, notch: 0.52, foot: 56 } as const;

/** The reef flat: the middle of its stretch of shore (an angle, atan2(z, x)), half its width, and how deep still counts as reef. */
export const REEF = { at: 2.45, half: 0.8, depth: 2.6 } as const;
/** The shelf of rock with the tide pools in it. */
export const SHELF = { at: -0.74, half: 0.42, wide: 15 } as const;

const turn = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
/** How much an angle is within a stretch of shore: 1 in the middle, 0 outside, soft at the ends. */
const within = (angle: number, at: number, half: number): number => smoothstep(half, half * 0.6, turn(angle, at));

export const reefiness = (angle: number): number => within(angle, REEF.at, REEF.half);
export const shelfiness = (angle: number): number => within(angle, SHELF.at, SHELF.half);
/** The north-west shore is cliff. */
const cliffiness = (angle: number): number => within(angle, -2.2, 0.75);

/** Distance from the centre to the shore at an angle. */
export function kettleShore(angle: number): number {
  return 74 + 6 * Math.sin(2 * angle + 2.1) + 4.5 * Math.sin(3 * angle + 0.4) + 3.5 * fbm(Math.cos(angle) * 2.2 - 3, Math.sin(angle) * 2.2 + 8, 3, 29);
}

/** The ground before any pool is cut into it. */
function ground(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const d = Math.hypot(x, z);
  const inland = kettleShore(angle) - d;
  const reef = reefiness(angle);
  const shelf = shelfiness(angle);
  const cliff = cliffiness(angle);
  const r = Math.hypot(x - KETTLE.x, z - KETTLE.z);
  let h: number;
  if (inland >= 0) {
    const rise = 5 + 12 * reef - 2 * cliff;
    h = 0.35 + (2.0 + 1.5 * cliff) * smoothstep(0, rise, inland) + 0.4 * fbm(x * 0.05, z * 0.05, 3, 17) * smoothstep(0, 10, inland);
    // The shelf: flat rock just above the sea for some metres in from the shore.
    const flat = 0.95 + 0.12 * fbm(x * 0.3, z * 0.3, 2, 5);
    h += (flat - h) * shelf * smoothstep(SHELF.wide + 4, SHELF.wide - 2, inland);
    // The mountain: up to the rim, lower where the notch is.
    const notch = smoothstep(0.36, 0.13, turn(Math.atan2(z - KETTLE.z, x - KETTLE.x), KETTLE.notch));
    h += (13.5 - 7.1 * notch) * smoothstep(KETTLE.foot, KETTLE.rim, r) + 0.9 * fbm(x * 0.09, z * 0.09, 3, 41) * smoothstep(KETTLE.foot, KETTLE.rim + 8, r) * (1 - notch);
    // Inside the rim the wall comes down to the lake's bank.
    if (r < KETTLE.rim) {
      const bank = KETTLE.level + 0.5;
      h = Math.min(h, bank + Math.max(0, h - bank) * smoothstep(KETTLE.lake + 3, KETTLE.rim, r));
    }
  } else {
    const out = -inland;
    const steep = 7 - 4 * cliff;
    const sea = 0.35 - 3.2 * smoothstep(0, steep, out) - 10 * smoothstep(steep * 0.6, steep + 34, out);
    // Over the reef the bottom stays within wading of the top for thirty metres, then falls away.
    const flat = 0.35 - 1.5 * smoothstep(0, 9, out) - 0.75 * smoothstep(9, 30, out) - 11 * smoothstep(30, 62, out);
    h = sea + (flat - sea) * reef;
  }
  // The lake's hollow: deep in the middle, a bank just above the water all round.
  if (r < KETTLE.lake + 3) {
    const bed = KETTLE.level - 0.3 - 4.6 * (1 - Math.pow(Math.min(1, r / KETTLE.lake), 2));
    const bank = KETTLE.level + 0.5;
    h = Math.min(h, r < KETTLE.lake ? bed : bed + (bank - bed) * smoothstep(KETTLE.lake, KETTLE.lake + 3, r));
  }
  return h;
}

export interface Pool {
  x: number;
  z: number;
  r: number;
  /** The water's level, and how deep it is in the middle. */
  level: number;
  depth: number;
  /** The hot spring: to sit in, not to fish. */
  hot?: boolean;
}

/** A place on the shelf: so far round the shore, so far in from it. */
const onShelf = (angle: number, inFrom: number): [number, number] => {
  const d = kettleShore(angle) - inFrom;
  return [Math.cos(angle) * d, Math.sin(angle) * d];
};

function pool(x: number, z: number, r: number, depth: number, sink: number, hot = false): Pool {
  return { x, z, r, depth, level: ground(x, z) - sink, hot };
}

/** The hot spring: on the mountain's east flank, a terrace cut into the slope. */
export const SPRING_AT = { x: KETTLE.x + Math.cos(-0.42) * 47, z: KETTLE.z + Math.sin(-0.42) * 47 } as const;

/** The tide pools on the shelf, and the hot spring. */
export const POOLS: readonly Pool[] = [
  pool(...onShelf(-0.98, 6), 2.6, 0.9, 0.15),
  pool(...onShelf(-0.82, 9), 3.3, 1.0, 0.15),
  pool(...onShelf(-0.66, 5.5), 2.4, 0.8, 0.15),
  pool(...onShelf(-0.52, 8.5), 3.0, 0.95, 0.15),
  pool(SPRING_AT.x, SPRING_AT.z, 3.4, 0.36, 0.25, true),
];

/** Kettle Isle's ground. */
export function kettleHeight(x: number, z: number): number {
  let h = ground(x, z);
  for (const p of POOLS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > p.r + 4) continue;
    // Flat-bottomed, with a bank that the ground's one-metre grid can hold: wide, and well above the water.
    const bed = p.level - 0.05 - p.depth * (1 - Math.pow(Math.min(1, d / p.r), 4));
    const bank = p.level + 0.4;
    const target = d < p.r ? bed : bed + (bank - bed) * smoothstep(p.r - 0.2, p.r + 1.5, d);
    // The ground is brought to the pool's shape close in, and left alone further out: a terrace on a slope.
    h += (target - h) * smoothstep(p.r + 4, p.r + 2, d);
  }
  return h;
}

/** How much of the ground at a place is bare rock for being the shelf (0 to 1): the splat paints it so. */
export function kettleRock(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const inland = kettleShore(angle) - Math.hypot(x, z);
  return shelfiness(angle) * smoothstep(SHELF.wide + 3, SHELF.wide - 1, inland) * smoothstep(-6, -2, inland);
}
