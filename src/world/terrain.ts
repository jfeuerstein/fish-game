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

/** How much of each ground each point wears: sand, earth, stone, cobbles (grass is what is left). */
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
  // Later layers sit on top of earlier ones.
  let left = 1;
  const take = (w: number): number => {
    const t = Math.min(left, w * left);
    left -= t;
    return t;
  };
  const p = take(cobble);
  const r = take(rock);
  const e = take(earth);
  const s = take(sand);
  return [s, e, r, p];
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
vec3 soft(vec3 c, float k) { float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(c, vec3(l), k); }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 wuv = vGround.xz;
vec3 grass = soft(texture2D(tGrass, wuv / 6.0).rgb, 0.18) * vec3(0.92, 1.0, 0.82);
// Two scales of grass, so its repeat does not show from afar.
grass = mix(grass, soft(texture2D(tGrass, wuv / 23.0).rgb, 0.3) * vec3(0.95, 1.0, 0.8), 0.45);
vec3 sand = soft(texture2D(tSand, wuv / 7.0).rgb, 0.35);
vec3 dirt = soft(texture2D(tDirt, wuv / 4.0).rgb, 0.2);
vec3 rock = soft(texture2D(tRock, wuv / 7.0).rgb, 0.1);
vec3 cob = soft(texture2D(tPlaza, wuv / 4.5).rgb, 0.1);
vec4 w = vSplat;
float g = max(0.0, 1.0 - w.x - w.y - w.z - w.w);
vec3 ground = grass * g + sand * w.x + dirt * w.y + rock * w.z + cob * w.w;
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
