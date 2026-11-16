import { describe, expect, it } from 'vitest';
import { BY_ID, JOURNAL_SPECIES, ZONE_ISLE, farAway, isleOf } from '../fishing/fish';
import { rollCatch } from '../fishing/roll';
import { rng } from '../core/rng';
import { ISLES } from '../world/isle';
import { BAITS, CHARMS, FURNITURE, PAINTS, RODS } from './economy';
import { BEACON_COUNT, BURN_SECS, CHART_FOUND, CHART_RUMOUR, DEEDS, FAR_ISLES, ISLE_SAYS, POT_SECS, WAKE_SECS, awake, bottleHolds, burning, fishOf, giveChart, hasChart, haulPot, lightBeacon, newDeeds, potLeft, potState, setPot } from './isles';
import { newSave, parseSave } from './save';
import { TOYS } from './toys';

const T0 = 1_800_000_000_000;

describe('charts', () => {
  it('home needs none, and a far island wants its own', () => {
    const s = newSave();
    expect(hasChart(s, 'cove')).toBe(true);
    for (const isle of FAR_ISLES) expect(hasChart(s, isle)).toBe(false);
    expect(giveChart(s, 'rime')).toBe(true);
    expect(giveChart(s, 'rime')).toBe(false);
    expect(hasChart(s, 'rime')).toBe(true);
    expect(hasChart(s, 'mire')).toBe(false);
  });

  it('an older save with the sea chart can still row to Kettle Isle', () => {
    const s = newSave();
    s.seaChart = true;
    expect(hasChart(s, 'kettle')).toBe(true);
    expect(giveChart(s, 'kettle')).toBe(false);
  });

  it('a bottle has Glowmere\'s chart about one time in three, the fifth for certain, and never twice', () => {
    const s = newSave();
    expect(bottleHolds(s, 0.9)).toBe(false);
    expect(bottleHolds(s, 0.1)).toBe(true);
    s.journal.bottle = { count: 3, best: 0, variants: [], first: T0 };
    expect(bottleHolds(s, 0.9)).toBe(false);
    s.journal.bottle.count = 4;
    expect(bottleHolds(s, 0.9)).toBe(true);
    giveChart(s, 'glow');
    expect(bottleHolds(s, 0.1)).toBe(false);
  });

  it('every island has its words', () => {
    for (const isle of FAR_ISLES) {
      expect(CHART_RUMOUR[isle].length).toBeGreaterThan(10);
      expect(CHART_FOUND[isle].length).toBeGreaterThan(10);
    }
    for (const isle of ISLES) expect(ISLE_SAYS[isle].length).toBeGreaterThan(10);
  });

  it('charts, pots, beacons and deeds survive the save', () => {
    const s = newSave();
    giveChart(s, 'glow');
    setPot(s, 'north', T0);
    lightBeacon(s, 1, T0);
    s.deeds.push('rime-ice');
    const back = parseSave(JSON.stringify(s));
    expect(back.charts).toEqual(['glow']);
    expect(back.pots.north).toBe(T0);
    expect(back.beacons[1]).toBe(T0);
    expect(back.deeds).toEqual(['rime-ice']);
  });

  it('a save from before the fleet reads as having none of it', () => {
    const old = JSON.parse(JSON.stringify(newSave()));
    for (const k of ['charts', 'pots', 'potHauls', 'beacons', 'wokenAt', 'wakings', 'deeds']) delete old[k];
    const back = parseSave(JSON.stringify(old));
    expect(back.charts).toEqual([]);
    expect(back.pots).toEqual({});
    expect(back.potHauls).toBe(0);
    expect(back.beacons).toEqual([0, 0, 0]);
    expect(back.wokenAt).toBe(0);
    expect(back.deeds).toEqual([]);
  });
});

describe('crab pots', () => {
  it('a pot soaks, is ready, and is hauled once', () => {
    const s = newSave();
    expect(potState(s, 'north', T0)).toBe('empty');
    expect(setPot(s, 'north', T0)).toBe(true);
    expect(setPot(s, 'north', T0 + 1000)).toBe(false);
    expect(potState(s, 'north', T0 + 60_000)).toBe('soaking');
    expect(potLeft(s, 'north', T0 + 60_000)).toBe(POT_SECS - 60);
    expect(haulPot(s, 'north', T0 + 60_000, 0.5)).toBe(0);
    const later = T0 + POT_SECS * 1000;
    expect(potState(s, 'north', later)).toBe('ready');
    expect(haulPot(s, 'north', later, 0.5)).toBe(2);
    expect(s.potHauls).toBe(1);
    expect(potState(s, 'north', later)).toBe('empty');
    expect(haulPot(s, 'north', later, 0.5)).toBe(0);
  });

  it('a pot keeps however long it is left, and holds one to three', () => {
    const s = newSave();
    setPot(s, 'west', T0);
    expect(potState(s, 'west', T0 + 86_400_000 * 30)).toBe('ready');
    for (const roll of [0, 0.44, 0.46, 0.84, 0.86, 0.999]) {
      setPot(s, 'bayou', T0);
      const n = haulPot(s, 'bayou', T0 + POT_SECS * 1000, roll);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('a clock set back does not leave a pot stuck', () => {
    const s = newSave();
    setPot(s, 'north', T0);
    expect(potState(s, 'north', T0 - 5000)).toBe('empty');
  });

  it('what a pot brings up is its own, and is never had by casting', () => {
    const rand = rng(5);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(rollCatch({ zone: 'pots', hour: 12, raining: false, rod: RODS[0], bait: BAITS[0] }, rand).species);
    seen.delete('treasure');
    for (const id of seen) expect(BY_ID[id].zones, id).toContain('pots');
    expect(seen.size).toBeGreaterThanOrEqual(3);
    for (const s of JOURNAL_SPECIES) if (s.zones.includes('pots') && s.tier !== 'junk') expect(s.zones).toEqual(['pots']);
  });
});

describe('beacons', () => {
  it('one burns for its time and goes out', () => {
    const s = newSave();
    expect(burning(s, 0, T0)).toBe(false);
    expect(lightBeacon(s, 0, T0).woke).toBe(false);
    expect(burning(s, 0, T0 + 1000)).toBe(true);
    expect(burning(s, 0, T0 + BURN_SECS * 1000)).toBe(false);
    expect(awake(s, T0 + 1000)).toBe(false);
  });

  it('all three at once wake the water, for a while', () => {
    const s = newSave();
    lightBeacon(s, 0, T0);
    lightBeacon(s, 1, T0 + 60_000);
    const last = T0 + 120_000;
    expect(lightBeacon(s, 2, last).woke).toBe(true);
    expect(s.wakings).toBe(1);
    expect(awake(s, last + 1000)).toBe(true);
    // Lighting one again while it is awake is not a second waking.
    expect(lightBeacon(s, 0, last + 2000).woke).toBe(false);
    expect(s.wakings).toBe(1);
    expect(awake(s, last + WAKE_SECS * 1000)).toBe(false);
  });

  it('three lit too far apart wake nothing', () => {
    const s = newSave();
    lightBeacon(s, 0, T0);
    lightBeacon(s, 1, T0 + 1000);
    expect(lightBeacon(s, 2, T0 + BURN_SECS * 1000 + 5000).woke).toBe(false);
    expect(awake(s, T0 + BURN_SECS * 1000 + 6000)).toBe(false);
    expect(BEACON_COUNT).toBe(3);
  });

  it('the fish that want the water awake bite only then', () => {
    const woken = JOURNAL_SPECIES.filter((s) => s.woken);
    expect(woken.length).toBeGreaterThanOrEqual(2);
    for (const s of woken) expect(isleOf(s)).toBe('glow');
    const ids = new Set(woken.map((s) => s.id));
    const roll = (on: boolean): Set<string> => {
      const rand = rng(9);
      const got = new Set<string>();
      for (let i = 0; i < 6000; i++) got.add(rollCatch({ zone: 'glow', hour: 23, raining: false, woken: on, rod: RODS[RODS.length - 1], bait: BAITS[BAITS.length - 1] }, rand).species);
      return got;
    };
    expect([...roll(false)].some((id) => ids.has(id))).toBe(false);
    expect([...roll(true)].some((id) => ids.has(id))).toBe(true);
  });
});

describe('deeds', () => {
  it('each island has three, and each gives something that exists and cannot be bought or won', () => {
    for (const isle of ['rime', 'mire', 'glow'] as const) expect(DEEDS.filter((d) => d.isle === isle)).toHaveLength(3);
    expect(new Set(DEEDS.map((d) => d.id)).size).toBe(DEEDS.length);
    for (const d of DEEDS) {
      const g = d.gives;
      if (g.charm) expect(CHARMS.find((c) => c.id === g.charm)?.earned).toBe(true);
      if (g.paint) expect(PAINTS.find((c) => c.id === g.paint)?.earned).toBe(true);
      if (g.toy) expect(TOYS.find((c) => c.id === g.toy)?.earned).toBe(true);
      if (g.furniture) expect(FURNITURE.find((c) => c.id === g.furniture![0])?.earned).toBe(true);
      expect(Object.keys(g).length).toBeGreaterThan(0);
    }
  });

  it('a deed is paid once', () => {
    const s = newSave();
    expect(newDeeds(s)).toEqual([]);
    s.potHauls = 1;
    expect(newDeeds(s).map((d) => d.id)).toEqual(['mire-haul']);
    expect(s.charms).toContain('charm-claw');
    expect(newDeeds(s)).toEqual([]);
    s.potHauls = 12;
    expect(newDeeds(s).map((d) => d.id)).toEqual(['mire-pots']);
    expect(s.toys).toContain('toy-stilts');
  });

  it('the fish deeds can be done, and never wait on a legend', () => {
    const s = newSave();
    for (const isle of ['rime', 'mire', 'glow'] as const)
      for (const f of fishOf(isle)) if (f.tier !== 'legendary' && !f.woken) s.journal[f.id] = { count: 1, best: 10, first: T0 } as never;
    const done = newDeeds(s).map((d) => d.id);
    for (const id of ['rime-all', 'mire-all', 'glow-all']) expect(done).toContain(id);
    expect(s.toys).toContain('toy-sled');
    expect(s.rodPaints).toContain('paint-glow');
  });

  it('waking the water and landing what it wakes are two deeds', () => {
    const s = newSave();
    s.wakings = 1;
    expect(newDeeds(s).map((d) => d.id)).toEqual(['glow-fires']);
    s.journal['star-ray'] = { count: 1, best: 10, first: T0 } as never;
    expect(newDeeds(s).map((d) => d.id)).toEqual(['glow-awake']);
    expect(s.furniture['f-glowshroom']).toBe(2);
  });
});

describe('the far waters', () => {
  it('every far island has fish of its own, a legend among them, and nothing asks for one', () => {
    for (const isle of FAR_ISLES) {
      const fish = fishOf(isle);
      expect(fish.length, isle).toBeGreaterThanOrEqual(8);
      for (const f of fish) expect(farAway(f), f.id).toBe(true);
    }
    for (const isle of ['rime', 'mire', 'glow'] as const) expect(fishOf(isle).some((f) => f.tier === 'legendary'), isle).toBe(true);
  });

  it('every water belongs to one island', () => {
    for (const [zone, isle] of Object.entries(ZONE_ISLE)) expect(ISLES, zone).toContain(isle);
  });
});
