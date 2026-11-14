import { describe, expect, it } from 'vitest';
import { Heightfield, fishingZone, rawHeight, standHeight, walkable, waterAt } from './island';
import { CAMP, CREEK, PIER, PLACES, PLAZA, POND } from './layout';

const field = new Heightfield();

describe('island', () => {
  it('reads the drawn ground between samples, matching the grid at sample points', () => {
    for (const [x, z] of [[0, 0], [10, -5], [-30, 22]]) expect(field.heightAt(x, z)).toBeCloseTo(rawHeight(x, z), 4);
    const a = field.heightAt(3.3, 4.7);
    expect(Number.isFinite(a)).toBe(true);
  });

  it('has a level square above the sea', () => {
    expect(field.heightAt(PLAZA.x, PLAZA.z)).toBeCloseTo(PLAZA.h, 1);
    expect(field.heightAt(PLAZA.x + 5, PLAZA.z + 3)).toBeCloseTo(PLAZA.h, 1);
  });

  it('puts the pier over the sea, its head over deep water', () => {
    expect(field.heightAt(PIER.x0 + 1, PIER.z)).toBeGreaterThan(0.2);
    expect(field.heightAt(PIER.x0 + 1, PIER.z)).toBeLessThan(PIER.deck);
    expect(fishingZone(field, PIER.x0 + 14, PIER.z + 4)).toBe('ocean');
    expect(fishingZone(field, PIER.x1 + 8, PIER.z)).toBe('deep');
    expect(standHeight(field, 80, PIER.z)).toBe(PIER.deck);
  });

  it('has a pond and a creek of fresh water', () => {
    expect(fishingZone(field, POND.x, POND.z)).toBe('pond');
    expect(fishingZone(field, POND.x + 6, POND.z + 2)).toBe('pond');
    expect(fishingZone(field, CREEK[2][0], CREEK[2][1])).toBe('creek');
    expect(waterAt(field, POND.x, POND.z)?.level).toBe(POND.level);
  });

  it('lets every named place be stood on', () => {
    for (const [name, p] of Object.entries(PLACES)) {
      expect(walkable(field, p.x, p.z), name).toBe(true);
    }
    expect(walkable(field, CAMP.x + 3, CAMP.z)).toBe(true);
  });

  it('keeps people out of deep water', () => {
    expect(walkable(field, 0, 100)).toBe(false);
    expect(walkable(field, POND.x, POND.z)).toBe(false);
  });
});

describe('water', () => {
  it('keeps the pond and creek beds above the sea, so the sea never shows through them', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.2)
      for (let r = 0; r < POND.r; r += 1) expect(field.heightAt(POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r)).toBeGreaterThan(0.2);
  });
});

describe('pier', () => {
  it('has boards under every metre that can be walked on', async () => {
    const { FLOORS, pierSections } = await import('./layout');
    const tiles = pierSections();
    for (const f of FLOORS)
      for (let x = f.x0 + 0.3; x < f.x1; x += 0.5)
        for (let z = f.z0 + 0.3; z < f.z1; z += 0.5) expect(tiles.some((t) => Math.abs(t.x - x) <= 1.51 && Math.abs(t.z - z) <= 1.51), `${x},${z}`).toBe(true);
  });
});
