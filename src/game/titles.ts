// Titles: little names earned by doing things, shown above the player. Pure.
import { BY_ID, JOURNAL_SPECIES } from '../fishing/fish';
import type { Save } from './save';
import { campKinds, campMade } from './camp';

export interface Title {
  name: string;
  how: string;
  earned: (s: Save) => boolean;
}

const has = (s: Save, id: string): boolean => !!s.journal[id];
const withVariant = (s: Save, ...v: string[]): number => Object.values(s.journal).filter((j) => j.variants.some((x) => v.includes(x))).length;

export const TITLES: readonly Title[] = [
  { name: 'Newcomer', how: 'Arrive on the island.', earned: () => true },
  { name: 'Angler', how: 'Catch 25 fish.', earned: (s) => s.stats.caught >= 25 },
  { name: 'Pier Regular', how: 'Catch 150 fish.', earned: (s) => s.stats.caught >= 150 },
  { name: 'Old Salt', how: 'Catch 500 fish.', earned: (s) => s.stats.caught >= 500 },
  { name: 'Tiny Friend', how: 'Catch a snail, a tadpole, a shrimp and a minnow.', earned: (s) => ['snail', 'tadpole', 'shrimp', 'minnow'].every((id) => has(s, id)) },
  { name: 'Giant Wrangler', how: 'Catch a whale shark, a giant squid or an oarfish.', earned: (s) => ['whale-shark', 'giant-squid', 'oarfish'].some((id) => has(s, id)) },
  { name: 'Storm Chaser', how: 'Catch a fish that only bites in the rain.', earned: (s) => Object.keys(s.journal).some((id) => BY_ID[id]?.rain) },
  { name: 'Shiny Hunter', how: 'Find 10 kinds of fish shiny or better.', earned: (s) => withVariant(s, 'shiny', 'golden', 'prismatic') >= 10 },
  { name: 'Star Seeker', how: 'Catch a prismatic fish.', earned: (s) => withVariant(s, 'prismatic') >= 1 },
  { name: 'Collector', how: 'Fill the whole journal.', earned: (s) => JOURNAL_SPECIES.every((x) => has(s, x.id)) },
  { name: 'Beachcomber', how: 'Find every piece of sea glass.', earned: (s) => s.glass.length >= 12 },
  { name: 'Treasure Hunter', how: 'Dig up 15 buried things.', earned: (s) => s.dug.length >= 15 },
  { name: 'Lucky Duck', how: 'Win an epic or legendary prize at the Lucky Gull.', earned: (s) => s.arcade.rarest >= 4 },
  { name: 'Tycoon', how: 'Earn 25,000 coins selling fish.', earned: (s) => s.stats.earned >= 25000 },
  { name: 'Busy Paws', how: 'Finish 20 errands.', earned: (s) => s.questsDone >= 20 },
  { name: "Gus's Favourite", how: 'Fill 10 of the day\'s bounties.', earned: (s) => s.bounty.count >= 10 },
  { name: 'Good Neighbour', how: 'Do five favours for the islanders.', earned: (s) => Object.values(s.favours).reduce((a, n) => a + n, 0) >= 5 },
  { name: 'Top Rod', how: 'Beat an islander\'s catch of the day ten times.', earned: (s) => s.rivalWins >= 10 },
  { name: 'Tank Keeper', how: 'Give the aquarium ten kinds of fish.', earned: (s) => s.aquarium.length >= 10 },
  { name: 'Curator', how: 'Give the aquarium thirty kinds of fish.', earned: (s) => s.aquarium.length >= 30 },
  { name: 'Lookout', how: 'Pick out four things through the lighthouse telescope.', earned: (s) => s.spotted.length >= 4 },
  { name: 'Skater', how: 'Land 25 tricks on a skateboard.', earned: (s) => s.tricks >= 25 },
  { name: 'Toy Box', how: 'Win three toys at the Lucky Gull.', earned: (s) => s.toys.length >= 3 },
  { name: 'Far Shore', how: 'Row out to Kettle Isle.', earned: (s) => s.hints.includes('kettle') },
  { name: 'Well Soaked', how: 'Sit in the hot spring.', earned: (s) => s.hints.includes('soaked') },
  { name: 'Sky Watcher', how: 'See the northern lights, a blood moon and a great sunrise.', earned: (s) => ['aurora', 'bloodmoon', 'sunrise'].every((k) => s.skies.includes(k)) },
  { name: 'Happy Camper', how: 'Make camp: set down a tent with a fire and somewhere to sit beside it.', earned: (s) => campMade(s.placed) },
  { name: 'Camp Warden', how: 'Have eight different camp things round one tent.', earned: (s) => campKinds(s.placed) >= 8 },
];

/** Titles the save has newly earned (adding them to it). */
export function newTitles(s: Save): string[] {
  const fresh = TITLES.filter((t) => !s.titles.includes(t.name) && t.earned(s)).map((t) => t.name);
  s.titles.push(...fresh);
  return fresh;
}
