// The aquarium's tank, as a sheet: what in the bag the tank has no example of (Give), and
// every kind that is in it. Kinds not yet given are not listed: what there is to find is the
// journal's to say, not the tank's.
import { BY_ID } from '../fishing/fish';
import { PEARL_EVERY, TANK_SPECIES, givable, give } from '../game/aquarium';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function aquariumSheet(app: HTMLElement, s: Session, onGiven: () => void): Sheet {
  const sheet: Sheet = new Sheet(app, 'The Aquarium', (body) => {
    const save = s.save;
    const can = givable(save);
    body.append(el('p', '', `${save.aquarium.length} of ${TANK_SPECIES.length} kinds in the tank. The keeper pays half again what Gus would for a kind it has not got, and a pearl for every ${PEARL_EVERY}.`));
    if (!can.length) body.append(el('p', 'sub', save.bag.length ? 'Nothing in your bag is new to the tank.' : 'Bring a fish the tank has not got.'));
    for (const i of can) {
      const c = save.bag[i];
      const row = el('div', 'row');
      row.innerHTML = `<img src="${icon(`fish-${c.species}`)}" alt=""><div class="grow"><div class="title">${BY_ID[c.species].name}</div><div class="sub">New to the tank</div></div>`;
      const btn = el('button', 'btn green', 'Give');
      btn.onclick = () => {
        const got = give(save, save.bag.indexOf(c));
        if (!got) return;
        s.audio.play('plop', { volume: 0.5 });
        s.hud.toast(`The ${BY_ID[got.species].name} goes into the tank. +${got.coins} coins${got.pearls ? ', and a pearl' : ''}.`, got.pearls ? 'gold' : '');
        s.changed();
        onGiven();
        sheet.refresh();
      };
      row.append(btn);
      body.append(row);
    }
    if (save.aquarium.length) {
      body.append(el('h3', '', 'In the tank'));
      const grid = el('div', 'grid');
      for (const id of save.aquarium) {
        const tile = el('div', 'tile');
        tile.innerHTML = `<img src="${icon(`fish-${id}`)}" alt=""><small>${BY_ID[id]?.name ?? id}</small>`;
        grid.append(tile);
      }
      body.append(grid);
    }
  });
  return sheet;
}
