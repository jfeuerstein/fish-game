// Chalk on the village square: a patch of the cobbles that keeps whatever is drawn on it.
// Drawing looks straight down on it; one finger draws.
import * as THREE from 'three';
import { CHALK_KEY } from '../game/save';
import { CHALK, PLAZA } from '../world/layout';
import { el } from './hud';

const SIZE = 1024;
const COLOURS = ['#ffffff', '#ff8fa3', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc', '#ff922b', '#343a40'];

export class Chalk {
  readonly mesh: THREE.Mesh;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private ui = el('div', 'chalk-ui');
  private surface = el('div', 'chalk-surface');
  private colour = COLOURS[0];
  private width = 10;
  private erasing = false;
  private last: { x: number; y: number } | null = null;
  private ray = new THREE.Raycaster();
  onDone: (() => void) | null = null;
  onStroke: (() => void) | null = null;

  constructor(private parent: HTMLElement, private camera: THREE.Camera) {
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    try {
      const saved = localStorage.getItem(CHALK_KEY);
      if (saved) {
        const img = new Image();
        img.onload = () => {
          this.ctx.drawImage(img, 0, 0);
          this.texture.needsUpdate = true;
        };
        img.src = saved;
      }
    } catch {
      /* No storage: the chalk is simply not kept. */
    }
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(CHALK.size, CHALK.size).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: this.texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.mesh.position.set(CHALK.x, PLAZA.h + 0.02, CHALK.z);
    this.mesh.renderOrder = 1;
    this.mesh.receiveShadow = true;

    const palette = el('div', 'chalk-palette');
    for (const c of COLOURS) {
      const b = el('button', 'chalk-colour');
      b.style.background = c;
      b.onclick = () => {
        this.colour = c;
        this.erasing = false;
        this.mark(palette, b);
      };
      palette.append(b);
    }
    (palette.firstElementChild as HTMLElement).classList.add('on');
    const tools = el('div', 'chalk-tools');
    const size = el('button', 'btn plain', 'Thin');
    size.onclick = () => {
      this.width = this.width === 10 ? 22 : this.width === 22 ? 5 : 10;
      size.textContent = this.width === 5 ? 'Fine' : this.width === 10 ? 'Thin' : 'Thick';
    };
    const rub = el('button', 'btn plain', 'Rub out');
    rub.onclick = () => {
      this.erasing = true;
      this.mark(palette, null);
    };
    const clear = el('button', 'btn plain', 'Wipe');
    clear.onclick = () => {
      if (!confirm('Wipe the whole drawing?')) return;
      this.ctx.clearRect(0, 0, SIZE, SIZE);
      this.texture.needsUpdate = true;
    };
    const done = el('button', 'btn green', 'Done');
    done.onclick = () => this.stop();
    tools.append(size, rub, clear, done);
    this.ui.append(palette, tools);
    this.ui.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.surface.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.surface.setPointerCapture(e.pointerId);
      this.last = this.toCanvas(e);
      this.dot(this.last);
    });
    this.surface.addEventListener('pointermove', (e) => {
      if (!this.last) return;
      const p = this.toCanvas(e);
      if (p && this.last) this.stroke(this.last, p);
      this.last = p;
    });
    const end = (): void => {
      this.last = null;
    };
    this.surface.addEventListener('pointerup', end);
    this.surface.addEventListener('pointercancel', end);
  }

  private mark(palette: HTMLElement, on: HTMLElement | null): void {
    for (const c of palette.children) c.classList.toggle('on', c === on);
  }

  /** Is a point on the square's chalk patch? */
  static near(p: THREE.Vector3): boolean {
    return Math.abs(p.x - CHALK.x) < CHALK.size / 2 + 0.5 && Math.abs(p.z - CHALK.z) < CHALK.size / 2 + 0.5;
  }

  private toCanvas(e: PointerEvent): { x: number; y: number } | null {
    const r = this.parent.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.mesh)[0];
    if (!hit?.uv) return null;
    return { x: hit.uv.x * SIZE, y: (1 - hit.uv.y) * SIZE };
  }

  private style(): void {
    const g = this.ctx;
    g.globalCompositeOperation = this.erasing ? 'destination-out' : 'source-over';
    g.strokeStyle = g.fillStyle = this.colour;
    g.globalAlpha = this.erasing ? 1 : 0.88;
    g.lineWidth = this.erasing ? this.width * 2.5 : this.width;
    g.lineCap = g.lineJoin = 'round';
  }

  private dot(p: { x: number; y: number } | null): void {
    if (!p) return;
    this.style();
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.texture.needsUpdate = true;
  }

  private stroke(a: { x: number; y: number }, b: { x: number; y: number }): void {
    this.style();
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
    this.texture.needsUpdate = true;
    if (Math.random() < 0.08) this.onStroke?.();
  }

  start(): void {
    this.parent.append(this.surface, this.ui);
  }

  stop(): void {
    this.surface.remove();
    this.ui.remove();
    try {
      localStorage.setItem(CHALK_KEY, this.canvas.toDataURL('image/png'));
    } catch {
      /* Not kept. */
    }
    this.onDone?.();
  }

  get active(): boolean {
    return this.ui.isConnected;
  }
}
