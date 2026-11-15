// Life in the sky and out at sea, drawn: gulls over the island by day, a boat on the horizon,
// a shooting star now and then at night. Where each is comes from src/look/skylife.ts. Three
// draw calls for the gulls' wings and bodies, one for the boat, one for the star.
import * as THREE from 'three';
import { GULLS, boatAt, gullAt, gullsOut, shootingStar } from '../look/skylife';
import { lit } from '../look/material';

/** A box of one colour, placed, with a colour on every corner (so several can be one mesh). */
function block(w: number, h: number, d: number, x: number, y: number, z: number, colour: string): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed().translate(x, y, z);
  const c = new THREE.Color(colour);
  const n = g.getAttribute('position').count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(cols, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

function joined(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color'] as const) {
    const all = parts.map((p) => p.getAttribute(name).array as Float32Array);
    const a = new Float32Array(all.reduce((s, v) => s + v.length, 0));
    let at = 0;
    for (const v of all) {
      a.set(v, at);
      at += v.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(a, 3));
  }
  for (const p of parts) p.dispose();
  return out;
}

/** One wing, out along +x from its root, flat: pale with a dark tip. */
function wing(): THREE.BufferGeometry {
  return joined([block(0.52, 0.05, 0.3, 0.3, 0, 0, '#f4eee3'), block(0.3, 0.05, 0.2, 0.7, 0, -0.03, '#474e54')]);
}

/** A gull that can flap, made of blocks: its body with a wing each side. Turn `left` and `right` about z to raise them. */
export function flapper(material: THREE.Material): { body: THREE.Group; left: THREE.Mesh; right: THREE.Mesh } {
  const body = new THREE.Group();
  const left = new THREE.Mesh(wing(), material);
  const right = new THREE.Mesh(wing(), material);
  right.scale.x = -1;
  body.add(new THREE.Mesh(joined([block(0.22, 0.2, 0.62, 0, 0, 0, '#fffdf6'), block(0.1, 0.08, 0.16, 0, 0, 0.38, '#ecc77d'), block(0.2, 0.06, 0.26, 0, 0.02, -0.4, '#a4abac')]), material), left, right);
  return { body, left, right };
}

/** The material a flapper wears: lit, coloured on its corners, seen from both sides. */
export function feathers(): THREE.Material {
  const m = lit({ vertexColors: true });
  m.side = THREE.DoubleSide;
  return m;
}

export class SkyLife {
  readonly group = new THREE.Group();
  private gulls: { body: THREE.Group; left: THREE.Mesh; right: THREE.Mesh }[] = [];
  private boat: THREE.Mesh;
  private lamp: THREE.Mesh;
  private star: THREE.InstancedMesh;
  private clock = 0;
  private m = new THREE.Matrix4();

  constructor() {
    const feathers = lit({ vertexColors: true });
    const bodyGeo = joined([block(0.22, 0.2, 0.62, 0, 0, 0, '#fffdf6'), block(0.1, 0.08, 0.16, 0, 0, 0.38, '#ecc77d'), block(0.2, 0.06, 0.26, 0, 0.02, -0.4, '#a4abac')]);
    const wingGeo = wing();
    for (let i = 0; i < GULLS; i++) {
      const body = new THREE.Group();
      const left = new THREE.Mesh(wingGeo, feathers);
      const right = new THREE.Mesh(wingGeo, feathers);
      // The other wing is the same one turned about, so both tips trail.
      right.scale.x = -1;
      body.add(new THREE.Mesh(bodyGeo, feathers), left, right);
      // Seen from the ground a life-size gull is three pixels: these are twice the size.
      body.scale.setScalar(2);
      this.group.add(body);
      this.gulls.push({ body, left, right });
    }
    (feathers as THREE.MeshToonMaterial).side = THREE.DoubleSide;

    // The boat: a trawler, big enough to be a dozen pixels a third of a kilometre off. Its bow is at +z.
    this.boat = new THREE.Mesh(
      joined([
        block(5, 2.6, 15, 0, 0.9, 0, '#5e1c18'),
        block(4.2, 0.5, 14, 0, 2.4, 0, '#f4eee3'),
        block(3.4, 2.8, 4.4, 0, 4, -2.6, '#f4eee3'),
        block(3.8, 0.4, 4.8, 0, 5.5, -2.6, '#2b4250'),
        block(1.1, 2.2, 1.1, 0, 6.6, -3.4, '#a2341f'),
        block(0.3, 5.5, 0.3, 0, 5.2, 3.6, '#523524'),
      ]),
      lit({ vertexColors: true }),
    );
    this.lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xf8e6b0, fog: false }));
    this.lamp.position.set(0, 4.2, -0.2);
    this.boat.add(this.lamp);
    this.group.add(this.boat);

    // A shooting star: a head and a tail of three, each a square pixel of light.
    this.star = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xfffdf6, fog: false }), 4);
    this.star.frustumCulled = false;
    this.star.visible = false;
    this.group.add(this.star);
  }

  /** `night` and `rain` run 0 to 1; `focus` is where the player is (the star is seen from there). */
  update(dt: number, night: number, rain: number, focus: THREE.Vector3): void {
    const t = (this.clock += dt);
    const out = gullsOut(night, rain);
    for (const [i, g] of this.gulls.entries()) {
      g.body.visible = i < out;
      if (!g.body.visible) continue;
      const at = gullAt(i, t);
      g.body.position.set(at.x, at.y, at.z);
      g.body.rotation.y = at.yaw;
      g.left.rotation.z = at.wings;
      g.right.rotation.z = -at.wings;
    }
    const b = boatAt(t);
    // It rides the swell a little, a step at a time.
    this.boat.position.set(b.x, Math.round(Math.sin(t * 0.7) * 2) * 0.15 - 0.4, b.z);
    this.boat.rotation.y = b.yaw;
    this.lamp.visible = night > 0.4;

    const s = night > 0.7 && rain < 0.3 ? shootingStar(t) : null;
    this.star.visible = !!s;
    if (s) {
      const R = 420;
      for (let i = 0; i < 4; i++) {
        // The tail is where the head was a moment ago.
        const back = i * 0.045;
        const az = s.az - back * 0.22;
        const el = s.el + back * 0.08;
        const size = (i === 0 ? 3.4 : 2.6 - i * 0.4) * (s.k > 0.8 ? 0.6 : 1);
        this.m.makeScale(size, size, size);
        this.m.setPosition(focus.x + Math.cos(az) * Math.cos(el) * R, focus.y + Math.sin(el) * R, focus.z + Math.sin(az) * Math.cos(el) * R);
        this.star.setMatrixAt(i, this.m);
      }
      this.star.instanceMatrix.needsUpdate = true;
    }
  }
}
