import { describe, expect, it } from 'vitest';
import { BRASS, PALE, inkLogo, type Word } from './logo';
import { INKS } from '../look/inks';

/** A word drawn as rows of '#' and '.'. */
const word = (rows: string[]): Word => ({ w: rows[0].length, h: rows.length, bits: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))) });

describe('the logo', () => {
  const top = word(['###.###', '#...#.#', '###.###', '#...#.#', '###.#.#']);
  const under = word(['##', '##', '##', '##']);
  const { w, h, at } = inkLogo([
    { word: top, tones: PALE },
    { word: under, tones: BRASS },
  ]);
  const ink = (x: number, y: number): string => (x < 0 || y < 0 || x >= w || y >= h ? '' : at[y * w + x]);

  it('uses only the island\'s inks', () => {
    const inks = new Set<string>(INKS);
    for (const c of at) if (c) expect(inks.has(c)).toBe(true);
  });

  it('gives every letter a pale top edge and a dark foot', () => {
    // The top word's first column is solid from top to bottom.
    const left = at.findIndex((c) => c === PALE[0]) % w;
    const first = at.findIndex((c) => c === PALE[0]);
    const y0 = Math.floor(first / w);
    expect(ink(left, y0)).toBe(PALE[0]);
    expect(ink(left, y0 + top.h - 1)).toBe(PALE[3]);
    expect([PALE[1], PALE[2]]).toContain(ink(left, y0 + 1));
  });

  it('puts an ink line all round the letters, and nothing clear touching them', () => {
    const faces = new Set<string>([...PALE, ...BRASS]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!faces.has(ink(x, y))) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(ink(x + dx, y + dy)).not.toBe('');
      }
  });

  it('centres the words one under the other with a shadow down and to the right', () => {
    const brass = at.map((c, i) => (c === BRASS[1] || c === BRASS[2] ? i % w : -1)).filter((x) => x >= 0);
    const pale = at.map((c, i) => (c === PALE[1] || c === PALE[2] ? i % w : -1)).filter((x) => x >= 0);
    const mid = (xs: number[]): number => (Math.min(...xs) + Math.max(...xs)) / 2;
    expect(Math.abs(mid(brass) - mid(pale))).toBeLessThanOrEqual(1);
    // The last row and the last column hold only shadow or nothing: no letter runs off the edge.
    for (let x = 0; x < w; x++) expect(['', '#10181f']).toContain(ink(x, h - 1));
    for (let y = 0; y < h; y++) expect(['', '#10181f']).toContain(ink(w - 1, y));
    expect(at.some((c, i) => c === '#10181f' && Math.floor(i / w) === h - 1)).toBe(true);
  });
});
