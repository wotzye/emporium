import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LAYER_HIT, LAYER_FX } from './engine';

/** Strong saturated red: the film shader keeps this colour, so cursed objects stand out. */
export const CURSED = 0xc4101a;

export function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
}

export function cursedMat() {
  return new THREE.MeshStandardMaterial({ color: CURSED, roughness: 0.4, metalness: 0.2, emissive: 0x400004, emissiveIntensity: 0.6 });
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadows = true) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  if (shadows) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
  return o;
}

export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 16) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
}

export function sphere(r: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 16) {
  return mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), m, x, y, z);
}

/** Invisible, pickable box used as a tap target. */
const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });
hitMat.userData.shared = true; // one material for every hitbox in every room: never freed
export function hitBox(w: number, h: number, d: number, x: number, y: number, z: number, name = 'hit') {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  o.position.set(x, y, z);
  o.name = name;
  o.userData.hit = true;
  o.layers.set(LAYER_HIT);
  return o;
}

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

export function noise(c: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}

export function woodTex(base = '#5a4632', repeat: [number, number] = [2, 2]) {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.15})`;
      c.fillRect(0, i * 32, w, 2);
    }
    for (let i = 0; i < 160; i++) {
      c.strokeStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      c.beginPath();
      const y = Math.random() * h;
      c.moveTo(0, y);
      c.bezierCurveTo(w * 0.3, y + Math.random() * 6 - 3, w * 0.6, y + Math.random() * 6 - 3, w, y + Math.random() * 4 - 2);
      c.stroke();
    }
    noise(c, w, h, 1500, 0.06);
  }, repeat);
}

export function tileTex(a = '#d8d6d0', b = '#bdbab3', n = 8, repeat: [number, number] = [3, 3], grout = '#6a6862') {
  return canvasTex(256, 256, (c, w, h) => {
    const s = w / n;
    c.fillStyle = grout;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        c.fillStyle = (i + j) % 2 ? a : b;
        c.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    noise(c, w, h, 2500, 0.1);
    // stains
    for (let i = 0; i < 6; i++) {
      const g = c.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 40 + Math.random() * 40);
      g.addColorStop(0, 'rgba(40,30,25,0.25)');
      g.addColorStop(1, 'rgba(40,30,25,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  }, repeat);
}

export function wallTex(base = '#6b665c', repeat: [number, number] = [2, 1], stripes = false) {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    if (stripes) {
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = 'rgba(255,255,255,0.05)';
        c.fillRect(x, 0, 14, h);
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.fillRect(x + 16, 0, 3, h);
      }
    }
    noise(c, w, h, 3000, 0.07);
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w;
      const g = c.createLinearGradient(x, 0, x, h);
      g.addColorStop(0, 'rgba(30,25,20,0)');
      g.addColorStop(1, 'rgba(30,25,20,0.25)');
      c.fillStyle = g;
      c.fillRect(x, h * 0.3, 6 + Math.random() * 14, h);
    }
  }, repeat);
}

export interface RoomOpts {
  wall?: THREE.Material;
  floor?: THREE.Material;
  ceil?: THREE.Material;
}

/** A box room seen from the inside. Walls are separate planes so each can carry its own material. */
export function room(w: number, h: number, d: number, o: RoomOpts = {}) {
  const g = new THREE.Group();
  const wall = o.wall ?? mat(0x6b665c);
  const floor = o.floor ?? mat(0x3a3530);
  const ceil = o.ceil ?? mat(0x2a2826);
  const f = mesh(new THREE.PlaneGeometry(w, d), floor, 0, 0, 0);
  f.rotation.x = -Math.PI / 2;
  f.castShadow = false;
  g.add(f);
  const c = mesh(new THREE.PlaneGeometry(w, d), ceil, 0, h, 0);
  c.rotation.x = Math.PI / 2;
  c.castShadow = false;
  g.add(c);
  const back = mesh(new THREE.PlaneGeometry(w, h), wall, 0, h / 2, -d / 2);
  const front = mesh(new THREE.PlaneGeometry(w, h), wall, 0, h / 2, d / 2);
  front.rotation.y = Math.PI;
  const left = mesh(new THREE.PlaneGeometry(d, h), wall, -w / 2, h / 2, 0);
  left.rotation.y = Math.PI / 2;
  const right = mesh(new THREE.PlaneGeometry(d, h), wall, w / 2, h / 2, 0);
  right.rotation.y = -Math.PI / 2;
  for (const m of [back, front, left, right]) {
    m.castShadow = false;
    g.add(m);
  }
  g.userData.walls = { back, front, left, right, floor: f, ceil: c };
  return g;
}

/** Flat sign / paper / label with text drawn on a canvas. */
export function textPlane(
  lines: string[],
  w: number,
  h: number,
  o: { bg?: string; fg?: string; font?: string; size?: number; align?: CanvasTextAlign; border?: string; px?: number; lineH?: number; emissive?: boolean } = {},
) {
  const px = o.px ?? 256;
  const cw = Math.round(px * (w / h));
  const tex = canvasTex(Math.min(cw, 1024), px, (c, W, H) => {
    if (o.bg !== 'transparent') {
      c.fillStyle = o.bg ?? '#d9d3c4';
      c.fillRect(0, 0, W, H);
      noise(c, W, H, 800, 0.08);
    }
    if (o.border) {
      c.strokeStyle = o.border;
      c.lineWidth = H * 0.03;
      c.strokeRect(H * 0.04, H * 0.04, W - H * 0.08, H - H * 0.08);
    }
    const size = o.size ?? H / (lines.length + 1.2);
    c.fillStyle = o.fg ?? '#1d1a16';
    c.font = `${size}px ${o.font ?? "'American Typewriter', 'Courier New', monospace"}`;
    c.textAlign = o.align ?? 'center';
    c.textBaseline = 'middle';
    const lh = size * (o.lineH ?? 1.15);
    const top = H / 2 - ((lines.length - 1) * lh) / 2;
    const x = c.textAlign === 'left' ? H * 0.12 : W / 2;
    lines.forEach((l, i) => c.fillText(l, x, top + i * lh, W * 0.92));
  });
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    transparent: o.bg === 'transparent',
    emissive: o.emissive ? 0xffffff : 0x000000,
    emissiveMap: o.emissive ? tex : null,
    emissiveIntensity: o.emissive ? 0.35 : 0,
  });
  const p = mesh(new THREE.PlaneGeometry(w, h), m);
  p.castShadow = false;
  return p;
}

/** A hanging bulb with a shadow-casting spot light below it. */
export function bulb(x: number, y: number, z: number, intensity = 18, angle = 1.1, distance = 9) {
  const g = new THREE.Group();
  const cord = cyl(0.008, 0.008, 0.5, mat(0x111111), x, y + 0.25, z, 4);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
  glass.position.set(x, y, z);
  glass.userData.noPick = true;
  const shade = mesh(new THREE.ConeGeometry(0.22, 0.16, 16, 1, true), mat(0x222222, { side: THREE.DoubleSide }), x, y + 0.06, z);
  shade.castShadow = false;
  const spot = new THREE.SpotLight(0xfff0d8, intensity, distance, angle, 0.6, 1.6);
  spot.position.set(x, y - 0.02, z);
  spot.target.position.set(x, 0, z);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0005;
  spot.shadow.camera.near = 0.1;
  spot.shadow.camera.far = distance;
  const fill = new THREE.PointLight(0xfff0d8, intensity * 0.12, distance * 0.8, 1.8);
  fill.position.set(x, y - 0.1, z);
  g.add(cord, glass, shade, spot, spot.target, fill);
  return { group: g, spot, fill, glass };
}

/** Simple ghostly sprite (Lisa) drawn on a canvas. */
export function ghostSprite(h = 1.6) {
  const tex = canvasTex(256, 512, (c, w, hh) => {
    const g = c.createRadialGradient(w / 2, hh * 0.45, 10, w / 2, hh * 0.45, w * 0.8);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, hh);
    c.fillStyle = 'rgba(235,240,245,0.85)';
    // head
    c.beginPath();
    c.ellipse(w / 2, hh * 0.16, 34, 42, 0, 0, Math.PI * 2);
    c.fill();
    // hair
    c.fillStyle = 'rgba(200,205,210,0.7)';
    c.beginPath();
    c.moveTo(w / 2 - 40, hh * 0.13);
    c.quadraticCurveTo(w / 2, hh * 0.04, w / 2 + 40, hh * 0.13);
    c.lineTo(w / 2 + 46, hh * 0.32);
    c.lineTo(w / 2 + 30, hh * 0.3);
    c.lineTo(w / 2 + 28, hh * 0.18);
    c.lineTo(w / 2 - 28, hh * 0.18);
    c.lineTo(w / 2 - 30, hh * 0.3);
    c.lineTo(w / 2 - 46, hh * 0.32);
    c.closePath();
    c.fill();
    // eyes
    c.fillStyle = 'rgba(40,50,60,0.9)';
    c.beginPath();
    c.ellipse(w / 2 - 13, hh * 0.16, 6, 4, 0, 0, Math.PI * 2);
    c.ellipse(w / 2 + 13, hh * 0.16, 6, 4, 0, 0, Math.PI * 2);
    c.fill();
    // dress fading out
    const dg = c.createLinearGradient(0, hh * 0.25, 0, hh);
    dg.addColorStop(0, 'rgba(235,240,245,0.8)');
    dg.addColorStop(1, 'rgba(235,240,245,0)');
    c.fillStyle = dg;
    c.beginPath();
    c.moveTo(w / 2 - 34, hh * 0.25);
    c.lineTo(w / 2 + 34, hh * 0.25);
    c.lineTo(w / 2 + 80, hh);
    c.lineTo(w / 2 - 80, hh);
    c.closePath();
    c.fill();
  });
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const s = new THREE.Sprite(m);
  s.scale.set(h * 0.5, h, 1);
  return fx(s);
}

/** Dark human silhouette (the Merchant, Bruno). */
export function figure(opts: { height?: number; bulk?: number; hat?: boolean; apron?: boolean; cleaver?: boolean } = {}) {
  const H = opts.height ?? 1.85;
  const B = opts.bulk ?? 1;
  const black = mat(0x0b0b0c, { roughness: 1 });
  const g = new THREE.Group();
  const body = cyl(0.2 * B, 0.27 * B, H * 0.55, black, 0, H * 0.5, 0, 12);
  const legs = cyl(0.22 * B, 0.18 * B, H * 0.3, black, 0, H * 0.15, 0, 12);
  const head = sphere(0.12 * Math.sqrt(B), black, 0, H * 0.86, 0, 12);
  const shoulders = box(0.62 * B, 0.12, 0.28 * B, black, 0, H * 0.75, 0);
  g.add(body, legs, head, shoulders);
  if (opts.hat) {
    g.add(cyl(0.24, 0.24, 0.02, black, 0, H * 0.93, 0, 20));
    g.add(cyl(0.12, 0.13, 0.18, black, 0, H * 1.0, 0, 16));
  }
  if (opts.apron) {
    const ap = box(0.42 * B, H * 0.5, 0.02, mat(0x8a8780, { roughness: 1 }), 0, H * 0.45, 0.25 * B);
    g.add(ap);
  }
  if (opts.cleaver) {
    const arm = cyl(0.05, 0.05, 0.55, black, 0.36 * B, H * 0.55, 0.08, 8);
    arm.rotation.z = 0.25;
    const blade = box(0.02, 0.16, 0.26, mat(0x9a9a9a, { metalness: 0.8, roughness: 0.3 }), 0.42 * B, H * 0.3, 0.12);
    g.add(arm, blade);
  }
  const eyes = new THREE.Group();
  for (const x of [-0.04, 0.04]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    e.position.set(x * Math.sqrt(B), H * 0.87, 0.11 * Math.sqrt(B));
    e.userData.noPick = true;
    eyes.add(e);
  }
  eyes.visible = false;
  g.add(eyes);
  g.userData.eyes = eyes;
  return g;
}

/** Procedural face for jump-scares: a close, blurred, asymmetric face coming out of the dark. */
export function drawScareFace(cv: HTMLCanvasElement, kind: 'barber' | 'bruno' | 'ada' | 'clara') {
  const w = (cv.width = 960);
  const h = (cv.height = 540);
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, w, h);
  const cx = w * 0.5 + (Math.random() - 0.5) * 60;
  const cy = h * 0.56;
  const S = kind === 'bruno' ? 1.25 : 1.1;
  const layer = (dx: number, dy: number, alpha: number) => {
    c.save();
    c.globalAlpha = alpha;
    c.translate(cx + dx, cy + dy);
    c.scale(S, S * 1.08);
    // skin: soft, blotchy
    c.filter = 'blur(10px)';
    const sk = c.createRadialGradient(-20, -60, 20, 0, 0, 300);
    sk.addColorStop(0, kind === 'bruno' ? '#a8a196' : kind === 'ada' ? '#dcd8d0' : '#cfcac0');
    sk.addColorStop(0.55, '#6f6a62');
    sk.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sk;
    c.beginPath();
    c.ellipse(0, 0, 230, 300, 0.04, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,18,16' : '210,205,195'},${Math.random() * 0.18})`;
      c.beginPath();
      c.ellipse((Math.random() - 0.5) * 360, (Math.random() - 0.5) * 460, 20 + Math.random() * 60, 20 + Math.random() * 60, 0, 0, Math.PI * 2);
      c.fill();
    }
    // sockets: deep, uneven
    c.filter = 'blur(14px)';
    c.fillStyle = '#000';
    c.beginPath();
    c.ellipse(-88, -70, 70, 58, -0.15, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(92, -62, 58, 50, 0.2, 0, Math.PI * 2);
    c.fill();
    // mouth: a long dark gap, too long
    c.beginPath();
    c.ellipse(6, 150, kind === 'bruno' ? 80 : 46, kind === 'bruno' ? 110 : 140, 0.03, 0, Math.PI * 2);
    c.fill();
    // cheek hollows and nose shadow
    c.filter = 'blur(18px)';
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath();
    c.ellipse(-150, 60, 40, 110, 0.2, 0, Math.PI * 2);
    c.ellipse(150, 60, 40, 110, -0.2, 0, Math.PI * 2);
    c.ellipse(0, 40, 24, 50, 0, 0, Math.PI * 2);
    c.fill();
    c.filter = 'none';
    // pupils: tiny pinpricks, not aligned
    c.fillStyle = kind === 'bruno' ? '#ff2a2a' : '#f4f1ea';
    c.shadowColor = c.fillStyle;
    c.shadowBlur = 14;
    c.beginPath();
    c.arc(-80, -66, 5, 0, Math.PI * 2);
    c.arc(96, -58, 3.5, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    // teeth: irregular, few, dark-stained
    c.filter = 'blur(2px)';
    c.fillStyle = 'rgba(120,112,96,0.55)';
    const n = kind === 'bruno' ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const x = -30 + i * (60 / n) + Math.random() * 6;
      c.beginPath();
      c.moveTo(x, 70);
      c.lineTo(x + 8 + Math.random() * 4, 70);
      c.lineTo(x + 5, 92 + Math.random() * 26);
      c.closePath();
      c.fill();
    }
    c.filter = 'none';
    if (kind === 'ada') {
      // long grey hair, loose, falling over the face
      c.filter = 'blur(3px)';
      c.strokeStyle = 'rgba(205,200,190,0.55)';
      for (let i = 0; i < 70; i++) {
        const x0 = -150 + Math.random() * 300;
        c.lineWidth = 1 + Math.random() * 3;
        c.beginPath();
        c.moveTo(x0 * 0.6, -230 + Math.random() * 20);
        c.bezierCurveTo(x0 * 1.1, -60, x0 * 1.25 + (Math.random() - 0.5) * 40, 120, x0 * 1.2 + (Math.random() - 0.5) * 80, 320);
        c.stroke();
      }
      c.filter = 'none';
    }
    if (kind === 'bruno') {
      c.filter = 'blur(2px)';
      c.fillStyle = 'rgba(150,8,8,0.85)';
      for (let i = 0; i < 9; i++) {
        const x = -60 + Math.random() * 130;
        c.fillRect(x, 200 + Math.random() * 30, 4 + Math.random() * 6, 60 + Math.random() * 140);
      }
      c.filter = 'none';
    }
    c.restore();
  };
  layer(18, -6, 0.35); // ghost double exposure
  layer(0, 0, 1);
  // film scratches and dust
  for (let i = 0; i < 7; i++) {
    c.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
    c.fillRect(Math.random() * w, 0, 1 + Math.random(), h);
  }
  noise(c, w, h, 26000, 0.3);
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.92)');
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
}


// ======================================================================
// Detail kit: relief textures, rounded and turned shapes, dust, light cones
// ======================================================================

/** Put an object (and its children) on the see-through effects layer: drawn, but ignored by ambient occlusion. */
export function fx<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    c.layers.set(LAYER_FX);
    c.userData.noPick = true;
    c.castShadow = false;
  });
  return o;
}

export function rbox(w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 3) {
  return mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999), m, x, y, z);
}

/** Turned shape from a profile of [radius, height] pairs (bottles, jars, columns, bases). */
export function lathe(profile: [number, number][], m: THREE.Material, x = 0, y = 0, z = 0, seg = 24) {
  const pts = profile.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h));
  return mesh(new THREE.LatheGeometry(pts, seg), m, x, y, z);
}

/** Normal map from the brightness of a canvas (dark = low). */
export function normalFromCanvas(src: HTMLCanvasElement, strength = 2, repeat?: [number, number]) {
  // normal maps don't need full resolution: a 256px copy is 16x less work than 1024px,
  // and reading pixels back from a GPU canvas is the slowest thing a phone can do
  const w = Math.min(src.width, 256), h = Math.min(src.height, 256);
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sc = small.getContext('2d', { willReadFrequently: true })!;
  sc.drawImage(src, 0, 0, w, h);
  const sd = sc.getImageData(0, 0, w, h).data;
  strength *= w / src.width;
  const hgt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) hgt[i] = (sd[i * 4] * 0.299 + sd[i * 4 + 1] * 0.587 + sd[i * 4 + 2] * 0.114) / 255;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const oc = out.getContext('2d')!;
  const img = oc.createImageData(w, h);
  const at = (x: number, y: number) => hgt[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 255;
      img.data[i + 3] = 255;
    }
  oc.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function paintCanvas(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  // a CPU-side canvas: these get read back for normal maps, which on a GPU canvas means a stall
  draw(cv.getContext('2d', { willReadFrequently: true })!, w, h);
  return cv;
}

function texFrom(cv: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Glazed ceramic tiles with real grout relief, chips and grime. */
function _tileMaterial(o: { a?: string; b?: string; n?: number; repeat?: [number, number]; grout?: string; grime?: number; rough?: number; checker?: boolean } = {}) {
  const n = o.n ?? 8;
  const grime = o.grime ?? 0.35;
  const color = paintCanvas(512, 512, (c, w, h) => {
    const s = w / n;
    c.fillStyle = o.grout ?? '#5d5a54';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const base = o.checker === false ? (o.a ?? '#d8d6d0') : (i + j) % 2 ? (o.a ?? '#d8d6d0') : (o.b ?? '#bdbab3');
        c.fillStyle = base;
        c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        // glaze highlight and slight per-tile variation
        const g = c.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
        g.addColorStop(0, 'rgba(255,255,255,0.10)');
        g.addColorStop(1, `rgba(0,0,0,${0.04 + Math.random() * 0.08})`);
        c.fillStyle = g;
        c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        if (Math.random() < 0.06) {
          c.fillStyle = 'rgba(60,55,50,0.6)';
          c.beginPath();
          c.arc(i * s + Math.random() * s, j * s + Math.random() * s, 2 + Math.random() * 5, 0, Math.PI * 2);
          c.fill();
        }
      }
    noise(c, w, h, 6000, 0.06);
    for (let k = 0; k < 10 * grime; k++) {
      const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 90;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(35,28,22,${0.25 * grime + 0.1})`);
      g.addColorStop(1, 'rgba(35,28,22,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    // drips running down
    for (let k = 0; k < 14 * grime; k++) {
      const x = Math.random() * w;
      const y0 = Math.random() * h * 0.5;
      const g = c.createLinearGradient(0, y0, 0, y0 + 120 + Math.random() * 200);
      g.addColorStop(0, 'rgba(40,30,25,0.25)');
      g.addColorStop(1, 'rgba(40,30,25,0)');
      c.fillStyle = g;
      c.fillRect(x, y0, 1.5 + Math.random() * 3, 320);
    }
  });
  const height = paintCanvas(512, 512, (c, w, h) => {
    const s = w / n;
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    // soft-edged tiles without a blur filter (blur on a CPU canvas is very slow):
    // three nested rectangles of increasing brightness make the bevel
    for (const [inset, v] of [[2, '#555'], [3, '#aaa'], [4, '#fff']] as const) {
      c.fillStyle = v;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c.fillRect(i * s + inset, j * s + inset, s - inset * 2, s - inset * 2);
    }
    noise(c, w, h, 3000, 0.08);
  });
  return new THREE.MeshStandardMaterial({
    map: texFrom(color, o.repeat),
    normalMap: normalFromCanvas(height, 3, o.repeat),
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: o.rough ?? 0.28,
    metalness: 0,
  });
}

/** Wood with grain and relief. plank: boards for floors. */
function _woodMaterial(o: { base?: string; repeat?: [number, number]; plank?: boolean; rough?: number } = {}) {
  const base = o.base ?? '#5a4632';
  const color = paintCanvas(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const rows = o.plank ? 6 : 1;
    for (let r = 0; r < rows; r++) {
      const y0 = (r * h) / rows;
      const shade = Math.random() * 0.18;
      c.fillStyle = `rgba(0,0,0,${shade})`;
      c.fillRect(0, y0, w, h / rows);
      for (let i = 0; i < 70; i++) {
        c.strokeStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,230,200'},${Math.random() * 0.12})`;
        c.lineWidth = 0.5 + Math.random() * 2;
        c.beginPath();
        const y = y0 + Math.random() * (h / rows);
        c.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (Math.random() - 0.5) * 2);
        c.stroke();
      }
      // knots
      if (Math.random() < 0.6) {
        const kx = Math.random() * w, ky = y0 + Math.random() * (h / rows);
        for (let k = 8; k > 0; k--) {
          c.strokeStyle = `rgba(30,18,8,${0.08 + k * 0.02})`;
          c.beginPath();
          c.ellipse(kx, ky, k * 4, k * 1.6, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
      if (o.plank) {
        c.fillStyle = 'rgba(0,0,0,0.7)';
        c.fillRect(0, y0, w, 3);
        c.fillRect(((r * 197) % w), y0, 3, h / rows);
      }
    }
    noise(c, w, h, 5000, 0.07);
  });
  return new THREE.MeshStandardMaterial({
    map: texFrom(color, o.repeat),
    normalMap: normalFromCanvas(color, 4, o.repeat),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: o.rough ?? 0.6,
  });
}

/** Old plaster / wallpaper with damp stains, flaking and relief. */
function _plasterMaterial(o: { base?: string; repeat?: [number, number]; stripes?: boolean; damp?: number } = {}) {
  const damp = o.damp ?? 0.5;
  const color = paintCanvas(512, 512, (c, w, h) => {
    c.fillStyle = o.base ?? '#8a857b';
    c.fillRect(0, 0, w, h);
    if (o.stripes) {
      for (let x = 0; x < w; x += 42) {
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(x, 0, 18, h);
        c.fillStyle = 'rgba(0,0,0,0.08)';
        c.fillRect(x + 22, 0, 2, h);
        // small damask dots
        for (let y = 10; y < h; y += 34) {
          c.fillStyle = 'rgba(0,0,0,0.07)';
          c.beginPath();
          c.ellipse(x + 32, y, 3, 6, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    noise(c, w, h, 9000, 0.07);
    for (let k = 0; k < 7 * damp; k++) {
      const x = Math.random() * w, y = h * (0.5 + Math.random() * 0.5), r = 60 + Math.random() * 120;
      const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, `rgba(40,32,22,${0.3 * damp})`);
      g.addColorStop(0.8, `rgba(40,32,22,${0.12 * damp})`);
      g.addColorStop(1, 'rgba(40,32,22,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    for (let k = 0; k < 6 * damp; k++) {
      c.fillStyle = 'rgba(210,205,195,0.5)';
      c.beginPath();
      const x = Math.random() * w, y = Math.random() * h;
      c.moveTo(x, y);
      for (let i = 0; i < 7; i++) c.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 40);
      c.fill();
    }
  });
  return new THREE.MeshStandardMaterial({
    map: texFrom(color, o.repeat),
    normalMap: normalFromCanvas(color, 2.5, o.repeat),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.92,
  });
}

/** Floating dust motes inside a box. Returns the points and an update function. */
export function dust(min: [number, number, number], max: [number, number, number], count = 160) {
  const tex = canvasTex(32, 32, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = min[0] + Math.random() * (max[0] - min[0]);
    pos[i * 3 + 1] = min[1] + Math.random() * (max[1] - min[1]);
    pos[i * 3 + 2] = min[2] + Math.random() * (max[2] - min[2]);
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.012, map: tex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = fx(new THREE.Points(geo, m));
  const update = (dt: number, t: number) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + Math.sin(t * 0.3 + seed[i]) * dt * 0.02 - dt * 0.004;
      if (y < min[1]) y = max[1];
      a.setXYZ(i, a.getX(i) + Math.sin(t * 0.21 + seed[i] * 1.7) * dt * 0.025, y, a.getZ(i) + Math.cos(t * 0.17 + seed[i]) * dt * 0.025);
    }
    a.needsUpdate = true;
  };
  return { points: pts, update };
}

/** Visible beam of light: an additive cone that fades towards the floor. */
export function lightCone(x: number, top: number, z: number, height: number, radius: number, opacity = 0.09) {
  const tex = canvasTex(8, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const geo = new THREE.CylinderGeometry(0.06, radius, height, 32, 1, true);
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const cone = fx(new THREE.Mesh(geo, m));
  cone.position.set(x, top - height / 2, z);
  return cone;
}

/** Framed picture or certificate on a wall (front faces +z). */
export function framed(w: number, h: number, draw: ((c: CanvasRenderingContext2D, w: number, h: number) => void) | THREE.Texture, frame: THREE.Material, px = 256) {
  const g = new THREE.Group();
  g.add(rbox(w + 0.06, h + 0.06, 0.03, 0.008, frame));
  const pic = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: draw instanceof THREE.Texture ? draw : canvasTex(px, Math.round((px * h) / w), draw), roughness: 0.85 }), 0, 0, 0.017);
  pic.castShadow = false;
  g.add(pic);
  const glass = fx(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.6, metalness: 0 })));
  glass.position.z = 0.019;
  g.add(glass);
  return g;
}

/** Rough stone wall: irregular blocks with deep mortar and damp. */
function _stoneMaterial(repeat: [number, number] = [2, 1], base = '#6b665d') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#2b2925';
  c.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512) {
    const rh = 40 + Math.random() * 40;
    let x = -Math.random() * 60;
    while (x < 512) {
      const rw = 60 + Math.random() * 90;
      const v = parseInt(base.slice(1, 3), 16) + (Math.random() - 0.5) * 40;
      c.fillStyle = `rgb(${v},${v * 0.96},${v * 0.9})`;
      c.beginPath();
      const r = 10;
      c.roundRect(x + 4, y + 4, rw - 8, rh - 8, r);
      c.fill();
      // surface pits
      for (let k = 0; k < 12; k++) {
        c.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`;
        c.beginPath();
        c.arc(x + Math.random() * rw, y + Math.random() * rh, 1 + Math.random() * 4, 0, Math.PI * 2);
        c.fill();
      }
      x += rw;
    }
    y += rh;
  }
  noise(c, 512, 512, 12000, 0.12);
  for (let k = 0; k < 8; k++) {
    const gx = Math.random() * 512;
    const g = c.createLinearGradient(gx, 0, gx, 512);
    g.addColorStop(0, 'rgba(20,18,14,0.0)');
    g.addColorStop(1, 'rgba(20,18,14,0.45)');
    c.fillStyle = g;
    c.fillRect(gx, 200, 30 + Math.random() * 60, 312);
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map, normalMap: normalFromCanvas(cv, 5, repeat), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9 });
}

/** A cloth sheet draped over something: a plane pushed into soft folds. */
export function drapedSheet(w: number, h: number, depth: number) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const top = (y + h / 2) / h; // 0 bottom .. 1 top
    let z = Math.sin(x * 11) * 0.025 * (1 - top) + Math.sin(x * 5 + y * 3) * 0.015;
    z += depth * Math.sin(top * Math.PI * 0.9) * 0.6;
    const flare = 1 + (1 - top) * 0.08;
    pos.setXYZ(i, x * flare, y, z);
  }
  geo.computeVertexNormals();
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#a9a398';
  c.fillRect(0, 0, 256, 256);
  noise(c, 256, 256, 6000, 0.08);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = `rgba(60,50,40,${Math.random() * 0.15})`;
    c.beginPath();
    c.arc(Math.random() * 256, 140 + Math.random() * 116, 10 + Math.random() * 30, 0, Math.PI * 2);
    c.fill();
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  const m = mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }));
  return m;
}

/** A canvas texture you can redraw: returns the texture and a redraw function. */
export function liveCanvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { cv, ctx: cv.getContext('2d')!, tex, update: () => (tex.needsUpdate = true) };
}

/** Handwheel valve (faces +z). */
export function handwheel(r: number, m: THREE.Material) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 8, 24), m));
  for (let k = 0; k < 4; k++) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.06, r * 0.06, r * 2, 6), m);
    sp.rotation.z = (k * Math.PI) / 4;
    g.add(sp);
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, r * 0.3, 10), m).rotateX(Math.PI / 2));
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

// ---------------- shared, built-once materials ----------------
const matCache = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = matCache.get(key) as T | undefined;
  if (!m) {
    m = make();
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return m;
}
export const tileMaterial = (o: Parameters<typeof _tileMaterial>[0] = {}) => cached('tile' + JSON.stringify(o), () => _tileMaterial(o));
export const woodMaterial = (o: Parameters<typeof _woodMaterial>[0] = {}) => cached('wood' + JSON.stringify(o), () => _woodMaterial(o));
export const plasterMaterial = (o: Parameters<typeof _plasterMaterial>[0] = {}) => cached('plaster' + JSON.stringify(o), () => _plasterMaterial(o));
export const stoneMaterial = (repeat: [number, number] = [2, 1], base = '#6b665d') => cached('stone' + repeat + base, () => _stoneMaterial(repeat, base));
export { cached as cachedMaterial };

/**
 * Invisible ink: pale violet writing that only shows in the beam of the UV torch.
 * Set onReveal on its userData to react the first time it's read.
 */
export function uvInk(lines: string[], w: number, h: number, o: { size?: number; font?: string; onReveal?: () => void } = {}) {
  const px = 160;
  const tex = canvasTex(Math.round(px * (w / h)), px, (c, W, H) => {
    let size = o.size ?? H / (lines.length + 1);
    const font = (n: number) => `${n}px ${o.font ?? "'Bradley Hand', 'Segoe Print', cursive"}`;
    c.font = font(size);
    // shrink to fit the widest line
    const widest = Math.max(...lines.map((l) => c.measureText(l).width));
    if (widest > W * 0.92) {
      size *= (W * 0.92) / widest;
      c.font = font(size);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(190,150,255,0.9)';
    c.shadowBlur = 10;
    c.fillStyle = '#efe6ff';
    lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  m.userData.uvInk = true;
  m.userData.noPick = true;
  m.userData.onReveal = o.onReveal;
  m.renderOrder = 3;
  return m;
}
