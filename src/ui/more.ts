// More: the wardrobe, settings, the save code, and how to play.
import { CHARACTERS, EXTRAS, HATS } from '../game/economy';
import { TITLES } from '../game/titles';
import { SAVE_KEY, fromCode, newSave, toCode } from '../game/save';
import type { Session } from '../game/session';
import { PLACES } from '../world/layout';
import { el, icon } from './hud';
import { Sheet } from './sheet';
import { type ChartOf, drawChart } from './chart';

export function moreSheet(app: HTMLElement, s: Session, openChests: () => void, chart: ChartOf): Sheet {
  const sheet: Sheet = new Sheet(app, 'More', (body, tab) => {
    const save = s.save;
    if (tab === 'Chart') drawChart(body, s, chart);
    else if (tab === 'Wardrobe') {
      body.append(el('div', 'section', 'Who you are'));
      const chars = el('div', 'grid');
      for (const c of CHARACTERS) {
        const owned = save.characters.includes(c.id);
        const t = el('button', `tile${save.character === c.id ? ' on' : ''}${owned ? '' : ' locked'}`);
        t.innerHTML = `<img src="${icon(c.id)}" alt="">${c.name}${owned ? '' : '<small>From the Lucky Gull</small>'}`;
        t.disabled = !owned;
        t.onclick = () => {
          s.become(c.id);
          sheet.refresh();
        };
        chars.append(t);
      }
      body.append(chars, el('div', 'section', 'Hats'));
      const hats = el('div', 'grid');
      const none = el('button', `tile${save.hat === null ? ' on' : ''}`, '<div style="height:64px;font-size:40px;line-height:64px">∅</div>No hat');
      none.onclick = () => {
        s.wear(null);
        sheet.refresh();
      };
      hats.append(none);
      for (const h of HATS.filter((x) => save.hats.includes(x.id))) {
        const t = el('button', `tile${save.hat === h.id ? ' on' : ''}`);
        t.innerHTML = `<img src="${icon(h.id)}" alt="">${h.name}`;
        t.onclick = () => {
          s.wear(h.id);
          sheet.refresh();
        };
        hats.append(t);
      }
      body.append(hats);
      body.append(el('div', 'section', 'Wearing'));
      const extras = el('div', 'grid');
      const bare = el('button', `tile${save.extra === null ? ' on' : ''}`, '<div style="height:64px;font-size:40px;line-height:64px">∅</div>Nothing');
      bare.onclick = () => {
        s.wearExtra(null);
        sheet.refresh();
      };
      extras.append(bare);
      for (const x of EXTRAS.filter((e) => save.extras.includes(e.id))) {
        const t = el('button', `tile${save.extra === x.id ? ' on' : ''}`);
        t.innerHTML = `<img src="${icon(x.id)}" alt="">${x.name}`;
        t.onclick = () => {
          s.wearExtra(x.id);
          sheet.refresh();
        };
        extras.append(t);
      }
      body.append(extras);
      body.append(el('div', 'section', 'Title'));
      for (const t of TITLES) {
        const got = save.titles.includes(t.name);
        const row = el('div', 'row');
        row.innerHTML = `<div class="grow"><div class="title" style="${got ? '' : 'opacity:.45'}">${t.name}</div><div class="sub">${t.how}</div></div>`;
        if (got) {
          const b = el('button', `btn ${save.title === t.name ? 'plain' : 'green'}`, save.title === t.name ? 'Shown' : 'Show');
          b.onclick = () => {
            s.showTitle(save.title === t.name ? null : t.name);
            sheet.refresh();
          };
          row.append(b);
        }
        body.append(row);
      }
      if (!save.hats.length) body.append(el('p', '', 'No hats yet: Gus sells them, and the Lucky Gull’s games give rarer ones.'));
      const b = el('button', 'big-btn', `Spin the Gull Wheel · ${save.tokens} pearls`);
      b.onclick = openChests;
      body.append(b);
    } else if (tab === 'Settings') {
      const slider = (label: string, key: 'music' | 'sfx' | 'ambience'): void => {
        const row = el('div', 'row');
        row.innerHTML = `<div class="grow"><div class="title">${label}</div></div>`;
        const input = el('input') as HTMLInputElement;
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.05';
        input.value = String(save.settings[key]);
        input.style.width = '150px';
        input.oninput = () => {
          save.settings[key] = Number(input.value);
          s.applySettings();
          s.changed();
        };
        row.append(input);
        body.append(row);
      };
      slider('Music', 'music');
      slider('Sounds', 'sfx');
      slider('Ambience', 'ambience');
      const toggle = (label: string, sub: string, on: boolean, flip: () => void): void => {
        const row = el('div', 'row');
        row.innerHTML = `<div class="grow"><div class="title">${label}</div><div class="sub">${sub}</div></div>`;
        const b = el('button', `btn ${on ? 'green' : 'plain'}`, on ? 'On' : 'Off');
        b.onclick = () => {
          flip();
          s.applySettings();
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      };
      toggle('Real clock', 'Follow the time where you are, instead of a 24-minute island day.', save.settings.clock === 'real', () => (save.settings.clock = save.settings.clock === 'real' ? 'island' : 'real'));
      toggle('Chunkier pixels', 'The island is drawn small and blown up. This draws it smaller still. Easier on the battery too. Takes effect when the game is next opened.', save.settings.pixels, () => (save.settings.pixels = !save.settings.pixels));
      const grains = ['None', 'A little', 'Full'];
      {
        const row = el('div', 'row');
        row.innerHTML = '<div class="grow"><div class="title">Grain</div><div class="sub">How much the picture is speckled between its colours, as an old console’s was. None is flat and clean; full is busiest.</div></div>';
        const b = el('button', 'btn plain', grains[save.settings.grain]);
        b.onclick = () => {
          save.settings.grain = ((save.settings.grain + 1) % 3) as 0 | 1 | 2;
          s.applySettings();
          s.changed();
          sheet.refresh();
        };
        row.append(b);
        body.append(row);
      }
      toggle('Shadows', 'Softer on the battery when off. Takes effect when the game is next opened.', save.settings.quality === 'high', () => (save.settings.quality = save.settings.quality === 'high' ? 'low' : 'high'));
      body.append(el('div', 'section', 'Silly'));
      toggle('Big heads', 'Everyone on the island gets a much bigger head. Hats too.', save.settings.bigHeads, () => (save.settings.bigHeads = !save.settings.bigHeads));
      body.append(el('div', 'section', 'For testing'));
      const pinRow = (label: string, options: (string | null)[], get: () => string | null, set: (v: string | null) => void): void => {
        const row = el('div', 'row');
        row.style.flexWrap = 'wrap';
        row.innerHTML = `<div class="grow" style="flex-basis:100%"><div class="title">${label}</div></div>`;
        for (const o of options) {
          const b = el('button', `btn ${get() === o ? '' : 'plain'}`, o ?? 'Clock');
          b.style.minWidth = '0';
          b.onclick = () => {
            set(o);
            sheet.refresh();
          };
          row.append(b);
        }
        body.append(row);
      };
      toggle('Frame rate', 'Frames a second and the game\'s own share of each, at the top of the screen. Until the game is closed.', s.showStats, () => s.setStats(!s.showStats));
      {
        const row = el('div', 'row');
        row.innerHTML = '<div class="grow"><div class="title">Benchmark</div><div class="sub">Stands in six places for a few seconds each and times every frame. Half a minute, then a block of text to copy.</div></div>';
        const b = el('button', 'btn plain', 'Run');
        b.onclick = () => {
          sheet.close();
          s.runBench();
        };
        row.append(b);
        body.append(row);
      }
      pinRow('Time', [null, 'dawn', 'day', 'dusk', 'night'], () => s.pin.time, (v) => (s.pin.time = v));
      pinRow('Weather', [null, 'clear', 'rain', 'fog', 'storm'], () => s.pin.weather, (v) => (s.pin.weather = v as Session['pin']['weather']));
      pinRow('Season', [null, 'spring', 'summer', 'fall', 'winter'], () => s.pin.season, (v) => (s.pin.season = v));
      const go = el('div', 'row');
      go.style.flexWrap = 'wrap';
      go.innerHTML = '<div class="grow" style="flex-basis:100%"><div class="title">Go to</div></div>';
      for (const name of Object.keys(PLACES)) {
        const b = el('button', 'btn plain', name);
        b.style.minWidth = '0';
        b.onclick = () => {
          s.teleport(name);
          sheet.close();
        };
        go.append(b);
      }
      body.append(go);
    } else if (tab === 'Save') {
      body.append(el('p', '', 'Your game is kept on this phone. Copy this code somewhere safe to move it or keep a backup.'));
      const area = el('textarea') as HTMLTextAreaElement;
      area.value = toCode(save);
      area.style.cssText = 'width:100%;height:110px;border-radius:var(--radius);border:var(--edge);font-size:11px;padding:8px;box-sizing:border-box';
      area.readOnly = true;
      const copy = el('button', 'big-btn', 'Copy code');
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(area.value);
          s.hud.toast('Copied!');
        } catch {
          area.select();
        }
      };
      body.append(area, copy, el('div', 'section', 'Restore from a code'));
      const paste = el('textarea') as HTMLTextAreaElement;
      paste.placeholder = 'Paste a save code here';
      paste.style.cssText = area.style.cssText;
      const load = el('button', 'big-btn', 'Restore');
      load.onclick = () => {
        const got = fromCode(paste.value);
        if (!got) {
          s.hud.toast("That code doesn't look right.");
          return;
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(got));
        location.reload();
      };
      const reset = el('button', 'big-btn', 'Start over');
      reset.style.background = '#9aa3ad';
      reset.onclick = () => {
        if (!confirm('Start a brand new game? Your fish, coins and hats will be gone.')) return;
        localStorage.setItem(SAVE_KEY, JSON.stringify(newSave()));
        location.reload();
      };
      body.append(paste, load, reset);
    } else {
      const tips = [
        ['Moving', 'Put your thumb anywhere in the bottom part of the screen and slide it. Drag higher up to look around; pinch to zoom.'],
        ['Casting', 'Face some water and hold the big button. The meter rises and falls: let go near the top for a long cast.'],
        ['A bite', 'Little nibbles first. When the bobber goes right under and the ! shows, tap Hook!'],
        ['Reeling', 'Hold to reel. When the fish thrashes or the line bar goes red, let go for a moment, then reel again.'],
        ['Where to fish', 'The sea, the deep water off the end of the pier, the pond in the woods and the creek all have their own fish. Some only come out at night, at dawn and dusk, or in the rain.'],
        ['Quality', 'Fish come Normal, ★ Fine, ★★ Shiny, ★★★ Golden or ★★★★ Prismatic. Better bait finds finer fish, worth far more.'],
        ['Lures', 'A lure changes which fish bites: the biggest of three, the rarest, two at once, more treasure. Buy them at the shop.'],
        ['Pearls', 'Only the rarest catches give pearls: golden and prismatic fish, and the legends. Spend them at the Lucky Gull by the plaza: a pearl a go, and every go wins a hat, something to wear, a new character or a thing to set down. Coins are for Gus.'],
        ['Credits', 'Models, pictures and ground painted with Tripo and fal. Arcade sounds and jingles: Kenney (CC0), found through patch.gg.'],
        ['Luck', "Some casts bring up a treasure chest. A lucky catch can call a rain cloud that follows you, with rain fish under it. And there is always the Lucky Gull."],
        ['Secrets', "Twelve pieces of sea glass are hidden round the island. Big red mushrooms bounce you high. With a metal detector, buried things turn up every day."],
        ['Errands', 'The notice board by the shop has errands. Hand them in for coins.'],
      ];
      for (const [t, d] of tips) {
        const r = el('div', 'row');
        r.innerHTML = `<div class="grow"><div class="title">${t}</div><div class="sub">${d}</div></div>`;
        body.append(r);
      }
      body.append(el('p', '', 'Models, pictures, sounds and music were made with fal and Tripo, and in Blender.'));
    }
  }, ['Wardrobe', 'Chart', 'Settings', 'Save', 'How to play']);
  return sheet;
}
