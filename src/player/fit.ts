// How each cosmetic sits on a character. The body is measured (where the top of the head is,
// how wide the head and neck are, where the face and back are); each item says where it goes
// and how big it is relative to those, with small corrections per character where a head or
// body is an odd shape. Pure: no three.js.

export type Place = 'crown' | 'face' | 'snout' | 'neck' | 'chest' | 'back' | 'ear';

export interface Fit {
  bone: 'head' | 'chest';
  place: Place;
  /** How wide the item is, as a fraction of the measured width where it sits. */
  width: number;
  /** How far down into the head (or onto the body) it sits, as a fraction of its own height. */
  sink: number;
  /** Extra nudges, in fractions of the character's height: up, forward. */
  lift: number;
  forward: number;
  /** Tipped back (positive) or forward, radians. */
  tilt: number;
  /** Turned about upright, radians: models built facing +x are turned to face forward (+z). */
  turn?: number;
  /** Size a hat by its whole width, not its crown (a fish lying on the head has no crown). */
  whole?: boolean;
  /** Corrections for particular characters. */
  per?: Partial<Record<string, Partial<Omit<Fit, 'per' | 'bone' | 'place'>>>>;
}

/**
 * Each character's skull as an ellipsoid, in metres for a character 1.1 m tall, in its own frame
 * (it faces +z, feet at y = 0). It leaves out the ears and the frog's eyes, which stand clear of
 * the skull: a hat sits on the skull and the ears poke out beside it, as they would. Tuned by
 * eye with `socket=1` in the address, which draws them.
 */
export interface Head {
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}
export const HEADS: Record<string, Head> = {
  'char-otter': { y: 0.8, z: 0.0, rx: 0.32, ry: 0.27, rz: 0.29 },
  'char-frog': { y: 0.84, z: -0.1, rx: 0.32, ry: 0.2, rz: 0.22 },
  'char-raccoon': { y: 0.78, z: 0.03, rx: 0.31, ry: 0.25, rz: 0.27 },
};

/** How a hat is worn. */
export interface HatFit {
  /**
   * How it sits: `on` (pulled down onto the skull: the band rests where the skull is as wide as
   * the hat's opening), `perch` (something sitting on top: a fish, a cake, a crown), or `ring`
   * (a ring the head goes through: a flower crown, a halo's band).
   */
  how: 'on' | 'perch' | 'ring';
  /** For `on`: how far down the skull the band sits, from its top (0) to its middle (1). */
  depth: number;
  /** The hat's opening against the skull's width there; above 1 so the head does not show through. */
  snug: number;
  /** Turned about upright, radians: models built facing another way are turned to face +z. */
  turn?: number;
  /** Tipped back (positive) or forward, radians. */
  tilt?: number;
  /** Nudges, as fractions of the skull's height (up) and depth (forward). */
  lift?: number;
  forward?: number;
  /** Where the head enters it, as a fraction of its height, and its opening as a fraction of its width, when measuring gets them wrong. */
  band?: number;
  open?: number;
  per?: Partial<Record<string, Partial<Omit<HatFit, 'per' | 'how'>>>>;
}

/** Which way a hat is turned on the head: models are loaded facing +z, the character's front. */
const FRONT = 0;
/**
 * A hat pulled on: how deep (see `depth`), and where its band is and how wide its opening there,
 * read off a cut through the model (tools/scratch/rows2.mjs prints one).
 */
const on = (depth: number, band: number, open: number, more: Partial<HatFit> = {}): HatFit => ({ how: 'on', depth, snug: 1.04, band, open, turn: FRONT, ...more });
const ring = (depth: number, band: number, open: number, more: Partial<HatFit> = {}): HatFit => ({ how: 'ring', depth, snug: 1.0, band, open, turn: FRONT, ...more });
const perch = (snug: number, more: Partial<HatFit> = {}): HatFit => ({ how: 'perch', depth: 0, snug, turn: FRONT, ...more });

export const HATS: Record<string, HatFit> = {
  'hat-bucket': on(0.45, 0.28, 0.8),
  'hat-straw': on(0.38, 0.22, 0.55),
  'hat-beanie': on(0.52, 0.1, 0.95, { per: { 'char-frog': { depth: 0.3 } } }),
  'hat-captain': on(0.38, 0.32, 0.84),
  'hat-flowers': ring(0.28, 0.3, 0.8, { per: { 'char-frog': { snug: 1.4, depth: 0.5 } } }),
  'hat-frog': on(0.88, 0.05, 0.92),
  'hat-pirate': on(0.45, 0.1, 0.7),
  'hat-top': on(0.32, 0.18, 0.72),
  'hat-propeller': on(0.45, 0.15, 0.92),
  'hat-cowboy': on(0.38, 0.3, 0.64),
  'hat-crown': ring(0.22, 0.05, 0.9),
  'hat-mushroom': on(0.55, 0.1, 0.62, { per: { 'char-frog': { depth: 0.35 } } }),
  'hat-fish': perch(0.92),
  'hat-sailor': on(0.4, 0.02, 0.83),
  'hat-viking': on(0.55, 0.1, 0.9),
  'hat-chef': on(0.32, 0.12, 0.57),
  'hat-duck': perch(0.85),
  'hat-cone': on(0.25, 0.16, 0.8),
  'hat-cake': perch(0.85),
  'hat-wizard': on(0.36, 0.1, 0.53),
  'hat-party': on(0.18, 0.1, 0.9, { tilt: -0.15 }),
  'hat-crab': perch(0.85),
  'hat-bread': perch(0.95, { lift: -0.04 }),
  'hat-lampshade': on(0.45, 0.02, 0.9),
  'hat-shark': on(0.88, 0.05, 0.9),
};

/** A hat's fit on a character, with that character's corrections applied. */
export function hatFor(item: string, character: string): HatFit | null {
  const f = HATS[item];
  if (!f) return null;
  return { ...f, ...(f.per?.[character] ?? {}) };
}

/** The skull of a character of the given height. */
export function headOf(character: string, height: number): Head | null {
  const h = HEADS[character];
  if (!h) return null;
  const k = height / 1.1;
  return { y: h.y * k, z: h.z * k, rx: h.rx * k, ry: h.ry * k, rz: h.rz * k };
}

/** What a hat model is, measured: its size, where the head enters it, and its opening there. */
export interface HatShape {
  x: number;
  y: number;
  z: number;
  /** Height of the band above the hat's lowest point. */
  band: number;
  /** Width of the opening at the band (the narrower way across), and its middle. */
  open: number;
  cx: number;
  cz: number;
}

/** A cut through a model at one height: its outline as segments, [ax, az, bx, bz]. */
export type Cut = [number, number, number, number][];

/** How far out from (cx, cz) the nearest edge of a cut is, along a direction; Infinity if none. */
function reach(cut: Cut, cx: number, cz: number, dx: number, dz: number): number {
  let best = Infinity;
  for (const [ax, az, bx, bz] of cut) {
    // Solve centre + t*d = a + u*(b - a).
    const ex = bx - ax;
    const ez = bz - az;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((ax - cx) * ez - (az - cz) * ex) / den;
    const u = ((ax - cx) * dz - (az - cz) * dx) / den;
    if (t > 1e-6 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best;
}

/**
 * Measure a hat from cuts through it: `cut(k)` gives its outline at a fraction k of its height.
 * Its crown at a height is the nearest outline out from the middle each way (a curled brim
 * further out does not count). A brim shows as cuts near the bottom reaching much further than
 * those above: the band is where the brim gives way to the crown.
 */
export function measureHat(size: { x: number; y: number; z: number }, cut: (k: number) => Cut): HatShape {
  const rows: { k: number; w: number; cx: number; cz: number }[] = [];
  for (let k = 0.03; k < 0.9; k += 0.03) {
    const c = cut(k);
    if (!c.length) continue;
    const px = reach(c, 0, 0, 1, 0);
    const nx = reach(c, 0, 0, -1, 0);
    const pz = reach(c, 0, 0, 0, 1);
    const nz = reach(c, 0, 0, 0, -1);
    if (![px, nx, pz, nz].every(Number.isFinite)) continue;
    rows.push({ k, w: Math.min(px + nx, pz + nz), cx: (px - nx) / 2, cz: (pz - nz) / 2 });
  }
  if (!rows.length) return { ...size, band: 0, open: Math.min(size.x, size.z), cx: 0, cz: 0 };
  // The brim is the widest cut low down (a curled or drooping brim is widest a little way up);
  // a brim is a step, not a taper: within a couple of cuts above it the hat gets much narrower.
  const low = rows.filter((r) => r.k < 0.45);
  const widest = low.reduce((best, r) => (r.w > best.w ? r : best), low[0] ?? rows[0]);
  const from = rows.indexOf(widest);
  const crownRow = rows.find((r, i) => i > from && r.k < 0.7 && r.w < widest.w * 0.8 && r.w < rows[Math.max(from, i - 2)].w * 0.84);
  if (crownRow) {
    const i = rows.indexOf(crownRow);
    const above = rows[Math.min(rows.length - 1, i + 1)];
    return { ...size, band: crownRow.k * size.y, open: Math.max(crownRow.w, above.w), cx: above.cx, cz: above.cz };
  }
  // No brim: the head goes in at the bottom, as wide as the hat is low down.
  return { ...size, band: 0, open: widest.w, cx: widest.cx, cz: widest.cz };
}

/**
 * Where a hat goes: the point in the character's frame for the hat's lowest point (centred on its
 * opening), and its scale.
 */
export function placeHat(f: HatFit, head: Head, shape: HatShape): { x: number; y: number; z: number; scale: number } {
  const band = f.band !== undefined ? f.band * shape.y : shape.band;
  const open = f.open !== undefined ? f.open * Math.min(shape.x, shape.z) : shape.open;
  const top = head.y + head.ry;
  let scale: number;
  let bandY: number;
  if (f.how === 'on' || f.how === 'ring') {
    // The band rests where the skull is as wide as the opening: depth down from the top.
    const dy = head.ry * (1 - f.depth);
    const across = 2 * head.rx * Math.sqrt(Math.max(0.05, 1 - (dy / head.ry) ** 2));
    scale = (across * f.snug) / Math.max(open, 1e-3);
    bandY = head.y + dy;
  } else {
    // Something sitting on the head: as wide as the skull times snug, resting a little into the top of it.
    scale = (2 * head.rx * f.snug) / Math.max(Math.min(shape.x, shape.z), 1e-3);
    bandY = top - head.ry * 0.08;
  }
  const y = bandY - (f.how === 'perch' ? 0 : band * scale) + (f.lift ?? 0) * head.ry * 2;
  const z = head.z + (f.forward ?? 0) * head.rz * 2;
  return { x: 0, y, z, scale };
}

const hat = (width: number, sink: number, more: Partial<Fit> = {}): Fit => ({ bone: 'head', place: 'crown', width, sink, lift: 0, forward: 0, tilt: 0, ...more });

export const FITS: Record<string, Fit> = {
  // Hats are placed by HATS (above); these entries say only which bone they follow.
  'hat-bucket': hat(1, 0.5),
  'hat-straw': hat(1, 0.5),
  'hat-beanie': hat(1, 0.5),
  'hat-captain': hat(1, 0.5),
  'hat-flowers': hat(1, 0.5),
  'hat-frog': hat(1, 0.5),
  'hat-pirate': hat(1, 0.5),
  'hat-top': hat(1, 0.5),
  'hat-propeller': hat(1, 0.5),
  'hat-cowboy': hat(1, 0.5),
  'hat-crown': hat(1, 0.5),
  'hat-mushroom': hat(1, 0.5),
  'hat-fish': hat(1, 0.5),
  'hat-sailor': hat(1, 0.5),
  'hat-viking': hat(1, 0.5),
  'hat-chef': hat(1, 0.5),
  'hat-duck': hat(1, 0.5),
  'hat-cone': hat(1, 0.5),
  'hat-cake': hat(1, 0.5),
  'hat-wizard': hat(1, 0.5),
  'hat-party': hat(1, 0.5),
  'hat-crab': hat(1, 0.5),
  'hat-bread': hat(1, 0.5),
  'hat-lampshade': hat(1, 0.5),
  'hat-shark': hat(1, 0.5),
  'x-glasses': { bone: 'head', place: 'face', width: 0.7, sink: 0, lift: 0.055, forward: 0, tilt: 0, turn: FRONT, per: { 'char-frog': { lift: 0.17, forward: -0.05 } } },
  'x-shades': { bone: 'head', place: 'face', width: 0.64, sink: 0, lift: 0.055, forward: 0, tilt: 0, turn: FRONT, per: { 'char-frog': { lift: 0.18, forward: -0.05 } } },
  'x-scarf': { bone: 'chest', place: 'neck', width: 1.28, sink: 0.45, lift: 0.005, forward: 0, tilt: 0, turn: FRONT },
  'x-bowtie': { bone: 'chest', place: 'chest', width: 0.4, sink: 0, lift: 0, forward: 0, tilt: 0, turn: FRONT, per: { 'char-frog': { lift: -0.02 } } },
  'x-backpack': { bone: 'chest', place: 'back', width: 0.55, sink: 0, lift: 0, forward: 0, tilt: 0, turn: FRONT },
  'x-mustache': { bone: 'head', place: 'snout', width: 0.56, sink: 0, lift: 0, forward: 0, tilt: 0, turn: FRONT, per: { 'char-frog': { width: 0.5, lift: 0.02 } } },
  'x-snorkel': { bone: 'head', place: 'face', width: 0.78, sink: 0, lift: 0.04, forward: 0, tilt: 0, turn: FRONT, per: { 'char-frog': { lift: 0.15, forward: -0.05 } } },
  'x-flower': { bone: 'head', place: 'ear', width: 0.32, sink: 0, lift: 0, forward: 0, tilt: 0 },
};

/** The fit for an item on a character, with that character's corrections applied. */
export function fitFor(item: string, character: string): Fit | null {
  const f = FITS[item];
  if (!f) return null;
  return { ...f, ...(f.per?.[character] ?? {}) };
}

/** Where a character's body is, measured in its own frame (metres; it faces +z, feet at y = 0). */
export interface Measure {
  height: number;
  /** The top of the head, and the middle of the head front to back. */
  top: number;
  headZ: number;
  /** Width of the head across the brow. */
  headW: number;
  /** The height of the eyes, and where the face is at that height. */
  eyeY: number;
  faceZ: number;
  /** The neck: height, width, and the front and back of the body there. */
  neckY: number;
  neckW: number;
  neckFront: number;
  /** The chest (for a bow tie) and the back (for a pack). */
  chestY: number;
  chestFront: number;
  backY: number;
  backZ: number;
  backW: number;
  /** The side of the head, for a flower behind the ear. */
  earY: number;
  earX: number;
  /** The head and body, slice by slice from the neck up: width, and front and back. */
  profile: { y: number; w: number; front: number; back: number }[];
}

/** The body's slice at a height, read between the measured ones. */
export function sliceAt(m: Measure, y: number): { w: number; front: number; back: number } {
  const p = m.profile;
  if (!p.length) return { w: m.headW, front: m.faceZ, back: m.faceZ - m.headW };
  if (y <= p[0].y) return p[0];
  for (let i = 1; i < p.length; i++) {
    if (p[i].y >= y) {
      const a = p[i - 1];
      const b = p[i];
      const t = (y - a.y) / (b.y - a.y || 1);
      return { w: a.w + (b.w - a.w) * t, front: a.front + (b.front - a.front) * t, back: a.back + (b.back - a.back) * t };
    }
  }
  return p[p.length - 1];
}

/**
 * Where an item goes and how big it is: a point in the character's frame for the item's base
 * (its lowest point, centred, which is how models are made to stand), the scale for a model of
 * the given size, and whether it faces backwards.
 */
export function placeFor(f: Fit, m: Measure, size: { x: number; y: number; z: number; crown?: number }): { x: number; y: number; z: number; scale: number; tilt: number; turn: number; backwards: boolean } {
  const wide = Math.max(size.x, size.z, 0.001);
  const h = m.height;
  let width: number;
  let x = 0;
  let y: number;
  let z: number;
  let backwards = false;
  const deepOf = (w: number): number => (size.z * w) / wide;
  switch (f.place) {
    case 'crown': {
      // Where the hat's bottom sits, between the eyes and the top of the head, and how wide the head is there.
      y = m.eyeY + (m.top - m.eyeY) * f.sink;
      const slice = sliceAt(m, y);
      // A hat sized whole (a fish lying on top) is measured against the whole head, not the narrow top of it.
      width = (f.whole ? m.headW : slice.w) * f.width * (size.crown ? wide / size.crown : 1);
      z = (slice.front + slice.back) / 2;
      y -= size.y * (width / wide) * 0.04;
      break;
    }
    case 'face': {
      // Glasses: the lenses (the front of the model; the arms reach back) just in front of the face.
      width = m.headW * f.width;
      y = m.eyeY - (size.y * width) / wide / 2;
      z = m.faceZ + 0.008 - deepOf(width) / 2;
      break;
    }
    case 'snout': {
      // Under the nose: a little below the eyes, at the front of the face there.
      y = m.eyeY - h * 0.075;
      const slice = sliceAt(m, y);
      width = m.headW * f.width;
      z = slice.front + deepOf(width) * 0.1;
      y -= (size.y * width) / wide / 2;
      break;
    }
    case 'neck': {
      // A scarf round the neck at the collar, its ring's opening (about two thirds of its width) round the body there.
      y = m.neckY - h * 0.035;
      const slice = sliceAt(m, y);
      width = slice.w * f.width;
      z = (slice.front + slice.back) / 2;
      y -= (size.y * width) / wide * f.sink;
      break;
    }
    case 'chest': {
      // A bow tie at the collar.
      y = m.neckY - h * 0.05;
      const slice = sliceAt(m, y);
      width = slice.w * f.width;
      z = slice.front + deepOf(width) / 2 - 0.005;
      y -= (size.y * width) / wide / 2;
      break;
    }
    case 'back': {
      y = m.backY;
      const slice = sliceAt(m, y);
      width = slice.w * f.width;
      z = slice.back - deepOf(width) * 0.3;
      y -= (size.y * width) / wide * 0.5;
      backwards = true;
      break;
    }
    case 'ear': {
      // A flower pinned on the side of the head, high up.
      y = m.eyeY + (m.top - m.eyeY) * 0.55;
      const slice = sliceAt(m, y);
      width = m.headW * f.width;
      x = (slice.w / 2) * 0.92;
      z = (slice.front + slice.back) / 2 + (slice.front - slice.back) * 0.15;
      y -= (size.y * width) / wide / 2;
      break;
    }
  }
  const scale = width / wide;
  return { x, y: y + f.lift * h, z: z + f.forward * h * (backwards ? -1 : 1), scale, tilt: f.tilt, turn: f.turn ?? 0, backwards };
}
