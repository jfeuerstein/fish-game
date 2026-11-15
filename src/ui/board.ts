// The notice board: three errands pinned up by the islanders.
import { describe, done } from '../game/quests';
import { claimQuest } from '../game/progress';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function boardSheet(app: HTMLElement, s: Session): Sheet {
  const sheet: Sheet = new Sheet(app, 'Notice Board', (body) => {
    const save = s.save;
    body.append(el('p', '', 'Errands from around the island. Every third one done, the board leaves you a pearl.'));
    for (const q of save.quests) {
      const row = el('div', 'row');
      const pct = Math.min(1, q.progress / q.goal);
      row.innerHTML = `<div class="grow"><div class="sub">From ${q.from}</div><div class="title">${describe(q)}</div><div class="sub"><span class="price" style="display:inline-flex"><img src="${icon('coin')}" alt="" style="width:16px;height:16px">${q.reward.coins}</span> · ${q.reward.xp} xp</div><div class="bar"><i style="width:${pct * 100}%"></i></div></div>`;
      const b = el('button', `btn ${done(q) ? 'coral' : 'plain'}`, done(q) ? 'Collect' : q.kind === 'size' ? '—' : `${q.progress}/${q.goal}`);
      b.disabled = !done(q);
      b.onclick = () => {
        const r = claimQuest(save, q.id);
        if (!r) return;
        s.audio.play('quest');
        s.hud.toast(`Thanks! +${r.coins} coins`, 'good');
        if (r.gift) s.hud.toast('The board left you a pearl!', 'gold');
        if (r.levelUp) {
          s.audio.play('levelup');
          s.hud.toast(`Level ${r.levelUp}!`, 'gold');
        }
        s.changed();
        sheet.refresh();
      };
      row.append(b);
      body.append(row);
    }
  });
  return sheet;
}
