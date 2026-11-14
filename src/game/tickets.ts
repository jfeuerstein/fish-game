// Scratch tickets from the shop: nine squares under a silver coat; three of a kind wins. Pure.
import { rng } from '../core/rng';

export type Symbol = 'shell' | 'fish' | 'crab' | 'star' | 'pearl' | 'crown';

export interface TicketKind {
  id: string;
  name: string;
  price: number;
  blurb: string;
}
export const TICKETS: readonly TicketKind[] = [
  { id: 'penny', name: 'Tide Pool', price: 25, blurb: 'A little scratch for loose change.' },
  { id: 'lucky', name: 'Lucky Catch', price: 100, blurb: 'Bigger prizes, same old luck.' },
  { id: 'splash', name: 'Big Splash', price: 400, blurb: 'For the bold. The crown pays a fortune.' },
];

/** Chance of each three-of-a-kind, and what it pays on the cheapest ticket (coins, or tokens for pearls). */
export const PRIZES: Record<Symbol, { chance: number; coins: number; tokens: number; glyph: string }> = {
  shell: { chance: 0.24, coins: 15, tokens: 0, glyph: '🐚' },
  fish: { chance: 0.13, coins: 35, tokens: 0, glyph: '🐟' },
  crab: { chance: 0.06, coins: 70, tokens: 0, glyph: '🦀' },
  star: { chance: 0.018, coins: 175, tokens: 0, glyph: '⭐' },
  pearl: { chance: 0.03, coins: 0, tokens: 1, glyph: '🫧' },
  crown: { chance: 0.0006, coins: 2500, tokens: 3, glyph: '👑' },
};
const ORDER: Symbol[] = ['crown', 'pearl', 'star', 'crab', 'fish', 'shell'];

export interface Ticket {
  kind: TicketKind;
  cells: Symbol[];
  win: Symbol | null;
  coins: number;
  tokens: number;
}

/** What a ticket pays for its symbol: coins scale with the price, tokens a little less. */
export function payout(kind: TicketKind, s: Symbol): { coins: number; tokens: number } {
  const m = kind.price / 25;
  const p = PRIZES[s];
  return { coins: p.coins * m, tokens: p.tokens ? Math.max(1, Math.round(p.tokens * Math.sqrt(m))) : 0 };
}

/** Make a ticket: decide the prize, then fill the squares so exactly that symbol shows three times. */
export function makeTicket(kind: TicketKind, seed: number): Ticket {
  const r = rng(seed);
  let win: Symbol | null = null;
  let roll = r();
  for (const s of ORDER) {
    if (roll < PRIZES[s].chance) {
      win = s;
      break;
    }
    roll -= PRIZES[s].chance;
  }
  const cells: Symbol[] = [];
  if (win) cells.push(win, win, win);
  // The rest: no other symbol three times (and the winner no more than three).
  const count = new Map<Symbol, number>(win ? [[win, 3]] : []);
  while (cells.length < 9) {
    const s = ORDER[Math.floor(r() * ORDER.length)];
    const n = count.get(s) ?? 0;
    if (n >= 2 && s !== win) continue;
    if (s === win) continue;
    count.set(s, n + 1);
    cells.push(s);
  }
  // Shuffle.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const pay = win ? payout(kind, win) : { coins: 0, tokens: 0 };
  return { kind, cells, win, ...pay };
}
