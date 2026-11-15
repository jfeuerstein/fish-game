import { describe, expect, it } from 'vitest';
import { BOUNTY_FISH, BOUNTY_PAYS, bountyFor, bountyPrize, calendarDay, isBounty, whereabouts } from './bounty';
import { sell } from './progress';
import { parseSave } from './save';
import { valueOf, type Catch } from '../fishing/fish';

const a = (species: string): Catch => {
  const s = BOUNTY_FISH.find((f) => f.id === species)!;
  return { species, size: (s.size[0] + s.size[1]) / 2, variant: 'normal', huge: false, at: 0 };
};

describe("the day's bounty", () => {
  it('asks only for fish that can be caught any day: no odds and ends, no legends, none that want rain', () => {
    expect(BOUNTY_FISH.length).toBeGreaterThan(20);
    for (const f of BOUNTY_FISH) {
      expect(f.tier).not.toBe('junk');
      expect(f.tier).not.toBe('legendary');
      expect(f.rain).toBeFalsy();
    }
  });

  it('is one fish all day and another the next', () => {
    const seen = new Set<string>();
    for (let day = 20000; day < 20400; day++) {
      const f = bountyFor(day);
      expect(bountyFor(day)).toBe(f);
      expect(f.id).not.toBe(bountyFor(day - 1).id);
      seen.add(f.id);
    }
    // Every fish that can be asked for comes round.
    expect(seen.size).toBe(BOUNTY_FISH.length);
    // And once before any comes round again: in any stretch as long as the list, at most a couple repeat (across two rounds).
    const stretch = new Set<string>();
    const from = Math.ceil(20000 / BOUNTY_FISH.length) * BOUNTY_FISH.length;
    for (let day = from; day < from + BOUNTY_FISH.length; day++) stretch.add(bountyFor(day).id);
    expect(stretch.size).toBe(BOUNTY_FISH.length);
  });

  it('goes by the calendar where the player is', () => {
    const noon = Date.UTC(2026, 10, 15, 12);
    expect(calendarDay(noon, 0)).toBe(calendarDay(noon + 6 * 3600_000, 0));
    expect(calendarDay(noon + 13 * 3600_000, 0)).toBe(calendarDay(noon, 0) + 1);
    // Eleven at night in New York (five hours behind) is still the day before in New York.
    expect(calendarDay(Date.UTC(2026, 10, 16, 4), 300)).toBe(calendarDay(noon, 300));
  });

  it('pays double for the day\'s fish, and a bounty for the first, once', () => {
    const day = 20500;
    const wanted = bountyFor(day);
    const other = BOUNTY_FISH.find((f) => f.id !== wanted.id)!;
    const save = parseSave(null);
    save.coins = 0;
    save.bag = [a(wanted.id), a(other.id), a(wanted.id)];
    const usual = save.bag.map(valueOf);
    const first = sell(save, [0], day);
    expect(first.bounty).toBe(bountyPrize(wanted));
    expect(first.coins).toBe(usual[0] * BOUNTY_PAYS + bountyPrize(wanted));
    expect(save.bounty).toEqual({ filled: day, count: 1 });
    // The rest of the bag: the other at its usual price, the second wanted one double, no second bounty.
    const rest = sell(save, undefined, day);
    expect(rest.bounty).toBe(0);
    expect(rest.coins).toBe(usual[1] + usual[2] * BOUNTY_PAYS);
    expect(save.coins).toBe(first.coins + rest.coins);
    // Tomorrow it is another fish, and there is a bounty again.
    expect(isBounty(wanted.id, day + 1)).toBe(false);
    save.bag = [a(bountyFor(day + 1).id)];
    expect(sell(save, undefined, day + 1).bounty).toBeGreaterThan(0);
    expect(save.bounty.count).toBe(2);
  });

  it('pays the usual price when no day is given, and nothing is filled', () => {
    const save = parseSave(null);
    save.bag = [a(bountyFor(20500).id)];
    const worth = valueOf(save.bag[0]);
    const r = sell(save);
    expect(r.coins).toBe(worth);
    expect(r.bounty).toBe(0);
    expect(save.bounty.filled).toBe(-1);
  });

  it('is kept in the save, and an old save has none filled', () => {
    expect(parseSave(null).bounty).toEqual({ filled: -1, count: 0 });
    expect(parseSave(JSON.stringify({ v: 1, bounty: { filled: 20500, count: 4 } })).bounty).toEqual({ filled: 20500, count: 4 });
    expect(parseSave(JSON.stringify({ v: 1, bounty: 'nonsense' })).bounty).toEqual({ filled: -1, count: 0 });
  });

  it('says where to look, and is worth more for a rarer fish', () => {
    for (const f of BOUNTY_FISH) expect(whereabouts(f)).toMatch(/ · /);
    const cheap = BOUNTY_FISH.reduce((x, y) => (x.value < y.value ? x : y));
    const dear = BOUNTY_FISH.reduce((x, y) => (x.value > y.value ? x : y));
    expect(bountyPrize(dear)).toBeGreaterThan(bountyPrize(cheap));
    expect(bountyPrize(cheap)).toBeGreaterThanOrEqual(40);
  });
});
