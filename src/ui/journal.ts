// The journal: every fish there is, silhouettes until caught, with where and when to look.
import { BY_ID, SPECIES, TIER_COLOR, TIER_LABEL, WATCH_LABEL, ZONE_LABEL, sayLength } from '../fishing/fish';
import { levelFor, xpToNext } from '../game/economy';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function journalSheet(app: HTMLElement, s: Session): Sheet {
  let detail: string | null = null;
  const sheet: Sheet = new Sheet(app, 'Journal', (body, tab) => {
    const save = s.save;
    const real = SPECIES.filter((x) => x.tier !== 'junk');
    if (tab === 'Fish' || tab === 'Odds & ends') {
      const list = tab === 'Fish' ? real : SPECIES.filter((x) => x.tier === 'junk');
      const got = list.filter((x) => save.journal[x.id]).length;
      body.append(el('p', '', `${got} of ${list.length} found.${tab === 'Fish' ? ' Tap one for where to look.' : ''}`));
      if (detail && BY_ID[detail]) {
        const sp = BY_ID[detail];
        const j = save.journal[sp.id];
        const card = el('div', 'row');
        card.innerHTML = `<img src="${icon(`fish-${sp.id}`)}" alt="" class="${j ? '' : 'locked'}" style="${j ? '' : 'filter:brightness(0) opacity(.2)'};width:84px;height:84px"><div class="grow"><div class="title">${j ? sp.name : '???'} <small style="color:${TIER_COLOR[sp.tier]}">${TIER_LABEL[sp.tier]}</small></div><div class="sub">${sp.zones.map((z) => ZONE_LABEL[z]).join(', ')} · ${WATCH_LABEL[sp.watch]}${sp.rain ? ' · only in the rain' : ''}</div>${j ? `<div class="sub">Caught ${j.count} · best ${sayLength(j.best)}${j.variants.includes('shiny') ? ' · ✨shiny' : ''}${j.variants.includes('golden') ? ' · 🌟golden' : ''}</div><div class="sub"><i>${sp.note}</i></div>` : '<div class="sub">Not caught yet.</div>'}</div>`;
        body.append(card);
      }
      const grid = el('div', 'grid');
      for (const sp of list) {
        const j = save.journal[sp.id];
        const t = el('button', `tile${j ? '' : ' locked'}${detail === sp.id ? ' on' : ''}`);
        t.innerHTML = `<img src="${icon(`fish-${sp.id}`)}" alt="">${j ? sp.name : '???'}<span class="tag" style="background:${TIER_COLOR[sp.tier]}">${TIER_LABEL[sp.tier][0]}</span>${j ? `<small>${sayLength(j.best)}</small>` : ''}`;
        t.onclick = () => {
          detail = detail === sp.id ? null : sp.id;
          sheet.refresh();
          sheet.body.scrollTop = 0;
        };
        grid.append(t);
      }
      body.append(grid);
    } else {
      const lv = levelFor(save.xp);
      const shinies = Object.values(save.journal).filter((j) => j.variants.includes('shiny')).length;
      const golds = Object.values(save.journal).filter((j) => j.variants.includes('golden')).length;
      const rows: [string, string][] = [
        ['Level', `${lv.level} (${lv.into} / ${xpToNext(lv.level)} xp)`],
        ['Fish caught', String(save.stats.caught)],
        ['Kinds found', `${real.filter((x) => save.journal[x.id]).length} / ${real.length}`],
        ['Shiny kinds', String(shinies)],
        ['Golden kinds', String(golds)],
        ['Coins earned', save.stats.earned.toLocaleString()],
        ['Errands done', String(save.questsDone)],
        ['Lines snapped', String(save.stats.snapped)],
      ];
      for (const [k, v] of rows) {
        const r = el('div', 'row');
        r.innerHTML = `<div class="grow"><div class="sub">${k}</div><div class="title">${v}</div></div>`;
        body.append(r);
      }
    }
  }, ['Fish', 'Odds & ends', 'Stats']);
  return sheet;
}
