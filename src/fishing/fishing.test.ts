import { describe, expect, it } from 'vitest';
import { rng } from '../core/rng';
import { BAITS, RODS } from '../game/economy';
import type { Zone } from '../world/island';
import { BY_ID, JOURNAL_SPECIES as SPECIES, valueOf } from './fish';
import { type Conditions, candidates, rollCatch } from './roll';
import { type Fighter, startReel, stepReel } from './reel';

const zones: Zone[] = ['ocean', 'deep', 'pond', 'creek'];

describe('fish', () => {
  it('has unique ids and sensible numbers', () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    for (const s of SPECIES) {
      expect(s.size[0]).toBeLessThan(s.size[1]);
      expect(s.value).toBeGreaterThan(0);
      expect(s.zones.length).toBeGreaterThan(0);
    }
  });

  it('can catch every species somewhere, at some hour, in some weather', () => {
    const seen = new Set<string>();
    for (const zone of zones)
      for (let hour = 0; hour < 24; hour += 0.5)
        for (const raining of [false, true])
          for (const c of candidates({ zone, hour, raining, rod: RODS[0], bait: BAITS[0] })) seen.add(c.species.id);
    expect([...seen].sort()).toEqual(SPECIES.map((s) => s.id).sort());
  });

  it('always has something to bite in every water at every hour', () => {
    for (const zone of zones) for (let hour = 0; hour < 24; hour += 1) expect(candidates({ zone, hour, raining: false, rod: RODS[0], bait: BAITS[0] }).length).toBeGreaterThan(2);
  });

  it('makes legends rare and better gear find more of them', () => {
    const count = (c: Conditions): number => {
      const r = rng(7);
      let n = 0;
      for (let i = 0; i < 20000; i++) if (BY_ID[rollCatch(c, r).species].tier === 'legendary') n++;
      return n / 20000;
    };
    const base: Conditions = { zone: 'deep', hour: 23, raining: true, rod: RODS[0], bait: BAITS[0] };
    const plain = count(base);
    const best = count({ ...base, rod: RODS[4], bait: BAITS[5] });
    expect(plain).toBeLessThan(0.05);
    expect(best).toBeGreaterThan(plain * 3);
  });

  it('values special catches above plain ones', () => {
    const plain = valueOf({ species: 'trout', size: 40, variant: 'normal', huge: false, at: 0 });
    expect(valueOf({ species: 'trout', size: 40, variant: 'shiny', huge: false, at: 0 })).toBeGreaterThan(plain);
    expect(valueOf({ species: 'trout', size: 40, variant: 'golden', huge: false, at: 0 })).toBeGreaterThan(plain * 4);
  });
});

/** A player who winds while the fish is calm and the line is not too tight. */
function play(fish: Fighter, rodIndex: number, careful: boolean, seed = 1): { outcome: string; secs: number } {
  const r = rng(seed);
  let s = startReel(r);
  const rod = RODS[rodIndex];
  let winding = true;
  while (s.outcome === 'reeling' && s.elapsed < 120) {
    if (careful) winding = winding ? s.tension < 0.75 && !s.thrashing : s.tension < 0.35 && !s.thrashing;
    s = stepReel(s, 1 / 60, careful ? winding : true, fish, rod, r);
  }
  return { outcome: s.outcome, secs: s.elapsed };
}

describe('reeling', () => {
  it('lands a small fish in a few seconds with care', () => {
    const { outcome, secs } = play({ fight: 0.15 }, 0, true);
    expect(outcome).toBe('landed');
    expect(secs).toBeLessThan(10);
  });

  it('snaps the line if a strong fish is wound in without letting up', () => {
    expect(play({ fight: 0.9 }, 0, false).outcome).toBe('snapped');
  });

  it('lands even a legend with care and a good rod, in under a minute', () => {
    let landed = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const r = play({ fight: 1.05 }, 3, true, seed);
      if (r.outcome === 'landed') {
        landed++;
        expect(r.secs).toBeLessThan(60);
      }
    }
    expect(landed).toBeGreaterThanOrEqual(8);
  });

  it('lets a careful player land a strong fish even on the first rod', () => {
    let landed = 0;
    for (let seed = 1; seed <= 10; seed++) if (play({ fight: 0.8 }, 0, true, seed).outcome === 'landed') landed++;
    expect(landed).toBeGreaterThanOrEqual(6);
  });
});
