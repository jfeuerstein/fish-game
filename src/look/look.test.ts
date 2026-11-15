import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPRESSIONS, EYE_MAX, EYE_MIN, type Expression, GROW, SHAPE, blinking, eyeAt, eyeHeight, eyeShader, faceFor, readEyes } from '../player/face';
import { INKS } from './inks';
import { GAZE, Gaze, fidgetAt, lookToward } from '../player/gaze';
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

/** The extras of a model file's scene: a .glb is a header, then a chunk of JSON. */
function sceneExtras(id: string): Record<string, unknown> {
  const glb = readFileSync(new URL(`../../public/models/${id}.glb`, import.meta.url));
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { scene?: number; scenes: { extras?: Record<string, unknown> }[] };
  return json.scenes[json.scene ?? 0].extras ?? {};
}

describe('drawn eyes', () => {
  it('knows where every character with a rig had its eyes painted', () => {
    const index = JSON.parse(readFileSync(new URL('../../public/models/index.json', import.meta.url), 'utf8')) as Record<string, { rig?: boolean; h: number }>;
    const rigged = Object.keys(index).filter((id) => index[id].rig);
    expect(rigged.length).toBeGreaterThan(0);
    for (const id of rigged) {
      const eyes = readEyes(sceneExtras(id).eyes);
      expect(eyes, id).not.toBeNull();
      const [a, b] = eyes!;
      // A mirror pair in the head bone's frame: either side of its middle, level, alike in size.
      expect(a.p[0] * b.p[0], id).toBeLessThan(0);
      expect(Math.abs(a.p[0] + b.p[0]) / Math.abs(a.p[0] - b.p[0]), id).toBeLessThan(0.4);
      expect(Math.abs(a.p[1] - b.p[1]), id).toBeLessThan(0.05);
      expect(Math.min(a.r, b.r) / Math.max(a.r, b.r), id).toBeGreaterThan(0.6);
    }
  });

  it('reads nothing from a file that has no eyes, or broken ones', () => {
    expect(readEyes(undefined)).toBeNull();
    expect(readEyes([{ p: [0, 0, 0], n: [0, 0, 1], r: 0.1 }])).toBeNull();
    expect(readEyes([{ p: [0, 0], n: [0, 0, 1], r: 0.1 }, { p: [0, 0, 0], n: [0, 0, 1], r: 0.1 }])).toBeNull();
    expect(readEyes([{ p: [1, 0, 0], n: [0, 0, 1], r: 0.1 }, { p: [-1, 0, 0], n: [0, 0, 1], r: 0.1, on: 0.2 }])?.[1].on).toBe(0.2);
  });

  it('draws eyes a little too big, and every islander\'s about alike', () => {
    expect(eyeHeight(0.001, 1)).toBe(EYE_MIN);
    expect(eyeHeight(0.5, 1)).toBe(EYE_MAX);
    expect(eyeHeight(0.035, 1)).toBeCloseTo(0.035 * 2 * GROW);
  });

  /** An eye as it lands on a grid of pixels `n` tall: a row of text for each row of pixels. */
  const pixels = (face: Expression, n: number, side: 1 | -1 = 1, onDark = false): string[] => {
    const rows: string[] = [];
    for (let j = 0; j < n; j++) {
      let row = '';
      for (let i = 0; i < n; i++) row += { none: '.', ink: '#', pale: 'o', soft: '+' }[eyeAt(face, (i + 0.5) / n - 0.5, 0.5 - (j + 0.5) / n, side, onDark)];
      rows.push(row);
    }
    return rows;
  };

  it('draws every expression, each different, at the size they are seen in play', () => {
    // Five or six pixels tall at the camera's usual distance.
    for (const n of [5, 6, 12]) {
      const drawn = EXPRESSIONS.map((e) => pixels(e, n).join('\n'));
      for (const d of drawn) expect((d.match(/#/g) ?? []).length, d).toBeGreaterThanOrEqual(4);
      expect(new Set(drawn).size).toBe(EXPRESSIONS.length);
    }
    // A lid and a smile are lines that do not break: every column they span has ink.
    for (const e of ['closed', 'happy'] as const)
      for (const n of [5, 6, 7, 9]) {
        const rows = pixels(e, n);
        for (let i = 1; i < n - 1; i++) expect(rows.some((r) => r[i] === '#'), `${e} at ${n}, column ${i}\n${rows.join('\n')}`).toBe(true);
      }
    // An open eye is a tall oval with a glint up and to the left.
    const open = pixels('open', 12);
    expect(open[5][6]).toBe('#');
    expect(open.join('')).toContain('o');
    expect(open[0][0]).toBe('.');
  });

  it('mirrors a squint, and on dark fur shows an eye by its glint and its lines paler', () => {
    for (const [x, y] of [[0.2, 0.1], [-0.3, 0], [0.1, -0.25]]) expect(eyeAt('squint', x, y, 1)).toBe(eyeAt('squint', -x, y, -1));
    expect(eyeAt('squint', -0.3, 0, 1)).toBe('ink');
    expect(eyeAt('open', 0, 0, 1)).toBe('ink');
    expect(eyeAt('open', 0.2, -0.2, 1, true)).toBe('ink');
    expect(eyeAt('open', -0.06, 0.14, 1, true)).toBe('pale');
    expect(eyeAt('closed', 0, -0.06, 1)).toBe('ink');
    expect(eyeAt('closed', 0, -0.06, 1, true)).toBe('soft');
    expect(eyeAt('open', 0.37, 0, 1, true)).toBe('none');
  });

  it('gives the graphics card the same shapes', () => {
    const numbers = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(numbers));
    for (const n of numbers(SHAPE)) expect(eyeShader, String(n)).toContain(Number.isInteger(n) ? `${Math.abs(n)}.0` : `${Math.abs(n)}`);
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

describe('islanders', () => {
  it('turn their heads to watch someone near, as far as a neck goes, and give up on someone behind', () => {
    // Facing south (+z): someone to the east is to the left.
    expect(lookToward(0, 3, 3)).toBeCloseTo(Math.PI / 4);
    expect(lookToward(0, -3, 3)).toBeCloseTo(-Math.PI / 4);
    expect(lookToward(0, 5, -1)).toBe(GAZE.neck);
    expect(lookToward(0, 0.2, -5)).toBeNull();
    expect(lookToward(0, 0, GAZE.reach + 1)).toBeNull();
    // Facing east, someone to the south is to the right.
    expect(lookToward(Math.PI / 2, 0, 4)).toBeCloseTo(-Math.PI / 2 > -GAZE.neck ? -Math.PI / 2 : -GAZE.neck);
  });

  it('keep looking a beat after there is nobody to look at', () => {
    const g = new Gaze();
    expect(g.update(0.1, 0.5)).toBe(0.5);
    expect(g.update(GAZE.hold * 0.5, null)).toBe(0.5);
    expect(g.update(GAZE.hold, null)).toBeNull();
  });

  it('fidget now and then, each to a rhythm of its own', () => {
    let busy = 0;
    let together = 0;
    const kinds = new Set<string>();
    for (let t = 0; t < 600; t += 0.1) {
      const a = fidgetAt(t, 3);
      if (!a) continue;
      busy++;
      kinds.add(a.kind);
      expect(a.k).toBeGreaterThanOrEqual(0);
      expect(a.k).toBeLessThan(1);
      if (fidgetAt(t, 5)) together++;
    }
    expect(busy / 6000).toBeGreaterThan(0.1);
    expect(busy / 6000).toBeLessThan(0.35);
    expect(together).toBeLessThan(busy * 0.6);
    expect(kinds.size).toBe(4);
  });
});
