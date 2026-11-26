import * as THREE from 'three';
import type { Game } from '../game';
import { canvasTex, noise, mesh, tileMaterial, plasterMaterial } from '../builders';
import { prop } from '../models';

/**
 * The butcher's, second time. After the crypt Diego remembers the 24th of October, and the
 * shop lets him back in: what is left of Bruno is still there, and it won't rest until his
 * son calls him back. Rooms: the shop (corrupted), the curing room behind it, the cold room
 * where Lisa hid Diego, and the cellar where Bruno made his deal.
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** part two is on once the crypt is done; over once Bruno is at peace */
export const act2 = (g: Game) => !!g.flag('ch.done');
export const brunoFreed = (g: Game) => !!g.flag('m2.done');

/** the weight of the last delivery, written in the ledger: the scale gives up the key at 3.7 kg */
export const SCALE_CODE = '37';

export const butcherTiles = (w: number, h: number) =>
  tileMaterial({ a: '#d9d6cf', b: '#cdc9c1', n: 10, repeat: [w / 1.6, h / 1.6], grout: '#5c5952', grime: 1, rough: 0.25, checker: false });
export const butcherPlaster = (w: number, h: number) => plasterMaterial({ base: '#7a756b', repeat: [w / 2.5, h / 1.2], damp: 1.3 });
export const butcherFloor = () => tileMaterial({ a: '#7f7a72', b: '#36332f', n: 8, repeat: [3, 3], grout: '#24211e', grime: 1, rough: 0.4 });

/** a dark smear on the floor (dried, so it reads black in the noir filter) */
export function smear(w: number, d: number, x: number, z: number, rot = 0, seed = 1) {
  const m = mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, W, H) => {
      let s = seed;
      const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 40; i++) {
        const x0 = r() * W, y0 = H * 0.1 + r() * H * 0.8, rad = 6 + r() * 30;
        const gr = c.createRadialGradient(x0, y0, 0, x0, y0, rad);
        gr.addColorStop(0, 'rgba(22,10,9,0.8)');
        gr.addColorStop(1, 'rgba(22,10,9,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, W, H);
      }
      // drag marks
      c.strokeStyle = 'rgba(20,9,8,0.55)';
      for (let k = 0; k < 4; k++) {
        c.lineWidth = 4 + r() * 6;
        c.beginPath();
        c.moveTo(W * 0.2 + k * 12, 0);
        c.bezierCurveTo(W * 0.4, H * 0.3, W * 0.6, H * 0.6, W * 0.5 + k * 10, H);
        c.stroke();
      }
      noise(c, W, H, 600, 0.05);
    }),
    transparent: true,
    roughness: 0.15,
    depthWrite: false,
  }), x, 0.007, z, false);
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.userData.noPick = true;
  return m;
}

/** a human torso hung from a hook by a rope, pale and bloodless (null if the model isn't in) */
export function hangingTorso(height = 0.95) {
  const t = prop('torso', { height, rot: [Math.PI, 0, 0] });
  if (!t) return null;
  const skin = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#a9a39b';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        c.fillStyle = `rgba(60,40,38,${Math.random() * 0.18})`;
        c.beginPath();
        c.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 18, 0, Math.PI * 2);
        c.fill();
      }
      noise(c, w, h, 4000, 0.12);
    }, [2, 2]),
    roughness: 0.55,
  });
  t.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = skin;
  });
  const g = new THREE.Group();
  g.add(t);
  // t hangs from its top (the hips, upside down) down to the shoulders
  const rope = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x8c8578, roughness: 1 }), 0, height + 0.15, 0);
  g.add(rope);
  g.traverse((o) => (o.userData.noPick = true));
  return g;
}

/** one hint chain for all of part two */
export function mac2Hint(g: Game): string {
  if (!g.flag('m2.key') && !g.flag('m2.labOpen')) return g.flag('m2.ledgerUv') ? 'hint.m2.scale' : 'hint.m2.ledger';
  if (!g.flag('m2.labOpen')) return 'hint.m2.labDoor';
  if (!g.flag('m2.cellarKey')) return g.flag('m2.grinderUv') ? 'hint.m2.grinder' : 'hint.m2.labUv';
  if (!g.flag('m2.cellarOpen')) return 'hint.m2.trapdoor';
  if (!g.flag('m2.ritualRead')) return 'hint.m2.ritualUv';
  if (!g.flag('m2.salt')) return g.has('salt') ? 'hint.m2.saltUse' : 'hint.m2.salt';
  if (!g.flag('m2.candles')) return g.has('matches') ? 'hint.m2.matchesUse' : 'hint.m2.matches';
  if (!g.flag('m2.ribbon')) return g.has('ribbon') ? 'hint.m2.ribbonUse' : 'hint.m2.ribbon';
  if (!g.flag('m2.done')) return 'hint.m2.call';
  return 'hint.m2.leave';
}
