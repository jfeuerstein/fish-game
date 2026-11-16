import { describe, expect, it, vi } from 'vitest';
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('sky'));
import { fishingZone, walkable, waterAt } from './island';
import { checkIsle } from './isleChecks';
import { VENTS, WALLS, walled } from './layout';
import { SKY } from './thistle';

describe('Thistledown', () => {
  const field = checkIsle(['cloud', 'aerie']);

  it('stands above cloud on cliffs: there is nowhere to wade', () => {
    let wet = 0;
    for (let x = -118; x <= 118; x += 1) for (let z = -118; z <= 118; z += 1) {
      const w = waterAt(field, x, z);
      if (w && w.zone === 'cloud' && w.depth < 0.45) wet++;
    }
    // (A thin line at the foot of the cliff, and no more.)
    expect(wet).toBeLessThan(400);
  });

  it('has a spire with a flat top and a pool on it', () => {
    expect(fishingZone(field, SKY.aerie.x, SKY.aerie.z)).toBe('aerie');
    for (let a = 0; a < Math.PI * 2; a += 0.4) {
      const x = SKY.spire.x + Math.cos(a) * 7.5;
      const z = SKY.spire.z + Math.sin(a) * 7.5;
      expect(field.heightAt(x, z)).toBeCloseTo(SKY.spire.top, 0);
      expect(walkable(field, x, z)).toBe(true);
      expect(waterAt(field, x, z)).toBeNull();
    }
  });

  it('cannot be walked up, and can be walked off', () => {
    expect(WALLS).toHaveLength(1);
    const w = WALLS[0];
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const out = [w.x + Math.cos(a) * (w.r + 0.3), w.z + Math.sin(a) * (w.r + 0.3)];
      const inn = [w.x + Math.cos(a) * (w.r - 0.3), w.z + Math.sin(a) * (w.r - 0.3)];
      expect(walled(out[0], out[1], inn[0], inn[1])).toBe(true);
      expect(walled(inn[0], inn[1], out[0], out[1])).toBe(false);
    }
    // The foot of the wall is well below the top.
    expect(field.heightAt(w.x + SKY.spire.r + 1, w.z)).toBeLessThan(SKY.spire.top - 9);
  });

  it('has three updrafts on open ground, the first at the foot of the spire', () => {
    expect(VENTS).toHaveLength(3);
    for (const v of VENTS) {
      expect(walkable(field, v.x, v.z)).toBe(true);
      expect(waterAt(field, v.x, v.z)).toBeNull();
      expect(field.heightAt(v.x, v.z)).toBeLessThan(6);
    }
    const d = Math.hypot(VENTS[0].x - SKY.spire.x, VENTS[0].z - SKY.spire.z);
    expect(d).toBeGreaterThan(SKY.spire.r + 2);
    expect(d).toBeLessThan(SKY.spire.r + 6);
  });
});
