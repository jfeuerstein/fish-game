// How each cosmetic sits on a character. The body is measured (where the top of the head is,
// how wide the head and neck are, where the face and back are); each item says where it goes
// and how big it is relative to those, with small corrections per character where a head or
// body is an odd shape. Pure: no three.js.

export type Place = 'crown' | 'face' | 'neck' | 'chest' | 'back' | 'ear';

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

/** On the frog, whose eyes stand up above its skull, hats sit behind the eyes and a little higher. */
const FROG = { forward: -0.16, sink: 0.82, lift: 0.015 };

const hat = (width: number, sink: number, more: Partial<Fit> = {}): Fit => ({ bone: 'head', place: 'crown', width, sink, lift: 0, forward: 0, tilt: 0, ...more });

export const FITS: Record<string, Fit> = {
  // For hats, the crown (measured from the model just above the brim) is fitted to the head's
  // width where the hat sits; `sink` says where that is, from the eyes (0) to the top of the head
  // (1). The frog's eyes are on top of its head, so hats sit further back on it.
  'hat-bucket': hat(0.84, 0.52, { per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-straw': hat(0.86, 0.56, { per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-beanie': hat(0.84, 0.5, { per: { 'char-frog': FROG } }),
  'hat-captain': hat(0.86, 0.56, { turn: -Math.PI / 2, per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } }, forward: 0.012 }),
  'hat-flowers': hat(1.06, 0.58, { per: { 'char-frog': FROG } }),
  'hat-frog': hat(0.88, 0.5, { turn: -Math.PI / 2, per: { 'char-frog': FROG } }),
  'hat-pirate': hat(0.95, 0.55, { turn: -Math.PI / 2, per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-top': hat(0.64, 0.74, { per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-propeller': hat(0.7, 0.5, { turn: -Math.PI / 2, per: { 'char-frog': FROG }, forward: 0.012 }),
  'hat-cowboy': hat(0.94, 0.56, { turn: -Math.PI / 2, per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-crown': hat(0.72, 0.74, { per: { 'char-frog': { ...FROG, sink: 1.05 } } }),
  'hat-mushroom': hat(0.96, 0.54, { per: { 'char-frog': FROG } }),
  'hat-fish': hat(1.05, 0.74, { whole: true, turn: -Math.PI / 2, per: { 'char-frog': FROG } }),
  'hat-sailor': hat(0.84, 0.64, { per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-viking': hat(0.85, 0.5, { turn: Math.PI / 2, per: { 'char-frog': { ...FROG, sink: 1.0, lift: 0.03 } } }),
  'hat-chef': hat(0.7, 0.62, { per: { 'char-frog': FROG } }),
  'x-glasses': { bone: 'head', place: 'face', width: 0.62, sink: 0, lift: 0.055, forward: 0, tilt: 0, per: { 'char-frog': { lift: 0.17, forward: -0.05 } } },
  'x-shades': { bone: 'head', place: 'face', width: 0.64, sink: 0, lift: 0.055, forward: 0, tilt: 0, per: { 'char-frog': { lift: 0.18, forward: -0.05 } } },
  'x-scarf': { bone: 'chest', place: 'neck', width: 1.02, sink: 0.45, lift: -0.04, forward: 0, tilt: 0, per: { 'char-frog': { width: 1.06, lift: -0.035 }, 'char-raccoon': { width: 1.2, lift: -0.01 } } },
  'x-bowtie': { bone: 'chest', place: 'chest', width: 0.4, sink: 0, lift: 0, forward: 0, tilt: 0, per: { 'char-frog': { lift: -0.02 } } },
  'x-backpack': { bone: 'chest', place: 'back', width: 0.55, sink: 0, lift: 0, forward: 0, tilt: 0 },
  'x-flower': { bone: 'head', place: 'ear', width: 0.32, sink: 0, lift: 0, forward: 0, tilt: 0, turn: -Math.PI / 2 },
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
