import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, mat, framed, cyl } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { wallpaper } from './ada_common';
import { radioHint } from './radio_negozio';
import { sleep } from './radio_common';

/**
 * Paolo's room, closed since the telegram of March 1973. His radio-ham notebook (the Morse
 * table, and «fine trasmissione»), his portrait in uniform with a black ribbon, the boy with the
 * model plane, the telegram on the bed. The dormer window opens on the roof terrace and the antenna.
 */
export function createRadioCamera(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.6, H = 2.4, D = 3.4;
  const woodDark = woodMaterial({ base: '#2d2218' });
  const woodMid = woodMaterial({ base: '#55422f' });
  scene.add(room(W, H, D, {
    wall: wallpaper('#8e897e', [2.2, 1.1]),
    floor: woodMaterial({ base: '#3a2d21', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#26201a', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const desk = new THREE.PointLight(0xffd9a0, g.flag('rl.power') ? 1.8 : 0.4, 4, 1.6);
  desk.position.set(-1.0, 1.3, -1.0);
  scene.add(desk);
  // the dormer window (right wall): moonlight
  const winZ = 0.5;
  const moon = new THREE.SpotLight(0xa9b8c6, 5, 6, 0.6, 0.8, 1.3);
  moon.position.set(W / 2 + 0.3, 1.9, winZ);
  moon.target.position.set(-0.5, 0.3, 0);
  scene.add(moon, moon.target);
  const winOpen = () => !!g.flag('rl.window');
  scene.add(mesh(new THREE.PlaneGeometry(0.75, 1.1), new THREE.MeshBasicMaterial({ color: 0x1b2128 }), W / 2 - 0.012, 1.4, winZ, false).rotateY(-Math.PI / 2));
  const sash = new THREE.Group();
  sash.position.set(W / 2 - 0.03, 1.4, winZ - 0.37);
  const frameM = woodMaterial({ base: '#cfc8b8' });
  sash.add(rbox(0.04, 1.1, 0.04, 0.005, frameM, 0, 0, 0.0));
  sash.add(rbox(0.04, 1.1, 0.04, 0.005, frameM, 0, 0, 0.72));
  sash.add(rbox(0.04, 0.04, 0.76, 0.005, frameM, 0, 0.53, 0.36));
  sash.add(rbox(0.04, 0.04, 0.76, 0.005, frameM, 0, -0.53, 0.36));
  sash.add(rbox(0.03, 1.1, 0.03, 0.005, frameM, 0, 0, 0.36));
  sash.add(mesh(new THREE.PlaneGeometry(0.72, 1.06), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.1 }), 0, 0, 0.36, false).rotateY(-Math.PI / 2));
  if (winOpen()) sash.rotation.y = -1.4;
  scene.add(sash);
  const motes = dust([-1.7, 0.2, -1.6], [1.7, 2.2, 1.6], 120);
  scene.add(motes.points);

  // ---------------- bed, the telegram on it ----------------
  scene.add(rbox(0.95, 0.45, 1.9, 0.03, woodDark, -W / 2 + 0.55, 0.225, 0.6));
  scene.add(rbox(0.9, 0.1, 1.8, 0.04, mat(0x9a948a, { roughness: 1 }), -W / 2 + 0.55, 0.5, 0.6));
  const tele = textPlane([t('radio.telegramShort')], 0.2, 0.14, { bg: '#e8e2d4', size: 16, px: 96 });
  tele.rotation.set(-Math.PI / 2, 0, 0.3);
  tele.position.set(-W / 2 + 0.6, 0.56, 0.9);
  scene.add(tele);

  // ---------------- the desk: notebook, model plane, Morse key ----------------
  const dX = -1.0, dZ = -D / 2 + 0.35, dY = 0.75;
  scene.add(rbox(1.1, 0.04, 0.55, 0.01, woodMid, dX, dY, dZ));
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) scene.add(rbox(0.04, dY, 0.04, 0.005, woodMid, dX + x, dY / 2, dZ + z));
  const nb = new THREE.Group();
  nb.add(rbox(0.22, 0.02, 0.3, 0.004, mat(0x2a3a2a, { roughness: 0.8 }), 0, 0.01, 0));
  nb.add(textPlane([t('radio.notebookCover')], 0.18, 0.12, { bg: '#d9d3c4', size: 20, px: 96 }).rotateX(-Math.PI / 2).translateZ(0.021));
  nb.position.set(dX - 0.2, dY + 0.02, dZ + 0.05);
  nb.rotation.y = 0.2;
  scene.add(nb);
  // the model plane
  const plane = new THREE.Group();
  const pm = mat(0xcfc8b8, { roughness: 0.6 });
  plane.add(cyl(0.02, 0.012, 0.3, pm, 0, 0, 0, 10).rotateX(Math.PI / 2));
  plane.add(rbox(0.36, 0.008, 0.07, 0.003, pm, 0, 0, 0.02));
  plane.add(rbox(0.12, 0.006, 0.04, 0.002, pm, 0, 0, -0.13));
  plane.add(rbox(0.006, 0.06, 0.04, 0.002, pm, 0, 0.03, -0.13));
  plane.position.set(dX + 0.25, dY + 0.1, dZ);
  plane.rotation.y = -0.6;
  scene.add(plane);
  // his portrait in uniform, with the black ribbon
  const pTex = oldPhoto('radio_paolo', 240, 320, (c, w, h) => {
    c.fillStyle = '#8a857a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.3, border: false, after: (c, x0, y0, w) => {
    c.fillStyle = '#050505';
    c.beginPath();
    c.moveTo(x0 + w - 60, y0);
    c.lineTo(x0 + w, y0);
    c.lineTo(x0 + w, y0 + 60);
    c.closePath();
    c.fill();
  } });
  const portrait = framed(0.24, 0.32, pTex, woodMaterial({ base: '#1c1510' }));
  portrait.position.set(dX + 0.05, dY + 0.2, dZ - 0.2);
  portrait.rotation.x = -0.12;
  scene.add(portrait);
  // the boy with the plane, on the wall
  const kTex = oldPhoto('radio_paolo_bambino', 240, 320, (c, w, h) => {
    c.fillStyle = '#8a857a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.5, border: true });
  const kid = framed(0.26, 0.34, kTex, woodMaterial({ base: '#1c1510' }));
  kid.position.set(0.3, 1.6, -D / 2 + 0.03);
  scene.add(kid);
  // a pennant and a QSL card wall
  for (let i = 0; i < 6; i++) {
    const q = textPlane(['QSL', 'I1' + ['PSR', 'ABC', 'XYZ', 'RTV', 'MNO', 'KLB'][i]], 0.14, 0.09, { bg: i % 2 ? '#e0d8c4' : '#cfc6b0', size: 18, px: 64 });
    q.position.set(0.9 + (i % 3) * 0.17, 1.75 - Math.floor(i / 3) * 0.12, -D / 2 + 0.02);
    q.rotation.z = (i % 3 - 1) * 0.08;
    scene.add(q);
  }

  // ---------------- hotspots ----------------
  const hNb = hitBox(0.3, 0.1, 0.36, dX - 0.2, dY + 0.04, dZ + 0.05, 'notebook');
  const hPortrait = hitBox(0.28, 0.36, 0.1, dX + 0.05, dY + 0.2, dZ - 0.2, 'portrait');
  const hPlane = hitBox(0.38, 0.12, 0.3, dX + 0.25, dY + 0.1, dZ, 'plane');
  const hKid = hitBox(0.3, 0.38, 0.1, 0.3, 1.6, -D / 2 + 0.06, 'kid');
  const hQsl = hitBox(0.55, 0.3, 0.1, 1.07, 1.7, -D / 2 + 0.06, 'qsl');
  const hTele = hitBox(0.3, 0.1, 0.25, -W / 2 + 0.6, 0.58, 0.9, 'telegram');
  const hBed = hitBox(1.0, 0.6, 1.9, -W / 2 + 0.55, 0.3, 0.6, 'bed');
  const hWin = hitBox(0.3, 1.2, 0.85, W / 2 - 0.15, 1.4, winZ, 'window');
  const hOut = hitBox(1.0, 2.1, 0.2, 0.6, 1.05, D / 2 - 0.1, 'out');
  scene.add(hNb, hPortrait, hPlane, hKid, hQsl, hTele, hBed, hWin, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'notebook', obj: hNb, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('radio.notebookTitle'), t('radio.notebook'), true);
      if (!g.flag('rl.morse')) {
        g.set('rl.morse');
        g.note('note.morse');
        g.note('note.sk');
        await g.say([{ who: 'diego', key: 'radio.notebookAfter' }]);
      }
    } },
    { id: 'portrait', obj: hPortrait, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      return g.say([{ who: 'diego', key: 'radio.portrait1' }, { who: 'diego', key: 'radio.portrait2' }]);
    } },
    { id: 'plane', obj: hPlane, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.plane');
    } },
    { id: 'kid', obj: hKid, view: 'wall', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.kid');
    } },
    { id: 'qsl', obj: hQsl, view: 'wall', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.qsl');
    } },
    { id: 'telegram', obj: hTele, view: 'bed', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('radio.telegramTitle'), t('radio.telegram'));
      if (!g.flag('rl.telegram')) {
        g.set('rl.telegram');
        await say('radio.telegramAfter');
      }
    } },
    { id: 'bed', obj: hBed, view: 'bed', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('radio.bed');
    } },
    { id: 'window', obj: hWin, view: 'window', tap: async (item) => {
      if (item) return g.nope();
      if (!winOpen()) {
        g.set('rl.window');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          sash.rotation.y = -(i / 20) * 1.4;
          await sleep(25);
        }
        await say('radio.windowOpen');
        return;
      }
      g.audio.steps(3, 0.45, false);
      return g.go('radio_terrazzo');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(8, 0.4, false);
      return g.go('radio_negozio');
    } },
  ];

  return {
    id: 'radio_camera',
    nameKey: 'place.radioCamera',
    next: ['radio_negozio', 'radio_terrazzo'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'radio_negozio',
    views: {
      main: { pos: [0.4, 1.6, 1.3], look: [-0.4, 1.1, -1.4], yaw: 65, pitch: 18 },
      desk: { pos: [dX + 0.1, 1.45, dZ + 0.75], look: [dX, dY + 0.05, dZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      wall: { pos: [0.6, 1.6, 0.2], look: [0.6, 1.6, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      bed: { pos: [-0.3, 1.5, 1.3], look: [-W / 2 + 0.6, 0.5, 0.8], parent: 'main', yaw: 20, pitch: 12 },
      window: { pos: [0.4, 1.5, winZ], look: [W / 2, 1.4, winZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('rl.roomEntered')) {
        g.set('rl.roomEntered');
        await sleep(300);
        g.audio.sfx('whisper');
        await g.say([{ who: 'diego', key: 'radio.roomEnter1' }, { who: 'diego', key: 'radio.roomEnter2' }]);
      }
    },
    hint: () => radioHint(g),
  };
}
