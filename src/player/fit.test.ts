import { describe, expect, it } from 'vitest';
import { type Cut, FITS, HATS, HEADS, type Measure, fitFor, hatFor, headOf, measureHat, placeFor, placeHat, sliceAt } from './fit';

const m: Measure = {
  height: 1.1, top: 1.08, headZ: 0, headW: 0.5, eyeY: 0.86, faceZ: 0.24, neckY: 0.62, neckW: 0.36, neckFront: 0.18,
  chestY: 0.57, chestFront: 0.2, backY: 0.45, backZ: -0.2, backW: 0.42, earY: 1.0, earX: -0.2,
  profile: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.08].map((y) => ({ y, w: 0.3 + (y > 0.65 ? 0.2 : 0), front: 0.2, back: -0.2 })),
};

describe('fitting cosmetics', () => {
  it('has a fit for every hat and accessory', () => {
    for (const id of ['hat-bucket', 'hat-straw', 'hat-beanie', 'hat-captain', 'hat-flowers', 'hat-frog', 'hat-pirate', 'hat-top', 'hat-propeller', 'hat-cowboy', 'hat-crown', 'hat-mushroom', 'hat-fish', 'hat-sailor', 'hat-viking', 'hat-chef', 'x-glasses', 'x-shades', 'x-scarf', 'x-bowtie', 'x-backpack', 'x-flower']) expect(FITS[id], id).toBeTruthy();
  });
  it('has a skull for every character, and a way to wear every hat', () => {
    for (const c of ['char-otter', 'char-frog', 'char-raccoon']) expect(HEADS[c], c).toBeTruthy();
    for (const id of Object.keys(FITS).filter((k) => k.startsWith('hat-'))) expect(HATS[id], id).toBeTruthy();
  });
  it('finds where a brimmed hat gives way to its crown', () => {
    const ring = (r: number, cz = 0): Cut => Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const b = ((i + 1) / 16) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r + cz, Math.cos(b) * r, Math.sin(b) * r + cz] as [number, number, number, number];
    });
    // A brim 1 across up to a fifth of the height, then a crown 0.5 across set back a little;
    // the brim's curled edge (a ring further out) still shows higher up, and must not count.
    const s = measureHat({ x: 1, y: 0.5, z: 1 }, (k) => (k < 0.2 ? ring(0.5) : k < 0.5 ? [...ring(0.25, 0.05), ...ring(0.48)] : ring(0.25, 0.05)));
    expect(s.band).toBeCloseTo(0.21 * 0.5, 1);
    expect(s.open).toBeCloseTo(0.5, 1);
    expect(s.cz).toBeCloseTo(0.05, 2);
    // A beanie, narrowing gently to its top: no brim, so the head goes in at the bottom.
    const b = measureHat({ x: 0.6, y: 0.5, z: 0.6 }, (k) => ring(0.3 * (1 - k * 0.5)));
    expect(b.band).toBe(0);
  });
  it('rests a hat on the skull where the skull is as wide as its opening', () => {
    const head = headOf('char-otter', 1.1)!;
    const shape = { x: 1, y: 0.5, z: 1, band: 0.1, open: 0.5, cx: 0, cz: 0 };
    const p = placeHat(hatFor('hat-bucket', 'char-otter')!, head, shape);
    const bandY = p.y + 0.1 * p.scale;
    // The band is below the top of the skull and above its middle...
    expect(bandY).toBeLessThan(head.y + head.ry);
    expect(bandY).toBeGreaterThan(head.y);
    // ...and the opening there is at least as wide as the skull.
    const across = 2 * head.rx * Math.sqrt(1 - ((bandY - head.y) / head.ry) ** 2);
    expect(0.5 * p.scale).toBeGreaterThanOrEqual(across * 0.99);
    // Pulled down further, a deeper hat is bigger.
    const deep = placeHat({ ...hatFor('hat-bucket', 'char-otter')!, depth: 0.8 }, head, shape);
    expect(deep.scale).toBeGreaterThan(p.scale);
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
