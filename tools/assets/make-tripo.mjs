#!/usr/bin/env node
// Make models with Tripo, asked directly (see TRIPO in manifest.mjs).
//
//   NODE_USE_ENV_PROXY=1 node tools/assets/make-tripo.mjs [id ...] [--kinds hat,extra] [--redo id,id] [--jobs 3]
//
// Tripo's image model paints a picture of each thing from its words and the look for its kind;
// its shape model makes a model of the picture, by the picture's task, so nothing is uploaded.
// The model is slimmed for the phone into public/models/<id>.glb and the picture becomes the
// icon (public/icons/<id>.webp). Everything bought is kept in tools/assets/cache/ as
// <id>.tripo.png and <id>.tripo.glb, so running this again costs nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { iconFrom, slim } from './finish.mjs';
import { FISH_ART, MODELS, TRIPO, TRIPO_LOOK } from './manifest.mjs';
import { save, task } from './tripo.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}tools/assets/cache`;
const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const redo = new Set((flag('--redo') ?? '').split(',').filter(Boolean));
const kinds = new Set((flag('--kinds') ?? '').split(',').filter(Boolean));

const jobs = {};
for (const [id, m] of Object.entries(MODELS)) if (m.kind !== 'char') jobs[id] = m;
for (const [id, what] of Object.entries(FISH_ART)) jobs[`fish-${id}`] = { kind: 'fish', what, h: null, faces: 2500 };
const named = args.filter((a, i) => a in jobs && !args[i - 1]?.startsWith('--'));
const ids = named.length ? named : Object.keys(jobs).filter((id) => kinds.has(jobs[id].kind));
if (!ids.length) {
  console.error('name ids, or kinds with --kinds hat,extra,prop,fish');
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });
let spent = 0;

async function make(id) {
  const job = jobs[id];
  const png = `${CACHE}/${id}.tripo.png`;
  const glb = `${CACHE}/${id}.tripo.glb`;
  const taskFile = `${CACHE}/${id}.tripo.task`;
  const again = redo.has(id);
  let picture = !again && existsSync(taskFile) && existsSync(png) ? readFileSync(taskFile, 'utf8').trim() : null;
  if (!picture) {
    const look = TRIPO_LOOK[job.kind] ?? TRIPO_LOOK.prop;
    const painted = await task('generation/text-to-image', { prompt: `${job.what}, ${look}`, model: TRIPO.image, size: '1024x1024', quality: 'medium', output_format: 'png' });
    await save(painted.output.generated_image_url, png);
    writeFileSync(taskFile, painted.task_id);
    picture = painted.task_id;
    spent += painted.credits_consumed ?? 0;
    console.log(`painted ${id}`);
  }
  if (again || !existsSync(glb)) {
    const shaped = await task('generation/image-to-model', { input: picture, model: TRIPO.shape, texture: true, pbr: false, texture_quality: 'standard', face_limit: job.faces ?? 3000 });
    await save(shaped.output.model_url ?? shaped.output.pbr_model_url, glb);
    spent += shaped.credits_consumed ?? 0;
    console.log(`shaped ${id}`);
  }
  await slim(glb, `${ROOT}public/models/${id}.glb`, (job.h ?? 1) > 3 ? 1024 : 512, job.simplify ?? 1);
  await iconFrom(png, `${ROOT}public/icons/${id}.webp`);
  return id;
}

const queue = [...ids];
const done = [];
const failed = [];
async function worker() {
  for (let id = queue.shift(); id; id = queue.shift()) {
    await make(id).then(() => done.push(id)).catch((e) => {
      failed.push(id);
      console.error(`FAILED ${id}: ${String(e.message).slice(0, 400)}`);
    });
  }
}
await Promise.all(Array.from({ length: Number(flag('--jobs') ?? 3) }, worker));

const indexFile = `${ROOT}public/models/index.json`;
const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
for (const id of done) index[id] = { kind: jobs[id].kind === 'extra' ? 'extra' : jobs[id].kind, h: jobs[id].h ?? null, source: 'tripo' };
writeFileSync(indexFile, JSON.stringify(index, null, 0));
console.log(`${done.length} made, ${spent} Tripo credits spent; ${failed.length ? `failed: ${failed.join(', ')}` : 'none failed'}`);
