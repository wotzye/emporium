import * as THREE from 'three';
import { mat, rbox, cyl, mesh, canvasTex, noise, plasterMaterial, woodMaterial } from '../builders';
import { cursify } from '../models';

/** L'Ultimo Scatto — shared bits: walls, the bellows camera, the portraits of the villagers. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let wallM: THREE.Material | null = null;
export function fotoWall() {
  if (!wallM) {
    wallM = plasterMaterial({ base: '#8a8478', repeat: [3, 2], damp: 0.7 });
    wallM.userData.shared = true;
  }
  return wallM;
}

/**
 * The bellows camera on its wooden tripod. Returns the group, the lens tip (world point
 * the ground-glass picture is taken from, once placed), and the black focusing cloth.
 */
export function bellowsCamera(cursed: boolean) {
  const g = new THREE.Group();
  const wood = woodMaterial({ base: '#4a3424' });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35 });
  // tripod
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = rbox(0.035, 1.25, 0.035, 0.008, wood, Math.cos(a) * 0.22, 0.6, Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
    g.add(leg);
  }
  g.add(rbox(0.3, 0.04, 0.3, 0.01, wood, 0, 1.22, 0));
  const body = new THREE.Group();
  body.position.y = 1.24;
  // the back (ground glass) and the front standard, with the bellows between
  const back = rbox(0.26, 0.26, 0.06, 0.01, wood, 0, 0.15, 0.16);
  const front = rbox(0.22, 0.22, 0.05, 0.01, wood, 0, 0.14, -0.2);
  const bellowsMat = mat(0x2a1a1a, { roughness: 0.8 });
  const bellows = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.34, 4, 6, true), bellowsMat);
  bellows.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  bellows.position.set(0, 0.145, -0.02);
  {
    const p = bellows.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = Math.round((p.getY(i) + 0.17) / 0.0567) % 2 ? 0.94 : 1;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    bellows.geometry.computeVertexNormals();
  }
  const lens = cyl(0.045, 0.05, 0.09, brass, 0, 0.14, -0.27, 20);
  lens.rotation.x = Math.PI / 2;
  const glass = mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.05, metalness: 0.9 }), 0, 0.14, -0.316, false);
  glass.rotation.y = Math.PI;
  body.add(back, front, bellows, lens, glass);
  body.add(rbox(0.02, 0.05, 0.02, 0.004, brass, 0.13, 0.08, -0.2)); // focus knob
  if (cursed) cursify(body);
  g.add(body);
  // the black cloth over the back
  const clothGeo = new THREE.PlaneGeometry(0.5, 0.6, 6, 6);
  const cp = clothGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 14) * 0.02 - Math.abs(cp.getY(i) - 0.2) * 0.15);
  clothGeo.computeVertexNormals();
  const cloth = mesh(clothGeo, new THREE.MeshStandardMaterial({ color: 0x0c0b0b, roughness: 1, side: THREE.DoubleSide }), 0, 1.36, 0.22, false);
  cloth.rotation.x = -0.35;
  g.add(cloth);
  return { group: g, body, cloth, lensLocal: new THREE.Vector3(0, 1.38, -0.33) };
}

/** a villager's studio portrait, as Ferri took them: plain backdrop, one sitter, the name on the mount */
export function villagerPortrait(c: CanvasRenderingContext2D, w: number, h: number, seed: number, name: string) {
  const rnd = (k: number) => {
    const x = Math.sin(seed * 91.7 + k * 13.3) * 43758.5453;
    return x - Math.floor(x);
  };
  c.fillStyle = '#e4dfd2';
  c.fillRect(0, 0, w, h);
  const gr = c.createRadialGradient(w / 2, h * 0.4, 5, w / 2, h / 2, w * 0.7);
  gr.addColorStop(0, '#a49d90');
  gr.addColorStop(1, '#4f4a43');
  c.fillStyle = gr;
  c.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.74);
  const female = rnd(1) > 0.5, old = rnd(2);
  const tone = 40 + old * 50;
  c.fillStyle = `rgb(${tone},${tone - 4},${tone - 8})`;
  c.beginPath();
  c.ellipse(w / 2, h * 0.82, w * 0.3, h * 0.22, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#b8b0a2';
  c.beginPath();
  c.ellipse(w / 2, h * 0.4, w * 0.12, h * 0.12, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = female ? '#2b2621' : `rgb(${50 + old * 140},${48 + old * 136},${44 + old * 130})`;
  c.beginPath();
  if (female) c.ellipse(w / 2, h * 0.37, w * 0.15, h * 0.15, 0, Math.PI, 0);
  else c.ellipse(w / 2, h * 0.32, w * 0.12, h * 0.06, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#1a1714';
  c.fillRect(w * 0.45, h * 0.39, w * 0.03, h * 0.012);
  c.fillRect(w * 0.53, h * 0.39, w * 0.03, h * 0.012);
  noise(c, w, h, 1500, 0.15);
  c.fillStyle = '#3a342c';
  c.font = `italic ${Math.round(h * 0.07)}px Georgia, serif`;
  c.textAlign = 'center';
  c.fillText(name, w / 2, h * 0.92);
}

/** the red darkroom light: a little lamp with a deep red glass */
export function safelight(lit: boolean) {
  const g = new THREE.Group();
  g.add(rbox(0.2, 0.16, 0.12, 0.01, mat(0x1a1816, { roughness: 0.6 }), 0, 0, 0));
  const glass = mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshStandardMaterial({ color: lit ? 0xff1a10 : 0x1a0504, emissive: lit ? 0xff1208 : 0x000000, emissiveIntensity: lit ? 1.4 : 0, roughness: 0.3 }), 0, 0, 0.061, false);
  g.add(glass);
  return { group: g, glass };
}

export { canvasTex };
