import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { CHESTS, PRIZES, STRIP_LENGTH, WIN_AT, makeStrip, openChest, tokensFor } from './crates';
import { HATS, FURNITURE, CHARACTERS, EXTRAS } from './economy';
import { applyCatch, claimQuest, sell } from './progress';
import { newSave } from './save';

describe('chests', () => {
  it('only holds things that exist', () => {
    const ids = new Set([...HATS.map((h) => h.id), ...FURNITURE.map((f) => f.id), ...CHARACTERS.map((c) => c.id), ...EXTRAS.map((x) => x.id)]);
    for (const p of PRIZES) expect(ids.has(p.id), p.id).toBe(true);
    for (const c of CHESTS) expect(Object.values(c.odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('gives rarities at about the stated odds', () => {
    const r = rng(5);
    const n = 20000;
    let legend = 0;
    for (let i = 0; i < n; i++) if (openChest(CHESTS[0], r).rarity === 'legendary') legend++;
    expect(legend / n).toBeGreaterThan(CHESTS[0].odds.legendary * 0.6);
    expect(legend / n).toBeLessThan(CHESTS[0].odds.legendary * 1.4);
  });
  it('puts the winner where the strip stops', () => {
    const win = PRIZES[3];
    const strip = makeStrip(CHESTS[0], win, 42);
    expect(strip.length).toBe(STRIP_LENGTH);
    expect(strip[WIN_AT]).toBe(win);
  });
  it('pays tokens for special catches', () => {
    expect(tokensFor('normal')).toBe(0);
    expect(tokensFor('shiny')).toBe(0);
    expect(tokensFor('golden')).toBe(1);
    expect(tokensFor('prismatic', 'legendary', true)).toBe(7);
  });
});

describe('progress', () => {
  it('records a catch, pays tokens, and sells', () => {
    const s = newSave();
    const r = applyCatch(s, { species: 'trout', size: 40, variant: 'golden', huge: false, at: 1 }, 'creek', false, false);
    expect(r.first).toBe(true);
    expect(r.tokens).toBe(1);
    expect(s.tokens).toBe(1);
    expect(s.bag.length).toBe(1);
    const coins = s.coins;
    const sold = sell(s);
    expect(sold.coins).toBeGreaterThan(0);
    expect(s.coins).toBe(coins + sold.coins);
    expect(s.bag.length).toBe(0);
  });
  it('hands in a finished errand for a fresh one', () => {
    const s = newSave();
    s.quests[0] = { ...s.quests[0], progress: s.quests[0].goal };
    const id = s.quests[0].id;
    const got = claimQuest(s, id);
    expect(got).not.toBeNull();
    expect(s.quests[0].id).not.toBe(id);
    expect(claimQuest(s, 9999)).toBeNull();
  });
});
