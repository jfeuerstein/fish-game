import { describe, expect, it, vi } from 'vitest';
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('glow'));
import { walkable, waterAt } from './island';
import { checkIsle } from './isleChecks';
import { GLOW } from './glow';
import { BEACONS } from './layout';

describe('Glowmere', () => {
  const field = checkIsle(['glow', 'mere', 'deep']);

  it('has a pond in a hollow, above the sea', () => {
    expect(waterAt(field, GLOW.mere.x, GLOW.mere.z)?.zone).toBe('mere');
    expect(GLOW.mere.level).toBeGreaterThan(1);
  });

  it('has three beacons on dry ground that can be walked up to, well apart', () => {
    expect(BEACONS.length).toBe(3);
    for (const b of BEACONS) {
      expect(field.heightAt(b.x, b.z)).toBeGreaterThan(2);
      expect(walkable(field, b.x + 1.5, b.z + 1.5)).toBe(true);
      for (const o of BEACONS) if (o !== b) expect(Math.hypot(o.x - b.x, o.z - b.z)).toBeGreaterThan(40);
    }
  });
});
