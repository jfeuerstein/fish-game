// The spotlight on the player. A tree is never taken away, and never thinned as a whole: where
// it comes between the camera and the player, a round window is opened in it over the player,
// clear in the middle and broken up toward its rim in a dither, so the player is always seen
// and the rest of the tree is untouched. Pure: the numbers and the rule, and the same rule
// written for the graphics card.

export const SPOT = {
  /** How far round the player the window reaches, metres (measured at the player's distance from the camera). */
  radius: 1.9,
  /** The share of that radius that is wholly clear; from there to the rim it thins out. */
  core: 0.45,
  /** Only what is nearer the camera than the player by this much, metres, is opened: never what the player stands in front of. */
  nearer: 0.35,
} as const;

/** The ordered dither's threshold for a pixel, between 0 and 1: the same four-by-four pattern the finished picture is dithered with. */
export function bayer(x: number, y: number): number {
  const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const i = (((Math.floor(x) % 4) + 4) % 4) + ((((Math.floor(y) % 4) + 4) % 4) * 4);
  return (M[i] + 0.5) / 16;
}

/**
 * Whether a pixel of something in the way is left out. `d` is how far the pixel is from the
 * player on the screen, as a share of the window's radius; `x`, `y` are the pixel's place.
 */
export function opened(d: number, x: number, y: number): boolean {
  if (d >= 1) return false;
  const t = Math.min(1, Math.max(0, (d - SPOT.core) / (1 - SPOT.core)));
  // How much of the tree is kept here, rising smoothly from none at the core to all at the rim.
  const kept = t * t * (3 - 2 * t);
  return kept <= bayer(x, y);
}

const f = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`);

/** For a material's vertex shader: declarations, and what to do once the vertex is projected. */
export const spotVertexHead = /* glsl */ `
uniform vec3 uSpotAt;
varying vec4 vSpotClip;
varying vec4 vSpot;
varying float vSpotAspect;`;
export const spotVertexBody = /* glsl */ `
  vSpotClip = gl_Position;
  vec4 spotView = viewMatrix * vec4(uSpotAt, 1.0);
  vec4 spotClip = projectionMatrix * spotView;
  // Where the player is on the screen, how far off, and how big a metre is there.
  vSpot = vec4(spotClip.xy / spotClip.w, -spotView.z, projectionMatrix[1][1] / spotClip.w);
  vSpotAspect = projectionMatrix[1][1] / projectionMatrix[0][0];`;

/** For the fragment shader: declarations, and the test to put first in main(). */
export const spotFragmentHead = /* glsl */ `
varying vec4 vSpotClip;
varying vec4 vSpot;
varying float vSpotAspect;
float spotBayer(vec2 p) {
  vec2 a = floor(mod(p, 4.0));
  float i = a.x + a.y * 4.0;
  float v = 0.0;
  if (i < 0.5) v = 0.0; else if (i < 1.5) v = 8.0; else if (i < 2.5) v = 2.0; else if (i < 3.5) v = 10.0;
  else if (i < 4.5) v = 12.0; else if (i < 5.5) v = 4.0; else if (i < 6.5) v = 14.0; else if (i < 7.5) v = 6.0;
  else if (i < 8.5) v = 3.0; else if (i < 9.5) v = 11.0; else if (i < 10.5) v = 1.0; else if (i < 11.5) v = 9.0;
  else if (i < 12.5) v = 15.0; else if (i < 13.5) v = 7.0; else if (i < 14.5) v = 13.0; else v = 5.0;
  return (v + 0.5) / 16.0;
}`;
export const spotFragmentBody = /* glsl */ `
  if (vSpot.z > 0.0 && vSpotClip.w < vSpot.z - ${f(SPOT.nearer)}) {
    float spotD = length((vSpotClip.xy / vSpotClip.w - vSpot.xy) * vec2(vSpotAspect, 1.0)) / (${f(SPOT.radius)} * vSpot.w);
    if (spotD < 1.0 && smoothstep(${f(SPOT.core)}, 1.0, spotD) <= spotBayer(gl_FragCoord.xy)) discard;
  }`;
