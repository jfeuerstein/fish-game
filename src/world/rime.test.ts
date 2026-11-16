import { describe, expect, it, vi } from 'vitest';
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('rime'));
import { fishingZone, walkable, waterAt } from './island';
import { checkIsle } from './isleChecks';
import { POOLS } from './layout';
import { HOLES, RIME } from './rime';

describe('Rimefall', () => {
  const field = checkIsle(['ice', 'floe']);

  it('has a lake frozen flat, to be walked on', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.3)
      for (const r of [3, 10, 18, 22]) {
        const x = RIME.lake.x + Math.cos(a) * r;
        const z = RIME.lake.z + Math.sin(a) * r;
        if (HOLES.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + 1.2)) continue;
        expect(field.heightAt(x, z)).toBeCloseTo(RIME.lake.level, 1);
        expect(waterAt(field, x, z)).toBeNull();
        expect(walkable(field, x, z)).toBe(true);
      }
  });

  it('is fished through holes in the ice, and nowhere else on it', () => {
    expect(POOLS).toBe(HOLES);
    for (const h of HOLES) {
      expect(fishingZone(field, h.x, h.z)).toBe('ice');
      expect(walkable(field, h.x, h.z)).toBe(false);
      // The ice beside the hole is dry.
      expect(waterAt(field, h.x + h.r + 1.5, h.z)).toBeNull();
    }
  });
});
