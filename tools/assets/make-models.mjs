#!/usr/bin/env node
// Make the game's 3D models and icons from tools/assets/manifest.mjs.
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-models.mjs [id ...] [--redo id,id] [--bump n] [--only models|fish|icons]
//
// For each model: a picture is painted through fal, a 3D shape is made of the picture (Tripo's
// model through fal), and the shape is slimmed for the phone (textures to WebP, meshopt) into
// public/models/<id>.glb. Characters are rigged and animated by Tripo directly. The picture
// becomes the icon shown in menus (public/icons/<id>.webp). Everything bought is kept in
// tools/assets/cache/ (not in the repository), so running this again costs nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { run, save } from './fal.mjs';
import { FISH_ART, ICONS, IMAGE_MODEL, LOOK, MODELS, SHAPE_MODEL } from './manifest.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}tools/assets/cache`;
const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const redo = new Set((flag('--redo') ?? '').split(',').filter(Boolean));
const bump = Number(flag('--bump') ?? '1');
const only = flag('--only');
// Slim again from what is cached, without asking fal for anything.
const reslim = args.includes('--reslim');

// Everything to make, as one list of jobs.
const jobs = {};
if (!only || only === 'models') for (const [id, m] of Object.entries(MODELS)) jobs[id] = { ...m, prompt: `${m.what}, ${LOOK[m.kind]}` };
if (!only || only === 'fish') for (const [id, what] of Object.entries(FISH_ART)) jobs[`fish-${id}`] = { kind: 'fish', what, faces: 3000, prompt: `${what}, ${LOOK.fish}` };
if (!only || only === 'icons') for (const [id, what] of Object.entries(ICONS)) jobs[id] = { kind: 'icon', what, prompt: `${what}, ${LOOK.icon}`, flat: true };
const named = args.filter((a, i) => a in jobs && !args[i - 1]?.startsWith('--'));
const ids = named.length ? named : Object.keys(jobs);

mkdirSync(CACHE, { recursive: true });
mkdirSync(`${ROOT}public/models`, { recursive: true });
mkdirSync(`${ROOT}public/icons`, { recursive: true });
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
let bought = 0;

async function picture(id, job) {
  const png = `${CACHE}/${id}.png`;
  if (!redo.has(id) && existsSync(png) && existsSync(`${png}.url`)) return readFileSync(`${png}.url`, 'utf8');
  const painted = await run(IMAGE_MODEL, { prompt: job.prompt, image_size: '1024x1024', quality: 'medium', background: 'opaque', output_format: 'png', num_images: 1 });
  const url = painted.images[0].url;
  await save(url, png);
  writeFileSync(`${png}.url`, url);
  bought++;
  console.log(`painted ${id}`);
  return url;
}

async function shape(id, job, url) {
  const glb = `${CACHE}/${id}.glb`;
  if (!redo.has(id) && existsSync(glb) && existsSync(`${glb}.url`)) return readFileSync(`${glb}.url`, 'utf8');
  const shaped = await run(SHAPE_MODEL, { image_url: url, texture: true, pbr: false, texture_quality: 'standard', geometry_quality: 'standard', face_limit: job.faces ?? 4000, ...(redo.has(id) ? { model_seed: bump } : {}) }, { timeoutMs: 1200000 });
  const out = (shaped.model_mesh ?? shaped.base_model ?? shaped.pbr_model).url;
  await save(out, glb);
  writeFileSync(`${glb}.url`, out);
  bought++;
  console.log(`shaped ${id}`);
  return out;
}

/** A character: rigged by Tripo (through fal) from the shape's public address. The game poses the bones itself. */
async function rig(id, glbUrl) {
  const file = `${CACHE}/${id}.rigged.glb`;
  if (!redo.has(id) && existsSync(file)) return;
  const rigged = await run('fal-ai/tripo3d/rig', { model_url: glbUrl, model: 'v1.0-20240301', rig_type: 'biped', spec: 'tripo', output_format: 'glb' }, { timeoutMs: 900000 });
  await save(rigged.model_mesh.url, file);
  bought++;
  console.log(`rigged ${id}`);
}

/** Slim a model for the phone: WebP textures no bigger than `size`, meshopt-compressed geometry. */
async function slim(src, out, size, ratio = 1) {
  const doc = await io.read(src);
  const thin = ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02, lockBorder: false })] : [];
  await doc.transform(dedup(), weld(), ...thin, prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(out, doc);
}

/** The picture as an icon: the white round it cut away, trimmed, 256 square WebP. */
async function icon(id) {
  const out = `${ROOT}public/icons/${id}.webp`;
  if (existsSync(out) && !redo.has(id)) return;
  const { data, info } = await sharp(`${CACHE}/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Flood the near-white background from the edges, so white inside the thing is kept.
  const seen = new Uint8Array(w * h);
  const stack = [];
  const white = (i) => data[i * 4] > 232 && data[i * 4 + 1] > 232 && data[i * 4 + 2] > 232;
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !white(i)) continue;
    seen[i] = 1;
    data[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  // Soften the cut edge: a pixel beside the background that is pale is made partly clear.
  for (let i = 0; i < w * h; i++) {
    if (seen[i]) continue;
    const x = i % w;
    const near = (x > 0 && seen[i - 1]) || (x < w - 1 && seen[i + 1]) || (i >= w && seen[i - w]) || (i < w * (h - 1) && seen[i + w]);
    if (near) data[i * 4 + 3] = 140;
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(out);
}

/** Whether the model in public/ was built in Blender while fal could not be used (and so should be replaced). */
function blenderMade(id) {
  const file = `${ROOT}public/models/index.json`;
  return existsSync(file) && JSON.parse(readFileSync(file, 'utf8'))[id]?.source === 'blender';
}

async function make(id) {
  const job = jobs[id];
  if (reslim && !existsSync(`${CACHE}/${id}.glb`)) return;
  const url = await picture(id, job);
  await icon(id);
  if (job.flat) return;
  const glbUrl = await shape(id, job, url);
  const out = `${ROOT}public/models/${id}.glb`;
  if (job.rig) {
    await rig(id, glbUrl);
    if (!existsSync(out) || redo.has(id)) await slim(`${CACHE}/${id}.rigged.glb`, out, 1024);
  } else if (!existsSync(out) || redo.has(id) || reslim || blenderMade(id)) {
    await slim(`${CACHE}/${id}.glb`, out, job.kind === 'prop' && (job.h ?? 1) > 3 ? 1024 : 512, job.simplify ?? 1);
  }
}

// fal takes several at once; Tripo's rigging is waited on inside each.
const queue = [...ids];
const failed = [];
async function worker() {
  for (let id = queue.shift(); id; id = queue.shift()) {
    await make(id).catch((e) => {
      failed.push(id);
      console.error(`FAILED ${id}: ${e.message.slice(0, 400)}`);
    });
  }
}
await Promise.all(Array.from({ length: Number(flag('--jobs') ?? 6) }, worker));

// What the game reads: each model's size in the world, and whether it moves.
const index = {};
for (const [id, job] of Object.entries({ ...jobs })) {
  // Only what fal made: models Blender built in its place keep their own entries.
  if (job.flat || !existsSync(`${ROOT}public/models/${id}.glb`) || !existsSync(`${CACHE}/${id}.glb`)) continue;
  index[id] = { kind: job.kind, h: job.h ?? null, ...(job.rig ? { rig: true } : {}) };
}
const indexFile = `${ROOT}public/models/index.json`;
const before = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
writeFileSync(indexFile, JSON.stringify({ ...before, ...index }, null, 0));
console.log(`${bought} things bought from fal; ${failed.length ? `failed: ${failed.join(', ')}` : 'none failed'}`);
