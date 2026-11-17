// A rod's model is shaped from a picture of a toy rod, and some of the pictures have a line
// hanging from the tip with a hook, a bobber or a charm on the end of it. Shaped, that is a
// stiff wire sticking out of the rod at whatever angle it was painted, with a second bobber on
// it: the game draws the line and the bobber itself. This takes it off.
//
// The rod is all one piece, so it cannot be told apart as a piece. It is told by where it is:
// beyond the reel, anything further from the rod's own middle than a guide ring stands is not
// rod. The middle is followed up the rod from the grip a slice at a time, since a rod may be
// bent. Pure: positions (three numbers a corner) and triangles (three corners each) in, the
// triangles to keep out.

/** How many slices the rod's length is followed in. */
const SLICES = 28;
/** As shares of the rod's length: how far from the last slice's middle the next is looked for, how far from the middle is still rod, and where along it the trimming begins (past the reel). */
const FOLLOW = 0.06;
const KEEP = 0.07;
const FROM = 0.5;

export function trimHanging(pos, idx) {
  const n = idx.length / 3;
  const mid = new Float64Array(n * 3);
  const area = new Float64Array(n);
  const mean = [0, 0, 0];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [a, b, c] = [idx[i * 3] * 3, idx[i * 3 + 1] * 3, idx[i * 3 + 2] * 3];
    const u = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
    const v = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    area[i] = 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    total += area[i];
    for (let k = 0; k < 3; k++) {
      mid[i * 3 + k] = (pos[a + k] + pos[b + k] + pos[c + k]) / 3;
      mean[k] += mid[i * 3 + k] * area[i];
    }
  }
  if (!(total > 0)) return { keep: Array.from(idx), cut: 0 };
  for (let k = 0; k < 3; k++) mean[k] /= total;
  // Its length: the way its surface is most spread.
  let dir = [0.577, 0.577, 0.577];
  for (let it = 0; it < 40; it++) {
    const next = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const d = [mid[i * 3] - mean[0], mid[i * 3 + 1] - mean[1], mid[i * 3 + 2] - mean[2]];
      const along = (d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2]) * area[i];
      for (let k = 0; k < 3; k++) next[k] += d[k] * along;
    }
    const len = Math.hypot(...next) || 1;
    dir = next.map((x) => x / len);
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const t = (pos[i] - mean[0]) * dir[0] + (pos[i + 1] - mean[1]) * dir[1] + (pos[i + 2] - mean[2]) * dir[2];
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  const along = (i) => (mid[i * 3] - mean[0]) * dir[0] + (mid[i * 3 + 1] - mean[1]) * dir[1] + (mid[i * 3 + 2] - mean[2]) * dir[2];
  // The grip's end is the one with more surface in its third (as the game holds it: src/player/long.ts).
  let near = 0;
  let far = 0;
  for (let i = 0; i < n; i++) {
    const t = (along(i) - lo) / (hi - lo);
    if (t < 1 / 3) near += area[i];
    else if (t > 2 / 3) far += area[i];
  }
  if (far > near) {
    dir = dir.map((x) => -x);
    [lo, hi] = [-hi, -lo];
  }
  const long = hi - lo;
  // Each triangle: how far up the rod from the grip (0 to 1), and where it is across it.
  const up = new Float64Array(n);
  const across = new Float64Array(n * 3);
  const bySlice = Array.from({ length: SLICES }, () => []);
  for (let i = 0; i < n; i++) {
    const a = along(i);
    up[i] = (a - lo) / long;
    for (let k = 0; k < 3; k++) across[i * 3 + k] = mid[i * 3 + k] - mean[k] - dir[k] * a;
    bySlice[Math.min(SLICES - 1, Math.max(0, Math.floor(up[i] * SLICES)))].push(i);
  }
  // The rod's middle, slice by slice from the grip, each looked for near the one before.
  const middles = [];
  let last = null;
  for (const slice of bySlice) {
    const c = [0, 0, 0];
    let w = 0;
    for (const i of slice) {
      if (last && Math.hypot(across[i * 3] - last[0], across[i * 3 + 1] - last[1], across[i * 3 + 2] - last[2]) > FOLLOW * long) continue;
      for (let k = 0; k < 3; k++) c[k] += across[i * 3 + k] * area[i];
      w += area[i];
    }
    if (w > 0) last = c.map((x) => x / w);
    middles.push(last ?? [0, 0, 0]);
  }
  const keep = [];
  let cut = 0;
  for (let i = 0; i < n; i++) {
    const m = middles[Math.min(SLICES - 1, Math.max(0, Math.floor(up[i] * SLICES)))];
    const off = Math.hypot(across[i * 3] - m[0], across[i * 3 + 1] - m[1], across[i * 3 + 2] - m[2]);
    if (up[i] > FROM && off > KEEP * long) cut++;
    else keep.push(idx[i * 3], idx[i * 3 + 1], idx[i * 3 + 2]);
  }
  return { keep, cut };
}
