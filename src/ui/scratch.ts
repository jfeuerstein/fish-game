// A scratch ticket: nine squares under a silver coat, scratched off with a finger. Three of a
// kind wins. The prize is decided when the ticket is bought (tickets.ts); scratching only shows it.
import type { Audio } from '../audio/audio';
import type { Session } from '../game/session';
import { RARITY_LABEL } from '../game/crates';
import { showPrize, winPrize } from './chests';
import { type Symbol, type Ticket, type TicketKind, makeTicket } from '../game/tickets';
import type { Fanfare } from './fanfare';
import { el, icon } from './hud';

/** Each symbol as one of the game's own pictures. */
const PICTURE: Record<Symbol, string> = { shell: 'shell', fish: 'fish-mackerel', crab: 'fish-crab', star: 'fish-starfish', pearl: 'token', crown: 'hat-crown' };

/** Buy a ticket with pearls: the prize is decided and given at once (nothing is lost if the game closes), then scratched. */
export function buyTicket(app: HTMLElement, s: Session, fanfare: Fanfare, k: TicketKind, after: () => void): void {
  const save = s.save;
  if (save.tokens < k.price) {
    s.hud.toast('Not enough pearls. Golden, prismatic and legendary fish bring them.');
    return;
  }
  save.tokens -= k.price;
  s.audio.play('shuffle', { volume: 0.5 });
  const t = makeTicket(k, (Date.now() ^ (save.tickets.played * 2654435761)) >>> 0);
  save.tickets.played++;
  s.hud.hold = true;
  save.tokens += t.pearls;
  const won = t.prize ? winPrize(s, t.prize) : null;
  s.changed();
  scratchTicket(app, s.audio, t, () => {
    s.hud.hold = false;
    if (won) showPrize(app, s, fanfare, won, after);
    else {
      if (t.pearls) fanfare.win('small', 'PEARLS!', `+${t.pearls} pearls`);
      after();
    }
  });
}

export function scratchTicket(parent: HTMLElement, audio: Audio, ticket: Ticket, done: () => void): void {
  const overlay = el('div', 'scratch');
  overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
  const card = el('div', `scratch-card ${ticket.kind.id}`);
  const title = el('div', 'scratch-title', ticket.kind.name);
  const hint = el('div', 'scratch-hint', 'Scratch with your finger. Three alike wins!');
  const board = el('div', 'scratch-board');
  for (const s of ticket.cells) board.append(el('div', `scratch-cell${s === ticket.win ? ' win' : ''}`, `<img src="${icon(PICTURE[s])}" alt="">`));
  const coat = document.createElement('canvas');
  coat.className = 'scratch-coat';
  board.append(coat);
  const result = el('div', 'scratch-result');
  const buttons = el('div', 'rr-actions');
  const reveal = el('button', 'btn plain', 'Reveal all');
  const ok = el('button', 'btn green', 'Done');
  ok.hidden = true;
  buttons.append(reveal, ok);
  card.append(title, hint, board, result, buttons);
  overlay.append(card);
  parent.append(overlay);

  // The silver coat, with a little sparkle printed on it.
  const rect = board.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  coat.width = Math.round(rect.width * dpr);
  coat.height = Math.round(rect.height * dpr);
  const g = coat.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, coat.width, coat.height);
  grad.addColorStop(0, '#c9ced6');
  grad.addColorStop(0.5, '#eef1f5');
  grad.addColorStop(1, '#b8bec8');
  g.fillStyle = grad;
  g.fillRect(0, 0, coat.width, coat.height);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * coat.width, Math.random() * coat.height, 3 * dpr, 3 * dpr);
  g.fillStyle = 'rgba(80,90,110,0.35)';
  g.font = `800 ${13 * dpr}px 'Manrope Variable', sans-serif`;
  g.textAlign = 'center';
  g.fillText('SCRATCH ME', coat.width / 2, coat.height / 2);

  let finished = false;
  let last: { x: number; y: number } | null = null;
  let strokes = 0;
  const toCanvas = (e: PointerEvent): { x: number; y: number } => {
    const r = coat.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * coat.width, y: ((e.clientY - r.top) / r.height) * coat.height };
  };
  const scratch = (a: { x: number; y: number }, b: { x: number; y: number }): void => {
    g.globalCompositeOperation = 'destination-out';
    g.lineWidth = 34 * dpr;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    if (++strokes % 6 === 0) {
      audio.play('chalk', { volume: 0.25, rate: 1.3 + Math.random() * 0.3 });
      if (cleared() > 0.62) finish();
    }
  };
  /** How much of the coat is gone, roughly (sampled). */
  const cleared = (): number => {
    const data = g.getImageData(0, 0, coat.width, coat.height).data;
    let clear = 0;
    let n = 0;
    for (let i = 3; i < data.length; i += 4 * 97) {
      n++;
      if (data[i] < 20) clear++;
    }
    return clear / n;
  };
  coat.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      coat.setPointerCapture(e.pointerId);
    } catch {
      /* A pointer the browser does not know (from the tools). */
    }
    last = toCanvas(e);
    scratch(last, { x: last.x + 0.1, y: last.y });
  });
  coat.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = toCanvas(e);
    scratch(last, p);
    last = p;
  });
  const up = (): void => {
    last = null;
  };
  coat.addEventListener('pointerup', up);
  coat.addEventListener('pointercancel', up);

  function finish(): void {
    if (finished) return;
    finished = true;
    coat.style.transition = 'opacity 0.4s';
    coat.style.opacity = '0';
    setTimeout(() => coat.remove(), 450);
    board.classList.add('done');
    if (ticket.win) {
      result.innerHTML = ticket.prize ? `<b>Three alike!</b> ${/^[aeiou]/i.test(RARITY_LABEL[ticket.prize]) ? 'An' : 'A'} ${RARITY_LABEL[ticket.prize].toLowerCase()} prize.` : `<b>Three pearls!</b> ${ticket.pearls} pearls back.`;
      result.className = `scratch-result win ${ticket.win}`;
    } else {
      audio.play('click', { rate: 0.6 });
      result.textContent = 'No luck this time.';
      result.className = 'scratch-result';
    }
    reveal.hidden = true;
    ok.hidden = false;
    done();
  }
  reveal.onclick = finish;
  ok.onclick = () => overlay.remove();
}
