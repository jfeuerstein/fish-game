// The Lucky Gull: the arcade booth on the plaza. Five games in one dark sheet: the Gull Wheel (a
// strip of crabs, shells and one gull that slides past a marker), the Bait Bandit (three reels),
// Flying Fish (cash out before the gull snatches it), the token chests and the scratch tickets.
// The odds and payouts are in game/arcade.ts; this is only the show.
import { rng } from '../core/rng';
import { type Pocket, type Reel, STAKES, THREE_PAYS, WHEEL, WHEEL_PAYS, flightAt, grandness, reelStrip, snatchPoint, spinSlots, spinWheel, wheelPayout, wheelStrip } from '../game/arcade';
import { spend } from '../game/progress';
import type { Session } from '../game/session';
import { TICKETS } from '../game/tickets';
import { chestBusy, chestList, spinChest } from './chests';
import type { Fanfare } from './fanfare';
import { el, icon } from './hud';
import { buyTicket } from './scratch';
import { Sheet } from './sheet';

/** What the arcade needs besides the session: somewhere to celebrate, and the gull to react. */
export interface ArcadeHooks {
  fanfare: Fanfare;
  /** The gull by the booth: pleased (the player lost) or astonished (a big win). */
  gull(mood: 'smug' | 'shocked'): void;
  /** The player's character cheers. */
  cheer(): void;
}

const POCKET_PIC: Record<Pocket, string> = { crab: 'fish-crab', mussel: 'shell', gull: 'gull' };
const POCKET_NAME: Record<Pocket, string> = { crab: 'Crab', mussel: 'Shell', gull: 'Gull' };
const REEL_PIC: Record<Reel, string> = { worm: 'bait-worm', bobber: 'bobber', shell: 'shell', fish: 'fish-mackerel', boot: 'fish-boot', gold: 'fish-golden-trout', pearl: 'token' };
const SMUG = ['The gull pockets it.', 'The gull looks very pleased with itself.', 'Somewhere, a gull is laughing.', 'House rules. The house is a gull.', 'The gull does a little dance.'];
const quick = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function arcadeSheet(app: HTMLElement, s: Session, hooks: ArcadeHooks): Sheet {
  const save = s.save;
  const { fanfare } = hooks;
  let stakeAt = 1;
  let busy = false;
  const stake = (): number => STAKES[stakeAt];

  /** The stake: fewer and more, and how much is in the purse. */
  const stakeRow = (body: HTMLElement): HTMLElement => {
    const row = el('div', 'stake');
    const less = el('button', 'stake-step', '−');
    const more = el('button', 'stake-step', '+');
    const v = el('div', 'stake-v');
    const show = (): void => {
      v.innerHTML = `<span class="eyebrow">Stake</span><b><img src="${icon('coin')}" alt="">${stake().toLocaleString()}</b>`;
      less.disabled = stakeAt === 0 || busy;
      more.disabled = stakeAt === STAKES.length - 1 || busy;
    };
    less.onclick = () => {
      stakeAt = Math.max(0, stakeAt - 1);
      show();
    };
    more.onclick = () => {
      stakeAt = Math.min(STAKES.length - 1, stakeAt + 1);
      show();
    };
    show();
    row.append(less, v, more);
    body.append(row);
    return row;
  };

  const purse = (): string => `<div class="purse"><span><img src="${icon('coin')}" alt="">${save.coins.toLocaleString()}</span><span><b class="pearl"></b>${save.tokens}</span></div>`;

  const settle = (won: number, staked: number, tokens: number): void => {
    save.arcade.played++;
    save.arcade.best = Math.max(save.arcade.best, won - staked);
    s.changed();
    s.hud.hold = false;
    if (won <= 0 && tokens <= 0) {
      fanfare.lose();
      hooks.gull('smug');
      s.hud.toast(pick(SMUG));
    } else if (grandness(won, staked, tokens) === 'huge' || grandness(won, staked, tokens) === 'jackpot') {
      hooks.gull('shocked');
      hooks.cheer();
    }
  };

  // ---------- The Gull Wheel ----------
  const TILE = 76;
  function wheel(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'Bet on the crabs or the shells to double up, or the gull for fourteen times your stake and a token per hundred. One gull in fifteen.'));
    const hist = el('div', 'wheel-hist');
    const drawHist = (): void => {
      hist.innerHTML = save.arcade.wheel.map((i) => `<i class="pk-${WHEEL[i]}"></i>`).join('');
    };
    drawHist();
    const win = el('div', 'wheel-window');
    const track = el('div', 'wheel-track');
    const N = 90;
    const STOP = 80;
    const fill = (tiles: number[]): void => {
      track.innerHTML = '';
      for (const i of tiles) track.append(el('div', `wheel-tile pk-${WHEEL[i]}`, `<img src="${icon(POCKET_PIC[WHEEL[i]])}" alt="">`));
    };
    fill(wheelStrip(save.arcade.wheel.at(-1) ?? 0, N, STOP));
    const centre = (): number => (win.clientWidth || 360) / 2;
    track.style.transform = `translateX(${-(STOP * TILE + TILE / 2 - centre())}px)`;
    win.append(track, el('div', 'wheel-marker'));
    body.append(hist, win);
    stakeRow(body);
    const bets = el('div', 'wheel-bets');
    for (const on of ['crab', 'gull', 'mussel'] as Pocket[]) {
      const b = el('button', `wheel-bet pk-${on}`, `<img src="${icon(POCKET_PIC[on])}" alt=""><span>${POCKET_NAME[on]}</span><b>×${WHEEL_PAYS[on]}</b>`);
      b.disabled = busy;
      b.onclick = () => spin(on);
      bets.append(b);
    }
    body.append(bets);
    const out = el('div', 'casino-out');
    body.append(out);

    function spin(on: Pocket): void {
      if (busy) return;
      const st = stake();
      if (!spend(save, st)) {
        s.hud.toast("You can't cover that stake.");
        return;
      }
      busy = true;
      for (const b of bets.children) (b as HTMLButtonElement).disabled = true;
      const result = spinWheel(rng((Date.now() ^ (save.arcade.played * 2654435761)) >>> 0));
      const pocket = WHEEL[result];
      const pay = wheelPayout(on, st, pocket);
      // Paid now: closing the game mid-spin loses nothing.
      save.coins += pay.coins;
      save.tokens += pay.tokens;
      save.arcade.wheel = [...save.arcade.wheel, result].slice(-14);
      s.hud.hold = true;
      s.changed();
      fill(wheelStrip(result, N, STOP));
      out.className = 'casino-out';
      out.textContent = `${st.toLocaleString()} on the ${POCKET_NAME[on].toLowerCase()}…`;
      const c = centre();
      const from = 6 * TILE + TILE / 2 - c;
      const to = STOP * TILE + (0.15 + Math.random() * 0.7) * TILE - c;
      const dur = quick() ? 700 : 5200;
      const t0 = performance.now();
      let lastTile = -1;
      const ease = (t: number): number => 1 - Math.pow(1 - t, 4);
      const step = (now: number): void => {
        const t = Math.min(1, (now - t0) / dur);
        const x = from + (to - from) * ease(t);
        track.style.transform = `translateX(${-x}px)`;
        const tile = Math.floor((x + c) / TILE);
        if (tile !== lastTile) {
          lastTile = tile;
          s.audio.tick(t);
        }
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
      function done(): void {
        busy = false;
        track.children[STOP]?.classList.add('win');
        drawHist();
        for (const b of bets.children) (b as HTMLButtonElement).disabled = false;
        if (pay.coins) {
          out.className = 'casino-out good';
          out.innerHTML = `${POCKET_NAME[pocket]}! <b>+${pay.coins.toLocaleString()}</b>${pay.tokens ? ` and <b>${pay.tokens} token${pay.tokens > 1 ? 's' : ''}</b>` : ''}`;
          const level = on === 'gull' ? (pay.tokens >= 3 ? 'jackpot' : 'huge') : st >= 250 ? 'big' : 'small';
          fanfare.win(level, on === 'gull' ? 'GULL!' : 'DOUBLED!', `+${pay.coins.toLocaleString()} coins${pay.tokens ? ` · +${pay.tokens} tokens` : ''}`, on === 'gull' ? '#ecc77d' : on === 'crab' ? '#e0735a' : '#7cc2c6');
        } else {
          out.className = 'casino-out bad';
          out.textContent = `${POCKET_NAME[pocket]}. Not this time.`;
        }
        settle(pay.coins, st, pay.tokens);
        purseEl.innerHTML = purse();
      }
    }
  }

  // ---------- The Bait Bandit ----------
  const CELL = 84;
  function slots(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'Three alike pays big; two golden fish pay six times, one gives your stake back. Two shells or fish double it. Pearls pay tokens when the stake is 50 or more.'));
    const machine = el('div', 'slots');
    const reels: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const w = el('div', 'reel');
      const strip = el('div', 'reel-strip');
      strip.innerHTML = ['worm', 'gold', 'shell'].map((k) => `<div class="reel-cell"><img src="${icon(REEL_PIC[k as Reel])}" alt=""></div>`).join('');
      strip.style.transform = `translateY(${-CELL * 0.5}px)`;
      w.append(strip);
      machine.append(w);
      reels.push(strip);
    }
    machine.append(el('div', 'payline'));
    body.append(machine);
    stakeRow(body);
    const pull = el('button', 'big-btn casino-go', 'Pull the lever');
    pull.disabled = busy;
    body.append(pull);
    const out = el('div', 'casino-out');
    body.append(out);
    const table = el('div', 'paytable');
    table.innerHTML = (['gold', 'fish', 'shell', 'bobber', 'worm', 'boot'] as Reel[])
      .map((k) => `<div><span>${`<img src="${icon(REEL_PIC[k])}" alt="">`.repeat(3)}</span><b>×${THREE_PAYS[k]}</b></div>`)
      .join('') + `<div><span>${`<img src="${icon('token')}" alt="">`.repeat(3)}</span><b>6 tokens</b></div>`;
    body.append(el('div', 'section', 'Pays'), table);

    pull.onclick = () => {
      if (busy) return;
      const st = stake();
      if (!spend(save, st)) {
        s.hud.toast("You can't cover that stake.");
        return;
      }
      busy = true;
      pull.disabled = true;
      const res = spinSlots(st, rng((Date.now() ^ (save.arcade.played * 40503)) >>> 0));
      save.coins += res.coins;
      save.tokens += res.tokens;
      s.hud.hold = true;
      s.changed();
      s.audio.play('cast', { volume: 0.4, rate: 0.8 });
      out.className = 'casino-out';
      out.textContent = '';
      // Two alike on the first reels: the last one teases, slower, with a drum roll.
      const tease = res.reels[0] === res.reels[1];
      const durs = quick() ? [400, 600, 800] : [1300, 1900, tease ? 3900 : 2500];
      if (tease && !quick()) setTimeout(() => {
        reels[2].parentElement!.classList.add('tease');
        s.audio.roll(1.9);
      }, 1900);
      let stopped = 0;
      res.reels.forEach((r, i) => {
        const len = 22 + i * 8 + (i === 2 && tease ? 12 : 0);
        const strip = reelStrip(r, len, Date.now() + i * 77);
        const el_ = reels[i];
        el_.innerHTML = strip.map((k) => `<div class="reel-cell"><img src="${icon(REEL_PIC[k])}" alt=""></div>`).join('') + `<div class="reel-cell"><img src="${icon(REEL_PIC.worm)}" alt=""></div>`;
        const end = (len - 1) * CELL - CELL * 0.5;
        const t0 = performance.now();
        let lastCell = -1;
        const step = (now: number): void => {
          const t = Math.min(1, (now - t0) / durs[i]);
          // Eases out with a small bounce past the line and back.
          const e = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 3.6) : 1;
          const y = e * end;
          el_.style.transform = `translateY(${-y}px)`;
          const cell = Math.floor(y / CELL);
          if (cell !== lastCell && t < 0.9) {
            lastCell = cell;
            if (i === 2) s.audio.tick(t * 0.5);
          }
          if (t < 1) requestAnimationFrame(step);
          else {
            s.audio.play('click', { volume: 0.5, rate: 0.7 });
            if (++stopped === 3) done();
          }
        };
        requestAnimationFrame(step);
      });
      function done(): void {
        busy = false;
        pull.disabled = false;
        reels[2].parentElement!.classList.remove('tease');
        const level = res.kind === 'jackpot' ? 'jackpot' : grandness(res.coins, st, res.tokens);
        if (res.coins || res.tokens) {
          out.className = 'casino-out good';
          out.innerHTML = res.kind === 'boots' ? `Three boots! A matching pair… and a spare. <b>+${res.coins.toLocaleString()}</b>` : `<b>+${res.coins.toLocaleString()}</b>${res.tokens ? ` and <b>${res.tokens} token${res.tokens > 1 ? 's' : ''}</b>` : ''}`;
          if (res.coins > st || res.tokens) {
            machine.classList.add('lit');
            setTimeout(() => machine.classList.remove('lit'), 1600);
            fanfare.win(level, res.kind === 'jackpot' ? 'JACKPOT!' : res.kind === 'boots' ? 'BOOTS!' : level === 'huge' ? 'BIG WIN!' : 'WIN!', `+${res.coins.toLocaleString()} coins${res.tokens ? ` · +${res.tokens} tokens` : ''}`);
          }
        } else {
          out.className = 'casino-out bad';
          out.textContent = 'Nothing lines up.';
        }
        settle(res.coins, st, res.tokens);
        purseEl.innerHTML = purse();
      }
    };
  }

  // ---------- Flying Fish ----------
  let flight: { stake: number; at: number; snatch: number; t0: number; cashed: boolean; raf: number } | null = null;
  function flying(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', 'The fish leaps and the prize climbs. Cash out before the gull swoops in and snatches it.'));
    const hist = el('div', 'flight-hist');
    const drawHist = (): void => {
      hist.innerHTML = save.arcade.flights.map((m) => `<i class="${m >= 2 ? 'hi' : m < 1.2 ? 'lo' : ''}">${m.toFixed(2)}×</i>`).join('');
    };
    drawHist();
    const sky = el('canvas', 'flight-sky');
    body.append(hist, sky);
    const stakeEl = stakeRow(body);
    const go = el('button', 'big-btn casino-go', 'Launch');
    body.append(go);
    const out = el('div', 'casino-out');
    body.append(out);
    const fish = new Image();
    fish.onload = () => draw(flight ? flightAt((performance.now() - flight.t0) / 1000) : 1, false);
    fish.src = icon('fish-mackerel');
    const gull = new Image();
    gull.src = icon('gull');
    const ctx = sky.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = (): void => {
      sky.width = (sky.clientWidth || 360) * dpr;
      sky.height = 230 * dpr;
    };
    let swoop = 0;
    const draw = (m: number, lost: boolean): void => {
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
      // A faint grid of multipliers, like a chart.
      ctx.strokeStyle = 'rgba(244,238,227,0.07)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (H * i) / 5);
        ctx.lineTo(W, (H * i) / 5);
        ctx.stroke();
      }
      // The sea.
      const now = performance.now() / 600;
      ctx.fillStyle = '#2c6b78';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 26 + Math.sin(x / 22 + now) * 3);
      ctx.lineTo(W, H);
      ctx.fill();
      // The fish's arc: further and higher as the prize grows.
      const k = Math.min(1, Math.log(m) / Math.log(12));
      const fx = 34 + k * (W - 90);
      const fy = H - 40 - Math.pow(k, 0.7) * (H - 90);
      ctx.strokeStyle = lost ? 'rgba(214,90,60,0.6)' : 'rgba(236,199,125,0.7)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(20, H - 28);
      ctx.quadraticCurveTo(fx * 0.55, H - 30, fx, fy);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!lost || swoop < 1) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-0.5 + Math.sin(now * 3) * 0.12);
        ctx.drawImage(fish, -26, -26, 52, 52);
        ctx.restore();
      }
      if (lost) {
        // The gull comes down from the corner and carries the fish off.
        swoop = Math.min(2, swoop + 0.05);
        const a = Math.min(1, swoop);
        const gx = W + 40 + (fx - W - 40) * a + (swoop > 1 ? (swoop - 1) * 220 : 0);
        const gy = -40 + (fy - 10 + 40) * a - (swoop > 1 ? (swoop - 1) * 180 : 0);
        ctx.drawImage(gull, gx - 34, gy - 34, 68, 68);
        if (swoop > 1) ctx.drawImage(fish, gx - 18, gy + 10, 36, 36);
      }
      ctx.fillStyle = lost ? '#e0735a' : '#f4eee3';
      ctx.font = `600 ${44}px 'Fraunces Variable', Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${m.toFixed(2)}×`, W / 2, 62);
      if (lost) {
        ctx.font = `800 11px 'Manrope Variable', sans-serif`;
        ctx.fillStyle = 'rgba(244,238,227,0.8)';
        ctx.fillText('SNATCHED', W / 2, 84);
      }
    };
    requestAnimationFrame(() => {
      size();
      draw(flight ? flightAt((performance.now() - flight.t0) / 1000) : 1, false);
    });

    const cashOut = (): void => {
      if (!flight || flight.cashed) return;
      const m = Math.min(flight.snatch, flightAt((performance.now() - flight.t0) / 1000));
      flight.cashed = true;
      const won = Math.floor(flight.stake * m);
      save.coins += won;
      out.className = 'casino-out good';
      out.innerHTML = `Cashed out at ${m.toFixed(2)}×: <b>+${won.toLocaleString()}</b>`;
      fanfare.win(grandness(won, flight.stake), m >= 10 ? 'SKY HIGH!' : 'CASHED OUT!', `${m.toFixed(2)}× · +${won.toLocaleString()} coins`, '#7cc2c6');
      settle(won, flight.stake, 0);
      purseEl.innerHTML = purse();
    };
    const land = (): void => {
      if (!flight) return;
      save.arcade.flights = [...save.arcade.flights, flight.snatch].slice(-10);
      s.changed();
      flight = null;
      busy = false;
      go.textContent = 'Launch';
      go.className = 'big-btn casino-go';
      for (const b of stakeEl.querySelectorAll('button')) (b as HTMLButtonElement).disabled = false;
      drawHist();
    };
    go.onclick = () => {
      if (flight && !flight.cashed) {
        cashOut();
        go.textContent = 'Watching…';
        go.disabled = true;
        return;
      }
      if (busy) return;
      const st = stake();
      if (!spend(save, st)) {
        s.hud.toast("You can't cover that stake.");
        return;
      }
      s.hud.hold = true;
      s.changed();
      busy = true;
      swoop = 0;
      for (const b of stakeEl.querySelectorAll('button')) (b as HTMLButtonElement).disabled = true;
      flight = { stake: st, at: 1, snatch: snatchPoint(Math.random), t0: performance.now(), cashed: false, raf: 0 };
      out.className = 'casino-out';
      out.textContent = '';
      go.className = 'big-btn casino-go cash';
      s.audio.play('splash', { volume: 0.5 });
      const step = (): void => {
        if (!flight) return;
        const m = flightAt((performance.now() - flight.t0) / 1000);
        if (m >= flight.snatch) {
          draw(flight.snatch, true);
          if (!flight.cashed) {
            out.className = 'casino-out bad';
            out.textContent = `The gull snatched it at ${flight.snatch.toFixed(2)}×!`;
            s.audio.squawk();
            settle(0, flight.stake, 0);
            purseEl.innerHTML = purse();
          }
          go.disabled = true;
          // Let the gull fly off before the next go.
          const t = performance.now();
          const after = (): void => {
            draw(flight?.snatch ?? 1, true);
            if (performance.now() - t < 1200) requestAnimationFrame(after);
            else {
              go.disabled = false;
              land();
            }
          };
          after();
          return;
        }
        draw(m, false);
        if (!flight.cashed) go.innerHTML = `Cash out <span>${Math.floor(flight.stake * m).toLocaleString()}</span>`;
        if (Math.floor(m * 10) !== Math.floor(flight.at * 10)) s.audio.tick(Math.min(1, m / 10));
        flight.at = m;
        flight.raf = requestAnimationFrame(step);
      };
      step();
    };
  }

  // ---------- Chests and tickets ----------
  function chests(body: HTMLElement): void {
    chestList(body, s, chestBusy, (c) => spinChest(app, s, fanfare, c, () => sheet.refresh()));
  }
  function tickets(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', `Scratch off three alike to win. Played ${save.tickets.played}, best win ${save.tickets.best.toLocaleString()}.`));
    for (const k of TICKETS) {
      const row = el('div', 'row');
      row.innerHTML = `<img src="${icon(`ticket-${k.id}`)}" alt=""><div class="grow"><div class="title">${k.name}</div><div class="sub">${k.blurb}</div><div class="sub">Crown pays ${((2500 * k.price) / 25).toLocaleString()}</div></div>`;
      const b = el('button', 'btn coral', `<span class="price"><img src="${icon('coin')}" alt="">${k.price}</span>`);
      b.onclick = () => buyTicket(app, s, fanfare, k, () => sheet.refresh());
      row.append(b);
      body.append(row);
    }
  }

  const purseEl = el('div');
  const sheet: Sheet = new Sheet(
    app,
    'The Lucky Gull',
    (body, tab) => {
      purseEl.innerHTML = purse();
      body.append(purseEl);
      if (tab === 'Wheel') wheel(body);
      else if (tab === 'Slots') slots(body);
      else if (tab === 'Flying Fish') flying(body);
      else if (tab === 'Chests') chests(body);
      else tickets(body);
    },
    ['Wheel', 'Slots', 'Flying Fish', 'Chests', 'Tickets'],
  );
  sheet.root.classList.add('casino');
  // A fish in the air when the sheet is closed is cashed out where it is: nothing is lost by walking off.
  const prevClose = sheet.close.bind(sheet);
  sheet.close = () => {
    if (flight && !flight.cashed) {
      const m = Math.min(flight.snatch, flightAt((performance.now() - flight.t0) / 1000));
      if (m < flight.snatch) {
        flight.cashed = true;
        const won = Math.floor(flight.stake * m);
        save.coins += won;
        s.hud.toast(`Cashed out at ${m.toFixed(2)}× as you left: +${won}`, 'good');
        settle(won, flight.stake, 0);
      }
      cancelAnimationFrame(flight.raf);
      save.arcade.flights = [...save.arcade.flights, flight.snatch].slice(-10);
      flight = null;
    }
    busy = false;
    s.hud.hold = false;
    prevClose();
  };
  return sheet;
}
