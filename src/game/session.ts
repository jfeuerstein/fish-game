// What the menus need from the game, so they do not depend on all of it.
import type { Audio } from '../audio/audio';
import type { Hud } from '../ui/hud';
import type { Save } from './save';

export interface Session {
  save: Save;
  hud: Hud;
  audio: Audio;
  /** The save changed: show it, and keep it soon. */
  changed(): void;
  /** Put on a hat (or take it off), become another character. */
  wear(hat: string | null): void;
  become(character: string): void;
  /** Set a piece of furniture down in front of the player. */
  setDown(id: string): void;
  /** Start playing the ukulele, or drawing in chalk. */
  playUke(): void;
  emote(name: 'wave' | 'dance' | 'cheer' | 'clap' | 'sit'): void;
  /** For testing: go somewhere. */
  teleport(name: string): void;
  /** Settings that change how the game runs. */
  applySettings(): void;
  /** The island's hour, and whether it rains. */
  hour: number;
  raining: boolean;
  /** Pin the hour or weather from Settings (null to follow the clock). */
  pin: { time: string | null; weather: 'clear' | 'rain' | null };
}
