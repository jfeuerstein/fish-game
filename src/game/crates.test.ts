import { describe, expect, it } from 'vitest';
import { tokensFor } from './crates';
import { applyCatch, claimQuest, sell } from './progress';
import { newSave } from './save';

describe('pearls', () => {
  it('come only from special catches', () => {
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
