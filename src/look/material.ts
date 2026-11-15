// What everything the sun lights is made of. In the lo-fi look: three.js's toon material with a
// ramp of a few flat tones, and textures whose pixels are meant to be seen.
import * as THREE from 'three';
import type { Look } from './look';

let look: Look | null = null;
let ramp: THREE.DataTexture | null = null;

export function setLook(l: Look): void {
  look = l;
  ramp = null;
}

export const currentLook = (): Look | null => look;

function tones(): THREE.DataTexture {
  if (!ramp) {
    const t = look?.tones.length ? look.tones : [1];
    ramp = new THREE.DataTexture(new Uint8Array(t.map((v) => Math.round(v * 255))), t.length, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
}

/** A texture as the look wants it read: hard pixels in the lo-fi look, smoothed otherwise. */
export function pixelled<T extends THREE.Texture>(t: T): T {
  if (look?.lofi) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapNearestFilter;
    t.anisotropy = 1;
  } else t.anisotropy = 4;
  return t;
}

export interface LitOptions {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  vertexColors?: boolean;
  emissive?: THREE.ColorRepresentation;
  transparent?: boolean;
  /** For the smooth look only: faceted. (The toon material has no facets of its own.) */
  flatShading?: boolean;
}

/** A material for something lit: make every new one with this, not with `new MeshLambertMaterial`. */
export function lit(o: LitOptions = {}): THREE.Material {
  const common = { color: o.color ?? 0xffffff, map: o.map ?? null, vertexColors: o.vertexColors ?? false, transparent: o.transparent ?? false };
  if (look?.lofi) {
    const m = new THREE.MeshToonMaterial({ ...common, gradientMap: tones() });
    if (o.emissive !== undefined) m.emissive.set(o.emissive);
    return m;
  }
  const m = new THREE.MeshLambertMaterial({ ...common, flatShading: o.flatShading ?? false });
  if (o.emissive !== undefined) m.emissive.set(o.emissive);
  return m;
}
