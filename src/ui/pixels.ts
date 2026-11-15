// Line drawings as pixels. The few drawings in the interface (the emotes, the sun and moon by
// the clock, the jump arrow) are written as vector lines, which a screen draws smooth; here each
// is drawn once into a small grid of hard pixels and shown blown up, like every other picture.

const made = new Map<string, Promise<string>>();

/** Drawn this many times too big and counted down, so a thin line is never lost between two pixels. */
const OVER = 4;
/** A pixel is inked when this much of it is covered. */
const COVER = 0.2;

function draw(svg: string, px: number, colour: string): Promise<string> {
  const big = px * OVER;
  const text = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${big}" height="${big}" `).split('currentColor').join('#000');
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = big;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0, big, big);
      const from = g.getImageData(0, 0, big, big).data;
      const out = document.createElement('canvas');
      out.width = out.height = px;
      const og = out.getContext('2d')!;
      og.fillStyle = colour;
      for (let y = 0; y < px; y++)
        for (let x = 0; x < px; x++) {
          let a = 0;
          for (let dy = 0; dy < OVER; dy++) for (let dx = 0; dx < OVER; dx++) a += from[((y * OVER + dy) * big + x * OVER + dx) * 4 + 3];
          if (a / (OVER * OVER * 255) > COVER) og.fillRect(x, y, 1, 1);
        }
      resolve(out.toDataURL());
    };
    // If it cannot be drawn, the picture is simply left out.
    img.onerror = () => resolve('');
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
  });
}

/**
 * A line drawing (an `<svg ...>` string) as a picture `px` pixels square, in one colour. The
 * picture is handed back at once and fills in a moment later, the first time each is asked for.
 */
export function pixelGlyph(svg: string, px: number, colour = '#18262f'): HTMLImageElement {
  const key = `${px}|${colour}|${svg}`;
  if (!made.has(key)) made.set(key, draw(svg, px, colour));
  const img = document.createElement('img');
  img.alt = '';
  img.className = 'pixel-glyph';
  void made.get(key)!.then((url) => {
    if (url) img.src = url;
  });
  return img;
}
