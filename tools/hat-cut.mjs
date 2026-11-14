#!/usr/bin/env node
// A cut through each hat model at heights up it: the reach from its middle each way (x/z) and its
// outline's extent, as fractions of its width. Read the band and opening for HATS (src/player/fit.ts) from it.
//   node tools/hat-cut.mjs hat-cowboy hat-top
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const id of process.argv.slice(2)) {
  const doc = await io.read(`tools/assets/cache/${id}.tripo.glb`);
  const tris = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue; const m = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) { const pos = p.getAttribute('POSITION'); const idx = p.getIndices();
      const v = (i) => { const a = pos.getElement(i, []); return [m[0]*a[0]+m[4]*a[1]+m[8]*a[2]+m[12], m[1]*a[0]+m[5]*a[1]+m[9]*a[2]+m[13], m[2]*a[0]+m[6]*a[1]+m[10]*a[2]+m[14]]; };
      const n = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < n; i += 3) tris.push(idx ? [v(idx.getScalar(i)), v(idx.getScalar(i+1)), v(idx.getScalar(i+2))] : [v(i), v(i+1), v(i+2)]); } }
  let lo=Infinity,hi=-Infinity,x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for (const t of tris) for (const p of t) { lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[2]);z1=Math.max(z1,p[2]); }
  const cx=(x0+x1)/2, cz=(z0+z1)/2, W=Math.min(x1-x0,z1-z0);
  const reach = (cut, dx, dz) => { let best=Infinity; for (const [ax,az,bx,bz] of cut) { const ex=bx-ax, ez=bz-az, den=dx*ez-dz*ex; if (Math.abs(den)<1e-12) continue; const t=((ax-cx)*ez-(az-cz)*ex)/den, u=((ax-cx)*dz-(az-cz)*dx)/den; if (t>1e-6&&u>=0&&u<=1) best=Math.min(best,t);} return best; };
  const f = (v) => Number.isFinite(v) ? (v/W).toFixed(2).replace(/^0/, '') : ' -- ';
  const out = [];
  for (let k=0.04;k<0.75;k+=0.08) {
    const y=lo+(hi-lo)*k, cut=[];
    for (const t of tris) { const pts=[]; for (let e=0;e<3;e++){const a=t[e],b=t[(e+1)%3]; if ((a[1]-y)*(b[1]-y)>0||a[1]===b[1]) continue; const u=(y-a[1])/(b[1]-a[1]); pts.push(a[0]+(b[0]-a[0])*u, a[2]+(b[2]-a[2])*u);} if (pts.length>=4) cut.push(pts.slice(0,4)); }
    let ex0=Infinity,ex1=-Infinity,ez0=Infinity,ez1=-Infinity; for (const [a,b,c,d] of cut){ex0=Math.min(ex0,a,c);ex1=Math.max(ex1,a,c);ez0=Math.min(ez0,b,d);ez1=Math.max(ez1,b,d);}
    out.push(`${k.toFixed(2).slice(1)}:${f(reach(cut,1,0)+reach(cut,-1,0))}/${f(reach(cut,0,1)+reach(cut,0,-1))} ${f(ex1-ex0)}/${f(ez1-ez0)}`);
  }
  console.log(`${id} [${(x1-x0).toFixed(2)} ${(hi-lo).toFixed(2)} ${(z1-z0).toFixed(2)}]\n  ` + out.join('  '));
}
