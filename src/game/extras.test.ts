import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { BAITS, LURES, RODS } from './economy';
import { TITLES, newTitles } from './titles';
import { newSave } from './save';
import { rollCatch, rollQuality, type Conditions } from '../fishing/roll';
import { BY_ID } from '../fishing/fish';
import { Heightfield, walkable, waterAt } from '../world/island';
import { SEA_GLASS, SHROOMS, buriedToday, digUp } from '../world/secrets';

const field = new Heightfield();

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
  it('can all be earned: each asks for something the save keeps', () => {
    // Lucky Duck once asked for a win on a scratch ticket that no longer pays coins.
    const s = newSave();
    expect(newTitles(s)).not.toContain('Lucky Duck');
    s.arcade.rarest = 4;
    expect(newTitles(s)).toContain('Lucky Duck');
    for (const t of TITLES) expect(t.how).not.toMatch(/scratch ticket/i);
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
