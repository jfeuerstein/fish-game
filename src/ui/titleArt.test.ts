import { describe, expect, it } from 'vitest';
import { BOBBER, GULLS, GULL_FRAMES, TITLE_SIZE, WATER_FROM, dip, isWater, lap } from './titleArt';

describe('the living title', () => {
  it('slides the water a pixel or two, and not all rows the same way', () => {
    const moves = new Set<number>();
    for (let y = WATER_FROM; y < TITLE_SIZE.h; y++) {
      const by = lap(y, 3.7);
      expect(Math.abs(by)).toBeLessThanOrEqual(2);
      moves.add(by);
    }
    expect(moves.size).toBeGreaterThan(2);
  });

  it('dips the bobber only now and then', () => {
    let down = 0;
    for (let t = 0; t < 65; t += 0.1) down += dip(t);
    expect(down).toBeGreaterThan(20);
    expect(down).toBeLessThan(90);
  });

  it('knows water from wood and sand', () => {
    expect(isWater(40, 150, 170)).toBe(true);
    expect(isWater(250, 250, 240)).toBe(true);
    expect(isWater(150, 100, 60)).toBe(false);
    expect(isWater(240, 220, 160)).toBe(false);
  });

  it('keeps everything it touches inside the picture', () => {
    for (const g of [...GULLS, BOBBER]) {
      expect(g.x - 12).toBeGreaterThanOrEqual(0);
      expect(g.x + g.w + 12).toBeLessThan(TITLE_SIZE.w);
      expect(g.y + g.h + 5).toBeLessThan(TITLE_SIZE.h);
    }
    for (const f of GULL_FRAMES) expect(new Set(f.map((row) => row.length)).size).toBe(1);
  });
});
