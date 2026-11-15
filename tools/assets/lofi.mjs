#!/usr/bin/env node
// Makes the game's lo-fi models, icons and ground from the full-detail ones in art/.
//
//   node tools/assets/lofi.mjs [models|icons|ground|title] [id ...]
//
// The asset tools (Tripo, fal, Blender) write soft, detailed models and pictures into art/.
// Nothing there is shipped. This cuts each one down to what the game draws:
//
// - a model loses most of its triangles and its texture becomes a small one in the island's
//   inks (palette.mjs), with pixels meant to be seen: public/models/<id>.glb;
// - an icon becomes a little pixel sprite with a dark line round it: public/icons/<id>.webp;
// - the ground is drawn here as small repeating tiles of pixel art: public/textures/;
// - the picture on the way in becomes a small one in the same inks: public/art/title.webp.
//
// It reads nothing from the network and costs nothing; run it again after any asset tool.
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import sharp from 'sharp';
import { INKS, calm, inkFor, inked } from './palette.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.WARN)).registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

/**
 * How far each kind of thing is cut down: triangles at most, its texture's width in pixels,
 * and how many colours of its own the texture keeps before they are moved to inks.
 */
const CUT = {
  char: { tris: 1500, tex: 128, colours: 14 },
  big: { tris: 1400, tex: 256, colours: 16 },
  prop: { tris: 420, tex: 64, colours: 10 },
  plant: { tris: 220, tex: 64, colours: 8 },
  hat: { tris: 380, tex: 64, colours: 10 },
  extra: { tris: 320, tex: 64, colours: 8 },
  fish: { tris: 300, tex: 64, colours: 10 },
};
/** The buildings, which fill the screen, and the small growing things, which are everywhere. */
const BIG = new Set(['shop', 'arcade', 'lighthouse', 'fishing-hut', 'bridge', 'rowboat', 'tent', 'well', 'notice-board', 'cliff']);
const PLANT = new Set(['tree-pine', 'tree-round', 'tree-birch', 'tree-palm', 'bush', 'flowers', 'grass-tuft', 'mushrooms', 'cattails', 'lilypad', 'rock-a', 'rock-b', 'shell', 'cloud']);

const index = JSON.parse(readFileSync(`${ROOT}public/models/index.json`, 'utf8'));
const cutFor = (id) => CUT[BIG.has(id) ? 'big' : PLANT.has(id) ? 'plant' : (index[id]?.kind ?? 'prop')] ?? CUT.prop;

export async function lofiModel(id) {
  const cut = cutFor(id);
  const doc = await io.read(`${ROOT}art/models/${id}.glb`);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  let tris = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  const ratio = Math.min(1, cut.tris / tris);
  await doc.transform(dedup(), weld(), ...(ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.08, lockBorder: false })] : []), prune());
  for (const tex of root.listTextures()) {
    const image = tex.getImage();
    if (!image) continue;
    const px = await inked(Buffer.from(image), cut.tex, cut.colours);
    const png = await sharp(calm(px.data, px.width, px.height), { raw: { width: px.width, height: px.height, channels: 4 } }).png({ palette: true, colours: 64, dither: 0, compressionLevel: 9 }).toBuffer();
    tex.setImage(png).setMimeType('image/png');
  }
  // Colours painted on the corners (the frog, the pier) go to inks too. They are stored linear.
  const toByte = (v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
  const toLinear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  for (const m of root.listMeshes())
    for (const p of m.listPrimitives()) {
      const col = p.getAttribute('COLOR_0');
      if (!col) continue;
      const el = [];
      for (let i = 0; i < col.getCount(); i++) {
        col.getElement(i, el);
        const ink = inkFor(toByte(Math.min(1, el[0])), toByte(Math.min(1, el[1])), toByte(Math.min(1, el[2])));
        el[0] = toLinear(ink[0]);
        el[1] = toLinear(ink[1]);
        el[2] = toLinear(ink[2]);
        col.setElement(i, el);
      }
    }
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'EXT_texture_webp') ext.dispose();
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${ROOT}public/models/${id}.glb`, doc);
  return { tris, now: Math.round(tris * ratio) };
}

const INK = [16, 24, 31];
/** How many pixels across a sprite is. Icons are shown at two or three times this. */
const SPRITE = 48;

/** An icon as a pixel sprite: 48 across, a few inks, hard edges, a dark line round it. */
export async function lofiIcon(id) {
  const src = `${ROOT}art/icons/${id}.webp`;
  const inner = SPRITE - 2;
  const trimmed = await sharp(src).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const fitted = await sharp(trimmed).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer();
  // Colours are chosen from the thing alone, laid on a ground no ink is near.
  const { data: a } = await sharp(fitted).raw().toBuffer({ resolveWithObject: true });
  const solid = Buffer.alloc(inner * inner * 4);
  for (let i = 0; i < inner * inner; i++) {
    const on = a[i * 4 + 3] > 110;
    solid[i * 4] = on ? a[i * 4] : 255;
    solid[i * 4 + 1] = on ? a[i * 4 + 1] : 0;
    solid[i * 4 + 2] = on ? a[i * 4 + 2] : 255;
    solid[i * 4 + 3] = 255;
  }
  const px = await inked(await sharp(solid, { raw: { width: inner, height: inner, channels: 4 } }).png().toBuffer(), inner, 12);
  const out = Buffer.alloc(SPRITE * SPRITE * 4);
  const on = (x, y) => x >= 0 && y >= 0 && x < inner && y < inner && a[(y * inner + x) * 4 + 3] > 110;
  for (let y = 0; y < SPRITE; y++)
    for (let x = 0; x < SPRITE; x++) {
      const o = (y * SPRITE + x) * 4;
      const ix = x - 1;
      const iy = y - 1;
      if (on(ix, iy)) {
        const i = (iy * inner + ix) * 4;
        out[o] = px.data[i];
        out[o + 1] = px.data[i + 1];
        out[o + 2] = px.data[i + 2];
        out[o + 3] = 255;
      } else if (on(ix - 1, iy) || on(ix + 1, iy) || on(ix, iy - 1) || on(ix, iy + 1)) {
        out[o] = INK[0];
        out[o + 1] = INK[1];
        out[o + 2] = INK[2];
        out[o + 3] = 255;
      }
    }
  await sharp(out, { raw: { width: SPRITE, height: SPRITE, channels: 4 } }).webp({ lossless: true }).toFile(`${ROOT}public/icons/${id}.webp`);
}

/** A small seeded source of chance, so a tile comes out the same every time. */
function chance(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE = 64;
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** A tile to draw on: 64 pixels square, wrapping at its edges so it repeats without a seam. */
function tile(base) {
  const px = new Array(TILE * TILE).fill(base);
  const wrap = (v) => ((v % TILE) + TILE) % TILE;
  return {
    px,
    set: (x, y, c) => (px[wrap(Math.round(y)) * TILE + wrap(Math.round(x))] = c),
    get: (x, y) => px[wrap(y) * TILE + wrap(x)],
  };
}

/** Smooth noise that wraps at the tile's edge: `cells` lumps across. */
function lumps(rand, cells) {
  const g = Array.from({ length: cells * cells }, rand);
  const at = (i, j) => g[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
  return (x, y) => {
    const fx = (x / TILE) * cells;
    const fy = (y / TILE) * cells;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const v = fy - j;
    const su = u * u * (3 - 2 * u);
    const sv = v * v * (3 - 2 * v);
    return (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
  };
}

/** Stones fitted together: each pixel belongs to the nearest of some scattered points, with a joint between. */
function stones(t, rand, count, joint, colours, jointInk) {
  const pts = Array.from({ length: count }, () => ({ x: rand() * TILE, y: rand() * TILE, c: colours[Math.floor(rand() * colours.length)] }));
  const gap = (a, b) => {
    const d = Math.abs(a - b);
    return Math.min(d, TILE - d);
  };
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      let who = pts[0];
      for (const p of pts) {
        const d = Math.hypot(gap(x, p.x), gap(y, p.y));
        if (d < d1) {
          d2 = d1;
          d1 = d;
          who = p;
        } else if (d < d2) d2 = d;
      }
      t.set(x, y, d2 - d1 < joint ? jointInk : who.c);
    }
}

/**
 * The ground, drawn as pixel art in the island's inks: sixteen pixels to the metre, each tile
 * repeating every four metres. (The paintings in art/textures were what the ground wore before
 * the lo-fi look; cut down this small they lost everything but their colour, so the tiles are
 * drawn here, in the paintings' colours.)
 */
const GROUND = {
  grass(t, rand) {
    const n = lumps(rand, 6);
    const m = lumps(rand, 11);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const v = n(x, y) * 0.65 + m(x, y) * 0.35;
        if (v > 0.6) t.set(x, y, '#93b85a');
        else if (v < 0.36) t.set(x, y, '#7d8438');
      }
    // Blades: little pairs of darker pixels with a pale tip.
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rand() * TILE);
      const y = Math.floor(rand() * TILE);
      t.set(x, y, '#35633a');
      t.set(x + 1, y - 1, '#35633a');
      if (rand() < 0.5) t.set(x - 1, y - 1, '#35633a');
      if (rand() < 0.35) t.set(x + 1, y - 2, '#cbdc8e');
    }
  },
  sand(t, rand) {
    // Ripples the wind left: short pale dashes in rows that wander, and a few grains.
    for (let row = 0; row < 9; row++) {
      let y = row * 7 + rand() * 3;
      for (let x = 0; x < TILE; x++) {
        y += Math.sin(x * 0.35 + row * 1.7) * 0.28;
        if ((x + row * 5) % 13 < 8) t.set(x, y, '#f8e6b0');
      }
    }
    for (let i = 0; i < 26; i++) t.set(rand() * TILE, rand() * TILE, rand() < 0.5 ? '#cfa57a' : '#c8963e');
  },
  dirt(t, rand) {
    const n = lumps(rand, 7);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (n(x, y) > 0.66) t.set(x, y, '#cfa57a');
    // Pebbles and the marks of feet.
    for (let i = 0; i < 34; i++) {
      const x = Math.floor(rand() * TILE);
      const y = Math.floor(rand() * TILE);
      t.set(x, y, '#7d5436');
      if (rand() < 0.5) t.set(x + 1, y, '#7d5436');
      if (rand() < 0.25) t.set(x, y - 1, '#d6cbb2');
    }
  },
  rock(t, rand) {
    stones(t, rand, 14, 1.3, ['#737b80', '#737b80', '#a4abac', '#70685a'], '#474e54');
    // Moss in a few of the joints.
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rand() * TILE);
      const y = Math.floor(rand() * TILE);
      if (t.get(x, y) === '#474e54') t.set(x, y, '#7d8438');
    }
  },
  plaza(t, rand) {
    stones(t, rand, 46, 1.1, ['#d6cbb2', '#d6cbb2', '#f4eee3', '#a89c84', '#a4abac'], '#70685a');
  },
};

export async function lofiGround(name) {
  for (const c of new Set(Object.values(GROUND).map(String).join().match(/#[0-9a-f]{6}/g))) if (!INKS.includes(c)) throw new Error(`${c} is not an ink`);
  const base = { grass: '#5c8f44', sand: '#ecc77d', dirt: '#a97c52', rock: '#737b80', plaza: '#d6cbb2' }[name];
  const t = tile(base);
  GROUND[name](t, chance(name.length * 7919 + name.charCodeAt(0)));
  const raw = Buffer.alloc(TILE * TILE * 4);
  t.px.forEach((c, i) => raw.set([...hexRgb(c), 255], i * 4));
  await sharp(raw, { raw: { width: TILE, height: TILE, channels: 4 } }).png({ palette: true, colours: 16, dither: 0 }).toFile(`${ROOT}public/textures/${name}.png`);
}

/**
 * The picture on the way in, as a small picture to be blown up like the game: a few dozen flat
 * colours of its own. (It is not moved to the island's inks: its soft sky has no ink near it and
 * came out grey.)
 */
export async function lofiTitle() {
  const meta = await sharp(`${ROOT}art/title.webp`).metadata();
  const width = 201;
  const height = Math.round((meta.height / meta.width) * width);
  const small = await sharp(`${ROOT}art/title.webp`).resize(width, height, { kernel: 'lanczos3' }).modulate({ saturation: 1.15 }).png().toBuffer();
  const few = await sharp(small).png({ palette: true, colours: 28, dither: 0, effort: 10 }).toBuffer();
  await sharp(few).webp({ lossless: true }).toFile(`${ROOT}public/art/title.webp`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const KINDS = ['models', 'icons', 'ground', 'title'];
  const what = KINDS.filter((k) => args.includes(k));
  const named = args.filter((a) => !KINDS.includes(a));
  const all = what.length ? what : KINDS;
  const stems = (dir, ext) => readdirSync(`${ROOT}art/${dir}`).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)).filter((id) => !named.length || named.includes(id));
  for (const d of ['models', 'icons', 'textures']) mkdirSync(`${ROOT}public/${d}`, { recursive: true });
  if (all.includes('models')) {
    let before = 0;
    let after = 0;
    for (const id of stems('models', '.glb')) {
      if (!index[id]) console.warn(`${id} is not in the index`);
      const r = await lofiModel(id);
      before += r.tris;
      after += r.now;
    }
    console.log(`models: ${before} triangles cut to about ${after}`);
  }
  if (all.includes('icons')) {
    const ids = stems('icons', '.webp');
    for (const id of ids) await lofiIcon(id);
    console.log(`icons: ${ids.length}`);
  }
  if (all.includes('ground')) {
    const names = Object.keys(GROUND);
    for (const n of names) await lofiGround(n);
    console.log(`ground: ${names.join(', ')}`);
  }
  if (all.includes('title')) {
    await lofiTitle();
    console.log('title');
  }
}
