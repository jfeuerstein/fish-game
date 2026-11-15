// Which way a push of the stick walks, and which way a drag turns the camera. Pure.
//
// The camera stands behind the player at `cameraYaw` (yaw 0: the camera is to the south, +z,
// looking north) and looks at them. Stick up walks away from the camera; stick right walks to
// the right of the screen.

/** Radians the camera goes round for each point a finger is dragged sideways. */
export const TURN = 0.0065;

/** The yaw to walk toward (yaw 0 faces +z) for a stick pushed `x` right and `y` up, seen from a camera at `cameraYaw`. */
export function heading(stick: { x: number; y: number }, cameraYaw: number): number {
  // Away from the camera, and the screen's right for a camera looking that way.
  const fx = -Math.sin(cameraYaw);
  const fz = -Math.cos(cameraYaw);
  const rx = -fz;
  const rz = fx;
  return Math.atan2(fx * stick.y + rx * stick.x, fz * stick.y + rz * stick.x);
}

/**
 * The camera's yaw after a finger is dragged `dx` points to the right. The view goes the way
 * the finger does: dragged right, the camera looks further right, and what was ahead slides
 * off to the left. (The owner tried it the other way round, the world carried with the finger,
 * and asked for this.)
 */
export function turned(yaw: number, dx: number): number {
  return yaw - dx * TURN;
}

/** Where on the screen, to the right (+) or left (-), a point lies for a camera at `cameraYaw` looking at `focus`. */
export function screenRight(cameraYaw: number, focus: { x: number; z: number }, at: { x: number; z: number }): number {
  const fx = -Math.sin(cameraYaw);
  const fz = -Math.cos(cameraYaw);
  return (at.x - focus.x) * -fz + (at.z - focus.z) * fx;
}
