// The sky and the light, following the island's clock and weather: a gradient dome, the sun
// and moon, stars at night, drifting clouds, and the colours the water and fog take.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/rng';
import type { Look } from '../look/look';
import type { RareSky } from '../look/rare';
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
  // Night is moonlit: a strong pale light from one side and deep blue everywhere it does not
  // reach, so shapes read by their lit faces and lamps have dark to shine in.
  { hour: 0, top: '#0b1636', horizon: '#233a78', sun: '#b4c6ff', sunI: 1.5, hemiSky: '#5670c4', hemiGround: '#1a2244', hemiI: 0.72, deep: '#0f2f58', shallow: '#2a6f8c' },
  { hour: 4.8, top: '#13204a', horizon: '#40467f', sun: '#b0bcff', sunI: 1.35, hemiSky: '#5e72c0', hemiGround: '#20264a', hemiI: 0.78, deep: '#143457', shallow: '#316e84' },
  { hour: 6.2, top: '#4f6fb3', horizon: '#f6b48a', sun: '#ffc08a', sunI: 1.1, hemiSky: '#9fb0dd', hemiGround: '#6d5a52', hemiI: 0.95, deep: '#2d6790', shallow: '#6ac2bf' },
  { hour: 8, top: '#5aa6e8', horizon: '#cfe8f5', sun: '#fff1d6', sunI: 1.9, hemiSky: '#c4e2ff', hemiGround: '#7f8f62', hemiI: 1.05, deep: '#1e73a3', shallow: '#56d1c6' },
  { hour: 12.5, top: '#3f97e6', horizon: '#c6e7fa', sun: '#fff8ea', sunI: 2.2, hemiSky: '#cfe8ff', hemiGround: '#869466', hemiI: 1.1, deep: '#1a6fa6', shallow: '#4fd6cb' },
  { hour: 16.5, top: '#4c96dd', horizon: '#e9e2c8', sun: '#ffe2b0', sunI: 2.0, hemiSky: '#cfe0f5', hemiGround: '#8a8a60', hemiI: 1.05, deep: '#1e6c9d', shallow: '#5acfc0' },
  { hour: 18.8, top: '#5d63a8', horizon: '#ff9e6e', sun: '#ff9c5c', sunI: 1.4, hemiSky: '#c3a6c9', hemiGround: '#6e5248', hemiI: 0.95, deep: '#30598a', shallow: '#78b3b0' },
  { hour: 20.2, top: '#1c285e', horizon: '#7a5c98', sun: '#b6b0ff', sunI: 1.3, hemiSky: '#6a6eb8', hemiGround: '#2a2848', hemiI: 0.82, deep: '#163860', shallow: '#356c84' },
  { hour: 24, top: '#0b1636', horizon: '#233a78', sun: '#b4c6ff', sunI: 1.5, hemiSky: '#5670c4', hemiGround: '#1a2244', hemiI: 0.72, deep: '#0f2f58', shallow: '#2a6f8c' },
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
    p.dir.copy(MOONLIGHT);
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

/** Where the moon's light comes from, and where the moon is drawn. */
const MOONLIGHT = new THREE.Vector3(-0.4, 0.75, 0.5).normalize();
const MOON_SEEN = new THREE.Vector3(-0.4, 0.2, 0.5).normalize();

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFragment = /* glsl */ `
uniform vec3 uTop, uHorizon, uSun, uSunDir;
uniform float uMoon;
uniform float uNight;
uniform float uAurora, uBlood, uDawn, uTime;
varying vec3 vDir;
float hash1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float wave(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash1(i), hash1(i + 1.0), f); }
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  #ifdef LOFI
  // Bands of flat colour up from the horizon, and a sun with a hard edge and two flat rings.
  vec3 col = mix(uHorizon, uTop, floor(pow(smoothstep(-0.05, 0.75, h), 0.8) * 7.0 + 0.5) / 7.0);
  // At night the disc is the moon: a little bigger, and bitten into a crescent by a second disc beside it.
  float moon = uMoon;
  float disc = step(mix(0.9968, 0.9974, moon), s);
  vec3 sd = normalize(uSunDir);
  vec3 bite = normalize(sd + normalize(cross(sd, vec3(0.0, 1.0, 0.0))) * 0.036 + vec3(0.0, 0.014, 0.0));
  // A great sunrise: bands of rose and gold climb the sky, streaked with lit cloud, round a bigger sun.
  float glow = uDawn * (1.0 - step(0.62, h));
  vec3 fire = h < 0.1 ? vec3(1.0, 0.72, 0.36) : (h < 0.24 ? vec3(0.98, 0.5, 0.36) : (h < 0.42 ? vec3(0.86, 0.42, 0.52) : vec3(0.56, 0.36, 0.62)));
  col = mix(col, fire, glow * 0.85);
  float az = atan(d.x, -d.z);
  float streak = step(0.62, wave(az * 5.0 + floor(h * 46.0) * 3.7)) * step(0.5, wave(floor(h * 46.0) * 1.3)) * step(0.03, h) * (1.0 - step(0.36, h));
  col = mix(col, vec3(1.0, 0.86, 0.66), streak * uDawn * 0.7);
  disc = max(disc, uDawn * step(0.9925, s));
  // A blood moon is whole, bigger and red.
  disc = mix(disc, step(0.9966, s), uBlood * moon);
  disc *= 1.0 - moon * (1.0 - uBlood) * step(0.998, dot(d, bite));
  vec3 lamp = mix(uSun, vec3(0.92, 0.3, 0.2), uBlood * moon);
  col += lamp * (disc * 1.6 + (step(0.989, s) * 0.1 + step(0.965, s) * 0.06 + uDawn * step(0.93, s) * 0.08) * (1.0 - uNight * 0.6));
  col = mix(col, vec3(0.8, 0.22, 0.14), disc * uBlood * moon);
  col += vec3(0.42, 0.06, 0.05) * uBlood * moon * (1.0 - disc) * (step(0.9925, s) * 0.5 + step(0.984, s) * 0.3);
  // The northern lights: curtains in the north, green at the foot and violet above, that shift a few times a second.
  float tA = floor(uTime * 3.0) / 3.0;
  float foot = 0.2 + 0.09 * sin(az * 2.3 + tA * 0.21) + 0.05 * sin(az * 5.1 - tA * 0.13);
  float up = (d.y - foot) / 0.34;
  float ray = wave(az * 34.0 + tA * 0.9) * 0.6 + wave(az * 7.0 - tA * 0.4) * 0.4;
  float north = smoothstep(0.15, 0.6, -d.z + 0.25);
  float curtain = step(0.0, up) * step(up, 1.0) * step(0.42 + up * 0.35, ray) * north;
  vec3 lights = up < 0.3 ? vec3(0.38, 0.92, 0.62) : (up < 0.62 ? vec3(0.3, 0.72, 0.7) : vec3(0.56, 0.42, 0.78));
  col = mix(col, lights, curtain * uAurora * (up < 0.62 ? 0.8 : 0.5));
  #else
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.05, 0.75, h), 0.8));
  // The sun's (or moon's) disc and glow.
  col += uSun * (smoothstep(0.9985, 0.9992, s) * 1.6 + pow(s, 24.0) * 0.25 * (1.0 - uNight * 0.6));
  #endif
  // Stars, fading in at night.
  vec3 cell = floor(d * 160.0);
  float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, d.y);
  #ifdef LOFI
  // None inside the moon's round, lit or dark.
  star *= 1.0 - uMoon * step(mix(0.9974, 0.9966, uBlood), s);
  #endif
  col += vec3(star) * uNight * 0.9;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** The air besides rain: how foggy and how stormy it is (0 to 1), a flash of lightning, and what the season does to the light. */
export interface Air {
  fog: number;
  storm: number;
  flash: number;
  sun: THREE.Color;
  fill: THREE.Color;
  /** A sky that is not there every day (src/look/rare.ts), if one is. */
  rare?: RareSky | null;
  /** Show it at once, not eased in (when it is pinned from the address). */
  rareNow?: boolean;
}
const STILL: Air = { fog: 0, storm: 0, flash: 0, sun: new THREE.Color(0xffffff), fill: new THREE.Color(0xffffff) };

export class Sky {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
  private dome: THREE.Mesh;
  private domeMat: THREE.ShaderMaterial;
  private clouds: THREE.Object3D[] = [];
  /** The colour clouds are drawn in: white by day, the night sky's own a little lifted after dark. */
  readonly cloudInk = new THREE.Color(0xffffff);
  readonly fog: THREE.Fog;
  palette: Palette = paletteAt(12, 0);
  /** How much of each rare sky is showing, 0 to 1. */
  private rare = { aurora: 0, bloodmoon: 0, sunrise: 0 };

  constructor(scene: THREE.Scene, shadows: boolean, private look?: Look) {
    this.domeMat = new THREE.ShaderMaterial({
      defines: look?.lofi ? { LOFI: 1 } : {},
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uNight: { value: 0 }, uMoon: { value: 0 }, uAurora: { value: 0 }, uBlood: { value: 0 }, uDawn: { value: 0 }, uTime: { value: 0 } },
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
  update(dt: number, hour: number, rain: number, focus: THREE.Vector3, air: Air = STILL): WaterLook {
    const p = (this.palette = paletteAt(hour, rain));
    // A storm is darker than rain; fog is pale and close; lightning whitens everything for a moment.
    if (air.storm > 0) {
      for (const col of [p.top, p.horizon, p.hemiSky]) col.multiplyScalar(1 - air.storm * 0.35);
      p.sunI *= 1 - air.storm * 0.4;
      p.hemiI *= 1 - air.storm * 0.25;
    }
    if (air.fog > 0) {
      const pale = new THREE.Color('#c9d3d4').multiplyScalar(1 - p.night * 0.72);
      for (const col of [p.top, p.horizon, p.hemiSky]) col.lerp(pale, air.fog * 0.9);
      p.sunI *= 1 - air.fog * 0.55;
    }
    if (air.flash > 0) {
      const white = new THREE.Color('#e8f0ff');
      for (const col of [p.top, p.horizon]) col.lerp(white, air.flash * 0.8);
      p.hemiI += air.flash * 2.2;
    }
    // The rare skies come and go slowly. A blood moon reddens the night; the sunrise warms the dawn.
    const ease = air.rareNow ? 1 : Math.min(1, dt * 0.6);
    for (const k of ['aurora', 'bloodmoon', 'sunrise'] as const) this.rare[k] += ((air.rare === k ? 1 : 0) - this.rare[k]) * ease;
    if (this.rare.bloodmoon > 0.01) {
      p.sun.lerp(new THREE.Color('#ff8a70'), this.rare.bloodmoon * 0.55 * p.night);
      p.hemiSky.lerp(new THREE.Color('#7a4a6a'), this.rare.bloodmoon * 0.4 * p.night);
      p.horizon.lerp(new THREE.Color('#4a2440'), this.rare.bloodmoon * 0.45 * p.night);
    }
    if (this.rare.sunrise > 0.01) {
      p.sun.lerp(new THREE.Color('#ffb070'), this.rare.sunrise * 0.5);
      p.hemiSky.lerp(new THREE.Color('#e8a8b0'), this.rare.sunrise * 0.4);
      p.horizon.lerp(new THREE.Color('#ffb86a'), this.rare.sunrise * 0.6);
    }
    if (this.rare.aurora > 0.01) p.hemiSky.lerp(new THREE.Color('#58b89a'), this.rare.aurora * 0.25 * p.night);
    // The season's light.
    p.sun.multiply(air.sun);
    p.hemiSky.multiply(air.fill);
    const u = this.domeMat.uniforms;
    u.uTop.value.copy(p.top);
    u.uHorizon.value.copy(p.horizon);
    u.uSun.value.copy(p.sun);
    // The moon lights the island from high up, where the camera never looks: it is drawn lower
    // in the same quarter of the sky, as a storybook's moon is, so that it is seen.
    const moon = p.dir.x === MOONLIGHT.x && p.dir.y === MOONLIGHT.y;
    u.uSunDir.value.copy(moon ? MOON_SEEN : p.dir);
    u.uMoon.value = moon ? 1 : 0;
    u.uNight.value = p.night * (1 - rain);
    u.uTime.value += dt;
    u.uAurora.value = this.rare.aurora * p.night;
    u.uBlood.value = this.rare.bloodmoon;
    u.uDawn.value = this.rare.sunrise;
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
    this.cloudInk.set(0xffffff).lerp(p.top, p.night * 0.72).lerp(p.horizon, rain * 0.5);
    this.fog.near = lerp(lerp(120, 40, rain), 6, air.fog);
    this.fog.far = lerp(lerp(520, 230, rain), 58, air.fog);
    for (const [i, cl] of this.clouds.entries()) {
      cl.position.x += dt * (0.8 + (i % 3) * 0.3);
      if (cl.position.x > 340) cl.position.x -= 680;
      cl.visible = true;
    }
    return { deep: p.deep, shallow: p.shallow, foam: new THREE.Color('#ffffff').lerp(p.horizon, 0.25 + p.night * 0.4), sun: p.sun.clone().multiplyScalar(Math.min(1, p.sunI)), sunDir: p.dir, sky: p.horizon.clone().lerp(p.top, 0.3) };
  }
}
