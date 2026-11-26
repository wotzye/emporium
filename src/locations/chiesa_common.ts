import * as THREE from 'three';
import { prop, clips } from '../models';
import { rbox, cyl, mesh, mat, plasterMaterial, woodMaterial, tileMaterial } from '../builders';
import type { Game } from '../game';

/**
 * San Michele, the church of Rocca del Castello — shared bits: stone, pews, candles, pigeons,
 * and the chain of clues that runs through it (Lisa: «ricordati il 24»).
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let stoneM: THREE.Material | null = null;
export function stoneWall() {
  if (!stoneM) {
    stoneM = plasterMaterial({ base: '#77736b', repeat: [4, 3], damp: 1.4 });
    stoneM.userData.shared = true;
  }
  return stoneM;
}
export const stoneFloor = () => tileMaterial({ a: '#8a857b', b: '#6a665e', n: 6, repeat: [4, 6], grime: 0.8 });

/** the bells, as they're called up in the tower */
/** how the pew model must be turned to face the altar */
export const PEW_TURN = 0;

export const BELLS = ['G', 'M', 'P'] as const;
/** «a morto»: the order the hymn book gives on page 24 */
export const BELL_ORDER = 'GPPM';
/** the knock for the crypt, Paolo's note: toc … toc toc toc … toc */
export const KNOCK = 'LSSL';

export function pew(len = 2.4) {
  // the real pew, if the model is in (faces the altar: backrest towards +z)
  const real = prop('pewM', { width: len, turn: PEW_TURN });
  if (real) {
    // its own texture is a flat grey: dark old wood instead
    const w = woodMaterial({ base: '#3a2a1c' });
    real.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = w;
    });
    const g = new THREE.Group();
    g.add(real);
    return g;
  }
  const g = new THREE.Group();
  const w = woodMaterial({ base: '#3a2a1c' });
  g.add(rbox(len, 0.06, 0.42, 0.01, w, 0, 0.45, 0));
  g.add(rbox(len, 0.5, 0.05, 0.01, w, 0, 0.75, 0.2));
  g.add(rbox(len, 0.08, 0.08, 0.01, w, 0, 0.92, -0.25));
  for (const x of [-len / 2 + 0.04, len / 2 - 0.04]) g.add(rbox(0.06, 0.95, 0.5, 0.01, w, x, 0.475, 0));
  return g;
}

/** a church candle with a small living flame (returns the light to flicker) */
export function candle(h = 0.4) {
  const g = new THREE.Group();
  g.add(cyl(0.025, 0.028, h, mat(0xe8e2d4, { roughness: 0.8 }), 0, h / 2, 0, 10));
  const flame = mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), 0, h + 0.025, 0, false);
  flame.scale.y = 1.8;
  flame.userData.noPick = true;
  g.add(flame);
  const l = new THREE.PointLight(0xffd9a0, 0.6, 3, 1.8);
  l.position.set(0, h + 0.08, 0);
  g.add(l);
  return { group: g, light: l, flame };
}

/** a pigeon, roosting: body, head, tail; `ring` gives it a little tin tube on one leg */
const mixers = new Set<THREE.AnimationMixer>();
/** advance the real pigeons' animations (call from the location's update) */
export const tickPigeons = (dt: number) => mixers.forEach((m) => m.update(dt));

export function pigeon(ring = false) {
  // the real bird, if the model is in: it bobs and pecks on its own
  const real = prop('pigeon', { height: 0.3 });
  if (real) {
    const g = new THREE.Group();
    g.add(real);
    const cl = clips('pigeon');
    if (cl.length) {
      const mx = new THREE.AnimationMixer(real);
      const a = mx.clipAction(cl[0]);
      a.time = Math.random() * cl[0].duration;
      a.timeScale = 0.7 + Math.random() * 0.5;
      a.play();
      mixers.add(mx);
    }
    if (ring) g.add(cyl(0.008, 0.008, 0.03, mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 }), 0.02, 0.03, 0.0, 8));
    g.traverse((o) => (o.userData.noPick = true));
    return g;
  }
  const g = new THREE.Group();
  const grey = mat(0x6a6a68, { roughness: 0.9 });
  const body = mesh(new THREE.SphereGeometry(0.09, 10, 8), grey, 0, 0.09, 0);
  body.scale.set(0.8, 0.85, 1.25);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0x4a4a48, { roughness: 0.8 }), 0, 0.17, 0.1));
  g.add(mesh(new THREE.ConeGeometry(0.012, 0.03, 5), mat(0x1a1a1a), 0, 0.165, 0.15).rotateX(Math.PI / 2));
  g.add(rbox(0.07, 0.015, 0.1, 0.005, grey, 0, 0.09, -0.13));
  for (const s of [-1, 1]) g.add(cyl(0.004, 0.004, 0.05, mat(0x8a3a30), s * 0.03, 0.02, 0.02, 4));
  if (ring) g.add(cyl(0.01, 0.01, 0.035, mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 }), 0.03, 0.035, 0.02, 8));
  g.traverse((o) => (o.userData.noPick = true));
  return g;
}

/** the church opens once you have the bell tower key (Nello's radio) */
export const LISA_SHOPS = ['radio', 'barbiere', 'ada', 'ora', 'foto'];
/** Paolo's key, and all five of Lisa's messages read: only then does the church let you in. */
export const churchOpen = (g: Game) => (!!g.has('towerkey') && LISA_SHOPS.every((k) => g.flag('uv.' + k))) || !!g.flag('ch.entered');

/** one hint chain for the whole church */
export function churchHint(g: Game): string {
  if (g.has('suitcasekey')) return 'hint.ch.leave';
  if (!g.flag('ch.hymn')) return 'hint.ch.hymn';
  if (!g.flag('ch.tower')) return 'hint.ch.towerDoor';
  if (!g.flag('ch.bells')) return 'hint.ch.bells';
  if (!g.flag('ch.tube')) return 'hint.ch.loft';
  if (!g.flag('ch.maze')) return 'hint.ch.maze';
  if (!g.flag('ch.gate')) return 'hint.ch.gate';
  if (!g.flag('ch.grave')) return 'hint.ch.grave';
  if (!g.flag('ch.crypt')) return 'hint.ch.knock';
  return 'hint.ch.crypt';
}
