// What the islanders have to say. Each has a voice of their own, and something to say about the
// player beyond a hint from a list: a hello the first time, a word about the fish just landed
// or the hat being worn, where the day's bounty might be found, a favour to ask (a fish they
// would like), and a boast to beat (the size of something they say they caught today). Pure:
// which thing is said next and what it does to the save.
import { BY_ID, SPECIES, VARIANT_LABEL, sayLength, valueOf, type Catch, type Species } from '../fishing/fish';
import { bountyFilled, bountyFor } from '../game/bounty';
import { EXTRAS, HATS } from '../game/economy';
import type { Save } from '../game/save';
import { chance } from '../look/skylife';

export type Who = 'npc-duck' | 'npc-beaver' | 'npc-bear' | 'npc-pelican';

/** The neighbours: the three who fish. (Gus keeps the shop, and has the day's bounty for a favour.) */
export const NEIGHBOURS: readonly Exclude<Who, 'npc-pelican'>[] = ['npc-duck', 'npc-beaver', 'npc-bear'];

export const NAMES: Record<Who, string> = { 'npc-duck': 'Puddle', 'npc-beaver': 'Birch', 'npc-bear': 'Juniper', 'npc-pelican': 'Gus' };

/** The waters each neighbour fishes, and so the fish they ask for and boast of. */
const WATERS: Record<Exclude<Who, 'npc-pelican'>, readonly string[]> = {
  'npc-duck': ['ocean', 'deep'],
  'npc-beaver': ['creek', 'pond'],
  'npc-bear': ['ocean', 'pond'],
};

/** "a Sardine", "an Eel". */
const a = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/** The same to begin a sentence with: "A Sardine". */
const A = (name: string): string => {
  const s = a(name);
  return s[0].toUpperCase() + s.slice(1);
};

/** Where to try for a fish, as someone would say it. */
export function spotWords(s: Species): string {
  const where: Record<string, string> = { ocean: 'off the beach or the pier', deep: 'off the end of the pier', pond: 'in the pond', creek: 'in the creek' };
  const when: Record<string, string> = { any: '', day: ' by day', night: ' after dark', twilight: ' at dawn or dusk' };
  return `${where[s.zones[0]] ?? 'somewhere wet'}${when[s.watch] ?? ''}`;
}

/** The fish a neighbour may ask for: ordinary ones from their own waters, that bite on any day. */
function askable(who: Exclude<Who, 'npc-pelican'>): Species[] {
  return SPECIES.filter((s) => (s.tier === 'common' || s.tier === 'uncommon') && !s.rain && s.zones.some((z) => WATERS[who].includes(z)));
}

/** The fish a neighbour would like next: it changes each time a favour is done, never to the same fish. */
export function favourFish(who: Exclude<Who, 'npc-pelican'>, done: number): Species {
  const list = askable(who);
  const i = NEIGHBOURS.indexOf(who);
  const pick = (n: number): number => Math.floor(chance(n * 13 + i * 101, 3) * list.length) % list.length;
  let at = pick(done);
  if (done > 0 && at === pick(done - 1)) at = (at + 1) % list.length;
  return list[at];
}

/** What a favour pays: well over what Gus would give. Every third from the same neighbour comes with a pearl. */
export function favourPays(s: Species, done: number): { coins: number; pearl: boolean } {
  return { coins: Math.round((30 + s.value * 3) / 5) * 5, pearl: (done + 1) % 3 === 0 };
}

/** What a neighbour says they caught today: a kind of fish from their waters, and a length well up its range. */
export function boast(who: Exclude<Who, 'npc-pelican'>, day: number): { fish: Species; size: number } {
  const list = askable(who);
  const i = NEIGHBOURS.indexOf(who);
  const fish = list[Math.floor(chance(day * 7 + i * 31, 5) * list.length) % list.length];
  const [lo, hi] = fish.size;
  const size = Math.round((lo + (hi - lo) * (0.55 + chance(day * 3 + i * 17, 9) * 0.3)) * 10) / 10;
  return { fish, size };
}

/** What is known of the moment when someone is spoken to. */
export interface TalkFacts {
  /** The calendar day. */
  day: number;
  now: number;
  raining: boolean;
  night: boolean;
  /** The fish the player landed last, if it was in the last few minutes. */
  caught: Catch | null;
}

export interface Said {
  text: string;
  /** What the words did, for a toast: a favour done or a boast beaten. */
  did?: { kind: 'favour'; coins: number; pearl: boolean } | { kind: 'rival' };
}

/** How long ago a catch still counts as just landed, ms. */
export const FRESH_CATCH = 4 * 60_000;

type Voices = Record<Who, string>;
const say = (v: Voices, who: Who): string => v[who];

const HELLO: Voices = {
  'npc-duck': "Quack! You're new! I'm Puddle. I fish the pier, mostly.",
  'npc-beaver': 'Oh. Hello. Birch. I do the creek. And bridges.',
  'npc-bear': "Mmm, a new face! I'm Juniper. Pull up a log sometime.",
  'npc-pelican': "A customer! I'm Gus. I buy fish and sell everything else.",
};

/** A word about the fish just landed. */
function onCatch(who: Who, c: Catch): string {
  const s = BY_ID[c.species];
  const name = s?.name ?? 'fish';
  if (!s) return say({ 'npc-duck': 'What is THAT? Quack!', 'npc-beaver': "Don't know what that is.", 'npc-bear': 'Mmm. Mysterious.', 'npc-pelican': "I'll buy it, whatever it is." }, who);
  if (s.tier === 'legendary' || s.tier === 'epic')
    return say({ 'npc-duck': `QUACK! Is that ${a(name)}?! I've only heard stories!`, 'npc-beaver': `${A(name)}. Well. I'll be quiet now.`, 'npc-bear': `${A(name)}! Mmm. That one's going in a song.`, 'npc-pelican': `Is that ${a(name)}? Bring it here before it gets away!` }, who);
  if (c.variant === 'shiny' || c.variant === 'golden' || c.variant === 'prismatic') {
    const v = VARIANT_LABEL[c.variant].toLowerCase();
    return say({ 'npc-duck': `It sparkles! A ${v} one! Quack!`, 'npc-beaver': `A ${v} ${name}. You don't see that every day. I don't, anyway.`, 'npc-bear': `Ooh, ${v}. A fancy fish for a fancy day.`, 'npc-pelican': `A ${v} ${name}? Now that's worth real coins.` }, who);
  }
  if (s.tier === 'junk')
    return say({ 'npc-duck': `${A(name)}! Gus buys those. Gus buys anything.`, 'npc-beaver': `${A(name)}. The water gives what it gives.`, 'npc-bear': `Mmm. ${A(name)}. It's the thought that counts.`, 'npc-pelican': `${A(name)}. I'll take it. I always do.` }, who);
  if (c.huge)
    return say({ 'npc-duck': `That ${name} is HUGE! ${sayLength(c.size)}! Quack!`, 'npc-beaver': `${sayLength(c.size)} of ${name}. That's a big one. I measured with my eyes.`, 'npc-bear': `Mmm! That ${name} could feed the whole camp.`, 'npc-pelican': `A ${name} that size? I'll need a bigger scale.` }, who);
  return say({ 'npc-duck': `Nice ${name}! Quack!`, 'npc-beaver': `Decent ${name}.`, 'npc-bear': `${A(name)}! Lovely.`, 'npc-pelican': `${A(name)}! I'll take that off your hands.` }, who);
}

/** A word about what the player has on: a few hats get a line of their own. */
function onWear(who: Who, hat: string | null, extra: string | null): string | null {
  const special: Record<string, Partial<Voices>> = {
    'hat-crown': { 'npc-beaver': "A crown. Should I bow? I'm not going to bow.", 'npc-pelican': 'Your majesty! The royal discount is no discount.' },
    'hat-duck': { 'npc-duck': 'Is that... me? On your head? QUACK!' },
    'hat-fish': { 'npc-pelican': "You know I'd buy that hat off your head, right?" },
    'hat-lampshade': { 'npc-bear': 'Mmm. Did you lose a bet?' },
    'hat-frog': { 'npc-duck': 'A frog! On your head! We get on fine, frogs and ducks.' },
    'hat-wizard': { 'npc-beaver': 'A wizard. Can you do bridges?' },
    'hat-cake': { 'npc-bear': 'Mmm. Is that... is that real cake?' },
  };
  if (hat && special[hat]?.[who]) return special[hat][who]!;
  const thing = (hat && HATS.find((h) => h.id === hat)?.name) ?? (extra && EXTRAS.find((x) => x.id === extra)?.name) ?? null;
  if (!thing) return null;
  const t = thing.toLowerCase();
  return say({ 'npc-duck': `Quack! I love the ${t}!`, 'npc-beaver': `That ${t}. Bold. It suits you, I think.`, 'npc-bear': `Mmm, the ${t}. Very you.`, 'npc-pelican': `Nice ${t}! I have an eye for these things.` }, who);
}

const RAIN: Voices = {
  'npc-duck': 'Rain! Ducks love rain. Different fish come up, too.',
  'npc-beaver': "Rain's good for the creek. Golden trout weather.",
  'npc-bear': 'Mmm, rain on the tent. Best sound there is.',
  'npc-pelican': 'Rain keeps the customers away. Not the fish, though.',
};
const NIGHT: Voices = {
  'npc-duck': 'The squid come up to the pier lamps at night!',
  'npc-beaver': 'Eels after dark. Mind your fingers.',
  'npc-bear': 'Look up. Shooting stars, some nights.',
  'npc-pelican': "I never close. Pelicans don't sleep. Much.",
};

/** Forget what was said yesterday. */
function today(save: Save, day: number): string[] {
  if (save.talk.day !== day) save.talk = { day, said: [] };
  return save.talk.said;
}

/** The fish the player has in the bag that a neighbour is waiting for, if any: its place in the bag. */
export function favourInBag(save: Save, who: Who): number {
  if (who === 'npc-pelican' || !save.met.includes(who)) return -1;
  const want = favourFish(who, save.favours[who] ?? 0).id;
  // An ordinary one, and the least of them: a golden fish is never handed over for a favour.
  let at = -1;
  save.bag.forEach((c, i) => {
    if (c.species !== want || (c.variant !== 'normal' && c.variant !== 'fine')) return;
    if (at < 0 || valueOf(c) < valueOf(save.bag[at])) at = i;
  });
  return at;
}

/** Hand a neighbour the fish they asked for: it leaves the bag, and they pay. */
export function doFavour(save: Save, who: Exclude<Who, 'npc-pelican'>): Said | null {
  const i = favourInBag(save, who);
  if (i < 0) return null;
  const done = save.favours[who] ?? 0;
  const fish = favourFish(who, done);
  const pays = favourPays(fish, done);
  save.bag.splice(i, 1);
  save.coins += pays.coins;
  if (pays.pearl) save.tokens += 1;
  save.favours[who] = done + 1;
  const more = pays.pearl ? " And a pearl. Don't tell Gus." : '';
  const text = say({ 'npc-duck': `${A(fish.name)}! Quack! Here, ${pays.coins} coins!${more}`, 'npc-beaver': `That's the one. ${pays.coins} coins. Fair's fair.${more}`, 'npc-bear': `Mmm! Perfect. ${pays.coins} coins for your trouble.${more}`, 'npc-pelican': '' }, who);
  return { text, did: { kind: 'favour', coins: pays.coins, pearl: pays.pearl } };
}

/**
 * What someone says when spoken to. The first of these that has not been said to them today:
 * hello (once ever); a word on a fish just landed; where the day's bounty might be found; the
 * favour they would like; their boast (or that the player has beaten it); a word on what the
 * player is wearing; the rain or the night; and after that their own lines, in turn.
 */
export function talk(save: Save, who: Who, f: TalkFacts, lines: readonly string[], turn: number): Said {
  const said = today(save, f.day);
  const once = (key: string): boolean => {
    const k = `${who}:${key}`;
    if (said.includes(k)) return false;
    said.push(k);
    return true;
  };
  if (!save.met.includes(who)) {
    save.met.push(who);
    return { text: HELLO[who] };
  }
  if (f.caught && f.now - f.caught.at < FRESH_CATCH && once(`catch:${f.caught.at}`)) return { text: onCatch(who, f.caught) };
  const wanted = bountyFor(f.day);
  const filled = bountyFilled(save.bounty, f.day);
  if (once('bounty')) {
    if (who === 'npc-pelican') return { text: filled ? `That ${wanted.name} was just the thing. Same deal tomorrow, different fish.` : `Today I'm after ${a(wanted.name)}. Double coins! And a bounty for the first.` };
    if (!filled) return { text: say({ 'npc-duck': `Gus wants ${a(wanted.name)} today! Try ${spotWords(wanted)}. Quack!`, 'npc-beaver': `Gus is after ${a(wanted.name)}. I'd look ${spotWords(wanted)}.`, 'npc-bear': `Mmm, Gus has his heart set on ${a(wanted.name)}. Try ${spotWords(wanted)}.`, 'npc-pelican': '' }, who) };
  }
  if (who !== 'npc-pelican') {
    if (once('favour')) {
      const fish = favourFish(who, save.favours[who] ?? 0);
      return { text: say({ 'npc-duck': `Could you bring me ${a(fish.name)}? I'll trade you coins! Quack!`, 'npc-beaver': `If you come by ${a(fish.name)}... I'd take it. For a project.`, 'npc-bear': `Mmm, I'm dreaming of ${a(fish.name)}. Bring me one?`, 'npc-pelican': '' }, who) };
    }
    const b = boast(who, f.day);
    const best = save.journal[b.fish.id]?.best ?? 0;
    if (best >= b.size) {
      if (once('beaten')) {
        save.rivalWins += 1;
        return { text: say({ 'npc-duck': `${sayLength(best)}?! You beat my ${b.fish.name}! Quack! Rematch tomorrow!`, 'npc-beaver': `${sayLength(best)} of ${b.fish.name}. Hm. You've got me beat. Today.`, 'npc-bear': `${sayLength(best)}! Bigger than my ${b.fish.name}. I'll drink to that.`, 'npc-pelican': '' }, who), did: { kind: 'rival' } };
      }
    } else if (once('boast')) return { text: say({ 'npc-duck': `I landed ${a(b.fish.name)} this morning: ${sayLength(b.size)}! Beat that!`, 'npc-beaver': `${sayLength(b.size)} of ${b.fish.name} today. Not that I'm counting.`, 'npc-bear': `Mmm, ${sayLength(b.size)} of ${b.fish.name} on my line today. Can you top it?`, 'npc-pelican': '' }, who) };
  }
  const worn = onWear(who, save.hat, save.extra);
  if (worn && once(`wear:${save.hat ?? ''}:${save.extra ?? ''}`)) return { text: worn };
  if (f.raining && once('rain')) return { text: RAIN[who] };
  if (f.night && once('night')) return { text: NIGHT[who] };
  return { text: lines[turn % lines.length] };
}

/** The favours the neighbours the player has met are waiting on, for the board. */
export function favoursOpen(save: Save): { who: Who; name: string; fish: Species; have: boolean }[] {
  return NEIGHBOURS.filter((w) => save.met.includes(w)).map((who) => {
    const fish = favourFish(who, save.favours[who] ?? 0);
    return { who, name: NAMES[who], fish, have: favourInBag(save, who) >= 0 };
  });
}
