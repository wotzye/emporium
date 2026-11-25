import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, textPlane, hitBox, canvasTex, noise, rbox, lathe, fx, dust, framed, tileMaterial, woodMaterial, plasterMaterial } from '../builders';
import { createBruno, createLisa } from '../characters';
import { prop } from '../models';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
/** where Bruno's face is in the real family photo (fractions of the picture), to scratch it out */
const BRUNO_FACE = [0.27, 0.3];

export function createMacelleria(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);
  scene.userData.envIntensity = 0.07;
  const W = 7, H = 3, D = 6;
  const TILE_H = 2.0;

  // ---------------- room: tiled to 2 m, damp plaster above ----------------
  const tiles = (w: number, h: number) =>
    tileMaterial({ a: '#e2e0da', b: '#d6d3cc', n: 10, repeat: [w / 1.6, h / 1.6], grout: '#6c6962', grime: 0.9, rough: 0.22, checker: false });
  const plaster = (w: number, h: number) => plasterMaterial({ base: '#8c877d', repeat: [w / 2.5, h / 1.2], damp: 0.9 });
  const rm = room(W, H, D, {
    wall: plaster(W, H),
    floor: tileMaterial({ a: '#8f8a82', b: '#3d3a36', n: 8, repeat: [4, 3.4], grout: '#2a2724', grime: 1, rough: 0.4 }),
    ceil: plasterMaterial({ base: '#3b3833', repeat: [2, 2], damp: 0.5 }),
  });
  scene.add(rm);
  const walls = rm.userData.walls;
  for (const k of ['back', 'front', 'left', 'right']) (walls[k] as THREE.Mesh).visible = false;
  /** a wall strip: tiles up to TILE_H, plaster above; dir = which wall */
  const strip = (wall: 'back' | 'front' | 'left' | 'right', a0: number, a1: number, y0: number, y1: number) => {
    const parts: [number, number, (w: number, h: number) => THREE.Material][] = [];
    if (y0 < TILE_H) parts.push([y0, Math.min(y1, TILE_H), tiles]);
    if (y1 > TILE_H) parts.push([Math.max(y0, TILE_H), y1, plaster]);
    for (const [b0, b1, mk] of parts) {
      const w = a1 - a0, h = b1 - b0;
      const p = mesh(new THREE.PlaneGeometry(w, h), mk(w, h), 0, (b0 + b1) / 2, 0);
      p.castShadow = false;
      const a = (a0 + a1) / 2;
      if (wall === 'back') p.position.set(a, p.position.y, -D / 2);
      if (wall === 'front') { p.position.set(-a, p.position.y, D / 2); p.rotation.y = Math.PI; }
      if (wall === 'left') { p.position.set(-W / 2, p.position.y, a); p.rotation.y = Math.PI / 2; }
      if (wall === 'right') { p.position.set(W / 2, p.position.y, -a); p.rotation.y = -Math.PI / 2; }
      scene.add(p);
    }
  };
  // back wall with the cold-room opening (x 1.25..2.55, up to 2.2)
  strip('back', -W / 2, 1.25, 0, H);
  strip('back', 2.55, W / 2, 0, H);
  strip('back', 1.25, 2.55, 2.2, H);
  strip('front', -W / 2, W / 2, 0, H);
  strip('left', -D / 2, D / 2, 0, H);
  strip('right', -D / 2, D / 2, 0, H);
  // dark band of tiles at the top edge of the tiling
  for (const [x, z, ry, len] of [[0, -D / 2 + 0.005, 0, W], [-W / 2 + 0.005, 0, Math.PI / 2, D], [W / 2 - 0.005, 0, -Math.PI / 2, D]] as const) {
    const band = mesh(new THREE.PlaneGeometry(len, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.2 }), x, TILE_H - 0.04, z);
    band.rotation.y = ry;
    band.castShadow = false;
    scene.add(band);
  }
  // the cold room itself, seen only through the door
  const cellaRoom = mesh(new THREE.BoxGeometry(1.3, 2.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x7d8388, side: THREE.BackSide, roughness: 0.8, metalness: 0 }), 1.9, 1.1, -3.75);
  cellaRoom.castShadow = false;
  scene.add(cellaRoom);

  // ---------------- neon fixture, flickering ----------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const fixture = rbox(1.75, 0.06, 0.2, 0.02, new THREE.MeshStandardMaterial({ color: 0xbdbab2, roughness: 0.5 }), -0.4, H - 0.05, -0.2);
  scene.add(fixture);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.6, 12), new THREE.MeshBasicMaterial({ color: 0xf4f7ff }));
  tube.rotation.z = Math.PI / 2;
  tube.position.set(-0.4, H - 0.1, -0.2);
  tube.userData.noPick = true;
  scene.add(tube);
  const neon = new THREE.SpotLight(0xeef3ff, 14, 9, 1.2, 0.8, 1.4);
  neon.position.set(-0.4, H - 0.15, -0.2);
  neon.target.position.set(-0.4, 0, -0.6);
  neon.castShadow = true;
  neon.shadow.mapSize.set(1024, 1024);
  scene.add(neon, neon.target);
  let neonOn = 1;
  const motes = dust([-3.2, 0.2, -2.8], [3.2, 2.8, 2.8], 200);
  scene.add(motes.points);

  const steel = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 1, roughness: 0.28, envMapIntensity: 1.5 });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xc8c4bb, roughness: 0.3 });
  const woodBlock = woodMaterial({ base: '#6a5641', repeat: [1, 1] });

  // ---------------- counter with curved glass display ----------------
  const cx = -0.5, cz = -0.8;
  scene.add(rbox(4.0, 0.82, 0.7, 0.03, enamel, cx, 0.41, cz));
  const frontTiles = mesh(new THREE.PlaneGeometry(3.9, 0.6), tileMaterial({ a: '#2f2d2a', b: '#24221f', n: 6, repeat: [6, 1], grout: '#141312', grime: 0.4, rough: 0.2 }), cx, 0.42, cz + 0.352);
  frontTiles.castShadow = false;
  scene.add(frontTiles);
  scene.add(rbox(4.05, 0.04, 0.74, 0.012, steel, cx, 0.84, cz));
  // steel trays
  scene.add(rbox(3.8, 0.03, 0.5, 0.01, steel, cx, 0.875, cz - 0.02));
  // curved glass front + top
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.12, metalness: 0.3, side: THREE.DoubleSide, envMapIntensity: 1 });
  const curve = fx(mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.9, 24, 1, true, 0, Math.PI / 2), glassMat, cx, 0.86, cz - 0.22, false));
  curve.rotation.z = Math.PI / 2;
  curve.rotation.y = 0;
  scene.add(curve);
  scene.add(rbox(4.0, 0.03, 0.08, 0.01, steel, cx, 1.29, cz - 0.24));
  for (const x of [cx - 1.98, cx + 1.98]) scene.add(rbox(0.04, 0.45, 0.6, 0.01, steel, x, 1.07, cz - 0.02));
  // meat: marbled, dark, desaturated (red is only for cursed things)
  const meatTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#6e5654';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      c.strokeStyle = `rgba(215,205,195,${0.08 + Math.random() * 0.22})`;
      c.lineWidth = 0.5 + Math.random() * 2.5;
      c.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      c.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    for (let i = 0; i < 25; i++) {
      c.fillStyle = `rgba(40,22,22,${Math.random() * 0.4})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 20, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, w, h, 3000, 0.1);
  });
  const meat = new THREE.MeshStandardMaterial({ map: meatTex, roughness: 0.35, metalness: 0, envMapIntensity: 0.8 });
  const fat = new THREE.MeshStandardMaterial({ color: 0xd8cfc4, roughness: 0.5 });
  /** an irregular lump: a sphere pushed around by a little noise */
  const lump = (r: number, sx: number, sy: number, seed: number) => {
    const geo = new THREE.SphereGeometry(r, 20, 14);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 23 + seed) * Math.cos(v.y * 19 + seed * 2) * Math.sin(v.z * 17 + seed * 3);
      v.multiplyScalar(1 + n * 0.12);
      if (v.y < -r * 0.3) v.y = -r * 0.3;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const m = mesh(geo, meat);
    m.scale.set(sx, sy, 1);
    return m;
  };
  const pieces: [number, number, number, number][] = [[-2.1, 0.12, 0.7, 1.4], [-1.5, 0.1, 0.9, 1.1], [-0.9, 0.09, 0.8, 0.7], [-0.3, 0.12, 0.75, 1.6], [0.35, 0.08, 0.8, 0.9], [0.9, 0.11, 0.85, 1.2]];
  pieces.forEach(([x, r, sy, sx], i) => {
    const p = lump(r, sx, sy, i * 1.7);
    p.position.set(x, 0.89 + r * 0.3 * sy, cz - 0.05 + (i % 2) * 0.06);
    p.rotation.y = i * 0.7;
    scene.add(p);
    const f = sphere(r * 0.5, fat, x + 0.04, 0.9 + r * 0.45 * sy, cz + 0.02, 10);
    f.scale.set(sx * 0.8, 0.25, 0.6);
    scene.add(f);
    // parsley-like garnish strip between cuts: dark leaves
    scene.add(rbox(0.12, 0.015, 0.4, 0.007, mat(0x2b2f2a), x + 0.3, 0.895, cz - 0.02));
  });
  // a hand among the cuts. Grey, so it is just one more cut until you look closely.
  const hand = new THREE.Group();
  hand.add(rbox(0.1, 0.035, 0.12, 0.015, meat, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const f = rbox(0.018, 0.022, 0.085, 0.009, meat, -0.035 + i * 0.023, 0, 0.095 - Math.abs(i - 1.5) * 0.008);
    f.rotation.x = 0.15;
    hand.add(f);
  }
  hand.add(rbox(0.02, 0.022, 0.065, 0.009, meat, 0.065, 0, 0.03).rotateY(-0.6));
  hand.position.set(-1.2, 0.905, cz + 0.1);
  hand.rotation.y = 0.6;
  scene.add(hand);
  // price cards on little spikes
  const cards = [['price.tongue'], ['price.fingers'], ['price.special']];
  [-2.1, -1.2, -0.3].forEach((x, i) => {
    const c = textPlane([t(cards[i][0])], 0.34, 0.13, { bg: '#f2efe6', size: 22, px: 64, border: '#222' });
    c.position.set(x, 1.0, cz + 0.2);
    c.rotation.x = -0.3;
    scene.add(c);
    scene.add(cyl(0.003, 0.003, 0.12, steel, x, 0.93, cz + 0.17, 4));
  });

  // scale: enamel body, round dial, steel pan
  const scaleG = new THREE.Group();
  scaleG.add(rbox(0.34, 0.1, 0.3, 0.03, enamel, 0, 0.05, 0));
  scaleG.add(rbox(0.12, 0.32, 0.1, 0.03, enamel, 0, 0.2, -0.08));
  scaleG.add(cyl(0.12, 0.12, 0.06, enamel, 0, 0.42, -0.08, 28).rotateX(Math.PI / 2));
  const dialFace = mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#f4f1e8';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#111';
      c.fillStyle = '#111';
      c.font = '18px Georgia, serif';
      c.textAlign = 'center';
      for (let k = 0; k < 40; k++) {
        const a = -Math.PI * 0.75 + (k / 39) * Math.PI * 1.5;
        c.lineWidth = k % 5 ? 1 : 3;
        c.beginPath();
        c.moveTo(w / 2 + Math.sin(a) * 100, h / 2 - Math.cos(a) * 100);
        c.lineTo(w / 2 + Math.sin(a) * (k % 5 ? 90 : 82), h / 2 - Math.cos(a) * (k % 5 ? 90 : 82));
        c.stroke();
        if (k % 10 === 0) c.fillText(String(k / 10), w / 2 + Math.sin(a) * 66, h / 2 - Math.cos(a) * 66 + 6);
      }
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2 - 70, h / 2 - 70);
      c.stroke();
      c.font = 'bold 16px Georgia, serif';
      c.fillText('kg', w / 2, h / 2 + 40);
    }),
    roughness: 0.4,
  }), 0, 0.42, -0.044, false);
  scaleG.add(dialFace);
  scaleG.add(lathe([[0, 0], [0.15, 0.0], [0.17, 0.03], [0.175, 0.035], [0, 0.02]], steel, 0, 0.1, 0.03, 28));
  scaleG.position.set(1.1, 0.86, cz);
  scene.add(scaleG);

  // delivery ledger, open, with a pencil
  const book = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#e4dccb';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(60,70,110,0.35)';
      for (let y = 14; y < h; y += 10) { c.beginPath(); c.moveTo(4, y); c.lineTo(w - 4, y); c.stroke(); }
      c.fillStyle = 'rgba(25,25,30,0.8)';
      for (let y = 22; y < h; y += 10) for (let x = 10; x < w - 20; x += 8 + Math.random() * 18) c.fillRect(x, y - 4, 4 + Math.random() * 10, 2);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(w / 2 - 2, 0, 4, h);
      noise(c, w, h, 800, 0.1);
    }),
    roughness: 0.85,
  });
  book.add(rbox(0.4, 0.03, 0.28, 0.01, mat(0x2a2420, { roughness: 0.6 }), 0, 0, 0));
  const pages = mesh(new THREE.PlaneGeometry(0.38, 0.26), paper, 0, 0.017, 0);
  pages.rotation.x = -Math.PI / 2;
  pages.castShadow = false;
  book.add(pages);
  book.add(cyl(0.004, 0.004, 0.16, mat(0x2a2a2a), 0.05, 0.022, 0.03, 6).rotateZ(Math.PI / 2).rotateY(0.4));
  book.position.set(-2.05, 0.875, cz + 0.05);
  book.rotation.y = -0.2;
  scene.add(book);

  // ---------------- hooks rail with carcasses along the back wall ----------------
  scene.add(rbox(3.2, 0.05, 0.05, 0.015, steel, -1.4, 2.55, -2.6));
  for (const x of [-2.9, 0.1]) scene.add(rbox(0.04, 0.45, 0.04, 0.01, steel, x, 2.78, -2.6));
  for (const x of [-2.6, -1.9, -1.1, -0.3]) {
    const hook = new THREE.Group();
    hook.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 20, Math.PI * 1.3), steel).rotateZ(Math.PI * 0.85));
    hook.add(cyl(0.006, 0.006, 0.16, steel, 0, 0.1, 0, 6));
    hook.position.set(x, 2.4, -2.6);
    scene.add(hook);
    const carcass = new THREE.Group();
    const body = lathe([[0, -0.55], [0.08, -0.5], [0.16, -0.35], [0.2, -0.1], [0.19, 0.1], [0.12, 0.3], [0.05, 0.42], [0.02, 0.5], [0, 0.52]], meat, 0, 0, 0, 18);
    body.scale.set(1, 1, 0.7);
    carcass.add(body);
    // the cut side: a layer of pale fat
    const cut = lathe([[0, -0.5], [0.07, -0.46], [0.15, -0.32], [0.18, -0.1], [0.17, 0.1], [0.1, 0.28], [0.04, 0.4], [0, 0.45]], fat, 0, 0, 0.02, 18);
    cut.scale.set(0.92, 0.95, 0.62);
    carcass.add(cut);
    // twine around the top
    carcass.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 16), mat(0xbcb3a3)).translateY(0.42).rotateX(Math.PI / 2));
    carcass.position.set(x, 1.78, -2.6);
    carcass.userData.sway = Math.random() * 6;
    scene.add(carcass);
  }
  // chopping block with a cleaver stuck in it, knives on a magnetic bar
  const block = new THREE.Group();
  block.add(cyl(0.32, 0.34, 0.75, woodBlock, 0, 0.375, 0, 28));
  block.add(cyl(0.33, 0.33, 0.02, mat(0x2d241b), 0, 0.75, 0, 28));
  const cleaver = new THREE.Group();
  cleaver.add(rbox(0.22, 0.12, 0.01, 0.004, steel, 0, 0, 0));
  cleaver.add(rbox(0.13, 0.03, 0.025, 0.01, mat(0x1a1410), 0.17, 0.03, 0));
  cleaver.position.set(0.05, 0.8, 0);
  cleaver.rotation.set(0, 0.4, -0.25);
  block.add(cleaver);
  block.position.set(2.9, 0, -0.6);
  scene.add(block);
  scene.add(rbox(0.03, 0.05, 0.7, 0.01, mat(0x111111), W / 2 - 0.02, 1.55, -0.6));
  for (let k = 0; k < 5; k++) {
    const kn = new THREE.Group();
    kn.add(rbox(0.008, 0.24 + k * 0.03, 0.03 + (k % 2) * 0.015, 0.003, steel, 0, -(0.12 + k * 0.015), 0));
    kn.add(rbox(0.02, 0.11, 0.025, 0.008, mat(0x1a1410), 0, 0.06, 0));
    kn.position.set(W / 2 - 0.035, 1.55, -0.85 + k * 0.12);
    scene.add(kn);
  }
  // floor drain with dark stains around it
  const drain = mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({
    map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5c5c5c';
      for (let x = 14; x < w; x += 16) c.fillRect(x, 10, 6, h - 20);
    }),
    roughness: 0.5,
    metalness: 0.6,
  }), 0.6, 0.004, 0.4, false);
  drain.rotation.x = -Math.PI / 2;
  scene.add(drain);
  const stain = mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(25,12,10,0.75)');
      gr.addColorStop(0.6, 'rgba(25,12,10,0.35)');
      gr.addColorStop(1, 'rgba(25,12,10,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) {
        c.fillStyle = 'rgba(20,8,8,0.5)';
        c.beginPath();
        c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, Math.PI * 2);
        c.fill();
      }
    }),
    transparent: true,
    roughness: 0.1,
    depthWrite: false,
  }), 0.5, 0.006, 0.2, false);
  stain.rotation.x = -Math.PI / 2;
  scene.add(stain);

  // ---------------- cold room door ----------------
  const cellaX = 1.9;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(cellaX - 0.65, 0, -2.96);
  const door = rbox(1.3, 2.2, 0.12, 0.03, steel, 0.65, 1.1, 0);
  doorPivot.add(door);
  for (const y of [0.4, 1.8]) doorPivot.add(rbox(0.08, 0.16, 0.06, 0.02, mat(0x333333, { metalness: 0.6 }), 0.02, y, 0.07));
  const lever = new THREE.Group();
  lever.add(rbox(0.06, 0.4, 0.05, 0.02, mat(0x2a2a2a, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0));
  lever.add(rbox(0.05, 0.05, 0.12, 0.02, mat(0x2a2a2a, { metalness: 0.5 }), 0, 0.15, -0.05));
  lever.position.set(1.15, 1.15, 0.1);
  doorPivot.add(lever);
  const cellaSign = textPlane(['CELLA', '-2 °C'], 0.3, 0.2, { bg: '#e8e2d2', size: 30, px: 96, border: '#111' });
  cellaSign.position.set(0.65, 1.75, 0.065);
  doorPivot.add(cellaSign);
  scene.add(doorPivot);
  scene.add(rbox(1.5, 0.12, 0.2, 0.03, steel, cellaX, 2.26, -2.95));
  for (const x of [cellaX - 0.7, cellaX + 0.7]) scene.add(rbox(0.1, 2.2, 0.2, 0.03, steel, x, 1.1, -2.95));
  // cold light inside the cella (only when open)
  const coldLight = new THREE.SpotLight(0xdfe8ff, 0, 8, 0.7, 0.5, 1.2);
  coldLight.position.set(cellaX, 2.05, -4.35);
  coldLight.target.position.set(cellaX, 0.5, 0.5);
  coldLight.castShadow = true;
  scene.add(coldLight, coldLight.target);
  // frozen carcasses inside the cella
  for (const x of [cellaX - 0.4, cellaX + 0.4]) {
    const c = lathe([[0, -0.55], [0.1, -0.45], [0.2, -0.1], [0.18, 0.2], [0.06, 0.45], [0, 0.5]], meat, x, 1.4, -4.2, 14);
    scene.add(c);
  }

  // Bruno
  const brunoC = createBruno();
  const bruno = brunoC.group;
  bruno.position.set(cellaX, 0, -3.9);
  bruno.visible = false;
  bruno.traverse((o) => (o.userData.noPick = true));
  scene.add(bruno);

  // family photo on the left wall, framed
  const familyTex = oldPhoto('macelleria_famiglia', 640, 490, (c, w, h) => {
    c.fillStyle = '#8a857c';
    c.fillRect(0, 0, w, h);
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#b9b3a8');
    gr.addColorStop(1, '#6e6a63');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    // the shop front behind them
    c.fillStyle = '#4a4741';
    c.fillRect(0, h * 0.15, w, h * 0.12);
    const people = [[0.27, 1.25, 30], [0.45, 1.05, 24], [0.63, 0.75, 17], [0.8, 0.85, 19]];
    for (const [fx0, s, r] of people) {
      const x = fx0 * w;
      c.fillStyle = '#26241f';
      c.beginPath();
      c.arc(x, h * 0.78 - 0.4 * h * s, r * 0.7, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x - r, h * 0.82 - 0.35 * h * s, r * 2, h);
      c.fillStyle = '#d6d0c4';
      c.fillRect(x - r * 0.5, h * 0.82 - 0.33 * h * s, r, 0.12 * h);
    }
    // Bruno's face scratched out
    c.strokeStyle = '#ece6da';
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(0.27 * w - 18 + Math.random() * 10, h * 0.25 + Math.random() * 20);
      c.lineTo(0.27 * w + 8 + Math.random() * 10, h * 0.33 + Math.random() * 20);
      c.stroke();
    }
    noise(c, w, h, 2500, 0.2);
  }, {
    tone: 'grey',
    age: 0.6,
    // whoever it is on the left (the father): his face scratched away with a nail
    after: (c, x0, y0, w, h) => {
      c.strokeStyle = 'rgba(236,230,218,0.9)';
      c.lineCap = 'round';
      const fx0 = x0 + w * BRUNO_FACE[0], fy0 = y0 + h * BRUNO_FACE[1];
      for (let i = 0; i < 30; i++) {
        c.lineWidth = 1 + Math.random() * 3;
        c.beginPath();
        c.moveTo(fx0 - w * 0.04 + Math.random() * w * 0.03, fy0 - h * 0.05 + Math.random() * h * 0.03);
        c.lineTo(fx0 + w * 0.01 + Math.random() * w * 0.03, fy0 + h * 0.01 + Math.random() * h * 0.05);
        c.stroke();
      }
    },
  });
  const photoG = framed(0.6, 0.46, familyTex, woodMaterial({ base: '#2a1f16' }));
  photoG.position.set(-3.47, 1.65, 0.6);
  photoG.rotation.y = Math.PI / 2;
  scene.add(photoG);
  // door to the stairs (upstairs: the family home)
  const stairDoor = new THREE.Group();
  stairDoor.add(rbox(0.06, 2.1, 0.95, 0.02, woodMaterial({ base: '#3a2c20', repeat: [1, 2] }), 0, 1.05, 0));
  for (const y of [0.55, 1.5]) stairDoor.add(rbox(0.02, 0.7, 0.7, 0.02, woodMaterial({ base: '#2e231a' }), 0.035, y, 0));
  stairDoor.add(sphere(0.03, steel, 0.06, 1.0, 0.35, 10));
  stairDoor.add(rbox(0.08, 2.2, 0.08, 0.02, woodBlock, 0, 1.1, 0.51));
  stairDoor.add(rbox(0.08, 2.2, 0.08, 0.02, woodBlock, 0, 1.1, -0.51));
  stairDoor.position.set(-3.47, 0, -1.9);
  scene.add(stairDoor);

  // exit door with frosted glass
  const exitG = new THREE.Group();
  exitG.add(rbox(1.0, 2.1, 0.06, 0.02, woodMaterial({ base: '#231b14', repeat: [1, 2] }), 0, 1.05, 0));
  exitG.add(fx(mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xc9d0d4, transparent: true, opacity: 0.35, roughness: 0.6 }), 0, 1.5, -0.035, false)));
  exitG.position.set(0, 0, D / 2 - 0.04);
  scene.add(exitG);

  // Lisa
  const lisaC = createLisa(0.05);
  const lisa = lisaC.group;
  lisa.position.set(-2.75, 0.05, -1.75);
  lisa.rotation.y = 0.9;
  scene.add(lisa);
  let lisaTarget = 0;
  let lisaOpacity = 0;

  // ---------------- hotspots ----------------
  const hCounter = hitBox(2.5, 0.6, 0.8, -0.5, 1.0, cz, 'counter');
  const hBook = hitBox(0.7, 0.45, 0.75, -2.05, 0.98, cz + 0.05, 'book');
  const hScale = hitBox(0.55, 0.5, 0.75, 1.1, 1.0, cz, 'scale');
  const hPhoto = hitBox(0.2, 0.7, 0.8, -3.4, 1.65, 0.6, 'photo');
  const hCella = hitBox(1.5, 2.3, 0.4, cellaX, 1.15, -2.8, 'cella');
  const hHooks = hitBox(3.2, 1.6, 0.6, -1.4, 1.8, -2.6, 'hooks');
  const hStairs = hitBox(0.3, 2.1, 1.0, -3.4, 1.05, -1.9, 'stairs');
  scene.add(hCounter, hBook, hScale, hPhoto, hCella, hHooks, hStairs);

  const seen = () => (g.flag('m.book') ? 1 : 0) + (g.flag('m.counter') ? 1 : 0) + (g.flag('m.photo') ? 1 : 0);

  const lisaScene = async () => {
    g.audio.sfx('whisper');
    g.setFlicker(true, 0.6);
    await sleep(700);
    await g.view('lisa');
    lisaTarget = 0.85;
    await sleep(1200);
    await g.say([
      { who: 'lisa', key: 'mac.lisa1' },
      { who: 'diego', key: 'mac.lisa2' },
      { who: 'lisa', key: 'mac.lisa3' },
      { who: 'lisa', key: 'mac.lisa4' },
      { who: 'diego', key: 'mac.lisa5' },
      { who: 'lisa', key: 'mac.lisa6' },
      { who: 'lisa', key: 'mac.lisa7' },
    ]);
    g.set('metLisa');
    g.diaryPage('lisa1');
    g.note('note.barber');
    g.updateLisaBadge();
    await g.say([{ who: 'narr', key: 'mac.diaryGiven' }]);
    // the cella
    g.audio.hush(6);
    g.audio.sfx('thud');
    g.engine.shake(0.03, 0.3);
    await sleep(900);
    g.audio.sfx('thud');
    g.engine.shake(0.05, 0.3);
    lisaTarget = 0.35;
    await g.say([{ who: 'lisa', key: 'mac.lisa8' }]);
    lisaTarget = 0;
    await chase();
  };

  const chase = async () => {
    await g.view('cella', 0.6);
    g.audio.sfx('thud');
    g.engine.shake(0.08, 0.4);
    await sleep(700);
    // door swings open, cold light, Bruno
    g.audio.sfx('creak');
    coldLight.intensity = 9;
    bruno.visible = true;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 900, 1);
        doorPivot.rotation.y = k * 1.5;
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    neonOn = 0.15;
    g.setFlicker(true, 1);
    g.audio.steps(3, 0.5);
    // the torch dies as he comes out
    g.engine.torchFlicker = 1;
    bruno.userData.moving = true;
    for (let i = 0; i < 30; i++) {
      bruno.position.z = -3.9 + (i / 30) * 1.6;
      await sleep(40);
    }
    bruno.userData.moving = false;
    g.engine.torchFlicker = 0;
    g.setTorch(false, true);
    brunoC.setEyes(true);
    g.audio.rec('growl', { gain: 1.1, rate: 0.85 });
    await g.say([{ who: 'bruno', key: 'mac.bruno1' }]);
    await g.scare('bruno');
    g.audio.sfx('heart');
    const ok = await g.ui.quick(t('ui.run'), 3200);
    if (!ok) {
      bruno.position.z = -0.4;
      g.audio.rec('smash', { gain: 1.2 });
      await g.scare('bruno', 450);
      await g.say([{ who: 'narr', key: 'mac.caught' }]);
    }
    await g.ui.fadeOut(300);
    g.setFlicker(false);
    g.set('fledButcher');
    g.rebuild('map');
    await g.say([{ who: 'diego', key: 'mac.outside1' }, { who: 'diego', key: 'mac.outside2' }]);
    await g.go('map', false);
    await g.ui.fadeIn(600);
  };

  const after = async () => {
    if (!g.flag('metLisa') && seen() >= 3) await lisaScene();
  };

  const hotspots: Hotspot[] = [
    { id: 'counter', obj: hCounter, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'mac.counter1' }, { who: 'diego', key: 'mac.counter2' }]);
      if (!g.flag('m.counter')) g.set('m.counter');
      await after();
    } },
    { id: 'book', obj: hBook, view: 'book', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('mac.ledgerTitle'), t('mac.ledgerText'));
      if (!g.flag('m.book')) {
        g.set('m.book');
        g.note('note.ledger');
      }
      await after();
    } },
    { id: 'scale', obj: hScale, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.scale');
    } },
    { id: 'photo', obj: hPhoto, view: 'photo', tap: async (item) => {
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'mac.photo1' }, { who: 'diego', key: 'mac.photo2' }]);
      if (!g.flag('m.photo')) g.set('m.photo');
      await after();
    } },
    { id: 'cella', obj: hCella, view: 'cella', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('thud');
      await g.say('mac.cella');
    } },
    { id: 'hooks', obj: hHooks, tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.hooks');
    } },
    { id: 'stairs', obj: hStairs, tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.stairs');
    } },
  ];

  const rat = prop('rat', { width: 0.32, turn: -Math.PI / 2 });
  let ratT = -1, ratNext = 6 + Math.random() * 8;
  if (rat) {
    rat.visible = false;
    rat.traverse((o) => (o.userData.noPick = true));
    scene.add(rat);
  }
  return {
    id: 'macelleria',
    nameKey: 'place.macelleria',
    scene,
    drone: 'macelleria',
    startView: 'main',
    views: {
      main: { pos: [0, 1.6, 2.4], look: [-0.4, 1.2, -3], yaw: 40, pitch: 14 },
      counter: { pos: [-0.8, 1.75, 0.55], look: [-0.8, 0.85, -0.85], parent: 'main', yaw: 30, pitch: 10 },
      book: { pos: [-2.0, 1.5, 0.05], look: [-2.05, 0.9, -0.75], parent: 'main', yaw: 15, pitch: 8, fov: 55 },
      photo: { pos: [-2.4, 1.62, 0.6], look: [-3.5, 1.62, 0.6], parent: 'main', yaw: 15, pitch: 8, fov: 50 },
      cella: { pos: [1.0, 1.6, 0.6], look: [1.9, 1.25, -3], parent: 'main', yaw: 15, pitch: 8 },
      lisa: { pos: [-1.0, 1.5, 0.6], look: [-2.75, 1.25, -1.75], parent: 'main', yaw: 10, pitch: 6 },
    },
    hotspots,
    canLeave: () => !g.busy,
    update: (dt, time) => {
      if (rat) {
        ratNext -= dt;
        if (ratNext < 0 && ratT < 0) {
          ratT = 0;
          ratNext = 18 + Math.random() * 20;
          g.audio.sfx('scrape');
        }
        if (ratT >= 0) {
          ratT += dt / 1.6;
          rat.visible = ratT < 1;
          rat.position.set(-3.1 + ratT * 5.6, 0, 2.6 - Math.sin(ratT * Math.PI) * 0.3);
          if (ratT >= 1) ratT = -1;
        }
      }
      // neon: buzzing, sometimes dropping
      motes.update(dt, time);
      const drop = Math.random() < 0.015 ? 0.1 : 1;
      neon.intensity = 20 * neonOn * drop;
      (tube.material as THREE.MeshBasicMaterial).color.setScalar(neonOn * drop > 0.5 ? 1 : 0.25);
      scene.traverse((o) => {
        if (o.userData.sway !== undefined) o.rotation.z = Math.sin(time * 0.6 + o.userData.sway) * 0.03;
      });
      lisaOpacity += (lisaTarget - lisaOpacity) * Math.min(dt * 2, 1);
      lisaC.setOpacity(lisaOpacity);
      lisa.visible = lisaOpacity > 0.01;
      if (lisa.visible) lisaC.update(dt, time, g.engine.camera);
      if (bruno.visible) brunoC.update(dt, time, g.engine.camera);
      // the torch stutters while Lisa is near
      if (lisaOpacity > 0.05 && g.engine.torchOn) g.engine.torchFlicker = 0.5;
    },
    enter: async () => {
      g.audio.buzz(true);
      if (g.flag('metLisa') && !g.flag('fledButcher')) {
        // reloaded in the middle of the escape: Bruno is still coming
        await sleep(600);
        await chase();
        return;
      }
      if (!g.flag('m.entered')) {
        g.set('m.entered');
        await sleep(500);
        await g.say([
          { who: 'diego', key: 'mac.enter1' },
          { who: 'diego', key: 'mac.enter2' },
          { who: 'narr', key: 'mac.enter3' },
          { who: 'diego', key: 'mac.enterHint' },
        ]);
      }
    },
    leave: () => g.audio.buzz(false),
    hint: () => 'hint.macelleria',
    dark: () => true,
    debug: { bruno: brunoC, lisa: lisaC, door: doorPivot, coldLight, setLisa: (v: number) => (lisaTarget = v) },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
