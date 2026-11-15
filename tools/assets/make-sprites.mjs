#!/usr/bin/env node
// Pictures drawn for the purpose, for what the journal and the catch card show: the fish.
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-sprites.mjs [--by fal|tripo] [--sheets 1,2] [--redo 2] [--cut-only]
//
// The fish's first icons were pictures of soft 3D toys, made for shaping models from; shrunk to
// a 48-pixel sprite they are a little mushy. These are asked for as what they will be: flat,
// outlined, side-on sprites. Sixteen are asked for at a time, on one sheet, so that a whole
// sheet is in one hand; the sheet is cut into its sixteen squares, the white round each is cut
// away, and each is saved as art/sprites/fish-<id>.png. tools/assets/lofi.mjs then makes the
// 48-pixel sprite from that in place of the old picture (it is run at the end).
//
// Sheets are kept in art/sprites/sheets/ (sheet-<n>.png), so running this again costs nothing.
// LOOK AT EVERY SHEET before keeping it: a model asked for
// sixteen things in order sometimes leaves one out or draws two the same, and then every fish
// after it is under the wrong name. `--redo n` asks for a sheet again.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, save as saveFal } from './fal.mjs';
import { iconFrom } from './finish.mjs';
import { FISH_ART, IMAGE_MODEL, TRIPO } from './manifest.mjs';
import { save as saveTripo, task } from './tripo.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
// Each square is written to the same scratch file in turn: sharp must not hand back the last one it read from there.
sharp.cache(false);
const CACHE = `${ROOT}tools/assets/cache`;
const SHEETS = `${ROOT}art/sprites/sheets`;
const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const by = flag('--by') ?? 'fal';
const only = (flag('--sheets') ?? '').split(',').filter(Boolean).map(Number);
const redo = new Set((flag('--redo') ?? '').split(',').filter(Boolean).map(Number));
const cutOnly = args.includes('--cut-only');

const PER = 16;
const SIDE = 4;
const ids = Object.keys(FISH_ART);
const sheets = [];
for (let i = 0; i < ids.length; i += PER) sheets.push(ids.slice(i, i + PER));

/** Tripo takes a prompt of at most this many characters. */
const LIMIT = 1800;

/** What a sheet is asked for as: the look, then each square by row, each thing cut short enough that all fit. */
function brief(list) {
  const look =
    `A sprite sheet: exactly ${list.length} separate pixel art game sprites in a ${SIDE} by ${SIDE} grid on a pure white background. ` +
    'Each sprite is centred in its own equal square, filling two thirds of it, touching nothing. No grid lines, frames, numbers, words or shadows. ' +
    'Chunky 16-bit pixel art item icons: big square pixels, flat muted colours with one shade tone, a dark navy outline, cute and a little odd; every animal has one small round black eye. ' +
    'Seen from the side facing left unless said.';
  for (let most = 90; most > 20; most -= 4) {
    const short = (id) => {
      const t = FISH_ART[id].replace(/^an? /, '');
      return t.length <= most ? t : t.slice(0, t.lastIndexOf(' ', most)).replace(/[,;]? ?(and|with|a|an|the|of|on|its)?$/, '');
    };
    const rows = [];
    for (let r = 0; r < SIDE; r++) {
      const cells = list.slice(r * SIDE, r * SIDE + SIDE).map(short);
      if (cells.length) rows.push(`Row ${r + 1}: ${cells.join('; ')}.`);
    }
    const all = `${look} ${rows.join(' ')}`;
    if (all.length <= LIMIT) return all;
  }
  throw new Error('the sheet cannot be asked for in so few words');
}

async function paint(n, list) {
  const file = `${SHEETS}/sheet-${n}.png`;
  if (existsSync(file) && !redo.has(n)) return file;
  const prompt = brief(list);
  if (by === 'tripo') {
    const made = await task('generation/text-to-image', { prompt, model: TRIPO.image, size: '1024x1024', quality: 'medium', output_format: 'png' });
    await saveTripo(made.output.generated_image_url, file);
    console.log(`sheet ${n}: painted by Tripo (${made.credits_consumed ?? '?'} credits)`);
  } else {
    const made = await run(IMAGE_MODEL, { prompt, image_size: '1024x1024', quality: 'high', background: 'opaque', output_format: 'png', num_images: 1 });
    await saveFal(made.images[0].url, file);
    console.log(`sheet ${n}: painted through fal`);
  }
  return file;
}

/**
 * Cut a sheet into its sprites and save each fish's picture with the white round it cut away.
 * The sprites are not cut along the grid's lines, since one may lean over into its neighbour's
 * square: each is found as a patch of drawing (parts a few pixels apart, such as an
 * anglerfish's lure, count as one patch), and belongs to the square its middle is in.
 */
async function cut(file, list) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const drawn = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (data[i * 4] < 236 || data[i * 4 + 1] < 236 || data[i * 4 + 2] < 236) drawn[i] = 1;
  // Grown a little, so that parts nearly touching are one patch.
  const GROW = 5;
  const wide = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!drawn[y * W + x]) continue;
      for (let dy = -GROW; dy <= GROW; dy++)
        for (let dx = -GROW; dx <= GROW; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) wide[ny * W + nx] = 1;
        }
    }
  const patch = new Int32Array(W * H).fill(-1);
  const patches = [];
  for (let start = 0; start < W * H; start++) {
    if (!wide[start] || patch[start] >= 0) continue;
    const id = patches.length;
    const p = { area: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0 };
    const stack = [start];
    patch[start] = id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % W;
      const y = (i - x) / W;
      if (drawn[i]) {
        p.area++;
        p.sx += x;
        p.sy += y;
        p.x0 = Math.min(p.x0, x);
        p.x1 = Math.max(p.x1, x);
        p.y0 = Math.min(p.y0, y);
        p.y1 = Math.max(p.y1, y);
      }
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (k >= 0 && wide[k] && patch[k] < 0) {
          patch[k] = id;
          stack.push(k);
        }
      }
    }
    patches.push(p);
  }
  mkdirSync(`${ROOT}art/sprites`, { recursive: true });
  for (const [i, id] of list.entries()) {
    const cx0 = ((i % SIDE) * W) / SIDE;
    const cy0 = (Math.floor(i / SIDE) * H) / SIDE;
    let best = -1;
    patches.forEach((p, k) => {
      if (!p.area) return;
      const mx = p.sx / p.area;
      const my = p.sy / p.area;
      if (mx < cx0 || mx >= cx0 + W / SIDE || my < cy0 || my >= cy0 + H / SIDE) return;
      if (best < 0 || p.area > patches[best].area) best = k;
    });
    if (best < 0) throw new Error(`the sheet has nothing in the square for ${id}`);
    const p = patches[best];
    const pad = 6;
    const w = p.x1 - p.x0 + 1 + pad * 2;
    const h = p.y1 - p.y0 + 1 + pad * 2;
    const out = Buffer.alloc(w * h * 4, 255);
    for (let y = p.y0; y <= p.y1; y++)
      for (let x = p.x0; x <= p.x1; x++) {
        if (patch[y * W + x] !== best) continue;
        const o = ((y - p.y0 + pad) * w + x - p.x0 + pad) * 4;
        data.copy(out, o, (y * W + x) * 4, (y * W + x) * 4 + 3);
      }
    const cell = `${CACHE}/sprite-cell.png`;
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(cell);
    const webp = `${CACHE}/sprite-cell.webp`;
    await iconFrom(cell, webp);
    await sharp(webp).png().toFile(`${ROOT}art/sprites/fish-${id}.png`);
  }
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(SHEETS, { recursive: true });
const done = [];
for (const [k, list] of sheets.entries()) {
  const n = k + 1;
  if (only.length && !only.includes(n)) continue;
  const file = `${SHEETS}/sheet-${n}.png`;
  if (cutOnly && !existsSync(file)) continue;
  await cut(cutOnly ? file : await paint(n, list), list);
  done.push(...list);
}
console.log(`${done.length} sprites cut; look at art/sprites/sheets/ before keeping them`);
if (done.length) execFileSync('node', [`${ROOT}tools/assets/lofi.mjs`, 'icons', ...done.map((id) => `fish-${id}`)], { stdio: 'inherit' });
