import { describe, expect, it } from 'vitest';
import { COACH_SAYS, COACH_STEPS, COACH_TURN, COACH_WALK, coachDue, coachNext, type CoachFacts, type CoachStep } from './coach';

const facts = (more: Partial<CoachFacts> = {}): CoachFacts => ({ walked: 0, turned: 0, fishing: 'ready', caught: 0, ...more });

describe('the first minute', () => {
  it('has something short to say at every step', () => {
    for (const s of COACH_STEPS) {
      expect(COACH_SAYS[s].length).toBeGreaterThan(10);
      expect(COACH_SAYS[s].length).toBeLessThan(90);
    }
    expect(COACH_STEPS[COACH_STEPS.length - 1]).toBe('done');
  });

  it('waits for each thing to be done before moving on', () => {
    expect(coachNext('walk', facts({ walked: COACH_WALK - 0.1 }))).toBe('walk');
    expect(coachNext('walk', facts({ walked: COACH_WALK }))).toBe('look');
    expect(coachNext('look', facts({ turned: COACH_TURN - 0.1 }))).toBe('look');
    expect(coachNext('look', facts({ turned: COACH_TURN }))).toBe('cast');
    expect(coachNext('cast', facts({ fishing: 'aiming' }))).toBe('cast');
    expect(coachNext('cast', facts({ fishing: 'flying' }))).toBe('cast');
    expect(coachNext('cast', facts({ fishing: 'waiting' }))).toBe('bite');
    expect(coachNext('bite', facts({ fishing: 'bite' }))).toBe('bite');
    expect(coachNext('bite', facts({ fishing: 'reeling' }))).toBe('reel');
    expect(coachNext('reel', facts({ fishing: 'reeling' }))).toBe('reel');
    expect(coachNext('reel', facts({ fishing: 'landing', caught: 1 }))).toBe('done');
  });

  it('goes back to casting when a bite is missed or a fish gets away, and never fails anyone', () => {
    expect(coachNext('bite', facts({ fishing: 'ready' }))).toBe('cast');
    expect(coachNext('bite', facts({ fishing: 'returning' }))).toBe('cast');
    expect(coachNext('reel', facts({ fishing: 'ready' }))).toBe('cast');
  });

  it('ends at the first fish, whatever step it was landed on', () => {
    for (const s of COACH_STEPS) expect(coachNext(s, facts({ caught: 1 }))).toBe('done');
  });

  it('walks a whole first minute through in order', () => {
    const seen: CoachStep[] = [];
    let step: CoachStep = 'walk';
    const story: CoachFacts[] = [
      facts(),
      facts({ walked: 4 }),
      facts({ turned: 1 }),
      facts({ fishing: 'aiming' }),
      facts({ fishing: 'waiting' }),
      facts({ fishing: 'bite' }),
      facts({ fishing: 'reeling' }),
      facts({ fishing: 'landing', caught: 1 }),
    ];
    for (const f of story) {
      step = coachNext(step, f);
      if (seen[seen.length - 1] !== step) seen.push(step);
    }
    expect(seen).toEqual(['walk', 'look', 'cast', 'bite', 'reel', 'done']);
  });

  it('is for someone new only', () => {
    expect(coachDue([], 0)).toBe(true);
    expect(coachDue(['coach'], 0)).toBe(false);
    expect(coachDue([], 3)).toBe(false);
  });
});
