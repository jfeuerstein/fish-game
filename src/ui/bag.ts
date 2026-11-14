// The bag: the cooler of fish, and the things to set down.
import { BY_ID, valueOf, sayLength } from '../fishing/fish';
import { COOLERS, FURNITURE } from '../game/economy';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function bagSheet(app: HTMLElement, s: Session): Sheet {
  const sheet: Sheet = new Sheet(app, 'Bag', (body, tab) => {
    const save = s.save;
    if (tab === 'Cooler') {
      body.append(el('p', '', `${save.bag.length} of ${COOLERS[save.cooler].capacity} fish. Sell them at Gus's shop, or let one go.`));
      save.bag.forEach((c, i) => {
        const sp = BY_ID[c.species];
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(`fish-${c.species}`)}" alt=""><div class="grow"><div class="title">${sp.name}${c.variant !== 'normal' ? ` <b class="vb ${c.variant}">${c.variant}</b>` : ''}</div><div class="sub">${sayLength(c.size)} · worth ${valueOf(c)}</div></div>`;
        const b = el('button', 'btn plain', 'Let go');
        b.onclick = () => {
          save.bag.splice(i, 1);
          s.audio.play('plop', { volume: 0.6 });
          s.hud.toast(`Bye, ${sp.name.toLowerCase()}!`);
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      });
    } else {
      const have = FURNITURE.filter((f) => (save.furniture[f.id] ?? 0) > 0);
      body.append(el('p', '', have.length ? 'Set something down in front of you. Walk up to it later to pick it back up.' : 'Nothing here yet. Gus sells things to set down, and chests hold some too.'));
      for (const f of have) {
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(f.id)}" alt=""><div class="grow"><div class="title">${f.name}</div><div class="sub">×${save.furniture[f.id]}</div></div>`;
        const b = el('button', 'btn green', 'Set down');
        b.onclick = () => {
          s.setDown(f.id);
          sheet.close();
        };
        row.append(b);
        body.append(row);
      }
    }
  }, ['Cooler', 'Things']);
  return sheet;
}
