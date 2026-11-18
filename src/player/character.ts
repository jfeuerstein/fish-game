// A character in the world: a rigged model, posed every frame, with a hat on its head and a rod
// (or a ukulele, or a fish) in its hands.
import * as THREE from 'three';
import { fit, model } from '../assets/models';
import * as P from './poses';
import { Rig } from './rig';
import { type Look, poseDue } from '../look/look';
import { FIDGETS, Gaze, fidgetAt, lookToward } from './gaze';
import { lit, pixelled } from '../look/material';
import { INK } from '../look/inks';
import { DARK_FUR, EXPRESSIONS, type Expression, GUESS, type PaintedEye, blinking, eyeHeight, eyeShader, faceFor, readEyes } from './face';
import { lieOf } from './long';
import { type Cut, type HatShape, type Head, type Measure, fitFor, hatFor, headOf, measureHat, placeHat, placeFor } from './fit';

/** Draw each skull's ellipsoid (`socket=1` in the address), to tune HEADS by eye. */
const SOCKETS = typeof location !== 'undefined' && new URLSearchParams(location.search).get('socket') === '1';

export type Action = 'idle' | 'walk' | 'sit' | 'hold' | 'castBack' | 'castThrow' | 'reel' | 'show' | 'cheer' | 'wave' | 'dance' | 'clap' | 'uke' | 'row' | 'jump' | 'dig' | 'sweep' | 'flop' | 'spin' | 'honk' | 'slap' | 'stretch' | 'skip' | 'warm' | 'lean' | 'skate' | 'pogo' | 'float';

/** Turn a long thin model (a rod) so it lies along +y with its handle (the grip and the reel) at the origin. */
export function alongY(root: THREE.Object3D, length: number): THREE.Object3D {
  root.updateMatrixWorld(true);
  // Every triangle, where it is in the world: which end is held is a matter of surface (src/player/long.ts).
  const tris: number[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute('position');
    const index = m.geometry.getIndex();
    const count = index ? index.count : pos.count;
    for (let i = 0; i + 2 < count; i += 3)
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(pos, index ? index.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
        tris.push(v.x, v.y, v.z);
      }
  });
  const lie = lieOf(tris);
  const mean = new THREE.Vector3(...lie.mean);
  const dir = new THREE.Vector3(...lie.dir);
  const { lo, hi } = lie;
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


const EYE_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec2 at;
attribute float side;
varying vec2 vAt;
varying float vSide;
void main() {
  vAt = at;
  vSide = side;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const EYE_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
${eyeShader}
void main() {
  vec4 c = eyeColour();
  if (c.a < 0.5) discard;
  gl_FragColor = vec4(c.rgb, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

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
  /** Rowing: where the boat's oars are in their stroke, which the arms and the back go with. */
  stroke = 0;
  /** For casting and reeling: wind-up power, throw progress, line strain. */
  power = 0;
  strain = 0;
  pluck = 0;
  private phase = 0;
  private t = Math.random() * 10;
  private pose: P.Pose = P.neutral();
  /** How far tipped over for a flop (0 to 1), and how far turned in a twirl. */
  private tip = 0;
  private baseYaw = 0;
  private twirl = 0;
  /** The game's look: in the lo-fi one a pose is held for a few frames, as a toy is moved by hand. */
  static look: Look | null = null;
  private sincePose = Math.random() * 0.08;
  private posedAs: Action | null = null;
  /** The drawn eyes: one small mesh hung on the head's bone, and the material that draws their shape. */
  private faceMaterial: THREE.ShaderMaterial | null = null;
  private faceSeed = Math.floor(Math.random() * 1000);
  private faceNow: Expression | null = null;
  private facePut: { face: Expression; until: number } | null = null;
  /** Whether anyone is given eyes (`eyes=0` in the address goes without). */
  static eyes = true;
  /** Someone to keep an eye on as they go by (the player, for an islander). */
  watching: THREE.Vector3 | null = null;
  /** Whether this character fidgets when it has nothing to do (islanders do; the player is busy). */
  fidgets = false;
  private gaze = new Gaze();
  /** Everyone's heads, much bigger (a setting). */
  static bigHeads = false;
  /** Whether the rod is out. */
  rodOut = true;
  readonly rodTip = new THREE.Vector3();
  /** Where the hands are, in the world. */
  readonly handPos = new THREE.Vector3();
  private rod: THREE.Object3D | null = null;
  /** How the rod is dressed: the colour it is painted (or null), and the charm hung from it. */
  private rodPaint: number | null = null;
  private rodGlows = false;
  private charmId: string | null = null;
  private charm: THREE.Sprite | null = null;
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
      const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), lit({ color: 0xa97c52 }));
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
    this.baseYaw = m.rotation.y;
    if (this.rig.ok && Character.eyes) this.drawFace();
  }

  /** Wear an expression for a moment, whatever the body is doing (a bite, being honked at). */
  express(face: Expression, seconds: number): void {
    this.facePut = { face, until: this.t + seconds };
  }

  /**
   * Draw the eyes on the head, where the model's own painted ones were (its file says where:
   * see face.ts). Each eye is a small square of mesh laid over the head and pressed onto it: a
   * ray is cast at the head for every corner of its grid, so it follows the head's shape like
   * paint, and it is hung on the head's bone, so it goes wherever the head does.
   */
  private drawFace(): void {
    const body = this.body;
    const head = this.rig?.headBone;
    const m = this.measure();
    if (!body || !head || !m) return;
    const h = this.height;
    this.group.updateMatrixWorld(true);
    const toWorld = this.group.matrixWorld;
    const toLocal = toWorld.clone().invert();
    const ray = new THREE.Raycaster();
    let painted: [PaintedEye, PaintedEye] | null = null;
    body.traverse((o) => {
      painted ??= readEyes(o.userData.eyes);
    });
    const spots: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    let size = GUESS.size * h;
    let onDark = false;
    if (painted) {
      const [a, b] = painted as [PaintedEye, PaintedEye];
      const scale = new THREE.Vector3().setFromMatrixScale(head.matrixWorld).x;
      size = eyeHeight(((a.r + b.r) / 2) * scale, h);
      onDark = Math.min(a.on, b.on) < DARK_FUR;
      // The two look out the same way, mirrored: each takes the other's direction into account.
      const na = new THREE.Vector3(...a.n).add(new THREE.Vector3(-b.n[0], b.n[1], b.n[2])).normalize();
      const nb = new THREE.Vector3(-na.x, na.y, na.z);
      for (const [eye, n] of [[a, na], [b, nb]] as const) spots.push({ at: new THREE.Vector3(...eye.p).applyMatrix4(head.matrixWorld), dir: n.clone().transformDirection(head.matrixWorld) });
    } else {
      // None painted: either side of straight ahead, at a likely height, wherever the head's surface is.
      for (const side of [1, -1]) {
        const dir = new THREE.Vector3(Math.sin(GUESS.az) * side, 0, Math.cos(GUESS.az));
        const from = new THREE.Vector3(0, GUESS.y * h, m.headZ).addScaledVector(dir, 3).applyMatrix4(toWorld);
        const out = dir.clone().transformDirection(toWorld);
        ray.set(from, out.clone().negate());
        ray.far = 3;
        // The last surface met on the way in, so a brim or an ear in front of the eye is passed through.
        const hit = ray.intersectObject(body, true).pop();
        if (hit) spots.push({ at: hit.point.clone(), dir: out });
      }
    }
    if (!spots.length) return;
    // A grid over each eye, a little bigger than the eye.
    const N = 4;
    const SPAN = 1.1;
    const start = 0.07 * h;
    const lift = 0.007 * h;
    const pos: number[] = [];
    const at: number[] = [];
    const sides: number[] = [];
    const idx: number[] = [];
    const headInv = head.matrixWorld.clone().invert();
    const worldUp = new THREE.Vector3(0, 1, 0);
    for (const spot of spots) {
      const dir = spot.dir;
      const right = new THREE.Vector3().crossVectors(worldUp, dir).normalize();
      const up = new THREE.Vector3().crossVectors(dir, right).normalize();
      const side = spot.at.clone().applyMatrix4(toLocal).x >= 0 ? 1 : -1;
      /** How far in from the eye's own plane the head's surface is, under a point of the grid. */
      const depth = (u: number, v: number): number | null => {
        const p = spot.at.clone().addScaledVector(right, u * size).addScaledVector(up, v * size);
        ray.set(p.addScaledVector(dir, start), dir.clone().negate());
        ray.far = start + 0.6 * size;
        const hit = ray.intersectObject(body, true)[0];
        return hit ? hit.distance - start : null;
      };
      const middle = depth(0, 0) ?? 0;
      const first = pos.length / 3;
      for (let j = 0; j <= N; j++)
        for (let i = 0; i <= N; i++) {
          const u = (i / N - 0.5) * SPAN;
          const v = (j / N - 0.5) * SPAN;
          // Kept near the middle's depth, so an eye at the edge of a bump does not fall off it.
          const d = Math.min(middle + 0.45 * size, Math.max(middle - 0.3 * size, depth(u, v) ?? middle));
          const p = spot.at.clone().addScaledVector(right, u * size).addScaledVector(up, v * size).addScaledVector(dir, lift - d).applyMatrix4(headInv);
          pos.push(p.x, p.y, p.z);
          at.push(u, v);
          sides.push(side);
        }
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const o = first + j * (N + 1) + i;
          idx.push(o, o + 1, o + N + 2, o, o + N + 2, o + N + 1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('at', new THREE.Float32BufferAttribute(at, 2));
    geo.setAttribute('side', new THREE.Float32BufferAttribute(sides, 1));
    geo.setIndex(idx);
    this.faceMaterial = new THREE.ShaderMaterial({
      vertexShader: EYE_VERTEX,
      fragmentShader: EYE_FRAGMENT,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uFace: { value: 0 }, uOnDark: { value: onDark ? 1 : 0 }, uInk: { value: new THREE.Color(INK.dark) }, uPale: { value: new THREE.Color(INK.pale) }, uSoft: { value: new THREE.Color(INK.soft) } }]),
    });
    const mesh = new THREE.Mesh(geo, this.faceMaterial);
    mesh.frustumCulled = false;
    mesh.name = 'eyes';
    head.add(mesh);
  }

  /** Show on the face what the character feels. */
  private showFace(): void {
    if (!this.faceMaterial) return;
    if (this.facePut && this.facePut.until < this.t) this.facePut = null;
    let face = this.facePut?.face ?? faceFor(this.action);
    if ((face === 'open' || face === 'wide') && !this.facePut && blinking(this.t, this.faceSeed)) face = 'closed';
    if (face !== this.faceNow) {
      this.faceNow = face;
      this.faceMaterial.uniforms.uFace.value = EXPRESSIONS.indexOf(face);
    }
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
    this.baseYaw = yaw;
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
    this.paintRod();
  }

  /** Paint the rod a colour (null for its own) and hang a charm from it (null for none). */
  setRodLook(paint: number | null, charm: string | null, glows = false): void {
    this.rodPaint = paint;
    this.rodGlows = glows;
    this.paintRod();
    if (charm === this.charmId) return;
    this.charmId = charm;
    if (this.charm) {
      this.charm.parent?.remove(this.charm);
      this.charm.material.map?.dispose();
      this.charm.material.dispose();
      this.charm = null;
    }
    if (!charm) return;
    const map = pixelled(new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}icons/${charm}.webp`));
    map.colorSpace = THREE.SRGBColorSpace;
    this.charm = new THREE.Sprite(new THREE.SpriteMaterial({ map, alphaTest: 0.5 }));
    this.charm.scale.set(0.26, 0.26, 1);
    this.group.parent?.add(this.charm);
  }

  /** The rod's own colours, multiplied by its paint. Its materials are its own copies, so no other rod is painted. */
  private paintRod(): void {
    this.rod?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.userData.painted) {
        mesh.material = (mesh.material as THREE.Material).clone();
        mesh.userData.painted = true;
      }
      (mesh.material as THREE.MeshToonMaterial).color.set(this.rodPaint ?? 0xffffff);
      // A paint that glows gives off its own colour, so the rod shows in the dark.
      (mesh.material as THREE.MeshToonMaterial).emissive.set(this.rodGlows && this.rodPaint !== null ? this.rodPaint : 0x000000).multiplyScalar(0.55);
    });
  }

  /** Into another scene (a room, and back out), with everything worn and held. */
  moveTo(parent: THREE.Object3D): void {
    parent.add(this.group);
    for (const o of [this.rod, this.hat, this.held, this.extra, this.charm]) if (o) parent.add(o);
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
    rig.headBone?.scale.setScalar(1);
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
    // The head bone starts where the neck is: a better guide than the narrowest slice, which on a
    // round-faced character can be the chin.
    if (rig.headBone) {
      const at = rig.headBone.getWorldPosition(new THREE.Vector3()).applyMatrix4(toLocal);
      if (at.y > h * 0.3 && at.y < browY) {
        // On these chunky rigs the head bone sits about the jaw; the neck is a little below it.
        neckY = at.y - h * 0.06;
        neckW = width(neckY);
      }
    }
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
   * A hat, measured from slices of its triangles at heights through it (see measureHat): so a
   * model with few vertices at some height still gives its true outline there.
   */
  private static hatShape(obj: THREE.Object3D): HatShape {
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
    let lo = Infinity;
    let hi = -Infinity;
    for (const t of tris) for (const p of t) {
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
    }
    const size = (obj.userData.size as THREE.Vector3) ?? new THREE.Vector3(1, hi - lo, 1);
    return measureHat({ x: size.x, y: hi - lo, z: size.z }, (k) => {
      const y = lo + (hi - lo) * k;
      const cut: Cut = [];
      for (const t of tris) {
        const pts: number[] = [];
        for (let e = 0; e < 3; e++) {
          const a = t[e];
          const b = t[(e + 1) % 3];
          if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
          const u = (y - a.y) / (b.y - a.y);
          pts.push(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u);
        }
        if (pts.length >= 4) cut.push([pts[0], pts[1], pts[2], pts[3]]);
      }
      return cut;
    });
  }

  /** The skull this character's hats sit on: from HEADS, or guessed from the measured body. */
  private head(): Head | null {
    const known = headOf(this.id, this.height);
    if (known) return known;
    const m = this.measure();
    if (!m) return null;
    const ry = (m.top - m.eyeY) * 1.1;
    return { y: m.top - ry, z: m.headZ, rx: m.headW / 2, ry, rz: m.headW / 2 };
  }

  /** Where a worn thing goes in the character's frame, as a matrix, worked out once. */
  private fitMatrix(obj: THREE.Object3D, id: string): { bone: THREE.Bone; local: THREE.Matrix4 } | null {
    const m = this.measure();
    const rig = this.rig;
    if (!m || !rig) return null;
    const hatFit = hatFor(id, this.id);
    if (hatFit) {
      const head = this.head();
      if (!head || !rig.headBone) return null;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -(hatFit.tilt ?? 0));
      if (hatFit.turn) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hatFit.turn));
      // Measured turned, so its opening is read the way it will face.
      const probe = new THREE.Group();
      const inner = obj.clone(true);
      inner.quaternion.premultiply(q);
      probe.add(inner);
      probe.userData.size = obj.userData.size;
      const shape = Character.hatShape(probe);
      const p = placeHat(hatFit, head, shape);
      // The lowest point of the model is at its origin (models stand on y = 0); centre its opening over the skull.
      const shift = new THREE.Vector3(-shape.cx * p.scale, 0, -shape.cz * p.scale);
      const local = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z).add(shift), q, new THREE.Vector3(p.scale, p.scale, p.scale));
      return { bone: rig.headBone, local };
    }
    const fit = fitFor(id, this.id);
    if (!fit) return null;
    const bone = fit.bone === 'head' ? rig.headBone : rig.chestBone;
    if (!bone) return null;
    const size = (obj.userData.size as THREE.Vector3) ?? new THREE.Vector3(1, 1, 1);
    // Turned a quarter, its width and depth trade places.
    const quarter = Math.abs(Math.sin(fit.turn ?? 0)) > 0.7;
    const p = placeFor(fit, m, quarter ? { x: size.z, y: size.y, z: size.x } : { x: size.x, y: size.y, z: size.z });
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -p.tilt);
    if (p.turn) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.turn));
    if (p.backwards) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    const local = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.scale, p.scale, p.scale));
    return { bone, local };
  }

  /** The skull drawn as a see-through ellipsoid, for tuning HEADS (`socket=1`). */
  private socket: THREE.Mesh | null = null;
  private showSocket(): void {
    const head = this.head();
    const rig = this.rig;
    if (!head || !rig?.headBone) return;
    if (!this.socket) {
      this.socket = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff2266, wireframe: true, depthTest: false, transparent: true, opacity: 0.55 }));
      this.socket.matrixAutoUpdate = false;
      this.group.parent?.add(this.socket);
      this.socket.userData.fit = { bone: rig.headBone, local: new THREE.Matrix4().compose(new THREE.Vector3(0, head.y, head.z), new THREE.Quaternion(), new THREE.Vector3(head.rx, head.ry, head.rz)) };
    }
    const { bone, local } = this.socket.userData.fit as { bone: THREE.Bone; local: THREE.Matrix4 };
    const restInv = this.restInv.get(bone);
    if (!restInv) return;
    this.socket.matrix.copy(bone.matrixWorld).multiply(restInv).multiply(local);
    this.socket.matrixWorldNeedsUpdate = true;
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
    // In the lo-fi look a fish is held up as its picture, the one the journal has, on a flat
    // card: the island's things are solid and its fish are drawings.
    if (id.startsWith('fish-') && Character.look?.lofi) {
      const side = length * 1.15;
      const map = pixelled(new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}icons/${id}.webp`));
      map.colorSpace = THREE.SRGBColorSpace;
      const paper = lit({ map }) as THREE.MeshToonMaterial;
      paper.alphaTest = 0.5;
      paper.side = THREE.DoubleSide;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(side, side).translate(0, side * 0.38, 0), paper);
      card.castShadow = true;
      const holder = new THREE.Group();
      holder.add(card);
      this.held = holder;
      this.group.parent?.add(holder);
      return;
    }
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
        return P.row(t, this.speed, this.stroke);
      case 'jump':
        return P.jump(t);
      case 'dig':
        return P.dig(t);
      case 'sweep':
        return P.sweep(t);
      case 'flop':
        return P.flop(t);
      case 'spin':
        return P.spin(t);
      case 'honk':
        return P.honk(t);
      case 'slap':
        return P.slap(t);
      case 'stretch':
        return P.stretch(t);
      case 'skip':
        return P.skipStone(Math.min(1, this.power));
      case 'warm':
        return P.warm(t);
      case 'lean':
        return P.leanOn(t);
      case 'skate':
        return P.skate(t, this.speed, this.strain, this.power);
      case 'pogo':
        return P.pogo(t, this.power);
      case 'float':
        return P.float(t);
      default:
        return P.idle(t);
    }
  }

  update(dt: number): void {
    this.t += dt;
    const phaseThen = this.phase;
    if (this.action === 'walk') this.phase = (this.phase + dt * (1.5 + this.speed * 1.4)) % 1;
    this.pluck = Math.max(0, this.pluck - dt * 3);
    // The pose is changed every frame, or (lo-fi) a few times a second and at once on a new action.
    this.sincePose += dt;
    const look = Character.look;
    const due = !look || this.posedAs !== this.action || poseDue(look, this.sincePose, this.action === 'walk', phaseThen, this.phase);
    if (due) this.repose(this.sincePose);
    this.group.updateMatrixWorld(true);
    this.placeHeld();
  }

  /** While standing about: a fidget now and then, and the head turned to whoever is being watched. */
  private idling(p: P.Pose, dt: number): void {
    const still = this.action === 'idle' || this.action === 'hold';
    const from = this.group.position;
    const toward = this.watching && (still || this.action === 'walk' || this.action === 'reel') ? lookToward(this.group.rotation.y, this.watching.x - from.x, this.watching.z - from.z) : null;
    const look = this.gaze.update(dt, toward);
    const f = this.fidgets && still && look === null ? fidgetAt(this.t, this.faceSeed) : null;
    if (f) {
      P.fidget(p, f.kind, f.k);
      // A yawn shuts the eyes.
      if (f.kind === FIDGETS[3]) this.express('closed', 0.2);
    }
    if (look !== null) {
      p.look = look;
      // Looking over a shoulder, the shoulders come round a little too.
      p.turn += look * 0.18;
    }
  }

  /** Move the body on toward the pose it is after, by `dt` seconds' worth. */
  private repose(dt: number): void {
    this.sincePose = 0;
    this.posedAs = this.action;
    const target = this.targetPose();
    this.idling(target, dt);
    // Ease toward the pose; quick for snappy actions.
    const quick = this.action === 'walk' || this.action === 'jump' || this.action === 'castThrow' || this.action === 'castBack' ? 18 : 9;
    this.pose = P.blend(this.pose, target, 1 - Math.exp(-dt * quick));
    if (this.rig?.ok) this.rig.apply(this.pose);
    if (this.rig?.headBone) this.rig.headBone.scale.setScalar(Character.bigHeads ? 1.65 : 1);
    if (this.body) {
      this.body.position.y = this.pose.bob * this.height;
      // A flop tips the whole body onto its belly, rocking; a spin turns it round and round.
      const flopping = this.action === 'flop';
      this.tip += ((flopping ? 1 : 0) - this.tip) * (1 - Math.exp(-dt * 10));
      this.twirl = this.action === 'spin' ? this.twirl + dt * 14 : this.twirl * Math.exp(-dt * 12);
      this.body.rotation.order = 'YXZ';
      this.body.rotation.x = this.tip * 1.45;
      this.body.rotation.z = this.tip * Math.sin(this.t * 15) * 0.28;
      this.body.rotation.y = this.baseYaw + this.twirl;
      this.body.position.y += this.tip * (0.14 * this.height + Math.abs(Math.sin(this.t * 7.5)) * 0.12);
    }
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
      this.rod.visible = this.rodOut && this.action !== 'uke' && this.action !== 'show' && this.action !== 'row' && this.action !== 'sit' && !['wave', 'dance', 'clap', 'cheer', 'dig', 'sweep', 'flop', 'spin', 'honk', 'slap', 'stretch', 'skip', 'warm', 'lean', 'skate', 'pogo', 'float'].includes(this.action);
      let pitch = 0.95; // up from forward
      if (this.action === 'castBack') pitch = 1.3 + this.power * 1.25;
      else if (this.action === 'castThrow') pitch = 2.55 - Math.min(1, this.power * 1.3) * 2.15;
      else if (this.action === 'reel') pitch = 0.75 + this.strain * 0.35;
      else if (this.action === 'walk') pitch = 1.25;
      const dir = fwd.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).addScaledVector(right, 0.12).normalize();
      this.rod.position.copy(this.handPos);
      this.rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.rodTip.copy(this.handPos).addScaledVector(dir, this.rodLen);
      // The charm hangs a little below the rod, most of the way up it, and swings in steps.
      if (this.charm) {
        this.charm.visible = this.rod.visible;
        this.charm.position.copy(this.handPos).addScaledVector(dir, this.rodLen * 0.78).addScaledVector(up, -0.16).addScaledVector(right, Math.round(Math.sin(this.t * 3) * 2) * 0.012);
      }
    } else this.rodTip.copy(this.handPos).addScaledVector(up, 1);
    if (this.hat && this.rig?.ok) this.wear(this.hat, this.hatId);
    if (SOCKETS && this.rig?.ok) this.showSocket();
    else if (this.hat) {
      this.hat.position.copy(base).addScaledVector(up, h * 0.86);
      this.hat.quaternion.copy(this.group.quaternion);
    }
    if (this.extra && this.rig?.ok) this.wear(this.extra, this.extraId);
    this.showFace();
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
    for (const o of [this.rod, this.hat, this.held, this.extra, this.charm]) o?.parent?.remove(o);
    this.faceMaterial?.dispose();
    this.group.parent?.remove(this.group);
  }

  get rigged(): boolean {
    return !!this.rig?.ok;
  }
}
