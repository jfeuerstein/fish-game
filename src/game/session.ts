// What the menus need from the game, so they do not depend on all of it.
import type { Audio } from '../audio/audio';
import type { Hud } from '../ui/hud';
import type { Save } from './save';

/** Things to do on the spot, from the Fun menu. */
export type Emote = 'wave' | 'dance' | 'cheer' | 'clap' | 'sit' | 'flop' | 'spin' | 'honk' | 'slap';

export interface Session {
  save: Save;
  hud: Hud;
  audio: Audio;
  /** The save changed: show it, and keep it soon. */
  changed(): void;
  /** Put on a hat (or take it off), become another character. */
  wear(hat: string | null): void;
  wearExtra(id: string | null): void;
  showTitle(title: string | null): void;
  /** Switch the metal detector on or off. */
  toggleDetector(): void;
  detecting: boolean;
  become(character: string): void;
  /** Set a piece of furniture down in front of the player. */
  setDown(id: string): void;
  /** Start playing the ukulele, or drawing in chalk. */
  playUke(): void;
  emote(name: Emote): void;
  /** Everyone's heads much bigger, for no good reason. */
  setBigHeads(on: boolean): void;
  /** For testing: go somewhere. */
  teleport(name: string): void;
  /** For testing: a frame-rate readout in the corner, and the benchmark. */
  showStats: boolean;
  setStats(on: boolean): void;
  runBench(): void;
  /** Settings that change how the game runs. */
  applySettings(): void;
  /** The calendar day where the player is: the day's bounty goes by it. */
  today: number;
  /** The island's hour, and whether it rains. */
  hour: number;
  raining: boolean;
  /** Pin the hour or weather from Settings (null to follow the clock). */
  pin: { time: string | null; weather: 'clear' | 'rain' | 'fog' | 'storm' | null; season: string | null };
}
