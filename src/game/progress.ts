// What a catch, a sale or a purchase does to the save. Pure: takes the save, changes it, and
// says what happened so it can be announced.
import { BY_ID, type Catch, VARIANT_XP, valueOf } from '../fishing/fish';
import type { Zone } from '../world/island';
import { tokensFor } from './crates';
import { COOLERS, TIER_XP, levelFor } from './economy';
import { GIFT_EVERY, type QuestEvent, advance, done, makeQuest } from './quests';
import { type Save, record } from './save';

export interface CatchResult {
  first: boolean;
  best: boolean;
  xp: number;
  levelUp: number | null;
  tokens: number;
  value: number;
  /** Errands finished by this catch. */
  finished: number[];
  /** Whether it went into the cooler (junk with no value is thrown back). */
  kept: boolean;
}

export function addXp(save: Save, xp: number): number | null {
  const before = levelFor(save.xp).level;
  save.xp += xp;
  const after = levelFor(save.xp).level;
  return after > before ? after : null;
}

export function applyCatch(save: Save, c: Catch, zone: Zone, night: boolean, raining: boolean): CatchResult {
  const s = BY_ID[c.species];
  const rec = record(save, c);
  const xp = Math.round(TIER_XP[s.tier] * VARIANT_XP[c.variant] * (rec.first ? 2 : 1) * (1 + Math.min(1, c.size / 400) * 0.5));
  const levelUp = addXp(save, xp);
  const tokens = tokensFor(c.variant, rec.first && s.tier === 'legendary');
  save.tokens += tokens;
  save.stats.caught++;
  // Bait is used up by a catch (worms never run out).
  if (save.bait !== 'bait-worm') {
    save.baits[save.bait] = Math.max(0, (save.baits[save.bait] ?? 0) - 1);
    if (save.baits[save.bait] === 0) save.bait = 'bait-worm';
  }
  const kept = save.bag.length < COOLERS[save.cooler].capacity;
  if (kept) save.bag.push(c);
  const finished = questsFor(save, { type: 'catch', fish: c, zone, night, raining });
  return { first: rec.first, best: rec.best, xp, levelUp, tokens, value: valueOf(c), finished, kept };
}

function questsFor(save: Save, e: QuestEvent): number[] {
  const finished: number[] = [];
  save.quests = save.quests.map((q) => {
    const was = done(q);
    const n = advance(q, e);
    if (!was && done(n)) finished.push(n.id);
    return n;
  });
  return finished;
}

/** Sell fish from the bag by index (all of them when none are given). Returns the coins made. */
export function sell(save: Save, which?: number[]): { coins: number; finished: number[] } {
  const pick = which ? new Set(which) : null;
  let coins = 0;
  save.bag = save.bag.filter((c, i) => {
    if (pick && !pick.has(i)) return true;
    coins += valueOf(c);
    return false;
  });
  save.coins += coins;
  save.stats.earned += coins;
  const finished = coins ? questsFor(save, { type: 'sell', coins }) : [];
  return { coins, finished };
}

/** Hand in a finished errand at the board: its reward, and a fresh errand in its place. */
export function claimQuest(save: Save, id: number): { coins: number; xp: number; levelUp: number | null; gift: boolean } | null {
  const i = save.quests.findIndex((q) => q.id === id);
  if (i < 0 || !done(save.quests[i])) return null;
  const q = save.quests[i];
  save.coins += q.reward.coins;
  const levelUp = addXp(save, q.reward.xp);
  save.questsDone++;
  const level = levelFor(save.xp).level;
  save.quests[i] = makeQuest(save.questsMade++, level);
  const gift = save.questsDone % GIFT_EVERY === 0;
  if (gift) save.tokens += 2;
  return { coins: q.reward.coins, xp: q.reward.xp, levelUp, gift };
}

/** Pay for something. False when there is not enough. */
export function spend(save: Save, coins: number): boolean {
  if (save.coins < coins) return false;
  save.coins -= coins;
  return true;
}
