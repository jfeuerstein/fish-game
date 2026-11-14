// Poses for the characters, as joint angles. Pure, so the shapes of a walk or a cast can be
// tested. The rig (rig.ts) turns these into bone rotations.
//
// Every angle is in radians. A limb's `swing` moves it forward (positive) or back; `out` lifts it
// away from the body to its own side. A bend of the elbow or knee is positive the way the joint
// naturally folds: forearm forward and up, shin back.

export interface Limb {
  swing: number;
  out: number;
  twist: number;
}

export interface Pose {
  /** Up or down, as a fraction of the character's height. */
  bob: number;
  /** Spine: forward lean, sideways bend, twist toward the left. */
  lean: number;
  side: number;
  turn: number;
  /** Head: nod forward, turn left. */
  nod: number;
  look: number;
  armL: Limb;
  armR: Limb;
  elbowL: number;
  elbowR: number;
  legL: number;
  legR: number;
  kneeL: number;
  kneeR: number;
}

const limb = (swing = 0, out = 0, twist = 0): Limb => ({ swing, out, twist });

export function neutral(): Pose {
  return { bob: 0, lean: 0, side: 0, turn: 0, nod: 0, look: 0, armL: limb(0, 0.12), armR: limb(0, 0.12), elbowL: 0.15, elbowR: 0.15, legL: 0, legR: 0, kneeL: 0, kneeR: 0 };
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpLimb = (a: Limb, b: Limb, t: number): Limb => ({ swing: lerp(a.swing, b.swing, t), out: lerp(a.out, b.out, t), twist: lerp(a.twist, b.twist, t) });

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    bob: lerp(a.bob, b.bob, t),
    lean: lerp(a.lean, b.lean, t),
    side: lerp(a.side, b.side, t),
    turn: lerp(a.turn, b.turn, t),
    nod: lerp(a.nod, b.nod, t),
    look: lerp(a.look, b.look, t),
    armL: lerpLimb(a.armL, b.armL, t),
    armR: lerpLimb(a.armR, b.armR, t),
    elbowL: lerp(a.elbowL, b.elbowL, t),
    elbowR: lerp(a.elbowR, b.elbowR, t),
    legL: lerp(a.legL, b.legL, t),
    legR: lerp(a.legR, b.legR, t),
    kneeL: lerp(a.kneeL, b.kneeL, t),
    kneeR: lerp(a.kneeR, b.kneeR, t),
  };
}

/** Standing, breathing. `t` is seconds. */
export function idle(t: number): Pose {
  const p = neutral();
  const b = Math.sin(t * 2.1);
  p.bob = b * 0.006;
  p.lean = 0.02 + b * 0.015;
  p.armL.out = 0.14 + b * 0.02;
  p.armR.out = 0.14 + b * 0.02;
  p.look = Math.sin(t * 0.37) * 0.25 * Math.max(0, Math.sin(t * 0.13));
  return p;
}

/** A waddling walk. `phase` runs 0..1 per stride pair; `speed` 0 (stroll) to 1 (run). */
export function walk(phase: number, speed: number): Pose {
  const p = neutral();
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const stride = 0.45 + 0.35 * speed;
  p.legL = s * stride;
  p.legR = -s * stride;
  p.kneeL = Math.max(0, -c) * (0.5 + 0.6 * speed) + 0.05;
  p.kneeR = Math.max(0, c) * (0.5 + 0.6 * speed) + 0.05;
  p.armL = limb(-s * (0.4 + 0.4 * speed), 0.16);
  p.armR = limb(s * (0.4 + 0.4 * speed), 0.16);
  p.elbowL = 0.25 + speed * 0.6;
  p.elbowR = 0.25 + speed * 0.6;
  p.bob = Math.abs(Math.cos(a)) * (0.025 + 0.02 * speed) - 0.01;
  // The waddle: a sway from side to side with each step.
  p.side = s * (0.07 - 0.03 * speed);
  p.turn = s * 0.08;
  p.lean = 0.05 + 0.12 * speed;
  return p;
}

/** Sitting on something at seat height. */
export function sit(t: number): Pose {
  const p = idle(t);
  p.legL = 1.45;
  p.legR = 1.45;
  p.kneeL = 1.4;
  p.kneeR = 1.4;
  p.armL = limb(0.5, 0.18);
  p.armR = limb(0.5, 0.18);
  p.elbowL = 0.8;
  p.elbowR = 0.8;
  p.lean = 0.05;
  return p;
}

/** Holding the rod out in front, waiting. `t` for a little sway. */
export function holdRod(t: number): Pose {
  const p = idle(t);
  p.armR = limb(0.85, 0.1, -0.3);
  p.elbowR = 0.6;
  p.armL = limb(0.55, 0.05, 0.4);
  p.elbowL = 0.9;
  p.turn = 0.12;
  return p;
}

/** Winding up to cast, power 0..1: the rod goes back over the shoulder. */
export function castBack(power: number): Pose {
  const p = holdRod(0);
  p.armR = limb(1.4 + power * 1.1, 0.25, -0.2);
  p.elbowR = 0.9 + power * 0.4;
  p.armL = limb(0.6, 0.1, 0.3);
  p.lean = -0.08 - power * 0.12;
  p.turn = 0.3 + power * 0.25;
  p.legL = 0.25;
  p.legR = -0.2;
  return p;
}

/** The throw, k from 0 (rod back) to 1 (rod pointing out over the water). */
export function castThrow(k: number): Pose {
  const back = castBack(1);
  const out = holdRod(0);
  out.armR = limb(1.15, 0.1, -0.3);
  out.elbowR = 0.2;
  out.lean = 0.18;
  out.turn = -0.1;
  return blend(back, out, Math.min(1, k * 1.3));
}

/** Reeling in: the left hand winds, the body leans back against the pull. */
export function reel(t: number, strain: number): Pose {
  const p = holdRod(t);
  const w = t * 14;
  p.armR = limb(0.95 + strain * 0.3, 0.1, -0.3);
  p.armL = limb(0.7 + Math.sin(w) * 0.18, 0.12 + Math.cos(w) * 0.08, 0.3);
  p.elbowL = 1.0 + Math.cos(w) * 0.25;
  p.lean = -0.12 - strain * 0.18 + Math.sin(t * 23) * 0.02 * strain;
  p.legL = 0.3;
  p.legR = -0.25;
  p.kneeL = 0.15;
  return p;
}

/** Holding a catch up over the head, proudly. */
export function showOff(t: number): Pose {
  const p = idle(t);
  const b = Math.abs(Math.sin(t * 6)) * 0.02;
  p.armL = limb(2.6, 0.35);
  p.armR = limb(2.6, 0.35);
  p.elbowL = 0.35;
  p.elbowR = 0.35;
  p.bob = b;
  p.lean = -0.06;
  p.nod = -0.2;
  return p;
}

export function cheer(t: number): Pose {
  const p = neutral();
  const j = Math.abs(Math.sin(t * 7));
  p.bob = j * 0.08;
  p.armL = limb(2.7, 0.6 + j * 0.2);
  p.armR = limb(2.7, 0.6 + j * 0.2);
  p.elbowL = 0.2;
  p.elbowR = 0.2;
  p.kneeL = (1 - j) * 0.4;
  p.kneeR = (1 - j) * 0.4;
  p.legL = (1 - j) * 0.2;
  p.legR = (1 - j) * 0.2;
  p.nod = -0.25;
  return p;
}

export function wave(t: number): Pose {
  const p = idle(t);
  p.armR = limb(0.4, 2.3, 0);
  p.elbowR = 0.9 + Math.sin(t * 10) * 0.45;
  p.side = -0.06;
  p.look = 0.1;
  return p;
}

export function dance(t: number): Pose {
  const p = neutral();
  const a = t * Math.PI * 2 * 1.1;
  const s = Math.sin(a);
  p.bob = Math.abs(Math.cos(a)) * 0.04;
  p.side = s * 0.18;
  p.turn = Math.sin(a * 0.5) * 0.3;
  p.armL = limb(0.8 + s * 0.6, 0.9, 0);
  p.armR = limb(0.8 - s * 0.6, 0.9, 0);
  p.elbowL = 1.2;
  p.elbowR = 1.2;
  p.legL = Math.max(0, s) * 0.5;
  p.legR = Math.max(0, -s) * 0.5;
  p.kneeL = Math.max(0, s) * 0.7;
  p.kneeR = Math.max(0, -s) * 0.7;
  p.nod = Math.sin(a * 2) * 0.12;
  return p;
}

export function clap(t: number): Pose {
  const p = idle(t);
  const k = (Math.sin(t * 13) + 1) / 2;
  p.armL = limb(1.2, 0.5 - k * 0.45, 0.6);
  p.armR = limb(1.2, 0.5 - k * 0.45, -0.6);
  p.elbowL = 1.1;
  p.elbowR = 1.1;
  p.bob = k * 0.01;
  return p;
}

/** Strumming the ukulele. `pluck` is a fade from the last note played. */
export function uke(t: number, pluck: number): Pose {
  const p = idle(t);
  p.armL = limb(0.7, 0.3, 0.9);
  p.elbowL = 1.5;
  p.armR = limb(0.5 + pluck * 0.2, 0.15, -0.5);
  p.elbowR = 1.4 - pluck * 0.3;
  p.nod = 0.15;
  p.side = Math.sin(t * 2.4) * 0.05;
  return p;
}

/** Rowing, sitting in the boat. */
export function row(t: number, effort: number): Pose {
  const p = sit(t);
  const a = Math.sin(t * 4.2) * effort;
  p.armL = limb(1.0 + a * 0.5, 0.4);
  p.armR = limb(1.0 + a * 0.5, 0.4);
  p.elbowL = 0.6 - a * 0.4;
  p.elbowR = 0.6 - a * 0.4;
  p.lean = 0.1 + a * 0.25;
  return p;
}
