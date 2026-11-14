#!/usr/bin/env node
// Colour a generated character from its own picture when the 3D model came back without a
// usable texture (it happens: Tripo returned the frog grey). The picture is a front view, so
// each vertex takes the colour of the picture where it would appear from the front; on the
// back, features like eyes are replaced by the colour around them. Writes vertex colours and
// drops the texture, then slims the model into public/models as usual.
//
//   node tools/assets/paint-from-picture.mjs char-frog
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const id = process.argv[2];
const ROOT = new URL('../../', import.meta.url).pathname;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(`${ROOT}tools/assets/cache/${id}.rigged.glb`);
const { data, info } = await sharp(`${ROOT}tools/assets/cache/${id}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x, y) => {
  const i = (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const isBg = ([r, g, b]) => r > 235 && g > 235 && b > 235;
// The figure's extent in the picture.
let x0 = W, x1 = 0, y0 = H, y1 = 0;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (!isBg(px(x, y))) {
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const feature = (c) => lum(c) < 0.22 || (lum(c) > 0.85 && sat(c) < 0.12);
/** The usual colour around a point, leaving out eyes and background. */
const around = (x, y) => {
  const counts = new Map();
  for (let dy = -60; dy <= 60; dy += 6) for (let dx = -60; dx <= 60; dx += 6) {
    const c = px(x + dx, y + dy);
    if (isBg(c) || feature(c)) continue;
    const key = c.map((v) => v >> 4).join(',');
    const e = counts.get(key) ?? { n: 0, c };
    e.n++;
    counts.set(key, e);
  }
  let best = null;
  for (const e of counts.values()) if (!best || e.n > best.n) best = e;
  return best ? best.c : px(x, y);
};
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const pos = prim.getAttribute('POSITION');
  const nrm = prim.getAttribute('NORMAL');
  const n = pos.getCount();
  const P = [];
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const p = pos.getElement(i, []);
    P.push(p);
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
  }
  // Up is the tallest axis; across is the widest of the other two (arms out); the third is front to back.
  const ext = [0, 1, 2].map((k) => max[k] - min[k]);
  const up = 1;
  const across = ext[0] > ext[2] ? 0 : 2;
  const depth = across === 0 ? 2 : 0;
  // Which way along the depth axis is the front: the eyes are the highest things, and they sit forward.
  const topVerts = P.filter((p) => p[up] > max[up] - ext[up] * 0.08);
  const mid = (min[depth] + max[depth]) / 2;
  const frontSign = topVerts.reduce((a, p) => a + (p[depth] - mid), 0) >= 0 ? 1 : -1;
  const colours = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const p = P[i];
    const u = (p[across] - min[across]) / ext[across];
    const v = 1 - (p[up] - min[up]) / ext[up];
    const ix = x0 + u * (x1 - x0);
    const iy = y0 + v * (y1 - y0);
    let c = px(ix, iy);
    const facing = nrm ? nrm.getElement(i, [])[depth] * frontSign : 1;
    if (isBg(c) || (facing < -0.15 && feature(c))) c = around(ix, iy);
    // Colours to linear, as glTF wants.
    for (let k = 0; k < 3; k++) colours[i * 4 + k] = Math.pow(c[k] / 255, 2.2);
    colours[i * 4 + 3] = 1;
  }
  const acc = doc.createAccessor().setType('VEC4').setArray(colours).setBuffer(doc.getRoot().listBuffers()[0]);
  prim.setAttribute('COLOR_0', acc);
  const mat = prim.getMaterial();
  if (mat) mat.setBaseColorTexture(null).setBaseColorFactor([1, 1, 1, 1]);
  console.log(`${id}: painted ${n} vertices (across axis ${across}, front ${frontSign > 0 ? '+' : '-'}${'xyz'[depth]})`);
}
await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(`${ROOT}public/models/${id}.glb`, doc);
