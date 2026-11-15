// The title picture, as pixel art: Tripo's image model paints it tall, from TITLE_PIXEL in the
// manifest, into art/title.webp, and lofi.mjs cuts that down to the 256 pixels the game shows.
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-title.mjs [--redo] [--keep name]
// About 10 credits. The painting as it came is kept in tools/assets/cache/title-pixel.png;
// --keep name saves this try beside it under another name instead of replacing the title, to
// choose between several.
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { TITLE_PIXEL, TRIPO } from './manifest.mjs';
import { save, task } from './tripo.mjs';
import { lofiTitle } from './lofi.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}tools/assets/cache`;
const args = process.argv.slice(2);
const keep = args.includes('--keep') ? args[args.indexOf('--keep') + 1] : null;
mkdirSync(CACHE, { recursive: true });

const raw = `${CACHE}/title-pixel${keep ? `-${keep}` : ''}.png`;
if (args.includes('--redo') || keep || !existsSync(raw)) {
  const made = await task('generation/text-to-image', { prompt: TITLE_PIXEL.prompt, model: TRIPO.image, size: TITLE_PIXEL.size, quality: 'medium', output_format: 'png' });
  await save(made.output.generated_image_url, raw);
  console.log(`title painted by Tripo (${made.credits_consumed ?? '?'} credits): ${raw}`);
}
if (!keep) {
  await sharp(raw).webp({ nearLossless: true, quality: 90 }).toFile(`${ROOT}art/title.webp`);
  await lofiTitle();
  console.log('art/title.webp and public/art/title.webp');
}
