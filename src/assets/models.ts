// Loads the generated models (public/models/*.glb) and gets them ready to stand in the world:
// a set height, their feet on the ground, centred, and drawn with the look's own material.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { currentLook, lit, pixelled } from '../look/material';

export interface ModelInfo {
  kind: string;
  h: number | null;
  rig?: boolean;
  /** Who made it: Tripo's own models face +x, and are turned to face +z like the rest. */
  source?: string;
}

const base = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

let index: Record<string, ModelInfo> = {};
const loaded = new Map<string, Promise<THREE.Object3D | null>>();

export async function loadIndex(): Promise<Record<string, ModelInfo>> {
  try {
    index = await (await fetch(`${base}models/index.json`)).json();
  } catch {
    index = {};
  }
  return index;
}

export const hasModel = (id: string): boolean => id in index;
export const infoOf = (id: string): ModelInfo | undefined => index[id];

/** The look's material (`lit`): the textures already carry their colour, in the island's inks. */
function soften(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const old = mesh.material as THREE.MeshStandardMaterial;
    // Lo-fi: every face its own flat tone. The models are cut down to a few hundred triangles,
    // and the toon material has no facets of its own, so each face is given its own corners.
    if (currentLook()?.lofi) {
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      g.computeVertexNormals();
      mesh.geometry = g;
    }
    const painted = !!mesh.geometry.getAttribute('color');
    if (old.map) {
      old.map.colorSpace = THREE.SRGBColorSpace;
      pixelled(old.map);
    }
    mesh.material = lit({ map: old.map ?? null, color: old.map || painted ? 0xffffff : old.color, vertexColors: painted && !old.map, flatShading: painted && !old.map });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
  });
}

/**
 * The model, scaled so that it stands `height` metres tall (or the manifest's height), its lowest
 * point at y = 0 and its middle over the origin. Each call gives a fresh copy that may be moved freely.
 */
export async function model(id: string, height?: number): Promise<THREE.Object3D | null> {
  if (!loaded.has(id)) {
    loaded.set(
      id,
      loader
        .loadAsync(`${base}models/${id}.glb`)
        .then((gltf) => {
          const root = gltf.scene;
          soften(root);
          return root;
        })
        .catch((e) => {
          console.warn(`model ${id} could not be loaded`, e);
          return null;
        }),
    );
  }
  const proto = await loaded.get(id)!;
  if (!proto) return null;
  const copy = index[id]?.rig ? (SkeletonUtils.clone(proto) as THREE.Object3D) : proto.clone(true);
  if (index[id]?.source === 'tripo') copy.rotation.y -= Math.PI / 2;
  return fit(copy, height ?? index[id]?.h ?? 1);
}

/** Wrap a model so it stands `height` tall with its feet at the origin. */
export function fit(inner: THREE.Object3D, height: number, long = false): THREE.Object3D {
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner, true);
  const size = box.getSize(new THREE.Vector3());
  const along = long ? Math.max(size.x, size.y, size.z) : size.y;
  const s = height / (along || 1);
  inner.scale.multiplyScalar(s);
  const centre = box.getCenter(new THREE.Vector3());
  inner.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
  const outer = new THREE.Group();
  outer.add(inner);
  outer.userData.size = size.multiplyScalar(s);
  return outer;
}

/** The first mesh in a model, for instancing it. */
export function firstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  return found;
}
