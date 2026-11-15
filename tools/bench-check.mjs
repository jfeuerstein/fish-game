#!/usr/bin/env node
// Runs the game's own benchmark end to end on the built game, with short steps, and prints
// what it reports. Headless Chromium draws with software, so the numbers mean nothing here:
// this only checks that the benchmark runs through every step and ends with its text.
//
//   npm run build && node tools/bench-check.mjs
import { preview } from 'vite';
import { devices, launchBrowser } from './browser.mjs';

const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const browser = await launchBrowser();
const context = await browser.newContext({ ...devices['iPhone 15 Pro'], reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fresh=1&mute=1&title=0&coach=0&stats=1&bench=1&benchsecs=0.6`);
await page.waitForFunction(() => window.__cove?.ready || window.__cove?.error, null, { timeout: 180000 });
await page.waitForFunction(() => window.__cove.bench?.(), null, { timeout: 180000 });
const text = await page.evaluate(() => window.__cove.bench());
console.log(text);
const lines = text.split('\n');
const steps = lines.filter((l) => /^\d+\. /.test(l));
const problems = [];
if (lines[0] !== 'Driftwood Cove benchmark') problems.push('the report does not begin with its name');
if (steps.length < 5) problems.push(`only ${steps.length} steps were reported`);
for (const s of steps) if (!/ \d+ fps, .* \d+ calls, /.test(s) || / 0 fps/.test(s)) problems.push(`a step timed no frames: ${s}`);
if (!(await page.$('.bench-text'))) problems.push('the report was not shown');
if (await page.$('.bench-note')) problems.push('the note saying what the benchmark is doing was left up');
const fps = await page.textContent('.fps').catch(() => null);
if (!fps || !/fps/.test(fps)) problems.push(`the frame-rate readout says "${fps}"`);
await browser.close();
await server.httpServer.close();
for (const p of [...problems, ...errors]) console.error(p);
console.log(problems.length || errors.length ? `${problems.length} problems, ${errors.length} errors` : 'bench check passed');
process.exit(problems.length || errors.length ? 1 : 0);
