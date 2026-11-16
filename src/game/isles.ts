// The far islands' own rules: which the player has a chart to, and how each chart is come by;
// Mirewood's crab pots; Glowmere's beacons; and the deeds each island pays for. Pure.
import { BY_ID, JOURNAL_SPECIES, isleOf, type Species } from '../fishing/fish';
import type { IsleId } from '../world/isle';
import type { Save } from './save';

export type FarIsle = Exclude<IsleId, 'cove'>;
export const FAR_ISLES: readonly FarIsle[] = ['kettle', 'rime', 'mire', 'glow'];

// ---------- Charts ----------

/** Whether the player can row to an island. Home needs no chart. (Kettle Isle's was the first, and has a field of its own in older saves.) */
export const hasChart = (save: Save, isle: IsleId): boolean => isle === 'cove' || save.charts.includes(isle) || (isle === 'kettle' && save.seaChart);

/** Come by a chart. False if it was had already. */
export function giveChart(save: Save, isle: FarIsle): boolean {
  if (hasChart(save, isle)) return false;
  save.charts.push(isle);
  if (isle === 'kettle') save.seaChart = true;
  return true;
}

/**
 * Whether a bottle just landed has Glowmere's chart in it: about one in three does, and the
 * fifth always, for someone who has not got it. `roll` is 0 to 1.
 */
export const BOTTLE_ODDS = 0.3;
export const BOTTLE_SURE = 5;
export const bottleHolds = (save: Save, roll: number): boolean => !hasChart(save, 'glow') && (roll < BOTTLE_ODDS || (save.journal.bottle?.count ?? 0) >= BOTTLE_SURE - 1);

/** Where each chart is said to be found, for someone who has not got it: true, and no more than a rumour. */
export const CHART_RUMOUR: Record<FarIsle, string> = {
  kettle: 'The trader who comes by boat sells a chart to it.',
  mire: 'They say the cannery on Kettle Isle kept its charts in the back of the ledger.',
  rime: 'On a clear day something white shows on the northern horizon, to anyone high enough to see it.',
  glow: 'Now and then a bottle washes in with more in it than a note.',
};

/** What is said when each is come by. */
export const CHART_FOUND: Record<FarIsle, string> = {
  kettle: 'A chart. Row to the buoy south of the pier head, and out past it.',
  mire: 'Tucked into the back of the ledger, folded small: a chart to somewhere called Mirewood.',
  rime: 'Ice, a long way north. You take a bearing and draw it on the back of a bait label: a chart to Rimefall, more or less.',
  glow: 'There is more in the bottle than a note: a chart, drawn in ink that glows. Glowmere.',
};

/** What each island is, in a line, for the list of places to row to. */
export const ISLE_SAYS: Record<IsleId, string> = {
  cove: 'Home. Gus, the Lucky Gull, and somewhere to sell all this.',
  kettle: 'An old crater with a lake in it, a reef, tide pools and a hot spring.',
  rime: 'Snow, a frozen lake to fish through, and a hill to slide down.',
  mire: 'A swamp of still channels crossed by boardwalks. Crab pots to set.',
  glow: 'Where it is always night, and everything gives off its own light.',
};

// ---------- Mirewood's crab pots ----------

/** How long a pot wants in the water before there is anything in it, seconds. */
export const POT_SECS = 360;

export type PotState = 'empty' | 'soaking' | 'ready';

export function potState(save: Save, id: string, nowMs: number): PotState {
  const set = save.pots[id];
  if (!set || set > nowMs) return 'empty';
  return nowMs - set >= POT_SECS * 1000 ? 'ready' : 'soaking';
}

/** Seconds until a pot that is soaking is ready. */
export const potLeft = (save: Save, id: string, nowMs: number): number => Math.max(0, Math.ceil(POT_SECS - (nowMs - (save.pots[id] ?? 0)) / 1000));

/** Bait a pot and drop it in. False if there is one down already. */
export function setPot(save: Save, id: string, nowMs: number): boolean {
  if (potState(save, id, nowMs) !== 'empty') return false;
  save.pots[id] = nowMs;
  return true;
}

/** Pull a ready pot. How many things are in it (one to three; `roll` is 0 to 1), or 0 if it was not ready. */
export function haulPot(save: Save, id: string, nowMs: number, roll: number): number {
  if (potState(save, id, nowMs) !== 'ready') return 0;
  delete save.pots[id];
  save.potHauls++;
  return roll < 0.45 ? 1 : roll < 0.85 ? 2 : 3;
}

// ---------- Glowmere's beacons ----------

/** How long a beacon burns once lit, and how long the water stays awake once all three burn together, seconds. */
export const BURN_SECS = 12 * 60;
export const WAKE_SECS = 10 * 60;
export const BEACON_COUNT = 3;

export const burning = (save: Save, i: number, nowMs: number): boolean => {
  const lit = save.beacons[i] ?? 0;
  return lit > 0 && lit <= nowMs && nowMs - lit < BURN_SECS * 1000;
};

/** Whether the water is awake: the fish that only bite then, bite. */
export const awake = (save: Save, nowMs: number): boolean => save.wokenAt > 0 && save.wokenAt <= nowMs && nowMs - save.wokenAt < WAKE_SECS * 1000;

/** Light a beacon. Says whether that was the last of the three, so that the water wakes. */
export function lightBeacon(save: Save, i: number, nowMs: number): { woke: boolean } {
  save.beacons[i] = nowMs;
  const all = Array.from({ length: BEACON_COUNT }, (_, k) => burning(save, k, nowMs)).every(Boolean);
  if (all && !awake(save, nowMs)) {
    save.wokenAt = nowMs;
    save.wakings++;
    return { woke: true };
  }
  return { woke: false };
}

// ---------- Deeds ----------

export interface Deed {
  id: string;
  isle: FarIsle;
  name: string;
  how: string;
  done: (s: Save) => boolean;
  /** What it gives, and the picture it is shown with. */
  gives: { charm?: string; paint?: string; toy?: string; furniture?: [string, number]; pearls?: number };
  icon: string;
  prize: string;
}

/** Every real fish of an island's waters but its legend: the legend is a longer hunt than a deed should wait on. */
const ordinary = (isle: FarIsle, zone?: string): Species[] => JOURNAL_SPECIES.filter((s) => s.tier !== 'junk' && s.tier !== 'legendary' && !s.woken && isleOf(s) === isle && (!zone || s.zones.includes(zone as never)));
const caught = (s: Save, list: Species[]): boolean => list.every((x) => !!s.journal[x.id]);

export const DEEDS: readonly Deed[] = [
  { id: 'rime-ice', isle: 'rime', name: 'Through the Ice', how: 'Land a fish through a hole in the ice.', done: (s) => (s.caughtAt.ice ?? []).length > 0, gives: { charm: 'charm-icicle' }, icon: 'charm-icicle', prize: 'an Icicle charm for your rod' },
  { id: 'rime-all', isle: 'rime', name: 'Cold Hands', how: 'Catch all four ordinary fish from under the ice.', done: (s) => caught(s, ordinary('rime', 'ice')), gives: { toy: 'toy-sled' }, icon: 'toy-sled', prize: 'a Sled' },
  { id: 'rime-lights', isle: 'rime', name: 'Under the Lights', how: 'Stand on Rimefall under the northern lights.', done: (s) => s.hints.includes('rime-lights'), gives: { paint: 'paint-frost' }, icon: 'paint-frost', prize: 'Frost paint for your rod' },
  { id: 'mire-haul', isle: 'mire', name: 'First Haul', how: 'Set a crab pot, and pull it up when it has had its time.', done: (s) => s.potHauls >= 1, gives: { charm: 'charm-claw' }, icon: 'charm-claw', prize: 'a Crab Claw charm for your rod' },
  { id: 'mire-pots', isle: 'mire', name: 'Potter', how: 'Pull up twelve pots.', done: (s) => s.potHauls >= 12, gives: { toy: 'toy-stilts' }, icon: 'toy-stilts', prize: 'a pair of Stilts' },
  { id: 'mire-all', isle: 'mire', name: 'Bog Standard', how: 'Catch all four ordinary fish of the channels.', done: (s) => caught(s, ordinary('mire', 'swamp')), gives: { paint: 'paint-mire' }, icon: 'paint-mire', prize: 'Mire paint for your rod' },
  { id: 'glow-fires', isle: 'glow', name: 'Three Fires', how: 'Have all three beacons burning at once.', done: (s) => s.wakings >= 1, gives: { charm: 'charm-ember' }, icon: 'charm-ember', prize: 'an Ember charm for your rod' },
  { id: 'glow-awake', isle: 'glow', name: 'Wide Awake', how: 'Land something that only bites while the water is awake.', done: (s) => JOURNAL_SPECIES.some((x) => x.woken && !!s.journal[x.id]), gives: { furniture: ['f-glowshroom', 2] }, icon: 'f-glowshroom', prize: 'two pots of Glowshrooms to set down' },
  { id: 'glow-all', isle: 'glow', name: 'Night Shift', how: 'Catch every ordinary fish of the shallows and the Mere.', done: (s) => caught(s, ordinary('glow')), gives: { paint: 'paint-glow' }, icon: 'paint-glow', prize: 'Glow paint for your rod' },
];

/** Deeds newly done: each is paid and marked. */
export function newDeeds(save: Save): Deed[] {
  const fresh = DEEDS.filter((d) => !save.deeds.includes(d.id) && d.done(save));
  for (const d of fresh) {
    save.deeds.push(d.id);
    if (d.gives.charm && !save.charms.includes(d.gives.charm)) save.charms.push(d.gives.charm);
    if (d.gives.paint && !save.rodPaints.includes(d.gives.paint)) save.rodPaints.push(d.gives.paint);
    if (d.gives.toy && !save.toys.includes(d.gives.toy)) save.toys.push(d.gives.toy);
    if (d.gives.furniture) save.furniture[d.gives.furniture[0]] = (save.furniture[d.gives.furniture[0]] ?? 0) + d.gives.furniture[1];
    if (d.gives.pearls) save.tokens += d.gives.pearls;
  }
  return fresh;
}

/** The fish of an island, for its page of the journal. */
export const fishOf = (isle: FarIsle): Species[] => JOURNAL_SPECIES.filter((s) => s.tier !== 'junk' && isleOf(s) === isle);
void BY_ID;
