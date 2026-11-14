// The save: everything the player has, read defensively. Pure.
import { type Catch, type Variant, BY_ID } from '../fishing/fish';
import { type Quest, makeQuest } from './quests';

export interface JournalEntry {
  count: number;
  /** Longest, in centimetres. */
  best: number;
  variants: Variant[];
  first: number;
}

export interface PlacedThing {
  id: string;
  x: number;
  z: number;
  yaw: number;
}

export interface Settings {
  music: number;
  sfx: number;
  ambience: number;
  clock: 'island' | 'real';
  quality: 'high' | 'low';
}

export interface Save {
  v: 1;
  coins: number;
  /** Tokens from shiny and golden fish, for opening chests. */
  tokens: number;
  xp: number;
  /** Characters unlocked (from chests). */
  characters: string[];
  rod: string;
  rods: string[];
  bait: string;
  baits: Record<string, number>;
  bag: Catch[];
  cooler: number;
  journal: Record<string, JournalEntry>;
  character: string;
  hat: string | null;
  hats: string[];
  furniture: Record<string, number>;
  placed: PlacedThing[];
  quests: Quest[];
  questsMade: number;
  questsDone: number;
  boat: boolean;
  stats: { caught: number; earned: number; snapped: number; played: number };
  settings: Settings;
  hints: string[];
}

export const SAVE_KEY = 'cove.save';
export const CHALK_KEY = 'cove.chalk';

export function newSave(): Save {
  return {
    v: 1,
    coins: 50,
    tokens: 0,
    xp: 0,
    characters: ['char-otter'],
    rod: 'rod-1',
    rods: ['rod-1'],
    bait: 'bait-worm',
    baits: {},
    bag: [],
    cooler: 0,
    journal: {},
    character: 'char-otter',
    hat: null,
    hats: [],
    furniture: {},
    placed: [],
    quests: [makeQuest(0, 1), makeQuest(1, 1), makeQuest(2, 1)],
    questsMade: 3,
    questsDone: 0,
    boat: false,
    stats: { caught: 0, earned: 0, snapped: 0, played: 0 },
    settings: { music: 0.6, sfx: 0.8, ambience: 0.7, clock: 'island', quality: 'high' },
    hints: [],
  };
}

const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, d: string): string => (typeof v === 'string' ? v : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function readCatch(v: unknown): Catch | null {
  const o = rec(v);
  if (typeof o.species !== 'string' || !BY_ID[o.species]) return null;
  const variant = o.variant === 'shiny' || o.variant === 'golden' ? o.variant : 'normal';
  return { species: o.species, size: num(o.size, 10, 0), variant, huge: o.huge === true, at: num(o.at, 0) };
}

/** Read a save from text. Anything missing or broken is filled in from a new save; nothing throws. */
export function parseSave(text: string | null): Save {
  const fresh = newSave();
  if (!text) return fresh;
  let o: Record<string, unknown>;
  try {
    o = rec(JSON.parse(text));
  } catch {
    return fresh;
  }
  const journal: Record<string, JournalEntry> = {};
  for (const [id, e] of Object.entries(rec(o.journal))) {
    if (!BY_ID[id]) continue;
    const j = rec(e);
    journal[id] = { count: num(j.count, 1, 0), best: num(j.best, 0, 0), variants: strs(j.variants).filter((x): x is Variant => x === 'normal' || x === 'shiny' || x === 'golden'), first: num(j.first, 0) };
  }
  const baits: Record<string, number> = {};
  for (const [id, n] of Object.entries(rec(o.baits))) baits[id] = Math.floor(num(n, 0, 0));
  const furniture: Record<string, number> = {};
  for (const [id, n] of Object.entries(rec(o.furniture))) furniture[id] = Math.floor(num(n, 0, 0));
  const placed = (Array.isArray(o.placed) ? o.placed : [])
    .map((p) => rec(p))
    .filter((p) => typeof p.id === 'string')
    .map((p) => ({ id: p.id as string, x: num(p.x, 0), z: num(p.z, 0), yaw: num(p.yaw, 0) }));
  const quests = (Array.isArray(o.quests) ? o.quests : []).map((q) => rec(q)).filter((q) => typeof q.kind === 'string' && typeof q.goal === 'number') as unknown as Quest[];
  const s = rec(o.settings);
  const st = rec(o.stats);
  const rods = strs(o.rods);
  return {
    v: 1,
    coins: Math.floor(num(o.coins, fresh.coins, 0)),
    tokens: Math.floor(num(o.tokens, 0, 0)),
    xp: Math.floor(num(o.xp, 0, 0)),
    characters: [...new Set(['char-otter', ...strs(o.characters)])],
    rod: str(o.rod, 'rod-1'),
    rods: rods.includes('rod-1') ? rods : ['rod-1', ...rods],
    bait: str(o.bait, 'bait-worm'),
    baits,
    bag: (Array.isArray(o.bag) ? o.bag : []).map(readCatch).filter((c): c is Catch => c !== null),
    cooler: Math.floor(num(o.cooler, 0, 0, 3)),
    journal,
    character: str(o.character, 'char-otter'),
    hat: typeof o.hat === 'string' ? o.hat : null,
    hats: strs(o.hats),
    furniture,
    placed,
    quests: quests.length === 3 ? quests : fresh.quests,
    questsMade: Math.floor(num(o.questsMade, 3, 3)),
    questsDone: Math.floor(num(o.questsDone, 0, 0)),
    boat: o.boat === true,
    stats: { caught: num(st.caught, 0, 0), earned: num(st.earned, 0, 0), snapped: num(st.snapped, 0, 0), played: num(st.played, 0, 0) },
    settings: {
      music: num(s.music, fresh.settings.music, 0, 1),
      sfx: num(s.sfx, fresh.settings.sfx, 0, 1),
      ambience: num(s.ambience, fresh.settings.ambience, 0, 1),
      clock: s.clock === 'real' ? 'real' : 'island',
      quality: s.quality === 'low' ? 'low' : 'high',
    },
    hints: strs(o.hints),
  };
}

/** A save as a code that can be copied out and pasted back. */
export function toCode(save: Save): string {
  const json = JSON.stringify(save);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromCode(code: string): Save | null {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    JSON.parse(text);
    return parseSave(text);
  } catch {
    return null;
  }
}

/** Add a catch to the journal. Returns whether it is the first of its kind. */
export function record(save: Save, c: Catch): { first: boolean; best: boolean; newVariant: boolean } {
  const e = save.journal[c.species];
  if (!e) {
    save.journal[c.species] = { count: 1, best: c.size, variants: [c.variant], first: c.at };
    return { first: true, best: true, newVariant: c.variant !== 'normal' };
  }
  e.count++;
  const best = c.size > e.best;
  if (best) e.best = c.size;
  const newVariant = !e.variants.includes(c.variant);
  if (newVariant) e.variants.push(c.variant);
  return { first: false, best, newVariant };
}
