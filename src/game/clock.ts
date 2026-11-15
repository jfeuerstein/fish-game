// The island's clock and sky. Pure.
import { hash } from '../core/rng';
import type { Watch } from '../fishing/fish';

/** Real milliseconds in one island hour: a whole day passes in 24 minutes. */
export const MS_PER_HOUR = 60_000;

export type ClockMode = 'island' | 'real';

/** The hour of the day (0 to 24, fractional) at a moment. */
export function hourAt(nowMs: number, mode: ClockMode, tzOffsetMin = 0): number {
  if (mode === 'real') {
    const local = nowMs - tzOffsetMin * 60_000;
    return ((local / 3_600_000) % 24 + 24) % 24;
  }
  // Starts at 8 in the morning on the first of January 1970, and runs on from there.
  return ((nowMs / MS_PER_HOUR + 8) % 24 + 24) % 24;
}

/** Which watch of the day an hour falls in. */
export function watchOf(hour: number): Exclude<Watch, 'any' | 'twilight'> | 'dawn' | 'dusk' {
  if (hour >= 5 && hour < 7.5) return 'dawn';
  if (hour >= 7.5 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20.5) return 'dusk';
  return 'night';
}

/** Whether a fish that keeps to `watch` bites at this hour. */
export function bitesAt(watch: Watch, hour: number): boolean {
  if (watch === 'any') return true;
  const w = watchOf(hour);
  if (watch === 'twilight') return w === 'dawn' || w === 'dusk';
  return w === watch;
}

/** How long a spell of weather lasts, in island hours (island clock) or real hours (real clock). */
const SPELL_HOURS = 4;

/** Whether it is raining. A spell of weather is chosen for each few hours from the clock alone, so it is the same on every load. */
export function rainingAt(nowMs: number, mode: ClockMode): boolean {
  const hours = mode === 'real' ? nowMs / 3_600_000 : nowMs / MS_PER_HOUR;
  const spell = Math.floor(hours / SPELL_HOURS);
  return (hash(`rain-${spell}`) % 1000) / 1000 < 0.24;
}

/** The weather: `storm` is rain with thunder, `fog` a still grey morning. */
export type Weather = 'clear' | 'rain' | 'fog' | 'storm';

/**
 * The weather at a moment. Rain comes in spells as `rainingAt` says; one spell of rain in four
 * is a thunderstorm. On about one morning in three (the island's own, or the real one), when it
 * is not raining, fog lies until mid-morning.
 */
export function weatherAt(nowMs: number, mode: ClockMode, tzOffsetMin = 0): Weather {
  const hours = mode === 'real' ? nowMs / 3_600_000 : nowMs / MS_PER_HOUR;
  const spell = Math.floor(hours / SPELL_HOURS);
  if (rainingAt(nowMs, mode)) return (hash(`storm-${spell}`) % 1000) / 1000 < 0.25 ? 'storm' : 'rain';
  const hour = hourAt(nowMs, mode, tzOffsetMin);
  const day = dayNumber(nowMs, mode, tzOffsetMin);
  return hour >= 4.5 && hour < 9.5 && (hash(`fog-${day}`) % 1000) / 1000 < 0.34 ? 'fog' : 'clear';
}

/** A pinned time, from the address or Settings, as an hour. */
export function pinnedHour(name: string | null): number | null {
  if (name === null || name === '') return null;
  const named: Record<string, number> = { dawn: 6.2, morning: 9, day: 12, midday: 12, evening: 17, dusk: 19.2, night: 23 };
  if (name in named) return named[name];
  const n = Number(name);
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : null;
}

/** A clock face for the HUD: "7:30 am". */
export function sayHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60 / 10) * 10;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Which day it is on the island (for daily things like the board's errands). */
export function dayNumber(nowMs: number, mode: ClockMode, tzOffsetMin = 0): number {
  if (mode === 'real') return Math.floor((nowMs - tzOffsetMin * 60_000) / 86_400_000);
  return Math.floor((nowMs / MS_PER_HOUR + 8) / 24);
}
