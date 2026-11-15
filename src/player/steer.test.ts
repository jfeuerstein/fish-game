import { describe, expect, it } from 'vitest';
import { heading, screenRight, turned } from './steer';

/** A step from the origin along a yaw (yaw 0 faces +z). */
const step = (yaw: number) => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
const here = { x: 0, z: 0 };

describe('steering', () => {
  it('walks to the right of the screen when the stick is pushed right, whichever way the camera looks', () => {
    for (let yaw = -3; yaw <= 3; yaw += 0.37) {
      expect(screenRight(yaw, here, step(heading({ x: 1, y: 0 }, yaw)))).toBeCloseTo(1, 6);
      expect(screenRight(yaw, here, step(heading({ x: -1, y: 0 }, yaw)))).toBeCloseTo(-1, 6);
    }
  });

  it('walks away from the camera when the stick is pushed up', () => {
    for (let yaw = -3; yaw <= 3; yaw += 0.37) {
      const to = step(heading({ x: 0, y: 1 }, yaw));
      // The camera stands at (sin yaw, cos yaw) from the player: away from it is the other way.
      expect(to.x * Math.sin(yaw) + to.z * Math.cos(yaw)).toBeCloseTo(-1, 6);
      expect(screenRight(yaw, here, to)).toBeCloseTo(0, 6);
    }
  });

  it('looks the way a dragging finger goes', () => {
    // Something straight ahead of the player; the finger goes right; the view turns right, so it ends up to the left.
    const yaw = 0.4;
    const ahead = { x: -Math.sin(yaw) * 5, z: -Math.cos(yaw) * 5 };
    expect(screenRight(yaw, here, ahead)).toBeCloseTo(0, 6);
    expect(screenRight(turned(yaw, 40), here, ahead)).toBeLessThan(-0.5);
    expect(screenRight(turned(yaw, -40), here, ahead)).toBeGreaterThan(0.5);
  });
});
