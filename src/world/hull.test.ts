import { describe, expect, it } from 'vitest';
import { OAR, oarAt, readHull } from './hull';

/**
 * A boat as points: three metres long, square at the stern and pointed at the bow, with a
 * floor, a rim, and two benches across it. `flip` turns it end for end.
 */
function boat(flip = false): number[] {
  const out: number[] = [];
  const put = (x: number, y: number, z: number): void => void out.push(x, y, flip ? -z : z);
  for (let z = -1.5; z <= 1.5; z += 0.05) {
    // Full width for the stern half, narrowing to a point at the bow.
    const half = z < 0.3 ? 0.75 : 0.75 * Math.max(0.05, 1 - (z - 0.3) / 1.2);
    for (const side of [-1, 1]) {
      put(side * half, 0.8, z);
      put(side * half * 0.6, 0, z);
    }
    // The floor, and a bench at each of two places.
    const bench = (z > -1.0 && z < -0.6) || (z > 0.1 && z < 0.5);
    for (const x of [-0.05, 0, 0.05]) put(x, bench ? 0.66 : 0.4, z);
  }
  return out;
}

describe('a rowboat read from its model', () => {
  it('knows its bow from its stern, either way round', () => {
    expect(readHull(boat()).bow).toBe(1);
    expect(readHull(boat(true)).bow).toBe(-1);
  });

  it('finds its floor, and the bench to row from', () => {
    const h = readHull(boat());
    expect(h.floor).toBeCloseTo(0.4, 2);
    expect(h.seat.y).toBeCloseTo(0.66, 2);
    // The bench a little toward the bow, not the one in the stern.
    expect(h.seat.z).toBeGreaterThan(0.1);
    expect(h.seat.z).toBeLessThan(0.55);
    const back = readHull(boat(true));
    expect(back.seat.z).toBeCloseTo(-h.seat.z, 1);
  });

  it('puts the oars on the rim, before the rower, who faces the stern', () => {
    const h = readHull(boat());
    expect(h.lock.y).toBeCloseTo(0.8, 2);
    expect(h.lock.x).toBeCloseTo(0.75, 1);
    expect(h.lock.z).toBeLessThan(h.seat.z - 0.3);
    const back = readHull(boat(true));
    expect(back.lock.z).toBeGreaterThan(back.seat.z + 0.3);
  });

  it('makes something of a boat with no benches', () => {
    const flat: number[] = [];
    for (let z = -1; z <= 1; z += 0.1) for (const x of [-0.5, 0, 0.5]) flat.push(x, x === 0 ? 0.2 : 0.6, z);
    const h = readHull(flat);
    expect(h.seat.y).toBeGreaterThan(h.floor);
    expect(Number.isFinite(h.lock.x + h.lock.y + h.lock.z)).toBe(true);
  });
});

describe('an oar', () => {
  it('rests level and straight out when nobody is rowing', () => {
    for (const phase of [0, 1, 2, 4]) {
      const o = oarAt(phase, 0);
      expect(o.sweep).toBeCloseTo(0, 6);
      expect(o.dip).toBe(OAR.rest);
      expect(o.pull).toBe(0);
    }
  });

  it('is in the water as it goes from bow to stern, and out of it coming back', () => {
    // How far below the rim the blade's end is, for an oar that long: the water is about 0.63 below.
    const drop = (dip: number): number => Math.sin(dip) * OAR.out;
    let last = oarAt(0, 1).sweep;
    for (let phase = 0.2; phase < Math.PI; phase += 0.2) {
      const o = oarAt(phase, 1);
      // The drive: the blade goes sternward, and is under.
      expect(o.sweep).toBeGreaterThan(last);
      expect(drop(o.dip)).toBeGreaterThan(0.6);
      expect(o.pull).toBeGreaterThan(0);
      last = o.sweep;
    }
    for (let phase = Math.PI + 0.2; phase < Math.PI * 2; phase += 0.2) {
      const o = oarAt(phase, 1);
      // The recovery: back toward the bow, and clear of the water.
      expect(o.sweep).toBeLessThan(last);
      expect(drop(o.dip)).toBeLessThan(0.6);
      expect(o.pull).toBe(0);
      last = o.sweep;
    }
  });

  it('swings as far each way, and no further than a rower can reach', () => {
    expect(oarAt(0, 1).sweep).toBeCloseTo(-OAR.swing, 6);
    expect(oarAt(Math.PI, 1).sweep).toBeCloseTo(OAR.swing, 6);
    expect(OAR.inn * Math.sin(OAR.swing)).toBeLessThan(0.45);
  });
});
