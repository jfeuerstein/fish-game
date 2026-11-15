import { describe, expect, it } from 'vitest';
import { BEAT, BOAT_OUT, GLIDE, GULLS, STAR_EVERY, STAR_LASTS, STAR_ODDS, boatAt, gullAt, gullsOut, shootingStar } from './skylife';

describe('life in the sky', () => {
  it('keeps the gulls over the island, above the trees, flying the way they face', () => {
    for (let i = 0; i < GULLS; i++) {
      for (let t = 0; t < 600; t += 7.3) {
        const g = gullAt(i, t);
        expect(Math.hypot(g.x, g.z)).toBeLessThan(120);
        expect(g.y).toBeGreaterThan(15);
        // A moment later it is further along the way it faces.
        const next = gullAt(i, t + 0.1);
        const ahead = (next.x - g.x) * Math.sin(g.yaw) + (next.z - g.z) * Math.cos(g.yaw);
        expect(ahead).toBeGreaterThan(0.3);
      }
    }
  });

  it('holds wings only in the poses of a beat or a glide', () => {
    const poses = new Set<number>([...BEAT, GLIDE]);
    const seen = new Set<number>();
    for (let t = 0; t < 120; t += 0.05) seen.add(gullAt(1, t).wings);
    for (const w of seen) expect(poses.has(w)).toBe(true);
    // Both flapping and gliding happen.
    expect(seen.has(GLIDE)).toBe(true);
    expect(seen.has(BEAT[0])).toBe(true);
  });

  it('sends the gulls in at night and most of them in from the rain', () => {
    expect(gullsOut(0, 0)).toBe(GULLS);
    expect(gullsOut(1, 0)).toBe(0);
    expect(gullsOut(0, 1)).toBe(1);
  });

  it('keeps the boat far out, going round', () => {
    for (let t = 0; t < 5000; t += 111) {
      const b = boatAt(t);
      expect(Math.hypot(b.x, b.z)).toBeCloseTo(BOAT_OUT, 6);
      const next = boatAt(t + 1);
      expect((next.x - b.x) * Math.sin(b.yaw) + (next.z - b.z) * Math.cos(b.yaw)).toBeGreaterThan(0);
    }
  });

  it('lets a star fall now and then, briefly, high in the sky', () => {
    let falling = 0;
    let stretches = 0;
    const step = 0.05;
    const total = STAR_EVERY * 400;
    const had = new Set<number>();
    for (let t = 0; t < total; t += step) {
      const s = shootingStar(t);
      if (!s) continue;
      falling += step;
      had.add(Math.floor(t / STAR_EVERY));
      expect(s.k).toBeGreaterThanOrEqual(0);
      expect(s.k).toBeLessThan(1);
      expect(s.el).toBeGreaterThan(0.1);
      expect(s.el).toBeLessThan(0.45);
    }
    stretches = had.size;
    // About the share of stretches it is meant to be, and each as long as it is meant to last.
    expect(stretches / 400).toBeGreaterThan(STAR_ODDS - 0.12);
    expect(stretches / 400).toBeLessThan(STAR_ODDS + 0.12);
    expect(falling / stretches).toBeCloseTo(STAR_LASTS, 1);
  });
});
