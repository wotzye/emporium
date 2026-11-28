import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, lightCone, woodMaterial, tileMaterial, plasterMaterial, mat, framed, cyl } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { fotoWall, villagerPortrait, sleep } from './foto_common';

/**
 * L'Ultimo Scatto — the shop. A wall of perfect portraits of the people of Rocca: the people
 * who, one by one, have stopped being seen around. The register's last line: «14/12 — G. Ferri —
 * autoritratto, lastra 31». A curtain to the studio, a door to the archive, the stairs to the flat
 * (locked: the key is in the archive, drawer 31).
 */
export const SITTERS = ['Il sindaco', 'Rina, la fornaia', 'La piccola Lucia', 'Bepi, il fabbro', 'Nonna Tilde', 'Tonino Conti', 'Maria Rinaldi', 'Il vecchio Gusto'];

export function createFotoNegozio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);
  scene.userData.envIntensity = 0.1;
  const W = 5, H = 3, D = 4.2;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#5a4430' });
  scene.add(room(W, H, D, {
    wall: fotoWall(),
    floor: tileMaterial({ a: '#a39c8c', b: '#2f2c28', n: 9, repeat: [3, 3], grime: 0.5 }),
    ceil: plasterMaterial({ base: '#3e3a35', repeat: [2, 2], damp: 1 }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.07));
  const lamp = bulb(0, 2.55, -0.4, 9, 1.2, 8);
  scene.add(lamp.group);
  scene.add(lightCone(0, 2.53, -0.4, 2.5, 1.3, 0.025));
  const win = new THREE.SpotLight(0xc4ccd4, 5, 7, 0.7, 0.8, 1.2);
  win.position.set(0, 2.2, D / 2 + 0.4);
  win.target.position.set(0, 0.6, -1);
  scene.add(win, win.target);
  const motes = dust([-2.3, 0.2, -2], [2.3, 2.7, 2], 140);
  scene.add(motes.points);

  // ---------------- the wall of portraits (back wall) ----------------
  const frameM = woodMaterial({ base: '#1c1510' });
  SITTERS.forEach((name, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const p = framed(0.42, 0.52, oldPhoto(`foto_ritratto_${i + 1}`, 336, 416, (c, w, h) => villagerPortrait(c, w, h, i + 1, name), { age: 0.15, after: (c, x0, y0, w, h) => {
      c.fillStyle = 'rgba(232,226,214,0.85)';
      c.fillRect(x0, y0 + h - 34, w, 34);
      c.fillStyle = '#2a2620';
      c.font = "20px 'American Typewriter', 'Courier New', monospace";
      c.textAlign = 'center';
      c.fillText(name, x0 + w / 2, y0 + h - 11);
    } }), frameM);
    p.position.set(-1.75 + col * 0.82, 1.95 - row * 0.68, -D / 2 + 0.03);
    p.rotation.z = (i % 3 - 1) * 0.015;
    scene.add(p);
  });
  // the big sign over them
  const sign = textPlane([t('foto.signShop')], 2.4, 0.28, { bg: '#1e1a16', fg: '#d9cfb6', size: 34, px: 96 });
  sign.position.set(-0.52, 2.66, -D / 2 + 0.02);
  scene.add(sign);

  // ---------------- counter, the register, the cash box ----------------
  scene.add(rbox(2.4, 0.95, 0.6, 0.02, woodMid, -0.2, 0.475, -0.75));
  scene.add(rbox(2.5, 0.04, 0.66, 0.01, woodDark, -0.2, 0.97, -0.75));
  const book = new THREE.Group();
  book.add(rbox(0.36, 0.03, 0.26, 0.005, mat(0x3a2418, { roughness: 0.7 }), 0, 0.015, 0));
  const pages = textPlane([t('foto.registerCover')], 0.34, 0.24, { bg: '#e6dfcf', size: 18, px: 128 });
  pages.rotation.x = -Math.PI / 2;
  pages.position.y = 0.032;
  book.add(pages);
  book.position.set(-0.4, 0.99, -0.7);
  book.rotation.y = 0.15;
  scene.add(book);
  // a glass case of cameras on the counter
  for (let i = 0; i < 3; i++) {
    const cam = new THREE.Group();
    cam.add(rbox(0.14, 0.09, 0.08, 0.01, mat(0x161412, { roughness: 0.4 }), 0, 0.045, 0));
    cam.add(cyl(0.03, 0.03, 0.05, mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 }), 0, 0.045, 0.05, 14).rotateX(Math.PI / 2));
    cam.position.set(0.45 + i * 0.22, 0.99, -0.8);
    cam.rotation.y = -0.3 + i * 0.2;
    scene.add(cam);
  }
  scene.add(mesh(new THREE.BoxGeometry(0.8, 0.22, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.1 }), 0.67, 1.1, -0.78, false));

  // ---------------- the curtain to the studio (left wall) ----------------
  const curtainZ = 0.3;
  const curG = new THREE.PlaneGeometry(1.0, 2.2, 10, 4);
  {
    const p = curG.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.04);
    curG.computeVertexNormals();
  }
  const curtain = mesh(curG, new THREE.MeshStandardMaterial({ color: 0x2e1416, roughness: 1, side: THREE.DoubleSide }), -W / 2 + 0.05, 1.1, curtainZ, false);
  curtain.rotation.y = Math.PI / 2;
  scene.add(curtain);
  const plaque = textPlane([t('foto.studioSign')], 0.5, 0.12, { bg: '#d9cfb6', size: 22, px: 64 });
  plaque.position.set(-W / 2 + 0.02, 2.35, curtainZ);
  plaque.rotation.y = Math.PI / 2;
  scene.add(plaque);

  // ---------------- the archive door (right wall) and the stairs door (back right) ----------------
  const archZ = 0.6;
  scene.add(rbox(0.06, 2.05, 0.9, 0.01, woodDark, W / 2 - 0.03, 1.025, archZ));
  const archSign = textPlane([t('foto.archSign')], 0.4, 0.1, { bg: '#d9cfb6', size: 20, px: 64 });
  archSign.position.set(W / 2 - 0.07, 1.75, archZ);
  archSign.rotation.y = -Math.PI / 2;
  scene.add(archSign);
  const stairX = 1.85;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x050505 }), stairX, 1.025, -D / 2 + 0.012, false));
  const stairPivot = new THREE.Group();
  stairPivot.userData.passThrough = true; // an open door must not stand between you and the doorway
  stairPivot.position.set(stairX - 0.42, 0, -D / 2 + 0.05);
  stairPivot.add(rbox(0.84, 2.0, 0.05, 0.01, woodDark, 0.42, 1.0, 0));
  stairPivot.add(cyl(0.02, 0.02, 0.04, mat(0x9a8a62, { metalness: 1, roughness: 0.4 }), 0.75, 1.0, 0.04, 10).rotateX(Math.PI / 2));
  scene.add(stairPivot);
  const stairsOpen = () => !!g.flag('f.stairs');
  if (stairsOpen()) stairPivot.rotation.y = 1.3; // swings away, up the stairs
  const privato = textPlane([t('foto.private')], 0.3, 0.09, { bg: '#d9cfb6', size: 20, px: 64 });
  privato.position.set(stairX, 1.6, -D / 2 + 0.08);
  stairPivot.attach(privato);

  // ---------------- hotspots ----------------
  const hBook = hitBox(0.42, 0.12, 0.32, -0.4, 1.02, -0.7, 'register');
  const hWall = hitBox(3.1, 1.5, 0.2, -0.52, 1.6, -D / 2 + 0.1, 'portraits');
  const hCurtain = hitBox(0.3, 2.2, 1.1, -W / 2 + 0.15, 1.1, curtainZ, 'studio');
  const hArch = hitBox(0.3, 2.1, 1.0, W / 2 - 0.15, 1.05, archZ, 'archive');
  const hStairs = hitBox(0.95, 2.1, 0.3, stairX, 1.05, -D / 2 + 0.15, 'stairs');
  const hCase = hitBox(0.85, 0.3, 0.45, 0.67, 1.1, -0.78, 'cameras');
  const hOut = hitBox(2.0, 2.2, 0.2, 0, 1.1, D / 2 - 0.1, 'out');
  scene.add(hBook, hWall, hCurtain, hArch, hStairs, hCase, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'register', obj: hBook, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('foto.registerTitle'), t('foto.register'), true);
      g.note('note.lastra');
    } },
    { id: 'portraits', obj: hWall, view: 'wall', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('f.wallSeen')) {
        g.set('f.wallSeen');
        return g.say([{ who: 'diego', key: 'foto.wall1' }, { who: 'diego', key: 'foto.wall2' }]);
      }
      return say(g.flag('f.freed') ? 'foto.wallAfter' : 'foto.wall3');
    } },
    { id: 'cameras', obj: hCase, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      return say('foto.cameras');
    } },
    { id: 'studio', obj: hCurtain, view: 'curtain', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('sheet');
      g.audio.steps(2, 0.45, false);
      return g.go('foto_studio');
    } },
    { id: 'archive', obj: hArch, view: 'archdoor', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      g.audio.steps(2, 0.45, false);
      return g.go('foto_archivio');
    } },
    { id: 'stairs', exit: () => stairsOpen(), obj: hStairs, view: 'stairs', tap: async (item) => {
      if (stairsOpen()) {
        if (item) return g.nope();
        g.audio.steps(8, 0.4, false);
        return g.go('foto_casa');
      }
      if (item === 'flatkey') {
        g.deselect();
        g.take('flatkey');
        g.set('f.stairs');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          stairPivot.rotation.y = (i / 20) * 1.3;
          await sleep(25);
        }
        return say('foto.stairsOpen');
      }
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say('foto.stairsLocked');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  return {
    id: 'foto_negozio',
    nameKey: 'place.fotoNegozio',
    next: ['foto_studio', 'foto_archivio', ...(stairsOpen() ? ['foto_casa'] : [])],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'map',
    views: {
      main: { pos: [0.4, 1.6, 1.8], look: [-0.2, 1.3, -1.6], yaw: 65, pitch: 18 },
      counter: { pos: [0.0, 1.6, 0.35], look: [0.0, 0.95, -0.8], parent: 'main', yaw: 25, pitch: 12 },
      wall: { pos: [-0.52, 1.65, 0.6], look: [-0.52, 1.65, -D / 2], parent: 'main', yaw: 30, pitch: 12, fov: 62 },
      curtain: { pos: [0.3, 1.6, 0.6], look: [-W / 2, 1.2, curtainZ], parent: 'main', yaw: 20, pitch: 12 },
      archdoor: { pos: [-0.2, 1.6, 0.8], look: [W / 2, 1.2, archZ], parent: 'main', yaw: 20, pitch: 12 },
      stairs: { pos: [1.0, 1.6, 0.4], look: [stairX, 1.2, -D / 2], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('f.entered')) {
        g.set('f.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.enter1' }, { who: 'diego', key: 'foto.enter2' }]);
      }
    },
    hint: () => {
      if (g.flag('placedCamera') && g.flag('rl.ticket') && !g.has('valve') && !g.flag('rl.valveIn')) return 'hint.foto.valve';
      if (g.has('camera')) return 'hint.foto.leave';
      if (!g.save.notebook.includes('note.lastra')) return 'hint.foto.register';
      if (!g.flag('f.dark')) return 'hint.foto.studio';
      if (!g.flag('f.print')) return 'hint.foto.darkroom';
      if (!g.flag('f.key') && !stairsOpen()) return g.flag('f.opened') && String(g.flag('f.opened')).split(',').includes('31') ? (g.flag('f.collage') ? 'hint.foto.tin' : 'hint.foto.pieces') : 'hint.foto.archive';
      if (!stairsOpen()) return 'hint.foto.stairs';
      if (!g.flag('f.flashbulb')) return 'hint.foto.upstairs';
      return 'hint.foto.portrait';
    },
  };
}
