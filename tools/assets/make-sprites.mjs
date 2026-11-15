#!/usr/bin/env node
// Pictures drawn for the purpose, for what the menus show: the fish, and everything sold, worn,
// won or set down.
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-sprites.mjs [fish|items] [--by fal|tripo] [--sheets 1,2] [--redo 2] [--cut-only]
//
// The first icons were pictures of soft 3D toys, made for shaping models from; shrunk to a
// 48-pixel sprite they are a little mushy. These are asked for as what they will be: flat,
// outlined sprites. Sixteen are asked for at a time, on one sheet, so that a whole
// sheet is in one hand; the sheet is cut into its sixteen squares, the white round each is cut
// away, and each is saved as art/sprites/<id>.png (a fish as fish-<id>.png). A sheet's drawings
// are taken in reading order, whatever grid they came back in. tools/assets/lofi.mjs then makes the
// 48-pixel sprite from that in place of the old picture (it is run at the end).
//
// Sheets are kept in art/sprites/sheets/ (sheet-<n>.png for the fish, items-<n>.png for the
// rest), so running this again costs nothing.
// LOOK AT EVERY SHEET before keeping it: a model asked for
// sixteen things in order sometimes leaves one out or draws two the same, and then every fish
// after it is under the wrong name. `--redo n` asks for a sheet again.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, save as saveFal } from './fal.mjs';
import { iconFrom } from './finish.mjs';
import { FISH_ART, ICONS, IMAGE_MODEL, MODELS, TRIPO } from './manifest.mjs';
import { save as saveTripo, task } from './tripo.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
// Each square is written to the same scratch file in turn: sharp must not hand back the last one it read from there.
sharp.cache(false);
const CACHE = `${ROOT}tools/assets/cache`;
const SHEETS = `${ROOT}art/sprites/sheets`;
const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const by = flag('--by') ?? 'tripo';
const only = (flag('--sheets') ?? '').split(',').filter(Boolean).map(Number);
const redo = new Set((flag('--redo') ?? '').split(',').filter(Boolean).map(Number));
const cutOnly = args.includes('--cut-only');


/**
 * Everything the menus show that is not a fish, sheet by sheet, like things together. A sheet's
 * list is what is on it, in reading order. Sixteen fish to a sheet come out right; sixteen
 * things as different as these do not (a row comes back as something else, or is left off), so
 * after the first sheet they are asked for nine at a time. The second and third sheets are what
 * was right of two sheets of sixteen: their lists stop where the sheets went wrong.
 */
const ITEM_SHEETS = [
  ['rod-1', 'rod-2', 'rod-3', 'rod-4', 'rod-5', 'bait-worm', 'bait-cricket', 'bait-minnow', 'bait-glow', 'bait-lure', 'bait-golden', 'lure-none', 'lure-big', 'lure-small', 'lure-sparkle', 'lure-magnet'],
  ['lure-twin', 'lure-lucky', 'lure-rain', 'hat-party', 'hat-bucket', 'hat-beanie', 'hat-straw', 'hat-sailor', 'hat-flowers', 'hat-cowboy', 'hat-cone', 'hat-lampshade'],
  ['hat-top', 'hat-pirate', 'hat-viking', 'hat-wizard', 'hat-cake', 'hat-duck', 'hat-crab', 'hat-shark', 'hat-frog', 'hat-mushroom', 'hat-fish', 'hat-crown'],
  ['hat-bread', 'hat-captain', 'hat-propeller', 'hat-chef', 'f-chair', 'f-cooler', 'f-lantern', 'f-plant', 'f-umbrella'],
  ['f-radio', 'f-flamingo', 'f-gnome', 'f-tiki', 'f-hammock', 'f-telescope', 'f-snowman', 'x-flower', 'x-bowtie'],
  ['x-glasses', 'x-scarf', 'x-shades', 'x-backpack', 'x-mustache', 'x-snorkel', 'char-otter', 'char-frog', 'char-raccoon'],
  ['coin', 'detector', 'upgrade-cooler', 'ukulele', 'ticket-lucky', 'gull', 'boat-ticket'],
  // The camp catalogue.
  ['f-tent', 'f-firepit', 'f-bedroll', 'f-stump', 'f-table', 'f-stove', 'f-woodpile', 'f-lights', 'f-washline'],
  // Line, hooks and the bait that is only found.
  ['line-1', 'line-2', 'line-3', 'line-4', 'hook-1', 'hook-2', 'hook-3', 'hook-4', 'bait-crawler'],
  // Charms for the rod, and the last things to set down.
  ['charm-bell', 'charm-feather', 'charm-shell', 'charm-star', 'charm-fish', 'charm-moon', 'f-chest', 'f-chime', 'f-shipbottle'],
  // The camp's sign, the map, the trader, and paint for the rod.
  ['f-campsign', 'icon-map', 'icon-trader', 'paint-coral', 'paint-sea', 'paint-moss', 'paint-brass', 'paint-rose', 'paint-ink'],
  // The toys.
  ['toy-skateboard', 'toy-pogo', 'toy-balloons', 'toy-bell', 'toy-bottle'],
];
/** What an item is, as its model or picture was asked for, without the words about how a model wants it posed. */
const itemSays = (id) => {
  const said = MODELS[id]?.what ?? MODELS[id]?.prompt ?? ICONS[id];
  if (typeof said !== 'string') throw new Error(`nothing says what ${id} looks like`);
  return said.replace(/,? as a chunky toy/g, '').replace(/,? lying diagonally/g, '').replace(/,? seen from the front/g, '');
};

/** In sixteens. */
const sixteens = (ids) => {
  const out = [];
  for (let i = 0; i < ids.length; i += 16) out.push(ids.slice(i, i + 16));
  return out;
};

/** The two sets of sprites: their sheets, what each thing looks like, what its file is called, and how they are seen. */
const SETS = {
  fish: { sheets: sixteens(Object.keys(FISH_ART)), says: (id) => FISH_ART[id], name: (id) => `fish-${id}`, sheet: 'sheet', view: 'Every animal has one small round black eye. Seen from the side facing left unless said.' },
  items: { sheets: ITEM_SHEETS, says: itemSays, name: (id) => id, sheet: 'items', view: 'Each thing whole and on its own, with nobody wearing or holding it, seen from the front and a little above, upright; a fishing rod lies on a slant. Animals have small round black eyes.' },
};
const which = args.find((a) => a in SETS) ?? 'fish';
const set = SETS[which];
const sheets = set.sheets;

/** Tripo takes a prompt of at most this many characters. */
const LIMIT = 1800;

/** What a sheet is asked for as: the look, then each square by row, each thing cut short enough that all fit. */
function brief(list) {
  const SIDE = Math.ceil(Math.sqrt(list.length));
  const look =
    `A sprite sheet: exactly ${list.length} separate pixel art game sprites in a ${SIDE} by ${SIDE} grid on a pure white background. ` +
    'Each sprite is centred in its own equal square, filling two thirds of it, touching nothing. No grid lines, frames, numbers, words or shadows. ' +
    'Chunky 16-bit pixel art item icons: big square pixels, flat muted colours with one shade tone, a dark navy outline, cute and a little odd. ' +
    set.view;
  for (let most = 90; most > 20; most -= 4) {
    const short = (id) => {
      const t = set.says(id).replace(/^an? /, '');
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
  const file = `${SHEETS}/${set.sheet}-${n}.png`;
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
  // The drawings, in reading order: specks dropped, then gathered into rows by how high they
  // are, each row left to right. The list says what each is.
  const big = patches.map((p, k) => ({ ...p, k })).filter((p) => p.area > 0);
  const typical = [...big].sort((a, b) => b.area - a.area)[Math.min(big.length - 1, Math.floor(list.length / 2))]?.area ?? 0;
  const real = big.filter((p) => p.area > typical * 0.12).sort((a, b) => a.sy / a.area - b.sy / b.area);
  const rows = [];
  for (const p of real) {
    const row = rows[rows.length - 1];
    const tall = p.y1 - p.y0;
    if (row && p.sy / p.area - row.at < Math.max(tall, row.tall) * 0.6) {
      row.all.push(p);
      row.at = row.all.reduce((sum, q) => sum + q.sy / q.area, 0) / row.all.length;
      row.tall = Math.max(row.tall, tall);
    } else rows.push({ all: [p], at: p.sy / p.area, tall });
  }
  const inOrder = rows.flatMap((r) => r.all.sort((a, b) => a.sx / a.area - b.sx / b.area));
  if (inOrder.length < list.length) throw new Error(`the sheet has ${inOrder.length} drawings on it and ${list.length} were asked for: look at it, and ask again with --redo`);
  if (inOrder.length > list.length) console.warn(`${file.split('/').pop()}: ${inOrder.length} drawings, of which the first ${list.length} are kept`);
  for (const [i, id] of list.entries()) {
    const best = inOrder[i].k;
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
    await sharp(webp).png().toFile(`${ROOT}art/sprites/${set.name(id)}.png`);
  }
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(SHEETS, { recursive: true });
const done = [];
for (const [k, list] of sheets.entries()) {
  const n = k + 1;
  if (only.length && !only.includes(n)) continue;
  const file = `${SHEETS}/${set.sheet}-${n}.png`;
  if (cutOnly && !existsSync(file)) continue;
  await cut(cutOnly ? file : await paint(n, list), list);
  done.push(...list);
}
console.log(`${done.length} sprites cut; look at art/sprites/sheets/ before keeping them`);
if (done.length) execFileSync('node', [`${ROOT}tools/assets/lofi.mjs`, 'icons', ...done.map(set.name)], { stdio: 'inherit' });
