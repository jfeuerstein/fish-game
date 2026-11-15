import { describe, expect, it } from 'vitest';
import { SPECIES } from '../fishing/fish';
import { BAITS, FURNITURE, HATS, RODS, levelFor, xpToNext } from './economy';
import { type Quest, advance, describe as say, done, makeQuest } from './quests';
import { claimQuest } from './progress';
import { backupFor, fromCode, newSave, parseSave, record, toCode } from './save';
import { bitesAt, hourAt, pinnedHour, rainingAt, watchOf } from './clock';

describe('economy', () => {
  it('climbs in price and level', () => {
    for (let i = 1; i < RODS.length; i++) {
      expect(RODS[i].price).toBeGreaterThan(RODS[i - 1].price);
      expect(RODS[i].power).toBeGreaterThan(RODS[i - 1].power);
    }
    // What is sold, that is: bait that is only found has no price or level to climb.
    const sold = BAITS.filter((b) => !b.found);
    for (let i = 1; i < sold.length; i++) expect(sold[i].level).toBeGreaterThanOrEqual(sold[i - 1].level);
  });
  it('turns experience into levels', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(xpToNext(1)).level).toBe(2);
    expect(levelFor(xpToNext(1) + xpToNext(2) + 5)).toMatchObject({ level: 3, into: 5 });
  });
  it('has unique ids for everything sold', () => {
    const ids = [...RODS, ...BAITS, ...HATS, ...FURNITURE].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('quests', () => {
  it('makes every kind of errand with words and a reward', () => {
    const kinds = new Set<string>();
    for (let n = 0; n < 300; n++) {
      const q = makeQuest(n, 12);
      kinds.add(q.kind);
      expect(q.goal).toBeGreaterThan(0);
      expect(q.reward.coins).toBeGreaterThan(0);
      expect(say(q).length).toBeGreaterThan(5);
      if (q.species) expect(SPECIES.find((s) => s.id === q.species)).toBeTruthy();
    }
    expect(kinds.size).toBe(9);
  });
  it('counts catches toward errands', () => {
    let q: Quest = { ...makeQuest(0, 1), kind: 'count', goal: 2, progress: 0 };
    const fish = { species: 'trout', size: 30, variant: 'normal' as const, huge: false, at: 0 };
    q = advance(q, { type: 'catch', fish, zone: 'creek', night: false, raining: false });
    expect(done(q)).toBe(false);
    q = advance(q, { type: 'catch', fish, zone: 'creek', night: false, raining: false });
    expect(done(q)).toBe(true);
    const junk = advance({ ...q, progress: 0 }, { type: 'catch', fish: { ...fish, species: 'boot' }, zone: 'creek', night: false, raining: false });
    expect(junk.progress).toBe(0);
  });
});

describe('save', () => {
  it('survives nonsense', () => {
    expect(parseSave(null).coins).toBe(newSave().coins);
    expect(parseSave('not json').rod).toBe('rod-1');
    expect(parseSave('{"coins":-5,"bag":[{"species":"nope"},{"species":"trout","size":30}]}')).toMatchObject({ coins: 0, bag: [{ species: 'trout', size: 30 }] });
  });
  it('reads errands whole or not at all, so one can always be handed in', () => {
    const good = newSave();
    // An errand with no reward, one of no known kind, and one for a fish that does not exist.
    const broken = JSON.stringify({ ...good, quests: [{ id: 1, kind: 'count', goal: 3, progress: 3 }, { id: 2, kind: 'dance', goal: 1, progress: 0, reward: { coins: 5, xp: 5 }, from: 'Gus' }, { id: 3, kind: 'species', species: 'kraken', goal: 1, progress: 0, reward: { coins: 5, xp: 5 }, from: 'Gus' }] });
    const s = parseSave(broken);
    expect(s.quests).toHaveLength(3);
    for (const q of s.quests) {
      expect(typeof q.reward.coins).toBe('number');
      q.progress = q.goal;
      expect(() => claimQuest(s, q.id)).not.toThrow();
    }
    // A sound set of errands is kept as it was.
    const kept = parseSave(JSON.stringify(good));
    expect(kept.quests).toEqual(good.quests);
  });
  it('keeps a copy once a day, of a real save only, and never a blank one over one with fish in it', () => {
    const played = newSave();
    played.stats.caught = 12;
    played.xp = 300;
    const text = JSON.stringify(played);
    // No copy yet: one is made.
    const first = backupFor(text, null, 100);
    expect(first.text).toBe(text);
    expect(JSON.parse(first.backup!)).toEqual({ day: 100, save: text });
    // The same day: left alone. The next day: made again.
    expect(backupFor(text, first.backup, 100).backup).toBeNull();
    expect(JSON.parse(backupFor(text, first.backup, 101).backup!).day).toBe(101);
    // The save is lost or broken: the copy is played from, and is not written over.
    expect(backupFor(null, first.backup, 101)).toEqual({ text, backup: null });
    expect(backupFor('{broken', first.backup, 101)).toEqual({ text, backup: null });
    // Something that parses but is not a save, or a blank save, does not replace a copy with fish in it.
    expect(backupFor('{}', first.backup, 101).backup).toBeNull();
    expect(backupFor(JSON.stringify(newSave()), first.backup, 101).backup).toBeNull();
    // A copy that cannot be read is replaced.
    expect(backupFor(text, '{broken', 101).backup).not.toBeNull();
    // Nothing anywhere: a new game.
    expect(backupFor(null, null, 101)).toEqual({ text: null, backup: null });
  });
  it('round-trips through a save code', () => {
    const s = newSave();
    s.coins = 1234;
    s.hats.push('hat-top');
    expect(fromCode(toCode(s))).toMatchObject({ coins: 1234, hats: ['hat-top'] });
    expect(fromCode('???')).toBeNull();
  });
  it('records the journal', () => {
    const s = newSave();
    expect(record(s, { species: 'koi', size: 40, variant: 'normal', huge: false, at: 1 }).first).toBe(true);
    const r = record(s, { species: 'koi', size: 50, variant: 'shiny', huge: false, at: 2 });
    expect(r).toEqual({ first: false, best: true, newVariant: true });
    expect(s.journal.koi.count).toBe(2);
  });
});

describe('clock', () => {
  it('runs a day in 24 minutes and knows its watches', () => {
    expect(hourAt(0, 'island')).toBe(8);
    expect(hourAt(60_000 * 4, 'island')).toBe(12);
    expect(watchOf(6)).toBe('dawn');
    expect(watchOf(13)).toBe('day');
    expect(watchOf(19)).toBe('dusk');
    expect(watchOf(2)).toBe('night');
    expect(bitesAt('twilight', 19)).toBe(true);
    expect(bitesAt('night', 12)).toBe(false);
    expect(pinnedHour('dusk')).toBeCloseTo(19.2);
  });
  it('rains some of the time', () => {
    let wet = 0;
    for (let h = 0; h < 2000; h++) if (rainingAt(h * 60_000, 'island')) wet++;
    expect(wet / 2000).toBeGreaterThan(0.1);
    expect(wet / 2000).toBeLessThan(0.4);
  });
});
