import { describe, expect, it } from 'vitest';
import type { Catch } from '../fishing/fish';
import { GULL_DAYS, GULL_GIFTS, NEW_GULL, feedGull, gullBrings, gullFish, gullGave, gullGift, gullHungry } from './gull';
import { RISES, RISE_REACH, byRise, riseSpots } from './rises';
import { parseSave } from './save';

const fish = (species: string, variant: Catch['variant'] = 'normal'): Catch => ({ species, size: 20, variant, huge: false, at: 0 });

describe('the gull at the end of the pier', () => {
  it('is tame after being fed on days running, once a day', () => {
    let g = { ...NEW_GULL };
    for (let d = 10; d < 10 + GULL_DAYS; d++) {
      expect(gullHungry(g, d)).toBe(true);
      g = feedGull(g, d);
      expect(gullHungry(g, d)).toBe(false);
      // A second fish the same day does nothing.
      expect(feedGull(g, d)).toEqual(g);
    }
    expect(g.tame).toBe(true);
    expect(gullHungry(g, 99)).toBe(false);
  });

  it('starts again after a missed day', () => {
    let g = feedGull(feedGull({ ...NEW_GULL }, 1), 2);
    expect(g.streak).toBe(2);
    g = feedGull(g, 4);
    expect(g.streak).toBe(1);
    expect(g.tame).toBe(false);
  });

  it('takes the cheapest ordinary fish and never a special one', () => {
    expect(gullFish([fish('tuna'), fish('sardine'), fish('sardine', 'golden')])).toBe(1);
    expect(gullFish([fish('sardine', 'golden'), fish('tuna', 'shiny')])).toBe(-1);
    expect(gullFish([])).toBe(-1);
  });

  it('brings a few things a day once tame, and nothing before', () => {
    expect(gullBrings({ ...NEW_GULL }, 5)).toBe(false);
    let g = { ...NEW_GULL, tame: true };
    for (let i = 0; i < GULL_GIFTS; i++) {
      expect(gullBrings(g, 5)).toBe(true);
      g = gullGave(g, 5);
    }
    expect(gullBrings(g, 5)).toBe(false);
    expect(gullBrings(g, 6)).toBe(true);
    for (const roll of [0, 0.2, 0.3, 0.5, 0.99]) {
      const gift = gullGift(roll);
      expect(gift.coins > 0 || gift.bait !== null).toBe(true);
      expect(gift.says.length).toBeGreaterThan(10);
    }
  });

  it('is kept in the save, and an old save has an untamed one', () => {
    expect(parseSave('{}').gull).toEqual(NEW_GULL);
    expect(parseSave(JSON.stringify({ gull: { fed: 7, streak: 2, tame: false, giftDay: -1, gifts: 0 } })).gull.streak).toBe(2);
    expect(parseSave(JSON.stringify({ skies: ['aurora', 3] })).skies).toEqual(['aurora']);
  });
});

describe('rising fish', () => {
  const sea = (x: number, z: number): boolean => Math.hypot(x, z) > 60;
  const near = (x: number, z: number): boolean => Math.hypot(x, z) < 80;

  it('are on water that can be reached, apart from each other, and the same for a turn', () => {
    const a = riseSpots(4, sea, near);
    expect(a.length).toBe(RISES);
    for (const s of a) expect(sea(s.x, s.z) && near(s.x, s.z)).toBe(true);
    for (const s of a) for (const o of a) if (s !== o) expect(Math.hypot(s.x - o.x, s.z - o.z)).toBeGreaterThanOrEqual(12);
    expect(riseSpots(4, sea, near)).toEqual(a);
    expect(riseSpots(5, sea, near)).not.toEqual(a);
  });

  it('count a bobber that lands beside one', () => {
    const [s] = riseSpots(1, sea, near);
    expect(byRise([s], s.x + RISE_REACH - 0.5, s.z)).toBe(true);
    expect(byRise([s], s.x + RISE_REACH + 1, s.z)).toBe(false);
  });
});
