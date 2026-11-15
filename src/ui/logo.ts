// The game's name on the way in, drawn as pixel art: each word is set in the pixel typeface at
// a whole multiple of its own grid, cut to hard pixels, and then inked the way a title on a
// cartridge is: a pale top edge, two flat tones down the face, a dark foot, an ink line all
// round and a hard shadow down and to the right. One logo pixel is shown as two screen points,
// the size of a pixel of the world behind it.

export interface Word {
  w: number;
  h: number;
  /** 1 where the letter is, row by row. */
  bits: Uint8Array;
}

/** A word's tones, top to bottom: the top edge, the upper face, the lower face, the foot. */
export type Tones = readonly [string, string, string, string];
export const PALE: Tones = ['#fffdf6', '#f4eee3', '#d6cbb2', '#a89c84'];
export const BRASS: Tones = ['#fffdf6', '#f8e6b0', '#ecc77d', '#c8963e'];
const INK = '#10181f';

/** How far the shadow falls, and the room between the two words, in logo pixels. (The line round the letters takes one more all round.) */
const SHADOW = 2;
const GAP = 4;

/**
 * Lay words out one under another, centred, and say what colour every pixel is ('' is clear).
 * Pure: the drawing of the letters themselves is `wordOf`, which needs a page.
 */
export function inkLogo(words: { word: Word; tones: Tones }[]): { w: number; h: number; at: string[] } {
  const widest = Math.max(...words.map((x) => x.word.w));
  const w = widest + 2 + SHADOW;
  const h = words.reduce((s, x) => s + x.word.h, 0) + GAP * (words.length - 1) + 2 + SHADOW;
  const face = new Array<string>(w * h).fill('');
  const solid = new Uint8Array(w * h);
  let top = 1;
  for (const { word, tones } of words) {
    const left = 1 + Math.floor((widest - word.w) / 2);
    const has = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < word.w && y < word.h && word.bits[y * word.w + x] === 1;
    for (let y = 0; y < word.h; y++)
      for (let x = 0; x < word.w; x++) {
        if (!has(x, y)) continue;
        const i = (top + y) * w + left + x;
        solid[i] = 1;
        face[i] = !has(x, y - 1) ? tones[0] : !has(x, y + 1) ? tones[3] : y < word.h / 2 ? tones[1] : tones[2];
      }
    top += word.h + GAP;
  }
  const at = new Array<string>(w * h).fill('');
  const near = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h && solid[(y + dy) * w + x + dx]) return true;
    return false;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) at[i] = face[i];
      // The line round the letters, and the same again shifted: the shadow.
      else if (near(x, y) || near(x - 1, y - 1) || near(x - SHADOW, y - SHADOW)) at[i] = INK;
    }
  return { w, h, at };
}

/** A word in the pixel typeface, `scale` times its own grid, as hard pixels cut close. */
function wordOf(text: string, scale: number, family: string): Word | null {
  const px = 15 * scale;
  const c = document.createElement('canvas');
  c.width = Math.ceil(text.length * px * 0.8) + px;
  c.height = px * 2;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.font = `${px}px ${family}`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#000';
  g.fillText(text, Math.round(px / 2), Math.round(px * 1.4));
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let x1 = -1;
  let y0 = c.height;
  let y1 = -1;
  const on = (x: number, y: number): boolean => d[(y * c.width + x) * 4 + 3] > 127;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (on(x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bits[y * w + x] = on(x0 + x, y0 + y) ? 1 : 0;
  return { w, h, bits };
}

/**
 * Draw the name into a heading in place of its plain words. If the typeface or a canvas cannot
 * be had, the words are left as they are.
 */
export async function drawLogo(heading: HTMLElement): Promise<void> {
  const family = '"Jersey 15"';
  try {
    await document.fonts.load(`60px ${family}`);
    if (!document.fonts.check(`60px ${family}`)) return;
  } catch {
    return;
  }
  const first = wordOf('DRIFTWOOD', 2, family);
  const second = wordOf('COVE', 4, family);
  if (!first || !second) return;
  const { w, h, at } = inkLogo([
    { word: first, tones: PALE },
    { word: second, tones: BRASS },
  ]);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ink = at[y * w + x];
      if (!ink) continue;
      g.fillStyle = ink;
      g.fillRect(x, y, 1, 1);
    }
  c.className = 'logo';
  c.style.width = `${w * 2}px`;
  c.style.height = `${h * 2}px`;
  heading.setAttribute('aria-label', heading.textContent ?? '');
  heading.replaceChildren(c);
}
