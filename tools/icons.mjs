#!/usr/bin/env node
// Render a menu icon for each model (fish for the journal, hats and furniture for the shop),
// in the game's own light: art/icons/<id>.webp (run tools/assets/lofi.mjs icons after, to make
// the pixel sprites the menus show). Icons painted by fal are left alone unless
// --all is given.
//
//   node tools/icons.mjs [--all] [prefix ...]
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createServer } from 'vite';
import { launchBrowser } from './browser.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const args = process.argv.slice(2);
const all = args.includes('--all');
const prefixes = args.filter((a) => !a.startsWith('--'));
const index = JSON.parse(readFileSync(`${ROOT}public/models/index.json`, 'utf8'));
const ids = Object.keys(index).filter((id) => (!prefixes.length || prefixes.some((p) => id.startsWith(p))) && (all || index[id].source === 'blender' || !existsSync(`${ROOT}art/icons/${id}.webp`)));
const server = await createServer({ root: ROOT, logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
page.on('pageerror', (e) => console.error(e.message));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/icon-render.html`);
await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
let made = 0;
for (const id of ids) {
  const url = await page.evaluate((i) => window.renderIcon(i), id);
  if (!url) continue;
  await sharp(Buffer.from(url.split(',')[1], 'base64')).webp({ quality: 88, alphaQuality: 90 }).toFile(`${ROOT}art/icons/${id}.webp`);
  made++;
}
console.log(`rendered ${made} icons`);
await browser.close();
await server.close();
