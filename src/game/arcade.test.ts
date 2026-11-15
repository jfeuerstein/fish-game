import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { FLIGHT_BANDS, RARITIES, bandAt, peakFor, reelStrips, scratchCard } from './arcade';
import { GAMES, ODDS, PRIZES, PULL_COST, STRIP_LENGTH, WIN_AT, makeStrip, pickPrize, prizesOf, rollPrize } from './crates';
import { CHARACTERS, CHARMS, EXTRAS, FURNITURE, HATS, PAINTS } from './economy';

describe('the one roll', () => {
  it('costs a pearl and draws rarities at the stated odds', () => {
    expect(PULL_COST).toBe(1);
    expect(Object.values(ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    const r = rng(5);
    const n = 30000;
    const got = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const p = rollPrize(r);
      got.set(p.rarity, (got.get(p.rarity) ?? 0) + 1);
    }
    for (const k of RARITIES) expect((got.get(k) ?? 0) / n, k).toBeCloseTo(ODDS[k], 1);
  });
  it('favours what is not owned yet', () => {
    const r = rng(3);
    const commons = prizesOf().filter((p) => p.rarity === 'common');
    const owned = new Set(commons.slice(1).map((p) => p.id));
    let fresh = 0;
    for (let i = 0; i < 3000; i++) if (!owned.has(pickPrize('common', (p) => owned.has(p.id), r).id)) fresh++;
    expect(fresh / 3000).toBeCloseTo(3 / (3 + commons.length - 1), 1);
  });
  it('offers only real things that cannot be bought for coins, of every rarity', () => {
    const ids = new Set([...HATS, ...FURNITURE, ...CHARACTERS, ...EXTRAS, ...PAINTS, ...CHARMS].map((x) => x.id));
    const sold = new Set([...HATS, ...FURNITURE, ...EXTRAS].filter((x) => x.price > 0).map((x) => x.id));
    for (const p of PRIZES) {
      expect(ids.has(p.id), p.id).toBe(true);
      expect(sold.has(p.id), p.id).toBe(false);
    }
    for (const k of RARITIES) expect(PRIZES.some((p) => p.rarity === k), k).toBe(true);
  });
});

describe('each game', () => {
  it('has prizes of every rarity that come from it alone', () => {
    for (const game of GAMES) {
      const own = PRIZES.filter((p) => p.only === game);
      expect(own.length, game).toBeGreaterThanOrEqual(5);
      for (const k of RARITIES) expect(own.some((p) => p.rarity === k), `${game} ${k}`).toBe(true);
    }
  });

  it("never gives another game's prize, and does give its own", () => {
    for (const game of GAMES) {
      const r = rng(11);
      const seen = new Set<string>();
      for (let i = 0; i < 6000; i++) {
        const p = rollPrize(r, undefined, game);
        expect(!p.only || p.only === game, `${game} gave ${p.id}`).toBe(true);
        seen.add(p.id);
      }
      for (const p of PRIZES.filter((q) => q.only === game && q.rarity !== 'legendary')) expect(seen.has(p.id), p.id).toBe(true);
    }
  });

  it('lists every prize once, and most of what there is to wear is won, not sold', () => {
    expect(new Set(PRIZES.map((p) => p.id)).size).toBe(PRIZES.length);
    const sold = [...HATS, ...EXTRAS].filter((x) => x.price > 0).length;
    const won = PRIZES.filter((p) => p.kind === 'hat' || p.kind === 'extra').length;
    expect(sold).toBeLessThanOrEqual(6);
    expect(won).toBeGreaterThan(sold * 3);
    // Every paint and charm can be won somewhere.
    for (const x of [...PAINTS, ...CHARMS]) expect(PRIZES.some((p) => p.id === x.id), x.id).toBe(true);
  });
});

describe('the shows', () => {
  const win = PRIZES.find((p) => p.rarity === 'epic')!;
  it('stops the strip on the prize', () => {
    const strip = makeStrip(win, 42);
    expect(strip.length).toBe(STRIP_LENGTH);
    expect(strip[WIN_AT]).toBe(win);
  });
  it('lands all three reels on the prize, the last one longer for a rare one', () => {
    const reels = reelStrips(win, 7);
    for (const reel of reels) expect(reel.at(-1)).toBe(win);
    expect(reels[2].length).toBeGreaterThan(reels[1].length + 7);
  });
  it('leaps as high as the prize is rare', () => {
    const r = rng(1);
    for (const k of RARITIES) for (let i = 0; i < 50; i++) expect(bandAt(peakFor(k, r)), k).toBe(k);
    expect(FLIGHT_BANDS.map((b) => b.rarity)).toEqual(RARITIES);
  });
  it('prints the prize three times on a scratch card, and nothing else three times', () => {
    for (let seed = 1; seed < 200; seed++) {
      const prize = rollPrize(rng(seed));
      const cells = scratchCard(prize, seed);
      expect(cells).toHaveLength(9);
      const counts = new Map<string, number>();
      for (const c of cells) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
      for (const [id, n] of counts) expect(n, id).toBe(id === prize.id ? 3 : Math.min(n, 2));
    }
  });
});
