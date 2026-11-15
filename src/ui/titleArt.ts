// The title picture, alive: the water laps, three gulls drift over the lighthouse, and the
// bobber dips now and then. The picture is pixel art (256 by 384); it is drawn into a canvas
// of that size and changed a few times a second, a pixel at a time, as the game itself moves.
// What is where in the picture is written down here: if the picture is painted again
// (tools/assets/make-title.mjs), look at it and set these again.

/** The picture's size, its own pixels. */
export const TITLE_SIZE = { w: 256, h: 384 } as const;
/** The first row that is water all the way across (the shore is above it). */
export const WATER_FROM = 258;
/** The bobber: the box it is in. */
export const BOBBER = { x: 101, y: 297, w: 8, h: 10 } as const;
/** The three painted gulls, as boxes, to be painted out and drawn again where they have drifted to. */
export const GULLS = [
  { x: 185, y: 128, w: 10, h: 7 },
  { x: 170, y: 140, w: 10, h: 7 },
  { x: 197, y: 139, w: 10, h: 6 },
] as const;

/** A gull in two poses, wings up and wings level: each row a string, X where it is white. */
export const GULL_FRAMES: readonly (readonly string[])[] = [
  ['XX....XX', '.XX..XX.', '..XXXX..', '...XX...'],
  ['........', '.XXX.XXX', 'X..XXX..', '...XX...'],
];

/** Whether a colour of the picture is water (or light on it): blue-green, or near white. */
export const isWater = (r: number, g: number, b: number): boolean => (b > r + 25 && g > r) || (r > 200 && g > 200 && b > 190);

/** How many pixels a row of water is slid sideways at a time: the rows move in slow bands, further down more. */
export function lap(y: number, t: number): number {
  const deep = (y - WATER_FROM) / (TITLE_SIZE.h - WATER_FROM);
  return Math.round(Math.sin(t * 0.9 + y * 0.42) * (0.6 + deep * 1.3));
}

/** How far down the bobber is, pixels: still for some seconds, then two quick dips. */
export function dip(t: number): number {
  const k = t % 6.5;
  return (k > 5 && k < 5.3) || (k > 5.7 && k < 6) ? 1 : 0;
}

/**
 * Put the living picture in the title's art layer. Returns what stops it. With nothing to draw
 * on (no canvas, a picture that will not load) the plain picture behind is left as it is.
 */
export function liveTitle(host: HTMLElement, src: string): () => void {
  const canvas = document.createElement('canvas');
  canvas.width = TITLE_SIZE.w;
  canvas.height = TITLE_SIZE.h;
  canvas.className = 'title-live';
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let timer = 0;
  if (!ctx) return () => undefined;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, TITLE_SIZE.w, TITLE_SIZE.h);
    const base = ctx.getImageData(0, 0, TITLE_SIZE.w, TITLE_SIZE.h);
    const at = (x: number, y: number): number => (y * TITLE_SIZE.w + x) * 4;
    const copy = (to: Uint8ClampedArray, i: number, from: Uint8ClampedArray, j: number): void => {
      to[i] = from[j];
      to[i + 1] = from[j + 1];
      to[i + 2] = from[j + 2];
    };
    // The gulls painted out of the picture, each row filled from the sky beside it.
    for (const g of GULLS) for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) copy(base.data, at(x, y), base.data, at(g.x - 2, y));
    // The bobber kept by itself, and painted out of the water under it.
    const bob = new Uint8ClampedArray(BOBBER.w * BOBBER.h * 4);
    for (let y = 0; y < BOBBER.h; y++)
      for (let x = 0; x < BOBBER.w; x++) {
        const i = at(BOBBER.x + x, BOBBER.y + y);
        const here = !isWater(base.data[i], base.data[i + 1], base.data[i + 2]) || (y >= 6 && y <= 7 && x >= 3 && x <= 5);
        bob[(y * BOBBER.w + x) * 4 + 3] = here ? 255 : 0;
        copy(bob, (y * BOBBER.w + x) * 4, base.data, i);
        if (here) copy(base.data, i, base.data, at(BOBBER.x - 2, BOBBER.y + y));
      }
    const water = new Uint8Array(TITLE_SIZE.w * TITLE_SIZE.h);
    for (let y = WATER_FROM; y < TITLE_SIZE.h; y++)
      for (let x = 0; x < TITLE_SIZE.w; x++) {
        const i = at(x, y);
        // (Not the line down to the bobber: it is white, and would waver like the water.)
        const line = x >= BOBBER.x + 1 && x <= BOBBER.x + 6 && y < BOBBER.y + BOBBER.h;
        water[y * TITLE_SIZE.w + x] = !line && isWater(base.data[i], base.data[i + 1], base.data[i + 2]) ? 1 : 0;
      }
    const frame = ctx.createImageData(TITLE_SIZE.w, TITLE_SIZE.h);
    const began = performance.now();
    const draw = (): void => {
      const t = (performance.now() - began) / 1000;
      frame.data.set(base.data);
      // The water: each row slid a pixel or two, only where both ends of the slide are water.
      for (let y = WATER_FROM; y < TITLE_SIZE.h; y++) {
        const by = lap(y, t);
        if (!by) continue;
        for (let x = 0; x < TITLE_SIZE.w; x++) {
          const from = x - by;
          if (from < 0 || from >= TITLE_SIZE.w || !water[y * TITLE_SIZE.w + x] || !water[y * TITLE_SIZE.w + from]) continue;
          copy(frame.data, at(x, y), base.data, at(from, y));
        }
      }
      // The bobber, down a pixel when it dips, and a pale ring beside it as it does.
      const down = dip(t);
      for (let y = 0; y < BOBBER.h; y++)
        for (let x = 0; x < BOBBER.w; x++) {
          if (!bob[(y * BOBBER.w + x) * 4 + 3]) continue;
          copy(frame.data, at(BOBBER.x + x, BOBBER.y + y + down), bob, (y * BOBBER.w + x) * 4);
        }
      if (down) for (const x of [BOBBER.x - 2, BOBBER.x - 1, BOBBER.x + BOBBER.w, BOBBER.x + BOBBER.w + 1]) frame.data.set([255, 253, 246], at(x, BOBBER.y + 8));
      // The gulls: each drifts about where it was painted, and beats its wings now and then.
      for (const [n, g] of GULLS.entries()) {
        const gx = Math.round(g.x + 1 + Math.sin(t * 0.16 + n * 2.1) * 9);
        const gy = Math.round(g.y + 1 + Math.sin(t * 0.31 + n * 1.3) * 3);
        const shape = GULL_FRAMES[Math.floor(t * 2.5 + n * 0.7) % 4 === 0 ? 1 : 0];
        for (const [y, row] of shape.entries()) for (let x = 0; x < row.length; x++) if (row[x] === 'X') frame.data.set([250, 244, 214], at(gx + x, gy + y));
      }
      ctx.putImageData(frame, 0, 0);
    };
    draw();
    host.append(canvas);
    timer = window.setInterval(draw, 200);
  };
  img.src = src;
  return () => window.clearInterval(timer);
}
