// The day's bounty as a card: which fish Gus wants today, where to look for it, what it pays,
// and whether it has been brought in. Shown at the top of the shop's Sell tab and on the board.
import { valueOf } from '../fishing/fish';
import { BOUNTY_PAYS, bountyFilled, bountyFor, bountyPrize, whereabouts } from '../game/bounty';
import type { Session } from '../game/session';
import { el, icon } from './hud';

export function bountyCard(s: Session): HTMLElement {
  const fish = bountyFor(s.today);
  const filled = bountyFilled(s.save.bounty, s.today);
  const have = s.save.bag.filter((c) => c.species === fish.id).length;
  const card = el('div', `bounty-card${filled ? ' filled' : ''}`);
  const pays = filled ? `Bounty paid. Still ${BOUNTY_PAYS}× coins for every one today.` : `${BOUNTY_PAYS}× coins for every one today, and ${bountyPrize(fish)} more for the first.`;
  card.innerHTML = `<img src="${icon(`fish-${fish.id}`)}" alt=""><div class="grow"><div class="sub">Today Gus wants</div><div class="title">${fish.name}</div><div class="sub">${whereabouts(fish)}</div><div class="sub">${pays}${have ? ` You have ${have}.` : ''}</div></div>`;
  return card;
}

/** What a fish in the bag sells for today, for showing on its row. */
export const todaysPrice = (s: Session, i: number): number => {
  const c = s.save.bag[i];
  return valueOf(c) * (c.species === bountyFor(s.today).id ? BOUNTY_PAYS : 1);
};
