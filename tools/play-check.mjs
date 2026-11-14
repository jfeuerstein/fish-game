#!/usr/bin/env node
// Plays a few casts on the built game from the pier, as a thumb would, and takes pictures of
// each step: winding up, waiting, the bite, reeling, and the catch.
//
//   npm run build && node tools/play-check.mjs [outdir]
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

const out = process.argv[2] ?? 'play-check';
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const url = `http://127.0.0.1:${server.httpServer.address().port}/?title=0&fresh=1&mute=1&time=day&weather=clear&at=pier&quality=low&warp=6`;
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
page.on('console', (m) => m.type() === 'error' && console.error(`[page] ${m.text()}`));
await page.goto(url);
await page.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
const state = () => page.evaluate(() => window.__cove.state());
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const waitFor = (fn, ms = 60000) => page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
await page.evaluate(() => window.__cove.face(Math.PI));
await page.waitForTimeout(800);
let landed = 0;
for (let cast = 0; cast < 3; cast++) {
  await page.evaluate(() => window.__cove.press());
  await page.waitForTimeout(300);
  if (cast === 0) await shot('1-aiming');
  await page.evaluate(() => window.__cove.release());
  await waitFor(() => window.__cove.state().fishing === 'waiting');
  if (cast === 0) await shot('2-waiting');
  // Hook it on the very frame it bites, as a quick thumb would.
  await page.evaluate(() => new Promise((done) => {
    const tick = () => (window.__cove.state().fishing === 'bite' ? (window.__cove.press(), done()) : requestAnimationFrame(tick));
    tick();
  }));
  // A careful thumb, every frame from the hook on: wind while the line is slack and the fish calm.
  await page.evaluate(() => {
    const g = window.__cove.game;
    const tick = () => {
      const r = g.fishing.reelState;
      if (!r) return window.__cove.release();
      const want = !r.thrashing && r.tension < (g.hud.held ? 0.7 : 0.35);
      if (want !== g.hud.held) (want ? window.__cove.press : window.__cove.release)();
      requestAnimationFrame(tick);
    };
    tick();
  });
  if (cast === 0) await shot('3-hooked');
  if (cast === 0) {
    await waitFor(() => (window.__cove.game.fishing.reelState?.progress ?? 1) > 0.45, 120000);
    await shot('4-reeling');
  }
  await waitFor(() => window.__cove.state().fishing !== 'reeling', 180000);
  const s = await state();
  if (s.fishing === 'landing') {
    landed++;
    await page.waitForTimeout(500);
    if (landed === 1) await shot('5-caught');
  }
  console.log(`cast ${cast + 1}: ${s.fishing}, caught ${s.caught}, coins ${s.coins}`);
  await waitFor(() => window.__cove.state().fishing === 'ready', 20000);
}
console.log(JSON.stringify(await state()));
await browser.close();
await server.close();
process.exit(landed ? 0 : 1);
