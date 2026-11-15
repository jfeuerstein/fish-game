// The sky and the light, following the island's clock and weather: a gradient dome, the sun
// and moon, stars at night, drifting clouds, and the colours the water and fog take.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/rng';
import type { Look } from '../look/look';
import type { WaterLook } from './water';

interface Moment {
  hour: number;
  top: string;
  horizon: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  deep: string;
  shallow: string;
}

/** Hand-tuned moments of the day; the hours between are blended. */
const MOMENTS: Moment[] = [
  { hour: 0, top: '#101d42', horizon: '#2b3d70', sun: '#a9bcff', sunI: 0.75, hemiSky: '#6f82c4', hemiGround: '#2c3352', hemiI: 1.25, deep: '#143a5e', shallow: '#2f7488' },
  { hour: 4.8, top: '#18264f', horizon: '#46497f', sun: '#aab6ff', sunI: 0.7, hemiSky: '#7180bd', hemiGround: '#30344c', hemiI: 1.2, deep: '#183c5c', shallow: '#36717f' },
  { hour: 6.2, top: '#4f6fb3', horizon: '#f6b48a', sun: '#ffc08a', sunI: 1.1, hemiSky: '#9fb0dd', hemiGround: '#6d5a52', hemiI: 0.95, deep: '#2d6790', shallow: '#6ac2bf' },
  { hour: 8, top: '#5aa6e8', horizon: '#cfe8f5', sun: '#fff1d6', sunI: 1.9, hemiSky: '#c4e2ff', hemiGround: '#7f8f62', hemiI: 1.05, deep: '#1e73a3', shallow: '#56d1c6' },
  { hour: 12.5, top: '#3f97e6', horizon: '#c6e7fa', sun: '#fff8ea', sunI: 2.2, hemiSky: '#cfe8ff', hemiGround: '#869466', hemiI: 1.1, deep: '#1a6fa6', shallow: '#4fd6cb' },
  { hour: 16.5, top: '#4c96dd', horizon: '#e9e2c8', sun: '#ffe2b0', sunI: 2.0, hemiSky: '#cfe0f5', hemiGround: '#8a8a60', hemiI: 1.05, deep: '#1e6c9d', shallow: '#5acfc0' },
  { hour: 18.8, top: '#5d63a8', horizon: '#ff9e6e', sun: '#ff9c5c', sunI: 1.4, hemiSky: '#c3a6c9', hemiGround: '#6e5248', hemiI: 0.95, deep: '#30598a', shallow: '#78b3b0' },
  { hour: 20.2, top: '#24306a', horizon: '#86649a', sun: '#b0a8ff', sunI: 0.75, hemiSky: '#7a7ab8', hemiGround: '#3a3448', hemiI: 1.2, deep: '#1b3d64', shallow: '#3d6f82' },
  { hour: 24, top: '#101d42', horizon: '#2b3d70', sun: '#a9bcff', sunI: 0.75, hemiSky: '#6f82c4', hemiGround: '#2c3352', hemiI: 1.25, deep: '#143a5e', shallow: '#2f7488' },
];

export interface Palette {
  top: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  sunI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  deep: THREE.Color;
  shallow: THREE.Color;
  /** The sun's direction (or the moon's, at night). */
  dir: THREE.Vector3;
  /** 0 by day, 1 at full night: lamps, stars. */
  night: number;
}

const c = (s: string): THREE.Color => new THREE.Color(s);
const grey = new THREE.Color('#9aa5b1');

/** The palette for an hour and an amount of rain (0 to 1). Pure apart from making colours. */
export function paletteAt(hour: number, rain: number): Palette {
  let i = 0;
  while (i < MOMENTS.length - 2 && MOMENTS[i + 1].hour <= hour) i++;
  const a = MOMENTS[i];
  const b = MOMENTS[i + 1];
  const t = clamp((hour - a.hour) / (b.hour - a.hour), 0, 1);
  const mix = (x: string, y: string): THREE.Color => c(x).lerp(c(y), t);
  const p: Palette = {
    top: mix(a.top, b.top),
    horizon: mix(a.horizon, b.horizon),
    sun: mix(a.sun, b.sun),
    sunI: lerp(a.sunI, b.sunI, t),
    hemiSky: mix(a.hemiSky, b.hemiSky),
    hemiGround: mix(a.hemiGround, b.hemiGround),
    hemiI: lerp(a.hemiI, b.hemiI, t),
    deep: mix(a.deep, b.deep),
    shallow: mix(a.shallow, b.shallow),
    dir: new THREE.Vector3(),
    night: 0,
  };
  // The sun rises in the east (+x) at six and sets in the west at six; south of overhead.
  const dayAngle = ((hour - 6) / 12) * Math.PI;
  const up = Math.sin(dayAngle);
  p.night = smoothstep(0.05, -0.2, up);
  if (up > -0.08) p.dir.set(Math.cos(dayAngle), Math.max(0.12, up), 0.45).normalize();
  else {
    // The moon, high in the south-west.
    p.dir.set(-0.4, 0.75, 0.5).normalize();
  }
  if (rain > 0) {
    const g = rain * 0.75;
    const dim = 1 - rain * 0.35;
    for (const col of [p.top, p.horizon, p.hemiSky]) col.lerp(grey.clone().multiplyScalar(0.6 + 0.4 * (1 - p.night)), g);
    p.sun.lerp(grey, g);
    p.sunI *= 1 - rain * 0.65;
    p.hemiI *= dim + 0.15;
    p.deep.lerp(c('#36566e'), g * 0.6);
    p.shallow.lerp(c('#6f9a9c'), g * 0.6);
  }
  return p;
}

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFragment = /* glsl */ `
uniform vec3 uTop, uHorizon, uSun, uSunDir;
uniform float uNight;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  #ifdef LOFI
  // Bands of flat colour up from the horizon, and a sun with a hard edge and two flat rings.
  vec3 col = mix(uHorizon, uTop, floor(pow(smoothstep(-0.05, 0.75, h), 0.8) * 7.0 + 0.5) / 7.0);
  col += uSun * (step(0.9968, s) * 1.6 + (step(0.989, s) * 0.1 + step(0.965, s) * 0.06) * (1.0 - uNight * 0.6));
  #else
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.05, 0.75, h), 0.8));
  // The sun's (or moon's) disc and glow.
  col += uSun * (smoothstep(0.9985, 0.9992, s) * 1.6 + pow(s, 24.0) * 0.25 * (1.0 - uNight * 0.6));
  #endif
  // Stars, fading in at night.
  vec3 cell = floor(d * 160.0);
  float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, d.y);
  col += vec3(star) * uNight * 0.9;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class Sky {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
  private dome: THREE.Mesh;
  private domeMat: THREE.ShaderMaterial;
  private clouds: THREE.Object3D[] = [];
  readonly fog: THREE.Fog;
  palette: Palette = paletteAt(12, 0);

  constructor(scene: THREE.Scene, shadows: boolean, private look?: Look) {
    this.domeMat = new THREE.ShaderMaterial({
      defines: look?.lofi ? { LOFI: 1 } : {},
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uNight: { value: 0 } },
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.domeMat);
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);
    this.sun.castShadow = shadows;
    if (shadows) {
      const map = look?.lofi ? 1024 : 2048;
      this.sun.shadow.mapSize.set(map, map);
      const cam = this.sun.shadow.camera;
      cam.left = -32;
      cam.right = 32;
      cam.top = 32;
      cam.bottom = -32;
      cam.near = 1;
      cam.far = 160;
      this.sun.shadow.bias = look?.lofi ? -0.0012 : -0.0006;
      this.sun.shadow.normalBias = 0.04;
    }
    this.group.add(this.sun, this.sun.target, this.hemi);
    this.fog = new THREE.Fog(0xcfe8f5, 120, 520);
    scene.fog = this.fog;
  }

  private snapped(focus: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 {
    const cam = this.sun.shadow.camera;
    const texel = (cam.right - cam.left) / this.sun.shadow.mapSize.x;
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    const snap = (v: number): number => Math.round(v / texel) * texel;
    return new THREE.Vector3().addScaledVector(right, snap(focus.dot(right))).addScaledVector(up, snap(focus.dot(up))).addScaledVector(dir, focus.dot(dir));
  }

  addCloud(cloud: THREE.Object3D): void {
    this.clouds.push(cloud);
    this.group.add(cloud);
  }

  /** Paint the moment onto the scene. `focus` is where the player is, which the shadows follow. */
  update(dt: number, hour: number, rain: number, focus: THREE.Vector3): WaterLook {
    const p = (this.palette = paletteAt(hour, rain));
    const u = this.domeMat.uniforms;
    u.uTop.value.copy(p.top);
    u.uHorizon.value.copy(p.horizon);
    u.uSun.value.copy(p.sun);
    u.uSunDir.value.copy(p.dir);
    u.uNight.value = p.night * (1 - rain);
    this.dome.position.copy(focus);
    this.sun.color.copy(p.sun);
    this.sun.intensity = p.sunI;
    // With hard-edged shadows the shadow's picture must not slide under its own pixels as the
    // player walks: it is moved a whole pixel of itself at a time.
    const at = this.look?.lofi ? this.snapped(focus, p.dir) : focus;
    this.sun.position.copy(at).addScaledVector(p.dir, 80);
    this.sun.target.position.copy(at);
    this.hemi.color.copy(p.hemiSky);
    this.hemi.groundColor.copy(p.hemiGround);
    this.hemi.intensity = p.hemiI;
    this.fog.color.copy(p.horizon).lerp(p.top, 0.15);
    this.fog.near = lerp(120, 40, rain);
    this.fog.far = lerp(520, 230, rain);
    for (const [i, cl] of this.clouds.entries()) {
      cl.position.x += dt * (0.8 + (i % 3) * 0.3);
      if (cl.position.x > 340) cl.position.x -= 680;
      cl.visible = true;
    }
    return { deep: p.deep, shallow: p.shallow, foam: new THREE.Color('#ffffff').lerp(p.horizon, 0.25 + p.night * 0.4), sun: p.sun.clone().multiplyScalar(Math.min(1, p.sunI)), sunDir: p.dir, sky: p.horizon.clone().lerp(p.top, 0.3) };
  }
}
