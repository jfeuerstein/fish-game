// The chart, drawn as a sea chart is: the island from above in a few flat inks, a pixel to a
// metre and a half, with the places named, the camp where it stands, and where you are. Under
// it, each water and the kinds of fish that have come out of it.
import { BY_ID, ZONE_LABEL } from '../fishing/fish';
import { campAt } from '../game/camp';
import { FAR_WATERS, WATERS, caughtIn, caveKnown } from '../game/chart';
import { HOME, ISLE } from '../world/isle';
import type { Session } from '../game/session';
import { type Heightfield, waterAt } from '../world/island';
import { CANNERY, CAVE, CROSSING, PIER, PLACED, POND, POOLS, WRECK, floorAt } from '../world/layout';
import { splatAt } from '../world/terrain';
import { el, icon } from './hud';

const SIZE = 168;
/** The part of the world the chart shows: the island and its pier, not the empty sea beyond. */
const VIEW = HOME ? { x: 14, z: -4, half: 98 } : { x: 0, z: 0, half: 116 };
const INK: Record<string, string> = { deep: '#1f4f86', ocean: '#3f86c8', shoal: '#7fbbe6', pond: '#2c8a8a', creek: '#62c0b0', cave: '#33264c', lake: '#2c8a8a', reef: '#62c0b0', pools: '#7fbbe6', spring: '#b4e4d4', sand: '#ecc77d', earth: '#a97c52', rock: '#737b80', cobble: '#d6cbb2', grass: '#5c8f44', high: '#93b85a', wood: '#7d5436', line: '#10181f' };

let drawn: HTMLCanvasElement | null = null;

/** The island, drawn once: it does not change. */
function island(field: Heightfield): HTMLCanvasElement {
  if (drawn) return drawn;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d')!;
  const land = new Uint8Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const x = VIEW.x + ((i + 0.5) / SIZE - 0.5) * VIEW.half * 2;
      const z = VIEW.z + ((j + 0.5) / SIZE - 0.5) * VIEW.half * 2;
      const w = waterAt(field, x, z);
      let ink: string;
      if (floorAt(x, z) !== null) ink = INK.wood;
      else if (w) ink = w.zone === 'ocean' && w.depth < 1.4 ? INK.shoal : INK[w.zone];
      else {
        land[j * SIZE + i] = 1;
        const [sand, earth, rock, cobble] = splatAt(field, x, z);
        ink = cobble > 0.5 ? INK.cobble : rock > 0.5 ? INK.rock : earth > 0.5 ? INK.earth : sand > 0.5 ? INK.sand : field.heightAt(x, z) > 6 ? INK.high : INK.grass;
      }
      g.fillStyle = ink;
      g.fillRect(i, j, 1, 1);
    }
  // An ink line along the shore, as a chart has.
  g.fillStyle = INK.line;
  for (let j = 1; j < SIZE - 1; j++)
    for (let i = 1; i < SIZE - 1; i++) {
      if (!land[j * SIZE + i]) continue;
      if (!land[j * SIZE + i - 1] || !land[j * SIZE + i + 1] || !land[(j - 1) * SIZE + i] || !land[(j + 1) * SIZE + i]) g.fillRect(i, j, 1, 1);
    }
  drawn = c;
  return c;
}

export interface ChartOf {
  field: Heightfield;
  /** Where the player is. */
  at(): { x: number; z: number };
  /** Where the trader's stall is, on a day they are in. */
  trader(): { x: number; z: number } | null;
}

/** Fill a sheet's body with the chart. */
export function drawChart(body: HTMLElement, s: Session, of: ChartOf): void {
  const save = s.save;
  const wrap = el('div', 'chart');
  const canvas = island(of.field);
  const pic = document.createElement('canvas');
  pic.width = pic.height = SIZE;
  pic.getContext('2d')!.drawImage(canvas, 0, 0);
  wrap.append(pic);
  const pin = (x: number, z: number, text: string, kind = ''): void => {
    const p = el('div', `chart-pin ${kind}`, `<i></i><span>${text}</span>`);
    p.style.left = `${((x - VIEW.x + VIEW.half) / (VIEW.half * 2)) * 100}%`;
    p.style.top = `${((z - VIEW.z + VIEW.half) / (VIEW.half * 2)) * 100}%`;
    // Near the right edge the name goes to the left of its mark, so it is not cut off.
    if (x - VIEW.x > VIEW.half * 0.55) p.classList.add('left');
    wrap.append(p);
  };
  if (HOME) {
    const placed = (id: string): { x: number; z: number } => PLACED.find((p) => p.id === id)!;
    pin(placed('shop').x, placed('shop').z, "Gus's shop");
    pin(placed('arcade').x, placed('arcade').z, 'Lucky Gull');
    pin(placed('lighthouse').x, placed('lighthouse').z, 'Lighthouse');
    pin(placed('fishing-hut').x, placed('fishing-hut').z, 'Hut');
    pin(PIER.head.x0 - 8, PIER.z, 'Pier');
    pin(POND.x, POND.z, 'Pond');
    if (caveKnown(save)) pin(CAVE.x, CAVE.z, 'Sea cave');
    if (save.seaChart) pin(CROSSING.x, CROSSING.z, 'To Kettle Isle');
  } else {
    pin(PIER.x0 + 6, PIER.z, 'Jetty');
    pin(CANNERY.x, CANNERY.z, 'Cannery');
    pin(POND.x, POND.z, 'The Kettle');
    const hot = POOLS.find((q) => q.hot);
    if (hot) pin(hot.x, hot.z, 'Hot spring');
    const tide = POOLS.filter((q) => !q.hot);
    if (tide.length) pin(tide[1].x, tide[1].z, 'Tide pools');
    pin(WRECK.x + 14, WRECK.z - 12, 'Reef');
    pin(CROSSING.x, CROSSING.z, 'Home');
  }
  const camp = campAt(save.placed.filter((q) => (q.isle ?? 'cove') === ISLE));
  if (camp) pin(camp.x, camp.z, save.campName || 'Your camp', 'camp');
  const stall = of.trader();
  if (stall) pin(stall.x, stall.z, 'Trader', 'camp');
  const me = of.at();
  pin(me.x, me.z, 'You', 'you');
  body.append(wrap);

  body.append(el('div', 'section', 'What has come out of each water'));
  // Both islands' waters are listed, the one the player is on first; Kettle Isle's only once it has been reached.
  const far = save.hints.includes('kettle') ? FAR_WATERS : [];
  for (const zone of HOME ? [...WATERS, ...far] : [...far, ...WATERS]) {
    if (zone === 'cave' && !caveKnown(save)) continue;
    const kinds = caughtIn(save, zone);
    const row = el('div', 'chart-water');
    row.append(el('b', '', ZONE_LABEL[zone]));
    if (!kinds.length) row.append(el('span', 'sub', 'Nothing yet.'));
    for (const id of kinds) {
      const img = document.createElement('img');
      img.src = icon(`fish-${id}`);
      img.alt = img.title = BY_ID[id].name;
      row.append(img);
    }
    body.append(row);
  }
}
