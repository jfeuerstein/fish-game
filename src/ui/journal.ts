// The journal: every fish there is, silhouettes until caught, with where and when to look.
import { RARITIES, RARITY_LABEL } from '../game/crates';
import { BY_ID, JOURNAL_SPECIES as SPECIES, TIER_COLOR, TIER_LABEL, VARIANTS, VARIANT_LABEL, WATCH_LABEL, ZONE_LABEL, sayLength, stars } from '../fishing/fish';
import { candidates } from '../fishing/roll';
import { baitById, lureById, rodById } from '../game/economy';
import type { Zone } from '../world/island';
import { levelFor, xpToNext } from '../game/economy';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function journalSheet(app: HTMLElement, s: Session): Sheet {
  let detail: string | null = null;
  const sheet: Sheet = new Sheet(app, 'Journal', (body, tab) => {
    const save = s.save;
    const real = SPECIES.filter((x) => x.tier !== 'junk');
    void BY_ID;
    if (tab === 'Fish' || tab === 'Odds & ends') {
      const list = tab === 'Fish' ? real : SPECIES.filter((x) => x.tier === 'junk');
      const got = list.filter((x) => save.journal[x.id]).length;
      body.append(el('p', '', `${got} of ${list.length} found.${tab === 'Fish' ? ' Tap one for where to look.' : ''}`));
      if (detail && BY_ID[detail]) {
        const sp = BY_ID[detail];
        const j = save.journal[sp.id];
        const card = el('div', 'row');
        card.innerHTML = `<img src="${icon(`fish-${sp.id}`)}" alt="" class="${j ? '' : 'locked'}" style="${j ? '' : 'filter:brightness(0) opacity(.2)'};width:84px;height:84px"><div class="grow"><div class="title">${j ? sp.name : '???'} <small style="color:${TIER_COLOR[sp.tier]}">${TIER_LABEL[sp.tier]}</small></div><div class="sub">${sp.zones.map((z) => ZONE_LABEL[z]).join(', ')} · ${WATCH_LABEL[sp.watch]}${sp.rain ? ' · only in the rain' : ''}</div>${j ? `<div class="sub">Caught ${j.count} · best ${sayLength(j.best)}</div><div class="sub">${sp.tier === 'junk' ? '' : VARIANTS.filter((v) => v !== 'normal').map((v) => `${j.variants.includes(v) ? '✓' : '·'} ${stars(v)} ${VARIANT_LABEL[v]}`).join('<br>')}</div><div class="sub"><i>${sp.note}</i></div>` : '<div class="sub">Not caught yet.</div>'}</div>`;
        body.append(card);
      }
      const grid = el('div', 'grid');
      for (const sp of list) {
        const j = save.journal[sp.id];
        const t = el('button', `tile${j ? '' : ' locked'}${detail === sp.id ? ' on' : ''}`);
        const dots = sp.tier === 'junk' ? '' : `<span class="qdots">${VARIANTS.slice(1).map((v) => `<i class="${j?.variants.includes(v) ? 'on' : ''}">★</i>`).join('')}</span>`;
        t.innerHTML = `<img src="${icon(`fish-${sp.id}`)}" alt="">${j ? sp.name : '???'}<span class="tag" style="background:${TIER_COLOR[sp.tier]}">${TIER_LABEL[sp.tier][0]}</span>${j ? `<small>${sayLength(j.best)}</small>` : ''}${dots}`;
        t.onclick = () => {
          detail = detail === sp.id ? null : sp.id;
          sheet.refresh();
          sheet.body.scrollTop = 0;
        };
        grid.append(t);
      }
      body.append(grid);
    } else if (tab === 'Biting now') {
      body.append(el('p', '', `What bites right now${s.raining ? ', in the rain' : ''}, with your bait and lure. Unknown ones show as shadows.`));
      for (const zone of ['ocean', 'deep', 'pond', 'creek'] as Zone[]) {
        const list = candidates({ zone, hour: s.hour, raining: s.raining, rod: rodById(save.rod), bait: baitById(save.bait), lure: lureById(save.lure) }).filter((c) => c.species.tier !== 'junk');
        const total = list.reduce((a, b) => a + b.weight, 0);
        body.append(el('div', 'section', ZONE_LABEL[zone]));
        const grid = el('div', 'grid');
        for (const c of list.sort((a, b) => b.weight - a.weight)) {
          const j = save.journal[c.species.id];
          const t = el('div', `tile${j ? '' : ' locked'}`);
          t.innerHTML = `<img src="${icon(`fish-${c.species.id}`)}" alt="">${j ? c.species.name : '???'}<small>${Math.max(0.1, Math.round((c.weight / total) * 1000) / 10)}%</small>`;
          grid.append(t);
        }
        body.append(grid);
      }
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
        ['Stars found', `${real.reduce((a, x) => a + (save.journal[x.id]?.variants.filter((v) => v !== 'normal').length ?? 0), 0)} / ${real.length * 4}`],
        ['Sea glass', `${save.glass.length} / 12`],
        ['Things dug up', String(save.dug.length)],
        ['Goes at the Lucky Gull', `${save.arcade.played}${save.arcade.rarest ? ` (rarest prize: ${RARITY_LABEL[RARITIES[save.arcade.rarest - 1]]})` : ''}`],
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
  }, ['Fish', 'Biting now', 'Odds & ends', 'Stats']);
  return sheet;
}
