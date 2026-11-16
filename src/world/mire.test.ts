import { describe, expect, it, vi } from 'vitest';
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('mire'));
import { walkable, waterAt } from './island';
import { checkIsle } from './isleChecks';
import { POTS, WALKS, floorAt } from './layout';
import { CHANNELS } from './mire';

describe('Mirewood', () => {
  const field = checkIsle(['swamp', 'ocean', 'deep']);

  it('is cut by channels that cannot be waded', () => {
    for (const c of CHANNELS)
      for (let i = 1; i < c.length; i++) {
        const x = (c[i - 1][0] + c[i][0]) / 2;
        const z = (c[i - 1][1] + c[i][1]) / 2;
        if (floorAt(x, z) !== null || Math.hypot(x, z) > 70) continue;
        expect(waterAt(field, x, z)?.zone).toBe('swamp');
        expect(walkable(field, x, z)).toBe(false);
      }
  });

  it('has boardwalks over them, walkable from end to end', () => {
    expect(WALKS.length).toBeGreaterThanOrEqual(3);
    for (const w of WALKS) for (let x = w.x0 + 0.5; x < w.x1; x += 1) for (let z = w.z0 + 0.5; z < w.z1; z += 1) expect(walkable(field, x, z)).toBe(true);
  });

  it('has places for crab pots in still water, each within reach of the boards', () => {
    expect(POTS.length).toBe(4);
    for (const p of POTS) {
      expect(waterAt(field, p.x, p.z)?.zone, p.id).toBe('swamp');
      expect(floorAt(p.x, p.z), p.id).toBeNull();
      expect(WALKS.some((w) => p.x > w.x0 - 3.5 && p.x < w.x1 + 3.5 && p.z > w.z0 - 3.5 && p.z < w.z1 + 3.5), p.id).toBe(true);
    }
  });
});
