// Whether something tall stands in the line of sight from the player to the camera. Pure.

/** The line of sight: from a point (the player's chest) along a step to the camera. */
export interface Sight {
  ax: number;
  ay: number;
  az: number;
  dx: number;
  dy: number;
  dz: number;
}

/** A tree as an upright drum: where it stands, how tall, how wide its crown, and how far up (0 to 1) its bare trunk goes. */
export interface Drum {
  x: number;
  z: number;
  base: number;
  height: number;
  radius: number;
  trunk: number;
}

/**
 * Whether the line passes through the drum's crown: within its radius of its middle, seen from
 * above, at a height between the top of its trunk and its top. A tree beside the line, beyond
 * the player, or under a line that passes over its top, does not count.
 */
export function sightCrosses(s: Sight, d: Drum): boolean {
  // Where along the line (0 at the player, 1 at the camera) it is within the radius, seen from above.
  const px = s.ax - d.x;
  const pz = s.az - d.z;
  const a = s.dx * s.dx + s.dz * s.dz;
  const c = px * px + pz * pz - d.radius * d.radius;
  let from = 0;
  let to = 1;
  if (a < 1e-9) {
    // Looking straight down: the line is one spot on the ground.
    if (c > 0) return false;
  } else {
    const b = px * s.dx + pz * s.dz;
    const disc = b * b - a * c;
    if (disc < 0) return false;
    const root = Math.sqrt(disc);
    from = Math.max(0, (-b - root) / a);
    to = Math.min(1, (-b + root) / a);
    if (from > to) return false;
  }
  // The heights of the line over that stretch, against the crown's.
  const y0 = s.ay + s.dy * from;
  const y1 = s.ay + s.dy * to;
  const low = d.base + d.height * d.trunk;
  const high = d.base + d.height;
  return Math.max(y0, y1) >= low && Math.min(y0, y1) <= high;
}
