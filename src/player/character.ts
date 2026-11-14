// A character in the world: a rigged model, posed every frame, with a hat on its head and a rod
// (or a ukulele, or a fish) in its hands.
import * as THREE from 'three';
import { fit, model } from '../assets/models';
import * as P from './poses';
import { Rig } from './rig';
import { type Measure, fitFor, placeFor } from './fit';

export type Action = 'idle' | 'walk' | 'sit' | 'hold' | 'castBack' | 'castThrow' | 'reel' | 'show' | 'cheer' | 'wave' | 'dance' | 'clap' | 'uke' | 'row' | 'jump' | 'dig' | 'sweep';

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


export class Character {
  readonly group = new THREE.Group();
  /** The model, turned to face +z. */
  private body: THREE.Object3D | null = null;
  private rig: Rig | null = null;
  private hat: THREE.Object3D | null = null;
  private hatId: string | null = null;
  private extra: THREE.Object3D | null = null;
  private extraId: string | null = null;
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
    if (this.rig.ok) this.faceForward();
    m.rotation.y += this.facing;
  }

  /**
   * Which way a generated character faces is not certain: its rig's left and right may be the
   * viewer's. The face sticks out further than the back of the head (a snout, a beak), so look
   * at the head from both ways and take the side that reaches further as the front; then turn
   * the model so that front is the group's +z, the way the game walks.
   */
  private faceForward(): void {
    const rig = this.rig!;
    const body = this.body!;
    this.group.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const pixels = new Map<THREE.Texture, ImageData | null>();
    /** The colour of the model where a ray hit it: from its texture, or its painted vertices. */
    const colourAt = (hit: THREE.Intersection): [number, number, number] | null => {
      const mesh = hit.object as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial;
      if (mat.map && hit.uv) {
        if (!pixels.has(mat.map)) {
          const img = mat.map.image as CanvasImageSource & { width: number; height: number };
          let data: ImageData | null = null;
          try {
            const c = document.createElement('canvas');
            c.width = Math.min(512, img.width);
            c.height = Math.min(512, img.height);
            const g = c.getContext('2d')!;
            g.drawImage(img, 0, 0, c.width, c.height);
            data = g.getImageData(0, 0, c.width, c.height);
          } catch {
            data = null;
          }
          pixels.set(mat.map, data);
        }
        const d = pixels.get(mat.map);
        if (!d) return null;
        const u = ((hit.uv.x % 1) + 1) % 1;
        const v = mat.map.flipY ? 1 - (((hit.uv.y % 1) + 1) % 1) : ((hit.uv.y % 1) + 1) % 1;
        const i = (Math.floor(v * (d.height - 1)) * d.width + Math.floor(u * (d.width - 1))) * 4;
        return [d.data[i] / 255, d.data[i + 1] / 255, d.data[i + 2] / 255];
      }
      const col = mesh.geometry.getAttribute('color');
      if (col && hit.face) return [col.getX(hit.face.a), col.getY(hit.face.a), col.getZ(hit.face.a)];
      return null;
    };
    /**
     * How face-like one side of the head looks: eyes are the darkest and brightest things on a
     * character, and the back of a head has neither. A snout or beak also reaches further.
     */
    const score = (dir: THREE.Vector3): number => {
      let s = 0;
      let reach = 0;
      const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
      for (let ky = 0.6; ky <= 0.98; ky += 0.04) {
        for (let kx = -0.18; kx <= 0.181; kx += 0.06) {
          const centre = this.group.position.clone().add(new THREE.Vector3(0, this.height * ky, 0)).addScaledVector(side, this.height * kx);
          ray.set(centre.clone().addScaledVector(dir, 4), dir.clone().negate());
          ray.far = 4;
          const hit = ray.intersectObject(body, true)[0];
          if (!hit) continue;
          reach = Math.max(reach, 4 - hit.distance);
          const c = colourAt(hit);
          if (!c) continue;
          const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
          const sat = Math.max(...c) - Math.min(...c);
          if (l < 0.16 || (l > 0.88 && sat < 0.1)) s++;
        }
      }
      return s + reach * 2;
    };
    const f = rig.forwardWorld(1).setY(0).normalize();
    const sign: 1 | -1 = score(f) >= score(f.clone().negate()) ? 1 : -1;
    if (sign < 0) rig.flip();
    const front = rig.forwardWorld(1).setY(0).normalize();
    // Into the group's own frame, then turned to +z.
    const local = front.applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
    body.rotation.y = -Math.atan2(local.x, local.z);
    body.updateMatrixWorld(true);
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

  /** Something worn besides a hat: glasses, a scarf, a bow tie, a backpack, a flower. */
  async setExtra(id: string | null): Promise<void> {
    this.extraId = id;
    if (this.extra) {
      this.extra.parent?.remove(this.extra);
      this.extra = null;
    }
    if (!id) return;
    const m = await model(id);
    if (!m || this.extraId !== id) return;
    this.extra = m;
    this.group.parent?.add(m);
  }

  /**
   * The body, measured in its own frame in a neutral pose, by casting rays at it: where the
   * top of the head is, how wide the head and neck are, where the face and back are.
   */
  private measured: Measure | null = null;
  /** For each bone that carries things: from its neutral place back to the character's frame. */
  private restInv = new Map<THREE.Bone, THREE.Matrix4>();

  private measure(): Measure | null {
    const rig = this.rig;
    const body = this.body;
    if (!rig?.ok || !body) return null;
    if (this.measured) return this.measured;
    rig.apply(P.neutral());
    body.position.y = 0;
    this.group.updateMatrixWorld(true);
    const toWorld = this.group.matrixWorld;
    const toLocal = toWorld.clone().invert();
    const ray = new THREE.Raycaster();
    const h = this.height;
    /** How far along an axis the body reaches from a line through the middle, at a height. */
    const reach = (y: number, dir: THREE.Vector3, along = new THREE.Vector3()): number | null => {
      const from = new THREE.Vector3(along.x, y, along.z).addScaledVector(dir, 3).applyMatrix4(toWorld);
      const d = dir.clone().negate().transformDirection(toWorld);
      ray.set(from, d);
      ray.far = 4;
      const hit = ray.intersectObject(body, true)[0];
      return hit ? hit.point.clone().applyMatrix4(toLocal).dot(dir) : null;
    };
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    // The top of the head: the highest point near the middle.
    let top = 0;
    let topZ = 0;
    for (const z of [-0.08, -0.04, 0, 0.04, 0.08].map((k) => k * h)) {
      const from = new THREE.Vector3(0, h * 2, z).applyMatrix4(toWorld);
      ray.set(from, new THREE.Vector3(0, -1, 0).transformDirection(toWorld));
      ray.far = h * 2;
      const hit = ray.intersectObject(body, true)[0];
      if (hit) {
        const p = hit.point.clone().applyMatrix4(toLocal);
        if (p.y > top) {
          top = p.y;
          topZ = z;
        }
      }
    }
    if (!top) top = h * 0.98;
    const width = (y: number): number => (reach(y, X) ?? h * 0.2) + (reach(y, X.clone().negate()) ?? h * 0.2);
    const front = (y: number): number => reach(y, Z) ?? h * 0.2;
    const back = (y: number): number => -(reach(y, Z.clone().negate()) ?? h * 0.2);
    // The head: from the top, its widest point in the top third of the body is the brow.
    let headW = 0;
    let browY = top - h * 0.18;
    for (let y = top - h * 0.06; y > top - h * 0.38; y -= h * 0.02) {
      const w = width(y);
      if (w > headW) {
        headW = w;
        browY = y;
      }
    }
    const eyeY = Math.min(browY, top - h * 0.2);
    // The neck: the narrowest place below the head and above the shoulders, or where the head ends.
    let neckY = top - h * 0.48;
    let neckW = Infinity;
    for (let y = browY - h * 0.1; y > h * 0.3; y -= h * 0.02) {
      const w = width(y);
      if (w < neckW - 0.002) {
        neckW = w;
        neckY = y;
      }
    }
    if (!Number.isFinite(neckW)) neckW = headW * 0.8;
    const backY = Math.max(h * 0.3, neckY - h * 0.16);
    const profile: Measure['profile'] = [];
    for (let y = Math.max(h * 0.25, neckY - h * 0.1); y <= top; y += h * 0.02) profile.push({ y, w: width(y), front: front(y), back: back(y) });
    this.measured = {
      height: h,
      top,
      headZ: (front(browY) + back(browY)) / 2 || topZ,
      headW,
      eyeY,
      faceZ: front(eyeY),
      neckY,
      neckW: Math.max(neckW, headW * 0.6),
      neckFront: front(neckY),
      chestY: neckY - h * 0.05,
      chestFront: front(neckY - h * 0.05),
      backY,
      backZ: back(backY),
      backW: width(backY),
      earY: top - h * 0.08,
      earX: -(reach(top - h * 0.08, X.clone().negate()) ?? headW / 2) * 0.85,
      profile,
    };
    // Where the bones are in this pose, so things worn follow them from here.
    for (const bone of [rig.headBone, rig.chestBone]) {
      if (bone) this.restInv.set(bone, toLocal.clone().multiply(bone.matrixWorld).invert());
    }
    return this.measured;
  }

  /**
   * A hat's crown: how wide the model is a little above the brim, and where its middle is (a peak
   * or flaps pull the bounding box off centre). The triangles are cut at a few heights, so a model
   * with few vertices there still gives a true outline.
   */
  private static crown(obj: THREE.Object3D): { w: number; cx: number; cz: number } | undefined {
    obj.updateMatrixWorld(true);
    const inv = obj.matrixWorld.clone().invert();
    const tris: THREE.Vector3[][] = [];
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      const idx = mesh.geometry.getIndex();
      const toObj = inv.clone().multiply(mesh.matrixWorld);
      const v = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(toObj);
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) tris.push(idx ? [v(idx.getX(i)), v(idx.getX(i + 1)), v(idx.getX(i + 2))] : [v(i), v(i + 1), v(i + 2)]);
    });
    if (!tris.length) return undefined;
    let lo = Infinity;
    let hi = -Infinity;
    for (const t of tris) for (const p of t) {
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
    }
    let best: { w: number; cx: number; cz: number } | undefined;
    for (const k of [0.3, 0.38, 0.46]) {
      const y = lo + (hi - lo) * k;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const t of tris) {
        for (let e = 0; e < 3; e++) {
          const a = t[e];
          const b = t[(e + 1) % 3];
          if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
          const u = (y - a.y) / (b.y - a.y);
          const x = a.x + (b.x - a.x) * u;
          const z = a.z + (b.z - a.z) * u;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          z0 = Math.min(z0, z);
          z1 = Math.max(z1, z);
        }
      }
      if (!Number.isFinite(x0)) continue;
      // The narrower way across: a peak, flaps or horns stick out the other way.
      const w = Math.min(x1 - x0, z1 - z0);
      // The slice nearest the head's size wins: the narrowest that is still a real crown.
      if (!best || w < best.w) best = { w, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
    }
    return best;
  }

  /** Where a worn thing goes in the character's frame, as a matrix, worked out once. */
  private fitMatrix(obj: THREE.Object3D, id: string): { bone: THREE.Bone; local: THREE.Matrix4 } | null {
    const fit = fitFor(id, this.id);
    const m = this.measure();
    const rig = this.rig;
    if (!fit || !m || !rig) return null;
    const bone = fit.bone === 'head' ? rig.headBone : rig.chestBone;
    if (!bone) return null;
    const size = (obj.userData.size as THREE.Vector3) ?? new THREE.Vector3(1, 1, 1);
    const crown = fit.place === 'crown' && !fit.whole ? Character.crown(obj) : undefined;
    const wide = Math.max(size.x, size.z);
    // Never trust a crown narrower than a third of the hat: something went wrong measuring it.
    const cw = crown && crown.w > wide * 0.33 ? crown.w : undefined;
    const p = placeFor(fit, m, { x: size.x, y: size.y, z: size.z, crown: cw });
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -p.tilt);
    if (p.turn) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.turn));
    if (p.backwards) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    // Centre the crown itself, not the hat's bounding box, over the head.
    const shift = crown && cw ? new THREE.Vector3(-crown.cx, 0, -crown.cz).multiplyScalar(p.scale).applyQuaternion(q) : new THREE.Vector3();
    const local = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z).add(shift), q, new THREE.Vector3(p.scale, p.scale, p.scale));
    return { bone, local };
  }

  /** Put a worn thing where it goes, following its bone. */
  private wear(obj: THREE.Object3D | null, id: string | null): void {
    if (!obj || !id) return;
    if (!obj.userData.fit) {
      const f = this.fitMatrix(obj, id);
      if (!f) return;
      obj.userData.fit = f;
      obj.matrixAutoUpdate = false;
    }
    const { bone, local } = obj.userData.fit as { bone: THREE.Bone; local: THREE.Matrix4 };
    const restInv = this.restInv.get(bone);
    if (!restInv) return;
    obj.matrix.copy(bone.matrixWorld).multiply(restInv).multiply(local);
    obj.matrixWorldNeedsUpdate = true;
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
      case 'jump':
        return P.jump(t);
      case 'dig':
        return P.dig(t);
      case 'sweep':
        return P.sweep(t);
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
    const quick = this.action === 'walk' || this.action === 'jump' || this.action === 'castThrow' || this.action === 'castBack' ? 18 : 9;
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
      this.rod.visible = this.rodOut && this.action !== 'uke' && this.action !== 'show' && this.action !== 'row' && this.action !== 'sit' && !['wave', 'dance', 'clap', 'cheer', 'dig', 'sweep'].includes(this.action);
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
    if (this.hat && this.rig?.ok) this.wear(this.hat, this.hatId);
    else if (this.hat) {
      this.hat.position.copy(base).addScaledVector(up, h * 0.86);
      this.hat.quaternion.copy(this.group.quaternion);
    }
    if (this.extra && this.rig?.ok) this.wear(this.extra, this.extraId);
    if (this.held) {
      const l = this.rig?.handL?.getWorldPosition(new THREE.Vector3()) ?? this.handPos;
      const mid = this.handPos.clone().add(l).multiplyScalar(0.5);
      if (this.heldId === 'detector') {
        this.held.position.copy(this.handPos).addScaledVector(up, -0.05);
        this.held.quaternion.copy(this.group.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5));
        this.held.position.addScaledVector(fwd, 0.25).addScaledVector(up, -0.15);
      } else if (this.action === 'uke') {
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
    for (const o of [this.rod, this.hat, this.held, this.extra]) o?.parent?.remove(o);
    this.group.parent?.remove(this.group);
  }

  get rigged(): boolean {
    return !!this.rig?.ok;
  }
}
