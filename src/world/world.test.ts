import { describe, expect, it } from 'vitest';
import { Colliders } from './colliders';
import { Heightfield, waterAt } from './island';
import { FLOWER_RULES, RULES, lilypads, scatter } from './scatter';

const field = new Heightfield();

describe('scatter', () => {
  it('grows plenty of trees, all on dry land, the same every time', () => {
    const a = scatter(field);
    const b = scatter(field);
    expect(a).toEqual(b);
    expect(a.filter((p) => p.id.startsWith('tree')).length).toBeGreaterThan(150);
    for (const p of a) expect(waterAt(field, p.x, p.z)).toBeNull();
  });
  it('finds homes for flowers and reeds', () => {
    const f = scatter(field, FLOWER_RULES, 2);
    expect(f.filter((p) => p.id === 'cattails').length).toBeGreaterThan(15);
    expect(f.length).toBeGreaterThan(300);
    expect(lilypads().length).toBe(16);
    void RULES;
  });
});

describe('colliders', () => {
  it('pushes out of circles and rotated boxes', () => {
    const c = new Colliders();
    c.addCircle({ x: 0, z: 0, r: 1 });
    const [x, z] = c.resolve(0.5, 0, 0.3);
    expect(Math.hypot(x, z)).toBeCloseTo(1.3, 5);
    const b = new Colliders();
    b.addBox({ x: 10, z: 0, hw: 2, hd: 1, yaw: Math.PI / 2 });
    // Rotated a quarter turn, the box is 2 deep along world z and 1 wide along world x.
    const [bx] = b.resolve(10.5, 0, 0.3);
    expect(Math.abs(bx - 10)).toBeCloseTo(1.3, 5);
  });
});
