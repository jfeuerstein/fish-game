#!/usr/bin/env node
// The ground's textures, painted by Tripo's image model (GROUND in manifest.mjs) and made to
// repeat without a seam: blended with a copy of itself moved half way, along a wavy edge so the
// blend makes no straight cross. Saved as public/textures/<id>.webp.
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-ground.mjs [id ...] [--redo id,id] [--model chat_image_2.5_sunburst]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { GROUND, GROUND_LOOK, TRIPO } from './manifest.mjs';
import { save, task } from './tripo.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}tools/assets/cache`;
const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const redo = new Set((flag('--redo') ?? '').split(',').filter(Boolean));
const model = flag('--model') ?? 'chat_image_2.5_sunburst';
const tag = flag('--tag') ?? '';
const named = args.filter((a, i) => a in GROUND && !args[i - 1]?.startsWith('--'));
const ids = named.length ? named : Object.keys(GROUND);
mkdirSync(CACHE, { recursive: true });

async function make(id) {
  const raw = `${CACHE}/ground-${id}${tag}.png`;
  if (redo.has(id) || !existsSync(raw)) {
    const painted = await task('generation/text-to-image', { prompt: `${GROUND[id]}, ${GROUND_LOOK}`, model, size: '1024x1024', quality: 'medium', output_format: 'png' });
    await save(painted.output.generated_image_url, raw);
    console.log(`painted ${id}`);
  }
  if (args.includes('--no-out')) return;
  const out = `${ROOT}public/textures/${id}.webp`;
  execFileSync('python3', ['-I', '-c', `
import numpy as np
from PIL import Image
n = 1024
im = np.asarray(Image.open(${JSON.stringify(raw)}).convert('RGB').resize((n, n), Image.LANCZOS)).astype(np.float32)
shifted = np.roll(np.roll(im, n // 2, 0), n // 2, 1)
# 1 well inside the picture, 0 at its edges, with a wavy boundary so the blend does not show as a cross.
yy, xx = np.mgrid[0:n, 0:n] / n
wob = 0.035 * (np.sin(xx * 23.0 + yy * 7.0) + np.sin(yy * 19.0 - xx * 5.0))
edge = np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) + wob
w = np.clip((edge - 0.06) / 0.16, 0, 1)
w = (w * w * (3 - 2 * w))[..., None]
out = im * w + shifted * (1 - w)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(${JSON.stringify(out)}, 'WEBP', quality=84)
`]);
  console.log(`saved ${out}`);
}
for (const id of ids) await make(id).catch((e) => console.error(`FAILED ${id}: ${e.message.slice(0, 300)}`));
