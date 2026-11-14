// The ukulele: a row of pads to play notes on (a friendly scale where nothing sounds wrong),
// and a strum.
import type { Audio } from '../audio/audio';
import { el } from './hud';

/** Semitones from middle C: a major pentatonic over two octaves. */
export const NOTES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const LABELS = ['C', 'D', 'E', 'G', 'A', 'C', 'D', 'E', 'G', 'A'];
const CHORDS: [string, number[]][] = [
  ['C', [0, 4, 7, 12]],
  ['F', [5, 9, 12, 17]],
  ['G', [7, 11, 14, 19]],
  ['Am', [9, 12, 16, 21]],
];

export class Uke {
  private root = el('div', 'uke');
  onNote: (() => void) | null = null;
  onDone: (() => void) | null = null;

  constructor(private parent: HTMLElement, private audio: Audio) {
    const pads = el('div', 'uke-pads');
    NOTES.forEach((n, i) => {
      const b = el('button', 'uke-pad', LABELS[i]);
      b.style.setProperty('--h', String(190 + i * 16));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.play([n]);
        b.classList.add('hit');
        setTimeout(() => b.classList.remove('hit'), 140);
      });
      pads.append(b);
    });
    const chords = el('div', 'uke-chords');
    for (const [name, notes] of CHORDS) {
      const b = el('button', 'uke-chord', name);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        notes.forEach((n, k) => setTimeout(() => this.play([n], 0.6), k * 35));
      });
      chords.append(b);
    }
    const done = el('button', 'btn plain', 'Done');
    done.addEventListener('click', () => this.hide());
    this.root.append(pads, chords, done);
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private play(semis: number[], volume = 0.9): void {
    for (const s of semis) this.audio.play('uke', { rate: Math.pow(2, s / 12), volume });
    this.onNote?.();
  }

  show(): void {
    this.parent.append(this.root);
  }

  hide(): void {
    this.root.remove();
    this.onDone?.();
  }

  get open(): boolean {
    return this.root.isConnected;
  }
}
