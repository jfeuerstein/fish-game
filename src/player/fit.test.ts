import { describe, expect, it } from 'vitest';
import { FITS, type Measure, fitFor, placeFor, sliceAt } from './fit';

const m: Measure = {
  height: 1.1, top: 1.08, headZ: 0, headW: 0.5, eyeY: 0.86, faceZ: 0.24, neckY: 0.62, neckW: 0.36, neckFront: 0.18,
  chestY: 0.57, chestFront: 0.2, backY: 0.45, backZ: -0.2, backW: 0.42, earY: 1.0, earX: -0.2,
  profile: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.08].map((y) => ({ y, w: 0.3 + (y > 0.65 ? 0.2 : 0), front: 0.2, back: -0.2 })),
};

describe('fitting cosmetics', () => {
  it('has a fit for every hat and accessory', () => {
    for (const id of ['hat-bucket', 'hat-straw', 'hat-beanie', 'hat-captain', 'hat-flowers', 'hat-frog', 'hat-pirate', 'hat-top', 'hat-propeller', 'hat-cowboy', 'hat-crown', 'hat-mushroom', 'hat-fish', 'hat-sailor', 'hat-viking', 'hat-chef', 'x-glasses', 'x-shades', 'x-scarf', 'x-bowtie', 'x-backpack', 'x-flower']) expect(FITS[id], id).toBeTruthy();
  });
  it('applies per-character corrections', () => {
    expect(fitFor('hat-bucket', 'char-frog')!.forward).toBeLessThan(fitFor('hat-bucket', 'char-otter')!.forward);
  });
  it('sizes a hat by its crown to the head and seats it between the eyes and the top', () => {
    const p = placeFor(fitFor('hat-bucket', 'char-otter')!, m, { x: 1, y: 0.5, z: 1, crown: 0.6 });
    // The crown (0.6 of the model) comes out about as wide as the head.
    expect(0.6 * p.scale).toBeGreaterThan(0.4);
    expect(0.6 * p.scale).toBeLessThan(0.6);
    expect(p.y).toBeGreaterThan(m.eyeY - 0.05);
    expect(p.y).toBeLessThan(m.top);
  });
  it('puts glasses on the face, the scarf at the neck and the pack on the back', () => {
    const g = placeFor(fitFor('x-glasses', 'char-otter')!, m, { x: 1, y: 0.3, z: 0.4 });
    expect(g.z).toBeGreaterThan(0);
    const sc = placeFor(fitFor('x-scarf', 'char-otter')!, m, { x: 1, y: 0.2, z: 1 });
    expect(sc.y).toBeLessThan(m.neckY);
    const b = placeFor(fitFor('x-backpack', 'char-otter')!, m, { x: 0.7, y: 0.8, z: 0.4 });
    expect(b.backwards).toBe(true);
    expect(b.z).toBeLessThan(0);
  });
  it('reads the body between measured slices', () => {
    expect(sliceAt(m, 0.55).w).toBeCloseTo(0.3, 5);
    expect(sliceAt(m, 2).w).toBeCloseTo(0.5, 5);
  });
});
