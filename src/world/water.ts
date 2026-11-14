// The sea, the pond and the creek: one material, coloured by how deep the water is over the
// ground beneath it, with a line of foam where it meets the shore and the sun glinting on it.
import * as THREE from 'three';
import { Heightfield } from './island';
import { CREEK, CREEK_WIDTH, POND, creekLevel } from './layout';

export interface WaterLook {
  deep: THREE.Color;
  shallow: THREE.Color;
  foam: THREE.Color;
  sun: THREE.Color;
  sunDir: THREE.Vector3;
  sky: THREE.Color;
}

/** The ground's heights as a texture, so the water can tell how deep it is anywhere. */
function heightTexture(field: Heightfield): THREE.DataTexture {
  const data = new Uint16Array(field.n * field.n);
  for (let k = 0; k < data.length; k++) data[k] = THREE.DataUtils.toHalfFloat(field.heights[k]);
  const tex = new THREE.DataTexture(data, field.n, field.n, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const vertex = /* glsl */ `
#include <fog_pars_vertex>
uniform float uTime;
varying vec3 vWorld;
void main() {
  vec3 p = position;
  vec4 world = modelMatrix * vec4(p, 1.0);
  // A slow swell on the open sea.
  world.y += (sin(world.x * 0.09 + uTime * 0.7) + sin(world.z * 0.07 - uTime * 0.55)) * 0.05 * step(-0.5, -world.y);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform sampler2D uGround;
uniform float uHalf;
uniform float uSize;
uniform vec3 uDeep, uShallow, uFoam, uSun, uSunDir, uSky;
uniform float uRain;
varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void main() {
  vec2 uv = (vWorld.xz + uHalf) / uSize;
  float ground = texture2D(uGround, uv).r;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ground = -14.0;
  float depth = vWorld.y - ground;
  // Ripples: two drifting layers of noise make a wobbling surface normal.
  vec2 q = vWorld.xz;
  float t = uTime;
  float n1 = vnoise(q * 0.45 + vec2(t * 0.35, t * 0.2));
  float n2 = vnoise(q * 0.9 - vec2(t * 0.25, -t * 0.4));
  float n3 = vnoise(q * 3.0 + vec2(t * 1.3, t * 0.9)) * uRain;
  vec3 normal = normalize(vec3((n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.3 + (n3 - 0.5) * 0.6, 1.0, (n2 - 0.5) * 0.5 - (n1 - 0.5) * 0.3));
  // Colour by depth: clear turquoise over sand, deepening to blue.
  float d = clamp(depth / mix(3.0, 7.0, step(vWorld.y, 0.3)), 0.0, 1.0);
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 1.0, sqrt(d)));
  // Thin lighter lines where the swell crests, as a painter draws water in a picture book.
  float crest = (smoothstep(0.47, 0.5, n1) - smoothstep(0.5, 0.53, n1)) * smoothstep(0.35, 0.65, n2);
  col = mix(col, mix(uShallow, uSky, 0.5), crest * 0.22 * (1.0 - d * 0.5));
  // The sky in it, from a calmer surface than the ripples (a lumpy one gives white blotches),
  // and the sun glinting off it, small and sharp.
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 calm = normalize(vec3((n1 - 0.5) * 0.18, 1.0, (n2 - 0.5) * 0.18));
  float fres = pow(1.0 - max(dot(view, calm), 0.0), 4.0);
  col = mix(col, uSky, clamp(fres, 0.0, 1.0) * 0.32);
  vec3 h = normalize(view + normalize(uSunDir));
  // The glint off the calm surface too: a soft path of light toward the sun, which the sparkles below break up.
  float spec = pow(max(dot(calm, h), 0.0), 320.0) * step(0.0, uSunDir.y);
  col += uSun * spec * 0.55;
  float sparkle = smoothstep(0.9, 0.97, vnoise(q * 6.0 + vec2(t * 1.1, -t * 0.7))) * smoothstep(0.75, 0.95, vnoise(q * 1.3 - t * 0.3)) * step(0.0, uSunDir.y) * (1.0 - uRain);
  col += uSun * sparkle * 0.3;
  // Foam where the water meets the shore, pulsing gently in and out.
  // Measured from the waterline itself: a shallow sandy flat a hand's depth down is not surf.
  float edge = depth - 0.03 - 0.03 * sin(t * 1.4 + vWorld.x * 0.3 + vWorld.z * 0.2);
  // A thin line of surf, broken up, rather than a white puddle wherever it is shallow.
  float foam = (1.0 - smoothstep(0.0, 0.1, edge)) * mix(1.0, smoothstep(0.3, 0.6, vnoise(q * 1.6 + vec2(t * 0.3, -t * 0.2))), smoothstep(0.01, 0.08, edge));
  // A second, fainter line a little way out, broken up.
  foam = max(foam, (1.0 - smoothstep(0.0, 0.04, abs(edge - 0.3))) * 0.3 * step(0.5, vnoise(q * 1.2 + t * 0.2)));
  col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * 0.9);
  float alpha = mix(0.55, 0.95, smoothstep(0.0, 2.5, depth));
  alpha = max(alpha, foam * 0.9);
  if (depth < -0.05) discard;
  #ifdef CREEK
  if (ground < 0.02) discard;
  #endif
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Water {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;

  constructor(field: Heightfield) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uGround: { value: null },
          uHalf: { value: field.half },
          uSize: { value: field.half * 2 },
          uDeep: { value: new THREE.Color('#1f6f9a') },
          uShallow: { value: new THREE.Color('#5fd3c6') },
          uFoam: { value: new THREE.Color('#ffffff') },
          uSun: { value: new THREE.Color('#fff4d6') },
          uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
          uSky: { value: new THREE.Color('#bfe3f5') },
          uRain: { value: 0 },
        },
      ]),
    });
    this.material.uniforms.uGround.value = heightTexture(field);

    // The sea: finer near the island, where the swell and the shore line are seen.
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 140, 140).rotateX(-Math.PI / 2), this.material);
    sea.renderOrder = 1;
    sea.name = 'sea';
    this.group.add(sea);

    const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 2.2, 48).rotateX(-Math.PI / 2), this.material);
    pond.position.set(POND.x, POND.level, POND.z);
    pond.renderOrder = 1;
    this.group.add(pond);

    this.group.add(this.creek(field));
  }

  /** A ribbon of water down the creek's line, falling with it. */
  private creek(field: Heightfield): THREE.Mesh {
    const pts: THREE.Vector3[] = [];
    let total = 0;
    const lens = [0];
    for (let i = 1; i < CREEK.length; i++) {
      total += Math.hypot(CREEK[i][0] - CREEK[i - 1][0], CREEK[i][1] - CREEK[i - 1][1]);
      lens.push(total);
    }
    // Every metre along the line.
    for (let s = 0; s <= total; s += 1) {
      let i = 1;
      while (i < lens.length - 1 && lens[i] < s) i++;
      const u = (s - lens[i - 1]) / (lens[i] - lens[i - 1]);
      const x = CREEK[i - 1][0] + (CREEK[i][0] - CREEK[i - 1][0]) * u;
      const z = CREEK[i - 1][1] + (CREEK[i][1] - CREEK[i - 1][1]) * u;
      pts.push(new THREE.Vector3(x, creekLevel(s / total), z));
    }
    // Wider toward the mouth, where the channel opens onto the beach; the banks clip it anyway.
    const widthAt = (k: number): number => CREEK_WIDTH * (1.7 + 2.6 * Math.max(0, (k - 0.6) / 0.4) ** 2);
    const pos: number[] = [];
    const idx: number[] = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)];
      const b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l;
      const nz = dx / l;
      const p = pts[k];
      // Past the end the creek is the sea, so the ribbon stops above the sea's level.
      const y = Math.max(p.y, 0.02);
      const w = widthAt(k / Math.max(1, pts.length - 1));
      pos.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
      if (k > 0) {
        const o = (k - 1) * 2;
        idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
      }
    }
    // Widen the mouth into the pond.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    // The creek's own material shares every uniform with the sea's, but gives way wherever the sea
    // already has water (ground below sea level): no second layer of water at the mouth, no edge.
    const creekMat = new THREE.ShaderMaterial({ vertexShader: this.material.vertexShader, fragmentShader: this.material.fragmentShader, uniforms: this.material.uniforms, defines: { CREEK: 1 }, transparent: true, depthWrite: false, fog: true });
    const mesh = new THREE.Mesh(geo, creekMat);
    mesh.renderOrder = 1;
    void field;
    return mesh;
  }

  update(dt: number, look: WaterLook, rain: number): void {
    const u = this.material.uniforms;
    u.uTime.value += dt;
    u.uDeep.value.copy(look.deep);
    u.uShallow.value.copy(look.shallow);
    u.uFoam.value.copy(look.foam);
    u.uSun.value.copy(look.sun);
    u.uSunDir.value.copy(look.sunDir);
    u.uSky.value.copy(look.sky);
    u.uRain.value = rain;
  }
}
