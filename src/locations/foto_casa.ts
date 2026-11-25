import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, mat, cyl, lathe, framed } from '../builders';
import { prop } from '../models';
import { createBarberGhost } from '../characters';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { wallpaper } from './ada_common';
import { sleep, villagerPortrait } from './foto_common';

/**
 * Giulio Ferri's flat, over the shop. He's still here, at his table: you can see the chair through him.
 * On the easel, his self-portrait of 14 December, perfect, sharp. He knows. He gives you the
 * last magnesium flash bulb: «Take my picture. The last one. Let them all out.»
 */
export function createFotoCasa(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.8, H = 2.5, D = 3.6;
  const woodDark = woodMaterial({ base: '#2d2218' });
  const woodMid = woodMaterial({ base: '#4f3d2b' });
  scene.add(room(W, H, D, {
    wall: wallpaper('#9a9488', [2.2, 1.1]),
    floor: woodMaterial({ base: '#3a2d21', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#26201a', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const lampL = new THREE.PointLight(0xffd9a0, 2.0, 4.5, 1.6);
  lampL.position.set(-0.5, 1.2, -0.9);
  scene.add(lampL);
  const win = new THREE.SpotLight(0xa9b8c6, 5, 6, 0.6, 0.8, 1.3);
  win.position.set(W / 2 + 0.2, 1.8, 0.4);
  win.target.position.set(-0.5, 0.4, -0.2);
  scene.add(win, win.target);
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ color: 0x1d2329 }), W / 2 - 0.012, 1.55, 0.4, false).rotateY(-Math.PI / 2));
  const motes = dust([-1.8, 0.2, -1.7], [1.8, 2.3, 1.7], 140);
  scene.add(motes.points);

  // ---------------- his table, his chair, and him ----------------
  const tX = -0.5, tZ = -0.9, tY = 0.76;
  scene.add(rbox(1.0, 0.04, 0.65, 0.01, woodMid, tX, tY, tZ));
  for (const [dx, dz] of [[-0.45, -0.28], [0.45, -0.28], [-0.45, 0.28], [0.45, 0.28]]) scene.add(rbox(0.04, tY, 0.04, 0.005, woodMid, tX + dx, tY / 2, tZ + dz));
  scene.add(lathe([[0, 0], [0.06, 0], [0.07, 0.06], [0.03, 0.08], [0.035, 0.1], [0.045, 0.2], [0.02, 0.26], [0, 0.26]], mat(0x8a8070, { roughness: 0.3, transparent: true, opacity: 0.85 }), tX - 0.3, tY + 0.02, tZ - 0.15, 14));
  // prints spread on the table, all of him
  for (let i = 0; i < 5; i++) {
    const p = textPlane([''], 0.12, 0.16, { bg: '#e8e2d4' });
    p.rotation.set(-Math.PI / 2, 0, (i - 2) * 0.3);
    p.position.set(tX + 0.05 + i * 0.08, tY + 0.022 + i * 0.001, tZ + 0.05);
    scene.add(p);
  }
  const chair = prop('woodChair', { height: 0.9 });
  if (chair) {
    chair.position.set(tX, 0, tZ + 0.55);
    chair.rotation.y = Math.PI;
    scene.add(chair);
  }
  const giulio = createBarberGhost(false);
  giulio.group.position.set(tX, 0, tZ + 0.5);
  giulio.group.rotation.y = Math.PI;
  giulio.group.traverse((o) => (o.userData.noPick = true));
  const gone = () => !!g.flag('f.freed');
  giulio.setOpacity(0.35);
  giulio.group.visible = !gone();
  scene.add(giulio.group);

  // ---------------- the easel with the self-portrait ----------------
  const eX = 1.1, eZ = -1.0;
  for (const s of [-1, 1]) scene.add(rbox(0.04, 1.7, 0.04, 0.005, woodDark, eX + s * 0.3, 0.85, eZ).rotateZ(s * -0.08));
  scene.add(rbox(0.04, 1.6, 0.04, 0.005, woodDark, eX, 0.8, eZ - 0.3).rotateX(0.2));
  scene.add(rbox(0.7, 0.04, 0.08, 0.005, woodDark, eX, 0.7, eZ + 0.03));
  const selfTex = oldPhoto('ferri_autoritratto', 300, 380, (c, w, h) => villagerPortrait(c, w, h, 31, t('foto.selfCaption')), { age: 0.1 });
  const selfP = framed(0.5, 0.63, selfTex, woodMaterial({ base: '#1c1510' }));
  selfP.position.set(eX, 1.07, eZ + 0.05);
  selfP.rotation.x = -0.08;
  scene.add(selfP);

  // ---------------- bed, shelf of flash bulbs ----------------
  scene.add(rbox(0.95, 0.45, 1.9, 0.03, woodDark, -W / 2 + 0.55, 0.225, 0.6));
  scene.add(rbox(0.9, 0.12, 1.8, 0.04, mat(0x4a4740, { roughness: 1 }), -W / 2 + 0.55, 0.5, 0.6));
  scene.add(rbox(0.5, 0.1, 0.3, 0.04, mat(0xd6d0c4, { roughness: 1 }), -W / 2 + 0.55, 0.6, -0.15));
  scene.add(rbox(0.9, 0.03, 0.25, 0.005, woodDark, 0.6, 1.5, -D / 2 + 0.14));
  const bulbBox = rbox(0.18, 0.1, 0.14, 0.01, mat(0x6a5a44, { roughness: 0.8 }), 0.4, 1.565, -D / 2 + 0.14);
  scene.add(bulbBox);
  const flashBulb = new THREE.Group();
  flashBulb.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), new THREE.MeshStandardMaterial({ color: 0xdfe6f0, roughness: 0.05, transparent: true, opacity: 0.8 })));
  flashBulb.add(cyl(0.012, 0.012, 0.02, mat(0x9a9a98, { metalness: 0.9 }), 0, -0.03, 0, 10));
  flashBulb.position.set(tX + 0.3, tY + 0.05, tZ - 0.1);
  flashBulb.visible = !!g.flag('f.talked') && !g.flag('f.flashbulb');
  scene.add(flashBulb);
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, -1.1, 1.025, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hGiulio = hitBox(0.7, 1.6, 0.7, tX, 0.8, tZ + 0.5, 'giulio');
  const hTable = hitBox(1.05, 0.3, 0.7, tX, tY - 0.05, tZ, 'table');
  const hBulb = hitBox(0.22, 0.2, 0.22, tX + 0.3, tY + 0.05, tZ - 0.1, 'flashbulb');
  const hEasel = hitBox(0.75, 1.0, 0.4, eX, 1.0, eZ, 'self');
  const hShelf = hitBox(0.95, 0.3, 0.3, 0.6, 1.55, -D / 2 + 0.15, 'shelf');
  const hOut = hitBox(0.9, 2.0, 0.2, -1.1, 1.0, D / 2 - 0.1, 'out');
  scene.add(hGiulio, hTable, hBulb, hEasel, hShelf, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'giulio', obj: hGiulio, view: 'table', get lowPriority() { return flashBulb.visible; }, when: () => !gone(), tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('f.talked')) {
        g.set('f.talked');
        await g.scare('barber', 550);
        await g.say([
          { who: 'giulio', key: 'foto.giulio1' },
          { who: 'giulio', key: 'foto.giulio2' },
          { who: 'diego', key: 'foto.giulio3' },
          { who: 'giulio', key: 'foto.giulio4' },
          { who: 'giulio', key: 'foto.giulio5' },
          { who: 'giulio', key: 'foto.giulio6' },
        ]);
        flashBulb.visible = true;
        g.audio.sfx('glass');
        return say('foto.bulbOnTable');
      }
      return g.say([{ who: 'giulio', key: g.has('flashbulb') ? 'foto.giulio8' : 'foto.giulio7' }]);
    } },
    { id: 'flashbulb', obj: hBulb, view: 'table', when: () => flashBulb.visible, tap: async (item) => {
      if (item) return g.nope();
      flashBulb.visible = false;
      g.set('f.flashbulb');
      g.give('flashbulb');
      return say('foto.bulbTaken');
    } },
    { id: 'table', obj: hTable, view: 'table', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.table');
    } },
    { id: 'self', obj: hEasel, view: 'easel', tap: async (item) => {
      if (item) return g.nope();
      return say(gone() ? 'foto.selfAfter' : 'foto.self');
    } },
    { id: 'shelf', obj: hShelf, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.shelf');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(8, 0.4, false);
      return g.go('foto_negozio');
    } },
  ];

  return {
    id: 'foto_casa',
    nameKey: 'place.fotoCasa',
    next: ['foto_negozio'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'foto_negozio',
    views: {
      main: { pos: [0.6, 1.6, 1.4], look: [-0.3, 1.0, -1.1], yaw: 60, pitch: 18 },
      table: { pos: [tX + 0.35, 1.45, tZ + 1.35], look: [tX, 0.95, tZ + 0.2], parent: 'main', yaw: 20, pitch: 12 },
      easel: { pos: [eX - 0.2, 1.3, eZ + 1.2], look: [eX, 1.07, eZ], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      if (!gone()) {
        giulio.update(dt, time, g.engine.camera);
        giulio.setOpacity(0.28 + Math.sin(time * 0.7) * 0.08);
      }
      lampL.intensity = 2.0 + Math.sin(time * 13) * 0.1;
    },
    enter: async () => {
      if (!g.flag('f.flatEntered')) {
        g.set('f.flatEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.flat1' }, { who: 'diego', key: 'foto.flat2' }]);
      }
    },
    hint: () => {
      if (gone() || g.has('camera')) return 'hint.foto.leave';
      if (!g.flag('f.talked')) return 'hint.foto.talk';
      if (!g.flag('f.flashbulb')) return 'hint.foto.takeBulb';
      return 'hint.foto.portrait';
    },
  };
}
