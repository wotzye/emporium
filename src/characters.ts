import * as THREE from 'three';
import { mesh, rbox, lathe, fx, mat, canvasTex, noise, normalFromCanvas } from './builders';
import { realCharacters, realMerchant, realBruno, realLisa, realBarberGhost, realAdaGhost } from './characters_real';

/**
 * Procedurally sculpted characters. Faces are spheres pushed and pulled into shape
 * (sockets, brow, nose, cheekbones, mouth, chin); bodies are turned profiles; arms are tubes
 * along curves; hands have jointed fingers. Each character has an update(t, camera) that
 * gives it small, unsettling movements.
 */

export interface HeadOpts {
  w?: number; // width
  h?: number; // height
  d?: number; // depth
  gaunt?: number; // hollow cheeks, sharp bones (0..1)
  brow?: number; // brow ridge
  socket?: number; // eye socket depth
  nose?: number; // nose length/size
  jaw?: number; // jaw width factor
  mouthW?: number; // mouth width (0..1 of face)
  smile?: number; // mouth curve (+ = up at the corners)
  age?: number; // wrinkles
  chin?: number;
  child?: boolean;
  seed?: number;
}

const gauss = (dx: number, dy: number, r: number) => Math.exp(-(dx * dx + dy * dy) / (r * r));

/** Returns a head mesh (+z is the face). Also returns the eye positions, in head space. */
export function sculptHead(o: HeadOpts, skin: THREE.Material) {
  const w = o.w ?? 0.2, h = o.h ?? 0.26, d = o.d ?? 0.23;
  const gaunt = o.gaunt ?? 0.3, brow = o.brow ?? 0.5, socket = o.socket ?? 0.6, nose = o.nose ?? 0.5;
  const jaw = o.jaw ?? 1, mouthW = o.mouthW ?? 0.35, smile = o.smile ?? 0, age = o.age ?? 0, chin = o.chin ?? 0.5;
  const seed = o.seed ?? 1;
  const geo = new THREE.SphereGeometry(0.5, 72, 56);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const eyeY = o.child ? 0.02 : 0.08;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiplyScalar(2); // unit sphere
    const x = v.x, y = v.y, z = v.z;
    const front = THREE.MathUtils.smoothstep(z, -0.1, 0.6); // 0 at the back, 1 on the face
    let r = 1;
    // skull shape: narrower jaw, rounder cranium
    const lower = THREE.MathUtils.smoothstep(-y, 0.0, 1.0);
    const jawScale = 1 - lower * (0.28 - (jaw - 1) * 0.5) * (1 - Math.abs(z) * 0.2);
    // eye sockets
    r -= front * socket * 0.12 * (gauss(x - 0.36, y - eyeY, 0.2) + gauss(x + 0.36, y - eyeY, 0.2));
    // brow ridge
    r += front * brow * 0.07 * Math.exp(-((y - (eyeY + 0.2)) ** 2) / 0.006) * THREE.MathUtils.smoothstep(0.7 - Math.abs(x), 0, 0.3);
    // nose: a ridge and a tip
    const nr = Math.exp(-(x * x) / 0.006) * THREE.MathUtils.smoothstep(eyeY + 0.05 - y, 0, 0.1) * THREE.MathUtils.smoothstep(y + 0.32, 0, 0.12);
    r += front * nose * (0.09 * nr + 0.11 * gauss(x, y + 0.25, 0.09) + 0.03 * gauss(x - 0.07, y + 0.28, 0.05) + 0.03 * gauss(x + 0.07, y + 0.28, 0.05));
    // cheekbones and hollows
    r += front * (0.04 + gaunt * 0.05) * (gauss(x - 0.48, y + 0.08, 0.16) + gauss(x + 0.48, y + 0.08, 0.16));
    r -= front * gaunt * 0.1 * (gauss(x - 0.42, y + 0.38, 0.2) + gauss(x + 0.42, y + 0.38, 0.2));
    // temples
    r -= gaunt * 0.05 * (gauss(x - 0.8, y - 0.25, 0.2) + gauss(x + 0.8, y - 0.25, 0.2));
    // mouth: a curved groove, lips around it
    const mouthY = -0.5 + smile * x * x * 1.6;
    const inMouth = Math.exp(-((y - mouthY) ** 2) / 0.0012) * THREE.MathUtils.smoothstep(mouthW - Math.abs(x), 0, 0.06);
    r -= front * 0.05 * inMouth;
    r += front * 0.025 * Math.exp(-((y - mouthY - 0.06) ** 2) / 0.003) * THREE.MathUtils.smoothstep(mouthW - Math.abs(x), 0, 0.1);
    r += front * 0.02 * Math.exp(-((y - mouthY + 0.06) ** 2) / 0.003) * THREE.MathUtils.smoothstep(mouthW - Math.abs(x), 0, 0.1);
    // chin
    r += front * chin * 0.08 * gauss(x, y + 0.78, 0.18);
    // ears
    r += 0.09 * (gauss(z - 0.0, y + 0.02, 0.14) * THREE.MathUtils.smoothstep(Math.abs(x), 0.85, 1.0));
    // wrinkles and skin irregularity
    if (age > 0) {
      r += age * 0.006 * Math.sin(y * 90 + Math.sin(x * 8 + seed) * 3) * front * THREE.MathUtils.smoothstep(y, -0.1, 0.5);
      r += age * 0.004 * Math.sin(x * 60 + y * 20 + seed) * front;
    }
    r += 0.004 * Math.sin(x * 37 + seed) * Math.sin(y * 29 + seed * 2) * Math.sin(z * 31);
    v.set(x * jawScale, y, z).multiplyScalar(r);
    v.set(v.x * w * 0.5, v.y * h * 0.5, v.z * d * 0.5);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const head = mesh(geo, skin);
  const eyes: [THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(-0.36 * w * 0.5, eyeY * h * 0.5, d * 0.5 * 0.72),
    new THREE.Vector3(0.36 * w * 0.5, eyeY * h * 0.5, d * 0.5 * 0.72),
  ];
  const mouth = { y: -0.5 * h * 0.5, w: mouthW * w * 0.5, z: d * 0.5 * 0.9, smile };
  return { head, eyes, mouth };
}

/** Eyeballs sitting in the sockets; the pupils can glint (white) or burn (red). */
function eyeballs(at: [THREE.Vector3, THREE.Vector3], r: number, glint: number) {
  const g = new THREE.Group();
  const ball = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.15, metalness: 0 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: glint });
  const pupils: THREE.Mesh[] = [];
  for (const p of at) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), ball);
    e.position.copy(p);
    g.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 8, 6), pupilMat);
    pu.position.copy(p).add(new THREE.Vector3(0, 0, r * 0.85));
    pupils.push(pu);
    g.add(pu);
  }
  return { group: g, pupils, pupilMat };
}

/** A jointed hand. Fingers point along +z, palm down. */
export function hand(m: THREE.Material, o: { len?: number; thick?: number; curl?: number } = {}) {
  const len = o.len ?? 1, th = o.thick ?? 1, curl = o.curl ?? 0.25;
  const g = new THREE.Group();
  g.add(rbox(0.085 * th, 0.028 * th, 0.095, 0.013, m, 0, 0, 0));
  // knuckle ridge
  g.add(rbox(0.08 * th, 0.02 * th, 0.02, 0.009, m, 0, 0.004, 0.04));
  const fingers: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    let parent: THREE.Object3D = g;
    const seg: THREE.Group[] = [];
    const segLen = [0.035, 0.025, 0.02].map((s) => s * len * (i === 1 || i === 2 ? 1.05 : 0.9));
    let first: THREE.Group | null = null;
    segLen.forEach((sl, k) => {
      const joint = new THREE.Group();
      joint.position.set(k === 0 ? -0.029 * th + i * 0.0195 * th : 0, 0, k === 0 ? 0.045 : segLen[k - 1]);
      joint.rotation.x = curl * (k + 1) * 0.5;
      if (k === 0) joint.rotation.y = (i - 1.5) * 0.06;
      const bone = mesh(new THREE.CylinderGeometry(0.0085 * th * (1 - k * 0.12), 0.0095 * th * (1 - k * 0.1), sl, 8), m, 0, 0, sl / 2);
      bone.rotation.x = Math.PI / 2;
      joint.add(bone);
      joint.add(mesh(new THREE.SphereGeometry(0.0095 * th * (1 - k * 0.1), 8, 6), m));
      parent.add(joint);
      parent = joint;
      seg.push(joint);
      if (!first) first = joint;
    });
    fingers.push(first!);
  }
  // thumb
  const thumb = new THREE.Group();
  thumb.position.set(0.045 * th, -0.005, 0.0);
  thumb.rotation.set(0.3, -0.7, -0.4);
  const tb = mesh(new THREE.CylinderGeometry(0.008 * th, 0.01 * th, 0.05 * len, 8), m, 0, 0, 0.025 * len);
  tb.rotation.x = Math.PI / 2;
  thumb.add(tb);
  g.add(thumb);
  return { group: g, fingers };
}

/** An arm as a tube from shoulder to wrist through an elbow. */
function arm(shoulder: THREE.Vector3, elbow: THREE.Vector3, wrist: THREE.Vector3, r0: number, r1: number, m: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3([shoulder, elbow, wrist]);
  const geo = new THREE.TubeGeometry(curve, 24, 1, 12, false);
  // taper the tube from r0 to r1
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const pts = curve.getSpacedPoints(24);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 13);
    const c = pts[Math.min(ring, pts.length - 1)];
    tmp.fromBufferAttribute(pos, i).sub(c);
    const k = ring / 24;
    tmp.multiplyScalar(r0 + (r1 - r0) * k);
    pos.setXYZ(i, c.x + tmp.x, c.y + tmp.y, c.z + tmp.z);
  }
  geo.computeVertexNormals();
  return mesh(geo, m);
}

function skinMaterial(tone: string, rough = 0.55, age = 0.3) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = tone;
  c.fillRect(0, 0, 256, 256);
  noise(c, 256, 256, 9000, 0.06 + age * 0.08);
  for (let i = 0; i < 40 * age; i++) {
    c.fillStyle = `rgba(60,45,40,${Math.random() * 0.12})`;
    c.beginPath();
    c.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 0, Math.PI * 2);
    c.fill();
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, normalMap: normalFromCanvas(cv, 1.5), normalScale: new THREE.Vector2(0.3, 0.3), roughness: rough });
}

function clothMaterial(color: string, rough = 0.95, weave = true) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = color;
  c.fillRect(0, 0, 256, 256);
  if (weave)
    for (let y = 0; y < 256; y += 3) {
      c.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.05})`;
      c.fillRect(0, y, 256, 1);
    }
  noise(c, 256, 256, 6000, 0.08);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  const nm = normalFromCanvas(cv, 2, [3, 3]);
  return new THREE.MeshStandardMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(0.4, 0.4), roughness: rough });
}

/** Where a point of the unit face (x right, y up, on the front) lands on the sphere's texture (canvas px). */
function faceUV(x: number, y: number, W: number, H: number) {
  const th = Math.acos(THREE.MathUtils.clamp(y, -0.999, 0.999));
  const st = Math.sin(th);
  const phi = Math.acos(THREE.MathUtils.clamp(-x / st, -1, 1));
  return [(phi / (Math.PI * 2)) * W, (th / Math.PI) * H] as const;
}

export interface FacePaint {
  tone: string;
  sockets?: number; // darkness around the eyes
  mouthW?: number;
  smile?: number;
  gaunt?: number;
  stubble?: number;
  wrinkles?: number;
  veins?: number;
  eyeY?: number;
}

/** Skin with painted shading: dark sockets, hollow cheeks, lips, stubble, wrinkles. */
function faceSkin(o: FacePaint) {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = o.tone;
  c.fillRect(0, 0, W, H);
  noise(c, W, H, 30000, 0.07);
  const blob = (x: number, y: number, rx: number, ry: number, color: string, a: number) => {
    const [px, py] = faceUV(x, y, W, H);
    c.save();
    c.translate(px, py);
    c.scale(rx * W * 0.16, ry * H * 0.32);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, `rgba(${color},${a})`);
    gr.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };
  const ey = o.eyeY ?? 0.08;
  const sk = o.sockets ?? 0.7;
  for (const sx of [-1, 1]) {
    blob(sx * 0.36, ey + 0.02, 0.32, 0.22, '10,8,8', 0.85 * sk);
    blob(sx * 0.36, ey, 0.18, 0.12, '0,0,0', 0.9 * sk);
    blob(sx * 0.36, ey - 0.14, 0.26, 0.1, '30,20,20', 0.5 * sk); // bags
  }
  // nose shadow and nostrils
  blob(0.09, -0.12, 0.08, 0.2, '20,15,15', 0.35);
  blob(-0.07, -0.28, 0.05, 0.04, '0,0,0', 0.6);
  blob(0.07, -0.28, 0.05, 0.04, '0,0,0', 0.6);
  // cheek hollows and temples
  const ga = o.gaunt ?? 0.3;
  for (const sx of [-1, 1]) {
    blob(sx * 0.45, -0.32, 0.25, 0.25, '25,18,18', 0.55 * ga);
    blob(sx * 0.78, 0.25, 0.2, 0.25, '25,18,18', 0.4 * ga);
  }
  // mouth line, lips
  const mw = o.mouthW ?? 0.35, sm = o.smile ?? 0;
  c.strokeStyle = 'rgba(25,10,10,0.85)';
  c.lineWidth = 5;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = -mw + (i / 30) * mw * 2;
    const [px, py] = faceUV(x, -0.5 + sm * x * x * 1.6, W, H);
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  blob(0, -0.55, mw * 0.7, 0.06, '60,30,30', 0.45);
  // stubble
  const st = o.stubble ?? 0;
  for (let i = 0; i < 9000 * st; i++) {
    const x = (Math.random() - 0.5) * 1.5, y = -0.35 - Math.random() * 0.55;
    if (Math.abs(x) > 0.75 - (y + 0.9) * 0.2) continue;
    const [px, py] = faceUV(x, y, W, H);
    c.fillStyle = `rgba(20,18,16,${0.3 + Math.random() * 0.4})`;
    c.fillRect(px, py, 1.5, 1.5);
  }
  // wrinkles: forehead lines, crow's feet, nasolabial folds
  const wr = o.wrinkles ?? 0;
  c.strokeStyle = `rgba(30,20,20,${0.35 * wr})`;
  c.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const x = -0.55 + i * 0.055;
      const [px, py] = faceUV(x, 0.42 + k * 0.08 + Math.sin(i * 0.7 + k) * 0.01, W, H);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const [ax, ay] = faceUV(sx * 0.58, ey + (k - 1) * 0.05, W, H);
      const [bx, by] = faceUV(sx * 0.72, ey + (k - 1) * 0.08, W, H);
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
    }
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const y = -0.25 - i * 0.03;
      const [px, py] = faceUV(sx * (0.16 + i * 0.012), y, W, H);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  // veins on the temples
  const vn = o.veins ?? 0;
  c.strokeStyle = `rgba(40,40,60,${0.4 * vn})`;
  c.lineWidth = 1.5;
  for (const sx of [-1, 1]) {
    let [px, py] = faceUV(sx * 0.7, 0.45, W, H);
    c.beginPath();
    c.moveTo(px, py);
    for (let i = 0; i < 10; i++) {
      px += (Math.random() - 0.5) * 14;
      py += 6 + Math.random() * 4;
      c.lineTo(px, py);
    }
    c.stroke();
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, normalMap: normalFromCanvas(cv, 1.2), normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.5 });
}

export interface Character {
  group: THREE.Group;
  update: (dt: number, t: number, camera: THREE.Camera) => void;
  /** pupils lit or not */
  setEyes: (on: boolean) => void;
  head: THREE.Object3D;
}

/** Turn a head (in its parent's space) slowly towards a world point, within limits. */
function lookToward(head: THREE.Object3D, target: THREE.Vector3, k: number, maxYaw = 0.9, maxPitch = 0.4) {
  const parent = head.parent!;
  const local = parent.worldToLocal(target.clone());
  const dir = local.sub(head.position);
  const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -maxYaw, maxYaw);
  const pitch = THREE.MathUtils.clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -maxPitch, maxPitch);
  head.rotation.y += (yaw - head.rotation.y) * k;
  head.rotation.x += (pitch - head.rotation.x) * k;
}

// ======================================================================
// The Merchant
// ======================================================================
export function createMerchant(handsAt?: { y: number; z: number; spread: number }): Character {
  if (realCharacters()) return realMerchant(handsAt);
  const g = new THREE.Group();
  const coat = clothMaterial('#141414', 0.85);
  const shirt = clothMaterial('#d8d4cb', 0.8, false);
  const skin = skinMaterial('#cfc8bd', 0.5, 0.5);
  // long overcoat
  const body = lathe([[0, 0], [0.3, 0], [0.31, 0.05], [0.27, 0.5], [0.23, 0.95], [0.21, 1.2], [0.24, 1.42], [0.23, 1.5], [0.12, 1.6], [0.06, 1.63], [0, 1.63]], coat, 0, 0, 0, 28);
  body.scale.set(1, 1, 0.62);
  g.add(body);
  // shirt front and tie
  const front = mesh(new THREE.PlaneGeometry(0.13, 0.32), shirt, 0, 1.43, 0.148, false);
  front.rotation.x = -0.12;
  g.add(front);
  g.add(rbox(0.035, 0.26, 0.012, 0.005, mat(0x080808, { roughness: 0.4 }), 0, 1.41, 0.158).rotateX(-0.12));
  // lapels
  for (const s of [-1, 1]) {
    const lap = rbox(0.09, 0.36, 0.015, 0.006, coat, s * 0.085, 1.38, 0.15);
    lap.rotation.set(-0.1, 0, s * 0.28);
    g.add(lap);
  }
  // neck
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.12, 12), skin, 0, 1.67, 0.0));
  // high stiff collar
  g.add(mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.05, 16, 1, true), shirt, 0, 1.63, 0.0, false));
  // head: gaunt, long, a smile that is too wide
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.79, 0.02);
  const faceM = faceSkin({ tone: '#d2cbc0', sockets: 1, mouthW: 0.62, smile: 0.55, gaunt: 1, wrinkles: 0.6, veins: 1 });
  const { head, eyes, mouth } = sculptHead({ w: 0.19, h: 0.29, d: 0.22, gaunt: 1.2, brow: 1.1, socket: 1.6, nose: 1.0, jaw: 0.9, mouthW: 0.62, smile: 0.55, age: 0.6, chin: 1.0, seed: 3 }, faceM);
  headPivot.add(head);
  const ey = eyeballs(eyes, 0.013, 0xffffff);
  headPivot.add(ey.group);
  // the grin: a dark curved slit with a row of small teeth
  const grin = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -mouth.w + (i / 16) * mouth.w * 2;
    const nx = x / (0.19 * 0.5);
    pts.push(new THREE.Vector3(x, mouth.y + mouth.smile * nx * nx * 1.6 * 0.29 * 0.5 + 0.002, mouth.z - Math.abs(nx) * 0.03));
  }
  const slit = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.0045, 6, false), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  grin.add(slit);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.4 });
  for (let i = 2; i <= 14; i++) {
    const p = pts[i];
    const tooth = rbox(0.0065, 0.008, 0.004, 0.0015, toothMat, p.x, p.y + 0.0035, p.z + 0.002);
    grin.add(tooth);
  }
  headPivot.add(grin);
  // fedora
  const hat = lathe([[0, 0], [0.2, 0], [0.215, 0.008], [0.2, 0.015], [0.12, 0.02], [0.115, 0.11], [0.1, 0.135], [0.05, 0.13], [0, 0.12]], new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, sheen: 0 } as THREE.MeshStandardMaterialParameters), 0, 0.105, -0.01, 28);
  hat.rotation.x = -0.12;
  headPivot.add(hat);
  hat.add(mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.025, 28, 1, true), mat(0x1e1e1e), 0, 0.035, 0, false));
  g.add(headPivot);
  // arms and long-fingered hands resting on the counter
  const H = handsAt ?? { y: 1.07, z: 0.85, spread: 0.24 };
  const hands: ReturnType<typeof hand>[] = [];
  for (const s of [-1, 1]) {
    g.add(arm(new THREE.Vector3(s * 0.22, 1.47, 0.0), new THREE.Vector3(s * 0.3, 1.15, 0.3), new THREE.Vector3(s * H.spread, H.y + 0.03, H.z - 0.1), 0.055, 0.04, coat));
    // white cuff
    g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), shirt, s * H.spread, H.y + 0.03, H.z - 0.08, false).rotateX(Math.PI / 2 - 0.2));
    const hd = hand(skin, { len: 1.5, thick: 0.85, curl: 0.35 });
    hd.group.position.set(s * H.spread, H.y, H.z - 0.04);
    hd.group.rotation.y = -s * 0.25;
    g.add(hd.group);
    hands.push(hd);
  }
  let nextTwitch = 6 + Math.random() * 5;
  let twitch = 0;
  const camPos = new THREE.Vector3();
  return {
    group: g,
    head: headPivot,
    setEyes: (on) => (ey.pupilMat.color.setScalar(on ? 1 : 0.25)),
    update: (dt, t, camera) => {
      camera.getWorldPosition(camPos);
      lookToward(headPivot, camPos, Math.min(dt * 1.2, 1), 0.8, 0.35);
      // a slow, wrong tilt of the head, and sometimes a sudden twitch
      nextTwitch -= dt;
      if (nextTwitch < 0) {
        twitch = 1;
        nextTwitch = 7 + Math.random() * 8;
      }
      twitch = Math.max(0, twitch - dt * 2.5);
      headPivot.rotation.z = Math.sin(t * 0.4) * 0.12 + twitch * 0.35;
      // breathing
      body.scale.x = 1 + Math.sin(t * 1.1) * 0.012;
      // fingers drumming on the counter, one after the other
      hands.forEach((hd, side) => {
        hd.fingers.forEach((f, i) => {
          const phase = (t * 3.2 - i * 0.35 - side * 2) % 4;
          const lift = side === 0 && phase > 0 && phase < 0.35 ? Math.sin((phase / 0.35) * Math.PI) : 0;
          f.rotation.x = 0.17 - lift * 0.55;
        });
      });
    },
  };
}

// ======================================================================
// Bruno, the butcher
// ======================================================================
export function createBruno(): Character {
  if (realCharacters()) return realBruno();
  const g = new THREE.Group();
  const shirt = clothMaterial('#3a3835', 0.95);
  const skin = skinMaterial('#a59c90', 0.45, 0.8);
  // apron: pale cloth soaked with dark stains
  const apronTex = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#c9c3b6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 8000, 0.1);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = h * 0.2 + Math.random() * h * 0.8, r = 10 + Math.random() * 45;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(30,10,8,0.85)');
      gr.addColorStop(0.7, 'rgba(40,14,10,0.5)');
      gr.addColorStop(1, 'rgba(40,14,10,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 18; i++) {
      c.fillStyle = 'rgba(25,8,6,0.7)';
      c.fillRect(Math.random() * w, h * 0.4 + Math.random() * h * 0.4, 2 + Math.random() * 4, 40 + Math.random() * 120);
    }
    // hand wipes
    for (let i = 0; i < 6; i++) {
      c.fillStyle = 'rgba(35,12,10,0.55)';
      const x = Math.random() * w, y = h * 0.35 + Math.random() * h * 0.3;
      for (let k = 0; k < 4; k++) c.fillRect(x + k * 9, y, 5, 50 + Math.random() * 20);
    }
  });
  const apron = new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.75 });
  const torso = new THREE.Group();
  torso.position.y = 0.95;
  torso.rotation.x = 0.28; // hunched
  g.add(torso);
  const legs = lathe([[0, 0], [0.32, 0], [0.33, 0.05], [0.34, 0.95], [0, 0.95]], mat(0x1b1a19, { roughness: 0.95 }), 0, 0, 0, 20);
  legs.scale.z = 0.7;
  g.add(legs);
  const chest = lathe([[0, -0.05], [0.36, -0.05], [0.42, 0.25], [0.45, 0.55], [0.44, 0.7], [0.35, 0.8], [0.15, 0.86], [0, 0.86]], shirt, 0, 0, 0, 28);
  chest.scale.z = 0.72;
  torso.add(chest);
  const apronFront = lathe([[0.36, -0.9], [0.43, -0.3], [0.46, 0.2], [0.46, 0.55]], apron, 0, 0, 0.02, 28);
  apronFront.scale.set(1.0, 1, 0.75);
  // keep only the front half visually: a thetaLength cut
  (apronFront.geometry as THREE.BufferGeometry).dispose();
  apronFront.geometry = new THREE.LatheGeometry([new THREE.Vector2(0.36, -0.9), new THREE.Vector2(0.43, -0.3), new THREE.Vector2(0.46, 0.2), new THREE.Vector2(0.455, 0.55)], 20, -Math.PI * 0.42, Math.PI * 0.84);
  apronFront.position.z = 0.02;
  torso.add(apronFront);
  // neck strap
  for (const s of [-1, 1]) torso.add(rbox(0.04, 0.3, 0.02, 0.008, apron, s * 0.12, 0.7, 0.28).rotateZ(-s * 0.35));
  // thick neck, bald head pushed forward, brutal face
  torso.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 16), skin, 0, 0.9, 0.05));
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.05, 0.12);
  torso.add(headPivot);
  const faceB = faceSkin({ tone: '#a89f93', sockets: 1, mouthW: 0.42, smile: -0.25, gaunt: 0.2, stubble: 1, wrinkles: 0.8, veins: 0.6 });
  const { head, eyes } = sculptHead({ w: 0.25, h: 0.3, d: 0.27, gaunt: 0.1, brow: 1.8, socket: 1.6, nose: 1.1, jaw: 1.35, mouthW: 0.42, smile: -0.25, age: 0.9, chin: 1.0, seed: 7 }, faceB);
  headPivot.add(head);
  headPivot.rotation.x = 0.35; // looking from under the brow
  const ey = eyeballs(eyes, 0.016, 0xff1a1a);
  headPivot.add(ey.group);
  ey.group.visible = false;
  // arms: heavy, sleeves rolled up, the right hand holds the cleaver
  const armL = arm(new THREE.Vector3(-0.42, 0.68, 0), new THREE.Vector3(-0.5, 0.25, 0.15), new THREE.Vector3(-0.42, -0.12, 0.25), 0.085, 0.065, skin);
  const armR = arm(new THREE.Vector3(0.42, 0.68, 0), new THREE.Vector3(0.55, 0.3, 0.2), new THREE.Vector3(0.5, 0.0, 0.42), 0.085, 0.065, skin);
  torso.add(armL, armR);
  for (const [x, y, z] of [[-0.48, 0.5, 0.06], [0.5, 0.52, 0.08]] as const) torso.add(mesh(new THREE.TorusGeometry(0.085, 0.03, 8, 16), shirt, x, y, z, false).rotateX(Math.PI / 2 - 0.4));
  const hl = hand(skin, { len: 1.1, thick: 1.5, curl: 0.6 });
  hl.group.position.set(-0.42, -0.15, 0.27);
  hl.group.rotation.set(1.3, 0.2, 0);
  torso.add(hl.group);
  const hr = hand(skin, { len: 1.1, thick: 1.5, curl: 1.1 });
  hr.group.position.set(0.5, -0.03, 0.45);
  hr.group.rotation.set(1.0, -0.3, 0);
  torso.add(hr.group);
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 1, roughness: 0.3 });
  const cleaver = new THREE.Group();
  cleaver.add(rbox(0.03, 0.14, 0.02, 0.008, mat(0x1a120c), 0, 0, 0));
  const blade = rbox(0.008, 0.16, 0.3, 0.004, steel, 0, -0.12, 0.1);
  cleaver.add(blade);
  // dark smear on the blade
  cleaver.add(mesh(new THREE.PlaneGeometry(0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a0806, roughness: 0.2, transparent: true, opacity: 0.8 }), 0.0051, -0.15, 0.12, false).rotateY(Math.PI / 2));
  cleaver.position.set(0.52, -0.08, 0.5);
  cleaver.rotation.set(0.2, 0, 0.3);
  torso.add(cleaver);
  let walk = 0;
  return {
    group: g,
    head: headPivot,
    setEyes: (on) => (ey.group.visible = on),
    update: (dt, t) => {
      // heavy breathing: shoulders rise and fall
      torso.position.y = 0.95 + Math.sin(t * 1.8) * 0.015;
      chest.scale.x = 1 + Math.sin(t * 1.8) * 0.02;
      // when moving, a lurching gait
      const moving = g.userData.moving ? 1 : 0;
      walk += dt * moving * 4;
      torso.rotation.z = Math.sin(walk) * 0.08 * moving;
      torso.rotation.x = 0.28 + Math.abs(Math.sin(walk)) * 0.06 * moving;
      headPivot.rotation.z = Math.sin(t * 0.5) * 0.05 + Math.sin(walk * 0.5) * 0.08 * moving;
    },
  };
}

// ======================================================================
// Lisa, the ghost
// ======================================================================
const ghostVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vY;
  uniform float time;
  void main() {
    vec3 p = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vY = wp.y;
    vN = normalize(normalMatrix * normal);
    vec4 mv = viewMatrix * wp;
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const ghostFrag = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vY;
  uniform float time, opacity, floorY, core;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    float a = core + fres * 0.9;
    // dissolve towards the floor, with a moving noise edge
    float n = hash(floor(gl_FragCoord.xy / 3.0) + floor(time * 8.0));
    float fade = smoothstep(floorY, floorY + 0.55, vY + n * 0.12);
    a *= fade;
    a *= 0.85 + 0.15 * sin(time * 9.0 + vY * 20.0);
    gl_FragColor = vec4(vec3(0.86, 0.92, 0.96) * (0.6 + fres), a * opacity);
  }
`;

export function createLisa(floorY = 0): Character & { setOpacity: (v: number) => void } {
  if (realCharacters()) return realLisa(floorY);
  const g = new THREE.Group();
  const uniforms = { time: { value: 0 }, opacity: { value: 0 }, floorY: { value: floorY }, core: { value: 0.12 } };
  const ghost = new THREE.ShaderMaterial({ vertexShader: ghostVert, fragmentShader: ghostFrag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const faceMat = new THREE.ShaderMaterial({ vertexShader: ghostVert, fragmentShader: ghostFrag, uniforms: { ...uniforms, core: { value: 0.35 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // nightgown
  const gown = lathe([[0, 0.0], [0.3, 0.0], [0.26, 0.35], [0.2, 0.75], [0.16, 1.0], [0.15, 1.15], [0.13, 1.25], [0.06, 1.3], [0, 1.3]], ghost, 0, 0, 0, 32);
  gown.scale.z = 0.7;
  g.add(gown);
  // head
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.44, 0.02);
  const { head, eyes } = sculptHead({ w: 0.165, h: 0.21, d: 0.19, gaunt: 0.15, brow: 0.2, socket: 1.4, nose: 0.35, jaw: 0.85, mouthW: 0.25, smile: -0.2, age: 0, chin: 0.3, child: true, seed: 11 }, faceMat);
  headPivot.add(head);
  // the eyes are just darkness
  for (const p of eyes) headPivot.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }), p.x, p.y, p.z, false));
  // hair: a shell and long strands that sway
  const shell = lathe([[0, 0.12], [0.07, 0.115], [0.095, 0.07], [0.1, 0.0], [0.095, -0.08], [0.085, -0.12]], ghost, 0, 0, -0.01, 24);
  shell.scale.set(1, 1, 1.05);
  headPivot.add(shell);
  const strands: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * 0.8 + (i / 15) * Math.PI * 1.6;
    const len = 0.32 + Math.random() * 0.18;
    const s = mesh(new THREE.PlaneGeometry(0.035, len, 1, 6), ghost, Math.sin(a) * 0.09, -0.04 - len / 2, Math.cos(a) * 0.09 - 0.02, false);
    s.rotation.y = a;
    s.userData.base = s.position.clone();
    s.userData.phase = Math.random() * 6;
    headPivot.add(s);
    strands.push(s);
  }
  g.add(headPivot);
  // thin arms hanging
  for (const sd of [-1, 1]) g.add(arm(new THREE.Vector3(sd * 0.13, 1.22, 0), new THREE.Vector3(sd * 0.17, 0.95, 0.02), new THREE.Vector3(sd * 0.16, 0.7, 0.06), 0.03, 0.022, ghost));
  fx(g);
  return {
    group: g,
    head: headPivot,
    setEyes: () => {},
    setOpacity: (v: number) => (uniforms.opacity.value = v),
    update: (_dt, t, camera) => {
      uniforms.time.value = t;
      g.position.y = Math.sin(t * 1.3) * 0.03;
      gown.rotation.y = Math.sin(t * 0.7) * 0.08;
      strands.forEach((s) => {
        s.rotation.x = Math.sin(t * 1.1 + s.userData.phase) * 0.15;
        s.rotation.z = Math.sin(t * 0.8 + s.userData.phase) * 0.1;
      });
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      lookToward(headPivot, camPos, 0.02, 0.6, 0.3);
      headPivot.rotation.z = 0.25 + Math.sin(t * 0.6) * 0.05; // head tilted, sad
    },
  };
}

// ======================================================================
// The old barber (seen only in the mirror)
// ======================================================================
export function createBarberGhost(scare = false): Character & { setOpacity: (v: number) => void } {
  if (realCharacters()) return realBarberGhost(scare);
  const g = new THREE.Group();
  const coatTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e3dfd6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 5000, 0.1);
    for (let i = 0; i < 10; i++) {
      c.fillStyle = 'rgba(70,60,50,0.18)';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 20, 0, Math.PI * 2);
      c.fill();
    }
  });
  const coatM = new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.8, transparent: true });
  const skin = skinMaterial('#d6cfc4', 0.6, 1);
  skin.transparent = true;
  const body = lathe([[0, 0.0], [0.24, 0.0], [0.25, 0.4], [0.22, 0.9], [0.2, 1.2], [0.22, 1.38], [0.18, 1.46], [0.06, 1.5], [0, 1.5]], coatM, 0, 0, 0, 24);
  body.scale.z = 0.6;
  g.add(body);
  for (let k = 0; k < 4; k++) g.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(0x222222), 0.03, 0.95 + k * 0.12, 0.135, false));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 12), skin, 0, 1.53, 0));
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.66, 0.02);
  const faceO = faceSkin({ tone: '#d8d1c6', sockets: 1, mouthW: 0.3, smile: -0.35, gaunt: 0.9, wrinkles: 1, veins: 0.8 });
  faceO.transparent = true;
  const { head, eyes } = sculptHead({ w: 0.18, h: 0.25, d: 0.21, gaunt: 1.0, brow: 0.8, socket: 1.5, nose: 1.0, jaw: 0.9, mouthW: 0.3, smile: -0.35, age: 1.0, chin: 0.6, seed: 5 }, faceO);
  headPivot.add(head);
  const ey = eyeballs(eyes, 0.012, 0xffffff);
  headPivot.add(ey.group);
  // slicked-back hair and a thin moustache
  const hair = lathe([[0, 0.135], [0.06, 0.13], [0.09, 0.09], [0.098, 0.02], [0.09, -0.04]], new THREE.MeshStandardMaterial({ color: 0x7a7670, roughness: 0.35, transparent: true }), 0, 0, -0.02, 24);
  hair.scale.z = 1.12;
  headPivot.add(hair);
  headPivot.add(rbox(0.06, 0.008, 0.01, 0.003, mat(0x555250), 0, -0.07, 0.1));
  g.add(headPivot);
  // arms reaching forward, a razor in the right hand
  for (const s of [-1, 1]) {
    g.add(arm(new THREE.Vector3(s * 0.19, 1.38, 0), new THREE.Vector3(s * 0.22, 1.2, 0.25), new THREE.Vector3(s * 0.12, 1.38, 0.48), 0.045, 0.032, coatM));
    const hd = hand(skin, { len: 1.3, thick: 0.8, curl: 0.5 });
    hd.group.position.set(s * 0.12, 1.38, 0.5);
    hd.group.rotation.set(-0.2, -s * 0.4, s * 0.6);
    g.add(hd.group);
  }
  const mats: THREE.Material[] = [];
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && !mats.includes(m)) {
      m.transparent = true;
      mats.push(m);
    }
  });
  return {
    group: g,
    head: headPivot,
    setEyes: (on) => (ey.pupilMat.color.setScalar(on ? 1 : 0.2)),
    setOpacity: (v: number) => {
      mats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = v));
      g.visible = v > 0.01;
    },
    update: (_dt, t) => {
      headPivot.rotation.z = Math.sin(t * 0.7) * 0.06 - 0.15;
      headPivot.rotation.x = 0.25;
      g.position.y = Math.sin(t * 2.1) * 0.005;
    },
  };
}

/** Ada's ghost (falls back to a pale ghost figure if the models aren't there). */
export function createAdaGhost(): Character & { setOpacity: (v: number) => void } {
  if (realCharacters()) return realAdaGhost();
  const c = createLisa(0);
  c.group.scale.setScalar(1.15);
  return c;
}
