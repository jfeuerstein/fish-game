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
// The sheets and overlays not reached from the bottom row.
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    problems.push(`${label}: ${String(e.message ?? e).split('\n')[0]}`);
  }
};
await step('board', async () => {
  await page.evaluate(() => window.__cove.open('board'));
  await page.waitForSelector('.sheet.up', { timeout: 10000 });
  await small('board');
  await page.tap('.sheet-close');
});
await step('chest roulette', async () => {
  await page.evaluate(() => {
    window.__cove.give(0, 10);
    window.__cove.open('chests');
  });
  await page.waitForSelector('.sheet.up', { timeout: 10000 });
  await small('chests');
  await page.tap('.sheet .btn.coral');
  await page.waitForSelector('.roulette-result.show', { timeout: 30000 });
  await small('roulette result');
  await page.waitForFunction(() => !document.querySelector('.ff-stamp'), null, { timeout: 10000 });
  await page.tap('.roulette-result .btn.plain');
  await page.tap('.sheet-close');
});
// A prize card may come up after a game: check its buttons, then put it away.
const clearPrize = async (where) => {
  await page.waitForFunction(() => !document.querySelector('.ff-stamp'), null, { timeout: 10000 });
  if (await page.$('.prize-overlay')) {
    await small(`${where} › prize`);
    await page.tap('.prize-overlay .btn.plain');
  }
};
await step('arcade', async () => {
  await page.evaluate(() => {
    window.__cove.give(0, 40);
    window.__cove.open('arcade', 'Wheel');
  });
  await page.waitForSelector('.sheet.up.casino', { timeout: 10000 });
  await small('arcade › wheel');
  await page.tap('.wheel-bet.pk-shell');
  await page.waitForFunction(() => !document.querySelector('.wheel-bet')?.disabled, null, { timeout: 30000 });
  await clearPrize('wheel');
  await page.tap('.sheet .tab:nth-child(2)');
  await page.waitForSelector('.slots', { timeout: 10000 });
  await small('arcade › slots');
  await page.tap('.casino-go');
  await page.waitForFunction(() => !document.querySelector('.casino-go')?.disabled && document.querySelector('.casino-out')?.textContent, null, { timeout: 30000 });
  await clearPrize('slots');
  await page.tap('.sheet .tab:nth-child(3)');
  await page.waitForSelector('.flight-sky', { timeout: 10000 });
  await small('arcade › flying fish');
  await page.tap('.casino-go');
  await page.waitForTimeout(300);
  await page.tap('.casino-go');
  await page.waitForFunction(() => document.querySelector('.casino-out')?.textContent, null, { timeout: 30000 });
  await clearPrize('flying fish');
  await page.tap('.sheet .tab:nth-child(5)');
  await page.waitForSelector('.sheet .row .btn.coral', { timeout: 10000 });
  await small('arcade › tickets');
  await page.tap('.sheet .row .btn.coral');
  await page.waitForSelector('.scratch', { timeout: 10000 });
  await small('scratch ticket');
  await page.tap('.scratch .btn.plain');
  await page.waitForSelector('.scratch .btn.green:not([hidden])', { timeout: 10000 });
  await clearPrize('scratch');
  await page.tap('.scratch .btn.green');
  await page.tap('.sheet-close');
});
await step('ukulele', async () => {
  await page.evaluate(() => window.__cove.game.playUke());
  await page.waitForSelector('.uke', { timeout: 10000 });
  await small('ukulele');
  await page.tap('.uke .btn.coral');
});
await step('chalk', async () => {
  await page.evaluate(() => window.__cove.teleport('chalk'));
  await page.waitForFunction(() => document.querySelector('.act-second')?.textContent === 'Draw', null, { timeout: 30000 });
  await page.tap('.act-second');
  await page.waitForSelector('.chalk-ui', { timeout: 10000 });
  await small('chalk');
  await page.tap('.chalk-tools .btn.green');
});
await browser.close();
await server.close();
for (const e of errors) console.error(`page error: ${e}`);
for (const p of problems) console.error(p);
console.log(problems.length || errors.length ? `${problems.length} problems, ${errors.length} errors` : 'touch check passed');
process.exit(problems.length || errors.length ? 1 : 0);
