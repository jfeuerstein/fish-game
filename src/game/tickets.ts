// Scratch tickets at the Lucky Gull: nine squares under a silver coat; three of a kind wins a
// cosmetic (or pearls back). Bought with pearls; a dearer ticket's prizes are rarer. Pure.
import { rng } from '../core/rng';
import { RARITIES } from './arcade';
import type { Rarity } from './crates';

export type Symbol = 'shell' | 'fish' | 'crab' | 'star' | 'pearl' | 'crown';

export interface TicketKind {
  id: string;
  name: string;
  /** In pearls. */
  price: number;
  /** How many rarities up from the symbol's own its prize is. */
  boost: number;
  blurb: string;
}
export const TICKETS: readonly TicketKind[] = [
  { id: 'penny', name: 'Tide Pool', price: 1, boost: 0, blurb: 'A little scratch. Mostly everyday things.' },
  { id: 'lucky', name: 'Lucky Catch', price: 2, boost: 1, blurb: 'Every prize one rarity up.' },
  { id: 'splash', name: 'Big Splash', price: 4, boost: 2, blurb: 'For the bold. The crown is a legend.' },
];

/** Chance of each three-of-a-kind, and the rarity it stands for on the cheapest ticket (pearls give pearls back). */
export const PRIZES: Record<Symbol, { chance: number; rarity: Rarity | null }> = {
  shell: { chance: 0.24, rarity: 'common' },
  fish: { chance: 0.15, rarity: 'uncommon' },
  crab: { chance: 0.08, rarity: 'rare' },
  star: { chance: 0.03, rarity: 'epic' },
  pearl: { chance: 0.07, rarity: null },
  crown: { chance: 0.008, rarity: 'legendary' },
};
const ORDER: Symbol[] = ['crown', 'pearl', 'star', 'crab', 'fish', 'shell'];

export interface Ticket {
  kind: TicketKind;
  cells: Symbol[];
  win: Symbol | null;
  /** The rarity of the cosmetic won, if any. */
  prize: Rarity | null;
  /** Pearls back (three pearls: the price and one more). */
  pearls: number;
}

/** What a ticket wins for its symbol. */
export function payout(kind: TicketKind, s: Symbol): { prize: Rarity | null; pearls: number } {
  const r = PRIZES[s].rarity;
  if (!r) return { prize: null, pearls: kind.price + 1 };
  return { prize: RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(r) + kind.boost)], pearls: 0 };
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
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const pay = win ? payout(kind, win) : { prize: null, pearls: 0 };
  return { kind, cells, win, ...pay };
}
