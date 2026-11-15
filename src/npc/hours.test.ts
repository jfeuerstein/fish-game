import { describe, expect, it } from 'vitest';
import { HAUNTS, hauntNow } from './hours';
import { NAMES } from './talk';

describe('the hours islanders keep', () => {
  it('gives each neighbour one time of day at one of their own spots', () => {
    expect(Object.keys(HAUNTS).sort()).toEqual(['npc-bear', 'npc-beaver', 'npc-duck']);
    for (const [id, h] of Object.entries(HAUNTS)) {
      expect(NAMES[id as keyof typeof NAMES]).toBeTruthy();
      expect(h.leg).toBeGreaterThanOrEqual(0);
      expect(h.leg).toBeLessThan(3);
      expect(h.says.length).toBeGreaterThan(10);
    }
  });

  it('finds Puddle on the pier at noon, Birch by the creek at dawn and Juniper at the camp all night', () => {
    expect(hauntNow('npc-duck', 12)).toBe(HAUNTS['npc-duck']);
    expect(hauntNow('npc-duck', 14)).toBeNull();
    expect(hauntNow('npc-beaver', 6)).toBe(HAUNTS['npc-beaver']);
    expect(hauntNow('npc-beaver', 12)).toBeNull();
    // Through midnight.
    expect(hauntNow('npc-bear', 22)).toBe(HAUNTS['npc-bear']);
    expect(hauntNow('npc-bear', 2)).toBe(HAUNTS['npc-bear']);
    expect(hauntNow('npc-bear', 5)).toBeNull();
    expect(hauntNow('npc-bear', 12)).toBeNull();
    expect(hauntNow('npc-pelican', 12)).toBeNull();
  });

  it('leaves everyone most of the day to fish', () => {
    for (const id of Object.keys(HAUNTS)) {
      let hours = 0;
      for (let h = 0; h < 24; h += 0.25) if (hauntNow(id, h)) hours += 0.25;
      expect(hours).toBeLessThan(10);
      expect(hours).toBeGreaterThan(1);
    }
  });
});
