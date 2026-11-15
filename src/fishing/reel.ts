// The reeling: hold to wind in, let go when the line is straining. Pure and fixed-step.
import type { Rod } from '../game/economy';

export interface ReelState {
  /** How far in the fish is, 0 (just hooked) to 1 (landed). */
  progress: number;
  /** Strain on the line, 0 to 1; at 1 it snaps. */
  tension: number;
  /** Whether the fish is fighting hard right now. */
  thrashing: boolean;
  /** Seconds left in the fish's present mood. */
  moodLeft: number;
  /** Seconds the fish has been at the far end with nothing gained. */
  slack: number;
  elapsed: number;
  outcome: 'reeling' | 'landed' | 'snapped' | 'escaped';
}

export interface Fighter {
  /** How hard it fights, 0 to 1 (a species' fight, nudged up by its size). */
  fight: number;
}

export function startReel(rand: () => number): ReelState {
  return { progress: 0.18, tension: 0.1, thrashing: false, moodLeft: 1 + rand(), slack: 0, elapsed: 0, outcome: 'reeling' };
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
  n.moodLeft -= dt;
  if (n.moodLeft <= 0) {
    n.thrashing = !n.thrashing;
    n.moodLeft = n.thrashing ? 0.5 + rand() * (0.6 + fish.fight * 0.9) : 0.9 + rand() * (2.2 - fish.fight * 1.1);
  }
  const strength = 0.45 + fish.fight;
  if (winding) {
    n.progress += (REEL.wind * rod.power) / strength * (n.thrashing ? 0.3 : 1) * dt;
    n.tension += ((n.thrashing ? REEL.strainThrash : REEL.strainCalm) * strength) / rod.control * dt;
  } else {
    n.progress -= REEL.drift * strength * (n.thrashing ? 2 : 1) * dt;
    n.tension -= REEL.ease * dt;
  }
  n.tension = Math.max(0, n.tension);
  n.progress = Math.min(1, Math.max(0, n.progress));
  n.slack = n.progress <= 0 ? n.slack + dt : 0;
  if (n.tension >= 1) n.outcome = 'snapped';
  else if (n.progress >= 1) n.outcome = 'landed';
  else if (n.slack >= REEL.slackLimit) n.outcome = 'escaped';
  return n;
}

/** How hard a particular catch fights: its kind's fight, a little more for a big one. */
export function fighterFor(fight: number, sizeFrac: number): Fighter {
  return { fight: Math.min(1.1, fight * (0.85 + 0.3 * sizeFrac)) };
}
