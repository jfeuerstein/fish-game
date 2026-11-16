import { describe, expect, it, vi } from 'vitest';
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('dune'));
import { fishingZone, walkable, waterAt } from './island';
import { checkIsle } from './isleChecks';
import { DUNE, SINKS, duneGreen, duneShore } from './dune';
import { POOLS, SUNDIAL } from './layout';

describe('Sandglass Key', () => {
  const field = checkIsle(['sand', 'oasis', 'ocean', 'deep']);

  it('is an hourglass: two lobes and a narrow waist', () => {
    expect(duneShore(0)).toBeGreaterThan(55);
    expect(duneShore(Math.PI)).toBeGreaterThan(55);
    expect(duneShore(Math.PI / 2)).toBeLessThan(27);
    expect(duneShore(-Math.PI / 2)).toBeLessThan(27);
  });

  it('has a sundial at the waist that can be walked up to', () => {
    expect(SUNDIAL.x).toBe(DUNE.dial.x);
    expect(field.heightAt(SUNDIAL.x, SUNDIAL.z)).toBeCloseTo(DUNE.dial.h, 1);
    for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) expect(walkable(field, SUNDIAL.x + dx, SUNDIAL.z + dz)).toBe(true);
  });

  it('is fished in pools of soft sand, which cannot be stood in', () => {
    expect(POOLS).toBe(SINKS);
    for (const p of SINKS) {
      expect(fishingZone(field, p.x, p.z)).toBe('sand');
      expect(walkable(field, p.x, p.z)).toBe(false);
      expect(waterAt(field, p.x + p.r + 1.6, p.z)).toBeNull();
      expect(walkable(field, p.x + p.r + 1.6, p.z)).toBe(true);
      for (const o of SINKS) if (o !== p) expect(Math.hypot(o.x - p.x, o.z - p.z)).toBeGreaterThan(p.r * 2 + 3);
    }
  });

  it('has an oasis in the west lobe, and green only round it', () => {
    expect(fishingZone(field, DUNE.oasis.x, DUNE.oasis.z)).toBe('oasis');
    expect(duneGreen(DUNE.oasis.x + DUNE.oasis.r + 3, DUNE.oasis.z)).toBeGreaterThan(0.8);
    expect(duneGreen(DUNE.pan.x, DUNE.pan.z)).toBe(0);
    expect(duneGreen(0, 0)).toBe(0);
  });

  it('has a great dune to slide down', () => {
    expect(field.heightAt(DUNE.big.x, DUNE.big.z)).toBeGreaterThan(7);
    expect(walkable(field, DUNE.big.x, DUNE.big.z)).toBe(true);
  });
});
