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

/**
 * A small thing done while standing about, laid over a standing pose: `k` runs 0 to 1 through
 * it. The right hand is left alone, since it may be holding a rod.
 */
export function fidget(p: Pose, kind: 'glance' | 'scratch' | 'shift' | 'yawn', k: number): Pose {
  // In, hold, out.
  const w = Math.min(1, k / 0.2, (1 - k) / 0.25);
  switch (kind) {
    case 'glance':
      // A look one way, then the other.
      p.look = (k < 0.5 ? 0.85 : -0.85) * w;
      p.turn += (k < 0.5 ? 0.12 : -0.12) * w;
      break;
    case 'scratch':
      // The left hand up to the head, scratching.
      p.armL = limb(0.5 * w + p.armL.swing * (1 - w), 2.2 * w + p.armL.out * (1 - w), 0);
      p.elbowL = p.elbowL * (1 - w) + (2.1 + Math.sin(k * 60) * 0.25) * w;
      p.side += 0.08 * w;
      p.nod += 0.12 * w;
      break;
    case 'shift':
      // From one foot to the other and back.
      p.side += Math.sin(k * Math.PI * 2) * 0.12 * w;
      p.bob -= 0.012 * w;
      p.kneeL += Math.max(0, Math.sin(k * Math.PI * 2)) * 0.35 * w;
      p.kneeR += Math.max(0, -Math.sin(k * Math.PI * 2)) * 0.35 * w;
      break;
    case 'yawn':
      // Head back, left arm stretched out.
      p.nod -= 0.4 * w;
      p.lean -= 0.1 * w;
      p.armL = limb(p.armL.swing * (1 - w) + 0.2 * w, p.armL.out * (1 - w) + 1.5 * w, 0);
      p.elbowL = p.elbowL * (1 - w) + 0.2 * w;
      break;
  }
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

/**
 * Rowing, sitting in the boat with both hands on the oars. `stroke` is where the oars are in
 * their stroke (`oarAt` in src/world/hull.ts): at 0 the arms are out and the back bent forward
 * for the catch, and half way round the hands are at the chest and the back leant away.
 */
export function row(t: number, effort: number, stroke = t * 4.2): Pose {
  const p = sit(t);
  const a = Math.cos(stroke) * effort;
  p.armL = limb(1.0 + a * 0.5, 0.4);
  p.armR = limb(1.0 + a * 0.5, 0.4);
  p.elbowL = 0.6 - a * 0.4;
  p.elbowR = 0.6 - a * 0.4;
  p.lean = 0.1 + a * 0.25;
  return p;
}

/** In the air: knees up, arms out for balance. */
export function jump(t: number): Pose {
  const p = neutral();
  p.armL = limb(0.6, 1.0);
  p.armR = limb(0.6, 1.0);
  p.elbowL = 0.4;
  p.elbowR = 0.4;
  p.legL = 0.6;
  p.legR = 0.2;
  p.kneeL = 0.9;
  p.kneeR = 0.5;
  p.lean = 0.08;
  p.nod = -0.1 + Math.sin(t * 3) * 0.02;
  return p;
}

/** Digging: bent over, both hands at the ground. */
export function dig(t: number): Pose {
  const p = neutral();
  const a = Math.sin(t * 9);
  p.lean = 0.55 + a * 0.08;
  p.armL = limb(1.1 + a * 0.25, 0.15);
  p.armR = limb(1.1 - a * 0.25, 0.15);
  p.elbowL = 0.3;
  p.elbowR = 0.3;
  p.kneeL = 0.5;
  p.kneeR = 0.5;
  p.legL = 0.35;
  p.legR = 0.35;
  return p;
}

/** Sweeping a metal detector from side to side. */
export function sweep(t: number): Pose {
  const p = idle(t);
  const a = Math.sin(t * 2.2);
  p.armR = limb(0.7, 0.15 + a * 0.25, -0.2);
  p.elbowR = 0.2;
  p.armL = limb(0.5, 0.1);
  p.turn = a * 0.15;
  p.nod = 0.25;
  return p;
}

/** Lying on the belly, flopping like a landed fish: the body itself is tipped over by the character. */
export function flop(t: number): Pose {
  const p = neutral();
  const f = Math.sin(t * 15);
  p.armL = limb(0.2, 1.4 + f * 0.5);
  p.armR = limb(0.2, 1.4 - f * 0.5);
  p.elbowL = 0.2;
  p.elbowR = 0.2;
  p.legL = -0.3 + f * 0.4;
  p.legR = -0.3 - f * 0.4;
  p.kneeL = 0.6 + f * 0.3;
  p.kneeR = 0.6 - f * 0.3;
  p.nod = -0.6 + f * 0.15;
  p.side = f * 0.15;
  return p;
}

/** A twirl, arms out: the character turns the body round. */
export function spin(t: number): Pose {
  const p = neutral();
  p.armL = limb(0.1, 1.45);
  p.armR = limb(0.1, 1.45);
  p.elbowL = 0.1;
  p.elbowR = 0.1;
  p.bob = Math.abs(Math.sin(t * 9)) * 0.03;
  p.nod = -0.15;
  p.legL = Math.max(0, Math.sin(t * 9)) * 0.4;
  p.kneeL = Math.max(0, Math.sin(t * 9)) * 0.8;
  return p;
}

/** A great honk: leaning in, chin out, arms flung back. */
export function honk(t: number): Pose {
  const p = neutral();
  const k = Math.min(1, t * 6);
  const shake = t < 0.9 ? Math.sin(t * 50) * 0.05 : 0;
  p.lean = 0.35 * k;
  p.nod = -0.5 * k + shake;
  p.armL = limb(-0.8 * k, 0.5);
  p.armR = limb(-0.8 * k, 0.5);
  p.elbowL = 0.1;
  p.elbowR = 0.1;
  p.kneeL = 0.15 * k;
  p.kneeR = 0.15 * k;
  p.bob = -0.01 * k;
  return p;
}

/** A slap with a fish: wound up across the body, then swung through. */
export function slap(t: number): Pose {
  const p = neutral();
  const wind = Math.min(1, t / 0.35);
  const hit = Math.max(0, Math.min(1, (t - 0.35) / 0.12));
  p.armR = limb(1.3, 0.3 + wind * 1.1 - hit * 1.9, -0.4);
  p.elbowR = 0.6 - hit * 0.4;
  p.turn = wind * 0.4 - hit * 0.9;
  p.lean = 0.1 * hit;
  p.side = -0.08 * hit;
  p.armL = limb(0.3, 0.4);
  return p;
}

/** A long stretch: arms up and back, onto the toes, then down. */
export function stretch(t: number): Pose {
  const p = neutral();
  const k = Math.min(1, Math.max(0, Math.sin((t % 3) / 3 * Math.PI) * 1.4));
  p.armL = limb(2.9 * k, 0.5 * k);
  p.armR = limb(2.9 * k, 0.5 * k);
  p.elbowL = 0.1;
  p.elbowR = 0.1;
  p.lean = -0.18 * k;
  p.nod = -0.35 * k;
  p.bob = 0.04 * k;
  return p;
}

/** Skipping a stone: a wind-up low on one side, and a flat flick across the body. `k` runs 0 to 1 over the throw. */
export function skipStone(k: number): Pose {
  const p = neutral();
  const wind = Math.min(1, k / 0.45);
  const flick = Math.min(1, Math.max(0, (k - 0.45) / 0.2));
  p.lean = 0.25;
  p.side = -0.3 * wind + 0.35 * flick;
  p.turn = -0.7 * wind + 1.2 * flick;
  p.armR = limb(-0.6 * wind + 1.5 * flick, 0.9 - 0.3 * flick);
  p.elbowR = 0.9 * wind * (1 - flick);
  p.armL = limb(0.4, 0.5);
  p.kneeL = 0.35;
  p.kneeR = 0.35;
  p.legL = 0.25;
  p.legR = -0.2;
  return p;
}

/** Warming the hands at a fire: both held out low in front, palms to it, rubbed together now and then. */
export function warm(t: number): Pose {
  const p = neutral();
  const rub = Math.floor(t / 2.4) % 3 === 2 ? Math.sin(t * 16) * 0.12 : 0;
  p.lean = 0.2;
  p.armL = limb(1.15 + rub, 0.18);
  p.armR = limb(1.15 - rub, 0.18);
  p.elbowL = 0.5;
  p.elbowR = 0.5;
  p.kneeL = 0.2;
  p.kneeR = 0.2;
  p.nod = 0.15;
  p.bob = -0.01;
  return p;
}

/** Leaning on a rail (or on nothing in particular): bent forward on the forearms, one foot crossed behind, looking out. */
export function leanOn(t: number): Pose {
  const p = neutral();
  p.lean = 0.5;
  p.armL = limb(1.0, 0.35);
  p.armR = limb(1.0, 0.35);
  p.elbowL = 1.3;
  p.elbowR = 1.3;
  p.legR = -0.25;
  p.kneeR = 0.5;
  p.nod = -0.3 + Math.sin(t * 0.7) * 0.04;
  p.look = Math.sin(t * 0.3) * 0.3;
  return p;
}

/**
 * On a skateboard: side on, knees bent, arms out for balance. `speed` runs 0 to 1; `push` is how
 * hard the back foot is kicking (0 to 1, as it gets going); `air` is 1 off the ground.
 */
export function skate(t: number, speed: number, push: number, air: number): Pose {
  const p = neutral();
  const kick = push * Math.max(0, Math.sin(t * 7));
  p.turn = 0.75;
  p.look = -0.6;
  p.lean = 0.14 + speed * 0.12 + air * 0.1;
  p.bob = -0.05 - air * 0.03;
  p.armL = limb(0.25, 0.85 + Math.sin(t * 2.2) * 0.08 + air * 0.4);
  p.armR = limb(-0.2, 0.8 - Math.sin(t * 2.2) * 0.08 + air * 0.4);
  p.elbowL = 0.3;
  p.elbowR = 0.3;
  p.legL = 0.3 + air * 0.35;
  p.legR = -0.15 - kick * 0.75 + air * 0.3;
  p.kneeL = 0.55 + air * 0.6;
  p.kneeR = 0.5 + kick * 0.3 + air * 0.6;
  return p;
}

/** On a pogo stick: both hands on the handle, knees together, folding as the spring is squeezed (`squeeze`, 0 to 1). */
export function pogo(t: number, squeeze: number): Pose {
  const p = neutral();
  p.armL = limb(1.0, 0.15);
  p.armR = limb(1.0, 0.15);
  p.elbowL = 1.0 + squeeze * 0.3;
  p.elbowR = 1.0 + squeeze * 0.3;
  p.legL = 0.35 + squeeze * 0.35;
  p.legR = 0.35 + squeeze * 0.35;
  p.kneeL = 0.5 + squeeze * 0.8;
  p.kneeR = 0.5 + squeeze * 0.8;
  p.lean = 0.1 + squeeze * 0.12;
  p.nod = -0.1 + Math.sin(t * 2) * 0.03;
  return p;
}

/** Hanging from a bunch of balloons: one arm straight up, the legs dangling and paddling a little. */
export function float(t: number): Pose {
  const p = neutral();
  p.armR = limb(3.0, 0.1);
  p.elbowR = 0.05;
  p.armL = limb(0.2, 0.5 + Math.sin(t * 1.6) * 0.15);
  p.legL = Math.sin(t * 2.4) * 0.3;
  p.legR = -Math.sin(t * 2.4) * 0.3;
  p.kneeL = 0.35;
  p.kneeR = 0.35;
  p.side = Math.sin(t * 1.1) * 0.08;
  p.nod = -0.2;
  return p;
}
