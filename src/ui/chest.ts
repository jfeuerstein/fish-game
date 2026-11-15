// The camp chest: fish kept out of the bag, for a favour or a bounty another day. And the
// camp's sign: what the camp is called.
import { BY_ID, valueOf, sayLength, type Catch } from '../fishing/fish';
import { CHEST_HOLDS, NAME_FITS, campNamed, store, takeOut } from '../game/camp';
import { COOLERS } from '../game/economy';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

const fishRow = (c: Catch): HTMLElement => {
  const row = el('div', 'row');
  row.innerHTML = `<img src="${icon(`fish-${c.species}`)}" alt=""><div class="grow"><div class="title">${BY_ID[c.species].name}${c.variant !== 'normal' ? ` <b class="vb ${c.variant}">${c.variant}</b>` : ''}</div><div class="sub">${sayLength(c.size)} · worth ${valueOf(c)}</div></div>`;
  return row;
};

export function chestSheet(app: HTMLElement, s: Session): Sheet {
  const sheet: Sheet = new Sheet(app, 'Camp Chest', (body, tab) => {
    const save = s.save;
    if (tab === 'In the chest') {
      body.append(el('p', '', `${save.stored.length} of ${CHEST_HOLDS} fish, packed in ice. They keep as long as you like.`));
      save.stored.forEach((c, i) => {
        const row = fishRow(c);
        const b = el('button', 'btn green', 'Take');
        b.onclick = () => {
          if (!takeOut(save, i)) s.hud.toast(`Your bag is full (${COOLERS[save.cooler].capacity} fish).`);
          else s.audio.play('click');
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      });
    } else {
      body.append(el('p', '', save.bag.length ? 'Put a fish by for later.' : 'Nothing in your bag to put by.'));
      save.bag.forEach((c, i) => {
        const row = fishRow(c);
        const b = el('button', 'btn plain', 'Store');
        b.onclick = () => {
          if (!store(save, i)) s.hud.toast('The chest is full.');
          else s.audio.play('click');
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      });
    }
  }, ['In the chest', 'From your bag']);
  return sheet;
}

export function signSheet(app: HTMLElement, s: Session, onNamed: (name: string) => void): Sheet {
  const sheet: Sheet = new Sheet(app, 'Camp Sign', (body) => {
    body.append(el('p', '', 'What is this camp called? The sign will say so, and so will your map.'));
    const input = el('input', 'name-input');
    input.type = 'text';
    input.maxLength = NAME_FITS;
    input.value = s.save.campName;
    input.placeholder = 'My Camp';
    input.autocomplete = 'off';
    const ok = el('button', 'big-btn', 'Paint it on');
    ok.onclick = () => {
      s.save.campName = campNamed(input.value);
      onNamed(s.save.campName);
      s.audio.play('chalk', { volume: 0.4 });
      s.changed();
      sheet.close();
    };
    body.append(input, ok);
  });
  return sheet;
}
