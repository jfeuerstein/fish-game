import { describe, expect, it } from 'vitest';
import type { Catch } from '../fishing/fish';
import { PEARL_EVERY, TANK_SPECIES, givable, give } from './aquarium';
import { newSave, parseSave } from './save';

const fish = (species: string, variant: Catch['variant'] = 'normal'): Catch => ({ species, size: 20, variant, huge: false, at: 0 });

describe('the aquarium', () => {
  it('takes one of each kind, the plainest, and no odds and ends', () => {
    const save = newSave();
    save.bag = [fish('sardine', 'golden'), fish('sardine'), fish('boot'), fish('trout')];
    expect(givable(save)).toEqual([1, 3]);
    const got = give(save, 1)!;
    expect(got.species).toBe('sardine');
    expect(save.aquarium).toEqual(['sardine']);
    expect(save.bag.length).toBe(3);
    // It has a sardine now: the golden one is not wanted.
    expect(givable(save).map((i) => save.bag[i].species)).toEqual(['trout']);
    expect(give(save, 0)).toBeNull();
    expect(give(save, 1)).toBeNull();
  });

  it('pays over the odds, and a pearl every few kinds', () => {
    const save = newSave();
    const before = save.coins;
    let pearls = 0;
    for (const s of TANK_SPECIES.slice(0, PEARL_EVERY)) {
      save.bag = [fish(s.id)];
      pearls += give(save, 0)!.pearls;
    }
    expect(pearls).toBe(1);
    expect(save.tokens).toBe(1);
    expect(save.coins).toBeGreaterThan(before);
  });

  it('is kept in the save, without kinds that do not exist', () => {
    expect(parseSave(JSON.stringify({ aquarium: ['trout', 'nonsense', 'trout'] })).aquarium).toEqual(['trout']);
    expect(parseSave('{}').aquarium).toEqual([]);
  });
});
