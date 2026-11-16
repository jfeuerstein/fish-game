// What must hold of any far island's ground, whichever it is: used by each island's own test
// file, which says which island by mocking ./isle (everything that says where things are is
// chosen as it is loaded). Not part of the game.
import { expect } from 'vitest';
import { Heightfield, fishingZone, floatable, walkable, waterAt, type Zone } from './island';
import { BOAT_MOORING, CROSSING, PATHS, PIER, PLACES, START, WALKS, floorAt } from './layout';

/** The island's ground, and the things every island must have: a jetty a boat can reach, paths that can be walked, and its waters. */
export function checkIsle(waters: Zone[]): Heightfield {
  const field = new Heightfield();
  // Every path can be walked, on dry ground or on boards.
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++)
      for (let k = 0; k <= 1; k += 0.05) {
        const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k;
        const z = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k;
        expect(walkable(field, x, z), `path at ${x.toFixed(0)},${z.toFixed(0)}`).toBe(true);
        if (floorAt(x, z) === null) expect(waterAt(field, x, z), `water on the path at ${x.toFixed(0)},${z.toFixed(0)}`).toBeNull();
      }
  // The jetty starts on land and ends over water a boat can float in.
  expect(field.heightAt(PIER.x0, PIER.z)).toBeGreaterThan(0.3);
  expect(field.heightAt(PIER.x0, PIER.z)).toBeLessThan(PIER.deck + 0.5);
  expect(field.heightAt(PIER.head.x1, PIER.z)).toBeLessThan(-1.5);
  expect(floatable(field, BOAT_MOORING.x, BOAT_MOORING.z)).toBe(true);
  expect(floatable(field, CROSSING.x, CROSSING.z)).toBe(true);
  // A boat can get from its mooring to the buoy.
  for (let k = 0; k <= 1; k += 0.05) {
    const x = BOAT_MOORING.x + (CROSSING.x - BOAT_MOORING.x) * k;
    const z = BOAT_MOORING.z + 4 + (CROSSING.z - BOAT_MOORING.z - 4) * k;
    expect(floatable(field, x, z), `boat's way at ${x.toFixed(0)},${z.toFixed(0)}`).toBe(true);
  }
  expect(PLACES[START]).toBeTruthy();
  for (const [name, at] of Object.entries(PLACES)) expect(walkable(field, at.x, at.z), `the place called ${name}`).toBe(true);
  // A boardwalk's two ends are on land and its middle is over water that cannot be waded.
  for (const w of WALKS.slice(0, 2)) {
    const long = w.x1 - w.x0 > w.z1 - w.z0;
    const a = long ? [w.x0 + 0.5, (w.z0 + w.z1) / 2] : [(w.x0 + w.x1) / 2, w.z0 + 0.5];
    const b = long ? [w.x1 - 0.5, (w.z0 + w.z1) / 2] : [(w.x0 + w.x1) / 2, w.z1 - 0.5];
    expect(field.heightAt(a[0], a[1])).toBeGreaterThan(0.6);
    expect(field.heightAt(b[0], b[1])).toBeGreaterThan(0.6);
    expect(field.heightAt((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2)).toBeLessThan(-0.6);
  }
  // Its waters, each deep enough somewhere to fish.
  const seen = new Set<Zone>();
  for (let x = -118; x <= 118; x += 1) for (let z = -118; z <= 118; z += 1) {
    const zone = fishingZone(field, x, z);
    if (zone) seen.add(zone);
  }
  expect([...seen].sort()).toEqual([...waters].sort());
  return field;
}
