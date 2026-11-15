// The reeling: hold to wind in, let go when the line is straining. Pure and fixed-step.
import type { Rod } from '../game/economy';

export interface ReelState {
  /** How far in the fish is, 0 (just hooked) to 1 (landed). */
  progress: number;
  /** Strain on the line, 0 to 1; at 1 it snaps. */
  tension: number;
  /** Whether the fish is fighting hard right now. */
  thrashing: boolean;
  /** Whether it has gone to the bottom to sulk: winding gains almost nothing, and strains little. */
  sulking: boolean;
  /** Seconds left in the fish's present mood. */
  moodLeft: number;
  /** Seconds the fish has been at the far end with nothing gained. */
  slack: number;
  elapsed: number;
  outcome: 'reeling' | 'landed' | 'snapped' | 'escaped';
}

/**
 * The way a kind of fish fights. A steady one thrashes and tires by turns. A runner makes long
 * runs and takes line fast when it is let go. A diver is a dead weight: winding strains the
 * line even when it is calm. A jumper thrashes in short sharp bursts, and each leap shakes a
 * little line loose. A sulker goes to the bottom between fights and will not be moved.
 */
export type FightStyle = 'steady' | 'runner' | 'diver' | 'jumper' | 'sulker';

interface Style {
  /** How long its thrashes and its calms last, against a steady fish's. */
  thrashFor: number;
  calmFor: number;
  /** How fast line comes in, and how much winding strains it when calm. */
  wind: number;
  heavy: number;
  /** How much faster it takes line when thrashing and let go. */
  takes: number;
  /** Progress lost at each leap. */
  shake: number;
  /** The chance it sulks after a thrash. */
  sulks: number;
}

export const STYLES: Record<FightStyle, Style> = {
  steady: { thrashFor: 1, calmFor: 1, wind: 1, heavy: 1, takes: 1, shake: 0, sulks: 0 },
  runner: { thrashFor: 1.7, calmFor: 1.35, wind: 1.1, heavy: 0.9, takes: 3, shake: 0, sulks: 0 },
  diver: { thrashFor: 0.8, calmFor: 1.4, wind: 0.85, heavy: 1.7, takes: 1, shake: 0, sulks: 0 },
  jumper: { thrashFor: 0.5, calmFor: 0.55, wind: 1.15, heavy: 0.9, takes: 1, shake: 0.035, sulks: 0 },
  sulker: { thrashFor: 1.1, calmFor: 0.9, wind: 1, heavy: 1, takes: 1, shake: 0, sulks: 0.6 },
};

/** What is said over the reel when each begins its thing. */
export const STYLE_SAYS: Record<FightStyle, string> = { steady: 'It thrashes!', runner: 'It runs!', diver: 'It dives!', jumper: 'It leaps!', sulker: 'It thrashes!' };

/** How each kind fights. Anything not named is steady. */
const FIGHTS: Record<string, FightStyle> = {
  mackerel: 'runner', tuna: 'runner', swordfish: 'runner', manta: 'runner', 'red-snapper': 'runner', pike: 'runner', koi: 'runner', 'mist-ray': 'runner',
  flounder: 'diver', catfish: 'diver', eel: 'diver', carp: 'diver', sturgeon: 'diver', lobster: 'diver', octopus: 'diver', anglerfish: 'diver', 'giant-squid': 'diver', 'thunder-eel': 'diver', 'ghost-carp': 'diver', 'crystal-crab': 'diver',
  trout: 'jumper', salmon: 'jumper', grayling: 'jumper', 'sea-bass': 'jumper', bluegill: 'jumper', 'golden-trout': 'jumper', 'spark-bass': 'jumper', 'maple-salmon': 'jumper', 'frost-char': 'jumper',
  'whale-shark': 'sulker', oarfish: 'sulker', coelacanth: 'sulker', axolotl: 'sulker', sunfish: 'sulker', turtle: 'sulker',
  // Kettle Isle: the lake's fish sit and sulk, the reef's run.
  'door-carp': 'sulker', 'the-lid': 'sulker', 'steam-pike': 'runner', 'reef-moray': 'diver', parrotfish: 'runner', lionfish: 'jumper',
};
export const styleOf = (species: string): FightStyle => FIGHTS[species] ?? 'steady';

export interface Fighter {
  /** How hard it fights, 0 to 1 (a species' fight, nudged up by its size). */
  fight: number;
  /** The way it fights (steady when not given). */
  style?: FightStyle;
}

export function startReel(rand: () => number): ReelState {
  return { progress: 0.18, tension: 0.1, thrashing: false, sulking: false, moodLeft: 1 + rand(), slack: 0, elapsed: 0, outcome: 'reeling' };
}

/** The numbers the reel runs on. */
export const REEL = {
  /** Progress a second when winding against a calm fish, before rod and fish. */
  wind: 0.24,
  /** Progress lost a second when not winding. */
  drift: 0.035,
  /** Strain a second when winding against a calm fish. */
  strainCalm: 0.16,
  /** Strain a second when winding against a thrashing fish. */
  strainThrash: 1.05,
  /** Strain lost a second when not winding. */
  ease: 0.55,
  /** How long a fish stays at the far end with nothing gained before it slips off. */
  slackLimit: 4,
} as const;

/** Advance by dt seconds. `winding` is whether the button is held. */
export function stepReel(s: ReelState, dt: number, winding: boolean, fish: Fighter, rod: Rod, rand: () => number): ReelState {
  if (s.outcome !== 'reeling') return s;
  const n = { ...s, elapsed: s.elapsed + dt };
  const st = STYLES[fish.style ?? 'steady'];
  // How well the hook holds (finer hooks: see `rigged` in economy.ts).
  const hold = rod.hold ?? 1;
  n.moodLeft -= dt;
  if (n.moodLeft <= 0) {
    const calm = (): number => (0.9 + rand() * (2.2 - fish.fight * 1.1)) * st.calmFor;
    if (n.sulking) {
      n.sulking = false;
      n.moodLeft = calm();
    } else if (n.thrashing) {
      n.thrashing = false;
      n.sulking = rand() < st.sulks;
      n.moodLeft = n.sulking ? 1.4 + rand() * 1.6 : calm();
    } else {
      n.thrashing = true;
      n.moodLeft = (0.5 + rand() * (0.6 + fish.fight * 0.9)) * st.thrashFor;
      // A leap shakes a little line loose; a better hook, less.
      n.progress -= st.shake / hold;
    }
  }
  const strength = 0.45 + fish.fight;
  if (winding) {
    n.progress += ((REEL.wind * rod.power) / strength) * st.wind * (n.thrashing ? 0.3 : n.sulking ? 0.12 : 1) * dt;
    n.tension += ((n.thrashing ? REEL.strainThrash : n.sulking ? REEL.strainCalm * 0.35 : REEL.strainCalm * st.heavy) * strength) / rod.control * dt;
  } else {
    n.progress -= REEL.drift * strength * (n.thrashing ? 2 * st.takes : 1) * dt;
    n.tension -= REEL.ease * dt;
  }
  n.tension = Math.max(0, n.tension);
  n.progress = Math.min(1, Math.max(0, n.progress));
  n.slack = n.progress <= 0 ? n.slack + dt : 0;
  if (n.tension >= 1) n.outcome = 'snapped';
  else if (n.progress >= 1) n.outcome = 'landed';
  else if (n.slack >= REEL.slackLimit * hold) n.outcome = 'escaped';
  return n;
}

/** How hard a particular catch fights: its kind's fight, a little more for a big one. */
export function fighterFor(fight: number, sizeFrac: number, species?: string): Fighter {
  return { fight: Math.min(1.1, fight * (0.85 + 0.3 * sizeFrac)), style: species ? styleOf(species) : 'steady' };
}
