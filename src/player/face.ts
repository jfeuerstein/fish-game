// Drawn eyes. A character's painted eyes are a few pixels at best once its model is cut down,
// so each wears a pair of drawn ones on its head: flat, dark, a little too big, and able to
// blink and to change with what the character is doing. (Mouths are left as the models have
// them: on a snout or a beak a drawn one has nowhere flat to sit.) Pure: where the eyes go on
// each head, which expression goes with which action, and the little sheet of drawings.
import { INK } from '../look/inks';

export type Expression = 'open' | 'closed' | 'happy' | 'wide' | 'squint';
export const EXPRESSIONS: readonly Expression[] = ['open', 'closed', 'happy', 'wide', 'squint'];

export interface FaceSpec {
  /** The eye line's height, as a fraction of the character's height. */
  y: number;
  /** How far round the head each eye sits from straight ahead, radians. */
  az: number;
  /** An eye's height, as a fraction of the character's height. */
  size: number;
  /**
   * For eyes that stand out from the head on bumps of their own (a frog's): how far each is to
   * the side, as a fraction of the character's height. They then look straight ahead, and `az`
   * is not used.
   */
  x?: number;
  /** Drawn with a pale line round them, for eyes that sit on dark fur (a raccoon's mask). */
  rim?: boolean;
}

/** Where each character's eyes are. Tuned by eye with `node tools/face-check.mjs`. */
export const FACES: Record<string, FaceSpec> = {
  'char-otter': { y: 0.75, az: 0.4, size: 0.1 },
  'char-frog': { y: 0.885, az: 0, x: 0.2, size: 0.11 },
  'char-raccoon': { y: 0.72, az: 0.38, size: 0.11, rim: true },
  'npc-duck': { y: 0.685, az: 0.5, size: 0.09 },
  'npc-beaver': { y: 0.72, az: 0.42, size: 0.095 },
  'npc-bear': { y: 0.685, az: 0.36, size: 0.115 },
  'npc-pelican': { y: 0.8, az: 0.5, size: 0.09 },
};
export const DEFAULT_FACE: FaceSpec = { y: 0.74, az: 0.42, size: 0.08 };
export const faceOf = (id: string): FaceSpec => FACES[id] ?? DEFAULT_FACE;

/** The face that goes with what a character is doing (a blink is laid over it by the character). */
export function faceFor(action: string): Expression {
  switch (action) {
    case 'cheer':
    case 'dance':
    case 'clap':
    case 'show':
    case 'wave':
    case 'uke':
    case 'spin':
      return 'happy';
    case 'flop':
    case 'sit':
      return 'closed';
    case 'honk':
    case 'slap':
    case 'castThrow':
      return 'squint';
    case 'jump':
      return 'wide';
    default:
      return 'open';
  }
}

/**
 * When to blink: eyes shut for a moment every few seconds, at times that differ for each
 * character (`seed`) and never fall into step. `t` is seconds.
 */
export function blinking(t: number, seed: number): boolean {
  const period = 3.1 + (seed % 7) * 0.37;
  const at = (t + seed * 1.7) % period;
  // Now and then, twice in a row.
  const twice = Math.floor((t + seed * 1.7) / period) % 4 === 0;
  return at < 0.13 || (twice && at > 0.3 && at < 0.42);
}

/** One drawing is this many pixels square; the sheet has a column for each expression. */
export const CELL = 16;

type Bitmap = string[];

/** A filled oval, as rows of '#', '.', and 'o' for the pale glint. */
function oval(w: number, h: number, glint = true): Bitmap {
  const rows: Bitmap = [];
  for (let y = 0; y < CELL; y++) {
    let row = '';
    for (let x = 0; x < CELL; x++) {
      const dx = (x + 0.5 - CELL / 2) / (w / 2);
      const dy = (y + 0.5 - CELL / 2) / (h / 2);
      const inside = dx * dx + dy * dy <= 1;
      const lit = glint && x >= CELL / 2 - w / 4 - 1 && x < CELL / 2 - w / 4 + 1 && y >= CELL / 2 - h / 4 - 1 && y < CELL / 2 - h / 4 + 1;
      row += inside ? (lit ? 'o' : '#') : '.';
    }
    rows.push(row);
  }
  return rows;
}

const EYES: Record<Expression, Bitmap> = {
  open: oval(10, 13),
  wide: oval(14, 15),
  closed: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..#..........#..',
    '..############..',
    '...##########...',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  happy: [
    '................',
    '................',
    '................',
    '................',
    '.....######.....',
    '...##########...',
    '..####....####..',
    '..###......###..',
    '.###........###.',
    '.##..........##.',
    '.##..........##.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Drawn for the eye on the character's left (the viewer's right); the other is its mirror.
  squint: [
    '................',
    '................',
    '..........###...',
    '........####....',
    '......####......',
    '....####........',
    '..####..........',
    '..###...........',
    '..####..........',
    '....####........',
    '......####......',
    '........####....',
    '..........###...',
    '................',
    '................',
    '................',
  ],
};

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/**
 * The sheet as pixels (RGBA, the first row at the bottom, as a texture is read): a column for
 * each expression in EXPRESSIONS, plain in the lower row and with a pale line round in the upper.
 */
export function faceSheet(): { width: number; height: number; data: Uint8Array } {
  const width = CELL * EXPRESSIONS.length;
  const height = CELL * 2;
  const data = new Uint8Array(width * height * 4);
  const dark = rgb(INK.dark);
  const pale = rgb(INK.pale);
  EXPRESSIONS.forEach((e, col) => {
    const art = EYES[e];
    const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < CELL && y < CELL && art[y][x] !== '.';
    for (const row of [0, 1]) {
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = ((row * CELL + (CELL - 1 - y)) * width + col * CELL + x) * 4;
          if (on(x, y)) data.set(art[y][x] === 'o' ? pale : dark, o);
          else if (row === 1 && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) data.set(pale, o);
          else continue;
          data[o + 3] = 255;
        }
    }
  });
  return { width, height, data };
}
