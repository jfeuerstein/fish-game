#!/usr/bin/env node
// Rows from Driftwood Cove to Kettle Isle and back on the built game, as the buttons do it, and
// takes pictures on the way: the buoy without a chart, the rowing card, Kettle Isle's jetty, a
// cast into the crater lake, and home again. Then, with a save that is kept, that the game opens
// on the island it was put away on with the bag as it was.
//
//   npm run build && node tools/cross-check.mjs [outdir]
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

const out = process.argv[2] ?? 'cross-check';
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const ready = () => page.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
const state = () => page.evaluate(() => window.__cove.state());
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, timeout: 240000 });
const fail = (why) => {
  console.error(`cross check FAILED: ${why}`);
  process.exitCode = 1;
};
/** Tap the second button (what is offered beside the big one), and say what it read. */
const second = () =>
  page.evaluate(() => {
    const b = document.querySelector('.act-second:not(.act-third)');
    if (!b || b.hidden) return null;
    const label = b.textContent;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    return label;
  });
/** Into the boat and beside the buoy. */
const toBuoy = () =>
  page.evaluate(async () => {
    const G = window.__cove.game;
    G.save.boat = true;
    G.boardBoat();
    const { CROSSING } = G.constructor.layout;
    G.boat.pos.set(CROSSING.x - 4, 0, CROSSING.z);
  });

await page.goto(`${base}?title=0&fresh=1&mute=1&coach=0&time=day&weather=clear&trader=0`);
await ready();
if ((await state()).isle !== 'cove') fail('did not begin at the cove');

// Without a chart, the buoy says so and the boat stays.
await toBuoy();
await page.waitForTimeout(700);
const refused = await second();
await page.waitForTimeout(900);
await shot('1-no-chart');
if (refused !== 'Row out') fail(`at the buoy the button read ${refused}`);
if ((await state()).isle !== 'cove' || (await state()).mode !== 'boat') fail('left the cove without a chart');

// With one: across, behind the card.
await page.evaluate(() => (window.__cove.game.save.seaChart = true));
await second();
await page.waitForSelector('#title.crossing', { timeout: 30000 });
await shot('2-rowing-out');
const card = await page.evaluate(() => document.querySelector('.crossing-says')?.textContent);
if (!/Kettle Isle/.test(card ?? '')) fail(`the card read ${card}`);
await ready();
await page.waitForTimeout(1500);
const there = await state();
await shot('3-kettle-jetty');
if (there.isle !== 'kettle') fail(`arrived on ${there.isle}`);
if (await page.evaluate(() => !!document.getElementById('title') && !document.getElementById('title').classList.contains('gone'))) fail('the title did not go by itself');

// The lake has its own fish.
const lake = await page.evaluate(() => {
  const G = window.__cove.game;
  window.__cove.teleport('lake');
  const out = [];
  for (let i = 0; i < 40; i++) {
    const c = G.fishingHooks().conditions('lake');
    out.push(c.zone);
  }
  window.__cove.catchNow('ember-newt');
  return { zone: out[0], bag: G.save.bag.map((c) => c.species), caughtAt: G.save.caughtAt };
});
await page.waitForTimeout(1200);
await shot('4-lake');
if (!lake.bag.includes('ember-newt') || !(lake.caughtAt.lake ?? []).includes('ember-newt')) fail('a fish from the lake was not kept or not put on the chart');

// And home.
await toBuoy();
await page.waitForTimeout(700);
const home = await second();
if (home !== 'Row home') fail(`at Kettle Isle's buoy the button read ${home}`);
await page.waitForSelector('#title.crossing', { timeout: 30000 });
await shot('5-rowing-home');
await ready();
await page.waitForTimeout(1200);
if ((await state()).isle !== 'cove') fail('did not come home');
await shot('6-home');

// A save that is kept: put away on Kettle Isle with a fish in the bag, it opens there with the fish.
const kept = await context.newPage();
kept.on('pageerror', (e) => errors.push(e.message));
await kept.goto(`${base}?mute=1&coach=0&title=0&time=day&weather=clear`);
await kept.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
await kept.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('cove.save') ?? '{}');
  localStorage.setItem('cove.save', JSON.stringify({ ...save, v: 1, seaChart: true, boat: true, bag: [{ species: 'trout', size: 30, variant: 'normal', huge: false, at: 1 }], hints: ['welcome', 'coach'] }));
  localStorage.setItem('cove.isle', 'kettle');
});
await kept.reload();
await kept.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
const again = await kept.evaluate(() => window.__cove.state());
if (again.isle !== 'kettle') fail(`a kept save opened on ${again.isle}, not where it was put away`);
if (again.bag !== 1) fail(`the bag came across with ${again.bag} fish, not 1`);
await kept.evaluate(() => {
  localStorage.removeItem('cove.isle');
  localStorage.removeItem('cove.save');
});

if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
if (!process.exitCode) console.log('cross check passed');
await browser.close();
await server.httpServer.close();
process.exit(process.exitCode ?? 0);
