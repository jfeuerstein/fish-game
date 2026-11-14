// Fun: emotes, the ukulele, and chalk.
import type { Session } from '../game/session';
import { el, icon } from './hud';
import { Sheet } from './sheet';

export function funSheet(app: HTMLElement, s: Session, chalk: () => boolean): Sheet {
  const sheet: Sheet = new Sheet(app, 'Fun', (body) => {
    const grid = el('div', 'grid');
    const emotes: [Parameters<Session['emote']>[0], string, string][] = [
      ['wave', 'Wave', '👋'],
      ['dance', 'Dance', '💃'],
      ['cheer', 'Cheer', '🙌'],
      ['clap', 'Clap', '👏'],
      ['sit', 'Sit down', '🪑'],
    ];
    for (const [id, label, glyph] of emotes) {
      const t = el('button', 'tile', `<div style="font-size:42px;height:64px;line-height:64px">${glyph}</div>${label}`);
      t.onclick = () => {
        s.emote(id);
        sheet.close();
      };
      grid.append(t);
    }
    const uke = el('button', 'tile', `<img src="${icon('ukulele')}" alt="">Ukulele`);
    uke.onclick = () => {
      sheet.close();
      s.playUke();
    };
    grid.append(uke);
    if (s.save.detector) {
      const det = el('button', `tile${s.detecting ? ' on' : ''}`, `<img src="${icon('detector')}" alt="">${s.detecting ? 'Put detector away' : 'Metal detector'}`);
      det.onclick = () => {
        sheet.close();
        s.toggleDetector();
      };
      grid.append(det);
    }
    body.append(grid);
    body.append(el('p', '', chalk() ? 'You are by the chalk square: tap Draw by the big button to draw on it.' : 'There is a patch of the village square for chalk drawings. Walk onto it to draw.'));
  });
  return sheet;
}
