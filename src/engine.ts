import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Render layers: 0 = solid world, 1 = invisible tap targets, 2 = see-through effects (glass, dust, ghosts). */
export const LAYER_HIT = 1;
export const LAYER_FX = 2;
export type Quality = 'high' | 'medium' | 'low';

/**
 * Black & white "old film" look in one pass: everything goes grayscale except strongly
 * saturated reds (the cursed objects), plus contrast, grain, vignette and a faint flicker.
 */
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    keepColor: { value: 1 },
    grain: { value: 0.09 },
    contrast: { value: 1.18 },
    brightness: { value: 1 },
    lift: { value: 0.45 },
    vigFloor: { value: 0.45 },
    vignette: { value: 1.0 },
    flicker: { value: 1 },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, keepColor, grain, contrast, brightness, vignette, flicker, lift, vigFloor;
    uniform vec2 resolution;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // brightness setting: lift the shadows much more than the highlights
      c.rgb = pow(max(c.rgb, 0.0), vec3(1.0 / (1.0 + lift)));
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float mx = max(c.r, max(c.g, c.b));
      float mn = min(c.r, min(c.g, c.b));
      float sat = mx > 0.001 ? (mx - mn) / mx : 0.0;
      float purity = (c.r - max(c.g, c.b)) / max(c.r, 0.001);
      float redness = smoothstep(0.6, 0.85, sat) * smoothstep(0.6, 0.85, purity) * smoothstep(0.01, 0.06, c.r);
      vec3 gray = vec3((l - 0.5) * contrast + 0.5);
      vec3 tint = vec3(l * 1.35 + 0.08, l * 0.12, l * 0.12);
      vec3 col = mix(gray, tint, redness * keepColor);
      float n = rand(vUv * resolution + fract(time * 7.13)) - 0.5;
      col += n * grain;
      vec2 p = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(p * vec2(1.1, 1.0)) * vignette);
      col *= mix(vigFloor, 1.0, v);
      col *= brightness * flicker;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export interface View {
  pos: [number, number, number];
  look: [number, number, number];
  parent?: string;
  /** max drag angles in degrees */
  yaw?: number;
  pitch?: number;
  fov?: number;
}

export type TapHandler = (hits: THREE.Intersection[]) => void;

/** Direct manipulation: return true from start() to take over the gesture (no camera look, no tap). */
export interface DragHandler {
  start: (hits: THREE.Intersection[], ray: THREE.Ray, x: number, y: number) => boolean;
  move: (ray: THREE.Ray, x: number, y: number, hits: () => THREE.Intersection[]) => void;
  end: (ray: THREE.Ray, x: number, y: number) => void;
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  film: ShaderPass;
  private renderPass: RenderPass;
  private gtao: GTAOPass;
  private bloom: UnrealBloomPass;
  /** camera used by the AO pass: sees only solid geometry (layer 0) */
  private aoCamera: THREE.PerspectiveCamera;
  envTex: THREE.Texture;
  quality: Quality = 'high';
  /** flashlight held by Diego: a spot light that follows the camera */
  torch: THREE.SpotLight;
  torchOn = false;
  torchFlicker = 0;
  private torchLevel = 0;
  private torchProbe = 0;
  private torchNear = 1;
  private torchNearS = 1;
  scene: THREE.Scene = new THREE.Scene();
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private updaters = new Set<(dt: number, t: number) => void>();

  // camera state
  private basePos = new THREE.Vector3();
  private baseQuat = new THREE.Quaternion();
  private yaw = 0;
  private pitch = 0;
  private yawLimit = 0.5;
  private pitchLimit = 0.3;
  private tween: { from: THREE.Vector3; fromQ: THREE.Quaternion; to: THREE.Vector3; toQ: THREE.Quaternion; fromFov: number; toFov: number; t: number; dur: number; done: () => void } | null = null;
  private shakeAmt = 0;
  private shakeT = 0;
  flickerAmt = 0;
  onTap: TapHandler = () => {};
  drag: DragHandler | null = null;
  inputEnabled = true;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr > 1.5 ? 1.5 : pr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
    this.camera.layers.enable(LAYER_FX);
    this.aoCamera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
    this.raycaster.layers.enableAll();
    this.raycaster.params.Points = { threshold: 0.001 };
    this.torch = new THREE.SpotLight(0xfff4e0, 0, 10, 0.4, 0.55, 1.5);
    this.torch.castShadow = true;
    this.torch.shadow.mapSize.set(1024, 1024);
    this.torch.shadow.bias = -0.0006;
    this.torch.shadow.camera.near = 0.1;
    this.torch.position.set(0.12, -0.12, 0.05);
    this.camera.add(this.torch);
    this.torch.target.position.set(0, -0.1, -3);
    this.camera.add(this.torch.target);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.gtao = new GTAOPass(this.scene, this.aoCamera, 2, 2);
    this.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.2, scale: 1.2, samples: 12 });
    this.gtao.blendIntensity = 0.9;
    this.composer.addPass(this.gtao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.55, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.film = new ShaderPass(FilmShader);
    this.composer.addPass(this.film);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));
    this.bindInput(this.renderer.domElement);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.film.uniforms.resolution.value.set(w, h);
    const pr = this.renderer.getPixelRatio();
    this.bloom.resolution.set((w * pr) / 2, (h * pr) / 2);
  }

  setScene(scene: THREE.Scene) {
    this.scene = scene;
    scene.add(this.camera); // the torch rides on the camera
    this.renderPass.scene = scene;
    this.gtao.scene = scene;
    if (!scene.environment) {
      scene.environment = this.envTex;
      if (scene.userData.envIntensity === undefined) scene.environmentIntensity = 0.12;
      else scene.environmentIntensity = scene.userData.envIntensity;
    }
  }

  /**
   * Compile a scene's shaders in the background, before you walk into it, so that the screen
   * doesn't sit black while the GPU catches up. A stand-in for the torch keeps the light count
   * (and so the compiled programs) identical to what will be used for real.
   */
  async prewarm(scene: THREE.Scene) {
    if (scene.userData.warm) return;
    scene.userData.warm = true;
    if (!scene.environment) {
      scene.environment = this.envTex;
      scene.environmentIntensity = scene.userData.envIntensity ?? 0.12;
    }
    const stand = new THREE.SpotLight(0xffffff, 0, 10, 0.4, 0.55, 1.5);
    stand.castShadow = true;
    scene.add(stand, stand.target);
    try {
      const r = this.renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
      if (r.compileAsync) await r.compileAsync(scene, this.camera);
      else r.compile(scene, this.camera);
    } catch {
      /* not fatal: it will compile on first sight instead */
    } finally {
      scene.remove(stand, stand.target);
    }
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.gtao.enabled = q === 'high';
    this.bloom.enabled = q !== 'low';
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    const ratio = q === 'high' ? Math.min(pr, 1.5) : q === 'medium' ? Math.min(pr, 1.25) : 1;
    this.renderer.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
    this.renderer.shadowMap.type = q === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.resize();
  }

  addUpdater(fn: (dt: number, t: number) => void) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /** Move to a viewpoint. instant = no animation (used on scene change). */
  goTo(v: View, instant = false, dur = 0.9): Promise<void> {
    const toPos = new THREE.Vector3(...v.pos);
    const m = new THREE.Matrix4().lookAt(toPos, new THREE.Vector3(...v.look), new THREE.Vector3(0, 1, 0));
    const toQ = new THREE.Quaternion().setFromRotationMatrix(m);
    this.yawLimit = THREE.MathUtils.degToRad(v.yaw ?? 28);
    this.pitchLimit = THREE.MathUtils.degToRad(v.pitch ?? 16);
    const toFov = v.fov ?? 62;
    if (instant) {
      this.basePos.copy(toPos);
      this.baseQuat.copy(toQ);
      this.yaw = this.pitch = 0;
      this.camera.fov = toFov;
      this.camera.updateProjectionMatrix();
      this.applyCamera();
      this.tween = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tween = {
        from: this.camera.position.clone(),
        fromQ: this.camera.quaternion.clone(),
        to: toPos,
        toQ,
        fromFov: this.camera.fov,
        toFov,
        t: 0,
        dur,
        done: resolve,
      };
    });
  }

  shake(amount: number, dur = 0.5) {
    this.shakeAmt = amount;
    this.shakeT = dur;
  }

  private applyCamera() {
    const q = this.baseQuat.clone();
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    q.premultiply(yawQ).multiply(pitchQ);
    this.camera.quaternion.copy(q);
    this.camera.position.copy(this.basePos);
    if (this.shakeT > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmt;
    }
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.from, tw.to, k);
      this.camera.quaternion.slerpQuaternions(tw.fromQ, tw.toQ, k);
      this.camera.fov = THREE.MathUtils.lerp(tw.fromFov, tw.toFov, k);
      this.camera.updateProjectionMatrix();
      if (tw.t >= 1) {
        this.basePos.copy(tw.to);
        this.baseQuat.copy(tw.toQ);
        this.yaw = this.pitch = 0;
        this.tween = null;
        tw.done();
      }
    } else {
      // drift back gently when not dragging, keeps the framing readable
      if (!this.dragging) {
        this.yaw *= 1 - Math.min(dt * 0.15, 1);
        this.pitch *= 1 - Math.min(dt * 0.15, 1);
      }
      if (this.shakeT > 0) this.shakeT -= dt;
      this.applyCamera();
    }
    for (const u of this.updaters) u(dt, t);
    this.film.uniforms.time.value = t;
    // torch: smooth on/off, flicker when something is near
    const want = this.torchOn ? 1 : 0;
    this.torchLevel += (want - this.torchLevel) * Math.min(dt * 12, 1);
    let tf = 1;
    if (this.torchFlicker > 0) tf = Math.random() < this.torchFlicker * 0.25 ? Math.random() * 0.2 : 1 - Math.random() * this.torchFlicker * 0.4;
    if (this.torchLevel > 0.01) {
      this.torchProbe -= dt;
      if (this.torchProbe <= 0) {
        this.torchProbe = 0.15;
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        this.raycaster.layers.set(0);
        const hit = this.raycaster.intersectObjects(this.scene.children, true).find((h) => h.object.visible && !(h.object as THREE.Mesh).userData.hit);
        this.raycaster.layers.enableAll();
        const d = hit ? hit.distance : 10;
        this.torchNear = THREE.MathUtils.clamp((d / 2.2) ** 2, 0.12, 1);
      }
      this.torchNearS += (this.torchNear - this.torchNearS) * Math.min(dt * 6, 1);
    }
    this.torch.intensity = 13 * this.torchLevel * tf * this.torchNearS;
    let flick = 1;
    if (this.flickerAmt > 0) flick = 1 - this.flickerAmt * (Math.random() < 0.08 ? 0.6 : Math.random() * 0.12);
    this.film.uniforms.flicker.value = flick;
    if (this.gtao.enabled) {
      this.aoCamera.position.copy(this.camera.position);
      this.aoCamera.quaternion.copy(this.camera.quaternion);
      this.aoCamera.fov = this.camera.fov;
      this.aoCamera.aspect = this.camera.aspect;
      this.aoCamera.near = this.camera.near;
      this.aoCamera.far = this.camera.far;
      this.aoCamera.updateProjectionMatrix();
      this.aoCamera.updateMatrixWorld();
    }
    this.composer.render();
  }

  // ---------------- input ----------------
  private dragging = false;
  private ndc(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  }
  rayAt(x: number, y: number) {
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    return this.raycaster.ray.clone();
  }
  hitsAt(x: number, y: number) {
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true).filter((h) => !h.object.userData.noPick && isVisibleChain(h.object));
    // labels (sprites) are drawn on top of everything, so they also win the tap
    hits.sort((a, b) => Number((b.object as THREE.Sprite).isSprite === true) - Number((a.object as THREE.Sprite).isSprite === true) || a.distance - b.distance);
    return hits;
  }
  private bindInput(el: HTMLElement) {
    let sx = 0, sy = 0, lx = 0, ly = 0, moved = 0, active = false, id = -1, objectDrag = false;
    el.addEventListener('pointerdown', (e) => {
      if (active) return;
      active = true;
      id = e.pointerId;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
      moved = 0;
      objectDrag = false;
      el.setPointerCapture?.(e.pointerId);
      if (this.drag && this.inputEnabled && !this.tween) {
        objectDrag = this.drag.start(this.hitsAt(e.clientX, e.clientY), this.rayAt(e.clientX, e.clientY), e.clientX, e.clientY);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!active || e.pointerId !== id) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (objectDrag) {
        this.drag?.move(this.rayAt(e.clientX, e.clientY), e.clientX, e.clientY, () => this.hitsAt(e.clientX, e.clientY));
        return;
      }
      if (moved > 10 && !this.tween && this.inputEnabled) {
        this.dragging = true;
        const s = 0.0035;
        this.yaw = THREE.MathUtils.clamp(this.yaw + dx * s, -this.yawLimit, this.yawLimit);
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * s, -this.pitchLimit, this.pitchLimit);
      }
    });
    const end = (e: PointerEvent) => {
      if (!active || e.pointerId !== id) return;
      active = false;
      this.dragging = false;
      if (objectDrag) {
        objectDrag = false;
        this.drag?.end(this.rayAt(e.clientX, e.clientY), e.clientX, e.clientY);
        return;
      }
      if (moved <= 10 && Math.hypot(e.clientX - sx, e.clientY - sy) < 12 && this.inputEnabled && !this.tween) {
        this.onTap(this.hitsAt(e.clientX, e.clientY));
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', (e) => {
      if (e.pointerId === id) {
        active = false;
        this.dragging = false;
        if (objectDrag) {
          objectDrag = false;
          this.drag?.end(this.rayAt(e.clientX, e.clientY), e.clientX, e.clientY);
        }
      }
    });
  }
}

function isVisibleChain(o: THREE.Object3D | null): boolean {
  while (o) {
    if (!o.visible && !o.userData.hit) return false;
    o = o.parent;
  }
  return true;
}
