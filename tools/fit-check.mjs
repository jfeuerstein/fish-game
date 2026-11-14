#!/usr/bin/env node
// Try every hat and accessory on every character and photograph each from the front and the
// side, one sheet per item: <outdir>/<item>.png (three characters across, two views down).
//
//   npm run build && node tools/fit-check.mjs outdir [item ...]
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

const [out = 'fit-check', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const CHARS = ['char-otter', 'char-frog', 'char-raccoon'];
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 260, height: 300 } });
page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?title=0&fresh=1&mute=1&quality=low&hud=0&at=plaza&time=day&weather=clear`);
await page.waitForFunction(() => window.__cove?.ready, null, { timeout: 180000 });
const items = only.length ? only : await page.evaluate(async () => Object.keys(await (await fetch('models/index.json')).json()).filter((k) => k.startsWith('hat-') || k.startsWith('x-')));
const shots = {};
const frames = async (n) => {
  const f = await page.evaluate(() => window.__cove.state().frames);
  await page.waitForFunction((x) => window.__cove.state().frames > x, f + n, { timeout: 120000 });
};
for (const ch of CHARS) {
  await page.evaluate(async (c) => {
    const g = window.__cove.game;
    for (const n of g.npcs) n.body.group.visible = false;
    g.save.characters.push(c);
    g.become(c);
    while (g.body.id !== c || !g.body.rigged) await new Promise((r) => setTimeout(r, 100));
  }, ch);
  await frames(2);
  for (const item of items) {
    await page.evaluate(async (id) => {
      const g = window.__cove.game;
      g.body.rodOut = false;
      g.player.place(3, 20, 0);
      if (id.startsWith('hat-')) {
        g.wearExtra(null);
        await g.body.setHat(id);
        g.save.hat = id;
      } else {
        await g.body.setHat(null);
        g.save.hat = null;
        await g.body.setExtra(id);
        g.save.extra = id;
      }
    }, item);
    await frames(2);
    const back = item === 'x-backpack';
    for (const [view, yaw] of [['front', back ? Math.PI - 0.6 : 0.6], ['side', Math.PI / 2]]) {
      await page.evaluate(([y]) => {
        const g = window.__cove.game;
        const head = g.player.pos.clone();
        head.y += g.body.id === 'char-frog' ? 0.62 : 0.68;
        g.rig.yaw = y;
        g.rig.override = { pos: head, dist: 1.9, pitch: 0.12 };
        g.rig.smoothed.copy(head);
      }, [yaw]);
      await frames(2);
      shots[`${item}|${ch}|${view}`] = await page.screenshot();
    }
  }
}
for (const item of items) {
  const tiles = [];
  CHARS.forEach((ch, c) => ['front', 'side'].forEach((v, r) => tiles.push({ input: shots[`${item}|${ch}|${v}`], left: c * 260, top: r * 300 })));
  await sharp({ create: { width: 780, height: 600, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(`${out}/${item}.png`);
}
console.log(`fit sheets for ${items.length} items in ${out}/`);
await browser.close();
await server.close();
