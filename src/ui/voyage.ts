// Where to row to, from the buoy: home, and every far island. One there is a chart to has a
// button; one there is not says only what is rumoured of how its chart is come by.
import { CHART_RUMOUR, FAR_ISLES, ISLE_SAYS, hasChart } from '../game/isles';
import type { Session } from '../game/session';
import { ISLE, ISLE_NAME, type IsleId } from '../world/isle';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function voyageSheet(app: HTMLElement, s: Session, sail: (to: IsleId) => void): Sheet {
  const sheet: Sheet = new Sheet(app, 'Row out', (body) => {
    body.append(el('p', '', 'Past the buoy it is open sea. Where to?'));
    const places: IsleId[] = ['cove', ...FAR_ISLES];
    for (const to of places) {
      if (to === ISLE) continue;
      const known = hasChart(s.save, to);
      const been = to === 'cove' || s.save.hints.includes(to);
      const row = el('div', `row${known ? '' : ' unknown'}`);
      row.innerHTML = `<img src="${icon(to === 'cove' ? 'boat-ticket' : 'icon-map')}" alt="" style="${known ? '' : 'filter:brightness(0) opacity(.25)'}"><div class="grow"><div class="title">${known ? ISLE_NAME[to] : '???'}</div><div class="sub">${known ? (been ? ISLE_SAYS[to] : 'You have a chart to it, and have not been.') : CHART_RUMOUR[to as Exclude<IsleId, 'cove'>]}</div></div>`;
      if (known) {
        const go = el('button', 'btn green', to === 'cove' ? 'Home' : 'Row');
        go.onclick = () => {
          body.innerHTML = '';
          body.append(el('p', '', `Rowing ${to === 'cove' ? 'home to' : 'out to'} ${ISLE_NAME[to]}…`));
          sail(to);
        };
        row.append(go);
      }
      body.append(row);
    }
  });
  return sheet;
}
