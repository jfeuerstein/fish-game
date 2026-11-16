import { describe, expect, it, vi } from 'vitest';

// Everything that says where things are is chosen as it is loaded: this file is Kettle Isle's.
vi.mock('./isle', async () => (await import('./isleMock')).mockIsle('kettle'));

import { Heightfield, fishingZone, floatable, walkable, waterAt, type Zone } from './island';
import { KETTLE, POOLS, REEF, kettleShore } from './kettle';
import { BOAT_MOORING, CROSSING, PATHS, PIER, PLACES, POND, START } from './layout';

const field = new Heightfield();

describe('Kettle Isle', () => {
  it('has a lake in its crater, held in all the way round, with a way in on foot', () => {
    expect(POND.level).toBe(KETTLE.level);
    expect(waterAt(field, KETTLE.x, KETTLE.z)?.zone).toBe('lake');
    expect(waterAt(field, KETTLE.x, KETTLE.z)!.depth).toBeGreaterThan(3);
    // The rim is above the water everywhere.
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      let top = -Infinity;
      for (let r = KETTLE.lake + 1; r <= KETTLE.rim + 2; r += 0.5) top = Math.max(top, field.heightAt(KETTLE.x + Math.cos(a) * r, KETTLE.z + Math.sin(a) * r));
      expect(top, `rim at ${a.toFixed(2)}`).toBeGreaterThan(KETTLE.level + 0.3);
    }
  });

  it('can be walked from the jetty along every path, dry', () => {
    for (const path of PATHS)
      for (let i = 1; i < path.length; i++)
        for (let k = 0; k <= 1; k += 0.05) {
          const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k;
          const z = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k;
          expect(walkable(field, x, z), `path at ${x.toFixed(0)},${z.toFixed(0)}`).toBe(true);
          expect(waterAt(field, x, z), `water on the path at ${x.toFixed(0)},${z.toFixed(0)} h=${field.heightAt(x, z).toFixed(2)}`).toBeNull();
        }
  });

  it('has a jetty that starts on land and ends over water a boat can float in', () => {
    expect(field.heightAt(PIER.x0, PIER.z)).toBeGreaterThan(0.3);
    expect(field.heightAt(PIER.x0, PIER.z)).toBeLessThan(PIER.deck + 0.4);
    expect(field.heightAt(PIER.head.x1, PIER.z)).toBeLessThan(-1.5);
    expect(floatable(field, BOAT_MOORING.x, BOAT_MOORING.z)).toBe(true);
    expect(floatable(field, CROSSING.x, CROSSING.z)).toBe(true);
    expect(PLACES[START]).toBeTruthy();
  });

  it('has every water it should, each deep enough to fish, and a spring that is only sat in', () => {
    const seen = new Set<Zone>();
    for (let x = -118; x <= 118; x += 1) for (let z = -118; z <= 118; z += 1) {
      const zone = fishingZone(field, x, z);
      if (zone) seen.add(zone);
    }
    expect([...seen].sort()).toEqual(['deep', 'lake', 'ocean', 'pools', 'reef']);
    const tide = POOLS.filter((p) => !p.hot);
    expect(tide.length).toBeGreaterThanOrEqual(4);
    for (const p of tide) {
      expect(fishingZone(field, p.x, p.z), `pool at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe('pools');
      // Above the sea, and with dry rock beside it to stand on.
      expect(p.level).toBeGreaterThan(0.3);
      expect(waterAt(field, p.x + p.r + 2, p.z)?.zone ?? null).not.toBe('pools');
    }
    const hot = POOLS.find((p) => p.hot)!;
    expect(waterAt(field, hot.x, hot.z)?.zone).toBe('spring');
    expect(fishingZone(field, hot.x, hot.z)).toBeNull();
    expect(walkable(field, hot.x, hot.z)).toBe(true);
  });

  it('keeps the reef shallow a long way out', () => {
    let wade = 0;
    const a = REEF.at;
    for (let out = 2; out < 34; out += 1) {
      const d = kettleShore(a) + out;
      if (waterAt(field, Math.cos(a) * d, Math.sin(a) * d)?.zone === 'reef') wade++;
    }
    expect(wade).toBeGreaterThan(18);
  });
});
