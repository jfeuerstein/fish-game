// The ukulele. Players of these games love an instrument that can play *anything*, with chords
// kept ready to switch between, so: six chord slots (tap to pick, Edit to change), a row of
// strings to strum with a swipe, and pads for single notes, either a scale where nothing sounds
// wrong or every note there is.
import type { Audio } from '../audio/audio';
import type { Save } from '../game/save';
import { el } from './hud';

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHAPES: Record<'maj' | 'min' | '7', number[]> = { maj: [0, 4, 7, 12], min: [0, 3, 7, 12], '7': [0, 4, 7, 10] };
const SUFFIX: Record<'maj' | 'min' | '7', string> = { maj: '', min: 'm', '7': '7' };
/** A major pentatonic over two octaves, from middle C. */
export const NOTES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export const chordName = (c: { root: number; kind: 'maj' | 'min' | '7' }): string => `${NAMES[c.root]}${SUFFIX[c.kind]}`;
export const chordNotes = (c: { root: number; kind: 'maj' | 'min' | '7' }): number[] => SHAPES[c.kind].map((n) => n + c.root);

export class Uke {
  private root = el('div', 'uke');
  private chord = 0;
  private editing = false;
  private allNotes = false;
  private octave = 0;
  onNote: (() => void) | null = null;
  onDone: (() => void) | null = null;
  onChange: (() => void) | null = null;

  constructor(private parent: HTMLElement, private audio: Audio, private save: () => Save) {
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private play(semi: number, volume = 0.9): void {
    this.audio.play('uke', { rate: Math.pow(2, semi / 12), volume });
    this.onNote?.();
  }

  private build(): void {
    const save = this.save();
    this.root.innerHTML = '';
    // Chord slots.
    const chords = el('div', 'uke-chords');
    save.chords.forEach((c, i) => {
      const b = el('button', `uke-chord${i === this.chord ? ' on' : ''}${this.editing ? ' edit' : ''}`, chordName(c));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.chord = i;
        if (!this.editing) chordNotes(c).forEach((n, k) => setTimeout(() => this.play(n, 0.55), k * 30));
        this.build();
      });
      chords.append(b);
    });
    this.root.append(chords);
    if (this.editing) {
      const c = save.chords[this.chord];
      const roots = el('div', 'uke-roots');
      NAMES.forEach((n, r) => {
        const b = el('button', `uke-root${c.root === r ? ' on' : ''}`, n);
        b.onclick = () => {
          c.root = r;
          this.onChange?.();
          this.build();
        };
        roots.append(b);
      });
      const kinds = el('div', 'uke-kinds');
      for (const k of ['maj', 'min', '7'] as const) {
        const b = el('button', `uke-root${c.kind === k ? ' on' : ''}`, k === 'maj' ? 'Major' : k === 'min' ? 'Minor' : 'Seventh');
        b.onclick = () => {
          c.kind = k;
          this.onChange?.();
          this.build();
        };
        kinds.append(b);
      }
      this.root.append(roots, kinds);
    }
    // Strings: swipe across them to strum the chord, low to high or back.
    const strings = el('div', 'uke-strings');
    const notes = chordNotes(save.chords[this.chord]);
    for (let i = 0; i < 4; i++) strings.append(el('i'));
    let last = -1;
    const which = (e: PointerEvent): number => {
      const r = strings.getBoundingClientRect();
      return Math.max(0, Math.min(3, Math.floor(((e.clientX - r.left) / r.width) * 4)));
    };
    strings.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        strings.setPointerCapture(e.pointerId);
      } catch {
        /* A pointer the browser does not know (from the tools). */
      }
      last = which(e);
      this.play(notes[last], 0.7);
      strings.children[last].classList.add('hit');
    });
    strings.addEventListener('pointermove', (e) => {
      if (last < 0) return;
      const s = which(e);
      if (s === last) return;
      // Every string passed over sounds.
      const step = s > last ? 1 : -1;
      for (let k = last + step; k !== s + step; k += step) {
        this.play(notes[k], 0.7);
        strings.children[k].classList.add('hit');
        setTimeout(() => strings.children[k]?.classList.remove('hit'), 160);
      }
      last = s;
    });
    const up = (): void => {
      last = -1;
      for (const c of strings.children) c.classList.remove('hit');
    };
    strings.addEventListener('pointerup', up);
    strings.addEventListener('pointercancel', up);
    this.root.append(strings);
    // Single notes.
    const pads = el('div', `uke-pads${this.allNotes ? ' all' : ''}`);
    const semis = this.allNotes ? Array.from({ length: 12 }, (_, i) => i + this.octave * 12) : NOTES;
    semis.forEach((n, i) => {
      const b = el('button', 'uke-pad', NAMES[((n % 12) + 12) % 12]);
      b.style.setProperty('--h', String(190 + i * (this.allNotes ? 13 : 16)));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.play(n);
        b.classList.add('hit');
        setTimeout(() => b.classList.remove('hit'), 140);
      });
      pads.append(b);
    });
    this.root.append(pads);
    const row = el('div', 'uke-row');
    const edit = el('button', `btn ${this.editing ? 'green' : 'plain'}`, this.editing ? 'Done editing' : 'Edit chords');
    edit.onclick = () => {
      this.editing = !this.editing;
      this.build();
    };
    const scale = el('button', 'btn plain', this.allNotes ? 'Easy scale' : 'All notes');
    scale.onclick = () => {
      this.allNotes = !this.allNotes;
      this.build();
    };
    row.append(edit, scale);
    if (this.allNotes) {
      const oct = el('button', 'btn plain', this.octave ? 'Lower' : 'Higher');
      oct.onclick = () => {
        this.octave = this.octave ? 0 : 1;
        this.build();
      };
      row.append(oct);
    }
    const done = el('button', 'btn coral', 'Put away');
    done.onclick = () => this.hide();
    row.append(done);
    this.root.append(row);
  }

  show(): void {
    this.build();
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
