// Little effects: water splashing up, rings spreading on the water, sparkles round a special
// catch, and the rain. Each is one mesh, reused.
import * as THREE from 'three';

interface Drop {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  colour: THREE.Color;
}

const MAX = 220;

export class Effects {
  readonly group = new THREE.Group();
  private drops: Drop[] = [];
  private dropMesh: THREE.InstancedMesh;
  private rings: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = [];
  private ringGeo = new THREE.RingGeometry(0.82, 1, 32).rotateX(-Math.PI / 2);
  private rain: THREE.LineSegments;
  private rainOn = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();

  constructor() {
    this.dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropMesh.count = 0;
    this.dropMesh.frustumCulled = false;
    this.group.add(this.dropMesh);
    // Rain: streaks in a box that follows the camera.
    const n = 900;
    const pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 30;
      const z = (Math.random() - 0.5) * 50;
      pos.set([x, y, z, x + 0.05, y - 0.7, z + 0.05], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe0ee, transparent: true, opacity: 0.5 }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.group.add(this.rain);
  }

  /** Water thrown up at a point. */
  splash(at: THREE.Vector3, amount = 1, colour = 0xffffff): void {
    const c = new THREE.Color(colour);
    const n = Math.round(10 + 16 * amount);
    for (let i = 0; i < n && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.6 + Math.random() * 1.6) * (0.6 + amount * 0.6);
      this.drops.push({ pos: at.clone(), vel: new THREE.Vector3(Math.cos(a) * s * 0.6, 2 + Math.random() * 2.5 * amount, Math.sin(a) * s * 0.6), life: 0, max: 0.5 + Math.random() * 0.4, size: 0.04 + Math.random() * 0.05 * amount, colour: c });
    }
    this.ring(at, 0.8 + amount);
  }

  /** Sparkles rising round a special catch. */
  sparkle(at: THREE.Vector3, golden: boolean): void {
    const c = new THREE.Color(golden ? 0xffd34a : 0xbfe6ff);
    for (let i = 0; i < 30 && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      this.drops.push({ pos: at.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.6, Math.sin(a) * r)), vel: new THREE.Vector3(0, 0.6 + Math.random(), 0), life: 0, max: 1 + Math.random() * 0.6, size: 0.03 + Math.random() * 0.04, colour: c });
    }
  }

  /** A ring spreading on the water. */
  ring(at: THREE.Vector3, size = 1): void {
    const mesh = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    mesh.position.copy(at);
    mesh.position.y += 0.03;
    mesh.renderOrder = 3;
    this.group.add(mesh);
    this.rings.push({ mesh, life: 0, max: 1.1, size });
  }

  setRain(amount: number): void {
    this.rainOn = amount;
  }

  update(dt: number, camera: THREE.Camera): void {
    let n = 0;
    this.drops = this.drops.filter((d) => (d.life += dt) < d.max);
    for (const d of this.drops) {
      d.vel.y -= 9 * dt;
      d.pos.addScaledVector(d.vel, dt);
      const s = d.size * (1 - d.life / d.max);
      this.m.compose(d.pos, this.q, new THREE.Vector3(s, s, s));
      this.dropMesh.setMatrixAt(n, this.m);
      this.dropMesh.setColorAt(n, d.colour);
      n++;
    }
    this.dropMesh.count = n;
    this.dropMesh.instanceMatrix.needsUpdate = true;
    if (this.dropMesh.instanceColor) this.dropMesh.instanceColor.needsUpdate = true;
    this.rings = this.rings.filter((r) => {
      r.life += dt;
      const k = r.life / r.max;
      r.mesh.scale.setScalar(0.2 + k * r.size);
      // Fades in three steps, not smoothly.
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (Math.ceil((1 - k) * 3) / 3) * 0.8;
      if (k >= 1) {
        this.group.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });
    this.rain.visible = this.rainOn > 0.05;
    if (this.rain.visible) {
      (this.rain.material as THREE.LineBasicMaterial).opacity = 0.45 * this.rainOn;
      const p = camera.position;
      // Falling: the box slides down and wraps.
      this.rain.position.set(Math.round(p.x / 2) * 2, p.y - 12 - ((performance.now() / 1000) * 14) % 1.4, Math.round(p.z / 2) * 2);
    }
  }
}
