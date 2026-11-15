// The player's own campsite. There is no plot: a camp is wherever its things are set down. What
// makes a camp a camp is a tent, a fire and somewhere to sit, close together. Pure.
import { FURNITURE } from './economy';

/** How close together, metres, a camp's things must stand to be one camp. */
export const CAMP_REACH = 9;

interface Stood {
  id: string;
  x: number;
  z: number;
}

const seat = (id: string): boolean => !!FURNITURE.find((f) => f.id === id)?.seat;
const fire = (id: string): boolean => !!FURNITURE.find((f) => f.id === id)?.fire;

/** Whether, among things set down, there is a tent with a fire and a seat within reach of it. */
export function campMade(placed: readonly Stood[]): boolean {
  return placed
    .filter((p) => p.id === 'f-tent')
    .some((tent) => {
      const near = placed.filter((p) => Math.hypot(p.x - tent.x, p.z - tent.z) <= CAMP_REACH);
      return near.some((p) => fire(p.id)) && near.some((p) => seat(p.id));
    });
}

/** How many of the camp catalogue's different things stand within reach of some tent: for the title of someone who has the lot. */
export function campKinds(placed: readonly Stood[]): number {
  let best = 0;
  for (const tent of placed.filter((p) => p.id === 'f-tent')) {
    const kinds = new Set(placed.filter((p) => Math.hypot(p.x - tent.x, p.z - tent.z) <= CAMP_REACH && FURNITURE.find((f) => f.id === p.id)?.camp).map((p) => p.id));
    best = Math.max(best, kinds.size);
  }
  return best;
}
