#!/usr/bin/env node
// Plays the built game on an emulated phone with real taps: opens and closes every menu, flips
// through each sheet's tabs, checks that everything pressable is at least 44 points tall, and
// walks and turns the camera with a dragged thumb.
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
// Walking and looking round: a thumb dragged in the bottom third must move the player, and a
// thumb dragged higher up must turn the camera. (Both land on the picture of the world, not on
// the layer under it: the game once took only touches on that layer, and nobody could move.)
{
  const { width, height } = page.viewportSize();
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const drag = async (x, y, dx, dy, hold) => {
    await touch('touchStart', x, y);
    for (let i = 1; i <= 10; i++) {
      await touch('touchMove', x + (dx * i) / 10, y + (dy * i) / 10);
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(hold);
    const ring = await page.evaluate(() => !document.querySelector('.stick-ring').hidden);
    await touch('touchEnd');
    return ring;
  };
  const where = () => page.evaluate(() => ({ pos: window.__cove.state().pos, yaw: window.__cove.game.rig.yaw }));
  const before = await where();
  const ring = await drag(width * 0.3, height * 0.78, 0, -60, 1500);
  const walked = await where();
  if (!ring) problems.push('the stick did not appear under a thumb in the bottom third');
  if (Math.hypot(walked.pos[0] - before.pos[0], walked.pos[2] - before.pos[2]) < 0.5) problems.push('dragging the stick did not move the player');
  // The stick pushed right walks to the right of the screen...
  await drag(width * 0.3, height * 0.78, 60, 0, 1200);
  const sidestepped = await where();
  const right = (sidestepped.pos[0] - walked.pos[0]) * Math.cos(walked.yaw) - (sidestepped.pos[2] - walked.pos[2]) * Math.sin(walked.yaw);
  if (right < 0.5) problems.push(`pushing the stick right walked ${right.toFixed(1)} m to the right of the screen`);
  // ...and a finger dragged right above it carries the world with it (the camera's yaw goes up).
  await drag(width * 0.5, height * 0.35, 120, 0, 200);
  const turned = await where();
  if (turned.yaw - sidestepped.yaw < 0.1) problems.push(`dragging right above the stick turned the camera by ${(turned.yaw - sidestepped.yaw).toFixed(2)}, the wrong way or not at all`);
  // Back to the counter, where the rest of the check expects to be.
  await page.evaluate(() => window.__cove.teleport('shop'));
  await page.waitForTimeout(400);
}
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
// A prize card comes up after every game: check its buttons, then put it away.
const clearPrize = async (where) => {
  await page.waitForSelector('.prize-overlay .roulette-result.show', { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.ff-stamp'), null, { timeout: 10000 });
  await small(`${where} › prize`);
  await page.tap('.prize-overlay .btn.plain');
};
await step('arcade', async () => {
  await page.evaluate(() => {
    window.__cove.give(0, 40);
    window.__cove.open('arcade', 'Wheel');
  });
  await page.waitForSelector('.sheet.up.casino', { timeout: 10000 });
  await small('arcade › wheel');
  // The wheel: the strip of prizes, then its card with Again and Done.
  await page.tap('.casino-go');
  await page.waitForSelector('.roulette-result.show', { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.ff-stamp'), null, { timeout: 10000 });
  await small('arcade › wheel › prize');
  await page.tap('.roulette-result .btn.plain');
  await page.waitForSelector('.sheet.up.casino .casino-go', { timeout: 10000 });
  await page.tap('.sheet .tab:nth-child(2)');
  await page.waitForSelector('.slots', { timeout: 10000 });
  await small('arcade › slots');
  await page.tap('.casino-go');
  await clearPrize('slots');
  await page.tap('.sheet .tab:nth-child(3)');
  await page.waitForSelector('.flight-sky', { timeout: 10000 });
  await small('arcade › flying fish');
  await page.tap('.casino-go');
  await clearPrize('flying fish');
  await page.tap('.sheet .tab:nth-child(4)');
  await page.waitForSelector('.scratch-art', { timeout: 10000 });
  await small('arcade › scratch');
  await page.tap('.casino-go');
  await page.waitForSelector('.scratch', { timeout: 10000 });
  await small('scratch card');
  await page.tap('.scratch .btn.plain');
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
