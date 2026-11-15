// Kettle Isle's own rules, the little there are: nobody lives there, so there is no shop and no
// errands, only what was left behind. The cannery's ledger is read a page at a time, and its
// crate has something in it once a day. Pure.
import type { Save } from './save';

/** The ledger on the cannery's desk, page by page. It says what the place was, and never where a fish is. */
export const CANNERY_PAGES: readonly string[] = [
  'First season. Forty hands, two boats, and the lake at the top for fresh water. We are calling it the Kettle on account of the steam.',
  'The reef fish will not go in a tin. Too many colours. The buyers say it puts people off their dinner.',
  'Lake fish again too big for the tins. Sent the boy to the mainland for bigger tins.',
  'The boy is back. There are no bigger tins.',
  'Something sat on the bottom of the Kettle all summer and would not be moved. Three lines lost. The men have named it and will not say the name in front of me.',
  'Half the hands spend their dinner hour in the hot spring and come back no use to anyone. I have gone to see what the fuss is. I am writing this from the spring.',
  'Last entry. Boiler cold, boats sold. Whoever reads this: the pools on the north shore at low sun are worth the walk. Leave the place as you found it.',
];

export interface Rummaged {
  says: string;
  empty: boolean;
  pearl: boolean;
}

/**
 * Look in the cannery's crate. Once a day there is something: the first time ever a pearl
 * somebody dropped, and after that a little bait or a few old coins. `roll` is 0 to 1.
 */
export function rummage(save: Save, day: number, roll: number): Rummaged {
  if (save.cannery.day === day) return { says: 'Nothing but sawdust. Somebody has been through it today already: you.', empty: true, pearl: false };
  const first = save.cannery.day < 0;
  save.cannery.day = day;
  if (first) {
    save.tokens += 1;
    return { says: 'Under the sawdust, wrapped in a label for tinned fish: a pearl.', empty: false, pearl: true };
  }
  if (roll < 0.4) {
    const coins = 12 + Math.floor(roll * 90);
    save.coins += coins;
    return { says: `Old coins, gone green: ${coins} of them.`, empty: false, pearl: false };
  }
  const [id, count, name] = roll < 0.75 ? (['bait-minnow', 4, 'four minnows in a jar, still going'] as const) : (['bait-glow', 3, 'three glow grubs, lighting up the inside of the crate'] as const);
  save.baits[id] = (save.baits[id] ?? 0) + count;
  return { says: `In the crate: ${name}.`, empty: false, pearl: false };
}
