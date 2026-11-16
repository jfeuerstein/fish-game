#!/usr/bin/env node
// Rows round the fleet on the built game, as the buttons do it, and takes pictures on the way:
// the buoy's list with no chart, the rowing card, each far island's jetty and a fish of its own
// from its water, and home again. Then, with a save that is kept, that the game opens on the
// island it was put away on with the bag as it was.
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

/** Tap the row for an island in the list of places to row to. Says what the list held. */
const rowTo = (name) =>
  page.evaluate((name) => {
    const rows = [...document.querySelectorAll('.sheet .row')];
    const titles = rows.map((r) => r.querySelector('.title')?.textContent ?? '');
    const row = rows.find((r) => r.querySelector('.title')?.textContent === name);
    const go = row?.querySelector('button');
    if (go) go.click();
    return { titles, went: !!go };
  }, name);
/** The tools' save is not kept, so the charts are handed over again on each island. */
const charts = (list) => page.evaluate((list) => window.__cove.game.save.charts.push(...list), list);

await page.goto(`${base}?title=0&fresh=1&mute=1&coach=0&time=day&weather=clear&trader=0`);
await ready();
if ((await state()).isle !== 'cove') fail('did not begin at the cove');

// Without a chart, the buoy opens the list, and nothing on it can be rowed to.
await toBuoy();
await page.waitForTimeout(700);
const offered = await second();
await page.waitForTimeout(900);
if (offered !== 'Row out') fail(`at the buoy the button read ${offered}`);
const none = await rowTo('Kettle Isle');
await shot('1-no-chart');
if (none.went || none.titles.some((t) => t !== '???')) fail(`with no chart the list read ${none.titles.join(', ')}`);
if ((await state()).isle !== 'cove' || (await state()).mode !== 'boat') fail('left the cove without a chart');
await page.evaluate(() => document.querySelector('.sheet-close')?.click());

// Round the fleet: to each far island by its row in the list, behind the card, and a fish of its own there.
const FLEET = [
  { id: 'kettle', name: 'Kettle Isle', at: 'lake', zone: 'lake', fish: 'ember-newt' },
  { id: 'rime', name: 'Rimefall', at: 'hole', zone: 'ice', fish: 'ice-smelt' },
  { id: 'mire', name: 'Mirewood', at: 'bayou', zone: 'swamp', fish: 'mudskipper' },
  { id: 'glow', name: 'Glowmere', at: 'mere', zone: 'mere', fish: 'lamp-newt' },
];
for (const [n, isle] of FLEET.entries()) {
  await charts(FLEET.map((f) => f.id));
  await toBuoy();
  await page.waitForTimeout(700);
  const label = await second();
  if (label !== 'Row out') fail(`on the way to ${isle.name} the buoy's button read ${label}`);
  await page.waitForTimeout(700);
  const list = await rowTo(isle.name);
  if (!list.went) fail(`${isle.name} was not in the list to row to: ${list.titles.join(', ')}`);
  await page.waitForSelector('#title.crossing', { timeout: 30000 });
  if (n === 0) await shot('2-rowing-out');
  const card = await page.evaluate(() => document.querySelector('.crossing-says')?.textContent);
  if (!(card ?? '').includes(isle.name)) fail(`the card read ${card}`);
  await ready();
  await page.waitForTimeout(1500);
  const there = await state();
  await shot(`3-${isle.id}-jetty`);
  if (there.isle !== isle.id) fail(`arrived on ${there.isle}, not ${isle.id}`);
  if (await page.evaluate(() => !!document.getElementById('title') && !document.getElementById('title').classList.contains('gone'))) fail('the title did not go by itself');
  // Its water is its own, and what comes out of it is kept and put on the chart.
  const got = await page.evaluate(({ at, zone, fish }) => {
    const G = window.__cove.game;
    window.__cove.teleport(at);
    window.__cove.catchNow(fish);
    return { bag: G.save.bag.map((c) => c.species), caughtAt: G.save.caughtAt[zone] ?? [] };
  }, isle);
  await page.waitForTimeout(1200);
  await shot(`4-${isle.id}-${isle.at}`);
  if (!got.bag.includes(isle.fish) || !got.caughtAt.includes(isle.fish)) fail(`a ${isle.fish} from ${isle.name} was not kept or not put on the chart`);
}

// And home.
await toBuoy();
await page.waitForTimeout(700);
await second();
await page.waitForTimeout(700);
const back = await rowTo('Driftwood Cove');
if (!back.went) fail(`home was not in the list: ${back.titles.join(', ')}`);
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
