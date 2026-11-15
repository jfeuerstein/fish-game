import { describe, expect, it } from 'vitest';
import { GAMES, PRIZES } from './crates';
import { newSave, parseSave } from './save';
import { TOYS, comboSays, restLeft, sayRest, toyById, useToy } from './toys';

describe('toys', () => {
  it('are all prizes of the rarest kind, never sold, and every game can give one', () => {
    for (const t of TOYS) {
      const p = PRIZES.find((q) => q.id === t.id);
      expect(p, t.id).toBeTruthy();
      expect(p!.rarity).toBe('legendary');
      expect(p!.kind).toBe('toy');
      // Ridden or used: one or the other.
      expect(!!t.gear !== !!t.rest, t.id).toBe(true);
    }
    for (const game of GAMES) expect(PRIZES.some((p) => p.kind === 'toy' && (!p.only || p.only === game)), game).toBe(true);
  });

  it('rest after they are used, and are ready again later', () => {
    const save = newSave();
    expect(useToy(save, 'toy-bell', 1_000_000)).toBe(false);
    save.toys.push('toy-bell');
    expect(restLeft(save, 'toy-bell', 1_000_000)).toBe(0);
    expect(useToy(save, 'toy-bell', 1_000_000)).toBe(true);
    expect(useToy(save, 'toy-bell', 1_060_000)).toBe(false);
    const rest = toyById('toy-bell')!.rest!;
    expect(restLeft(save, 'toy-bell', 1_060_000)).toBe(rest - 60);
    expect(useToy(save, 'toy-bell', 1_000_000 + rest * 1000)).toBe(true);
    // A clock that went backwards does not lock it away.
    expect(restLeft(save, 'toy-bell', 5)).toBe(0);
    expect(sayRest(600)).toBe('in 10 min');
    expect(sayRest(40)).toBe('in 40 s');
  });

  it('name a run of tricks', () => {
    expect(comboSays(['kickflip'])).toBe('Kickflip');
    expect(comboSays(['kickflip', 'spin'])).toBe('Kickflip + 360');
    expect(comboSays(['kickflip', 'kickflip', 'spin'])).toBe('Double Kickflip + 360');
    expect(comboSays([])).toBe('');
  });

  it('are kept in the save', () => {
    const s = parseSave(JSON.stringify({ toys: ['toy-pogo', 'nonsense', 7], toyAt: { 'toy-bell': 55, x: 'no' }, tricks: 4 }));
    expect(s.toys).toEqual(['toy-pogo']);
    expect(s.toyAt).toEqual({ 'toy-bell': 55 });
    expect(s.tricks).toBe(4);
    expect(parseSave('{}').toys).toEqual([]);
  });
});
