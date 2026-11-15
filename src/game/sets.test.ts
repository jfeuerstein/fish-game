import { describe, expect, it } from 'vitest';
import { SETS, newSets, setProgress } from './sets';
import { parseSave } from './save';
import { JOURNAL_SPECIES } from '../fishing/fish';
import { FORAGE_SPOTS, forageNow, forageSpots } from './forage';
import { BAITS, HOOKS, LINES, RODS, hookById, lineById, rigged } from './economy';
import { STYLES, fighterFor, startReel, stepReel, styleOf, type FightStyle } from '../fishing/reel';
import { rng } from '../core/rng';
import { SEASONS, seasonAt } from '../look/season';
import { weatherAt } from './clock';

const found = { count: 1, best: 10, variants: ['normal'], first: 0 } as never;

describe('sets', () => {
  it('each has fish in it, and every fish is in at least one', () => {
    for (const set of SETS) expect(JOURNAL_SPECIES.filter(set.has).length, set.id).toBeGreaterThanOrEqual(3);
    for (const s of JOURNAL_SPECIES) expect(SETS.some((set) => set.has(s)), s.id).toBe(true);
    expect(new Set(SETS.map((s) => s.id)).size).toBe(SETS.length);
  });

  it('stamps a set and pays its prize the moment its last fish is found, once', () => {
    const save = parseSave(null);
    save.coins = 0;
    const cave = SETS.find((s) => s.id === 'cave')!;
    const members = setProgress(save, cave).members;
    for (const m of members.slice(1)) save.journal[m.id] = found;
    expect(newSets(save)).toEqual([]);
    save.journal[members[0].id] = found;
    expect(newSets(save).map((s) => s.id)).toEqual(['cave']);
    expect(save.coins).toBe(cave.coins);
    expect(save.sets).toEqual(['cave']);
    expect(newSets(save)).toEqual([]);
    expect(save.coins).toBe(cave.coins);
  });

  it('is kept in the save', () => {
    expect(parseSave(null).sets).toEqual([]);
    expect(parseSave(JSON.stringify({ v: 1, sets: ['pond', 7] })).sets).toEqual(['pond']);
  });
});

describe('bait to be found', () => {
  it('has worms up when the ground is wet and crickets on a dry evening', () => {
    expect(forageNow(12, 1)).toBe('worms');
    expect(forageNow(19, 0.5)).toBe('worms');
    expect(forageNow(19, 0)).toBe('crickets');
    expect(forageNow(12, 0)).toBeNull();
    expect(forageNow(3, 0.1)).toBeNull();
  });

  it('puts them only where they fit, apart from one another, the same every time and different each turn', () => {
    const fits = (x: number, z: number): boolean => Math.hypot(x, z) < 60 && x > -40;
    const a = forageSpots('worms', 5, fits);
    expect(a.length).toBe(FORAGE_SPOTS);
    for (const s of a) expect(fits(s.x, s.z)).toBe(true);
    for (const s of a) for (const t of a) if (s !== t) expect(Math.hypot(s.x - t.x, s.z - t.z)).toBeGreaterThanOrEqual(9);
    expect(forageSpots('worms', 5, fits)).toEqual(a);
    expect(forageSpots('worms', 6, fits).map((s) => `${s.x},${s.z}`)).not.toEqual(a.map((s) => `${s.x},${s.z}`));
    expect(new Set(a.map((s) => s.key)).size).toBe(a.length);
    // Nowhere fits: nothing, and no endless looking.
    expect(forageSpots('crickets', 1, () => false)).toEqual([]);
  });

  it('gives a bait that is never sold', () => {
    const crawler = BAITS.find((b) => b.id === 'bait-crawler')!;
    expect(crawler.found).toBe(true);
    expect(crawler.pack).toBe(0);
  });
});

describe('line and hooks', () => {
  it('get better as they get dearer, and the first of each is free', () => {
    for (const list of [LINES, HOOKS]) {
      expect(list[0].price).toBe(0);
      for (let i = 1; i < list.length; i++) expect(list[i].price).toBeGreaterThan(list[i - 1].price);
    }
    for (let i = 1; i < LINES.length; i++) expect(LINES[i].strength).toBeGreaterThan(LINES[i - 1].strength);
    for (let i = 1; i < HOOKS.length; i++) expect(HOOKS[i].hold).toBeGreaterThan(HOOKS[i - 1].hold);
    expect(lineById('nonsense')).toBe(LINES[0]);
    expect(hookById('nonsense')).toBe(HOOKS[0]);
  });

  it('a stronger line snaps later and a finer hook holds a slack fish longer', () => {
    const fish = fighterFor(0.5, 0.5);
    // Winding without a pause until it snaps.
    const snapsAt = (line: number): number => {
      const rod = rigged(RODS[0], LINES[line], HOOKS[0]);
      const r = rng(3);
      let s = startReel(r);
      while (s.outcome === 'reeling' && s.elapsed < 60) s = stepReel(s, 1 / 60, true, fish, rod, r);
      return s.outcome === 'snapped' ? s.elapsed : Infinity;
    };
    expect(snapsAt(3)).toBeGreaterThan(snapsAt(0));
    // Never winding until it gets away.
    const slipsAt = (hook: number): number => {
      const rod = rigged(RODS[0], LINES[0], HOOKS[hook]);
      const r = rng(3);
      let s = startReel(r);
      while (s.outcome === 'reeling' && s.elapsed < 120) s = stepReel(s, 1 / 60, false, fish, rod, r);
      return s.elapsed;
    };
    expect(slipsAt(3)).toBeGreaterThan(slipsAt(0));
    expect(rigged(RODS[0], LINES[0], HOOKS[0])).toMatchObject({ control: RODS[0].control, hook: RODS[0].hook });
  });
});

describe('the way fish fight', () => {
  /** A careful thumb: wind while the fish is calm and the line slack enough. */
  const land = (style: FightStyle, seed: number): { outcome: string; secs: number; sulked: boolean } => {
    const r = rng(seed);
    let s = startReel(r);
    let held = false;
    let sulked = false;
    while (s.outcome === 'reeling' && s.elapsed < 240) {
      held = !s.thrashing && s.tension < (held ? 0.7 : 0.35);
      s = stepReel(s, 1 / 60, held, { fight: 0.5, style }, RODS[1], r);
      sulked ||= s.sulking;
    }
    return { outcome: s.outcome, secs: s.elapsed, sulked };
  };

  it('lets a careful thumb land every kind', () => {
    for (const style of Object.keys(STYLES) as FightStyle[]) for (let seed = 1; seed <= 12; seed++) expect(land(style, seed).outcome, `${style} ${seed}`).toBe('landed');
  });

  it('makes each kind feel different: a diver is heavy, a sulker sulks, and none is quicker to land than a steady fish by much', () => {
    const mean = (style: FightStyle): number => Array.from({ length: 12 }, (_, i) => land(style, i + 1).secs).reduce((a, b) => a + b, 0) / 12;
    expect(mean('diver')).toBeGreaterThan(mean('steady'));
    expect(mean('sulker')).toBeGreaterThan(mean('steady'));
    expect(Array.from({ length: 12 }, (_, i) => land('sulker', i + 1).sulked).some(Boolean)).toBe(true);
    expect(land('steady', 1).sulked).toBe(false);
    for (const style of Object.keys(STYLES) as FightStyle[]) expect(mean(style)).toBeGreaterThan(mean('steady') * 0.6);
  });

  it('knows how the notable ones fight, and calls the rest steady', () => {
    expect(styleOf('tuna')).toBe('runner');
    expect(styleOf('trout')).toBe('jumper');
    expect(styleOf('eel')).toBe('diver');
    expect(styleOf('coelacanth')).toBe('sulker');
    expect(styleOf('sardine')).toBe('steady');
    expect(fighterFor(0.5, 0.5, 'tuna').style).toBe('runner');
  });
});

describe('seasons and weather', () => {
  it('goes round the year', () => {
    const at = (m: number, d = 15): string => seasonAt(Date.UTC(2026, m, d, 12), 0);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => at(m))).toEqual(['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter']);
    expect(SEASONS.length).toBe(4);
  });

  it('has fog only on some mornings and storms only as rain, each a small share of the time', () => {
    const seen: Record<string, number> = { clear: 0, rain: 0, fog: 0, storm: 0 };
    const HOUR = 60_000;
    for (let h = 0; h < 24 * 400; h += 0.5) {
      const w = weatherAt(h * HOUR, 'island');
      seen[w]++;
      // The island's clock starts at eight in the morning.
      const hour = (h + 8) % 24;
      if (w === 'fog') expect(hour >= 4.5 && hour < 9.5).toBe(true);
    }
    const total = 24 * 400 * 2;
    expect(seen.fog / total).toBeGreaterThan(0.02);
    expect(seen.fog / total).toBeLessThan(0.12);
    expect(seen.storm / total).toBeGreaterThan(0.02);
    expect(seen.storm).toBeLessThan(seen.rain);
    expect(seen.clear / total).toBeGreaterThan(0.6);
  });
});
