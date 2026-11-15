// The island's short palette: the inks everything drawn in the world is cut down to. They are
// the chart room's own colours (ink, sea, brass, bone, enamel red) with the greens, browns and
// few brights an island needs, four tones to a family at most. `src/look/palette.ts` holds the
// same list for the game; a test keeps the two in step.
import sharp from 'sharp';

export const INKS = [
  // ink and slate
  '#10181f', '#18262f', '#2b4250', '#4f6d7c', '#86a1ab',
  // sea
  '#143c46', '#1b5a66', '#2c8a8a', '#62c0b0', '#b4e4d4',
  // sky
  '#1f4f86', '#3f86c8', '#7fbbe6', '#c6e4f4',
  // leaf
  '#1f3d2a', '#35633a', '#5c8f44', '#93b85a', '#cbdc8e',
  // moss
  '#4a5126', '#7d8438', '#b6b25c',
  // brass
  '#5e3f12', '#96691f', '#c8963e', '#ecc77d', '#f8e6b0',
  // wood
  '#2e1e16', '#523524', '#7d5436', '#a97c52', '#cfa57a',
  // bone
  '#70685a', '#a89c84', '#d6cbb2', '#f4eee3', '#fffdf6',
  // enamel
  '#5e1c18', '#a2341f', '#d65a3c', '#f08c62', '#f8c4a4',
  // rose
  '#8a3a56', '#cf6e86', '#f2a8b0',
  // plum
  '#33264c', '#5c4486', '#8f74ba', '#c6b4e2',
  // stone
  '#24282c', '#474e54', '#737b80', '#a4abac', '#d2d6d2',
];

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const linear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** A colour as the eye weighs it (OKLab), so that "nearest" means nearest to look at. */
export function oklab(r, g, b) {
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

const RGB = INKS.map(hex);
const LAB = RGB.map((c) => oklab(...c));
const cache = new Map();

/** The ink nearest a colour. Hue counts for more than lightness, so a shaded red stays a red. */
export function inkFor(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  const hit = cache.get(key);
  if (hit) return hit;
  const [L, A, B] = oklab(r, g, b);
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < LAB.length; i++) {
    const d = 0.7 * (L - LAB[i][0]) ** 2 + (A - LAB[i][1]) ** 2 + (B - LAB[i][2]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  cache.set(key, RGB[best]);
  return RGB[best];
}

/**
 * A picture cut down to a few flat colours, each one an ink: shrunk to `size` (a number, or
 * [width, height]), cut to `colours` of its own, and each of those moved to the nearest ink.
 * Returns raw RGBA pixels. Nothing is dithered: flat areas stay flat.
 */
export async function inked(input, size, colours = 12) {
  const [w, h] = Array.isArray(size) ? size : [size, size];
  return inkedSmall(await sharp(input).ensureAlpha().resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer(), colours);
}

/** The same for a picture that is already the size wanted (a PNG). */
export async function inkedSmall(small, colours = 12) {
  const few = await sharp(small).png({ palette: true, colours, dither: 0, effort: 10 }).toBuffer();
  const { data, info } = await sharp(few).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = inkFor(data[i], data[i + 1], data[i + 2]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return { data, width: info.width, height: info.height };
}

/** Speckle taken out: a pixel unlike all but one of its eight neighbours takes the commonest colour round it. */
export function calm(px, width, height) {
  const out = Buffer.from(px);
  const at = (x, y) => {
    const i = (((y + height) % height) * width + ((x + width) % width)) * 4;
    return (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const me = at(x, y);
      const count = new Map();
      let same = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const c = at(x + dx, y + dy);
          if (c === me) same++;
          count.set(c, (count.get(c) ?? 0) + 1);
        }
      if (same > 1) continue;
      let best = me;
      let n = 0;
      for (const [c, k] of count) if (k > n) [best, n] = [c, k];
      if (n < 4) continue;
      const i = (y * width + x) * 4;
      out[i] = best >> 16;
      out[i + 1] = (best >> 8) & 255;
      out[i + 2] = best & 255;
    }
  return out;
}
