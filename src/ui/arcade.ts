// The Lucky Gull: the arcade booth on the plaza. Every game is the same thing: a pearl in, a
// cosmetic out, rolled from one table of odds (`pull` in chests.ts). The games are only ways of
// watching it: the Gull Wheel (a strip of prizes slowing onto yours), the Bait Bandit (three reels
// landing on it), Flying Fish (a fish leaping as high as the prize is rare) and a scratch card.
import { FLIGHT_BANDS, RARITIES, bandAt, peakFor, reelStrips } from '../game/arcade';
import { PULL_COST, type Prize, RARITY_COLOR, RARITY_LABEL } from '../game/crates';
import type { Session } from '../game/session';
import { oddsRow, prizeGrid, pull, showPrize, stripReveal } from './chests';
import type { Fanfare } from './fanfare';
import { el, icon } from './hud';
import { buyCard } from './scratch';
import { Sheet } from './sheet';

/** What the arcade needs besides the session: somewhere to celebrate, and the gull to react. */
export interface ArcadeHooks {
  fanfare: Fanfare;
  /** The gull by the booth: pleased with itself, or astonished at a rare prize. */
  gull(mood: 'smug' | 'shocked'): void;
  /** The player's character cheers. */
  cheer(): void;
}

type Got = { prize: Prize; owned: boolean; refund: number };
const quick = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pearl = '<b class="pearl"></b>';
const cost = `${pearl}${PULL_COST}`;

export function arcadeSheet(app: HTMLElement, s: Session, hooks: ArcadeHooks): Sheet {
  const save = s.save;
  const { fanfare } = hooks;
  let busy = false;

  const purseEl = el('div');
  const refreshPurse = (): void => {
    purseEl.innerHTML = `<div class="purse"><span class="eyebrow">Your pearls</span><span>${pearl}${save.tokens}</span></div>`;
  };
  /** A show has ended: the card comes up, and the gull reacts to how rare the prize is. */
  const reveal = (got: Got): void => {
    busy = false;
    s.hud.hold = false;
    save.arcade.best++;
    if (got.prize.rarity === 'epic' || got.prize.rarity === 'legendary') {
      hooks.gull('shocked');
      hooks.cheer();
    } else if (got.owned) hooks.gull('smug');
    showPrize(app, s, fanfare, got, () => {
      refreshPurse();
      if (sheet.root.isConnected) sheet.refresh();
    });
    refreshPurse();
  };
  /** The button that starts a show: pay and roll, then hand the prize to the show. */
  const goButton = (label: string, show: (got: Got, button: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = el('button', 'big-btn casino-go', `${label} · ${cost}`);
    b.disabled = busy;
    b.onclick = () => {
      if (busy) return;
      const got = pull(s);
      if (!got) return;
      busy = true;
      b.disabled = true;
      refreshPurse();
      show(got, b);
    };
    return b;
  };

  // ---------- The Gull Wheel ----------
  function wheel(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'Drop a pearl in and the wheel spins a strip of prizes past the gull’s marker. Where it stops is yours.'));
    const art = el('div', 'wheel-art', `<img src="${icon('gull')}" alt=""><div class="wheel-art-strip">${['hat-crown', 'hat-pirate', 'hat-top', 'hat-duck', 'f-flamingo'].map((id) => `<img src="${icon(id)}" alt="">`).join('')}</div>`);
    body.append(art);
    const spin = (): void => {
      const got = pull(s);
      if (!got) return;
      busy = true;
      refreshPurse();
      start(got);
    };
    const start = (got: Got): void =>
      stripReveal(app, s, fanfare, got, spin, () => {
        busy = false;
        refreshPurse();
        sheet.refresh();
      });
    body.append(goButton('Spin the wheel', (got) => start(got)));
  }

  // ---------- The Bait Bandit ----------
  const CELL = 84;
  function slots(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'Pull the lever: the reels spin through the prizes and all three land on yours.'));
    const machine = el('div', 'slots');
    const reels: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const w = el('div', 'reel');
      const strip = el('div', 'reel-strip');
      // Idle, the reels show different things: nothing lined up before a pull.
      const idle = [['hat-duck', 'hat-crown', 'f-gnome'], ['hat-top', 'f-flamingo', 'hat-cake'], ['x-mustache', 'hat-pirate', 'f-radio']][i];
      strip.innerHTML = idle.map((id) => `<div class="reel-cell"><img src="${icon(id)}" alt=""></div>`).join('');
      strip.style.transform = `translateY(${-CELL * 0.5}px)`;
      w.append(strip);
      machine.append(w);
      reels.push(strip);
    }
    machine.append(el('div', 'payline'));
    body.append(machine);
    const out = el('div', 'casino-out');
    body.append(
      goButton('Pull the lever', (got) => {
        const strips = reelStrips(got.prize, Date.now() % 1e9);
        const rare = RARITIES.indexOf(got.prize.rarity) >= 3;
        s.audio.play('cast', { volume: 0.4, rate: 0.8 });
        out.textContent = '';
        out.className = 'casino-out';
        const durs = quick() ? [400, 600, 800] : [1300, 1900, rare ? 4200 : 2500];
        if (rare && !quick())
          setTimeout(() => {
            reels[2].parentElement!.classList.add('tease');
            s.audio.roll(2.2);
          }, 1900);
        let stopped = 0;
        strips.forEach((strip, i) => {
          const reel = reels[i];
          reel.innerHTML = strip.map((p) => `<div class="reel-cell" style="--rar:${RARITY_COLOR[p.rarity]}"><img src="${icon(p.id)}" alt=""></div>`).join('') + `<div class="reel-cell"><img src="${icon(strip[0].id)}" alt=""></div>`;
          const endY = (strip.length - 1) * CELL - CELL * 0.5;
          const t0 = performance.now();
          let lastCell = -1;
          const step = (now: number): void => {
            const t = Math.min(1, (now - t0) / durs[i]);
            // Eases out with a small bounce past the line and back.
            const e = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 3.6) : 1;
            const y = e * endY;
            reel.style.transform = `translateY(${-y}px)`;
            const cell = Math.floor(y / CELL);
            if (cell !== lastCell && t < 0.9) {
              lastCell = cell;
              if (i === 2) s.audio.tick(t * 0.5);
            }
            if (t < 1) requestAnimationFrame(step);
            else {
              s.audio.play('click', { volume: 0.5, rate: 0.7 });
              if (++stopped === 3) {
                reels[2].parentElement!.classList.remove('tease');
                machine.classList.add('lit');
                machine.style.setProperty('--rar', RARITY_COLOR[got.prize.rarity]);
                setTimeout(() => machine.classList.remove('lit'), 1600);
                out.className = 'casino-out good';
                out.innerHTML = `Three ${got.prize.name}s! <span class="tier" style="--rar:${RARITY_COLOR[got.prize.rarity]}">${RARITY_LABEL[got.prize.rarity]}</span>`;
                reveal(got);
              }
            }
          };
          requestAnimationFrame(step);
        });
      }),
      out,
    );
  }

  // ---------- Flying Fish ----------
  function flying(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'Launch a fish: the rarer your prize, the higher it leaps. Watch which band it reaches.'));
    const sky = el('canvas', 'flight-sky');
    const ladder = el('div', 'flight-ladder');
    ladder.innerHTML = FLIGHT_BANDS.map((b) => `<span style="--rar:${RARITY_COLOR[b.rarity]}" data-r="${b.rarity}">${RARITY_LABEL[b.rarity]}</span>`).join('');
    body.append(sky, ladder);
    const fish = new Image();
    const ctx = sky.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = (): void => {
      sky.width = (sky.clientWidth || 360) * dpr;
      sky.height = 240 * dpr;
    };
    const top = FLIGHT_BANDS[4].at * 1.8;
    const draw = (h: number, x: number, burst: number, prize: Prize | null): void => {
      if (!sky.isConnected) return;
      if (sky.width < 10) size();
      const W = sky.width / dpr;
      const H = sky.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f1d26');
      g.addColorStop(1, '#22414a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const yAt = (v: number): number => H - 34 - (Math.log(Math.max(1, v)) / Math.log(top)) * (H - 60);
      // The bands of rarity, from the sea up.
      for (let i = 0; i < FLIGHT_BANDS.length; i++) {
        const b = FLIGHT_BANDS[i];
        const y0 = yAt(b.at);
        const y1 = yAt(FLIGHT_BANDS[i + 1]?.at ?? top);
        ctx.fillStyle = `${RARITY_COLOR[b.rarity]}${bandAt(h) === b.rarity && h > 1 ? '40' : '1c'}`;
        ctx.fillRect(0, y1, W, y0 - y1);
        ctx.fillStyle = `${RARITY_COLOR[b.rarity]}cc`;
        ctx.font = `12px 'Jersey 15', monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(RARITY_LABEL[b.rarity].toUpperCase(), W - 8, y1 + 13);
      }
      const now = performance.now() / 600;
      ctx.fillStyle = '#2c6b78';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let px = 0; px <= W; px += 8) ctx.lineTo(px, H - 22 + Math.sin(px / 22 + now) * 3);
      ctx.lineTo(W, H);
      ctx.fill();
      const fx = 30 + x * (W * 0.55);
      const fy = yAt(h);
      if (burst > 0 && prize) {
        // The fish has become the prize: a ring of light and the prize's picture.
        ctx.strokeStyle = RARITY_COLOR[prize.rarity];
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, 1 - burst);
        ctx.beginPath();
        ctx.arc(fx, fy, 20 + burst * 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fish.complete && fish.naturalWidth) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-0.6 + x * 0.9);
        ctx.drawImage(fish, -26, -26, 52, 52);
        ctx.restore();
      }
    };
    fish.onload = () => draw(1, 0, 0, null);
    fish.src = icon('fish-mackerel');
    requestAnimationFrame(() => {
      size();
      draw(1, 0, 0, null);
    });
    body.append(
      goButton('Launch a fish', (got) => {
        const peak = peakFor(got.prize.rarity, Math.random);
        // Longer in the air the higher it goes; a drum roll as it nears a rare band.
        const up = quick() ? 600 : 1400 + Math.log(peak) * 900;
        s.audio.play('splash', { volume: 0.5 });
        if (!quick() && RARITIES.indexOf(got.prize.rarity) >= 3) s.audio.roll(up / 1000);
        const t0 = performance.now();
        let band = 'common';
        const step = (now: number): void => {
          const t = Math.min(1, (now - t0) / up);
          const e = 1 - Math.pow(1 - t, 2.2);
          const h = Math.exp(Math.log(peak) * e);
          draw(h, e, 0, got.prize);
          const b = bandAt(h);
          if (b !== band) {
            band = b;
            s.audio.tone(660 + RARITIES.indexOf(b) * 140, 0, 0.2, 'triangle', 0.12);
            for (const c of ladder.children) (c as HTMLElement).classList.toggle('on', (c as HTMLElement).dataset.r === b);
          }
          if (t < 1) requestAnimationFrame(step);
          else pop(h);
        };
        const pop = (h: number): void => {
          const p0 = performance.now();
          const burst = (now: number): void => {
            const k = Math.min(1, (now - p0) / 500);
            draw(h, 1, k, got.prize);
            if (k < 1) requestAnimationFrame(burst);
            else {
              for (const c of ladder.children) (c as HTMLElement).classList.toggle('on', (c as HTMLElement).dataset.r === got.prize.rarity);
              reveal(got);
            }
          };
          requestAnimationFrame(burst);
        };
        requestAnimationFrame(step);
      }),
    );
  }

  // ---------- Scratch ----------
  function scratch(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', `A card of nine prizes under silver. Scratch it off and find the three that match: that one is yours. Scratched ${save.tickets.played}.`));
    body.append(el('div', 'scratch-art', `<img src="${icon('ticket-lucky')}" alt="">`));
    const b = el('button', 'big-btn casino-go', `Buy a card · ${cost}`);
    b.onclick = () => {
      if (busy) return;
      buyCard(app, s, fanfare, () => {
        refreshPurse();
        sheet.refresh();
      });
      refreshPurse();
    };
    body.append(b);
  }

  const sheet: Sheet = new Sheet(
    app,
    'The Lucky Gull',
    (body, tab) => {
      refreshPurse();
      body.append(purseEl, oddsRow());
      if (tab === 'Wheel') wheel(body);
      else if (tab === 'Slots') slots(body);
      else if (tab === 'Flying Fish') flying(body);
      else scratch(body);
      prizeGrid(body, s);
    },
    ['Wheel', 'Slots', 'Flying Fish', 'Scratch'],
  );
  sheet.root.classList.add('casino');
  // Mid-show, the tabs wait: switching would strand the show's buttons.
  sheet.lock = () => busy;
  // The prize was given when the pearl went in: closing mid-show only skips the show.
  const prevClose = sheet.close.bind(sheet);
  sheet.close = () => {
    busy = false;
    s.hud.hold = false;
    prevClose();
  };
  return sheet;
}
