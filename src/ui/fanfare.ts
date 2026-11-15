// Fanfare for a win: confetti, a shower of pearls, a flash and a shake, light rays behind a big
// stamped headline, and a little brass band played by the synth. Scaled to how grand the win is;
// with reduced motion it keeps to the headline and the sound.
import type { Audio } from '../audio/audio';
import type { Grandness } from '../game/arcade';
import { el } from './hud';

const CONFETTI = ['#d65a3c', '#ecc77d', '#c8963e', '#2c8a8a', '#62c0b0', '#f4eee3', '#8f74ba', '#93b85a'];
const quiet = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  w: number;
  h: number;
  c: string;
  coin: boolean;
  life: number;
}

export class Fanfare {
  private canvas: HTMLCanvasElement | null = null;
  private bits: Bit[] = [];
  private running = false;

  constructor(private app: HTMLElement, private audio: Audio) {
  }

  /** Celebrate a win of a given grandness, with a headline and a line under it. */
  win(level: Grandness, title: string, sub = '', colour = '#ecc77d'): void {
    if (level === 'none') return;
    const calm = quiet();
    this.audio.band(level);
    if (level === 'small') {
      this.burst(calm ? 0 : 40, 0.5, 0.62, false);
      return;
    }
    this.stamp(title, sub, colour, level);
    if (calm) return;
    if (level === 'big') this.burst(110, 0.5, 0.5, false);
    if (level === 'huge') {
      this.flash(colour, 0.35);
      this.burst(180, 0.5, 0.45, false);
      this.rain(30);
      this.shake(4);
    }
    if (level === 'jackpot') {
      this.flash('#fff6dc', 0.7);
      this.burst(140, 0.2, 0.55, false);
      this.burst(140, 0.8, 0.55, false);
      setTimeout(() => this.burst(160, 0.5, 0.35, false), 450);
      this.rain(70);
      this.shake(9);
      setTimeout(() => this.rain(50), 900);
    }
  }

  /** A sad trombone's worth of nothing: the gull is pleased with itself. */
  lose(): void {
    this.audio.band('none');
  }

  /** Confetti from a point (fractions of the screen). */
  burst(n: number, fx: number, fy: number, coins: boolean): void {
    if (!n) return;
    const W = this.app.clientWidth;
    const H = this.app.clientHeight;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = 6 + Math.random() * 12;
      this.bits.push({ x: W * fx, y: H * fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: CONFETTI[i % CONFETTI.length], coin: coins, life: 1 });
    }
    this.go();
  }

  /** Pearls falling from the top of the screen. */
  rain(n: number): void {
    const W = this.app.clientWidth;
    for (let i = 0; i < n; i++) {
      this.bits.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 26, h: 26, c: '', coin: true, life: 1 });
    }
    this.go();
  }

  flash(colour: string, strength: number): void {
    const f = el('div', 'ff-flash');
    f.style.background = colour;
    f.style.setProperty('--k', String(strength));
    this.app.append(f);
    setTimeout(() => f.remove(), 700);
  }

  shake(px: number): void {
    this.app.style.setProperty('--shake', `${px}px`);
    this.app.classList.remove('ff-shake');
    void this.app.offsetWidth;
    this.app.classList.add('ff-shake');
    setTimeout(() => this.app.classList.remove('ff-shake'), 650);
  }

  /** The big headline with light rays behind it; tap or wait to clear it. */
  stamp(title: string, sub: string, colour: string, level: Grandness): void {
    const box = el('div', `ff-stamp ff-${level}`);
    box.style.setProperty('--glow', colour);
    box.innerHTML = `<div class="ff-rays"></div><div class="ff-words"><div class="ff-title">${title}</div>${sub ? `<div class="ff-sub">${sub}</div>` : ''}</div>`;
    const gone = (): void => {
      box.classList.add('out');
      setTimeout(() => box.remove(), 350);
    };
    box.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      gone();
    });
    this.app.append(box);
    setTimeout(gone, level === 'jackpot' ? 2400 : 1800);
  }

  private go(): void {
    if (!this.canvas) {
      this.canvas = el('canvas', 'ff-canvas');
      this.app.append(this.canvas);
    }
    const c = this.canvas;
    // Drawn small and blown up with hard pixels, like the island: one pixel of it is three points.
    const PX = 3;
    c.width = Math.ceil(this.app.clientWidth / PX);
    c.height = Math.ceil(this.app.clientHeight / PX);
    if (this.running) return;
    this.running = true;
    const ctx = c.getContext('2d')!;
    let last = performance.now();
    const step = (now: number): void => {
      const dt = Math.min(2.5, (now - last) / 16.7);
      last = now;
      ctx.clearRect(0, 0, c.width, c.height);
      const H = this.app.clientHeight;
      for (const b of this.bits) {
        b.vy += (b.coin ? 0.25 : 0.32) * dt;
        b.vx *= 0.985 ** dt;
        b.vy *= b.coin ? 1 : 0.985 ** dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.r += b.vr * dt;
        if (b.y > H + 40) b.life = 0;
        const x = Math.round(b.x / PX);
        const y = Math.round(b.y / PX);
        if (b.coin) {
          // A pearl falling: a little block of lilac with a white corner (prizes are things, not coins).
          const r = Math.max(2, Math.round(b.w / PX / 2.2));
          ctx.fillStyle = '#c6b4e2';
          ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2);
          ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2);
          ctx.fillStyle = '#fffdf6';
          ctx.fillRect(x - r + 1, y - r + 1, Math.max(1, r - 1), Math.max(1, r - 1));
        } else {
          // A scrap of paper turning over: a block that goes thin and wide again.
          const w = Math.max(1, Math.round(b.w / PX));
          const h = Math.max(1, Math.round((b.h / PX) * Math.abs(Math.cos(b.r * 2.3))));
          ctx.fillStyle = b.c;
          ctx.fillRect(x - (w >> 1), y - (h >> 1), w, h);
        }
      }
      this.bits = this.bits.filter((b) => b.life > 0);
      if (this.bits.length) requestAnimationFrame(step);
      else {
        this.running = false;
        ctx.clearRect(0, 0, c.width, c.height);
      }
    };
    requestAnimationFrame(step);
  }
}
