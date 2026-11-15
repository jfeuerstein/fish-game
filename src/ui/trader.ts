// The trader's stall, as a sheet: what is on it today, each thing once a visit.
import type { Session } from '../game/session';
import { TRADER_NAME, buyWare, sold, stock } from '../game/trader';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function traderSheet(app: HTMLElement, s: Session): Sheet {
  const sheet: Sheet = new Sheet(app, `${TRADER_NAME}'s Stall`, (body) => {
    const save = s.save;
    body.append(el('p', '', '"Off the boat this morning, gone by dark. What you see is what I brought: one of each."'));
    for (const w of stock(s.today)) {
      const gone = sold(save, s.today, w);
      const row = el('div', 'row');
      row.innerHTML = `<img src="${icon(w.icon)}" alt=""><div class="grow"><div class="title">${w.name}</div><div class="sub">${w.blurb}</div></div>`;
      const b = el('button', `btn ${gone ? 'plain' : 'green'}`, gone ? 'Sold' : `${w.price}`);
      b.disabled = gone;
      b.onclick = () => {
        if (!buyWare(save, s.today, w)) {
          s.hud.toast(`That is ${w.price} coins. You have ${save.coins}.`);
          return;
        }
        s.audio.play('coin', { volume: 0.5 });
        s.hud.toast(w.gives.furniture ? `${w.name} is in your bag.` : w.gives.pearls ? 'A pearl, warm from a pocket.' : `${w.name}: in the tackle box.`, 'good');
        s.changed();
        sheet.refresh();
      };
      row.append(b);
      body.append(row);
    }
  });
  return sheet;
}
