import { describe, expect, it } from 'vitest';
import { RARE_EVERY, RARE_SKIES, dawnSky, nightOf, nightSky, rareSkyAt } from './rare';

describe('rare skies', () => {
  it('come about as often as they are meant to, and not every night', () => {
    const n = 4000;
    const seen = { aurora: 0, bloodmoon: 0, sunrise: 0 };
    for (let d = 0; d < n; d++) {
      const s = nightSky(d);
      if (s) seen[s]++;
      if (dawnSky(d)) seen.sunrise++;
    }
    for (const k of RARE_SKIES) {
      expect(seen[k]).toBeGreaterThan((n / RARE_EVERY[k]) * 0.6);
      expect(seen[k]).toBeLessThan((n / RARE_EVERY[k]) * 1.4);
    }
  });

  it('keep one sky for the whole of a night, across midnight', () => {
    const night = [...Array(400).keys()].find((d) => nightSky(d) === 'aurora')!;
    expect(rareSkyAt(night, 23, true)).toBe('aurora');
    expect(rareSkyAt(night + 1, 2, true)).toBe('aurora');
    expect(nightOf(night + 1, 2)).toBe(night);
    expect(rareSkyAt(night, 15, true)).toBeNull();
    expect(rareSkyAt(night + 1, 12, true)).toBeNull();
  });

  it('show nothing under cloud', () => {
    for (let d = 0; d < 60; d++) for (let h = 0; h < 24; h++) expect(rareSkyAt(d, h, false)).toBeNull();
  });

  it('keep the sunrise to the dawn', () => {
    const day = [...Array(400).keys()].find((d) => dawnSky(d))!;
    expect(rareSkyAt(day, 6, true)).toBe('sunrise');
    expect(rareSkyAt(day, 9, true)).not.toBe('sunrise');
  });
});
