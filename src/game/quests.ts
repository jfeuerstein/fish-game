// The notice board's errands. Pure.
import { rng } from '../core/rng';
import { BY_ID, type Catch, SPECIES, type Tier } from '../fishing/fish';
import type { Zone } from '../world/island';

export type QuestKind = 'count' | 'zone' | 'species' | 'size' | 'shiny' | 'night' | 'tier' | 'sell' | 'rain';

export interface Quest {
  id: number;
  kind: QuestKind;
  /** How many (or how many centimetres, or coins). */
  goal: number;
  progress: number;
  zone?: Zone;
  species?: string;
  tier?: Tier;
  reward: { coins: number; xp: number };
  /** Who pinned it up. */
  from: string;
}

const NAMES = ['Gus', 'Puddle', 'Birch', 'Juniper', 'the lighthouse keeper', 'a kid from the village', 'Old Mae', 'the baker'];
const ZONES: Zone[] = ['ocean', 'deep', 'pond', 'creek'];

/** A fresh errand. `n` is how many have been handed out before, so each one differs. */
export function makeQuest(n: number, level: number): Quest {
  const r = rng(9001 + n * 7919);
  const from = NAMES[Math.floor(r() * NAMES.length)];
  const scale = 1 + Math.min(level, 20) * 0.08;
  const kinds: QuestKind[] = ['count', 'zone', 'species', 'species', 'size', 'night', 'sell', 'tier'];
  if (level >= 3) kinds.push('shiny', 'rain');
  const kind = kinds[Math.floor(r() * kinds.length)];
  const base = { id: n, kind, progress: 0, from };
  switch (kind) {
    case 'count': {
      const goal = 4 + Math.floor(r() * 5);
      return { ...base, goal, reward: { coins: Math.round(goal * 18 * scale), xp: goal * 6 } };
    }
    case 'zone': {
      const zone = ZONES[Math.floor(r() * (level >= 4 ? 4 : 3))];
      const goal = 3 + Math.floor(r() * 3);
      return { ...base, zone, goal, reward: { coins: Math.round(goal * 26 * scale), xp: goal * 8 } };
    }
    case 'species': {
      const pool = SPECIES.filter((s) => (s.tier === 'common' || s.tier === 'uncommon' || (level >= 6 && s.tier === 'rare')) && !s.rain && (level >= 4 || !s.zones.every((z) => z === 'deep')));
      const s = pool[Math.floor(r() * pool.length)];
      const mult = s.tier === 'common' ? 1 : s.tier === 'uncommon' ? 2 : 4;
      return { ...base, species: s.id, goal: 1, reward: { coins: Math.round(60 * mult * scale), xp: 20 * mult } };
    }
    case 'size': {
      const goal = [40, 50, 60, 80][Math.floor(r() * (level >= 5 ? 4 : 2))];
      return { ...base, goal, reward: { coins: Math.round(goal * 2.6 * scale), xp: goal } };
    }
    case 'shiny':
      return { ...base, goal: 1, reward: { coins: Math.round(260 * scale), xp: 80 } };
    case 'night': {
      const goal = 3 + Math.floor(r() * 3);
      return { ...base, goal, reward: { coins: Math.round(goal * 30 * scale), xp: goal * 10 } };
    }
    case 'rain': {
      const goal = 2 + Math.floor(r() * 3);
      return { ...base, goal, reward: { coins: Math.round(goal * 40 * scale), xp: goal * 12 } };
    }
    case 'tier': {
      const tier: Tier = level >= 8 && r() < 0.4 ? 'epic' : 'rare';
      return { ...base, tier, goal: 1, reward: { coins: Math.round((tier === 'epic' ? 700 : 240) * scale), xp: tier === 'epic' ? 150 : 60 } };
    }
    case 'sell': {
      const goal = Math.round((150 + Math.floor(r() * 4) * 75) * scale / 25) * 25;
      return { ...base, goal, reward: { coins: Math.round(goal * 0.35), xp: Math.round(goal / 6) } };
    }
  }
}

/** What happened, as far as errands care. */
export type QuestEvent = { type: 'catch'; fish: Catch; zone: Zone; night: boolean; raining: boolean } | { type: 'sell'; coins: number };

const RANK: Tier[] = ['junk', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Move each errand on by an event. */
export function advance(q: Quest, e: QuestEvent): Quest {
  if (q.progress >= q.goal) return q;
  let add = 0;
  if (e.type === 'sell') add = q.kind === 'sell' ? e.coins : 0;
  else {
    const s = BY_ID[e.fish.species];
    const real = s && s.tier !== 'junk';
    switch (q.kind) {
      case 'count': add = real ? 1 : 0; break;
      case 'zone': add = real && e.zone === q.zone ? 1 : 0; break;
      case 'species': add = e.fish.species === q.species ? 1 : 0; break;
      case 'size': return real && e.fish.size >= q.goal ? { ...q, progress: q.goal } : q;
      case 'shiny': add = e.fish.variant !== 'normal' ? 1 : 0; break;
      case 'night': add = real && e.night ? 1 : 0; break;
      case 'rain': add = real && e.raining ? 1 : 0; break;
      case 'tier': add = s && q.tier && RANK.indexOf(s.tier) >= RANK.indexOf(q.tier) ? 1 : 0; break;
      case 'sell': add = 0; break;
    }
  }
  return add ? { ...q, progress: Math.min(q.goal, q.progress + add) } : q;
}

export const done = (q: Quest): boolean => q.progress >= q.goal;

const ZONE_WORDS: Record<Zone, string> = { ocean: 'in the sea', deep: 'out in deep water', pond: 'in the pond', creek: 'in the creek' };

/** What the note on the board says. */
export function describe(q: Quest): string {
  switch (q.kind) {
    case 'count': return `Catch ${q.goal} fish, any kind.`;
    case 'zone': return `Catch ${q.goal} fish ${ZONE_WORDS[q.zone!]}.`;
    case 'species': return `Bring me a ${BY_ID[q.species!]?.name ?? 'fish'}, please!`;
    case 'size': return `Catch a fish at least ${q.goal} cm long.`;
    case 'shiny': return 'Catch a shiny fish. They sparkle!';
    case 'night': return `Catch ${q.goal} fish after dark.`;
    case 'rain': return `Catch ${q.goal} fish while it rains.`;
    case 'tier': return `Catch something ${q.tier === 'epic' ? 'epic' : 'rare'} or better.`;
    case 'sell': return `Sell ${q.goal} coins' worth of fish.`;
  }
}

/** Every third errand finished earns a hat from the board's lost and found. */
export const GIFT_EVERY = 3;
