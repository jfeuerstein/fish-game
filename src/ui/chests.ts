// The Lucky Gull's prizes: the one roll every game makes (`pull`), the card that shows what was
// won, and the Gull Wheel's show, a strip of prizes slowing past a marker.
import { ODDS, PRIZES, PULL_COST, type Prize, RARITIES, RARITY_COLOR, RARITY_LABEL, type Rarity, REFUND, WIN_AT, makeStrip, pickPrize, rollPrize } from '../game/crates';
import type { Session } from '../game/session';
import type { Fanfare } from './fanfare';
import { el, icon } from './hud';

import { GRAND } from '../game/arcade';

/** Whether the player already has a prize (furniture is never 'had': another is always welcome). */
export function owns(s: Session, p: Prize): boolean {
  const save = s.save;
  if (p.kind === 'furniture') return false;
  return (p.kind === 'hat' ? save.hats : p.kind === 'extra' ? save.extras : save.characters).includes(p.id);
}

/** Give a prize: whether it was already owned, and the pearls given back if so. */
export function award(s: Session, p: Prize): { owned: boolean; refund: number } {
  const save = s.save;
  if (p.kind === 'furniture') {
    save.furniture[p.id] = (save.furniture[p.id] ?? 0) + 1;
    return { owned: false, refund: 0 };
  }
  const list = p.kind === 'hat' ? save.hats : p.kind === 'extra' ? save.extras : save.characters;
  if (list.includes(p.id)) {
    save.tokens += REFUND[p.rarity];
    return { owned: true, refund: REFUND[p.rarity] };
  }
  list.push(p.id);
  return { owned: false, refund: 0 };
}

/** Choose a prize of a rarity (favouring what is not had yet) and give it. */
export function winPrize(s: Session, rarity: Rarity, rand: () => number = Math.random): { prize: Prize; owned: boolean; refund: number } {
  const prize = pickPrize(rarity, (p) => owns(s, p), rand);
  return { prize, ...award(s, prize) };
}

/** What a prize is called once had, and what to do with it. */
function said(prize: Prize, owned: boolean, refund: number): string {
  if (owned) return refund ? `Already yours, so ${refund} pearl${refund > 1 ? 's' : ''} back.` : 'Already yours. The gull snickers.';
  if (prize.kind === 'character') return 'A new friend to play as! Change in More › Wardrobe.';
  if (prize.kind === 'hat') return 'A new hat!';
  if (prize.kind === 'extra') return 'Something new to wear!';
  return 'In your bag, ready to set down.';
}

/** The inside of a prize card, with buttons to wear it or play as it; `close` puts it away. */
export function prizeCard(card: HTMLElement, s: Session, prize: Prize, owned: boolean, refund: number, close: () => void, more: HTMLElement[] = []): void {
  card.style.setProperty('--rar', RARITY_COLOR[prize.rarity]);
  card.innerHTML = `<div class="rr-glow"></div><img src="${icon(prize.id)}" alt=""><div class="rr-rar">${RARITY_LABEL[prize.rarity]}</div><div class="rr-name">${prize.name}</div><div class="rr-sub">${said(prize, owned, refund)}</div>`;
  const actions = el('div', 'rr-actions');
  if (!owned && (prize.kind === 'hat' || prize.kind === 'extra' || prize.kind === 'character')) {
    const use = el('button', 'btn green', prize.kind === 'character' ? 'Play as' : 'Wear it');
    use.onclick = () => {
      if (prize.kind === 'hat') s.wear(prize.id);
      else if (prize.kind === 'extra') s.wearExtra(prize.id);
      else s.become(prize.id);
      close();
    };
    actions.append(use);
  }
  actions.append(...more);
  const ok = el('button', 'btn plain', 'Done');
  ok.onclick = close;
  actions.append(ok);
  card.append(actions);
}

/** A prize won at one of the games: the card comes up over everything, with the fanfare. */
export function showPrize(app: HTMLElement, s: Session, fanfare: Fanfare, won: { prize: Prize; owned: boolean; refund: number }, done: () => void = () => undefined): void {
  const { prize, owned, refund } = won;
  const overlay = el('div', 'prize-overlay');
  overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
  const card = el('div', 'roulette-result');
  overlay.append(card);
  app.append(overlay);
  const close = (): void => {
    overlay.remove();
    done();
  };
  prizeCard(card, s, prize, owned, refund, close);
  // Shown at once (a reflow first, so it still springs in).
  void card.offsetWidth;
  card.classList.add('show');
  s.audio.play(prize.rarity === 'legendary' || prize.rarity === 'epic' ? 'rare' : 'catch', { volume: 0.7 });
  fanfare.win(owned ? 'small' : GRAND[prize.rarity], `${RARITY_LABEL[prize.rarity].toUpperCase()}!`, prize.name, RARITY_COLOR[prize.rarity]);
}

const TILE = 104;
const pearlGlyph = '<b class="pearl"></b>';

/** Pay a pearl and roll: the prize is given at once (nothing is lost if the game closes mid-show). Null if there are not enough pearls. */
export function pull(s: Session): { prize: Prize; owned: boolean; refund: number } | null {
  if (s.save.tokens < PULL_COST) {
    s.hud.toast('Not enough pearls. Golden, prismatic and legendary fish bring them.');
    return null;
  }
  s.save.tokens -= PULL_COST;
  s.save.arcade.played++;
  s.audio.play('chip', { volume: 0.8 });
  const prize = rollPrize(Math.random, (p) => owns(s, p));
  s.save.arcade.rarest = Math.max(s.save.arcade.rarest, RARITIES.indexOf(prize.rarity) + 1);
  const got = { prize, ...award(s, prize) };
  s.hud.hold = true;
  s.changed();
  return got;
}

/** The odds, as a row of rarities. */
export function oddsRow(): HTMLElement {
  const row = el('div', 'odds-row');
  row.innerHTML = (Object.entries(ODDS) as [Rarity, number][]).map(([r, p]) => `<span style="--rar:${RARITY_COLOR[r]}"><b>${Math.round(p * 100)}%</b>${RARITY_LABEL[r]}</span>`).join('');
  return row;
}

/** Everything that can turn up, owned or not. */
export function prizeGrid(body: HTMLElement, s: Session): void {
  body.append(el('div', 'section', 'What can turn up'));
  const grid = el('div', 'grid');
  for (const p of PRIZES) {
    const t = el('div', 'tile');
    t.style.boxShadow = `inset 0 -3px 0 ${RARITY_COLOR[p.rarity]}`;
    t.innerHTML = `<img src="${icon(p.id)}" alt="">${p.name}<small style="color:${RARITY_COLOR[p.rarity]}">${RARITY_LABEL[p.rarity]}${owns(s, p) ? ' · owned' : ''}</small>`;
    grid.append(t);
  }
  body.append(grid);
}

/**
 * The Gull Wheel's show: a strip of prizes slides past the marker and slows onto the prize
 * already won. `again` (if given) plays another from the card; `after` runs when it is put away.
 */
export function stripReveal(app: HTMLElement, s: Session, fanfare: Fanfare, got: { prize: Prize; owned: boolean; refund: number }, again: (() => void) | null, after: () => void): void {
  const { prize, owned, refund } = got;
  const strip = makeStrip(prize, (Date.now() % 1e9) + 1);
  s.audio.play('open');
  const overlay = el('div', 'roulette');
  const lid = el('div', 'roulette-title', `<span class="eyebrow">The Gull Wheel</span>Spinning…`);
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
  const dur = quick ? 900 : 6800;
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
      s.audio.tick(t);
    }
    if (t < 1) requestAnimationFrame(step);
    else reveal();
  };
  requestAnimationFrame(step);

  function reveal(): void {
    s.hud.hold = false;
    track.children[WIN_AT]?.classList.add('win');
    lid.innerHTML = `<span class="eyebrow">The Gull Wheel</span>${RARITY_LABEL[prize.rarity]}!`;
    overlay.classList.add(`won-${prize.rarity}`);
    overlay.style.setProperty('--rar', RARITY_COLOR[prize.rarity]);
    fanfare.win(owned ? 'small' : GRAND[prize.rarity], `${RARITY_LABEL[prize.rarity].toUpperCase()}!`, prize.name, RARITY_COLOR[prize.rarity]);
    const more: HTMLElement[] = [];
    if (again) {
      const b = el('button', 'btn coral', `Again · ${pearlGlyph}${PULL_COST}`);
      b.disabled = s.save.tokens < PULL_COST;
      b.onclick = () => {
        close();
        again();
      };
      more.push(b);
    }
    prizeCard(result, s, prize, owned, refund, close, more);
    result.classList.add('show');
  }

  function close(): void {
    overlay.remove();
    after();
  }
}
