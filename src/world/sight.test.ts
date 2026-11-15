import { describe, expect, it } from 'vitest';
import { sightCrosses, type Drum, type Sight } from './sight';

/** A sight line from a player at the origin (chest 0.9 up) to a camera behind and above. */
const sight = (cx: number, cy: number, cz: number): Sight => ({ ax: 0, ay: 0.9, az: 0, dx: cx, dy: cy - 0.9, dz: cz });
const tree = (x: number, z: number, more: Partial<Drum> = {}): Drum => ({ x, z, base: 0, height: 8, radius: 2.5, trunk: 0.3, ...more });
/** The usual camera: seven metres back (to +z) and four up. */
const usual = sight(0, 4, 7);

describe('trees in the line of sight', () => {
  it('counts a tree standing between the camera and the player', () => {
    expect(sightCrosses(usual, tree(0, 5))).toBe(true);
  });

  it('counts a tree the camera is inside the crown of', () => {
    expect(sightCrosses(usual, tree(1, 7.5))).toBe(true);
  });

  it('leaves alone a tree beyond the player, however close', () => {
    expect(sightCrosses(usual, tree(0, -3))).toBe(false);
    expect(sightCrosses(usual, tree(0, -2.6))).toBe(false);
  });

  it('leaves alone a tree beside the line', () => {
    expect(sightCrosses(usual, tree(4, 3))).toBe(false);
    expect(sightCrosses(usual, tree(-3, 0))).toBe(false);
  });

  it('leaves alone a tree whose bare trunk is all that crosses the line', () => {
    // A tall tree right by the player: the line passes under its crown and is out from under it before it rises that far.
    expect(sightCrosses(usual, tree(0, 0.5, { height: 14, radius: 1.5 }))).toBe(false);
  });

  it('leaves alone a small tree the camera looks over', () => {
    expect(sightCrosses(usual, tree(0, 6, { height: 2, radius: 1 }))).toBe(false);
  });

  it('counts a tree whose crown is over the player and under the camera', () => {
    expect(sightCrosses(sight(0, 9, 3), tree(0, 1, { height: 6, radius: 3 }))).toBe(true);
  });

  it('copes with a camera straight overhead', () => {
    expect(sightCrosses(sight(0, 12, 0), tree(0.5, 0.5))).toBe(true);
    expect(sightCrosses(sight(0, 12, 0), tree(5, 5))).toBe(false);
  });
});
