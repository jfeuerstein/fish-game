import { describe, expect, it } from 'vitest';
import { BAITS, FURNITURE } from './economy';
import { newSave } from './save';
import { TRADER_HOURS, WARES, buyWare, sold, stock, traderDay, traderHere } from './trader';
import { noteCatch, caughtIn, caveKnown } from './chart';
import { CHEST_HOLDS, campAt, campNamed, store, takeOut } from './camp';
import { SCOPE_AIM, sighted } from './lookout';

describe('the trader', () => {
  it('comes some days, never two running', () => {
    let days = 0;
    for (let d = 100; d < 800; d++) {
      if (traderDay(d)) {
        days++;
        expect(traderDay(d + 1)).toBe(false);
      }
    }
    expect(days).toBeGreaterThan(700 * 0.18);
    expect(days).toBeLessThan(700 * 0.42);
  });

  it('is there by day and gone by dark', () => {
    const day = [...Array(60).keys()].find((d) => traderDay(d))!;
    expect(traderHere(day, 12)).toBe(true);
    expect(traderHere(day, TRADER_HOURS[1] + 1)).toBe(false);
    expect(traderHere(day, 3)).toBe(false);
  });

  it('carries only real things, none of which Gus sells', () => {
    for (const w of WARES) {
      if (w.gives.furniture) {
        const f = FURNITURE.find((x) => x.id === w.gives.furniture)!;
        expect(f.trader).toBe(true);
        expect(f.prize).toBeFalsy();
      }
      if (w.gives.bait) expect(BAITS.some((b) => b.id === w.gives.bait!.id)).toBe(true);
    }
    for (let d = 0; d < 40; d++) {
      const s = stock(d);
      expect(new Set(s.map((w) => w.id)).size).toBe(s.length);
      expect(s.length).toBe(6);
    }
  });

  it('sells the chart to Kettle Isle once, and for good', () => {
    const save = newSave();
    save.coins = 5000;
    const chart = stock(3).find((w) => w.gives.chart)!;
    expect(save.seaChart).toBe(false);
    expect(buyWare(save, 3, chart)).toBe(true);
    expect(save.seaChart).toBe(true);
    // Another visit: it is not sold twice.
    expect(sold(save, 40, chart)).toBe(true);
    expect(buyWare(save, 40, chart)).toBe(false);
  });

  it('sells each thing once a visit', () => {
    const save = newSave();
    save.coins = 5000;
    const [chime, , pearl] = stock(9);
    expect(buyWare(save, 9, chime)).toBe(true);
    expect(save.furniture['f-chime']).toBe(1);
    expect(buyWare(save, 9, chime)).toBe(false);
    expect(buyWare(save, 9, pearl)).toBe(true);
    expect(save.tokens).toBe(1);
    expect(sold(save, 9, pearl)).toBe(true);
    // Another visit, another go.
    expect(sold(save, 12, pearl)).toBe(false);
    save.coins = 10;
    expect(buyWare(save, 12, pearl)).toBe(false);
  });
});

describe('the chart', () => {
  it('remembers what came out of which water, and reads an old journal', () => {
    const save = newSave();
    noteCatch(save, 'pond', 'koi');
    noteCatch(save, 'pond', 'koi');
    noteCatch(save, 'pond', 'boot');
    expect(caughtIn(save, 'pond')).toEqual(['koi']);
    // Trout live only in the creek: an old save that has one must have caught it there.
    save.journal.trout = { count: 1, best: 30, variants: ['normal'], first: 0 };
    expect(caughtIn(save, 'creek')).toContain('trout');
    expect(caughtIn(save, 'ocean')).toEqual([]);
  });

  it('shows the cave only once it has been found', () => {
    const save = newSave();
    expect(caveKnown(save)).toBe(false);
    save.spotted.push('cave');
    expect(caveKnown(save)).toBe(true);
  });
});

describe('the camp chest and sign', () => {
  it('keeps fish out of the bag and gives them back', () => {
    const save = newSave();
    save.bag = [{ species: 'trout', size: 30, variant: 'normal', huge: false, at: 0 }];
    expect(store(save, 0)).toBe(true);
    expect(save.bag.length).toBe(0);
    expect(save.stored.length).toBe(1);
    expect(store(save, 0)).toBe(false);
    expect(takeOut(save, 0)).toBe(true);
    expect(save.bag[0].species).toBe('trout');
    save.stored = Array.from({ length: CHEST_HOLDS }, () => ({ species: 'trout', size: 30, variant: 'normal' as const, huge: false, at: 0 }));
    expect(store(save, 0)).toBe(false);
  });

  it('names the camp shortly, and finds it by its sign or its tent', () => {
    expect(campNamed('   Otter    Rock  ')).toBe('Otter Rock');
    expect(campNamed('x'.repeat(60)).length).toBeLessThanOrEqual(18);
    expect(campAt([{ id: 'f-chair', x: 0, z: 0 }])).toBeNull();
    expect(campAt([{ id: 'f-tent', x: 1, z: 2 }, { id: 'f-campsign', x: 3, z: 4 }])!.x).toBe(3);
  });
});

describe('the telescope', () => {
  it('picks out what is in the middle of the glass and nothing off to the side', () => {
    const eye = { x: 0, y: 20, z: 0 };
    const where = { trawler: { x: 300, y: 0, z: 0 }, pier: { x: 0, y: 0, z: 100 }, pond: null, cave: null, camp: null };
    const to = (p: { x: number; y: number; z: number }) => ({ x: p.x - eye.x, y: p.y - eye.y, z: p.z - eye.z });
    expect(sighted(eye, to(where.trawler), where)).toBe('trawler');
    expect(sighted(eye, to(where.pier), where)).toBe('pier');
    expect(sighted(eye, { x: -1, y: 0, z: 0 }, where)).toBeNull();
    // Just outside the ring.
    const off = SCOPE_AIM * 1.5;
    expect(sighted(eye, { x: Math.cos(off) * 300, y: -20, z: Math.sin(off) * 300 }, where)).toBeNull();
  });
});
