#!/usr/bin/env node
// Photograph every character's head from the front, three-quarters on and the side, on one
// sheet: for placing the drawn eyes (FACES in src/player/face.ts) and looking at expressions.
//
//   npm run build && node tools/face-check.mjs out.png [--chars char-otter,npc-duck] [--face happy] [--query "look=smooth"]
import sharp from 'sharp';
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a, i) => args[i - 1] === name);
const out = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'faces.png';
const ALL = ['char-otter', 'char-frog', 'char-raccoon', 'npc-duck', 'npc-beaver', 'npc-bear', 'npc-pelican'];
const chars = flag('--chars')?.split(',') ?? ALL;
const face = flag('--face') ?? null;
const W = 380;
const H = 420;
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?title=0&fresh=1&mute=1&quality=low&hud=0&at=plaza&time=day&weather=clear&${flag('--query') ?? ''}`);
await page.waitForFunction(() => window.__cove?.ready, null, { timeout: 180000 });
await page.waitForTimeout(1200);
const frames = async (n) => {
  const f = await page.evaluate(() => window.__cove.state().frames);
  await page.waitForFunction((x) => window.__cove.state().frames > x, f + n, { timeout: 120000 });
};
const VIEWS = [0, 0.75, Math.PI / 2];
const tiles = [];
for (const [row, ch] of chars.entries()) {
  await page.evaluate(async ([c, f]) => {
    const g = window.__cove.game;
    for (const n of g.npcs) n.body.group.visible = false;
    g.world.props.group.visible = false;
    g.world.water.group.visible = false;
    g.gus.body.group.visible = false;
    g.save.characters.push(c);
    g.become(c);
    while (g.body.id !== c || !g.body.rigged) await new Promise((r) => setTimeout(r, 100));
    g.body.rodOut = false;
    g.player.place(3, 20, 0);
    if (f) g.body.express(f, 1e9);
  }, [ch, face]);
  await frames(3);
  for (const [col, yaw] of VIEWS.entries()) {
    await page.evaluate(([y]) => {
      const g = window.__cove.game;
      const head = g.player.pos.clone();
      head.y += 0.74;
      g.rig.yaw = y;
      g.rig.override = { pos: head, dist: 1.35, pitch: 0.1 };
      g.rig.smoothed.copy(head);
    }, [yaw]);
    await frames(3);
    tiles.push({ input: await page.screenshot({ timeout: 240000 }), left: col * W, top: row * H });
  }
}
await sharp({ create: { width: VIEWS.length * W, height: chars.length * H, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(out);
console.log(`faces of ${chars.length} characters in ${out}`);
await browser.close();
await server.close();
