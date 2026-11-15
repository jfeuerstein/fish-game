// The benchmark: what the phone is asked to draw, and how what it managed is said. Pure.
//
// Headless Chromium draws with software and its frame rates mean nothing: only the phone's
// numbers count. Settings > For testing > Run benchmark stands the player in each of these
// places in turn, turns the camera slowly, times every frame, and ends with a block of text
// to paste back. Nothing is written to the save.

export interface BenchStep {
  name: string;
  /** A name in PLACES. */
  at: string;
  time: 'dawn' | 'day' | 'dusk' | 'night';
  weather: 'clear' | 'rain';
}

export const BENCH_STEPS: readonly BenchStep[] = [
  { name: 'Plaza, midday', at: 'plaza', time: 'day', weather: 'clear' },
  { name: 'Plaza, dusk, rain', at: 'plaza', time: 'dusk', weather: 'rain' },
  { name: 'Plaza, night', at: 'plaza', time: 'night', weather: 'clear' },
  { name: 'Camp, midday', at: 'camp', time: 'day', weather: 'clear' },
  { name: 'Lighthouse, midday', at: 'lighthouse', time: 'day', weather: 'clear' },
  { name: 'Pier head, midday', at: 'pierhead', time: 'day', weather: 'clear' },
];

/** How long each step settles before it is timed, and how long it is timed for, seconds. */
export const BENCH_SETTLE = 1.2;
export const BENCH_SECS = 5;

export interface BenchResult {
  /** Frames a second, over the whole step. */
  fps: number;
  /** The usual gap between frames, and the gap only one frame in twenty is slower than, ms. */
  median: number;
  p95: number;
  worst: number;
  /** The share of frames that missed a 60 Hz screen's next refresh (more than 20 ms), 0 to 1. */
  late: number;
  /** Time spent in the game's own frame, on average, ms. */
  cpu: number;
  frames: number;
}

/** What a step's frames come to. `gaps` are the times between frames and `work` the time each took in the game's own code, ms. */
export function summarise(gaps: readonly number[], work: readonly number[]): BenchResult {
  if (!gaps.length) return { fps: 0, median: 0, p95: 0, worst: 0, late: 0, cpu: 0, frames: 0 };
  const sorted = [...gaps].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const total = gaps.reduce((s, g) => s + g, 0);
  return {
    fps: (gaps.length / total) * 1000,
    median: at(0.5),
    p95: at(0.95),
    worst: sorted[sorted.length - 1],
    late: gaps.filter((g) => g > 20).length / gaps.length,
    cpu: work.length ? work.reduce((s, w) => s + w, 0) / work.length : 0,
    frames: gaps.length,
  };
}

export interface BenchLine extends BenchResult {
  name: string;
  calls: number;
  triangles: number;
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/** The block of text to paste back: what it ran on, then a line for each step. */
export function benchReport(about: string[], lines: readonly BenchLine[]): string {
  const rows = lines.map(
    (l, i) =>
      `${i + 1}. ${l.name}: ${l.fps.toFixed(0)} fps, usual ${l.median.toFixed(1)} ms, slow ${l.p95.toFixed(1)} ms, worst ${l.worst.toFixed(0)} ms, late ${Math.round(l.late * 100)}%, cpu ${l.cpu.toFixed(1)} ms, ${l.calls} calls, ${k(l.triangles)} triangles`,
  );
  return ['Driftwood Cove benchmark', ...about, ...rows].join('\n');
}

/** The readout in the corner: frames a second and the game's own share of a frame. */
export function readout(gaps: readonly number[], work: readonly number[]): string {
  const r = summarise(gaps, work);
  return r.frames ? `${r.fps.toFixed(0)} fps · ${r.cpu.toFixed(1)} ms` : '';
}
