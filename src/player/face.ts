// Drawn eyes. Every character's model comes with eyes painted on it; cut down to a small
// texture they are smudges, so the tool that cuts models down (tools/assets/eyes.mjs) paints
// them out and writes down where they were, and the game draws eyes of its own exactly there:
// flat, dark, a little too big, able to blink and to change with what the character is doing.
// (Mouths are left as the models have them.) Pure: how big a drawn eye is, which expression goes
// with which action, when to blink, and the shapes themselves.

export type Expression = 'open' | 'closed' | 'happy' | 'wide' | 'squint';
export const EXPRESSIONS: readonly Expression[] = ['open', 'closed', 'happy', 'wide', 'squint'];

/**
 * A painted eye as the model file gives it (`eyes` in its scene's extras), in the frame of the
 * head's bone: the middle of the eye on the surface, the way the surface faces there, the
 * eye's radius, and how light (0 to 1) the fur round it is.
 */
export interface PaintedEye {
  p: [number, number, number];
  n: [number, number, number];
  r: number;
  on: number;
}

/** What `eyes` in a model file holds, if it is two eyes. Anything else is null. */
export function readEyes(v: unknown): [PaintedEye, PaintedEye] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const three = (a: unknown): a is [number, number, number] => Array.isArray(a) && a.length === 3 && a.every((x) => typeof x === 'number' && Number.isFinite(x));
  const eyes = v.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return three(o.p) && three(o.n) && typeof o.r === 'number' && o.r > 0 ? { p: o.p, n: o.n, r: o.r, on: typeof o.on === 'number' ? o.on : 1 } : null;
  });
  return eyes[0] && eyes[1] ? [eyes[0], eyes[1]] : null;
}

/** A drawn eye is this many times as tall as the painted one was across... */
export const GROW = 1.7;
/** ...but never smaller or bigger than these fractions of the character's height, so every islander's eyes read alike. */
export const EYE_MIN = 0.105;
export const EYE_MAX = 0.135;
/** Fur darker than this (0 to 1) hides a dark eye (a raccoon's, in its mask): there the eye shows by its glint, and its lines are drawn paler. */
export const DARK_FUR = 0.27;

/** How tall each of a character's drawn eyes is, in metres: `radius` is the painted eyes' (both the same), `height` the character's. */
export function eyeHeight(radius: number, height: number): number {
  return Math.min(EYE_MAX * height, Math.max(EYE_MIN * height, radius * 2 * GROW));
}

/** Where eyes go on a head that has none painted (a stand-in, or a new model before its eyes are found). */
export const GUESS = { y: 0.74, az: 0.42, size: 0.11 };

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

// ---------- The shapes ----------
//
// An eye is drawn in a square one eye-height on a side: x and y run from -0.5 to 0.5, y up, x to
// the viewer's right. Each expression is a shape given as a distance: below zero is inside.
// Nothing here is a picture, so an eye is as crisp five pixels tall as fifty; the lines are
// thick enough that at the size they are seen in play (five or six pixels) none breaks up.
// `eyeShader` below is the same shapes for the graphics card; a test holds the two together.

const seg = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.min(1, Math.max(0, ((px - ax) * bax + (py - ay) * bay) / (bax * bax + bay * bay)));
  return Math.hypot(px - ax - bax * h, py - ay - bay * h);
};

/** The numbers both forms of the shapes are built from. */
export const SHAPE = {
  open: { rx: 0.33, ry: 0.48 },
  wide: { rx: 0.45, ry: 0.5 },
  /** A lid: a line that sags in the middle. */
  closed: { y: -0.06, sag: 0.1, half: 0.42, thick: 0.11 },
  /** An arch, high in the middle. */
  happy: { y: 0.14, drop: 0.24, half: 0.42, thick: 0.12 },
  /** A chevron pointing at the nose. */
  squint: { tip: -0.3, end: 0.34, rise: 0.34, thick: 0.11 },
  /** The glint: a square up and to the left, for open and wide eyes. */
  glint: { x: -0.1, y: 0.2, half: 0.1 },
  /** On dark fur the glint is what shows of an open eye, so it is bigger. */
  glintOnDark: { x: -0.06, y: 0.14, half: 0.15 },
} as const;

/**
 * How far a point is from an expression's shape (below zero: inside it). `side` is 1 for the
 * eye on the character's left and -1 for the other, which is its mirror.
 */
export function eyeDistance(face: Expression, x: number, y: number, side: 1 | -1): number {
  const S = SHAPE;
  switch (face) {
    case 'open':
      return (Math.hypot(x / S.open.rx, y / S.open.ry) - 1) * S.open.rx;
    case 'wide':
      return (Math.hypot(x / S.wide.rx, y / S.wide.ry) - 1) * S.wide.rx;
    case 'closed': {
      const k = (x / S.closed.half) ** 2;
      return Math.max(Math.abs(y - S.closed.y - S.closed.sag * k) - S.closed.thick, Math.abs(x) - S.closed.half);
    }
    case 'happy': {
      const k = (x / S.happy.half) ** 2;
      return Math.max(Math.abs(y - S.happy.y + S.happy.drop * k) - S.happy.thick, Math.abs(x) - S.happy.half);
    }
    case 'squint': {
      const q = x * side;
      return Math.min(seg(q, y, S.squint.tip, 0, S.squint.end, S.squint.rise), seg(q, y, S.squint.tip, 0, S.squint.end, -S.squint.rise)) - S.squint.thick;
    }
  }
}

/**
 * What is drawn at a point of an eye: nothing, ink, pale (the glint) or soft (a paler line).
 * An open eye is ink with a pale glint; a shut, smiling or squinting one is a line of ink. On
 * dark fur (`onDark`) ink does not show, so the glint is bigger, as a raccoon's eyes are two
 * glints in its mask, and the lines are soft.
 */
export function eyeAt(face: Expression, x: number, y: number, side: 1 | -1, onDark = false): 'none' | 'ink' | 'pale' | 'soft' {
  if (eyeDistance(face, x, y, side) >= 0) return 'none';
  if (face !== 'open' && face !== 'wide') return onDark ? 'soft' : 'ink';
  const g = onDark ? SHAPE.glintOnDark : SHAPE.glint;
  return Math.abs(x - g.x) < g.half && Math.abs(y - g.y) < g.half ? 'pale' : 'ink';
}

const f = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`);

/**
 * The same shapes for the graphics card. `uFace` is the expression's place in EXPRESSIONS,
 * `uOnDark` 1 for an eye on dark fur; `vAt` is the point (x, y) and `vSide` the eye's side.
 */
export const eyeShader = /* glsl */ `
uniform float uFace, uOnDark;
uniform vec3 uInk, uPale, uSoft;
varying vec2 vAt;
varying float vSide;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
float eyeDistance(vec2 p) {
  if (uFace < 0.5) return (length(p / vec2(${f(SHAPE.open.rx)}, ${f(SHAPE.open.ry)})) - 1.0) * ${f(SHAPE.open.rx)};
  if (uFace < 1.5) {
    float k = (p.x / ${f(SHAPE.closed.half)}) * (p.x / ${f(SHAPE.closed.half)});
    return max(abs(p.y - ${f(SHAPE.closed.y)} - ${f(SHAPE.closed.sag)} * k) - ${f(SHAPE.closed.thick)}, abs(p.x) - ${f(SHAPE.closed.half)});
  }
  if (uFace < 2.5) {
    float k = (p.x / ${f(SHAPE.happy.half)}) * (p.x / ${f(SHAPE.happy.half)});
    return max(abs(p.y - ${f(SHAPE.happy.y)} + ${f(SHAPE.happy.drop)} * k) - ${f(SHAPE.happy.thick)}, abs(p.x) - ${f(SHAPE.happy.half)});
  }
  if (uFace < 3.5) return (length(p / vec2(${f(SHAPE.wide.rx)}, ${f(SHAPE.wide.ry)})) - 1.0) * ${f(SHAPE.wide.rx)};
  vec2 q = vec2(p.x * vSide, p.y);
  return min(seg(q, vec2(${f(SHAPE.squint.tip)}, 0.0), vec2(${f(SHAPE.squint.end)}, ${f(SHAPE.squint.rise)})), seg(q, vec2(${f(SHAPE.squint.tip)}, 0.0), vec2(${f(SHAPE.squint.end)}, ${f(-SHAPE.squint.rise)}))) - ${f(SHAPE.squint.thick)};
}
vec4 eyeColour() {
  if (eyeDistance(vAt) >= 0.0) return vec4(0.0);
  bool round = uFace < 0.5 || (uFace > 2.5 && uFace < 3.5);
  if (!round) return vec4(uOnDark > 0.5 ? uSoft : uInk, 1.0);
  vec3 g = uOnDark > 0.5 ? vec3(${f(SHAPE.glintOnDark.x)}, ${f(SHAPE.glintOnDark.y)}, ${f(SHAPE.glintOnDark.half)}) : vec3(${f(SHAPE.glint.x)}, ${f(SHAPE.glint.y)}, ${f(SHAPE.glint.half)});
  return vec4(abs(vAt.x - g.x) < g.z && abs(vAt.y - g.y) < g.z ? uPale : uInk, 1.0);
}`;
