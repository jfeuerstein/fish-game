// Which way a long thin thing (a fishing rod) lies, and which end of it is held. Pure.
//
// A rod's model comes back lying any way round. Its length is the direction its surface is
// most spread along; its handle is the end with more surface to it (the grip and the reel are
// thick, the tip is a thread). Surface, not corners: how many triangles a part has says only
// how finely it was cut, and a rod cut down for the lo-fi look keeps more of them in the
// fiddly tip than in the plain grip. Counting corners held every rod by its tip.

export interface Lie {
  /** The middle of the thing's surface. */
  mean: [number, number, number];
  /** Along its length, from the held end toward the tip. A unit vector. */
  dir: [number, number, number];
  /** How far along `dir` from `mean` the held end and the tip are. */
  lo: number;
  hi: number;
}

/** How a thing lies, from its triangles: nine numbers each, three corners. */
export function lieOf(tris: ArrayLike<number>): Lie {
  const n = Math.floor(tris.length / 9);
  // Each triangle's middle, and its area.
  const mid = new Float64Array(n * 3);
  const area = new Float64Array(n);
  let total = 0;
  const mean: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * 9;
    const ux = tris[o + 3] - tris[o];
    const uy = tris[o + 4] - tris[o + 1];
    const uz = tris[o + 5] - tris[o + 2];
    const vx = tris[o + 6] - tris[o];
    const vy = tris[o + 7] - tris[o + 1];
    const vz = tris[o + 8] - tris[o + 2];
    const a = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    area[i] = a;
    total += a;
    for (let k = 0; k < 3; k++) {
      mid[i * 3 + k] = (tris[o + k] + tris[o + 3 + k] + tris[o + 6 + k]) / 3;
      mean[k] += mid[i * 3 + k] * a;
    }
  }
  if (!(total > 0)) return { mean: [0, 0, 0], dir: [0, 1, 0], lo: 0, hi: 1 };
  for (let k = 0; k < 3; k++) mean[k] /= total;
  // The direction of greatest spread, by power iteration, each triangle weighing what its area is.
  let dir: [number, number, number] = [0.577, 0.577, 0.577];
  for (let it = 0; it < 40; it++) {
    const next: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const dx = mid[i * 3] - mean[0];
      const dy = mid[i * 3 + 1] - mean[1];
      const dz = mid[i * 3 + 2] - mean[2];
      const along = (dx * dir[0] + dy * dir[1] + dz * dir[2]) * area[i];
      next[0] += dx * along;
      next[1] += dy * along;
      next[2] += dz * along;
    }
    const len = Math.hypot(next[0], next[1], next[2]) || 1;
    dir = [next[0] / len, next[1] / len, next[2] / len];
  }
  // How far it reaches each way: by its corners, since the length is to its very ends.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n * 3; i++) {
    const t = (tris[i * 3] - mean[0]) * dir[0] + (tris[i * 3 + 1] - mean[1]) * dir[1] + (tris[i * 3 + 2] - mean[2]) * dir[2];
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  // The held end is the one with more surface in its last third.
  let near = 0;
  let far = 0;
  for (let i = 0; i < n; i++) {
    const t = ((mid[i * 3] - mean[0]) * dir[0] + (mid[i * 3 + 1] - mean[1]) * dir[1] + (mid[i * 3 + 2] - mean[2]) * dir[2] - lo) / (hi - lo || 1);
    if (t < 1 / 3) near += area[i];
    else if (t > 2 / 3) far += area[i];
  }
  if (far > near) {
    dir = [-dir[0], -dir[1], -dir[2]];
    [lo, hi] = [-hi, -lo];
  }
  return { mean, dir, lo, hi };
}
