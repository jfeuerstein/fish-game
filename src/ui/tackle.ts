// The tackle box: change the bait or the lure where you stand, without walking to the shop. It
// opens from the bait chip by the Cast key and lists only what is owned.
import { BAITS, LURES } from '../game/economy';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function tackleSheet(app: HTMLElement, s: Session): Sheet {
  const sheet: Sheet = new Sheet(app, 'Tackle Box', (body, tab) => {
    const save = s.save;
    if (tab === 'Bait') {
      for (const b of BAITS) {
        const have = b.id === 'bait-worm' ? Infinity : (save.baits[b.id] ?? 0);
        if (!have) continue;
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(b.id)}" alt=""><div class="grow"><div class="title">${b.name} <small>(${have === Infinity ? '∞' : have})</small></div><div class="sub">${b.blurb}</div></div>`;
        const use = el('button', `btn ${save.bait === b.id ? 'plain' : 'green'}`, save.bait === b.id ? 'Using' : 'Use');
        use.onclick = () => {
          save.bait = b.id;
          s.changed();
          sheet.close();
        };
        row.append(use);
        body.append(row);
      }
      body.append(el('p', '', 'Gus sells more. Worms after rain and crickets at dusk are free for the finding.'));
    } else {
      for (const l of LURES.filter((x) => save.lures.includes(x.id))) {
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(l.id)}" alt=""><div class="grow"><div class="title">${l.name}</div><div class="sub">${l.blurb}</div></div>`;
        const use = el('button', `btn ${save.lure === l.id ? 'plain' : 'green'}`, save.lure === l.id ? 'On' : 'Use');
        use.onclick = () => {
          save.lure = l.id;
          s.changed();
          sheet.close();
        };
        row.append(use);
        body.append(row);
      }
    }
  }, ['Bait', 'Lure']);
  return sheet;
}
