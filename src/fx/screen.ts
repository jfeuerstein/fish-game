// The picture the game is drawn as. In the lo-fi look the world is drawn small, into a picture
// of its own, and that picture is put on the screen with each colour cut to a few levels and
// dithered between them, as an old console would; the canvas is the same small size and the
// page blows it up with hard pixels. Otherwise the world is drawn straight to the screen.
import * as THREE from 'three';
import { type Look, pictureSize } from '../look/look';

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
uniform sampler2D tScene;
uniform float uLevels, uDither;
varying vec2 vUv;
// A four-by-four pattern of thresholds, the same on every frame, so the dither holds still.
float bayer(vec2 p) {
  vec2 a = floor(mod(p, 4.0));
  float i = a.x + a.y * 4.0;
  float v = 0.0;
  if (i < 0.5) v = 0.0; else if (i < 1.5) v = 8.0; else if (i < 2.5) v = 2.0; else if (i < 3.5) v = 10.0;
  else if (i < 4.5) v = 12.0; else if (i < 5.5) v = 4.0; else if (i < 6.5) v = 14.0; else if (i < 7.5) v = 6.0;
  else if (i < 8.5) v = 3.0; else if (i < 9.5) v = 11.0; else if (i < 10.5) v = 1.0; else if (i < 11.5) v = 9.0;
  else if (i < 12.5) v = 15.0; else if (i < 13.5) v = 7.0; else if (i < 14.5) v = 13.0; else v = 5.0;
  return (v + 0.5) / 16.0;
}
vec3 toScreen(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  vec3 c = toScreen(clamp(texture2D(tScene, vUv).rgb, 0.0, 1.0));
  float d = (bayer(gl_FragCoord.xy) - 0.5) * uDither;
  c = floor(c * uLevels + 0.5 + d) / uLevels;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Screen {
  private target: THREE.WebGLRenderTarget | null = null;
  private quad: THREE.Mesh | null = null;
  private flat = new THREE.Scene();
  private eye = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(private renderer: THREE.WebGLRenderer, private look: Look) {
    renderer.setPixelRatio(1);
    // Counted by hand, so the draw calls reported are the world's and not the last pass's.
    renderer.info.autoReset = false;
    if (look.pixel) {
      renderer.domElement.style.imageRendering = 'pixelated';
      this.target = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
      // Kept as the screen keeps colour, so its eight bits are spent where the eye can tell.
      this.target.texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false, toneMapped: false, uniforms: { tScene: { value: this.target.texture }, uLevels: { value: look.levels || 255 }, uDither: { value: look.dither } } });
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      this.quad.frustumCulled = false;
      this.flat.add(this.quad);
    }
  }

  /** Fit the picture to a screen of this many points. */
  setSize(width: number, height: number): void {
    const size = pictureSize(this.look, width, height, window.devicePixelRatio || 1);
    this.renderer.setSize(size.width, size.height, false);
    this.target?.setSize(size.width, size.height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    const r = this.renderer;
    r.info.reset();
    if (!this.target) {
      r.render(scene, camera);
      return;
    }
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.flat, this.eye);
  }
}
