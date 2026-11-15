// Where an islander looks, and the small things it does when nothing is happening. Islanders
// turn their heads to watch the player go by, keep looking a beat after there is nothing left to
// look at, and now and then scratch, glance about, shift their weight or yawn. It is most of
// what makes them feel alive, and a little odd. Pure.

export const GAZE = {
  /** How near someone has to be to be watched, metres. */
  reach: 9,
  /** How far a head turns, radians each way. */
  neck: 1.15,
  /** Past this, someone is behind: the head gives up craning and turns back. */
  behind: 2.5,
  /** How long the head stays turned after there is nobody to look at, seconds. */
  hold: 1.4,
} as const;

/**
 * How far to the left the head is turned to look at someone (radians; negative is right), or
 * null if they are too far off or behind. `yaw` is the way the body faces (0 is +z), and `dx`,
 * `dz` are how far they are to the east and south.
 */
export function lookToward(yaw: number, dx: number, dz: number): number | null {
  const d = Math.hypot(dx, dz);
  if (d > GAZE.reach || d < 0.05) return null;
  let rel = Math.atan2(dx, dz) - yaw;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  if (Math.abs(rel) > GAZE.behind) return null;
  return Math.max(-GAZE.neck, Math.min(GAZE.neck, rel));
}

/** Keeps a head turned where it was for a moment after its reason has gone. */
export class Gaze {
  /** Where the head is turned, or null when it is the pose's own business. */
  look: number | null = null;
  private since = 0;

  update(dt: number, toward: number | null): number | null {
    if (toward !== null) {
      this.look = toward;
      this.since = 0;
    } else if (this.look !== null) {
      this.since += dt;
      if (this.since > GAZE.hold) this.look = null;
    }
    return this.look;
  }
}

export type FidgetKind = 'glance' | 'scratch' | 'shift' | 'yawn';
export const FIDGETS: readonly FidgetKind[] = ['glance', 'scratch', 'shift', 'yawn'];
/** How long a fidget lasts, seconds. */
export const FIDGET_SECS = 2.4;

const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * What fidget, if any, is going on at a time: `kind`, and how far through it is (0 to 1).
 * Each character (`seed`) has its own rhythm, one fidget every nine to sixteen seconds, at a
 * different moment in each stretch, so no two are ever in step.
 */
export function fidgetAt(t: number, seed: number): { kind: FidgetKind; k: number } | null {
  const every = 9 + (seed % 8);
  const n = Math.floor(t / every);
  const start = n * every + hash(n * 7.3 + seed) * (every - FIDGET_SECS);
  const k = (t - start) / FIDGET_SECS;
  if (k < 0 || k >= 1) return null;
  return { kind: FIDGETS[Math.floor(hash(n * 3.1 + seed * 1.7) * FIDGETS.length)], k };
}
