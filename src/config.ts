// Options read from the address, for trying things out and for the tools. None is remembered.
export interface Config {
  /** Where to start: a name from PLACES in layout.ts. */
  at: string | null;
  /** Pin the hour: dawn, day, dusk, night or a number. */
  time: string | null;
  /** Pin the weather. */
  weather: 'clear' | 'rain' | 'fog' | 'storm' | null;
  /** Pin the season: spring, summer, fall or winter. */
  season: string | null;
  /** `trader=1` has the trader in whatever the day (`trader=0`, never). */
  trader: boolean | null;
  /** `sky=aurora|bloodmoon|sunrise` shows one of the rare skies, whatever the day. */
  sky: string | null;
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
  /** `coach=0`: no first-minute guide, even on a new save (for the tools' pictures). */
  coach: boolean;
  /** Show a frame-rate readout. */
  stats: boolean;
  /** Run the benchmark once the game is up (as Settings > For testing does), each step timed for `benchsecs` seconds. */
  bench: boolean;
  benchsecs: number | null;
  /** No sound at all. */
  mute: boolean;
  /** Load no models (for quick logic checks). */
  models: boolean;
  /** Line models up in front of the camera to look at: a prefix such as fish, hat, f-, or all. */
  zoo: string | null;
  /** Run time faster (for the tools, whose software rendering draws a few frames a second). */
  warp: number;
  /** `smooth` draws the game full size with soft light and fluid movement, as it was before the lo-fi look. */
  look: string | null;
  /** `eyes=0` draws no eyes on anyone, to see what a model has painted beneath them. */
  eyes: boolean;
}

export function parseConfig(search: string): Config {
  const p = new URLSearchParams(search);
  const num = (k: string): number | null => (p.has(k) && Number.isFinite(Number(p.get(k))) ? Number(p.get(k)) : null);
  const w = p.get('weather');
  return {
    at: p.get('at'),
    time: p.get('time'),
    weather: w === 'rain' || w === 'clear' || w === 'fog' || w === 'storm' ? w : null,
    season: p.get('season'),
    sky: p.get('sky'),
    trader: p.has('trader') ? p.get('trader') !== '0' : null,
    hud: p.get('hud') !== '0',
    title: p.get('title') !== '0',
    fresh: p.get('fresh') === '1',
    zoom: num('zoom'),
    yaw: num('yaw'),
    low: p.get('quality') === 'low',
    coach: p.get('coach') !== '0',
    stats: p.get('stats') === '1',
    bench: p.get('bench') === '1',
    benchsecs: num('benchsecs'),
    mute: p.get('mute') === '1',
    models: p.get('models') !== '0',
    zoo: p.get('zoo'),
    warp: Math.min(8, Math.max(1, Number(p.get('warp')) || 1)),
    look: p.get('look'),
    eyes: p.get('eyes') !== '0',
  };
}
