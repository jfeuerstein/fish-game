// The camera: behind and above the player, turned by dragging, eased so it never jerks.
import * as THREE from 'three';
import { clamp } from '../core/rng';
import type { Heightfield } from '../world/island';

export class CameraRig {
  yaw = 0;
  pitch = 0.5;
  distance = 9.5;
  /** How the player has zoomed, kept between visits. */
  zoom = 1;
  private target = new THREE.Vector3();
  private smoothed = new THREE.Vector3();
  private first = true;
  /** A place to look at instead of the player (the chalk board, the catch). */
  override: { pos: THREE.Vector3; dist: number; pitch: number } | null = null;
  /** A brief nudge, as when a fish strikes. */
  private shake = 0;

  constructor(readonly camera: THREE.PerspectiveCamera, private field: Heightfield) {}

  turn(dx: number, dy: number): void {
    this.yaw -= dx * 0.0065;
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
    const dist = o ? o.dist : this.distance * this.zoom;
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
