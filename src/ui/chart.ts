// The chart, drawn as a sea chart is: the island from above in a few flat inks, a pixel to a
// metre and a half, with the places named, the camp where it stands, and where you are. Under
// it, each water and the kinds of fish that have come out of it.
import { BY_ID, ZONE_LABEL } from '../fishing/fish';
import { campAt } from '../game/camp';
import { WATERS, caughtIn, caveKnown } from '../game/chart';
import type { Session } from '../game/session';
import { type Heightfield, waterAt } from '../world/island';
import { CAVE, PIER, PLACED, POND, floorAt } from '../world/layout';
import { splatAt } from '../world/terrain';
import { el, icon } from './hud';

const SIZE = 168;
/** The part of the world the chart shows: the island and its pier, not the empty sea beyond. */
const VIEW = { x: 14, z: -4, half: 98 } as const;
const INK: Record<string, string> = { deep: '#1f4f86', ocean: '#3f86c8', shoal: '#7fbbe6', pond: '#2c8a8a', creek: '#62c0b0', cave: '#33264c', sand: '#ecc77d', earth: '#a97c52', rock: '#737b80', cobble: '#d6cbb2', grass: '#5c8f44', high: '#93b85a', wood: '#7d5436', line: '#10181f' };

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
    wrap.append(p);
  };
  const placed = (id: string): { x: number; z: number } => PLACED.find((p) => p.id === id)!;
  pin(placed('shop').x, placed('shop').z, "Gus's shop");
  pin(placed('arcade').x, placed('arcade').z, 'Lucky Gull');
  pin(placed('lighthouse').x, placed('lighthouse').z, 'Lighthouse');
  pin(placed('fishing-hut').x, placed('fishing-hut').z, 'Hut');
  pin(PIER.head.x0 - 8, PIER.z, 'Pier');
  pin(POND.x, POND.z, 'Pond');
  if (caveKnown(save)) pin(CAVE.x, CAVE.z, 'Sea cave');
  const camp = campAt(save.placed);
  if (camp) pin(camp.x, camp.z, save.campName || 'Your camp', 'camp');
  const stall = of.trader();
  if (stall) pin(stall.x, stall.z, 'Trader', 'camp');
  const me = of.at();
  pin(me.x, me.z, 'You', 'you');
  body.append(wrap);

  body.append(el('div', 'section', 'What has come out of each water'));
  for (const zone of WATERS) {
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
