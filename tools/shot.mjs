#!/usr/bin/env node
// Take a screenshot of the built game, upright-phone sized, to check changes by eye.
//
//   npm run build && node tools/shot.mjs out.png ["at=pier&time=dusk"] [width] [height] [scale] [script]
//
// The script runs in the page once the game is ready (it may be async). Headless Chromium draws
// in software, so frame rates mean nothing here.
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

const [out = 'shot.png', query = '', width = '402', height = '874', scale = '1', script = ''] = process.argv.slice(2);
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const params = new URLSearchParams(query);
for (const [k, v] of [['title', '0'], ['time', 'day'], ['weather', 'clear'], ['fresh', '1'], ['mute', '1']]) if (!params.has(k)) params.set(k, v);
const url = `http://127.0.0.1:${server.httpServer.address().port}/?${params}`;
const browser = await launchBrowser();
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: Number(scale) });
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.error(`[page ${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
  const error = await page.evaluate(() => window.__cove.error);
  if (error) {
    failed = true;
    console.error(`game failed to start:\n${error}`);
  } else {
    if (script) await page.evaluate(`(async () => { ${script} })()`);
    const f = await page.evaluate(() => window.__cove.state().frames);
    await page.waitForFunction((n) => window.__cove.state().frames > n + 6, f, { timeout: 180000 });
    await page.waitForTimeout(400);
    console.log(JSON.stringify(await page.evaluate(() => window.__cove.state())));
  }
  await page.screenshot({ path: out, timeout: 180000 });
  console.error(`saved ${out}`);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
