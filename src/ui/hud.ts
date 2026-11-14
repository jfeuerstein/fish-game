// What sits over the game: money and level at the top, announcements, the catch card, the reel
// and casting meters, the action buttons by the right thumb and the menu row along the bottom.

const base = import.meta.env.BASE_URL;
export const icon = (id: string): string => `${base}icons/${id}.webp`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
export { el };

export interface CatchCard {
  icon: string;
  name: string;
  size: string;
  tier: string;
  tierColor: string;
  variant: 'normal' | 'shiny' | 'golden';
  value: number;
  first: boolean;
  best: boolean;
  tokens: number;
}

export class Hud {
  readonly root: HTMLElement;
  private coins = el('span', 'n');
  private tokens = el('span', 'n');
  private level = el('span', 'lv');
  private xpFill = el('i');
  private clock = el('span', 'clock');
  private toasts = el('div', 'toasts');
  private card = el('div', 'catch-card');
  private action = el('button', 'act-main');
  private second = el('button', 'act-second');
  private meter = el('div', 'reel-meter');
  private meterFish = el('div', 'reel-fish');
  private meterFill = el('i', 'reel-fill');
  private tension = el('i', 'tension-fill');
  private meterHint = el('div', 'reel-hint');
  private power = el('div', 'power');
  private powerFill = el('i');
  private bubble = el('div', 'bubble');
  private bang = el('div', 'bang', '!');
  private onAction: (() => void) | null = null;
  private onActionUp: (() => void) | null = null;
  private onSecond: (() => void) | null = null;
  /** Whether the main button is being held. */
  held = false;
  readonly menu: Record<'bag' | 'journal' | 'fun' | 'more', HTMLButtonElement>;
  private cardTimer = 0;

  constructor(parent: HTMLElement, onAnyTouch: () => void) {
    this.root = parent;
    parent.hidden = false;
    const top = el('div', 'topbar');
    const money = el('div', 'chip money');
    money.append(Object.assign(el('img'), { src: icon('coin'), alt: '' }), this.coins);
    const tok = el('div', 'chip tokens');
    tok.append(el('b', 'pearl'), this.tokens);
    const lv = el('div', 'chip level');
    const bar = el('div', 'xp');
    bar.append(this.xpFill);
    lv.append(this.level, bar);
    const left = el('div', 'top-left');
    left.append(money, tok);
    const right = el('div', 'top-right');
    right.append(lv, el('div', 'chip clock-chip'));
    right.lastElementChild!.append(this.clock);
    top.append(left, right);

    this.card.addEventListener('pointerdown', () => this.hideCard());
    this.meter.append(el('div', 'reel-track'), this.meterHint);
    this.meter.firstElementChild!.append(this.meterFill, this.meterFish);
    const tensionTrack = el('div', 'tension');
    tensionTrack.append(this.tension, el('span', '', 'line'));
    this.meter.append(tensionTrack);
    this.meter.hidden = true;
    this.power.append(this.powerFill);
    this.power.hidden = true;
    this.bubble.hidden = true;
    this.bang.hidden = true;

    this.action.hidden = true;
    this.second.hidden = true;
    const press = (e: PointerEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      onAnyTouch();
      this.held = true;
      this.action.classList.add('down');
      try {
        this.action.setPointerCapture(e.pointerId);
      } catch {
        /* A pointer the browser does not know (from the tools). */
      }
      this.onAction?.();
    };
    const release = (e: PointerEvent): void => {
      if (!this.held) return;
      e.preventDefault();
      this.held = false;
      this.action.classList.remove('down');
      this.onActionUp?.();
    };
    this.action.addEventListener('pointerdown', press);
    this.action.addEventListener('pointerup', release);
    this.action.addEventListener('pointercancel', release);
    this.second.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onAnyTouch();
      this.onSecond?.();
    });

    const row = el('div', 'menu-row');
    const make = (id: string, label: string, img: string): HTMLButtonElement => {
      const b = el('button', `menu-btn ${id}`);
      b.innerHTML = `<img src="${icon(img)}" alt=""><span>${label}</span>`;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onAnyTouch();
      });
      row.append(b);
      return b;
    };
    this.menu = { bag: make('bag', 'Bag', 'f-cooler'), journal: make('journal', 'Journal', 'fish-bluegill'), fun: make('fun', 'Fun', 'ukulele'), more: make('more', 'More', 'hat-captain') };
    parent.append(top, this.toasts, this.card, this.meter, this.power, this.bubble, this.bang, this.second, this.action, row);
  }

  setStats(coins: number, tokens: number, level: number, xpFrac: number): void {
    this.coins.textContent = coins.toLocaleString();
    this.tokens.textContent = String(tokens);
    this.level.textContent = `Lv ${level}`;
    this.xpFill.style.width = `${Math.round(xpFrac * 100)}%`;
  }

  setClock(text: string, rain: boolean, night: boolean): void {
    const sky = rain ? '🌧' : night ? '🌙' : '☀️';
    const t = `${sky} ${text}`;
    if (this.clock.textContent !== t) this.clock.textContent = t;
  }

  /** What the main button does here. `onUp` makes it a hold-and-release button. */
  setAction(label: string | null, onDown?: () => void, onUp?: () => void, style = ''): void {
    if (label === null) {
      this.action.hidden = true;
      this.onAction = this.onActionUp = null;
      this.held = false;
      return;
    }
    if (this.action.textContent !== label) this.action.textContent = label;
    this.action.className = `act-main ${style}${this.held ? ' down' : ''}`;
    this.action.hidden = false;
    this.onAction = onDown ?? null;
    this.onActionUp = onUp ?? null;
  }

  setSecond(label: string | null, onTap?: () => void): void {
    if (label === null) {
      this.second.hidden = true;
      this.onSecond = null;
      return;
    }
    if (this.second.textContent !== label) this.second.textContent = label;
    this.second.hidden = false;
    this.onSecond = onTap ?? null;
  }

  toast(text: string, kind = ''): void {
    const t = el('div', `toast ${kind}`, text);
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  showCatch(c: CatchCard): void {
    const badge = c.variant === 'golden' ? '<b class="vb golden">Golden!</b>' : c.variant === 'shiny' ? '<b class="vb shiny">Shiny!</b>' : '';
    this.card.innerHTML = `
      <img src="${c.icon}" alt="" class="${c.variant}">
      <div class="cc-text">
        <div class="cc-name">${c.name} ${c.first ? '<b class="new">NEW</b>' : ''}</div>
        <div class="cc-meta"><span style="color:${c.tierColor}">${c.tier}</span> · ${c.size}${c.best && !c.first ? ' · <b class="best">Best!</b>' : ''}</div>
        <div class="cc-row">${badge}<span class="cc-value"><img src="${icon('coin')}" alt="">${c.value}</span>${c.tokens ? `<span class="cc-tokens"><b class="pearl"></b>+${c.tokens}</span>` : ''}</div>
      </div>`;
    this.card.className = `catch-card show ${c.variant}`;
    clearTimeout(this.cardTimer);
    this.cardTimer = window.setTimeout(() => this.hideCard(), 4200);
  }

  hideCard(): void {
    this.card.classList.remove('show');
  }

  /** The reeling meter: how far in, and the strain on the line. */
  setReel(progress: number | null, tension = 0, thrashing = false, fishIcon = ''): void {
    if (progress === null) {
      this.meter.hidden = true;
      return;
    }
    this.meter.hidden = false;
    this.meterFill.style.width = `${progress * 100}%`;
    this.meterFish.style.left = `${progress * 100}%`;
    if (fishIcon && this.meterFish.dataset.icon !== fishIcon) {
      this.meterFish.dataset.icon = fishIcon;
      this.meterFish.style.backgroundImage = `url(${fishIcon})`;
    }
    this.meterFish.classList.toggle('thrash', thrashing);
    this.tension.style.width = `${Math.min(1, tension) * 100}%`;
    this.tension.className = `tension-fill ${tension > 0.75 ? 'hot' : tension > 0.45 ? 'warm' : ''}`;
    const hint = thrashing ? 'It’s fighting! Ease off…' : tension > 0.75 ? 'Careful, the line!' : 'Hold to reel';
    if (this.meterHint.textContent !== hint) this.meterHint.textContent = hint;
  }

  setPower(v: number | null): void {
    if (v === null) {
      this.power.hidden = true;
      return;
    }
    this.power.hidden = false;
    this.powerFill.style.height = `${v * 100}%`;
    this.powerFill.className = v > 0.85 ? 'max' : '';
  }

  /** A speech bubble at a point on the screen. */
  say(text: string | null, x = 0, y = 0): void {
    if (text === null) {
      this.bubble.hidden = true;
      return;
    }
    if (this.bubble.textContent !== text) this.bubble.textContent = text;
    this.bubble.hidden = false;
    // Kept on the screen, whoever is speaking.
    const w = this.root.clientWidth || 400;
    x = Math.min(w - 120, Math.max(120, x));
    y = Math.max(150, y);
    this.bubble.style.left = `${x}px`;
    this.bubble.style.top = `${y}px`;
  }

  /** The "!" over the player's head when a fish bites. */
  exclaim(on: boolean, x = 0, y = 0): void {
    this.bang.hidden = !on;
    if (on) {
      this.bang.style.left = `${x}px`;
      this.bang.style.top = `${y}px`;
    }
  }

  show(on: boolean): void {
    this.root.style.display = on ? '' : 'none';
  }
}
