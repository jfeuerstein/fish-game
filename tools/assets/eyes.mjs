// Finds the eyes a character's model has painted on it, and paints them out.
//
// Every generated character comes with eyes painted on its head: two dark ovals, most with a
// white glint. Cut down to a small texture they become smudges, and the game draws eyes of its
// own (src/player/face.ts) that blink and change. So the cutting-down (lofi.mjs) asks this for
// each character: where the painted eyes are, so the drawn ones go exactly there; and it paints
// them out of the full-size texture (or the colours on the corners) before that is made small,
// so nothing is left underneath to show round a blink.
//
// Where an eye is is given in the frame of the head's bone, which is the same whatever the
// pose and however the model's numbers have been packed: { p: [x, y, z], n: [x, y, z], r }, the
// middle of the eye on the surface, the way the surface faces there, and the eye's radius.
//
// `on` is how light (0 to 1) what was round the eye is, so the game knows whether a dark eye
// will show there or must be drawn pale.
//
//   node tools/assets/eyes.mjs [id ...]     # say what is found, and draw it: tools/scratch/eyes-<id>.png

/**
 * How dark (0 to 1) the black of an eye is. It differs from model to model, from nearly black
 * to a soft charcoal, so each of these is tried in turn until two eyes are found: the lowest
 * first, since a raccoon's eyes are black on a mask that is only a little paler.
 */
const DARKS = [0.115, 0.14, 0.165, 0.19, 0.215, 0.24];
/** Fur darker than this hides a dark eye: such an eye is not painted out, and the game draws its own pale. */
const ON_DARK = 0.27;
const luma = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// 4x4 matrices as glTF stores them: sixteen numbers, a column at a time.
const point = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The skinned mesh of a character, read out: its corners in the head bone's frame and in the world. */
export function readBody(doc) {
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) return null;
  const joints = skin.listJoints();
  const h = joints.findIndex((j) => /^head$/i.test(j.getName()));
  if (h < 0) return null;
  const toHead = skin.getInverseBindMatrices().getElement(h, []);
  const headWorld = joints[h].getWorldMatrix();
  const prim = root.listMeshes().flatMap((m) => m.listPrimitives()).find((p) => p.getAttribute('JOINTS_0'));
  if (!prim) return null;
  const pos = prim.getAttribute('POSITION');
  const n = pos.getCount();
  const head = new Array(n);
  const world = new Array(n);
  let lo = Infinity;
  let hi = -Infinity;
  const el = [];
  for (let i = 0; i < n; i++) {
    head[i] = point(toHead, pos.getElement(i, el));
    world[i] = point(headWorld, head[i]);
    lo = Math.min(lo, world[i][1]);
    hi = Math.max(hi, world[i][1]);
  }
  const idx = prim.getIndices();
  const tris = [];
  const count = idx ? idx.getCount() : n;
  for (let i = 0; i < count; i += 3) tris.push(idx ? [idx.getScalar(i), idx.getScalar(i + 1), idx.getScalar(i + 2)] : [i, i + 1, i + 2]);
  return { prim, head, world, tris, height: hi - lo, headY: headWorld[13], texture: prim.getMaterial()?.getBaseColorTexture() ?? null };
}

/**
 * Which triangle each pixel of a texture belongs to (-1: none), from the corners' places on it.
 * This is also what says which pixels of a texture are used at all.
 */
export function trianglesOnTexture(prim, tris, width, height) {
  const uv = prim.getAttribute('TEXCOORD_0');
  const map = new Int32Array(width * height).fill(-1);
  if (!uv) return map;
  const el = [];
  const at = (i) => {
    uv.getElement(i, el);
    return [el[0] * width, el[1] * height];
  };
  tris.forEach(([a, b, c], t) => {
    const A = at(a);
    const B = at(b);
    const C = at(c);
    const area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    if (Math.abs(area) < 1e-9) return;
    const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((B[0] - px) * (C[1] - py) - (B[1] - py) * (C[0] - px)) / area;
        const w1 = ((C[0] - px) * (A[1] - py) - (C[1] - py) * (A[0] - px)) / area;
        const w2 = 1 - w0 - w1;
        // A little generous at the edges, so a triangle's own border pixels count as its own.
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) map[y * width + x] = t;
      }
  });
  return map;
}

/** Of several dark patches on a head, the two that are its eyes: level with each other, alike in size, looking the same way. */
function pair(spots, body, say) {
  const H = body.height;
  let best = null;
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) {
      const a = spots[i];
      const b = spots[j];
      const alike = Math.min(a.area, b.area) / Math.max(a.area, b.area);
      const level = Math.abs(a.world[1] - b.world[1]) / H;
      const apart = Math.hypot(a.world[0] - b.world[0], a.world[2] - b.world[2]) / H;
      const facing = dot(a.normal, b.normal);
      // Eyes are a mirror pair: either side of the head's middle, which in the head bone's frame is x = 0.
      const mirrored = Math.abs(a.at[0] + b.at[0]) / (Math.abs(a.at[0] - b.at[0]) || 1e-9);
      say?.(`  ${i},${j}: level ${level.toFixed(3)} alike ${alike.toFixed(2)} apart ${apart.toFixed(2)} facing ${facing.toFixed(2)} off-middle ${mirrored.toFixed(2)}`);
      if (alike < 0.4 || level > 0.05 || apart < 0.07 || apart > 0.6 || facing < -0.4 || mirrored > 0.4) continue;
      // Ears and cheeks are level too: eyes are the pair most alike, looking most the same way,
      // and a glint in each is as good as a signature.
      const cost = level * 4 + (1 - alike) * 0.5 + mirrored * 0.5 - (a.glint && b.glint ? 0.3 : 0) - Math.min(0.1, (a.r + b.r) / H);
      if (!best || cost < best.cost) best = { cost, a, b };
    }
  return best ? Object.assign([best.a, best.b], { cost: best.cost }) : [];
}

/** What is handed back for each eye, in the head bone's frame. */
const told = (s) => ({ p: s.at.map((v) => +v.toFixed(5)), n: s.normalHead.map((v) => +v.toFixed(4)), r: +s.r.toFixed(5), on: +(s.on ?? 1).toFixed(3) });

/**
 * A character's painted eyes, found on its texture: `raw` is the texture's pixels (RGBA), which
 * are changed so that the eyes are painted out. Returns the two eyes, or none.
 */
export function eyesOnTexture(body, raw, width, height, say) {
  const { prim, tris, head, world } = body;
  const owner = trianglesOnTexture(prim, tris, width, height);
  const N = width * height;
  // Each triangle's size on the head against its size on the texture, and which way it faces.
  const uv = prim.getAttribute('TEXCOORD_0');
  const el = [];
  const texel = (i) => {
    uv.getElement(i, el);
    return [el[0] * width, el[1] * height];
  };
  const scale = new Float64Array(tris.length);
  const normals = new Array(tris.length);
  tris.forEach(([a, b, c], t) => {
    const n3 = cross(sub(head[b], head[a]), sub(head[c], head[a]));
    const A = texel(a);
    const B = texel(b);
    const C = texel(c);
    const onTexture = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) / 2;
    scale[t] = onTexture > 1e-9 ? len(n3) / 2 / onTexture : 0;
    normals[t] = n3;
  });
  /** Patches of pixels darker than `limit` that touch, each with where it is on the head. */
  const patches = (limit) => {
  const dark = new Uint8Array(N);
  // Dark wherever it is: an eye near the edge of its piece of the texture runs on into the
  // unused margin beside it, and must be painted out there too or it comes back when the
  // texture is made small.
  for (let i = 0; i < N; i++) if (luma(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]) < limit) dark[i] = 1;
  const seen = new Uint8Array(N);
  const spots = [];
  for (let start = 0; start < N; start++) {
    if (!dark[start] || seen[start] || owner[start] < 0) continue;
    const pixels = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      pixels.push(i);
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const k = ny * width + nx;
          if (dark[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
    }
    if (pixels.length < 40 || pixels.length > 60000) continue;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let area = 0;
    const at = [0, 0, 0];
    const worldAt = [0, 0, 0];
    const normal = [0, 0, 0];
    for (const i of pixels) {
      const x = i % width;
      const y = (i - x) / width;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      const t = owner[i];
      if (t < 0) continue;
      const [a, b, c] = tris[t];
      // Where on the head this pixel is: its place in its triangle.
      const A = texel(a);
      const B = texel(b);
      const C = texel(c);
      const d = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const w0 = ((B[0] - x - 0.5) * (C[1] - y - 0.5) - (B[1] - y - 0.5) * (C[0] - x - 0.5)) / d;
      const w1 = ((C[0] - x - 0.5) * (A[1] - y - 0.5) - (C[1] - y - 0.5) * (A[0] - x - 0.5)) / d;
      const w2 = 1 - w0 - w1;
      const s = scale[t];
      area += s;
      for (let k = 0; k < 3; k++) {
        at[k] += (head[a][k] * w0 + head[b][k] * w1 + head[c][k] * w2) * s;
        worldAt[k] += (world[a][k] * w0 + world[b][k] * w1 + world[c][k] * w2) * s;
        normal[k] += normals[t][k] * s;
      }
    }
    if (area <= 0) continue;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    // A glint: pale pixels walled in by the patch.
    let glint = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * width + x;
        if (!dark[i] && luma(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]) > 0.8) glint++;
      }
    spots.push({ parts: [{ pixels, box: [x0, y0, x1, y1] }], area, at: at.map((v) => v / area), world: worldAt.map((v) => v / area), sum: normal, fill: pixels.length / (w * h), shape: w / h, glint: glint >= 3 });
  }
  return spots;
  };

  const H = body.height;
  const floor = body.world.reduce((m, p) => Math.min(m, p[1]), Infinity);
  const tries = [];
  for (const limit of DARKS) {
    // On the head, and neither a speck nor a mask.
    const on = patches(limit).filter((s) => s.world[1] > body.headY - 0.04 * H && s.area < Math.PI * (0.09 * H) ** 2);
    // An eye that lies across a seam of the texture is two patches there and one on the head.
    const whole = [];
    for (const s of on.sort((a, b) => b.area - a.area)) {
      const r = Math.sqrt(s.area / Math.PI);
      const near = whole.find((w) => len(sub(w.at, s.at)) < 1.7 * Math.max(r, Math.sqrt(w.area / Math.PI)));
      if (!near) {
        whole.push({ ...s, parts: [...s.parts], sum: [...s.sum] });
        continue;
      }
      const total = near.area + s.area;
      near.at = near.at.map((v, k) => (v * near.area + s.at[k] * s.area) / total);
      near.world = near.world.map((v, k) => (v * near.area + s.world[k] * s.area) / total);
      near.sum = near.sum.map((v, k) => v + s.sum[k]);
      near.area = total;
      near.parts.push(...s.parts);
      near.glint ||= s.glint;
      near.joined = true;
    }
    const likely = whole
      .map((s) => ({ ...s, r: Math.sqrt(s.area / Math.PI), normalHead: unit(s.sum), normal: unit(s.sum) }))
      .filter((s) => s.r > 0.012 * H && (s.joined || (s.fill > 0.4 && s.shape > 0.4 && s.shape < 2.5)));
    say?.(`  darker than ${limit}: ${on.length} patches on the head, ${likely.length} eye-like`);
    likely.forEach((s, i) => say?.(`  ${i}: r ${(s.r / H).toFixed(3)}h y ${((s.world[1] - floor) / H).toFixed(3)}h parts ${s.parts.length} glint ${s.glint}`));
    const found = pair(likely, body, say);
    say?.(found.length ? `  -> eyes of r ${found.map((e) => (e.r / H).toFixed(3)).join(', ')}h, cost ${found.cost.toFixed(3)}` : '  -> none');
    tries.push(found);
  }
  // The likeliest two of all those found; then followed up the ladder while they fill out (their
  // soft edges are paler than their middles), and kept as they were before they ran into
  // anything round them.
  let at = -1;
  tries.forEach((t, i) => {
    if (t.length && (at < 0 || t.cost < tries[at].cost - 1e-9)) at = i;
  });
  let eyes = at < 0 ? [] : tries[at];
  for (let i = at + 1; at >= 0 && i < tries.length; i++) {
    const next = tries[i];
    const same = next.length && next.every((f) => eyes.some((e) => len(sub(e.at, f.at)) < Math.max(e.r, f.r)));
    if (!same || (next[0].area + next[1].area) / (eyes[0].area + eyes[1].area) > 3.5) break;
    eyes = next;
  }
  // Painted out: each eye's pixels, its glint and a rim round it take the colour of what is
  // round them, filled from the outside in a ring at a time. First each piece of each eye is
  // marked out, and how light the head is just round it (past its soft edge) is measured.
  const edge = (out, i, x, y, inside) => (x > 0 && !!out[i - 1] === inside) || (x < width - 1 && !!out[i + 1] === inside) || (y > 0 && !!out[i - width] === inside) || (y < height - 1 && !!out[i + width] === inside);
  for (const eye of eyes) {
    let round = 0;
    let counted = 0;
    for (const part of eye.parts) {
      const [x0, y0, x1, y1] = part.box;
      const grow = Math.max(4, Math.round(Math.max(x1 - x0, y1 - y0) * 0.3));
      const bx0 = Math.max(0, x0 - grow - 1);
      const by0 = Math.max(0, y0 - grow - 1);
      const bx1 = Math.min(width - 1, x1 + grow + 1);
      const by1 = Math.min(height - 1, y1 + grow + 1);
      const out = new Uint8Array(N);
      for (const i of part.pixels) out[i] = 1;
      // The glint, and anything else inside the patch's outline.
      const holes = [];
      for (let y = y0; y <= y1; y++) {
        let first = -1;
        let last = -1;
        for (let x = x0; x <= x1; x++)
          if (out[y * width + x]) {
            if (first < 0) first = x;
            last = x;
          }
        for (let x = first; first >= 0 && x <= last; x++)
          if (!out[y * width + x]) {
            out[y * width + x] = 1;
            holes.push(y * width + x);
          }
      }
      part.holes = holes;
      // What an eye is filled with comes from the head round it, never from the unused margin of
      // the texture or from another piece that happens to lie beside it there (a shirt, say).
      const good = new Uint8Array(N);
      for (let y = by0; y <= by1; y++)
        for (let x = bx0; x <= bx1; x++) {
          const i = y * width + x;
          const t = owner[i];
          if (t < 0) continue;
          const [a, b, c] = tris[t];
          const mid = [0, 1, 2].map((k) => (head[a][k] + head[b][k] + head[c][k]) / 3);
          if (len(sub(mid, eye.at)) < 4 * eye.r) good[i] = 1;
        }
      for (let pass = 0; pass < grow; pass++) {
        const add = [];
        for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (!out[y * width + x] && edge(out, y * width + x, x, y, true)) add.push(y * width + x);
        for (const i of add) {
          out[i] = 1;
          if (pass >= 3 && pass < 7 && good[i]) {
            round += luma(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]);
            counted++;
          }
        }
      }
      Object.assign(part, { out, good, bounds: [bx0, by0, bx1, by1], grow });
    }
    eye.on = counted ? round / counted : 1;
  }
  // Eyes on fur nearly as dark as themselves (a raccoon's mask) are left dark: painting them
  // out would paint out the mask. Only their glints go, into the dark round them, or they would
  // show under a shut eye.
  if (eyes.some((e) => e.on < ON_DARK)) {
    const on = Math.min(...eyes.map((e) => e.on));
    for (const eye of eyes) {
      eye.on = on;
      for (const part of eye.parts) {
        const dark = [0, 0, 0];
        for (const i of part.pixels) for (let j = 0; j < 3; j++) dark[j] += raw[i * 4 + j] / part.pixels.length;
        for (const i of part.holes) for (let j = 0; j < 3; j++) raw[i * 4 + j] = dark[j];
      }
    }
    return eyes.map(told);
  }
  for (const eye of eyes)
    for (const { out, good, bounds, grow } of eye.parts) {
      const [bx0, by0, bx1, by1] = bounds;
      let lax = false;
      for (let pass = 0; pass < 4 * grow + 400; pass++) {
        const fill = [];
        for (let y = by0; y <= by1; y++)
          for (let x = bx0; x <= bx1; x++) {
            const i = y * width + x;
            if (!out[i] || !edge(out, i, x, y, false)) continue;
            const c = [0, 0, 0];
            let n = 0;
            for (const k of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
              if (k < 0 || out[k] || !(good[k] || lax)) continue;
              for (let j = 0; j < 3; j++) c[j] += raw[k * 4 + j];
              n++;
            }
            if (n) fill.push([i, c.map((v) => v / n)]);
          }
        if (!fill.length) {
          // Nothing of the head touches what is left: take whatever does.
          if (lax) break;
          lax = true;
          continue;
        }
        for (const [i, c] of fill) {
          raw[i * 4] = c[0];
          raw[i * 4 + 1] = c[1];
          raw[i * 4 + 2] = c[2];
          out[i] = 0;
          good[i] = 1;
        }
      }
    }
  return eyes.map(told);
}

/**
 * A character's painted eyes, found in the colours on its corners (a model with no texture).
 * The colours of the eyes' corners are changed to those round them. Returns the two eyes, or none.
 */
export function eyesOnCorners(body, say) {
  const { prim, tris, head, world } = body;
  const col = prim.getAttribute('COLOR_0');
  if (!col) return [];
  const n = col.getCount();
  const el = [];
  const colour = new Array(n);
  // Stored linear: back to what is seen, to judge how dark.
  const seen = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
  for (let i = 0; i < n; i++) colour[i] = col.getElement(i, el).slice(0, 4);
  const isDark = (i) => luma(seen(colour[i][0]), seen(colour[i][1]), seen(colour[i][2])) < DARKS[2];
  // Corners in the same place are one corner.
  const key = (i) => head[i].map((v) => Math.round(v * 2e4)).join(',');
  const place = new Map();
  const same = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = key(i);
    if (!place.has(k)) place.set(k, i);
    same[i] = place.get(k);
  }
  const H = body.height;
  // Dark triangles that share corners make a patch.
  const group = new Int32Array(n).fill(-1);
  const find = (i) => {
    while (group[i] !== i) i = group[i] = group[group[i]];
    return i;
  };
  const darkTris = [];
  tris.forEach(([a, b, c], t) => {
    if ([a, b, c].filter(isDark).length < 2) return;
    if (Math.min(world[a][1], world[b][1], world[c][1]) < body.headY - 0.04 * H) return;
    darkTris.push(t);
    for (const v of [a, b, c]) if (group[same[v]] < 0) group[same[v]] = same[v];
    const r = find(same[a]);
    group[find(same[b])] = r;
    group[find(same[c])] = r;
  });
  const patches = new Map();
  for (const t of darkTris) {
    const [a, b, c] = tris[t];
    const g = find(same[a]);
    if (!patches.has(g)) patches.set(g, { tris: [], area: 0, at: [0, 0, 0], world: [0, 0, 0], normal: [0, 0, 0] });
    const p = patches.get(g);
    const n3 = cross(sub(head[b], head[a]), sub(head[c], head[a]));
    const area = len(n3) / 2;
    p.tris.push(t);
    p.area += area;
    for (let k = 0; k < 3; k++) {
      p.at[k] += ((head[a][k] + head[b][k] + head[c][k]) / 3) * area;
      p.world[k] += ((world[a][k] + world[b][k] + world[c][k]) / 3) * area;
      p.normal[k] += n3[k];
    }
  }
  const spots = [...patches.values()]
    .filter((p) => p.area > 0)
    .map((p) => ({ ...p, at: p.at.map((v) => v / p.area), world: p.world.map((v) => v / p.area), normalHead: unit(p.normal), normal: unit(p.normal), r: Math.sqrt(p.area / Math.PI), glint: false }))
    .filter((s) => s.r > 0.008 * H && s.r < 0.09 * H);
  say?.(`  ${spots.length} dark patches on the head`);
  const eyes = pair(spots, body, say);
  // Painted out: each dark corner takes the colour of the nearest corner that is not.
  const neighbours = new Map();
  for (const [a, b, c] of tris)
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      for (const [x, y] of [[same[u], same[v]], [same[v], same[u]]]) {
        if (!neighbours.has(x)) neighbours.set(x, new Set());
        neighbours.get(x).add(y);
      }
    }
  const members = new Map();
  for (let i = 0; i < n; i++) {
    if (!members.has(same[i])) members.set(same[i], []);
    members.get(same[i]).push(i);
  }
  for (const eye of eyes) {
    let todo = new Set(eye.tris.flatMap((t) => tris[t]).filter(isDark).map((i) => same[i]));
    const fixed = new Map();
    for (let pass = 0; pass < 40 && todo.size; pass++) {
      const done = [];
      for (const v of todo) {
        const from = [...(neighbours.get(v) ?? [])].filter((u) => !todo.has(u));
        if (!from.length) continue;
        const c = [0, 0, 0];
        for (const u of from) {
          const src = fixed.get(u) ?? colour[members.get(u).find((i) => !isDark(i)) ?? u];
          for (let k = 0; k < 3; k++) c[k] += src[k] / from.length;
        }
        done.push([v, c]);
      }
      if (!done.length) break;
      for (const [v, c] of done) {
        fixed.set(v, c);
        todo.delete(v);
      }
    }
    for (const [v, c] of fixed) for (const i of members.get(v)) if (isDark(i)) col.setElement(i, [c[0], c[1], c[2], colour[i][3] ?? 1]);
    const all = [...fixed.values()];
    eye.on = all.length ? all.reduce((sum, c) => sum + luma(seen(c[0]), seen(c[1]), seen(c[2])), 0) / all.length : 1;
  }
  return eyes.map(told);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { Logger, NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { MeshoptDecoder } = await import('meshoptimizer');
  const { default: sharp } = await import('sharp');
  const { mkdirSync, readFileSync } = await import('node:fs');
  await MeshoptDecoder.ready;
  const ROOT = new URL('../../', import.meta.url).pathname;
  const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.WARN)).registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const index = JSON.parse(readFileSync(`${ROOT}public/models/index.json`, 'utf8'));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(index).filter((id) => index[id].rig);
  mkdirSync(`${ROOT}tools/scratch`, { recursive: true });
  for (const id of ids) {
    const doc = await io.read(`${ROOT}art/models/${id}.glb`);
    const body = readBody(doc);
    console.log(id);
    if (!body) {
      console.log('  no skin, or no head bone');
      continue;
    }
    let eyes;
    if (body.texture) {
      const { data, info } = await sharp(Buffer.from(body.texture.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      eyes = eyesOnTexture(body, data, info.width, info.height, console.log);
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(512).png().toFile(`${ROOT}tools/scratch/eyes-${id}.png`);
    } else eyes = eyesOnCorners(body, console.log);
    console.log(`  eyes: ${JSON.stringify(eyes)}`);
  }
}
