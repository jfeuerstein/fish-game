import { preview } from 'vite';
import sharp from 'sharp';
import { launchBrowser } from './browser.mjs';
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?title=0&fresh=1&mute=1&quality=low&at=pond&weather=rain&time=day&hud=0`);
await page.waitForFunction(() => window.__cove?.ready, null, { timeout: 180000 });
await page.waitForTimeout(3000);
const white = async () => {
  const f = await page.evaluate(() => window.__cove.state().frames);
  await page.waitForFunction((n) => window.__cove.state().frames > n + 2, f, { timeout: 120000 });
  const buf = await page.screenshot({ timeout: 120000, clip: { x: 120, y: 300, width: 140, height: 80 } });
  const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 3) if (data[i] > 212 && data[i + 1] > 224 && data[i + 2] > 228 && Math.abs(data[i] - data[i + 2]) < 30) n++;
  return n;
};
let base = 0;
for (let k = 0; k < 40 && base < 25; k++) {
  base = await white();
  console.log('try', k, base);
  if (base < 25) await page.waitForTimeout(4000);
}
if (base < 25) { console.log('never appeared'); process.exit(0); }
await page.evaluate(() => { window.__cove.game.clock.stop(); });
console.log('base', await white());
const names = await page.evaluate(() => {
  const g = window.__cove.game;
  window.__objs = [];
  const add = (o, label) => { window.__objs.push(o); return label; };
  const out = [];
  g.scene.children.forEach((c, i) => out.push(add(c, `scene[${i}] ${c.type} ${c.name}`)));
  g.world.group.children.forEach((c, i) => out.push(add(c, `world[${i}] ${c.type} ${c.name}`)));
  return out;
});
for (let i = 0; i < names.length; i++) {
  await page.evaluate((k) => (window.__objs[k].visible = !window.__objs[k].visible), i);
  const n = await white();
  await page.evaluate((k) => (window.__objs[k].visible = !window.__objs[k].visible), i);
  console.log(n, names[i]);
}
await browser.close(); await server.close();
