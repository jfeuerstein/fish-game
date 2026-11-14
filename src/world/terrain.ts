// The ground as one mesh, wearing the painted textures blended by what each place is:
// sand by the water, packed earth on the paths, cobbles in the square, stone on steep slopes,
// grass everywhere else.
import * as THREE from 'three';
import { smoothstep } from '../core/rng';
import { Heightfield, pathDistance } from './island';
import { PATH_WIDTH, PLAZA, POND, STEP, CREEK, CREEK_WIDTH, nearestOnLine } from './layout';

const base = import.meta.env.BASE_URL;

export function loadTexture(name: string, repeat = true): THREE.Texture {
  const t = new THREE.TextureLoader().load(`${base}textures/${name}.webp`);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** How much each point is sand, earth, stone and cobbles, each on its own (grass is under them all). */
export function splatAt(field: Heightfield, x: number, z: number): [number, number, number, number] {
  const h = field.heightAt(x, z);
  const slope = field.slopeAt(x, z);
  let sand = smoothstep(1.25, 0.75, h);
  // A sandy rim round the pond and the creek.
  const pondD = Math.hypot(x - POND.x, z - POND.z);
  sand = Math.max(sand, smoothstep(POND.r + 2.5, POND.r + 0.5, pondD) * 0.85);
  const c = nearestOnLine(CREEK, x, z);
  sand = Math.max(sand, smoothstep(CREEK_WIDTH * 2.2, CREEK_WIDTH * 1.1, c.d) * 0.8);
  const rock = smoothstep(0.55, 0.95, slope) * (h > 0.4 ? 1 : 0.4);
  const earth = smoothstep(PATH_WIDTH + 0.6, PATH_WIDTH - 0.5, pathDistance(x, z));
  const cobble = smoothstep(PLAZA.r - 0.5, PLAZA.r - 2.2, Math.hypot(x - PLAZA.x, z - PLAZA.z));
  // Each as much as it would be on its own: the shader lays them one over another, sand, then
  // earth, then rock, then cobbles, each with a painted edge.
  return [sand, earth, rock, cobble];
}

export function buildTerrain(field: Heightfield): THREE.Mesh {
  const n = field.n;
  const half = field.half;
  const positions = new Float32Array(n * n * 3);
  const splat = new Float32Array(n * n * 4);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = i * STEP - half;
      const z = j * STEP - half;
      positions[k * 3] = x;
      positions[k * 3 + 1] = field.heights[k];
      positions[k * 3 + 2] = z;
      splat.set(splatAt(field, x, z), k * 4);
    }
  // Each cell split from its (0,0) corner to its (1,1) corner, as Heightfield.heightAt reads it.
  const index = new Uint32Array((n - 1) * (n - 1) * 6);
  let t = 0;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index.set([a, d, b, a, c, d], t);
      t += 6;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();

  const tex = { grass: loadTexture('grass'), sand: loadTexture('sand'), dirt: loadTexture('dirt'), rock: loadTexture('rock'), plaza: loadTexture('plaza') };
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.tGrass = { value: tex.grass };
    shader.uniforms.tSand = { value: tex.sand };
    shader.uniforms.tDirt = { value: tex.dirt };
    shader.uniforms.tRock = { value: tex.rock };
    shader.uniforms.tPlaza = { value: tex.plaza };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvGround = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tGrass, tSand, tDirt, tRock, tPlaza;
varying vec4 vSplat;
varying vec3 vGround;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return vnoise(p) * 0.6 + vnoise(p * 2.13 + 7.1) * 0.3 + vnoise(p * 4.7 - 3.3) * 0.1; }
// A texture read twice, the second turned and shifted, and the two blended by a slow noise, so
// its repeat never lines up into a grid.
vec3 untiled(sampler2D t, vec2 uv, float n) {
  vec2 r = mat2(0.8, -0.6, 0.6, 0.8) * uv + vec2(0.37, 0.71);
  return mix(texture2D(t, uv).rgb, texture2D(t, r).rgb, smoothstep(0.35, 0.65, n));
}
// Painted edges: a weight pushed about by noise and then sharpened, so one ground meets the next
// along a wavy brush line instead of a smooth fade.
float edge(float w, float n) { return smoothstep(0.45, 0.55, w + (n - 0.5) * 0.7); }
vec3 desat(vec3 c, float k) { return mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))), k); }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 wuv = vGround.xz;
float big = fbm(wuv / 9.0);
float mid = fbm(wuv / 2.6 + 11.0) * 0.7 + vnoise(wuv * 1.1 + 5.0) * 0.3;
vec3 grass = untiled(tGrass, wuv / 4.2, big);
// Patches of sunnier and deeper green, as a painter would lay them in.
grass *= mix(vec3(0.86, 0.94, 0.80), vec3(1.08, 1.06, 0.88), smoothstep(0.3, 0.75, fbm(wuv / 14.0 + 3.0)));
vec3 sand = untiled(tSand, wuv / 6.5, big) * mix(0.94, 1.04, mid);
vec3 dirt = desat(untiled(tDirt, wuv / 4.0, big), 0.42) * vec3(1.04, 0.97, 0.88);
vec3 rock = untiled(tRock, wuv / 6.0, big);
vec3 cob = texture2D(tPlaza, wuv / 3.4).rgb * 0.9;
// Warmer stone, with broad patches of lighter and darker paving so the square is not one grey disc.
cob *= mix(vec3(0.9, 0.86, 0.8), vec3(1.06, 1.0, 0.92), smoothstep(0.25, 0.75, big));
vec4 w = vSplat;
vec4 e = vec4(edge(w.x, mid), edge(w.y, mid), edge(w.z, big), edge(w.w, mid * 0.5 + 0.25));
vec3 ground = grass;
ground = mix(ground, sand, e.x);
ground = mix(ground, dirt, e.y);
ground = mix(ground, rock, e.z);
ground = mix(ground, cob, e.w);
// A kerb of darker stones round the square's edge.
float kerb = smoothstep(0.32, 0.5, w.w + (mid - 0.5) * 0.3) - smoothstep(0.5, 0.62, w.w + (mid - 0.5) * 0.3);
ground *= 1.0 - kerb * 0.28;
// Darker and greener under the water, where it is seen through it.
ground *= mix(vec3(1.0), vec3(0.62, 0.78, 0.74), smoothstep(0.1, -2.5, vGround.y));
diffuseColor.rgb *= ground;`,
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
