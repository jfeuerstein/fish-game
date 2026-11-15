import { describe, expect, it } from 'vitest';
import { CAMP_REACH, campKinds, campMade } from './camp';
import { FURNITURE } from './economy';
import { TITLES } from './titles';

const at = (id: string, x = 0, z = 0) => ({ id, x, z });

describe('the campsite', () => {
  it('has a catalogue to make one from: a tent, a fire, seats, and more besides', () => {
    const camp = FURNITURE.filter((f) => f.camp);
    expect(camp.length).toBeGreaterThanOrEqual(12);
    expect(camp.some((f) => f.id === 'f-tent')).toBe(true);
    expect(camp.some((f) => f.fire)).toBe(true);
    expect(camp.filter((f) => f.seat).length).toBeGreaterThanOrEqual(3);
    // Everything in it is sold for coins: a camp is not won at the arcade.
    for (const f of camp) {
      expect(f.prize, f.id).toBeFalsy();
      expect(f.price, f.id).toBeGreaterThan(0);
    }
  });

  it('is a tent with a fire and a seat beside it', () => {
    expect(campMade([])).toBe(false);
    expect(campMade([at('f-tent'), at('f-firepit', 2)])).toBe(false);
    expect(campMade([at('f-tent'), at('f-stump', 2)])).toBe(false);
    expect(campMade([at('f-firepit'), at('f-stump', 2)])).toBe(false);
    expect(campMade([at('f-tent'), at('f-firepit', 2), at('f-stump', 0, 3)])).toBe(true);
    expect(campMade([at('f-tent'), at('f-firepit', 2), at('f-chair', 0, 3)])).toBe(true);
  });

  it('wants them close together', () => {
    expect(campMade([at('f-tent'), at('f-firepit', CAMP_REACH + 1), at('f-stump', 1)])).toBe(false);
    expect(campMade([at('f-tent'), at('f-firepit', 60), at('f-stump', 1), at('f-tent', 59), at('f-chair', 61)])).toBe(true);
  });

  it('counts the different camp things round a tent, not the same thing twice or things that are not camp', () => {
    expect(campKinds([at('f-firepit'), at('f-stump')])).toBe(0);
    expect(campKinds([at('f-tent'), at('f-stump', 1), at('f-stump', 2), at('f-flamingo', 1), at('f-lights', 3)])).toBe(3);
  });

  it('is worth a title', () => {
    const camper = TITLES.find((t) => t.name === 'Happy Camper')!;
    const blank = { placed: [] } as never;
    const made = { placed: [at('f-tent'), at('f-firepit', 2), at('f-bedroll', 0, 2)] } as never;
    expect(camper.earned(blank)).toBe(false);
    expect(camper.earned(made)).toBe(true);
  });
});
