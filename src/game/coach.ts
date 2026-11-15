// The first minute: someone new is walked through moving, looking round and landing one fish,
// a step at a time, each step done by doing it. Nothing is timed and it can be skipped. Pure:
// which step comes next, and what each one says.

export type CoachStep = 'walk' | 'look' | 'cast' | 'bite' | 'reel' | 'done';

/** The steps in order, for saying "2 of 5". The last is the goodbye, not a thing to do. */
export const COACH_STEPS: readonly CoachStep[] = ['walk', 'look', 'cast', 'bite', 'reel', 'done'];

export const COACH_SAYS: Record<CoachStep, string> = {
  walk: 'Put your thumb down in the bottom third of the screen and drag to walk.',
  look: 'Drag anywhere higher up to look round.',
  cast: 'Walk to the water and face it. Hold Cast, then let go.',
  bite: 'Wait for a bite... then tap Hook!',
  reel: 'Hold Reel to wind it in. If the fish thrashes, let go for a moment.',
  done: 'Your first fish! Gus buys them at the shop on the square. The island is yours.',
};

/** How far to walk, metres, and how far to turn the view, radians, before those steps count as learnt. */
export const COACH_WALK = 3;
export const COACH_TURN = 0.6;

/** What the game knows about the player since the coach began. */
export interface CoachFacts {
  /** Metres walked on foot and how far the view has been turned, since the present step began. */
  walked: number;
  turned: number;
  /** Where a cast has got to. */
  fishing: 'ready' | 'aiming' | 'flying' | 'waiting' | 'bite' | 'reeling' | 'landing' | 'returning';
  /** Fish landed since the coach began. */
  caught: number;
}

/** The step to be on, given the one the player is on and what they have done. */
export function coachNext(step: CoachStep, f: CoachFacts): CoachStep {
  // A fish landed is the end of it, whatever step that happened on.
  if (f.caught > 0) return 'done';
  const idle = f.fishing === 'ready' || f.fishing === 'returning';
  switch (step) {
    case 'walk':
      return f.walked >= COACH_WALK ? 'look' : 'walk';
    case 'look':
      return f.turned >= COACH_TURN ? 'cast' : 'look';
    case 'cast':
      if (f.fishing === 'reeling' || f.fishing === 'landing') return 'reel';
      return f.fishing === 'waiting' || f.fishing === 'bite' ? 'bite' : 'cast';
    case 'bite':
      if (f.fishing === 'reeling' || f.fishing === 'landing') return 'reel';
      // The bite was missed, or the line was pulled in: cast again.
      return idle ? 'cast' : 'bite';
    case 'reel':
      // It got away: cast again.
      return idle ? 'cast' : 'reel';
    case 'done':
      return 'done';
  }
}

/** Whether someone is to be coached: never coached or skipped before, and no fish to their name. */
export function coachDue(hints: readonly string[], caught: number): boolean {
  return !hints.includes('coach') && caught === 0;
}
