import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPRESSIONS, FACES, CELL, blinking, faceFor, faceSheet } from '../player/face';
import { INKS } from './inks';
import { lookFor, pictureSize, poseDue } from './look';

describe('the look', () => {
  it('draws a small picture: one pixel to two points, or three when chunkier', () => {
    expect(pictureSize(lookFor(null), 402, 874, 3)).toEqual({ width: 201, height: 437 });
    expect(pictureSize(lookFor(null, true), 402, 874, 3)).toEqual({ width: 134, height: 291 });
    // The smooth look is as sharp as the screen, up to two pixels a point.
    expect(pictureSize(lookFor('smooth'), 402, 874, 3)).toEqual({ width: 804, height: 1748 });
  });

  it('holds a pose for a twelfth of a second, and gives a stride the same frames at any pace', () => {
    const look = lookFor(null);
    expect(poseDue(look, 0.05, false, 0, 0)).toBe(false);
    expect(poseDue(look, 0.09, false, 0, 0)).toBe(true);
    expect(poseDue(look, 0.01, true, 0.1, 0.12)).toBe(false);
    expect(poseDue(look, 0.01, true, 0.12, 0.13)).toBe(true);
    // Round the end of a stride and back to its start.
    expect(poseDue(look, 0.01, true, 0.99, 0.01)).toBe(true);
    expect(poseDue(lookFor('smooth'), 0, false, 0, 0)).toBe(true);
  });

  it('keeps one list of inks for the game and for the tool that cuts the models down', () => {
    const tool = readFileSync(new URL('../../tools/assets/palette.mjs', import.meta.url), 'utf8');
    const listed = tool.slice(tool.indexOf('export const INKS'), tool.indexOf('];')).match(/#[0-9a-f]{6}/g);
    expect(listed).toEqual([...INKS]);
    expect(new Set(INKS).size).toBe(INKS.length);
  });

  it('uses only inks in the interface', () => {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
    for (const colour of root.match(/#[0-9a-f]{6}\b/g) ?? []) expect(INKS, colour).toContain(colour);
    // Nothing soft: no blur, and no shadow that is not hard-edged.
    expect(css).not.toMatch(/backdrop-filter|blur\(/);
    for (const m of css.matchAll(/(?:box|text)-shadow: ([^;]+);/g)) {
      for (const part of m[1].split(/,(?![^(]*\))/)) {
        const lengths = part.replace(/rgba?\([^)]*\)|var\([^)]*\)|color-mix\(.*\)/g, '').match(/-?[\d.]+(px)?(?=\s|$)/g) ?? [];
        if (lengths.length >= 3) expect(parseFloat(lengths[2]), m[0]).toBe(0);
      }
    }
  });
});

describe('drawn faces', () => {
  it('has eyes for every character with a rig', () => {
    const index = JSON.parse(readFileSync(new URL('../../public/models/index.json', import.meta.url), 'utf8')) as Record<string, { rig?: boolean }>;
    const rigged = Object.keys(index).filter((id) => index[id].rig);
    expect(rigged.length).toBeGreaterThan(0);
    for (const id of rigged) expect(FACES[id], id).toBeDefined();
    for (const f of Object.values(FACES)) {
      expect(f.y).toBeGreaterThan(0.5);
      expect(f.y).toBeLessThan(1);
      expect(f.size).toBeGreaterThan(0.05);
    }
  });

  it('draws every expression, each different, in ink', () => {
    const sheet = faceSheet();
    expect(sheet.width).toBe(CELL * EXPRESSIONS.length);
    const cell = (col: number): string => {
      let s = '';
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) s += sheet.data[(y * sheet.width + col * CELL + x) * 4 + 3] ? '#' : '.';
      return s;
    };
    const cells = EXPRESSIONS.map((_, i) => cell(i));
    for (const c of cells) expect(c).toContain('#');
    expect(new Set(cells).size).toBe(EXPRESSIONS.length);
  });

  it('blinks briefly, and not everyone at once', () => {
    let shut = 0;
    let together = 0;
    for (let t = 0; t < 60; t += 0.02) {
      const a = blinking(t, 3);
      if (a) shut++;
      if (a && blinking(t, 4)) together++;
    }
    expect(shut / 3000).toBeGreaterThan(0.02);
    expect(shut / 3000).toBeLessThan(0.1);
    expect(together).toBeLessThan(shut / 2);
  });

  it('smiles at a catch and shuts its eyes for a flop', () => {
    expect(faceFor('show')).toBe('happy');
    expect(faceFor('flop')).toBe('closed');
    expect(faceFor('idle')).toBe('open');
  });
});
