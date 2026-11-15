// Things that cannot be walked through: trunks and rocks as circles, buildings as boxes. Pure.

export interface Circle {
  x: number;
  z: number;
  r: number;
}
export interface Box {
  x: number;
  z: number;
  /** Half width (along the box's own x) and half depth (along its z). */
  hw: number;
  hd: number;
  yaw: number;
}

export class Colliders {
  circles: Circle[] = [];
  boxes: Box[] = [];

  addCircle(c: Circle): void {
    this.circles.push(c);
  }
  addBox(b: Box): void {
    this.boxes.push(b);
  }
  remove(x: number, z: number): void {
    this.circles = this.circles.filter((c) => Math.hypot(c.x - x, c.z - z) > 0.05);
  }

  /** Push a body of radius `r` at (x, z) out of anything solid. Returns the corrected position. */
  resolve(x: number, z: number, r: number): [number, number] {
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.circles) {
        const dx = x - c.x;
        const dz = z - c.z;
        const min = c.r + r;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
        }
      }
      for (const b of this.boxes) {
        // Into the box's own frame.
        const cos = Math.cos(b.yaw);
        const sin = Math.sin(b.yaw);
        const dx = x - b.x;
        const dz = z - b.z;
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const px = Math.max(-b.hw, Math.min(b.hw, lx));
        const pz = Math.max(-b.hd, Math.min(b.hd, lz));
        const ox = lx - px;
        const oz = lz - pz;
        const d2 = ox * ox + oz * oz;
        let nx = lx;
        let nz = lz;
        if (d2 < r * r) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            nx = px + (ox / d) * r;
            nz = pz + (oz / d) * r;
          } else {
            // Inside: out by the nearest side.
            const ex = b.hw - Math.abs(lx);
            const ez = b.hd - Math.abs(lz);
            if (ex < ez) nx = Math.sign(lx || 1) * (b.hw + r);
            else nz = Math.sign(lz || 1) * (b.hd + r);
          }
          x = b.x + nx * cos + nz * sin;
          z = b.z - nx * sin + nz * cos;
        }
      }
    }
    return [x, z];
  }
}
