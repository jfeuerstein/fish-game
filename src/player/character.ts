// A character in the world: a rigged model, posed every frame, with a hat on its head and a rod
// (or a ukulele, or a fish) in its hands.
import * as THREE from 'three';
import { fit, model } from '../assets/models';
import * as P from './poses';
import { Rig } from './rig';

export type Action = 'idle' | 'walk' | 'sit' | 'hold' | 'castBack' | 'castThrow' | 'reel' | 'show' | 'cheer' | 'wave' | 'dance' | 'clap' | 'uke' | 'row';

/** Turn a long thin model (a rod) so it lies along +y with its heavier end (the reel and handle) at the origin. */
export function alongY(root: THREE.Object3D, length: number): THREE.Object3D {
  root.updateMatrixWorld(true);
  const pts: THREE.Vector3[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute('position');
    const step = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  });
  const mean = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, pts.length));
  // The longest direction by power iteration on the spread of the points.
  let dir = new THREE.Vector3(1, 1, 1).normalize();
  for (let it = 0; it < 30; it++) {
    const next = new THREE.Vector3();
    for (const p of pts) {
      const d = p.clone().sub(mean);
      next.addScaledVector(d, d.dot(dir));
    }
    dir = next.normalize();
  }
  // Which end is heavier (has more of the points beyond a third of the way).
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pts) {
    const t = p.clone().sub(mean).dot(dir);
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  let near = 0;
  let far = 0;
  for (const p of pts) {
    const t = (p.clone().sub(mean).dot(dir) - lo) / (hi - lo);
    if (t < 0.3) near++;
    if (t > 0.7) far++;
  }
  if (far > near) {
    dir.negate();
    [lo, hi] = [-hi, -lo];
  }
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(root);
  inner.quaternion.setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0));
  const s = length / (hi - lo || 1);
  inner.scale.setScalar(s);
  // Put the handle end at the origin.
  const start = mean.clone().addScaledVector(dir, lo).applyQuaternion(inner.quaternion).multiplyScalar(s);
  inner.position.copy(start).negate();
  holder.add(inner);
  return holder;
}

const tmp = new THREE.Vector3();

export class Character {
  readonly group = new THREE.Group();
  /** The model, turned to face +z. */
  private body: THREE.Object3D | null = null;
  private rig: Rig | null = null;
  private hat: THREE.Object3D | null = null;
  private hatId: string | null = null;
  private held: THREE.Object3D | null = null;
  private heldId: string | null = null;
  private height: number;
  action: Action = 'idle';
  /** For walking: 0 standing to 1 running. */
  speed = 0;
  /** For casting and reeling: wind-up power, throw progress, line strain. */
  power = 0;
  strain = 0;
  pluck = 0;
  private phase = 0;
  private t = Math.random() * 10;
  private pose: P.Pose = P.neutral();
  /** Whether the rod is out. */
  rodOut = true;
  readonly rodTip = new THREE.Vector3();
  /** Where the hands are, in the world. */
  readonly handPos = new THREE.Vector3();
  private rod: THREE.Object3D | null = null;
  private rodId = '';
  private rodLen = 1.5;
  /** How the model must be turned so it faces +z. */
  private facing = 0;

  constructor(readonly id: string, height = 1.1) {
    this.height = height;
  }

  async load(): Promise<void> {
    const m = await model(this.id, this.height);
    if (!m) {
      // A stand-in so the game still plays without the model.
      const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), new THREE.MeshLambertMaterial({ color: 0xc9925a }));
      g.position.y = 0.55;
      g.castShadow = true;
      this.group.add(g);
      return;
    }
    this.body = m;
    this.rig = new Rig(m);
    this.group.add(m);
    m.rotation.y = this.facing;
  }

  /** Turn the model by this much so that its front is +z (set when the rig is found to face the other way). */
  setFacing(yaw: number): void {
    this.facing = yaw;
    if (this.body) this.body.rotation.y = yaw;
  }

  async setRod(id: string): Promise<void> {
    if (this.rodId === id) return;
    this.rodId = id;
    const m = await model(id);
    if (this.rodId !== id) return;
    if (this.rod) this.group.parent?.remove(this.rod);
    if (!m) return;
    this.rod = alongY(m, this.rodLen);
    this.rod.visible = this.rodOut;
    this.group.parent?.add(this.rod);
  }

  async setHat(id: string | null): Promise<void> {
    this.hatId = id;
    if (this.hat) {
      this.hat.parent?.remove(this.hat);
      this.hat = null;
    }
    if (!id) return;
    const m = await model(id);
    if (!m || this.hatId !== id) return;
    this.hat = m;
    this.group.parent?.add(m);
  }

  /** Something held in the hands: a ukulele, or the fish just caught. */
  async hold(id: string | null, length = 0.5): Promise<void> {
    this.heldId = id;
    if (this.held) {
      this.held.parent?.remove(this.held);
      this.held = null;
    }
    if (!id) return;
    const m = await model(id);
    if (!m || this.heldId !== id) return;
    const wrapped = fit(m, length, true);
    this.held = wrapped;
    this.group.parent?.add(wrapped);
  }

  private targetPose(): P.Pose {
    const t = this.t;
    switch (this.action) {
      case 'walk':
        return P.walk(this.phase, this.speed);
      case 'sit':
        return P.sit(t);
      case 'hold':
        return P.holdRod(t);
      case 'castBack':
        return P.castBack(this.power);
      case 'castThrow':
        return P.castThrow(this.power);
      case 'reel':
        return P.reel(t, this.strain);
      case 'show':
        return P.showOff(t);
      case 'cheer':
        return P.cheer(t);
      case 'wave':
        return P.wave(t);
      case 'dance':
        return P.dance(t);
      case 'clap':
        return P.clap(t);
      case 'uke':
        return P.uke(t, this.pluck);
      case 'row':
        return P.row(t, this.speed);
      default:
        return P.idle(t);
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (this.action === 'walk') this.phase = (this.phase + dt * (1.5 + this.speed * 1.4)) % 1;
    this.pluck = Math.max(0, this.pluck - dt * 3);
    const target = this.targetPose();
    // Ease toward the pose; quick for snappy actions.
    const quick = this.action === 'walk' || this.action === 'castThrow' || this.action === 'castBack' ? 18 : 9;
    this.pose = P.blend(this.pose, target, 1 - Math.exp(-dt * quick));
    if (this.rig?.ok) this.rig.apply(this.pose);
    if (this.body) this.body.position.y = this.pose.bob * this.height;
    this.group.updateMatrixWorld(true);
    this.placeHeld();
  }

  /** The character's own axes in the world. */
  private axes(): { fwd: THREE.Vector3; up: THREE.Vector3; right: THREE.Vector3 } {
    const yaw = this.group.rotation.y;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    return { fwd, up, right };
  }

  private placeHeld(): void {
    const { fwd, up, right } = this.axes();
    const base = this.group.position;
    const h = this.height;
    const hand = this.rig?.handR;
    if (hand) hand.getWorldPosition(this.handPos);
    else this.handPos.copy(base).addScaledVector(up, h * 0.5).addScaledVector(fwd, 0.25).addScaledVector(right, 0.25);
    // The rod's angle depends on what the character is doing.
    if (this.rod) {
      this.rod.visible = this.rodOut && this.action !== 'uke' && this.action !== 'show' && this.action !== 'row' && this.action !== 'sit' && !['wave', 'dance', 'clap', 'cheer'].includes(this.action);
      let pitch = 0.95; // up from forward
      if (this.action === 'castBack') pitch = 1.3 + this.power * 1.25;
      else if (this.action === 'castThrow') pitch = 2.55 - Math.min(1, this.power * 1.3) * 2.15;
      else if (this.action === 'reel') pitch = 0.75 + this.strain * 0.35;
      else if (this.action === 'walk') pitch = 1.25;
      const dir = fwd.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).addScaledVector(right, 0.12).normalize();
      this.rod.position.copy(this.handPos);
      this.rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.rodTip.copy(this.handPos).addScaledVector(dir, this.rodLen);
    } else this.rodTip.copy(this.handPos).addScaledVector(up, 1);
    if (this.hat && this.rig?.headBone) {
      // On top of the head, following its nods.
      const head = this.rig.headBone;
      head.getWorldPosition(tmp);
      const q = head.getWorldQuaternion(new THREE.Quaternion());
      if (!this.hat.userData.offset) {
        // Measured once, in the pose the character is standing in: from the head bone to the top of the head.
        const top = base.clone().addScaledVector(up, h * 0.86);
        const inv = q.clone().invert();
        this.hat.userData.offset = top.sub(tmp).applyQuaternion(inv);
        this.hat.userData.turn = inv.multiply(this.group.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(up, 0)));
      }
      this.hat.position.copy(tmp).add((this.hat.userData.offset as THREE.Vector3).clone().applyQuaternion(q));
      this.hat.quaternion.copy(q).multiply(this.hat.userData.turn as THREE.Quaternion);
      this.hat.scale.setScalar(h / 1.1);
    } else if (this.hat) {
      this.hat.position.copy(base).addScaledVector(up, h * 0.86);
      this.hat.quaternion.copy(this.group.quaternion);
    }
    if (this.held) {
      const l = this.rig?.handL?.getWorldPosition(new THREE.Vector3()) ?? this.handPos;
      const mid = this.handPos.clone().add(l).multiplyScalar(0.5);
      if (this.action === 'uke') {
        this.held.position.copy(base).addScaledVector(up, h * 0.42).addScaledVector(fwd, 0.28);
        this.held.quaternion.setFromAxisAngle(fwd, 1.1).multiply(this.group.quaternion);
      } else {
        // A fish held up high over the head, lying across, so it is seen side on from behind.
        this.held.position.copy(base).addScaledVector(up, h * 1.02 + Math.abs(Math.sin(this.t * 6)) * 0.04).addScaledVector(fwd, 0.05);
        this.held.quaternion.copy(this.group.quaternion);
        void mid;
      }
    }
  }

  /** Remove from the scene, with everything it was holding. */
  dispose(): void {
    for (const o of [this.rod, this.hat, this.held]) o?.parent?.remove(o);
    this.group.parent?.remove(this.group);
  }

  get rigged(): boolean {
    return !!this.rig?.ok;
  }
}
