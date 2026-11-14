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
  /** Corrections for particular characters. */
  per?: Partial<Record<string, Partial<Omit<Fit, 'per' | 'bone' | 'place'>>>>;
}

const hat = (width: number, sink: number, more: Partial<Fit> = {}): Fit => ({ bone: 'head', place: 'crown', width, sink, lift: 0, forward: 0, tilt: 0, ...more });

export const FITS: Record<string, Fit> = {
  // Widths are of the whole hat, brim and all, against the head's width: a wide brim needs a big
  // number for the crown to fit the head. The frog's eyes are on top of its head, so hats sit
  // further back on it.
  'hat-bucket': hat(1.45, 0.6, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-straw': hat(1.9, 0.45, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-beanie': hat(1.08, 0.58, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-captain': hat(1.25, 0.5, { forward: 0.02, per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-flowers': hat(1.2, 0.55, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-frog': hat(1.08, 0.5, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-pirate': hat(1.45, 0.5, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-top': hat(1.3, 0.18, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-propeller': hat(1.15, 0.5, { forward: 0.02, per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-cowboy': hat(1.8, 0.4, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-crown': hat(0.78, 0.28, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-mushroom': hat(1.35, 0.45, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-fish': hat(1.1, 0.25, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-sailor': hat(1.25, 0.38, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-viking': hat(1.7, 0.5, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'hat-chef': hat(1.0, 0.22, { per: { 'char-frog': { forward: -0.05, lift: 0.02 } } }),
  'x-glasses': { bone: 'head', place: 'face', width: 0.82, sink: 0, lift: 0, forward: 0.005, tilt: 0 },
  'x-shades': { bone: 'head', place: 'face', width: 0.84, sink: 0, lift: 0, forward: 0.005, tilt: 0 },
  'x-scarf': { bone: 'chest', place: 'neck', width: 1.08, sink: 0.4, lift: 0, forward: 0, tilt: 0 },
  'x-bowtie': { bone: 'chest', place: 'chest', width: 0.32, sink: 0, lift: 0, forward: 0.005, tilt: 0 },
  'x-backpack': { bone: 'chest', place: 'back', width: 0.72, sink: 0, lift: 0, forward: -0.01, tilt: 0 },
  'x-flower': { bone: 'head', place: 'ear', width: 0.3, sink: 0, lift: 0, forward: 0.01, tilt: 0 },
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
}

/**
 * Where an item goes and how big it is: a point in the character's frame for the item's base
 * (its lowest point, centred, which is how models are made to stand), the scale for a model of
 * the given size, and whether it faces backwards.
 */
export function placeFor(f: Fit, m: Measure, size: { x: number; y: number; z: number }): { x: number; y: number; z: number; scale: number; tilt: number; backwards: boolean } {
  const wide = Math.max(size.x, size.z, 0.001);
  const h = m.height;
  let width: number;
  let x = 0;
  let y: number;
  let z: number;
  let backwards = false;
  switch (f.place) {
    case 'crown':
      width = m.headW * f.width;
      y = m.top;
      z = m.headZ;
      break;
    case 'face':
      width = m.headW * f.width;
      y = m.eyeY;
      z = m.faceZ;
      break;
    case 'neck':
      width = m.neckW * f.width;
      y = m.neckY;
      z = m.neckFront - m.neckW * 0.42;
      break;
    case 'chest':
      width = m.neckW * f.width;
      y = m.chestY;
      z = m.chestFront;
      break;
    case 'back':
      width = m.backW * f.width;
      y = m.backY;
      z = m.backZ;
      backwards = true;
      break;
    case 'ear':
      width = m.headW * f.width;
      y = m.earY;
      x = m.earX;
      z = m.headZ;
      break;
  }
  const scale = width / wide;
  const tall = size.y * scale;
  const deep = size.z * scale;
  // Things on the front or back sit against the body, not in it.
  if (f.place === 'face' || f.place === 'chest') z += deep / 2;
  if (f.place === 'back') z -= deep / 2;
  if (f.place === 'face' || f.place === 'chest' || f.place === 'ear') y -= tall / 2;
  else if (f.place === 'back') y -= tall * 0.55;
  else y -= tall * f.sink;
  return { x, y: y + f.lift * h, z: z + f.forward * h * (backwards ? -1 : 1), scale, tilt: f.tilt, backwards };
}
