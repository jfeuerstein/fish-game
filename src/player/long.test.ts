import { describe, expect, it } from 'vitest';
import { lieOf } from './long';

/** A tube along x from x0 to x1, of a radius, in so many rings of so many sides: nine numbers a triangle. */
function tube(x0: number, x1: number, r: number, rings: number, sides: number): number[] {
  const out: number[] = [];
  const at = (i: number, k: number): [number, number, number] => {
    const a = (k / sides) * Math.PI * 2;
    return [x0 + ((x1 - x0) * i) / rings, Math.cos(a) * r, Math.sin(a) * r];
  };
  for (let i = 0; i < rings; i++)
    for (let k = 0; k < sides; k++) {
      const a = at(i, k);
      const b = at(i + 1, k);
      const c = at(i + 1, k + 1);
      const d = at(i, k + 1);
      out.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  return out;
}

/** Turn every point about the z axis, and move it. */
function moved(tris: number[], turn: number, by: [number, number, number]): number[] {
  const out: number[] = [];
  for (let i = 0; i < tris.length; i += 3) out.push(tris[i] * Math.cos(turn) - tris[i + 1] * Math.sin(turn) + by[0], tris[i] * Math.sin(turn) + tris[i + 1] * Math.cos(turn) + by[1], tris[i + 2] + by[2]);
  return out;
}

describe('how a rod lies', () => {
  // A thick grip in a handful of triangles, and a long thin shaft in a great many: as a rod is
  // once it has been cut down, with its triangles in the fiddly end.
  const grip = tube(0, 0.4, 0.06, 1, 5);
  const shaft = tube(0.4, 1.6, 0.008, 60, 8);
  const rod = [...grip, ...shaft];

  it('is held by the thick end, however many triangles the thin end has', () => {
    expect(shaft.length).toBeGreaterThan(grip.length * 50);
    const lie = lieOf(rod);
    expect(lie.dir[0]).toBeGreaterThan(0.99);
    expect(lie.hi - lie.lo).toBeCloseTo(1.6, 2);
    // The held end is the grip's, at x = 0.
    expect(lie.mean[0] + lie.dir[0] * lie.lo).toBeCloseTo(0, 2);
  });

  it('is the same rod whichever way it is lying', () => {
    for (const turn of [0.7, 2.1, Math.PI, -1.3]) {
      const lie = lieOf(moved(rod, turn, [3, -2, 0.5]));
      // From the held end toward the tip is the way the rod was turned.
      expect(lie.dir[0]).toBeCloseTo(Math.cos(turn), 2);
      expect(lie.dir[1]).toBeCloseTo(Math.sin(turn), 2);
      expect(lie.mean[0] + lie.dir[0] * lie.lo).toBeCloseTo(3, 2);
      expect(lie.mean[1] + lie.dir[1] * lie.lo).toBeCloseTo(-2, 2);
      expect(lie.hi - lie.lo).toBeCloseTo(1.6, 2);
    }
  });

  it('is not fooled by a hook hanging from the tip', () => {
    // A small bobber on the end of a thread, off to one side of the tip.
    const hook = moved(tube(0, 0.08, 0.03, 2, 6), Math.PI / 2, [1.55, -0.3, 0]);
    const lie = lieOf([...rod, ...hook]);
    expect(lie.dir[0]).toBeGreaterThan(0.97);
    expect(lie.mean[0] + lie.dir[0] * lie.lo).toBeLessThan(0.1);
  });

  it('makes something of nothing', () => {
    const lie = lieOf([]);
    expect(lie.dir).toEqual([0, 1, 0]);
    expect(lie.hi).toBeGreaterThan(lie.lo);
  });
});

describe('what hangs from a rod', () => {
  // The lo-fi tool's own rule (tools/assets/rod-trim.mjs), which is not part of the game: loaded by its path.
  const tool = new URL('../../tools/assets/rod-trim.mjs', import.meta.url).href;
  const load = async (): Promise<(pos: number[], idx: number[]) => { keep: number[]; cut: number }> => (await import(/* @vite-ignore */ tool)).trimHanging;
  const indexed = (tris: number[]): number[] => Array.from({ length: tris.length / 3 }, (_, i) => i);

  const grip = tube(0, 0.4, 0.06, 2, 6);
  const shaft = tube(0.4, 1.6, 0.01, 30, 6);
  // A guide ring standing a little off the shaft, two thirds of the way up.
  const guide = moved(tube(0, 0.02, 0.02, 1, 6), 0, [1.1, 0.03, 0]);

  it('is taken off: a bobber on a thread from the tip', () => {
    const thread = moved(tube(0, 0.45, 0.004, 6, 4), -Math.PI / 2, [1.58, 0, 0]);
    const bobber = moved(tube(0, 0.1, 0.05, 2, 6), -Math.PI / 2, [1.58, -0.45, 0]);
    const rod = [...grip, ...shaft, ...guide];
    return load().then((trim) => {
      const all = [...rod, ...thread, ...bobber];
      const { keep, cut } = trim(all, indexed(all));
      // All of the bobber and most of the thread go (a stub of it is left at the tip); every triangle of the rod stays.
      expect(cut).toBeGreaterThanOrEqual(bobber.length / 9 + (thread.length / 9) * 0.6);
      expect(cut).toBeLessThanOrEqual((bobber.length + thread.length) / 9);
      expect(keep.length / 3).toBeGreaterThanOrEqual(rod.length / 9);
      for (let i = 0; i < rod.length / 3; i++) expect(keep).toContain(i);
    });
  });

  it('leaves a rod with nothing hanging from it alone, bent or straight', async () => {
    const trim = await load();
    const straight = [...grip, ...shaft, ...guide];
    expect(trim(straight, indexed(straight)).cut).toBe(0);
    // Bent: each point pushed sideways by the square of how far along it is.
    const bent = straight.map((v, i) => (i % 3 === 1 ? v + 0.06 * straight[i - 1] * straight[i - 1] : v));
    expect(trim(bent, indexed(bent)).cut).toBe(0);
  });

  it('does not take the reel, which sticks out further than anything', async () => {
    const trim = await load();
    const reel = moved(tube(0, 0.12, 0.07, 2, 8), Math.PI / 2, [0.5, 0.05, 0]);
    const rod = [...grip, ...shaft, ...reel];
    expect(trim(rod, indexed(rod)).cut).toBe(0);
  });
});
