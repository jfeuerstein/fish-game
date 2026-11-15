// Touch controls for one thumb: the bottom third of the screen is a stick that appears where the
// thumb lands; anywhere above turns the camera. A second finger can pinch to zoom, but nothing
// needs it. Keys and a mouse do the same on a computer.

export class Controls {
  /** The stick: x to the right, y up the screen, length 0 to 1. */
  readonly move = { x: 0, y: 0 };
  /** Camera turn accumulated since last read, in pixels. */
  private look = { x: 0, y: 0 };
  private zoomBy = 0;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookIds = new Map<number, { x: number; y: number }>();
  private pinch: number | null = null;
  private keys = new Set<string>();
  private ring: HTMLDivElement;
  private knob: HTMLDivElement;
  /** When false, the stick and camera ignore touches (a sheet is open, or the chalk is out). */
  enabled = true;
  /** Called when the stick is first pushed, so whatever the player was doing can stop. */
  onPush: (() => void) | null = null;

  constructor(private surface: HTMLElement) {
    this.ring = document.createElement('div');
    this.ring.className = 'stick-ring';
    this.knob = document.createElement('div');
    this.knob.className = 'stick-knob';
    this.ring.appendChild(this.knob);
    this.ring.hidden = true;
    surface.appendChild(this.ring);
    surface.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveTo(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    surface.addEventListener('wheel', (e) => {
      this.zoomBy += e.deltaY * 0.0015;
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private inStickZone(y: number): boolean {
    const r = this.surface.getBoundingClientRect();
    return y > r.top + r.height * 0.64;
  }

  private down(e: PointerEvent): void {
    if (!this.enabled || e.target !== this.surface) return;
    if (this.stickId === null && this.inStickZone(e.clientY) && e.pointerType !== 'mouse') {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      const r = this.surface.getBoundingClientRect();
      this.ring.style.left = `${e.clientX - r.left}px`;
      this.ring.style.top = `${e.clientY - r.top}px`;
      this.ring.hidden = false;
      this.knob.style.transform = 'translate(-50%, -50%)';
    } else {
      this.lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.lookIds.size === 2) this.pinch = this.spread();
    }
  }

  private spread(): number {
    const [a, b] = [...this.lookIds.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private moveTo(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      const dx = e.clientX - this.stickOrigin.x;
      const dy = e.clientY - this.stickOrigin.y;
      const max = 52;
      const len = Math.hypot(dx, dy);
      const k = len > max ? max / len : 1;
      const was = Math.hypot(this.move.x, this.move.y);
      this.move.x = (dx * k) / max;
      this.move.y = (-dy * k) / max;
      // A small dead zone, so a resting thumb does not creep.
      if (len < 6) this.move.x = this.move.y = 0;
      if (was < 0.15 && Math.hypot(this.move.x, this.move.y) >= 0.15) this.onPush?.();
      this.knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
      return;
    }
    const last = this.lookIds.get(e.pointerId);
    if (last) {
      if (this.lookIds.size === 2 && this.pinch !== null) {
        this.lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const now = this.spread();
        this.zoomBy += (this.pinch - now) * 0.006;
        this.pinch = now;
        return;
      }
      this.look.x += e.clientX - last.x;
      this.look.y += e.clientY - last.y;
      this.lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
    } else if (e.pointerType === 'mouse' && e.buttons === 1 && e.target === this.surface) {
      this.look.x += e.movementX;
      this.look.y += e.movementY;
    }
  }

  private up(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.move.x = this.move.y = 0;
      this.ring.hidden = true;
    }
    this.lookIds.delete(e.pointerId);
    if (this.lookIds.size < 2) this.pinch = null;
  }

  /** Let go of everything (a sheet opened over the game). */
  release(): void {
    this.stickId = null;
    this.move.x = this.move.y = 0;
    this.ring.hidden = true;
    this.lookIds.clear();
    this.pinch = null;
  }

  /** The stick, with the keyboard folded in. */
  stick(): { x: number; y: number } {
    let x = this.move.x;
    let y = this.move.y;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y += 1;
    if (k.has('s') || k.has('arrowdown')) y -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  key(name: string): boolean {
    return this.keys.has(name);
  }

  takeLook(): { x: number; y: number; zoom: number } {
    const out = { x: this.look.x, y: this.look.y, zoom: this.zoomBy };
    this.look.x = this.look.y = 0;
    this.zoomBy = 0;
    return out;
  }
}
