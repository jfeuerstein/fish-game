// Options read from the address, for trying things out and for the tools. None is remembered.
export interface Config {
  /** Where to start: a name from PLACES in layout.ts. */
  at: string | null;
  /** Pin the hour: dawn, day, dusk, night or a number. */
  time: string | null;
  /** Pin the weather. */
  weather: 'clear' | 'rain' | null;
  /** Hide the controls, for clean pictures. */
  hud: boolean;
  /** Skip the title card. */
  title: boolean;
  /** Start from a new save, without touching the kept one. */
  fresh: boolean;
  /** Camera distance multiplier. */
  zoom: number | null;
  /** Camera yaw, radians. */
  yaw: number | null;
  /** Draw fewer things and no shadows. */
  low: boolean;
  /** Show a frame-rate readout. */
  stats: boolean;
  /** No sound at all. */
  mute: boolean;
  /** Load no models (for quick logic checks). */
  models: boolean;
  /** Line models up in front of the camera to look at: a prefix such as fish, hat, f-, or all. */
  zoo: string | null;
  /** Run time faster (for the tools, whose software rendering draws a few frames a second). */
  warp: number;
}

export function parseConfig(search: string): Config {
  const p = new URLSearchParams(search);
  const num = (k: string): number | null => (p.has(k) && Number.isFinite(Number(p.get(k))) ? Number(p.get(k)) : null);
  const w = p.get('weather');
  return {
    at: p.get('at'),
    time: p.get('time'),
    weather: w === 'rain' || w === 'clear' ? w : null,
    hud: p.get('hud') !== '0',
    title: p.get('title') !== '0',
    fresh: p.get('fresh') === '1',
    zoom: num('zoom'),
    yaw: num('yaw'),
    low: p.get('quality') === 'low',
    stats: p.get('stats') === '1',
    mute: p.get('mute') === '1',
    models: p.get('models') !== '0',
    zoo: p.get('zoo'),
    warp: Math.min(8, Math.max(1, Number(p.get('warp')) || 1)),
  };
}
