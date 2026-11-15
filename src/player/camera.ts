// The camera: behind and above the player, turned by dragging, eased so it never jerks.
import * as THREE from 'three';
import { clamp } from '../core/rng';
import type { Heightfield } from '../world/island';
import { turned } from './steer';

export class CameraRig {
  yaw = 0;
  pitch = 0.5;
  distance = 9.5;
  /** How the player has zoomed, kept between visits. */
  zoom = 1;
  private target = new THREE.Vector3();
  private smoothed = new THREE.Vector3();
  /** Set to go straight to where it is looking, without easing there (after a jump from one place to another). */
  first = true;
  /** The distance actually used, eased toward what is wanted. */
  private held = 9;
  /** A place to look at instead of the player (the chalk board, the catch). */
  override: { pos: THREE.Vector3; dist: number; pitch: number } | null = null;
  /** A brief nudge, as when a fish strikes. */
  private shake = 0;
  /** Things the camera should not end up behind (trees, buildings): it comes in closer instead. */
  obstacles: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private pulledIn = Infinity;
  private rooms = new Map<THREE.Object3D, THREE.Box3>();
  private checkClock = 0;

  constructor(readonly camera: THREE.PerspectiveCamera, private field: Heightfield) {}

  /** The box an obstacle fills, a little larger, worked out once. */
  private roomOf(o: THREE.Object3D): THREE.Box3 {
    let box = this.rooms.get(o);
    if (!box) {
      box = new THREE.Box3().setFromObject(o).expandByScalar(0.4);
      this.rooms.set(o, box);
    }
    return box;
  }

  turn(dx: number, dy: number): void {
    this.yaw = turned(this.yaw, dx);
    this.pitch = clamp(this.pitch + dy * 0.004, 0.08, 1.25);
  }

  zoomBy(d: number): void {
    this.zoom = clamp(this.zoom * Math.exp(d), 0.45, 2.2);
  }

  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  /** Swing gently toward looking along a yaw (used when casting). */
  ease(yaw: number, dt: number, rate = 3): void {
    let d = yaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-dt * rate));
  }

  update(dt: number, focus: THREE.Vector3): void {
    const o = this.override;
    this.target.copy(o ? o.pos : focus);
    if (!o) this.target.y += 1.0;
    if (this.first) {
      this.smoothed.copy(this.target);
      this.first = false;
    }
    this.smoothed.lerp(this.target, 1 - Math.exp(-dt * (o ? 4 : 10)));
    let dist = o ? o.dist : this.distance * this.zoom;
    if (!o && this.obstacles.length) {
      // Every few frames, look along the line from the player to the camera for anything in the way.
      this.checkClock -= dt;
      if (this.checkClock <= 0) {
        this.checkClock = 0.12;
        const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
        this.ray.set(this.smoothed, dir);
        this.ray.far = dist;
        // A building in the way is opened over the player like a tree (src/look/spotlight.ts), so
        // the camera stays where it is. It comes in only if it would otherwise be inside one,
        // where there is nothing to see but the backs of walls.
        const hit = this.ray.intersectObjects(this.obstacles, false)[0];
        const wanted = this.smoothed.clone().addScaledVector(dir, dist);
        this.pulledIn = hit && this.roomOf(hit.object).containsPoint(wanted) ? Math.max(2.2, hit.distance - 0.6) : Infinity;
      }
    }
    this.held += (Math.min(dist, this.pulledIn) - this.held) * (1 - Math.exp(-dt * (this.pulledIn < this.held ? 10 : 2)));
    if (!o) dist = this.held;
    const pitch = o ? o.pitch : this.pitch;
    const cam = this.camera;
    const back = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
    cam.position.copy(this.smoothed).addScaledVector(back, dist);
    // Never below the ground or the water.
    const floor = Math.max(this.field.heightAt(cam.position.x, cam.position.z), 0) + 0.6;
    if (cam.position.y < floor) cam.position.y = floor;
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.5);
    }
    cam.lookAt(this.smoothed);
  }

  /** Forward on the ground, as the camera sees it. */
  forward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
}
