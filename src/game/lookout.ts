// The view from the top of the lighthouse. Through the telescope, a thing held in the middle of
// the glass for a moment is picked out and named. Pure: the angles.

export type Sight = 'trawler' | 'pier' | 'pond' | 'cave' | 'camp' | 'ice';

export const SIGHTS: Record<Sight, string> = {
  trawler: 'The trawler Marigold, hauling her nets. Somebody on deck waves.',
  pier: 'The end of the pier. There is always somebody fishing there.',
  pond: 'The pond, flat as a plate.',
  cave: 'A cave in the cliffs, with the sea running into it. A boat could get in there.',
  camp: 'Your own camp. It looks small from here.',
  ice: 'Something white, right on the northern horizon. Ice, and a lot of it.',
};

/** How near the middle of the glass a thing must be, radians. */
export const SCOPE_AIM = 0.045;

interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Which thing, if any, the telescope is on: the one nearest the middle of the glass, within `SCOPE_AIM`. */
export function sighted(eye: V3, dir: V3, where: Record<Sight, V3 | null>): Sight | null {
  let best: Sight | null = null;
  let least = SCOPE_AIM;
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  for (const [name, at] of Object.entries(where) as [Sight, V3 | null][]) {
    if (!at) continue;
    const dx = at.x - eye.x;
    const dy = at.y - eye.y;
    const dz = at.z - eye.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1) continue;
    const angle = Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dy * dir.y + dz * dir.z) / (d * len))));
    if (angle < least) {
      least = angle;
      best = name;
    }
  }
  return best;
}
