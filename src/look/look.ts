// The game's look: a small picture blown up, a short palette, light in steps, movement on
// twos. `look=smooth` in the address draws it the way it was before (full size, soft light,
// fluid movement), to set one beside the other; the models and the menus stay lo-fi either way.
// Pure: no three.js.

export type LookName = 'lofi' | 'smooth';

export interface Look {
  name: LookName;
  lofi: boolean;
  /** How many screen points one pixel of the picture covers (0: as sharp as the screen). */
  pixel: number;
  /** Levels of each of red, green and blue the finished picture keeps (0: all of them). */
  levels: number;
  /** How strongly the picture is dithered between those levels, in levels, for each setting of Settings > Grain. */
  dither: readonly [number, number, number];
  /** Poses a second a character is moved through (0: every frame), and frames to a stride. */
  poses: number;
  stride: number;
  /** The tones a lit thing breaks into, darkest first, by how squarely it faces the light. */
  tones: number[];
}

/**
 * Dither for Settings > Grain: none, a little, all of it. Flat colours make up most of the
 * picture, and fully dithered each becomes a cross-hatch of the two levels it lies between; a
 * little keeps bands out of the sky and the fog without hatching everything else.
 */
export const GRAIN = [0, 0.4, 1] as const;

/** Bigger pixels still, for the setting. */
export const CHUNKY = 3;

export function lookFor(name: string | null, chunky = false): Look {
  if (name === 'smooth') return { name: 'smooth', lofi: false, pixel: 0, levels: 0, dither: [0, 0, 0], poses: 0, stride: 0, tones: [] };
  return { name: 'lofi', lofi: true, pixel: chunky ? CHUNKY : 2, levels: 31, dither: GRAIN, poses: 12, stride: 8, tones: [0.42, 0.42, 0.8, 1] };
}

/** The size of the picture drawn, for a screen of `width` by `height` points. */
export function pictureSize(look: Look, width: number, height: number, dpr: number): { width: number; height: number } {
  if (!look.pixel) {
    const r = Math.min(dpr, 2);
    return { width: Math.round(width * r), height: Math.round(height * r) };
  }
  return { width: Math.max(1, Math.round(width / look.pixel)), height: Math.max(1, Math.round(height / look.pixel)) };
}

/**
 * Whether a character's pose is due to be changed: `held` seconds since the last one, and for
 * walking the place in the stride then and now, so a stride always has the same few frames.
 */
export function poseDue(look: Look, held: number, walking: boolean, phaseThen: number, phaseNow: number): boolean {
  if (!look.poses) return true;
  if (walking) return Math.floor(phaseThen * look.stride) !== Math.floor(phaseNow * look.stride) || held >= 0.25;
  return held >= 1 / look.poses;
}
