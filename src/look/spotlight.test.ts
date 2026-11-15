import { describe, expect, it } from 'vitest';
import { SPOT, bayer, opened } from './spotlight';

/** The share of a block of pixels left out at a distance from the player. */
const share = (d: number): number => {
  let n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (opened(d, x, y)) n++;
  return n / 64;
};

describe('the spotlight on the player', () => {
  it('uses every threshold of the pattern once', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) seen.add(bayer(x, y));
    expect(seen.size).toBe(16);
    for (const v of seen) expect(v > 0 && v < 1).toBe(true);
    expect(bayer(5, 6)).toBe(bayer(1, 2));
    expect(bayer(-3, -2)).toBe(bayer(1, 2));
  });

  it('is wholly clear over the player and leaves everything alone beyond its rim', () => {
    expect(share(0)).toBe(1);
    expect(share(SPOT.core)).toBe(1);
    expect(share(1)).toBe(0);
    expect(share(1.5)).toBe(0);
  });

  it('thins out from the core to the rim without ever thickening', () => {
    let last = 1;
    for (let d = SPOT.core; d <= 1; d += 0.02) {
      const s = share(d);
      expect(s).toBeLessThanOrEqual(last);
      last = s;
    }
    // Half way out, about half is left.
    const mid = share(SPOT.core + (1 - SPOT.core) / 2);
    expect(mid).toBeGreaterThan(0.35);
    expect(mid).toBeLessThan(0.65);
  });

  it('is big enough to show the whole player and small enough to leave a tree a tree', () => {
    expect(SPOT.radius * SPOT.core).toBeGreaterThan(0.7);
    expect(SPOT.radius).toBeLessThan(3);
  });
});
