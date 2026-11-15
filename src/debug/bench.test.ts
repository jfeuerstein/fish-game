import { describe, expect, it } from 'vitest';
import { BENCH_STEPS, benchReport, readout, summarise } from './bench';
import { PLACES } from '../world/layout';

describe('the benchmark', () => {
  it('stands only in places there are', () => {
    for (const s of BENCH_STEPS) expect(PLACES[s.at], s.at).toBeDefined();
    expect(new Set(BENCH_STEPS.map((s) => s.name)).size).toBe(BENCH_STEPS.length);
  });

  it('says a steady sixty frames a second is sixty, with nothing late', () => {
    const r = summarise(new Array(300).fill(1000 / 60), new Array(300).fill(4));
    expect(r.fps).toBeCloseTo(60, 1);
    expect(r.median).toBeCloseTo(16.67, 1);
    expect(r.late).toBe(0);
    expect(r.cpu).toBe(4);
    expect(r.frames).toBe(300);
  });

  it('counts the frames that missed a refresh, and finds the slow ones', () => {
    const gaps = [...new Array(90).fill(16.7), ...new Array(10).fill(33.4)];
    const r = summarise(gaps, []);
    expect(r.late).toBeCloseTo(0.1, 5);
    expect(r.median).toBeCloseTo(16.7, 5);
    expect(r.p95).toBeCloseTo(33.4, 5);
    expect(r.worst).toBeCloseTo(33.4, 5);
    expect(r.fps).toBeLessThan(60);
    expect(r.cpu).toBe(0);
  });

  it('makes nothing of no frames', () => {
    expect(summarise([], []).fps).toBe(0);
    expect(readout([], [])).toBe('');
  });

  it('writes a line for each step under what it ran on', () => {
    const text = benchReport(['402 x 874 at 3x'], [{ name: 'Plaza, midday', calls: 80, triangles: 720446, ...summarise(new Array(60).fill(16.7), new Array(60).fill(3.2)) }]);
    const lines = text.split('\n');
    expect(lines[0]).toBe('Driftwood Cove benchmark');
    expect(lines[1]).toBe('402 x 874 at 3x');
    expect(lines[2]).toBe('1. Plaza, midday: 60 fps, usual 16.7 ms, slow 16.7 ms, worst 17 ms, late 0%, cpu 3.2 ms, 80 calls, 720k triangles');
    expect(readout(new Array(60).fill(16.7), new Array(60).fill(3.2))).toBe('60 fps · 3.2 ms');
  });
});
