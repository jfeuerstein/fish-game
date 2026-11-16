// Sets: every fish of one water, or one hour, or one sky. Each is worth a small prize the day it
// is finished and a stamp in the journal for good. Pure.
import { JOURNAL_SPECIES, type Species, isleOf } from '../fishing/fish';
import type { Save } from './save';

export interface FishSet {
  id: string;
  name: string;
  /** What is in it, said in a few words. */
  what: string;
  has: (s: Species) => boolean;
  /** The prize: coins, and a pearl for the harder ones. */
  coins: number;
  pearl?: boolean;
}

const real = (s: Species): boolean => s.tier !== 'junk';

export const SETS: readonly FishSet[] = [
  { id: 'pond', name: 'Pond Life', what: 'Everything that lives in the pond.', has: (s) => real(s) && s.zones.includes('pond'), coins: 400 },
  { id: 'creek', name: 'Up the Creek', what: 'Everything that swims the creek.', has: (s) => real(s) && s.zones.includes('creek'), coins: 400 },
  { id: 'shore', name: 'Beachcomber\'s Catch', what: 'Everything from the sea by the shore.', has: (s) => real(s) && s.zones.includes('ocean'), coins: 500 },
  { id: 'deep', name: 'The Deep End', what: 'Everything from the deep water off the pier.', has: (s) => real(s) && s.zones.includes('deep'), coins: 800, pearl: true },
  { id: 'cave', name: 'In the Dark', what: 'Everything from the sea cave.', has: (s) => real(s) && s.zones.includes('cave'), coins: 300 },
  { id: 'kettle', name: 'The Whole Kettle', what: 'Everything from Kettle Isle: the lake, the reef and the tide pools.', has: (s) => real(s) && isleOf(s) === 'kettle', coins: 1200, pearl: true },
  { id: 'rime', name: 'Cold Storage', what: 'Everything from Rimefall: through the ice, and out of the cold sea.', has: (s) => real(s) && isleOf(s) === 'rime', coins: 1200, pearl: true },
  { id: 'mire', name: 'Bog Standard', what: 'Everything from Mirewood: the channels and the crab pots.', has: (s) => real(s) && isleOf(s) === 'mire', coins: 1200, pearl: true },
  { id: 'glow', name: 'Lights Out', what: 'Everything from Glowmere: the glowing shallows and the Mere.', has: (s) => real(s) && isleOf(s) === 'glow', coins: 1200, pearl: true },
  { id: 'night', name: 'Night Shift', what: 'Every fish that bites only after dark.', has: (s) => real(s) && s.watch === 'night', coins: 500 },
  { id: 'twilight', name: 'Golden Hours', what: 'Every fish of dawn and dusk.', has: (s) => real(s) && s.watch === 'twilight', coins: 400 },
  { id: 'weather', name: 'Bad Weather Friends', what: 'Every fish that wants rain, fog or a storm.', has: (s) => real(s) && (!!s.rain || !!s.weather), coins: 900, pearl: true },
  { id: 'seasons', name: 'Round the Year', what: 'Every fish that keeps to a season.', has: (s) => real(s) && !!s.seasons, coins: 700, pearl: true },
  { id: 'small', name: 'Small Fry', what: 'Every common fish.', has: (s) => s.tier === 'common', coins: 250 },
  { id: 'odds', name: 'Odds and Ends', what: 'Everything that is not a fish at all.', has: (s) => s.tier === 'junk', coins: 150 },
];

/** What is in a set, and how many of them the journal has. */
export function setProgress(save: Save, set: FishSet): { have: number; of: number; members: Species[] } {
  const members = JOURNAL_SPECIES.filter(set.has);
  return { have: members.filter((s) => save.journal[s.id]).length, of: members.length, members };
}

/** Sets the save has newly finished: each is stamped and its prize paid. */
export function newSets(save: Save): FishSet[] {
  const fresh = SETS.filter((set) => {
    if (save.sets.includes(set.id)) return false;
    const p = setProgress(save, set);
    return p.of > 0 && p.have === p.of;
  });
  for (const set of fresh) {
    save.sets.push(set.id);
    save.coins += set.coins;
    if (set.pearl) save.tokens += 1;
  }
  return fresh;
}
