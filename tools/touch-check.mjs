#!/usr/bin/env node
// Plays the built game on an emulated phone with real taps: opens and closes every menu, flips
// through each sheet's tabs, and checks that everything pressable is at least 44 points tall.
//
//   npm run build && node tools/touch-check.mjs
import { preview } from 'vite';
import { devices, launchBrowser } from './browser.mjs';

const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const browser = await launchBrowser();
const context = await browser.newContext({ ...devices['iPhone 15 Pro'], reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fresh=1&mute=1&quality=low&time=day&weather=clear&at=shop`);
await page.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
const problems = [];
const small = async (where) => {
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => b.offsetParent !== null && !b.closest('.roulette-track'))
      .map((b) => ({ text: (b.textContent || b.className).trim().slice(0, 24), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width }))
      .filter((b) => b.h < 43.5 || b.w < 36),
  );
  for (const f of found) problems.push(`${where}: "${f.text}" is ${Math.round(f.w)}x${Math.round(f.h)}`);
};
await page.tap('#start');
await page.waitForTimeout(1500);
await small('playing');
for (const name of ['bag', 'journal', 'fun', 'more']) {
  await page.tap(`.menu-btn.${name}`);
  await page.waitForSelector('.sheet.up', { timeout: 10000 });
  for (const tab of await page.$$('.sheet .tab')) {
    await tab.tap();
    await page.waitForTimeout(150);
    await small(`${name} › ${(await tab.textContent()).trim()}`);
  }
  await small(name);
  await page.tap('.sheet-close');
  await page.waitForTimeout(200);
  if (await page.$('.sheet')) problems.push(`${name} did not close`);
}
// The shop opens from the big button by its counter.
await page.waitForTimeout(800);
const label = await page.textContent('.act-main');
if (label?.trim() !== 'Shop') problems.push(`expected the Shop button by the counter, found "${label}"`);
else {
  await page.tap('.act-main');
  await page.waitForSelector('.sheet.up', { timeout: 10000 });
  for (const tab of await page.$$('.sheet .tab')) {
    await tab.tap();
    await page.waitForTimeout(150);
    await small(`shop › ${(await tab.textContent()).trim()}`);
  }
  await page.tap('.sheet-close');
}
await browser.close();
await server.close();
for (const e of errors) console.error(`page error: ${e}`);
for (const p of problems) console.error(p);
console.log(problems.length || errors.length ? `${problems.length} problems, ${errors.length} errors` : 'touch check passed');
process.exit(problems.length || errors.length ? 1 : 0);
