import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { REEL_WEIGHTS, type Reel, SNATCH_AT_ONCE, WHEEL, WHEEL_PAYS, flightAt, grandness, reelStrip, scoreSlots, snatchPoint, spinWheel, timeTo, wheelPayout, wheelStrip } from './arcade';

describe('the Gull Wheel', () => {
  it('has one gull and seven each of crabs and mussels, and pays back a little under the stake', () => {
    expect(WHEEL.filter((p) => p === 'gull').length).toBe(1);
    expect(WHEEL.filter((p) => p === 'crab').length).toBe(7);
    for (const on of ['crab', 'mussel', 'gull'] as const) {
      const ev = (WHEEL.filter((p) => p === on).length / WHEEL.length) * WHEEL_PAYS[on];
      expect(ev, on).toBeLessThan(1);
      expect(ev, on).toBeGreaterThan(0.9);
    }
  });
  it('pays only the pocket bet on, with tokens for a gull', () => {
    expect(wheelPayout('crab', 50, 'crab').coins).toBe(100);
    expect(wheelPayout('crab', 50, 'mussel').coins).toBe(0);
    expect(wheelPayout('gull', 200, 'gull')).toEqual({ coins: 2800, tokens: 2 });
  });
  it('builds a strip that stops on the result', () => {
    const r = spinWheel(rng(5));
    const strip = wheelStrip(r, 80, 70);
    expect(strip[70]).toBe(r);
    for (let i = 1; i < strip.length; i++) expect(strip[i]).toBe((strip[i - 1] + 1) % WHEEL.length);
  });
});

describe('the Bait Bandit', () => {
  const total = Object.values(REEL_WEIGHTS).reduce((a, b) => a + b, 0);
  const all = Object.keys(REEL_WEIGHTS) as Reel[];
  it('pays back between 88% and 98% of what is staked, counting tokens at 60 coins', () => {
    let ev = 0;
    for (const a of all) for (const b of all) for (const c of all) {
      const p = (REEL_WEIGHTS[a] * REEL_WEIGHTS[b] * REEL_WEIGHTS[c]) / total ** 3;
      const r = scoreSlots([a, b, c], 100);
      ev += p * (r.coins + r.tokens * 60);
    }
    if (process.env.ARCADE_REPORT) console.log('slots pay back', (ev / 100).toFixed(3));
    expect(ev / 100).toBeGreaterThan(0.88);
    expect(ev / 100).toBeLessThan(0.98);
  });
  it('scores lines', () => {
    expect(scoreSlots(['gold', 'gold', 'gold'], 10).kind).toBe('jackpot');
    expect(scoreSlots(['fish', 'fish', 'fish'], 10).coins).toBe(220);
    expect(scoreSlots(['boot', 'boot', 'boot'], 10).kind).toBe('boots');
    expect(scoreSlots(['gold', 'worm', 'shell'], 10).coins).toBe(10);
    expect(scoreSlots(['worm', 'shell', 'fish'], 10).coins).toBe(0);
    expect(scoreSlots(['pearl', 'pearl', 'worm'], 100).tokens).toBe(1);
    expect(scoreSlots(['pearl', 'pearl', 'worm'], 10).tokens).toBe(0);
  });
  it('builds a reel strip ending on the result', () => {
    const s = reelStrip('gold', 30, 9);
    expect(s).toHaveLength(30);
    expect(s[29]).toBe('gold');
  });
});

describe('Flying Fish', () => {
  it('pays back about 96% whatever the target', () => {
    const r = rng(11);
    const points = Array.from({ length: 40000 }, () => snatchPoint(r));
    for (const target of [1.2, 2, 5]) {
      const ev = points.filter((p) => p >= target).length / points.length * target;
      expect(ev, String(target)).toBeGreaterThan(0.9);
      expect(ev, String(target)).toBeLessThan(1.0);
    }
    expect(points.filter((p) => p === 1).length / points.length).toBeCloseTo(SNATCH_AT_ONCE, 1);
  });
  it('rises with time and can be inverted', () => {
    expect(flightAt(0)).toBe(1);
    expect(flightAt(5)).toBeGreaterThan(flightAt(2));
    expect(flightAt(timeTo(3))).toBeCloseTo(3, 1);
  });
  it('rates wins for the fanfare', () => {
    expect(grandness(0, 10)).toBe('none');
    expect(grandness(20, 10)).toBe('small');
    expect(grandness(140, 10)).toBe('huge');
    expect(grandness(1500, 10)).toBe('jackpot');
  });
});
