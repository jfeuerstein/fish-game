// Chests: spend tokens, watch a strip of prizes spin past a marker and slow to a stop.
import { rng } from '../core/rng';
import { CHESTS, type Chest, PRIZES, type Prize, RARITY_COLOR, RARITY_LABEL, REFUND, WIN_AT, makeStrip, openChest } from '../game/crates';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

/** Give a prize. Returns tokens refunded if it was already owned. */
export function award(s: Session, p: Prize): number {
  const save = s.save;
  if (p.kind === 'furniture') {
    save.furniture[p.id] = (save.furniture[p.id] ?? 0) + 1;
    return 0;
  }
  const list = p.kind === 'hat' ? save.hats : save.characters;
  if (list.includes(p.id)) {
    save.tokens += REFUND[p.rarity];
    return REFUND[p.rarity];
  }
  list.push(p.id);
  return 0;
}

const TILE = 104;

export function chestSheet(app: HTMLElement, s: Session): Sheet {
  let spinning = false;
  const sheet: Sheet = new Sheet(app, 'Chests', (body) => {
    body.append(el('p', '', `Shiny fish bring 1 token, golden ones 3. You have <b>${s.save.tokens}</b>.`));
    for (const c of CHESTS) {
      const row = el('div', 'row');
      const odds = (Object.entries(c.odds) as [keyof typeof RARITY_COLOR, number][]).map(([r, p]) => `<span style="color:${RARITY_COLOR[r]}">${Math.round(p * 1000) / 10}%</span>`).join(' · ');
      row.innerHTML = `<img src="${icon(`chest-${c.id}`)}" alt=""><div class="grow"><div class="title">${c.name}</div><div class="sub">${c.blurb}</div><div class="sub" style="font-size:11px">${odds}</div></div>`;
      const b = el('button', 'btn coral', `Open · ${c.cost}`);
      b.disabled = s.save.tokens < c.cost || spinning;
      b.onclick = () => spin(c);
      row.append(b);
      body.append(row);
    }
    body.append(el('div', 'section', 'What can turn up'));
    const grid = el('div', 'grid');
    for (const p of PRIZES) {
      const owned = p.kind === 'hat' ? s.save.hats.includes(p.id) : p.kind === 'character' ? s.save.characters.includes(p.id) : false;
      const t = el('div', 'tile');
      t.style.boxShadow = `0 3px 0 ${RARITY_COLOR[p.rarity]}`;
      t.innerHTML = `<img src="${icon(p.id)}" alt="">${p.name}<small style="color:${RARITY_COLOR[p.rarity]}">${RARITY_LABEL[p.rarity]}${owned ? ' · owned' : ''}</small>`;
      grid.append(t);
    }
    body.append(grid);
  });

  function spin(chest: Chest): void {
    if (spinning || s.save.tokens < chest.cost) return;
    spinning = true;
    s.save.tokens -= chest.cost;
    const seed = Date.now() % 1e9;
    const prize = openChest(chest, rng(seed));
    const strip = makeStrip(chest, prize, seed + 1);
    s.changed();
    sheet.refresh();
    s.audio.play('open');

    const overlay = el('div', 'roulette');
    const lid = el('div', 'roulette-title', chest.name);
    const window_ = el('div', 'roulette-window');
    const track = el('div', 'roulette-track');
    for (const p of strip) {
      const t = el('div', 'roulette-tile');
      t.style.setProperty('--rar', RARITY_COLOR[p.rarity]);
      t.innerHTML = `<img src="${icon(p.id)}" alt="">`;
      track.append(t);
    }
    window_.append(track, el('div', 'roulette-marker'));
    const result = el('div', 'roulette-result');
    overlay.append(lid, window_, result);
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    app.append(overlay);

    const width = window_.clientWidth || 360;
    // Stop somewhere inside the winning tile, not always its middle.
    const inside = 14 + Math.random() * (TILE - 36);
    const end = WIN_AT * TILE + inside - width / 2;
    const quick = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = quick ? 900 : 6200;
    const start = performance.now();
    let lastTile = -1;
    const ease = (t: number): number => 1 - Math.pow(1 - t, 4.2);
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const x = ease(t) * end;
      track.style.transform = `translateX(${-x}px)`;
      const tile = Math.floor((x + width / 2) / TILE);
      if (tile !== lastTile) {
        lastTile = tile;
        s.audio.play('click', { volume: 0.35, rate: 1.4 + t * 0.4 });
      }
      if (t < 1) requestAnimationFrame(step);
      else reveal();
    };
    requestAnimationFrame(step);

    function reveal(): void {
      const refund = award(s, prize);
      s.changed();
      const tiles = track.children;
      tiles[WIN_AT]?.classList.add('win');
      s.audio.play(prize.rarity === 'legendary' || prize.rarity === 'epic' ? 'rare' : 'catch');
      result.style.setProperty('--rar', RARITY_COLOR[prize.rarity]);
      result.innerHTML = `<img src="${icon(prize.id)}" alt=""><div class="rr-rar">${RARITY_LABEL[prize.rarity]}</div><div class="rr-name">${prize.name}</div><div class="rr-sub">${refund ? `Already yours, so +${refund} token${refund > 1 ? 's' : ''} back.` : prize.kind === 'character' ? 'A new friend to play as! Change in More › Wardrobe.' : prize.kind === 'hat' ? 'A new hat!' : 'In your bag, ready to set down.'}</div>`;
      const actions = el('div', 'rr-actions');
      if (prize.kind === 'hat' && !refund) {
        const wear = el('button', 'btn green', 'Wear it');
        wear.onclick = () => {
          s.wear(prize.id);
          close();
        };
        actions.append(wear);
      }
      if (prize.kind === 'character' && !refund) {
        const be = el('button', 'btn green', 'Play as');
        be.onclick = () => {
          s.become(prize.id);
          close();
        };
        actions.append(be);
      }
      const again = el('button', 'btn coral', `Again · ${chest.cost}`);
      again.disabled = s.save.tokens < chest.cost;
      again.onclick = () => {
        close();
        spin(chest);
      };
      const ok = el('button', 'btn plain', 'Done');
      ok.onclick = close;
      actions.append(again, ok);
      result.append(actions);
      result.classList.add('show');
    }

    function close(): void {
      overlay.remove();
      spinning = false;
      sheet.refresh();
    }
  }
  return sheet;
}

