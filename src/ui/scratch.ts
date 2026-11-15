// A scratch card at the Lucky Gull: nine squares of prizes under a silver coat, scratched off
// with a finger. The prize is rolled when the card is bought (`pull`); it is printed there three
// times, and scratching only finds it.
import type { Audio } from '../audio/audio';
import { scratchCard } from '../game/arcade';
import { type Prize, RARITY_COLOR, RARITY_LABEL } from '../game/crates';
import type { Session } from '../game/session';
import { pull, showPrize } from './chests';
import type { Fanfare } from './fanfare';
import { el, icon } from './hud';

/** Buy a card for a pearl and scratch it; the prize card follows. */
export function buyCard(app: HTMLElement, s: Session, fanfare: Fanfare, after: () => void): void {
  const got = pull(s);
  if (!got) return;
  s.audio.play('shuffle', { volume: 0.5 });
  s.save.tickets.played++;
  scratchTicket(app, s.audio, got.prize, () => {
    s.hud.hold = false;
    showPrize(app, s, fanfare, got, after);
  });
}

export function scratchTicket(parent: HTMLElement, audio: Audio, prize: Prize, done: () => void): void {
  const cells = scratchCard(prize, (Date.now() % 1e9) + 7);
  const overlay = el('div', 'scratch');
  overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
  const card = el('div', 'scratch-card');
  card.style.setProperty('--rar', RARITY_COLOR[prize.rarity]);
  const title = el('div', 'scratch-title', 'Lucky Scratch');
  const hint = el('div', 'scratch-hint', 'Scratch with your finger. Find the three that match.');
  const board = el('div', 'scratch-board');
  for (const c of cells) board.append(el('div', `scratch-cell${c.id === prize.id ? ' win' : ''}`, `<img src="${icon(c.id)}" alt="">`));
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
  // Flat silver with a scatter of pale and dark specks, in big square grains.
  g.fillStyle = '#a4abac';
  g.fillRect(0, 0, coat.width, coat.height);
  const grain = 4 * dpr;
  for (let i = 0; i < 260; i++) {
    g.fillStyle = i % 3 ? '#d2d6d2' : '#737b80';
    g.fillRect(Math.floor((Math.random() * coat.width) / grain) * grain, Math.floor((Math.random() * coat.height) / grain) * grain, grain, grain);
  }
  g.fillStyle = '#18262f';
  g.font = `${24 * dpr}px 'Jersey 15', monospace`;
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
    result.innerHTML = `<b>Three alike!</b> ${/^[aeiou]/i.test(RARITY_LABEL[prize.rarity]) ? 'An' : 'A'} ${RARITY_LABEL[prize.rarity].toLowerCase()}: ${prize.name}.`;
    result.className = 'scratch-result win';
    reveal.hidden = true;
    ok.hidden = false;
    done();
  }
  reveal.onclick = finish;
  ok.onclick = () => overlay.remove();
}
