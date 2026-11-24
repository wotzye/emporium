import * as THREE from 'three';

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
export function hitBox(w: number, h: number, d: number, x: number, y: number, z: number, name = 'hit') {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  o.position.set(x, y, z);
  o.name = name;
  o.userData.hit = true;
  o.renderOrder = -1;
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
  s.userData.noPick = true;
  return s;
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
export function drawScareFace(cv: HTMLCanvasElement, kind: 'barber' | 'bruno') {
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
    sk.addColorStop(0, kind === 'barber' ? '#cfcac0' : '#a8a196');
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
