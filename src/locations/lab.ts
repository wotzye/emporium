import * as THREE from 'three';
import type { Game, Location } from '../game';
import { room, mat } from '../builders';
import { bones, prop } from '../models';
import { createMerchant, createBruno, createLisa, createBarberGhost, createAdaGhost } from '../characters';

/** Debug scene for looking at characters (only with ?lab). */
export function createLab(g: Game): Location {
  const scene = new THREE.Scene();
  scene.add(room(6, 3, 6, { wall: mat(0x6b665c), floor: mat(0x3a3530) }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.SpotLight(0xfff0dd, 30, 12, 0.6, 0.5, 1.5);
  key.position.set(1.5, 2.8, 2.5);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  scene.add(key, key.target);
  const chars = [createMerchant(), createBruno(), createLisa(0), createBarberGhost(), createAdaGhost()];
  chars.forEach((c, i) => {
    c.group.position.set(-1.5 + i, 0, 0);
    scene.add(c.group);
  });
  (chars[2] as ReturnType<typeof createLisa>).setOpacity(1);
  (chars[3] as ReturnType<typeof createBarberGhost>).setOpacity(1);
  (chars[4] as ReturnType<typeof createAdaGhost>).setOpacity(1);
  const figs = chars.map((c) => c.group);
  const props: THREE.Object3D[] = [];
  (['barberChair', 'candleholders', 'woodChair', 'stool', 'teaSet', 'suitcase', 'bucket', 'crate', 'lantern'] as const).forEach((id, i) => {
    const p = prop(id, { height: id === 'barberChair' ? 1.3 : undefined });
    if (!p) return;
    p.position.set(-2.4 + i * 0.6, 0, -1.8);
    scene.add(p);
    props.push(p);
  });
  return {
    id: 'lab',
    nameKey: 'place.map',
    scene,
    drone: 'emporio',
    views: { main: { pos: [0, 1.4, 3.6], look: [0, 1.0, 0] }, m: { pos: [-1.5, 1.7, 1.2], look: [-1.5, 1.55, 0] }, b: { pos: [-0.5, 1.6, 1.4], look: [-0.5, 1.4, 0] }, l: { pos: [0.5, 1.3, 1.3], look: [0.5, 1.2, 0] }, h: { pos: [1.5, 1.55, 1.3], look: [1.5, 1.4, 0] }, bh: { pos: [-0.1, 1.25, 1.1], look: [-0.6, 0.95, 0.35] }, mh: { pos: [-1.2, 1.4, 1.3], look: [-1.5, 1.05, 0.7] }, mf: { pos: [-1.5, 1.78, 0.65], look: [-1.5, 1.74, 0] }, ad: { pos: [2.5, 1.5, 1.3], look: [2.5, 1.35, 0] }, props: { pos: [0, 1.5, 1.0], look: [0, 0.5, -1.8] } },
    startView: 'main',
    hotspots: [],
    update: (dt, t) => chars.forEach((c) => c.update(dt, t, g.engine.camera)),
    debug: { figs, chars, bones: figs.map((x) => bones(x)), g },
  };
}
