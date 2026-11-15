#!/usr/bin/env node
// Make the game's flat pictures, ground textures, sounds and music from tools/assets/manifest.mjs.
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-media.mjs [textures|pictures|sounds|music] [--redo id,id] [--bump n]
//
// All through fal. What is bought is kept in tools/assets/cache/media/; what the game loads goes
// to public/ (textures/, art/, audio/). Run again and only what is missing is asked for.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, save } from './fal.mjs';
import { IMAGE_MODEL, MUSIC, MUSIC_MODEL, PICTURES, SFX_MODEL, SOUNDS, TEXTURE_MODEL, TEXTURES } from './manifest.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}tools/assets/cache/media`;
const args = process.argv.slice(2);
const redo = new Set((args.find((a, i) => args[i - 1] === '--redo') ?? '').split(',').filter(Boolean));
const bump = Number(args.find((a, i) => args[i - 1] === '--bump') ?? '1');
const sets = args.filter((a) => ['textures', 'pictures', 'sounds', 'music'].includes(a));
const want = (set) => !sets.length || sets.includes(set);
for (const dir of [CACHE, `${ROOT}art/textures`, `${ROOT}public/art`, `${ROOT}public/audio`]) mkdirSync(dir, { recursive: true });
const seedOf = (id) => [...id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7) % 1000000;
const failed = [];
const attempt = (id, fn) => fn().catch((e) => { failed.push(id); console.error(`FAILED ${id}: ${e.message.slice(0, 300)}`); });

/** A ground texture: painted, then made to repeat without a seam by blending it with itself moved half way. */
async function texture(id, prompt) {
  const raw = `${CACHE}/tex-${id}.png`;
  if (redo.has(id) || !existsSync(raw)) {
    const out = await run(TEXTURE_MODEL, { prompt, image_size: 'square_hd', num_inference_steps: 4, seed: seedOf(id) + (redo.has(id) ? bump : 0) });
    await save(out.images[0].url, raw);
    console.log(`painted texture ${id}`);
  }
  const out = `${ROOT}art/textures/${id}.webp`;
  if (existsSync(out) && !redo.has(id)) return;
  execFileSync('python3', ['-I', '-c', `
import numpy as np
from PIL import Image
im = np.asarray(Image.open(${JSON.stringify(raw)}).convert('RGB').resize((512, 512), Image.LANCZOS)).astype(np.float32)
n = im.shape[0]
shifted = np.roll(np.roll(im, n // 2, 0), n // 2, 1)
# A weight that is 1 in the middle of the picture and 0 at its edges: the edges come from the moved copy, whose middle is seamless.
t = np.abs(np.linspace(-1, 1, n))
w1 = np.clip((1 - t) * 1.6, 0, 1)
w = np.minimum.outer(w1, w1)[..., None]
out = im * w + shifted * (1 - w)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(${JSON.stringify(out)}, 'WEBP', quality=82)
`]);
}

async function picture(id, { size, prompt }) {
  const raw = `${CACHE}/pic-${id}.png`;
  if (redo.has(id) || !existsSync(raw)) {
    const out = await run(IMAGE_MODEL, { prompt, image_size: size, quality: 'high', background: 'opaque', output_format: 'png', num_images: 1 });
    await save(out.images[0].url, raw);
    console.log(`painted picture ${id}`);
  }
  if (id === 'icon') {
    for (const s of [180, 192, 512]) await sharp(raw).resize(s, s).png().toFile(`${ROOT}public/art/icon-${s}.png`);
  } else {
    await sharp(raw).resize(720).webp({ quality: 80 }).toFile(`${ROOT}art/${id}.webp`);
  }
}

/** A sound: made as MP3 at fal, kept as it came (Safari plays MP3 everywhere). */
async function sound(id, { text, secs, loop }) {
  const out = `${ROOT}public/audio/${id}.mp3`;
  if (existsSync(out) && !redo.has(id)) return;
  const made = await run(SFX_MODEL, { text, duration_seconds: secs, prompt_influence: 0.6, ...(loop ? { loop: true } : {}), output_format: 'mp3_44100_128' });
  await save((made.audio ?? made.audio_file ?? made).url, out);
  console.log(`made sound ${id}`);
}

async function music(id, { prompt, ms }) {
  const out = `${ROOT}public/audio/music-${id}.mp3`;
  if (existsSync(out) && !redo.has(id)) return;
  const made = await run(MUSIC_MODEL, { prompt, music_length_ms: ms, force_instrumental: true, output_format: 'mp3_44100_128' }, { timeoutMs: 900000 });
  await save((made.audio ?? made.audio_file ?? made).url, out);
  console.log(`made music ${id}`);
}

const work = [];
if (want('textures')) for (const [id, p] of Object.entries(TEXTURES)) work.push(attempt(id, () => texture(id, p)));
if (want('pictures')) for (const [id, p] of Object.entries(PICTURES)) work.push(attempt(id, () => picture(id, p)));
if (want('sounds')) {
  const ids = Object.entries(SOUNDS);
  for (let i = 0; i < ids.length; i += 5) await Promise.all(ids.slice(i, i + 5).map(([id, s]) => attempt(id, () => sound(id, s))));
}
if (want('music')) for (const [id, m] of Object.entries(MUSIC)) work.push(attempt(id, () => music(id, m)));
await Promise.all(work);
console.log(failed.length ? `failed: ${failed.join(', ')}` : 'all made');
