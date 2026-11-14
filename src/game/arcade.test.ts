import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { FLIGHT_TIERS, POCKET_PRIZE, REEL_WEIGHTS, type Reel, SNATCH_AT_ONCE, WHEEL, flightAt, flightPrize, nextTier, reelStrip, scoreSlots, snatchPoint, spinWheel, timeTo, wheelPrize, wheelStrip } from './arcade';
import { CHESTS, PRIZES, type Rarity, pickPrize } from './crates';
import { FURNITURE, HATS, EXTRAS } from './economy';
import { PRIZES as TICKET_ODDS, TICKETS, payout } from './tickets';
import { FLIGHT_COST, SLOTS_COST, WHEEL_COST, scoreSlots as score } from './arcade';

describe('the Gull Wheel', () => {
  it('has one gull, eight crabs and sixteen shells, each winning a prize of its own rarity', () => {
    expect(WHEEL.filter((p) => p === 'gull').length).toBe(1);
    expect(WHEEL.filter((p) => p === 'crab').length).toBe(8);
    expect(WHEEL.filter((p) => p === 'shell').length).toBe(16);
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
    expect(scoreSlots(['gold', 'gold', 'gold']).prize).toBe('legendary');
    expect(scoreSlots(['fish', 'fish', 'worm']).prize).toBe('rare');
    expect(scoreSlots(['crown', 'worm', 'crown']).prize).toBe('epic');
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
    expect(flightPrize(5)).toBe('rare');
    expect(flightPrize(25)).toBe('legendary');
    expect(nextTier(2.5)?.rarity).toBe('rare');
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

describe('fair value for pearls', () => {
  // A prize's worth: each rarity counts double the one below.
  const V: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16 };
  const games: Record<string, { value: number; legend: number }> = {};
  for (const c of CHESTS) {
    const value = (Object.entries(c.odds) as [Rarity, number][]).reduce((a, [r, p]) => a + p * V[r], 0) / c.cost;
    games[c.name] = { value, legend: c.odds.legendary / c.cost };
  }
  for (const on of ['shell', 'crab', 'gull'] as const) {
    const p = WHEEL.filter((x) => x === on).length / WHEEL.length;
    games[`wheel ${on}`] = { value: (p * V[POCKET_PRIZE[on]]) / WHEEL_COST, legend: on === 'gull' ? p / WHEEL_COST : 0 };
  }
  for (const k of TICKETS) {
    let value = 0;
    let legend = 0;
    for (const [sym, o] of Object.entries(TICKET_ODDS)) {
      const pay = payout(k, sym as keyof typeof TICKET_ODDS);
      value += o.chance * (pay.prize ? V[pay.prize] : pay.pearls);
      if (pay.prize === 'legendary') legend += o.chance;
    }
    games[k.name] = { value: value / k.price, legend: legend / k.price };
  }
  {
    const total = Object.values(REEL_WEIGHTS).reduce((a, b) => a + b, 0);
    const all = Object.keys(REEL_WEIGHTS) as Reel[];
    let value = 0;
    let legend = 0;
    for (const a of all) for (const b of all) for (const c of all) {
      const p = (REEL_WEIGHTS[a] * REEL_WEIGHTS[b] * REEL_WEIGHTS[c]) / total ** 3;
      const r = score([a, b, c]);
      value += p * ((r.prize ? V[r.prize] : 0) + r.pearls);
      if (r.prize === 'legendary') legend += p;
    }
    games.slots = { value: value / SLOTS_COST, legend: legend / SLOTS_COST };
  }
  // Flying Fish, cashing out at each tier in turn: reached with chance 0.96 / m.
  for (const t of FLIGHT_TIERS) {
    const reach = (1 - SNATCH_AT_ONCE) / t.at;
    games[`flight to ${t.rarity}`] = { value: (reach * V[t.rarity]) / FLIGHT_COST, legend: t.rarity === 'legendary' ? reach / FLIGHT_COST : 0 };
  }
  if (process.env.ARCADE_REPORT) for (const [k, g] of Object.entries(games)) console.log(k.padEnd(22), 'value/pearl', g.value.toFixed(2), 'pearls/legend', g.legend ? (1 / g.legend).toFixed(0) : '-');
  it('gives every way of playing a similar worth per pearl, chests a little more for being sure', () => {
    for (const [k, g] of Object.entries(games)) {
      if (k === 'wheel gull' || k.startsWith('flight to')) continue;
      expect(g.value, k).toBeGreaterThan(0.95);
      expect(g.value, k).toBeLessThan(1.6);
    }
    for (const c of CHESTS) expect(games[c.name].value).toBeGreaterThanOrEqual(games['wheel crab'].value);
  });
  it('makes no game a cheap road to a legend', () => {
    for (const [k, g] of Object.entries(games)) if (g.legend) expect(1 / g.legend, k).toBeGreaterThanOrEqual(24);
  });
  it('offers only things that cannot be bought for coins', () => {
    const sold = new Set([...HATS, ...FURNITURE, ...EXTRAS].filter((x) => x.price > 0).map((x) => x.id));
    for (const p of PRIZES) expect(sold.has(p.id), p.id).toBe(false);
  });
});
