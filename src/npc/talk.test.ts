import { describe, expect, it } from 'vitest';
import { FRESH_CATCH, NAMES, NEIGHBOURS, boast, doFavour, favourFish, favourInBag, favourPays, favoursOpen, spotWords, talk, type TalkFacts, type Who } from './talk';
import { bountyFor } from '../game/bounty';
import { parseSave, type Save } from '../game/save';
import { BY_ID, SPECIES, type Catch } from '../fishing/fish';
import { TITLES } from '../game/titles';

const EVERYONE: Who[] = [...NEIGHBOURS, 'npc-pelican'];
const LINES = ['One.', 'Two.', 'Three.'];
const facts = (more: Partial<TalkFacts> = {}): TalkFacts => ({ day: 20500, now: 1_000_000, raining: false, night: false, caught: null, ...more });
const fish = (species: string, more: Partial<Catch> = {}): Catch => {
  const s = BY_ID[species];
  return { species, size: (s.size[0] + s.size[1]) / 2, variant: 'normal', huge: false, at: 1_000_000, ...more };
};
/** Everything someone says in a day, until they are down to their own lines. */
function allDay(save: Save, who: Who, f: TalkFacts): string[] {
  const out: string[] = [];
  for (let i = 0; i < 20; i++) {
    const said = talk(save, who, f, LINES, i).text;
    if (LINES.includes(said)) break;
    out.push(said);
  }
  return out;
}

describe('what the islanders say', () => {
  it('says hello once, and then never again', () => {
    for (const who of EVERYONE) {
      const save = parseSave(null);
      expect(talk(save, who, facts(), LINES, 0).text).toContain(NAMES[who]);
      expect(save.met).toContain(who);
      expect(allDay(save, who, facts()).some((t) => t.includes(`I'm ${NAMES[who]}`))).toBe(false);
    }
  });

  it('has each neighbour ask a favour, boast, and say where the bounty is, once a day, then fall back on their own lines', () => {
    for (const who of NEIGHBOURS) {
      const save = parseSave(null);
      save.met = [who];
      const said = allDay(save, who, facts());
      const wanted = bountyFor(20500);
      const ask = favourFish(who, 0);
      const b = boast(who, 20500);
      expect(said.some((t) => t.includes(wanted.name)), `${who} on the bounty`).toBe(true);
      expect(said.some((t) => t.includes(ask.name)), `${who} asking`).toBe(true);
      expect(said.some((t) => t.includes(b.fish.name)), `${who} boasting`).toBe(true);
      // The same day again: nothing new.
      expect(allDay(save, who, facts())).toEqual([]);
      expect(talk(save, who, facts(), LINES, 4).text).toBe('Two.');
      // The next day it is all said afresh.
      expect(allDay(save, who, facts({ day: 20501 })).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps every line short enough for a bubble, and never leaves a gap in one', () => {
    for (const who of EVERYONE) {
      const save = parseSave(null);
      save.hat = 'hat-crown';
      const said = [talk(save, who, facts(), LINES, 0).text, ...allDay(save, who, facts({ raining: true, night: true, caught: fish('sardine') }))];
      for (const t of said) {
        expect(t.length, t).toBeGreaterThan(5);
        expect(t.length, t).toBeLessThanOrEqual(92);
        expect(t).not.toMatch(/undefined|\$\{|  /);
      }
    }
  });

  it('remarks on a fish just landed, once, and not on one landed long ago', () => {
    for (const who of EVERYONE) {
      const save = parseSave(null);
      save.met = [who];
      // A golden one, so that the remark cannot be mistaken for a favour or a boast about the same fish.
      const c = fish('sardine', { variant: 'golden' });
      expect(talk(save, who, facts({ caught: c }), LINES, 0).text).toMatch(/golden|sparkles/);
      expect(talk(save, who, facts({ caught: c }), LINES, 0).text).not.toMatch(/golden|sparkles/);
      const old = parseSave(null);
      old.met = [who];
      expect(allDay(old, who, facts({ caught: fish('sardine', { variant: 'golden', at: 1_000_000 - FRESH_CATCH - 1 }) })).some((t) => /golden|sparkles/.test(t))).toBe(false);
    }
  });

  it('has something of its own to say for a legend, a golden fish and a boot', () => {
    const legend = SPECIES.find((s) => s.tier === 'legendary')!;
    const junk = SPECIES.find((s) => s.tier === 'junk')!;
    for (const who of EVERYONE) {
      const lines = [fish(legend.id), fish('sardine', { variant: 'golden' }), fish(junk.id), fish('sardine', { huge: true }), fish('sardine')].map((c) => {
        const save = parseSave(null);
        save.met = [who];
        return talk(save, who, facts({ caught: c }), LINES, 0).text;
      });
      expect(new Set(lines).size, who).toBe(5);
    }
  });

  it('notices a hat', () => {
    const save = parseSave(null);
    save.met = ['npc-duck', 'npc-beaver'];
    save.hat = 'hat-duck';
    expect(allDay(save, 'npc-duck', facts()).some((t) => t.includes('On your head'))).toBe(true);
    save.hat = 'hat-straw';
    expect(allDay(save, 'npc-beaver', facts()).some((t) => t.includes('straw hat'))).toBe(true);
  });

  it('asks for ordinary fish from the neighbour\'s own waters, a new one each time', () => {
    for (const who of NEIGHBOURS) {
      for (let done = 0; done < 30; done++) {
        const f = favourFish(who, done);
        expect(['common', 'uncommon']).toContain(f.tier);
        expect(f.rain).toBeFalsy();
        if (done) expect(f.id).not.toBe(favourFish(who, done - 1).id);
        expect(spotWords(f).length).toBeGreaterThan(5);
      }
    }
  });

  it('takes the fish asked for out of the bag and pays for it, with a pearl every third time', () => {
    const save = parseSave(null);
    const who = 'npc-beaver';
    save.met = [who];
    save.coins = 0;
    expect(doFavour(save, who)).toBeNull();
    for (let n = 0; n < 3; n++) {
      const want = favourFish(who, n);
      save.bag = [fish('sardine'), fish(want.id), fish(want.id)];
      expect(favourInBag(save, who)).toBe(1);
      const before = { coins: save.coins, tokens: save.tokens };
      const r = doFavour(save, who)!;
      expect(r.did).toEqual({ kind: 'favour', ...favourPays(want, n) });
      expect(save.bag.length).toBe(2);
      expect(save.coins).toBe(before.coins + favourPays(want, n).coins);
      expect(save.tokens).toBe(before.tokens + (n === 2 ? 1 : 0));
      expect(save.favours[who]).toBe(n + 1);
      expect(r.text.length).toBeLessThanOrEqual(92);
    }
    // A golden one is never taken, and of two ordinary ones the smaller goes.
    const want = favourFish(who, 3);
    save.bag = [fish(want.id, { variant: 'golden' })];
    expect(favourInBag(save, who)).toBe(-1);
    save.bag = [fish(want.id, { variant: 'golden' }), fish(want.id, { size: want.size[1] }), fish(want.id, { size: want.size[0] })];
    expect(favourInBag(save, who)).toBe(2);
    // Someone not yet met has asked for nothing.
    const stranger = parseSave(null);
    stranger.bag = [fish(favourFish('npc-duck', 0).id)];
    expect(favourInBag(stranger, 'npc-duck')).toBe(-1);
    expect(favoursOpen(stranger)).toEqual([]);
    expect(favoursOpen(save).map((f) => f.name)).toEqual(['Birch']);
  });

  it('counts a boast beaten once a day, when the player has landed a bigger one', () => {
    const save = parseSave(null);
    const who = 'npc-duck';
    save.met = [who];
    const b = boast(who, 20500);
    expect(b.size).toBeGreaterThan(b.fish.size[0]);
    expect(b.size).toBeLessThan(b.fish.size[1]);
    expect(allDay(save, who, facts()).some((t) => t.includes('Beat that'))).toBe(true);
    expect(save.rivalWins).toBe(0);
    save.journal[b.fish.id] = { count: 1, best: b.size + 1, variants: ['normal'], first: 0 } as never;
    const next = allDay(save, who, facts());
    expect(next.some((t) => t.includes('You beat my'))).toBe(true);
    expect(save.rivalWins).toBe(1);
    expect(allDay(save, who, facts())).toEqual([]);
    expect(save.rivalWins).toBe(1);
  });

  it('is kept in the save, and worth titles', () => {
    const save = parseSave(JSON.stringify({ v: 1, met: ['npc-duck'], favours: { 'npc-duck': 5, bad: 'x' }, talk: { day: 3, said: ['a'] }, rivalWins: 10 }));
    expect(save.met).toEqual(['npc-duck']);
    expect(save.favours).toEqual({ 'npc-duck': 5 });
    expect(save.talk).toEqual({ day: 3, said: ['a'] });
    expect(TITLES.find((t) => t.name === 'Good Neighbour')!.earned(save)).toBe(true);
    expect(TITLES.find((t) => t.name === 'Top Rod')!.earned(save)).toBe(true);
    const blank = parseSave(null);
    expect(blank.met).toEqual([]);
    expect(TITLES.find((t) => t.name === 'Good Neighbour')!.earned(blank)).toBe(false);
  });
});
