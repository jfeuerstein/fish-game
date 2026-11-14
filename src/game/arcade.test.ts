import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { FLIGHT_TIERS, POCKET_PRIZE, REEL_WEIGHTS, type Reel, SNATCH_AT_ONCE, WHEEL, flightAt, flightPrize, nextTier, reelStrip, scoreSlots, snatchPoint, spinWheel, timeTo, wheelPrize, wheelStrip } from './arcade';
import { PRIZES, pickPrize } from './crates';

describe('the Gull Wheel', () => {
  it('has one gull, five crabs and nine shells, each winning a prize of its own rarity', () => {
    expect(WHEEL.filter((p) => p === 'gull').length).toBe(1);
    expect(WHEEL.filter((p) => p === 'crab').length).toBe(5);
    expect(WHEEL.filter((p) => p === 'shell').length).toBe(9);
    expect(POCKET_PRIZE.gull).toBe('legendary');
  });
  it('wins only on the pocket bet on, and never coins', () => {
    expect(wheelPrize('crab', 'crab')).toBe('rare');
    expect(wheelPrize('crab', 'shell')).toBeNull();
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
  it('wins something on a good share of pulls, and a legend rarely', () => {
    let some = 0;
    let legend = 0;
    for (const a of all) for (const b of all) for (const c of all) {
      const p = (REEL_WEIGHTS[a] * REEL_WEIGHTS[b] * REEL_WEIGHTS[c]) / total ** 3;
      const r = scoreSlots([a, b, c]);
      if (r.prize || r.pearls) some += p;
      if (r.prize === 'legendary') legend += p;
    }
    if (process.env.ARCADE_REPORT) console.log('slots win', some.toFixed(3), 'legendary', legend.toFixed(5));
    expect(some).toBeGreaterThan(0.3);
    expect(some).toBeLessThan(0.6);
    expect(legend).toBeLessThan(0.001);
  });
  it('scores lines', () => {
    expect(scoreSlots(['crown', 'crown', 'crown']).prize).toBe('legendary');
    expect(scoreSlots(['fish', 'fish', 'worm']).prize).toBe('uncommon');
    expect(scoreSlots(['worm', 'worm', 'fish']).prize).toBe('common');
    expect(scoreSlots(['worm', 'boot', 'fish']).prize).toBeNull();
    expect(scoreSlots(['boot', 'boot', 'boot']).kind).toBe('boots');
    expect(scoreSlots(['pearl', 'pearl', 'pearl']).pearls).toBe(3);
  });
  it('builds a reel strip ending on the result', () => {
    const s = reelStrip('gold', 30, 9);
    expect(s).toHaveLength(30);
    expect(s[29]).toBe('gold');
  });
});

describe('Flying Fish', () => {
  it('climbs through the rarities, each reached less often', () => {
    const r = rng(11);
    const points = Array.from({ length: 40000 }, () => snatchPoint(r));
    let last = 1;
    for (const t of FLIGHT_TIERS) {
      const reach = points.filter((p) => p >= t.at).length / points.length;
      expect(reach, t.rarity).toBeLessThan(last);
      expect(reach, t.rarity).toBeCloseTo((1 - SNATCH_AT_ONCE) / t.at, 1);
      last = reach;
    }
  });
  it('pays the tier reached, and nothing below the first', () => {
    expect(flightPrize(1.2)).toBeNull();
    expect(flightPrize(3)).toBe('uncommon');
    expect(flightPrize(25)).toBe('legendary');
    expect(nextTier(3)?.rarity).toBe('rare');
    expect(flightAt(timeTo(3))).toBeCloseTo(3, 1);
  });
});

describe('prizes', () => {
  it('favours what is not owned yet', () => {
    const r = rng(3);
    const owned = new Set(PRIZES.filter((p) => p.rarity === 'common').slice(1).map((p) => p.id));
    let fresh = 0;
    for (let i = 0; i < 3000; i++) if (!owned.has(pickPrize('common', (p) => owned.has(p.id), r).id)) fresh++;
    const commons = PRIZES.filter((p) => p.rarity === 'common').length;
    // One unowned of n, three times as likely: 3 / (3 + n - 1).
    expect(fresh / 3000).toBeCloseTo(3 / (3 + commons - 1), 1);
  });
});
