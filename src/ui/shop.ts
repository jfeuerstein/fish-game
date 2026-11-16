// The bait shop: sell fish, buy rods, bait, hats, things for around the island, upgrades.
import { bountyCard, todaysPrice } from './bountyCard';
import { valueOf, BY_ID, sayLength, stars } from '../fishing/fish';
import { BAITS, BOAT_LICENCE, COOLERS, DETECTOR, EXTRAS, FURNITURE, HATS, HOOKS, LINES, LURES, RODS, hookById, levelFor, lineById } from '../game/economy';
import { sell, spend } from '../game/progress';
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

const coin = (n: number): string => `<span class="price"><img src="${icon('coin')}" alt="">${n.toLocaleString()}</span>`;

export function shopSheet(app: HTMLElement, s: Session, openChests: () => void): Sheet {
  const sheet: Sheet = new Sheet(app, "Gus's Bait & Tackle", (body, tab) => {
    const save = s.save;
    const level = levelFor(save.xp).level;
    const buy = (price: number, then: () => void): void => {
      if (!spend(save, price)) {
        s.hud.toast("You can't afford that yet.");
        s.audio.play('click', { rate: 0.7 });
        return;
      }
      then();
      s.audio.play('coin');
      s.changed();
      sheet.refresh();
    };
    if (tab === 'Sell') {
      const total = save.bag.reduce((a, _c, i) => a + todaysPrice(s, i), 0);
      body.append(bountyCard(s));
      body.append(el('p', '', save.bag.length ? `Gus looks into your cooler. "Nice haul! I'll take the lot for ${total.toLocaleString()} coins."` : '"Nothing to sell? Go catch something, I\'ll be here."'));
      if (save.bag.length) {
        const all = el('button', 'big-btn', `Sell everything · ${total.toLocaleString()}`);
        all.onclick = () => {
          const r = sell(save, undefined, s.today);
          s.audio.play('coin');
          s.hud.toast(`Sold for ${r.coins.toLocaleString()} coins!`, 'good');
          if (r.bounty) s.hud.toast(`Bounty paid: +${r.bounty} coins!`, 'gold');
          for (const _ of r.finished) s.hud.toast('An errand is done! Hand it in at the board.', 'good');
          s.changed();
          sheet.refresh();
        };
        body.append(all);
      }
      save.bag.forEach((c, i) => {
        const sp = BY_ID[c.species];
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(`fish-${c.species}`)}" alt="" class="q-${c.variant}"><div class="grow"><div class="title">${sp.name}${c.variant !== 'normal' ? ` <b class="vb ${c.variant}">${stars(c.variant)}</b>` : ''}</div><div class="sub">${sayLength(c.size)}${c.huge ? ' · huge!' : ''}</div></div>`;
        const b = el('button', `btn${todaysPrice(s, i) > valueOf(c) ? ' coral' : ''}`, `${todaysPrice(s, i)}`);
        b.onclick = () => {
          const r = sell(save, [i], s.today);
          s.audio.play('coin', { volume: 0.6 });
          if (r.bounty) s.hud.toast(`Bounty paid: +${r.bounty} coins!`, 'gold');
          for (const _ of r.finished) s.hud.toast('An errand is done! Hand it in at the board.', 'good');
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      });
    } else if (tab === 'Rods') {
      for (const r of RODS) {
        const owned = save.rods.includes(r.id);
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(r.id)}" alt=""><div class="grow"><div class="title">${r.name}</div><div class="sub">${r.blurb}</div><div class="sub">Reach ${r.reach} m · Reel ${r.power}× · Luck +${Math.round(r.luck * 100)}%</div></div>`;
        const b = el('button', `btn ${owned ? (save.rod === r.id ? 'plain' : 'green') : ''}`);
        if (owned) {
          b.textContent = save.rod === r.id ? 'Using' : 'Use';
          b.onclick = () => {
            save.rod = r.id;
            s.changed();
            sheet.refresh();
          };
        } else if (level < r.level) {
          b.textContent = `Lv ${r.level}`;
          b.disabled = true;
        } else {
          b.innerHTML = coin(r.price);
          b.onclick = () => buy(r.price, () => {
            save.rods.push(r.id);
            save.rod = r.id;
            s.hud.toast(`New rod: ${r.name}!`, 'good');
          });
        }
        row.append(b);
        body.append(row);
      }
    } else if (tab === 'Tackle') {
      body.append(el('p', '', 'What goes on the rod. A stronger line takes more strain before it snaps; a finer hook holds a fish that is getting away, and gives a moment longer to strike.'));
      const rows = (title: string, things: readonly { id: string; name: string; price: number; level: number; blurb: string }[], says: (id: string) => string, using: () => string, owned: string[], use: (id: string) => void): void => {
        body.append(el('div', 'section', title));
        for (const t of things) {
          const has = owned.includes(t.id);
          const row = el('div', 'row');
          row.innerHTML = `<img src="${icon(t.id)}" alt=""><div class="grow"><div class="title">${t.name}</div><div class="sub">${t.blurb}</div><div class="sub">${says(t.id)}</div></div>`;
          const b = el('button', `btn ${has ? (using() === t.id ? 'plain' : 'green') : ''}`);
          if (has) {
            b.textContent = using() === t.id ? 'Using' : 'Use';
            b.onclick = () => {
              use(t.id);
              s.changed();
              sheet.refresh();
            };
          } else if (level < t.level) {
            b.textContent = `Lv ${t.level}`;
            b.disabled = true;
          } else {
            b.innerHTML = coin(t.price);
            b.onclick = () => buy(t.price, () => {
              owned.push(t.id);
              use(t.id);
              s.hud.toast(`${t.name} is on your rod.`, 'good');
            });
          }
          row.append(b);
          body.append(row);
        }
      };
      rows('Line', LINES, (id) => `Takes ${Math.round(lineById(id).strength * 100)}% of the strain a cotton line does before it snaps`.replace('Takes 100% of the strain a cotton line does before it snaps', 'Snaps when it snaps'), () => save.line, save.lines, (id) => (save.line = id));
      rows('Hooks', HOOKS, (id) => (hookById(id).hold > 1 ? `Holds ${Math.round((hookById(id).hold - 1) * 100)}% better` : 'Holds, mostly'), () => save.hook, save.hooks, (id) => (save.hook = id));
    } else if (tab === 'Bait') {
      body.append(el('p', '', 'Bait decides how fine your fish are (★ fine, ★★ shiny, ★★★ golden, ★★★★ prismatic) and which fussy fish bite. One is used up with each catch; worms never run out.'));
      for (const b of BAITS) {
        // What is only found is shown once some has been found.
        if (b.found && !(save.baits[b.id] > 0)) continue;
        const have = b.id === 'bait-worm' ? '∞' : String(save.baits[b.id] ?? 0);
        const row = el('div', 'row');
        const finer = Math.round(b.quality.reduce((a, q) => a + q, 0) * 1000) / 10;
        row.innerHTML = `<img src="${icon(b.id)}" alt=""><div class="grow"><div class="title">${b.name} <small>(${have})</small></div><div class="sub">${b.blurb}</div><div class="sub">★ finer fish: ${finer}% · ★★★ golden or better: ${Math.round((b.quality[2] + b.quality[3]) * 1000) / 10}%</div></div>`;
        const col = el('div', '');
        col.style.cssText = 'display:flex;flex-direction:column;gap:6px';
        const use = el('button', `btn ${save.bait === b.id ? 'plain' : 'green'}`, save.bait === b.id ? 'Using' : 'Use');
        use.disabled = b.id !== 'bait-worm' && !(save.baits[b.id] > 0);
        use.onclick = () => {
          save.bait = b.id;
          s.changed();
          sheet.refresh();
        };
        col.append(use);
        if (b.pack) {
          const get = el('button', 'btn');
          if (level < b.level) {
            get.textContent = `Lv ${b.level}`;
            get.disabled = true;
          } else {
            get.innerHTML = `×${b.pack} ${coin(b.price)}`;
            get.onclick = () => buy(b.price, () => {
              save.baits[b.id] = (save.baits[b.id] ?? 0) + b.pack;
              save.bait = b.id;
            });
          }
          col.append(get);
        }
        row.append(col);
        body.append(row);
      }
    } else if (tab === 'Lures') {
      body.append(el('p', '', 'A lure changes which fish takes the bait. One at a time, never used up.'));
      for (const l of LURES) {
        const owned = save.lures.includes(l.id);
        const row = el('div', 'row');
        row.innerHTML = `<img src="${icon(l.id)}" alt=""><div class="grow"><div class="title">${l.name}</div><div class="sub">${l.blurb}</div></div>`;
        const b = el('button', `btn ${owned ? (save.lure === l.id ? 'plain' : 'green') : ''}`);
        if (owned) {
          b.textContent = save.lure === l.id ? 'Using' : 'Use';
          b.onclick = () => {
            save.lure = l.id;
            s.changed();
            sheet.refresh();
          };
        } else if (level < l.level) {
          b.textContent = `Lv ${l.level}`;
          b.disabled = true;
        } else {
          b.innerHTML = coin(l.price);
          b.onclick = () => buy(l.price, () => {
            save.lures.push(l.id);
            save.lure = l.id;
            s.hud.toast(`${l.name} on the line!`, 'good');
          });
        }
        row.append(b);
        body.append(row);
      }
    } else if (tab === 'Wear') {
      const grid = el('div', 'grid');
      for (const x of EXTRAS.filter((e) => !e.prize || save.extras.includes(e.id))) {
        const owned = save.extras.includes(x.id);
        const t = el('button', `tile${save.extra === x.id ? ' on' : ''}`);
        t.innerHTML = `<img src="${icon(x.id)}" alt="">${x.name}${owned ? '<small>Owned</small>' : coin(x.price)}`;
        t.onclick = () => {
          if (owned) s.wearExtra(save.extra === x.id ? null : x.id);
          else buy(x.price, () => {
            save.extras.push(x.id);
            s.wearExtra(x.id);
          });
          sheet.refresh();
        };
        grid.append(t);
      }
      body.append(el('p', '', '"A pin and a scarf, that is my lot. The gull at the Lucky Gull has the rest, a pearl a go."'), grid);
    } else if (tab === 'Hats') {
      const grid = el('div', 'grid');
      for (const h of HATS.filter((x) => !x.gift && !x.prize)) {
        const owned = save.hats.includes(h.id);
        const t = el('button', `tile${save.hat === h.id ? ' on' : ''}`);
        t.innerHTML = `<img src="${icon(h.id)}" alt="">${h.name}${owned ? '<small>Owned</small>' : coin(h.price)}`;
        t.onclick = () => {
          if (owned) s.wear(save.hat === h.id ? null : h.id);
          else buy(h.price, () => {
            save.hats.push(h.id);
            s.wear(h.id);
          });
          sheet.refresh();
        };
        grid.append(t);
      }
      body.append(el('p', '', '"Three plain hats to keep the sun off. Anything grander is won at the Lucky Gull, for pearls: each of its games has hats of its own."'), grid);
    } else if (tab === 'Camp' || tab === 'Things') {
      const camp = tab === 'Camp';
      body.append(el('p', '', camp ? '"Pitch a camp anywhere you like. A tent, a fire and somewhere to sit, and it\'s a camp. The rest is making it yours." Find what you buy in your bag.' : 'Things to set down anywhere on the island. Find them in your bag.'));
      const grid = el('div', 'grid');
      for (const f of FURNITURE.filter((x) => !x.prize && !x.trader && !x.earned && !!x.camp === camp)) {
        const t = el('button', 'tile');
        const n = save.furniture[f.id] ?? 0;
        const out = save.placed.filter((p) => p.id === f.id).length;
        t.innerHTML = `<img src="${icon(f.id)}" alt="">${f.name}${n + out ? `<small>Have ${n + out}</small>` : ''}${coin(f.price)}`;
        t.onclick = () => buy(f.price, () => {
          save.furniture[f.id] = n + 1;
          s.hud.toast(`${f.name} is in your bag.`, 'good');
        });
        grid.append(t);
      }
      body.append(grid);
    } else if (tab === 'Pearls') {
      body.append(el('p', '', '"Pearls? The rarest fish carry them: golden ones, prismatic ones, and the legends. The gull at the Lucky Gull takes them, a pearl a go, and every go wins something nobody sells. No coins, mind."'));
      const b = el('button', 'big-btn', 'Spin the Gull Wheel');
      b.onclick = () => openChests();
      body.append(b);
    } else {
      const next = COOLERS[save.cooler + 1];
      const row = el('div', 'row');
      row.innerHTML = `<img src="${icon('upgrade-cooler')}" alt=""><div class="grow"><div class="title">Bigger cooler</div><div class="sub">Holds ${COOLERS[save.cooler].capacity} fish${next ? `, next holds ${next.capacity}` : ' (the biggest!)'}.</div></div>`;
      if (next) {
        const b = el('button', 'btn');
        b.innerHTML = coin(next.price);
        b.onclick = () => buy(next.price, () => {
          save.cooler++;
          s.hud.toast(`Your cooler holds ${next.capacity} now.`, 'good');
        });
        row.append(b);
      }
      body.append(row);
      const boat = el('div', 'row');
      boat.innerHTML = `<img src="${icon('boat-ticket')}" alt=""><div class="grow"><div class="title">Rowboat licence</div><div class="sub">Take the rowboat out from the pier, to the deep water and round the island.</div></div>`;
      const b = el('button', 'btn');
      if (save.boat) {
        b.textContent = 'Yours';
        b.disabled = true;
      } else if (level < BOAT_LICENCE.level) {
        b.textContent = `Lv ${BOAT_LICENCE.level}`;
        b.disabled = true;
      } else {
        b.innerHTML = coin(BOAT_LICENCE.price);
        b.onclick = () => buy(BOAT_LICENCE.price, () => {
          save.boat = true;
          s.hud.toast('The rowboat by the pier is yours to use!', 'good');
        });
      }
      boat.append(b);
      body.append(boat);
      const det = el('div', 'row');
      det.innerHTML = `<img src="${icon('detector')}" alt=""><div class="grow"><div class="title">Metal detector</div><div class="sub">Beeps faster near buried things. New ones every day. Turn it on from Fun.</div></div>`;
      const d = el('button', 'btn');
      if (save.detector) {
        d.textContent = 'Yours';
        d.disabled = true;
      } else if (level < DETECTOR.level) {
        d.textContent = `Lv ${DETECTOR.level}`;
        d.disabled = true;
      } else {
        d.innerHTML = coin(DETECTOR.price);
        d.onclick = () => buy(DETECTOR.price, () => {
          save.detector = true;
          s.hud.toast('A metal detector! Switch it on from Fun.', 'good');
        });
      }
      det.append(d);
      body.append(det);
    }
  }, ['Sell', 'Rods', 'Tackle', 'Lures', 'Bait', 'Hats', 'Wear', 'Camp', 'Things', 'Upgrades', 'Pearls']);
  return sheet;
}
