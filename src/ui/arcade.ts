// The Lucky Gull: the arcade booth on the plaza. Everything here costs pearls, the premium
// currency from the rarest catches, and pays out cosmetics: the Gull Wheel (a strip of shells,
// crabs and one gull sliding past a marker; bet on one), the Bait Bandit (three reels), Flying Fish
// (the prize grows rarer the higher the fish flies; cash out before the gull snatches it), the
// chests and the scratch tickets. The odds are in game/arcade.ts; this is only the show.
import { rng } from '../core/rng';
import { FLIGHT_COST, FLIGHT_TIERS, POCKET_PRIZE, type Pocket, REEL_PRIZE, type Reel, SLOTS_COST, WHEEL, WHEEL_COST, flightAt, flightPrize, nextTier, reelStrip, snatchPoint, spinSlots, spinWheel, wheelPrize, wheelStrip } from '../game/arcade';
import { RARITY_COLOR, RARITY_LABEL, type Rarity } from '../game/crates';
import type { Session } from '../game/session';
import { TICKETS } from '../game/tickets';
import { chestBusy, chestList, showPrize, spinChest, winPrize } from './chests';
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

const POCKET_PIC: Record<Pocket, string> = { shell: 'shell', crab: 'fish-crab', gull: 'gull' };
const POCKET_NAME: Record<Pocket, string> = { shell: 'Shell', crab: 'Crab', gull: 'Gull' };
const REEL_PIC: Record<Reel, string> = { worm: 'bait-worm', bobber: 'bobber', fish: 'fish-mackerel', gold: 'fish-golden-trout', crown: 'hat-crown', boot: 'fish-boot', pearl: 'token' };
const SMUG = ['The gull pockets your pearl.', 'The gull looks very pleased with itself.', 'Somewhere, a gull is laughing.', 'House rules. The house is a gull.', 'The gull does a little dance.'];
const quick = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const pearl = '<b class="pearl"></b>';
const tier = (r: Rarity): string => `<span class="tier" style="--rar:${RARITY_COLOR[r]}">${RARITY_LABEL[r]}</span>`;

export function arcadeSheet(app: HTMLElement, s: Session, hooks: ArcadeHooks): Sheet {
  const save = s.save;
  const { fanfare } = hooks;
  let busy = false;

  const purse = (): string => `<div class="purse"><span class="eyebrow">Your pearls</span><span>${pearl}${save.tokens}</span></div>`;
  const refreshPurse = (): void => {
    purseEl.innerHTML = purse();
  };
  /** Take the pearls a game costs, or say there are not enough. */
  const pay = (n: number): boolean => {
    if (save.tokens < n) {
      s.hud.toast('Not enough pearls. Golden, prismatic and legendary fish bring them.');
      return false;
    }
    save.tokens -= n;
    save.arcade.played++;
    s.audio.play('chip', { volume: 0.8 });
    s.hud.hold = true;
    s.changed();
    refreshPurse();
    return true;
  };
  /** A prize was won: the card comes up, and the gull is astonished at the rare ones. */
  const celebrate = (got: ReturnType<typeof winPrize>): void => {
    save.arcade.best++;
    if (got.prize.rarity === 'epic' || got.prize.rarity === 'legendary') {
      hooks.gull('shocked');
      hooks.cheer();
    }
    showPrize(app, s, fanfare, got, refreshPurse);
  };
  /** A game ended: the prize card if something was won, the gull's gloating if not. */
  const end = (won: Rarity | null, pearlsBack = 0, note = ''): void => {
    s.hud.hold = false;
    if (pearlsBack) {
      save.tokens += pearlsBack;
      s.hud.toast(`${note ? `${note} ` : ''}+${pearlsBack} pearl${pearlsBack > 1 ? 's' : ''}.`, 'gold');
    }
    if (won) celebrate(winPrize(s, won));
    else if (!pearlsBack) {
      fanfare.lose();
      hooks.gull('smug');
      s.hud.toast(pick(SMUG));
    }
    s.changed();
    refreshPurse();
  };

  // ---------- The Gull Wheel ----------
  const TILE = 76;
  function wheel(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', `Pick a pocket and spin. Land on it and win a prize that rare. ${WHEEL_COST} pearl a spin.`));
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
    const bets = el('div', 'wheel-bets');
    for (const on of ['shell', 'crab', 'gull'] as Pocket[]) {
      const n = WHEEL.filter((p) => p === on).length;
      const b = el('button', `wheel-bet pk-${on}`, `<img src="${icon(POCKET_PIC[on])}" alt=""><span>${POCKET_NAME[on]}</span>${tier(POCKET_PRIZE[on])}<small>${n} in ${WHEEL.length}</small>`);
      b.disabled = busy;
      b.onclick = () => spin(on);
      bets.append(b);
    }
    body.append(bets);
    const out = el('div', 'casino-out');
    body.append(out);

    function spin(on: Pocket): void {
      if (busy || !pay(WHEEL_COST)) return;
      busy = true;
      for (const b of bets.children) (b as HTMLButtonElement).disabled = true;
      const result = spinWheel(rng((Date.now() ^ (save.arcade.played * 2654435761)) >>> 0));
      const pocket = WHEEL[result];
      const prize = wheelPrize(on, pocket);
      save.arcade.wheel = [...save.arcade.wheel, result].slice(-14);
      // Won now, so closing the game mid-spin loses nothing; the strip only shows it.
      const got = prize ? winPrize(s, prize) : null;
      s.changed();
      fill(wheelStrip(result, N, STOP));
      out.className = 'casino-out';
      out.textContent = `On the ${POCKET_NAME[on].toLowerCase()}…`;
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
        out.className = `casino-out ${got ? 'good' : 'bad'}`;
        out.textContent = got ? `${POCKET_NAME[pocket]}!` : `${POCKET_NAME[pocket]}. Not this time.`;
        if (got) {
          s.hud.hold = false;
          celebrate(got);
          refreshPurse();
        } else end(null);
      }
    }
  }

  // ---------- The Bait Bandit ----------
  const CELL = 84;
  function slots(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', `Two alike win a prize that rare; three alike, one rarer still. Three pearls give three back. ${SLOTS_COST} pearl a pull.`));
    const machine = el('div', 'slots');
    const reels: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const w = el('div', 'reel');
      const strip = el('div', 'reel-strip');
      strip.innerHTML = ['worm', 'crown', 'fish'].map((k) => `<div class="reel-cell"><img src="${icon(REEL_PIC[k as Reel])}" alt=""></div>`).join('');
      strip.style.transform = `translateY(${-CELL * 0.5}px)`;
      w.append(strip);
      machine.append(w);
      reels.push(strip);
    }
    machine.append(el('div', 'payline'));
    body.append(machine);
    const pull = el('button', 'big-btn casino-go', `Pull the lever · ${pearl}${SLOTS_COST}`);
    pull.disabled = busy;
    body.append(pull);
    const out = el('div', 'casino-out');
    body.append(out);
    const table = el('div', 'paytable');
    table.innerHTML =
      (['crown', 'gold', 'fish', 'bobber', 'worm'] as Reel[]).map((k) => `<div><span>${`<img src="${icon(REEL_PIC[k])}" alt="">`.repeat(2)}</span>${tier(k === 'crown' ? 'epic' : REEL_PRIZE[k]!)}</div>`).join('') +
      `<div><span>${`<img src="${icon('token')}" alt="">`.repeat(3)}</span><b>3 pearls</b></div>`;
    body.append(el('div', 'section', 'Two alike win'), table);

    pull.onclick = () => {
      if (busy || !pay(SLOTS_COST)) return;
      busy = true;
      pull.disabled = true;
      const res = spinSlots(rng((Date.now() ^ (save.arcade.played * 40503)) >>> 0));
      // Won now, so closing the game mid-spin loses nothing; the reels only show it.
      const got = res.prize ? winPrize(s, res.prize) : null;
      save.tokens += res.pearls;
      s.changed();
      s.audio.play('cast', { volume: 0.4, rate: 0.8 });
      out.className = 'casino-out';
      out.textContent = '';
      // Two alike on the first reels: the last one teases, slower, with a drum roll.
      const tease = res.reels[0] === res.reels[1] && res.reels[0] !== 'boot';
      const durs = quick() ? [400, 600, 800] : [1300, 1900, tease ? 3900 : 2500];
      if (tease && !quick())
        setTimeout(() => {
          reels[2].parentElement!.classList.add('tease');
          s.audio.roll(1.9);
        }, 1900);
      let stopped = 0;
      res.reels.forEach((r, i) => {
        const len = 22 + i * 8 + (i === 2 && tease ? 12 : 0);
        const strip = reelStrip(r, len, Date.now() + i * 77);
        const reel = reels[i];
        reel.innerHTML = strip.map((k) => `<div class="reel-cell"><img src="${icon(REEL_PIC[k])}" alt=""></div>`).join('') + `<div class="reel-cell"><img src="${icon(REEL_PIC.worm)}" alt=""></div>`;
        const endY = (len - 1) * CELL - CELL * 0.5;
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
            if (++stopped === 3) done();
          }
        };
        requestAnimationFrame(step);
      });
      function done(): void {
        busy = false;
        pull.disabled = false;
        reels[2].parentElement!.classList.remove('tease');
        if (res.prize || res.pearls) {
          machine.classList.add('lit');
          setTimeout(() => machine.classList.remove('lit'), 1600);
        }
        out.className = `casino-out ${res.prize || res.pearls ? 'good' : 'bad'}`;
        out.innerHTML = res.kind === 'boots' ? 'Three boots! A matching pair… and a spare.' : res.kind === 'pearls' ? 'Three pearls!' : res.prize ? `${res.kind === 'pair' ? 'Two alike' : 'Three alike'}: ${tier(res.prize)}` : 'Nothing lines up.';
        s.hud.hold = false;
        if (res.pearls) s.hud.toast(`${res.kind === 'boots' ? 'The gull is embarrassed for you. ' : ''}+${res.pearls} pearl${res.pearls > 1 ? 's' : ''}.`, 'gold');
        if (got) celebrate(got);
        else if (!res.pearls) end(null);
        refreshPurse();
      }
    };
  }

  // ---------- Flying Fish ----------
  let flight: { at: number; snatch: number; t0: number; cashed: boolean; raf: number } | null = null;
  function flying(body: HTMLElement): void {
    body.append(el('p', 'casino-blurb', `The fish leaps, and the prize grows rarer the higher it flies. Cash out before the gull swoops in. ${FLIGHT_COST} pearl a flight.`));
    const ladder = el('div', 'flight-ladder');
    ladder.innerHTML = FLIGHT_TIERS.map((t) => `<span style="--rar:${RARITY_COLOR[t.rarity]}"><b>${t.at}×</b>${RARITY_LABEL[t.rarity]}</span>`).join('');
    const hist = el('div', 'flight-hist');
    const drawHist = (): void => {
      hist.innerHTML = save.arcade.flights.map((m) => `<i class="${m >= 3.5 ? 'hi' : m < 1.4 ? 'lo' : ''}">${m.toFixed(2)}×</i>`).join('');
    };
    drawHist();
    const sky = el('canvas', 'flight-sky');
    body.append(hist, sky, ladder);
    const go = el('button', 'big-btn casino-go', `Launch · ${pearl}${FLIGHT_COST}`);
    body.append(go);
    const out = el('div', 'casino-out');
    body.append(out);
    const fish = new Image();
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
      // The tiers as faint lines, coloured by rarity.
      const k = (x: number): number => Math.min(1, Math.log(x) / Math.log(24));
      const yAt = (x: number): number => H - 40 - Math.pow(k(x), 0.7) * (H - 90);
      ctx.lineWidth = 1;
      for (const t of FLIGHT_TIERS) {
        ctx.strokeStyle = `${RARITY_COLOR[t.rarity]}55`;
        ctx.beginPath();
        ctx.moveTo(0, yAt(t.at));
        ctx.lineTo(W, yAt(t.at));
        ctx.stroke();
      }
      const now = performance.now() / 600;
      ctx.fillStyle = '#2c6b78';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 26 + Math.sin(x / 22 + now) * 3);
      ctx.lineTo(W, H);
      ctx.fill();
      const fx = 34 + k(m) * (W - 90);
      const fy = yAt(m);
      ctx.strokeStyle = lost ? 'rgba(214,90,60,0.6)' : 'rgba(236,199,125,0.7)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(20, H - 28);
      ctx.quadraticCurveTo(fx * 0.55, H - 30, fx, fy);
      ctx.stroke();
      ctx.setLineDash([]);
      if (fish.complete && (!lost || swoop < 1)) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-0.5 + Math.sin(now * 3) * 0.12);
        ctx.drawImage(fish, -26, -26, 52, 52);
        ctx.restore();
      }
      if (lost && gull.complete) {
        // The gull comes down from the corner and carries the fish off.
        swoop = Math.min(2, swoop + 0.05);
        const a = Math.min(1, swoop);
        const gx = W + 40 + (fx - W - 40) * a + (swoop > 1 ? (swoop - 1) * 220 : 0);
        const gy = -40 + (fy - 10 + 40) * a - (swoop > 1 ? (swoop - 1) * 180 : 0);
        ctx.drawImage(gull, gx - 34, gy - 34, 68, 68);
        if (swoop > 1) ctx.drawImage(fish, gx - 18, gy + 10, 36, 36);
      }
      const reached = flightPrize(m);
      ctx.textAlign = 'center';
      ctx.fillStyle = lost ? '#e0735a' : '#f4eee3';
      ctx.font = `600 44px 'Fraunces Variable', Georgia, serif`;
      ctx.fillText(`${m.toFixed(2)}×`, W / 2, 58);
      ctx.font = `800 11px 'Manrope Variable', sans-serif`;
      if (lost) {
        ctx.fillStyle = 'rgba(244,238,227,0.85)';
        ctx.fillText('SNATCHED', W / 2, 80);
      } else {
        ctx.fillStyle = reached ? RARITY_COLOR[reached] : 'rgba(244,238,227,0.6)';
        const next = nextTier(m);
        ctx.fillText(reached ? `${RARITY_LABEL[reached].toUpperCase()} PRIZE${next ? `  ·  ${RARITY_LABEL[next.rarity].toUpperCase()} AT ${next.at}×` : ''}` : `${RARITY_LABEL.common.toUpperCase()} AT ${FLIGHT_TIERS[0].at}×`, W / 2, 80);
      }
    };
    fish.onload = () => draw(flight ? flightAt((performance.now() - flight.t0) / 1000) : 1, false);
    fish.src = icon('fish-mackerel');
    requestAnimationFrame(() => {
      size();
      draw(flight ? flightAt((performance.now() - flight.t0) / 1000) : 1, false);
    });

    const cashOut = (): void => {
      if (!flight || flight.cashed) return;
      const m = Math.min(flight.snatch, flightAt((performance.now() - flight.t0) / 1000));
      flight.cashed = true;
      const won = flightPrize(m);
      out.className = 'casino-out good';
      out.innerHTML = won ? `Cashed out at ${m.toFixed(2)}×: ${tier(won)}` : `Cashed out at ${m.toFixed(2)}×, too low for a prize.`;
      end(won, won ? 0 : FLIGHT_COST, won ? '' : 'Too low for a prize:');
    };
    const land = (): void => {
      if (!flight) return;
      save.arcade.flights = [...save.arcade.flights, flight.snatch].slice(-10);
      s.changed();
      flight = null;
      busy = false;
      go.innerHTML = `Launch · ${pearl}${FLIGHT_COST}`;
      go.className = 'big-btn casino-go';
      go.disabled = false;
      drawHist();
    };
    go.onclick = () => {
      if (flight && !flight.cashed) {
        cashOut();
        go.textContent = 'Watching…';
        go.disabled = true;
        return;
      }
      if (busy || !pay(FLIGHT_COST)) return;
      busy = true;
      swoop = 0;
      flight = { at: 1, snatch: snatchPoint(Math.random), t0: performance.now(), cashed: false, raf: 0 };
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
            end(null);
          }
          go.disabled = true;
          go.textContent = flight.cashed ? 'Watching…' : 'Snatched!';
          // Let the gull fly off before the next go.
          const t = performance.now();
          const after = (): void => {
            draw(flight?.snatch ?? 1, true);
            if (performance.now() - t < 1200) requestAnimationFrame(after);
            else land();
          };
          after();
          return;
        }
        draw(m, false);
        if (!flight.cashed) {
          const won = flightPrize(m);
          go.innerHTML = won ? `Cash out ${tier(won)}` : 'Cash out <span>pearl back</span>';
        }
        if (Math.floor(m * 10) !== Math.floor(flight.at * 10)) s.audio.tick(Math.min(1, m / 10));
        if (flightPrize(m) !== flightPrize(flight.at)) s.audio.tone(880, 0, 0.18, 'triangle', 0.12);
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
    body.append(el('p', 'casino-blurb', `Scratch off three alike to win something to wear. Played ${save.tickets.played}.`));
    for (const k of TICKETS) {
      const row = el('div', 'row');
      row.innerHTML = `<img src="${icon(`ticket-${k.id}`)}" alt=""><div class="grow"><div class="title">${k.name}</div><div class="sub">${k.blurb}</div></div>`;
      const b = el('button', 'btn coral', `<span class="price">${pearl}${k.price}</span>`);
      b.disabled = save.tokens < k.price;
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
      refreshPurse();
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
  // Mid-spin or mid-flight, the tabs wait: switching would strand the game's buttons.
  sheet.lock = () => busy;
  // A fish in the air when the sheet is closed is cashed out where it is: nothing is lost by walking off.
  const prevClose = sheet.close.bind(sheet);
  sheet.close = () => {
    if (flight && flight.cashed) {
      // Already cashed out: the flight only finishes in the history.
      cancelAnimationFrame(flight.raf);
      save.arcade.flights = [...save.arcade.flights, flight.snatch].slice(-10);
      flight = null;
    }
    if (flight && !flight.cashed) {
      const m = Math.min(flight.snatch, flightAt((performance.now() - flight.t0) / 1000));
      cancelAnimationFrame(flight.raf);
      save.arcade.flights = [...save.arcade.flights, flight.snatch].slice(-10);
      const reached = m < flight.snatch;
      flight = null;
      busy = false;
      prevClose();
      if (reached) {
        const won = flightPrize(m);
        end(won, won ? 0 : FLIGHT_COST, 'Cashed out as you left:');
      } else s.hud.hold = false;
      return;
    }
    busy = false;
    s.hud.hold = false;
    prevClose();
  };
  return sheet;
}
