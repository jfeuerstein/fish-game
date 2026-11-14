import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { BAITS, LURES, RODS } from './economy';
import { PRIZES, TICKETS, makeTicket, payout } from './tickets';
import { TITLES, newTitles } from './titles';
import { newSave } from './save';
import { rollCatch, rollQuality, type Conditions } from '../fishing/roll';
import { BY_ID } from '../fishing/fish';
import { Heightfield, walkable, waterAt } from '../world/island';
import { SEA_GLASS, SHROOMS, buriedToday, digUp } from '../world/secrets';

const field = new Heightfield();

describe('scratch tickets', () => {
  it('shows exactly three of the winning symbol and no other three', () => {
    for (let seed = 1; seed < 400; seed++) {
      const t = makeTicket(TICKETS[seed % 3], seed);
      expect(t.cells.length).toBe(9);
      const counts = new Map<string, number>();
      for (const c of t.cells) counts.set(c, (counts.get(c) ?? 0) + 1);
      for (const [sym, n] of counts) {
        if (sym === t.win) expect(n).toBe(3);
        else expect(n).toBeLessThan(3);
      }
    }
  });
  it('wins a cosmetic or pearls back on about half the tickets, a dearer ticket a rarer prize', () => {
    let wins = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (makeTicket(TICKETS[0], i + 1).win) wins++;
    expect(wins / n).toBeGreaterThan(0.45);
    expect(wins / n).toBeLessThan(0.65);
    expect(payout(TICKETS[0], 'crab').prize).toBe('rare');
    expect(payout(TICKETS[2], 'crab').prize).toBe('legendary');
    expect(payout(TICKETS[1], 'pearl').pearls).toBe(3);
    expect(PRIZES.crown.chance).toBeLessThan(0.01);
  });
});

describe('quality and lures', () => {
  const base: Conditions = { zone: 'ocean', hour: 12, raining: false, rod: RODS[0], bait: BAITS[0] };
  it('finds finer fish with finer bait', () => {
    const count = (c: Conditions): number => {
      const r = rng(3);
      let n = 0;
      for (let i = 0; i < 20000; i++) if (rollQuality(c, r) !== 'normal') n++;
      return n;
    };
    expect(count({ ...base, bait: BAITS[5] })).toBeGreaterThan(count(base) * 3);
  });
  it('picks the biggest of three with the chunky lure, and treasure with the magnet', () => {
    const avg = (c: Conditions): number => {
      const r = rng(9);
      let sum = 0;
      for (let i = 0; i < 3000; i++) sum += rollCatch(c, r).size;
      return sum / 3000;
    };
    const big = LURES.find((l) => l.effect === 'big')!;
    const small = LURES.find((l) => l.effect === 'small')!;
    expect(avg({ ...base, lure: big })).toBeGreaterThan(avg({ ...base, lure: small }) * 1.3);
    const magnet = LURES.find((l) => l.effect === 'magnet')!;
    const r = rng(4);
    let chests = 0;
    for (let i = 0; i < 5000; i++) if (rollCatch({ ...base, lure: magnet }, r).species === 'treasure') chests++;
    expect(chests / 5000).toBeGreaterThan(0.04);
    expect(BY_ID.treasure).toBeTruthy();
  });
});

describe('titles', () => {
  it('starts with one and earns more', () => {
    const s = newSave();
    expect(newTitles(s)).toEqual([]);
    s.stats.caught = 30;
    expect(newTitles(s)).toContain('Angler');
    expect(new Set(TITLES.map((t) => t.name)).size).toBe(TITLES.length);
  });
});

describe('secrets', () => {
  it('hides every piece of sea glass somewhere that can be stood on', () => {
    SEA_GLASS.forEach(([x, z], i) => {
      expect(walkable(field, x, z), `glass ${i}`).toBe(true);
      expect(waterAt(field, x, z), `glass ${i}`).toBeNull();
      expect(field.heightAt(x, z), `glass ${i}`).toBeGreaterThan(0.3);
    });
    for (const s of SHROOMS) expect(walkable(field, s.x, s.z)).toBe(true);
  });
  it('buries six things a day, different each day', () => {
    const a = buriedToday(field, 100);
    const b = buriedToday(field, 101);
    expect(a.length).toBe(6);
    expect(a[0].x).not.toBe(b[0].x);
    expect(digUp(5, 3, []).kind).toBeTruthy();
  });
});
