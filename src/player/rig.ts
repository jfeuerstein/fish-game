// Puts a pose (poses.ts) onto the skeleton Tripo gave a character.
//
// The rig comes in an A-pose. Each controlled bone is turned by a rotation about an axis of the
// character's own (forward, up, its left), worked out from where the bones are, and each turn is
// carried down to the bones below it, so a bent elbow follows its arm.
import * as THREE from 'three';
import type { Limb, Pose } from './poses';

type Name = 'spine' | 'chest' | 'head' | 'upperL' | 'upperR' | 'foreL' | 'foreR' | 'thighL' | 'thighR' | 'calfL' | 'calfR';

const BONES: Record<Name, string[]> = {
  spine: ['Spine01', 'Spine', 'spine'],
  chest: ['Spine02', 'Spine1', 'chest'],
  head: ['Head', 'head'],
  upperL: ['L_Upperarm', 'LeftArm'],
  upperR: ['R_Upperarm', 'RightArm'],
  foreL: ['L_Forearm', 'LeftForeArm'],
  foreR: ['R_Forearm', 'RightForeArm'],
  thighL: ['L_Thigh', 'LeftUpLeg'],
  thighR: ['R_Thigh', 'RightUpLeg'],
  calfL: ['L_Calf', 'LeftLeg'],
  calfR: ['R_Calf', 'RightLeg'],
};

const v = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();

export class Rig {
  readonly ok: boolean;
  /** Bones in order from the top of the tree down. */
  private order: THREE.Bone[] = [];
  private rest = new Map<THREE.Bone, THREE.Quaternion>();
  private delta = new Map<THREE.Bone, THREE.Quaternion>();
  private named: Partial<Record<Name, THREE.Bone>> = {};
  /** The character's own axes, in the space the top bone lives in. */
  private up = new THREE.Vector3(0, 1, 0);
  private fwd = new THREE.Vector3(0, 0, 1);
  private left = new THREE.Vector3(1, 0, 0);
  /** The rotation that brings each A-posed arm down to the side. */
  private hangL = new THREE.Quaternion();
  private hangR = new THREE.Quaternion();
  /** The character's forward, in world space, given which of the two ways it really faces. */
  forwardWorld(sign: 1 | -1): THREE.Vector3 {
    const space = this.order[0]?.parent;
    if (!space) return new THREE.Vector3(0, 0, 1);
    space.updateMatrixWorld(true);
    return this.fwd.clone().multiplyScalar(sign).applyQuaternion(space.getWorldQuaternion(new THREE.Quaternion()));
  }

  /** The rig faces the other way from what its bone names suggest: turn its idea of forward round. */
  flip(): void {
    this.fwd.negate();
  }

  /** Bones the hands are, for holding things. */
  handR: THREE.Bone | null = null;
  handL: THREE.Bone | null = null;
  headBone: THREE.Bone | null = null;
  chestBone: THREE.Bone | null = null;

  constructor(root: THREE.Object3D) {
    let skinned: THREE.SkinnedMesh | null = null;
    root.traverse((o) => {
      if (!skinned && (o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
    });
    const mesh = skinned as THREE.SkinnedMesh | null;
    if (!mesh) {
      this.ok = false;
      return;
    }
    const bones = mesh.skeleton.bones;
    const byName = new Map(bones.map((b) => [b.name, b]));
    for (const [name, options] of Object.entries(BONES) as [Name, string[]][]) {
      const found = options.map((o) => byName.get(o)).find(Boolean);
      if (found) this.named[name] = found;
    }
    this.handR = byName.get('R_Hand') ?? byName.get('RightHand') ?? null;
    this.handL = byName.get('L_Hand') ?? byName.get('LeftHand') ?? null;
    this.headBone = this.named.head ?? null;
    this.chestBone = this.named.chest ?? this.named.spine ?? null;
    this.ok = !!(this.named.upperL && this.named.upperR && this.named.thighL && this.named.thighR);
    // The top of the bone tree, and everything under it in order.
    const top = bones.find((b) => !(b.parent as THREE.Bone)?.isBone) ?? bones[0];
    const walk = (b: THREE.Object3D, parentRest: THREE.Quaternion): void => {
      if (!(b as THREE.Bone).isBone) return;
      const bone = b as THREE.Bone;
      const rest = parentRest.clone().multiply(bone.quaternion);
      this.rest.set(bone, rest);
      this.delta.set(bone, new THREE.Quaternion());
      this.order.push(bone);
      for (const c of bone.children) walk(c, rest);
    };
    walk(top, new THREE.Quaternion());
    if (!this.ok) return;
    // Where the joints are, in the top bone's parent's space.
    const space = top.parent!;
    space.updateMatrixWorld(true);
    const inv = space.matrixWorld.clone().invert();
    const at = (b: THREE.Bone | undefined | null): THREE.Vector3 => (b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) : new THREE.Vector3());
    const hips = at(this.named.thighL).add(at(this.named.thighR)).multiplyScalar(0.5);
    const head = at(this.named.head ?? this.named.chest);
    this.up.copy(head).sub(hips).normalize();
    this.left.copy(at(this.named.upperL)).sub(at(this.named.upperR));
    this.left.addScaledVector(this.up, -this.left.dot(this.up)).normalize();
    this.fwd.crossVectors(this.left, this.up).normalize();
    // Arms: from their rest direction to hanging down, a little out from the body.
    for (const side of ['L', 'R'] as const) {
      const upper = this.named[`upper${side}`]!;
      const fore = this.named[`fore${side}`] ?? upper.children.find((c) => (c as THREE.Bone).isBone);
      const restDir = at(fore as THREE.Bone).sub(at(upper)).normalize();
      const out = side === 'L' ? this.left : this.left.clone().negate();
      const hang = this.up.clone().negate();
      (side === 'L' ? this.hangL : this.hangR).setFromUnitVectors(restDir, hang.clone().addScaledVector(out, 0.0001).normalize());
    }
  }

  /** The sideways direction of one side, in rig space. */
  private outOf(side: 'L' | 'R'): THREE.Vector3 {
    return side === 'L' ? this.left : v.copy(this.left).negate();
  }

  /** The turn that puts a hanging arm or leg into a limb pose. */
  private limbTurn(side: 'L' | 'R', l: Limb, out: THREE.Quaternion): THREE.Quaternion {
    const down = this.up.clone().negate();
    const swingAxis = new THREE.Vector3().crossVectors(down, this.fwd).normalize();
    const outDir = this.outOf(side).clone();
    const outAxis = new THREE.Vector3().crossVectors(down, outDir).normalize();
    // Out to the side first, then swung forward, then twisted about the limb.
    out.setFromAxisAngle(swingAxis, l.swing);
    q2.setFromAxisAngle(outAxis, l.out);
    out.multiply(q2);
    if (l.twist) {
      q2.setFromAxisAngle(down, side === 'L' ? l.twist : -l.twist);
      out.multiply(q2);
    }
    return out;
  }

  apply(p: Pose): void {
    if (!this.ok) return;
    for (const d of this.delta.values()) d.identity();
    const set = (name: Name, quat: THREE.Quaternion): void => {
      const b = this.named[name];
      if (b) this.delta.get(b)!.copy(quat);
    };
    const leanAxis = new THREE.Vector3().crossVectors(this.up, this.fwd).normalize();
    const half = (a: number, axis: THREE.Vector3): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(axis, a);
    // The spine bends in two places, half each.
    const spine = half(p.lean / 2, leanAxis).multiply(half(p.side / 2, this.fwd)).multiply(half(p.turn / 2, this.up));
    set('spine', spine);
    set('chest', spine);
    set('head', half(p.nod, leanAxis).multiply(half(p.look, this.up)));
    for (const side of ['L', 'R'] as const) {
      const arm = side === 'L' ? p.armL : p.armR;
      const turn = this.limbTurn(side, arm, new THREE.Quaternion()).multiply(side === 'L' ? this.hangL : this.hangR);
      set(`upper${side}`, turn);
      // The elbow folds the forearm forward and up.
      const bend = side === 'L' ? p.elbowL : p.elbowR;
      const elbowAxis = new THREE.Vector3().crossVectors(this.up.clone().negate(), this.fwd).normalize();
      // In the hanging arm's frame: the rig's forearm rests along the A-pose, so the bend is turned into it.
      const hang = side === 'L' ? this.hangL : this.hangR;
      set(`fore${side}`, hang.clone().invert().multiply(half(bend, elbowAxis)).multiply(hang));
      const leg = side === 'L' ? p.legL : p.legR;
      set(`thigh${side}`, this.limbTurn(side, { swing: leg, out: 0.02, twist: 0 }, new THREE.Quaternion()));
      const knee = side === 'L' ? p.kneeL : p.kneeR;
      set(`calf${side}`, half(-knee, elbowAxis));
    }
    // Down the tree: each bone's turn is carried by everything beneath it.
    const acc = new Map<THREE.Bone, THREE.Quaternion>();
    const world = new Map<THREE.Bone, THREE.Quaternion>();
    for (const bone of this.order) {
      const parent = bone.parent as THREE.Bone;
      const pa = acc.get(parent);
      const a = (pa ? pa.clone() : new THREE.Quaternion()).multiply(this.delta.get(bone)!);
      acc.set(bone, a);
      const w = a.clone().multiply(this.rest.get(bone)!);
      world.set(bone, w);
      const pw = world.get(parent);
      bone.quaternion.copy(pw ? q.copy(pw).invert().multiply(w) : w);
    }
  }
}
