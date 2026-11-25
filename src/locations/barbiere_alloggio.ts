import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot } from '../game';
import { room, mat, mesh, rbox, cyl, lathe, sphere, textPlane, hitBox, canvasTex, noise, woodMaterial, dust, framed } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { wallpaper } from './ada_common';

/**
 * Aldo's lodging, over the shop. An iron bed, a washstand whose mirror is covered with a cloth,
 * and on the wall a row of portraits of Aldo, one a year: each one younger than the last.
 * His letter says where he hid the crank. The padlock key is in the piggy bank: shake it out.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/**
 * The portraits: he ages like anyone from 1951 to 1973. Then the razor (October 1974) and,
 * month after month, he gets younger, until the chair is empty. key = file name, age 0 young .. 1 old.
 */
const PORTRAITS: { key: string; label: string; age: number }[] = [
  { key: 'aldo_1951', label: '1951', age: 0.1 },
  { key: 'aldo_1962', label: '1962', age: 0.45 },
  { key: 'aldo_1973', label: '1973', age: 0.95 },
  { key: 'aldo_1974_10', label: 'X · 1974', age: 0.55 },
  { key: 'aldo_1974_11', label: 'XI · 1974', age: 0.05 },
  { key: 'aldo_1974_12', label: 'XII · 1974', age: -1 },
];

export function createBarbiereAlloggio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.8, H = 2.5, D = 3.6;
  const woodDark = woodMaterial({ base: '#2d2218' });
  const woodMid = woodMaterial({ base: '#4f3d2b' });
  const iron = new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.5, metalness: 0.8 });
  scene.add(room(W, H, D, {
    wall: wallpaper('#8f887a', [2.2, 1.1]),
    floor: woodMaterial({ base: '#3a2d21', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#26201a', repeat: [2, 2], plank: true }),
  }));

  // light: an oil lamp on the table and the rain-grey window
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const oil = new THREE.PointLight(0xffd9a0, 2.2, 4.5, 1.6);
  oil.position.set(0.9, 1.15, -1.1);
  scene.add(oil);
  const win = new THREE.SpotLight(0xa9b8c6, 5, 6, 0.6, 0.8, 1.3);
  win.position.set(W / 2 + 0.2, 1.8, 0.4);
  win.target.position.set(-0.5, 0.4, 0.2);
  scene.add(win, win.target);
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ color: 0x1d2329 }), W / 2 - 0.012, 1.55, 0.4, false).rotateY(-Math.PI / 2));
  const motes = dust([-1.8, 0.2, -1.7], [1.8, 2.3, 1.7], 120);
  scene.add(motes.points);

  // ---------------- the iron bed (left), made with military care ----------------
  const bed = new THREE.Group();
  for (const z of [-0.95, 0.95]) {
    for (const x of [-0.45, 0.45]) bed.add(cyl(0.018, 0.018, z < 0 ? 1.05 : 0.75, iron, x, z < 0 ? 0.525 : 0.375, z, 8));
    bed.add(cyl(0.015, 0.015, 0.9, iron, 0, z < 0 ? 1.0 : 0.7, z, 6).rotateZ(Math.PI / 2));
    for (let i = -3; i <= 3; i++) bed.add(cyl(0.008, 0.008, z < 0 ? 0.5 : 0.3, iron, i * 0.12, z < 0 ? 0.75 : 0.55, z, 5));
  }
  const blanketTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#4a4740';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c2a25';
    c.fillRect(0, 18, w, 6);
    c.fillRect(0, h - 24, w, 6);
    noise(c, w, h, 2000, 0.15);
  });
  bed.add(rbox(0.9, 0.18, 1.85, 0.03, new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 1 }), 0, 0.45, 0));
  bed.add(rbox(0.55, 0.1, 0.3, 0.04, mat(0xd6d0c4, { roughness: 1 }), 0, 0.58, -0.72));
  bed.position.set(-W / 2 + 0.6, 0, -0.4);
  scene.add(bed);

  // ---------------- the washstand and the covered mirror (back wall) ----------------
  const wsX = -0.25;
  scene.add(rbox(0.7, 0.8, 0.45, 0.02, woodDark, wsX, 0.4, -D / 2 + 0.25));
  scene.add(lathe([[0, 0], [0.2, 0.01], [0.24, 0.09], [0.22, 0.1], [0, 0.02]], mat(0xd8d4cb, { roughness: 0.2 }), wsX, 0.8, -D / 2 + 0.25, 20));
  scene.add(lathe([[0, 0], [0.07, 0], [0.08, 0.12], [0.05, 0.2], [0.07, 0.26], [0, 0.26]], mat(0xd8d4cb, { roughness: 0.2 }), wsX + 0.22, 0.8, -D / 2 + 0.2, 16));
  const mirrorY = 1.55;
  scene.add(rbox(0.55, 0.7, 0.03, 0.01, woodDark, wsX, mirrorY, -D / 2 + 0.02));
  const glass = mesh(new THREE.PlaneGeometry(0.47, 0.62), new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.05, metalness: 0.9 }), wsX, mirrorY, -D / 2 + 0.04, false);
  scene.add(glass);
  // the cloth over it, nailed at the top
  const clothGeo = new THREE.PlaneGeometry(0.62, 0.8, 8, 8);
  const cp = clothGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 20) * 0.012 + (0.4 - cp.getY(i)) * 0.03);
  clothGeo.computeVertexNormals();
  const cloth = mesh(clothGeo, new THREE.MeshStandardMaterial({ color: 0x3c3934, roughness: 1, side: THREE.DoubleSide }), wsX, mirrorY - 0.03, -D / 2 + 0.07, false);
  scene.add(cloth);
  const clothFallen = () => !!g.flag('al.cloth');
  if (clothFallen()) {
    cloth.position.y = 0.88;
    cloth.rotation.x = -1.4;
  }

  // ---------------- the portraits: Aldo, one a year, getting younger ----------------
  const frameM = woodMaterial({ base: '#1e1712' });
  const portraits: THREE.Object3D[] = [];
  PORTRAITS.forEach(({ key, label, age: pAge }, i) => {
    const k = 1 - Math.max(0, pAge);
    const year = label;
    const empty = pAge < 0;
    const drawn = (c: CanvasRenderingContext2D, w: number, h: number) => {
      c.fillStyle = '#bdb6a6';
      c.fillRect(0, 0, w, h);
      noise(c, w, h, 1800, 0.12);
      if (empty) {
        // the last one: the chair is empty
        c.fillStyle = '#3a352e';
        c.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.08);
        c.fillRect(w * 0.32, h * 0.25, w * 0.06, h * 0.35);
        c.fillRect(w * 0.62, h * 0.25, w * 0.06, h * 0.35);
      } else {
        // a head and shoulders; the wrinkles and the grey go away year by year
        const age = 1 - k;
        c.fillStyle = '#2b2722';
        c.beginPath();
        c.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.3, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = '#8c8578';
        c.beginPath();
        c.ellipse(w / 2, h * 0.42, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = `rgb(${40 + age * 150},${36 + age * 145},${32 + age * 140})`; // hair: grey to black
        c.beginPath();
        c.ellipse(w / 2, h * 0.3, w * 0.2, h * 0.1, 0, Math.PI, 0);
        c.fill();
        c.strokeStyle = 'rgba(40,35,30,0.7)';
        c.lineWidth = 1.5;
        for (let l = 0; l < Math.round(age * 5); l++) {
          c.beginPath();
          c.moveTo(w * 0.38, h * (0.33 + l * 0.025));
          c.lineTo(w * 0.62, h * (0.33 + l * 0.025));
          c.stroke();
        }
        c.fillStyle = '#141210';
        c.fillRect(w * 0.42, h * 0.4, w * 0.04, h * 0.02);
        c.fillRect(w * 0.54, h * 0.4, w * 0.04, h * 0.02);
        c.fillRect(w * 0.45, h * 0.52, w * 0.1, h * 0.015);
      }
      c.fillStyle = '#2a251f';
      c.font = 'bold 22px Georgia, serif';
      c.textAlign = 'center';
      c.fillText(String(year), w / 2, h - 10);
    };
    const p = framed(0.26, 0.34, oldPhoto(key, 260, 340, drawn, {
      age: 0.4 + (1 - k) * 0.4,
      after: (c, x0, y0, w, h) => {
        c.fillStyle = 'rgba(30,24,18,0.85)';
        c.font = 'italic 18px Georgia, serif';
        c.textAlign = 'center';
        c.fillText(String(year), x0 + w / 2, y0 + h - 8);
      },
    }), frameM);
    p.position.set(W / 2 - 0.02, 1.85, -1.45 + i * 0.36);
    void year;
    p.rotation.y = -Math.PI / 2;
    if (i % 2) p.rotation.z = 0.04;
    scene.add(p);
    portraits.push(p);
  });

  // ---------------- table with the oil lamp, his letter, the piggy bank ----------------
  const tX = 0.9, tZ = -1.15, tY = 0.76;
  scene.add(rbox(0.9, 0.04, 0.6, 0.01, woodMid, tX, tY, tZ));
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) scene.add(rbox(0.04, tY, 0.04, 0.005, woodMid, tX + dx, tY / 2, tZ + dz));
  scene.add(lathe([[0, 0], [0.06, 0], [0.07, 0.06], [0.03, 0.08], [0.035, 0.1], [0.045, 0.2], [0.02, 0.26], [0, 0.26]], mat(0x8a8070, { roughness: 0.3, transparent: true, opacity: 0.85 }), tX + 0.25, tY + 0.02, tZ - 0.12, 14));
  const letter = textPlane([t('aldo.letterMark')], 0.16, 0.21, { bg: '#ddd5c2', size: 16, px: 128 });
  letter.rotation.x = -Math.PI / 2;
  letter.rotation.z = 0.2;
  letter.position.set(tX - 0.2, tY + 0.022, tZ + 0.05);
  scene.add(letter);
  // the piggy bank: glazed terracotta
  const pig = new THREE.Group();
  const pigM = new THREE.MeshStandardMaterial({ color: 0x9c8a80, roughness: 0.25 });
  const body = sphere(0.075, pigM, 0, 0.075, 0, 16);
  body.scale.set(1.3, 0.95, 0.95);
  pig.add(body);
  pig.add(cyl(0.028, 0.03, 0.04, pigM, 0.1, 0.075, 0, 12).rotateZ(Math.PI / 2));
  for (const s of [-1, 1]) {
    pig.add(mesh(new THREE.ConeGeometry(0.02, 0.04, 6), pigM, 0.06, 0.15, s * 0.035));
    for (const fx of [-0.05, 0.05]) pig.add(cyl(0.015, 0.012, 0.03, pigM, fx, 0.012, s * 0.04, 8));
  }
  pig.add(rbox(0.04, 0.004, 0.006, 0.001, mat(0x111111), -0.01, 0.146, 0));
  pig.position.set(tX + 0.05, tY + 0.02, tZ - 0.05);
  pig.rotation.y = -0.6;
  const pigBroken = () => !!g.flag('al.key');
  scene.add(pig);
  const padKey = new THREE.Group();
  padKey.add(cyl(0.004, 0.004, 0.05, mat(0x6b5c3a, { metalness: 0.8, roughness: 0.4 }), 0, 0, 0, 6).rotateZ(Math.PI / 2));
  padKey.add(mesh(new THREE.TorusGeometry(0.01, 0.003, 6, 10), mat(0x6b5c3a, { metalness: 0.8, roughness: 0.4 }), -0.03, 0, 0).rotateX(Math.PI / 2));
  // a paper tag tied to it, so it shows on the dark wood
  const tag = textPlane([''], 0.035, 0.022, { bg: '#e6dfcf', size: 14, px: 32 });
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(0.045, 0.002, 0.01);
  padKey.add(tag);
  padKey.scale.setScalar(1.8);
  padKey.position.set(tX - 0.12, tY + 0.025, tZ - 0.12);
  padKey.visible = pigBroken() && !g.has('padkey') && !g.flag('y.padlock');
  scene.add(padKey);
  const chair = prop('woodChair', { height: 0.9 });
  if (chair) {
    chair.position.set(tX, 0, tZ + 0.55);
    chair.rotation.y = Math.PI + 0.3;
    scene.add(chair);
  }

  // ---------------- the wardrobe (right corner, front) ----------------
  const wd = new THREE.Group();
  wd.add(rbox(0.9, 2.0, 0.55, 0.02, woodDark, 0, 1.0, 0));
  const wDoor = new THREE.Group();
  wDoor.position.set(-0.44, 0, 0.28);
  wDoor.add(rbox(0.44, 1.9, 0.03, 0.01, woodMid, 0.22, 1.0, 0));
  wd.add(wDoor);
  wd.add(rbox(0.44, 1.9, 0.03, 0.01, woodMid, 0.22, 1.0, 0.28));
  // inside: his white barber's coats, all in a row, one far too small
  for (let i = 0; i < 4; i++) wd.add(rbox(0.04, 0.95 - i * 0.12, 0.38, 0.02, mat(0xd8d4cb, { roughness: 1 }), -0.3 + i * 0.12, 1.75 - (0.95 - i * 0.12) / 2, 0));
  wd.position.set(W / 2 - 0.5, 0, 1.25);
  wd.rotation.y = -Math.PI / 2;
  scene.add(wd);
  if (g.flag('al.wardrobe')) wDoor.rotation.y = -1.6;

  // the door out, front wall, left
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 1.95), new THREE.MeshBasicMaterial({ color: 0x050607 }), -1.1, 0.975, D / 2 - 0.012, false).rotateY(Math.PI));

  // ---------------- hotspots ----------------
  const hPig = hitBox(0.25, 0.22, 0.22, tX + 0.05, tY + 0.1, tZ - 0.05, 'pig');
  const hKey = hitBox(0.12, 0.08, 0.12, tX - 0.12, tY + 0.04, tZ - 0.12, 'padkey');
  const hLetter = hitBox(0.22, 0.06, 0.26, tX - 0.2, tY + 0.03, tZ + 0.05, 'letter');
  const hTable = hitBox(0.95, 0.3, 0.65, tX, tY - 0.1, tZ, 'table');
  const hMirror = hitBox(0.7, 0.85, 0.15, wsX, mirrorY, -D / 2 + 0.08, 'mirror');
  const hWash = hitBox(0.75, 0.9, 0.5, wsX, 0.5, -D / 2 + 0.25, 'washstand');
  const hPortraits = hitBox(0.2, 0.5, 2.2, W / 2 - 0.08, 1.85, -0.55, 'portraits');
  const hBed = hitBox(1.0, 0.8, 2.0, -W / 2 + 0.6, 0.4, -0.4, 'bed');
  const hWard = hitBox(0.6, 2.0, 0.95, W / 2 - 0.5, 1.0, 1.25, 'wardrobe');
  const hOut = hitBox(0.9, 2.0, 0.2, -1.1, 1.0, D / 2 - 0.1, 'out');
  scene.add(hPig, hKey, hLetter, hTable, hMirror, hWash, hPortraits, hBed, hWard, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'pig', obj: hPig, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      if (pigBroken()) return say('aldo.pigEmpty');
      await say('aldo.pig');
      const ok = await g.physical('shake', 'aldo.shakeText');
      if (!ok) return;
      g.set('al.key');
      for (let i = 0; i < 12; i++) {
        pig.rotation.z = Math.sin(i * 1.9) * 0.25;
        pig.position.x = tX + 0.05 + Math.sin(i * 2.3) * 0.01;
        await sleep(40);
      }
      pig.rotation.z = 0;
      g.audio.sfx('glass');
      padKey.visible = true;
      await say('aldo.keyOut');
      // and behind you, the cloth on the mirror slides down
      if (!clothFallen()) {
        await sleep(600);
        g.audio.sfx('sheet');
        g.set('al.cloth');
        await g.view('mirror');
        for (let i = 0; i <= 18; i++) {
          cloth.position.y = mirrorY - 0.03 - (i / 18) * (mirrorY - 0.91);
          cloth.rotation.x = -(i / 18) * 1.4;
          await sleep(30);
        }
        await sleep(500);
        await g.scare('barber', 650);
        await say('aldo.mirror');
      }
    } },
    { id: 'padkey', obj: hKey, view: 'table', when: () => padKey.visible, tap: async (item) => {
      if (item) return g.nope();
      padKey.visible = false;
      g.give('padkey');
      return say('aldo.keyTaken');
    } },
    { id: 'letter', obj: hLetter, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('aldo.letterTitle'), t('aldo.letter'), true);
      g.note('note.well');
    } },
    { id: 'table', obj: hTable, view: 'table', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('aldo.table');
    } },
    { id: 'mirror', obj: hMirror, view: 'mirror', tap: async (item) => {
      if (item) return g.nope();
      return say(clothFallen() ? 'aldo.mirrorAfter' : 'aldo.cloth');
    } },
    { id: 'washstand', obj: hWash, view: 'mirror', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('aldo.wash');
    } },
    { id: 'portraits', obj: hPortraits, view: 'portraits', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('al.portraits')) {
        g.set('al.portraits');
        return g.say([{ who: 'diego', key: 'aldo.portraits1' }, { who: 'diego', key: 'aldo.portraits2' }]);
      }
      return say('aldo.portraits3');
    } },
    { id: 'bed', obj: hBed, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('aldo.bed');
    } },
    { id: 'wardrobe', obj: hWard, tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('al.wardrobe')) {
        g.set('al.wardrobe');
        g.audio.sfx('creak');
        for (let i = 0; i <= 15; i++) {
          wDoor.rotation.y = -(i / 15) * 1.6;
          await sleep(30);
        }
      }
      return say('aldo.wardrobe');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  return {
    id: 'barbiere_alloggio',
    nameKey: 'place.barbiereAlloggio',
    next: ['barbiere_cortile'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'barbiere_cortile',
    views: {
      main: { pos: [-0.8, 1.6, 1.4], look: [0.6, 1.0, -1.1], yaw: 60, pitch: 18 },
      table: { pos: [tX - 0.1, 1.35, tZ + 0.65], look: [tX, tY, tZ - 0.05], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      mirror: { pos: [wsX + 0.1, 1.5, -0.4], look: [wsX, 1.35, -D / 2], parent: 'main', yaw: 15, pitch: 10, fov: 58 },
      portraits: { pos: [0.2, 1.75, -0.55], look: [W / 2, 1.8, -0.55], parent: 'main', yaw: 25, pitch: 10, fov: 60 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      oil.intensity = 2.2 + Math.sin(time * 13) * 0.12 + Math.sin(time * 7.3) * 0.1;
      void portraits;
    },
    enter: async () => {
      if (!g.flag('al.entered')) {
        g.set('al.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'aldo.enter1' }, { who: 'diego', key: 'aldo.enter2' }]);
      }
    },
    hint: () => {
      if (g.has('padkey') || g.flag('y.padlock')) return 'hint.aldo.leave';
      if (padKey.visible) return 'hint.aldo.take';
      if (!g.save.notebook.includes('note.well')) return 'hint.aldo.letter';
      return 'hint.aldo.pig';
    },
    debug: { pig, padKey },
  };
}
