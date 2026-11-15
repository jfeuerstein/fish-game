#!/usr/bin/env node
// Sounds from Patch's open asset library (patch.gg), for the arcade and its fanfare: Kenney's CC0
// casino sounds, music jingles and interface ticks. Each is looked up by its id through Patch's
// public API (no sign-in), its web file fetched, made an MP3 (Safari on older iPhones will not
// play Ogg) and saved as public/audio/<name>.mp3; the credits go in public/audio/credits.json.
//
//   node tools/assets/get-patch-sounds.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const API = 'https://patch.gg/api/v1/assets/';
/** The game's name for a sound, and the asset it is. */
export const PATCH_SOUNDS = {
  'jingle-small': 'kenney:music-jingles/jingles_PIZZI00.ogg',
  'jingle-big': 'kenney:music-jingles/jingles_STEEL00.ogg',
  'jingle-huge': 'kenney:music-jingles/jingles_STEEL01.ogg',
  'jingle-jackpot': 'kenney:music-jingles/jingles_STEEL12.ogg',
  'jingle-lose': 'kenney:music-jingles/jingles_SAX09.ogg',
  tick: 'kenney:interface-sounds/tick_002.ogg',
  chip: 'kenney:casino-audio/chips-stack-1.ogg',
  chips: 'kenney:casino-audio/chips-handle-1.ogg',
  shuffle: 'kenney:casino-audio/card-shuffle.ogg',
  card: 'kenney:casino-audio/card-place-1.ogg',
};

const tmp = `${ROOT}tools/assets/cache/patch`;
mkdirSync(tmp, { recursive: true });
const credits = {};
for (const [name, id] of Object.entries(PATCH_SOUNDS)) {
  const info = await (await fetch(API + encodeURIComponent(id))).json();
  const variant = info.variants.find((v) => v.name === 'web') ?? info.variants[0];
  const file = variant.files.find((f) => f.role === 'audio') ?? variant.files[0];
  const src = `${tmp}/${name}.ogg`;
  writeFileSync(src, Buffer.from(await (await fetch(file.url)).arrayBuffer()));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-b:a', '96k', `${ROOT}public/audio/${name}.mp3`]);
  credits[name] = { id, title: info.title, license: info.license.spdx, credit: info.credit };
  console.log(`${name}: ${info.title} (${info.license.spdx})`);
}
writeFileSync(`${ROOT}public/audio/credits.json`, JSON.stringify(credits, null, 1));
