// Fun: emotes, the ukulele, and chalk.
import type { Emote, Session } from '../game/session';
import { TOYS, restLeft, sayRest } from '../game/toys';

/** Line drawings for each emote, in the ink of the page. */
const svg = (d: string): string => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GLYPH: Record<Emote, string> = {
  wave: svg('<path d="M11 17V8.5a1.8 1.8 0 0 1 3.6 0V15M14.6 14V6.5a1.8 1.8 0 0 1 3.6 0V14M18.2 14V8a1.8 1.8 0 0 1 3.6 0v9c0 5-3 9-7.5 9-3 0-4.6-1.7-6.4-4.3L5.5 17a1.9 1.9 0 0 1 3.2-2L11 18"/><path d="M24.5 4.5c1.5 1 2.5 2.6 2.7 4.5M4.5 9c.2-1.8 1.2-3.4 2.6-4.4"/>'),
  dance: svg('<path d="M12 24V7l13-3v17"/><circle cx="9" cy="24" r="3"/><circle cx="22" cy="21" r="3"/>'),
  cheer: svg('<circle cx="16" cy="9" r="3"/><path d="M16 12v8M16 20l-4 7M16 20l4 7M9 4l4 9M23 4l-4 9"/>'),
  clap: svg('<path d="M9 18l5-9a1.6 1.6 0 0 1 2.8 1.6l-3 5.5M13 15l6-10a1.6 1.6 0 0 1 2.8 1.6L17 15M17 15l3-4a1.6 1.6 0 0 1 2.7 1.7L18 21c-2.2 3.5-6.3 4.5-9.2 2.6S6 18 8 15"/><path d="M5 9l2 1.5M7 5l1.5 2M24 22l2.5.5"/>'),
  sit: svg('<path d="M9 5v13h14v9M9 18v9M9 12h12"/>'),
  spin: svg('<path d="M26 16a10 10 0 1 1-3-7.1"/><path d="M24 3v6h-6"/>'),
  flop: svg('<path d="M4 18c5-6 13-6 18 0-5 5-13 5-18 0z"/><path d="M22 18l6-4v8z"/><circle cx="9" cy="17" r="1" fill="currentColor"/><path d="M8 9l1 3M14 7v3M20 9l-1 3"/>'),
  honk: svg('<path d="M5 13v6h4l8 5V8l-8 5H5z"/><path d="M21 12c1.5 1 1.5 7 0 8M24 9c3 2 3 12 0 14"/>'),
  stretch: svg('<circle cx="16" cy="10" r="3"/><path d="M16 13v9M16 22l-3 6M16 22l3 6M16 15L9 5M16 15l7-10"/>'),
  skip: svg('<path d="M3 22h26"/><ellipse cx="8" cy="14" rx="3" ry="1.6"/><path d="M13 20c1-3 3-3 4 0M20 20c1-2 2-2 3 0M26 20c.5-1 1-1 1.5 0"/>'),
  warm: svg('<path d="M16 6c3 4 6 7 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 1-2 0-5 0-8z"/><path d="M6 27h20"/>'),
  lean: svg('<circle cx="11" cy="8" r="3"/><path d="M12 11l4 8h8M16 19l-3 9M4 19h24"/>'),
  slap: svg('<path d="M8 20c4-5 10-5 14 0-4 4-10 4-14 0z"/><path d="M22 20l5-3v6z"/><circle cx="12" cy="19" r="1" fill="currentColor"/><path d="M4 9l5 3M7 5l4 4M12 3l2 5"/>'),
};
import { el, icon } from './hud';
import { pixelGlyph } from './pixels';
import { Sheet } from './sheet';

export function funSheet(app: HTMLElement, s: Session, chalk: () => boolean): Sheet {
  const sheet: Sheet = new Sheet(app, 'Fun', (body) => {
    // Toys, for whoever has won one: ridden ones are got on and off, the others used when they are ready.
    const toys = TOYS.filter((t) => s.save.toys.includes(t.id));
    if (toys.length) {
      body.append(el('div', 'section', 'Toys'));
      for (const t of toys) {
        const left = restLeft(s.save, t.id, Date.now());
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(t.id)}" alt=""><div class="grow"><div class="title">${t.name}</div><div class="sub">${t.blurb}</div></div>`;
        const on = s.riding === t.id;
        const b = el('button', `btn ${left ? 'plain' : 'green'}`, t.gear ? (on ? 'Hop off' : 'Ride') : left ? sayRest(left) : t.id === 'toy-bell' ? 'Ring' : 'Uncork');
        b.onclick = () => {
          sheet.close();
          s.useToy(t.id);
        };
        row.append(b);
        body.append(row);
      }
      body.append(el('div', 'section', 'Things to do'));
    }
    const grid = el('div', 'grid');
    const emotes: [Emote, string][] = [
      ['wave', 'Wave'],
      ['dance', 'Dance'],
      ['cheer', 'Cheer'],
      ['clap', 'Clap'],
      ['sit', 'Sit down'],
      ['spin', 'Twirl'],
      ['flop', 'Flop'],
      ['honk', 'Honk'],
      ['slap', 'Fish slap'],
      ['stretch', 'Stretch'],
      ['skip', 'Skip a stone'],
      ['lean', 'Lean'],
      ['warm', 'Warm hands'],
    ];
    for (const [id, label] of emotes) {
      const t = el('button', 'tile emote', label);
      const glyph = el('span', 'glyph');
      glyph.append(pixelGlyph(GLYPH[id], 20, '#1b5a66'));
      t.prepend(glyph);
      t.onclick = () => {
        s.emote(id);
        sheet.close();
      };
      grid.append(t);
    }
    const uke = el('button', 'tile', `<img src="${icon('ukulele')}" alt="">Ukulele`);
    uke.onclick = () => {
      sheet.close();
      s.playUke();
    };
    grid.append(uke);
    if (s.save.detector) {
      const det = el('button', `tile${s.detecting ? ' on' : ''}`, `<img src="${icon('detector')}" alt="">${s.detecting ? 'Put detector away' : 'Metal detector'}`);
      det.onclick = () => {
        sheet.close();
        s.toggleDetector();
      };
      grid.append(det);
    }
    body.append(grid);
    body.append(el('p', '', chalk() ? 'You are by the chalk square: tap Draw by the big button to draw on it.' : 'There is a patch of the village square for chalk drawings. Walk onto it to draw.'));
  });
  return sheet;
}
