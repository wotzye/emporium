import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, mat, cyl, uvInk } from '../builders';
import { t } from '../i18n';
import { stoneWall, stoneFloor, pew, candle, sleep, churchHint } from './chiesa_common';
import { prop } from '../models';

/**
 * San Michele — the nave. Pews, the altar, the hymn board (today: 24), the hymn books on the
 * pews, the confessional. Doors: the bell tower (Paolo's key), the sacristy, the cemetery.
 */
export function createChiesaNavata(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 6, 16);
  scene.userData.envIntensity = 0.06;
  const W = 6.4, H = 6, D = 11;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  scene.add(room(W, H, D, { wall: stoneWall(), floor: stoneFloor(), ceil: woodMaterial({ base: '#1e1913', repeat: [3, 4], plank: true }) }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.035));
  // moonlight through the tall windows
  for (const s of [-1, 1]) {
    for (const z of [-2.5, 1.5]) {
      const w = mesh(new THREE.PlaneGeometry(0.9, 2.4), new THREE.MeshBasicMaterial({ color: 0x3a4048 }), s * (W / 2 - 0.012), 3.6, z, false);
      w.rotation.y = -s * Math.PI / 2;
      scene.add(w);
      const sl = new THREE.SpotLight(0xa9b8c6, 4, 9, 0.5, 0.8, 1.3);
      sl.position.set(s * (W / 2 + 0.3), 4.2, z);
      sl.target.position.set(-s * 1.0, 0, z + 0.5);
      scene.add(sl, sl.target);
    }
  }
  const motes = dust([-3, 0.3, -5], [3, 5, 5], 200);
  scene.add(motes.points);

  // ---------------- pews ----------------
  for (let r = 0; r < 5; r++) for (const s of [-1, 1]) {
    const p = pew(2.2);
    p.position.set(s * 1.45, 0, 2.6 - r * 1.05);
    scene.add(p);
  }
  // a hymn book on the front pew, left
  const book = rbox(0.16, 0.04, 0.22, 0.006, mat(0x2a1a14, { roughness: 0.7 }), -1.0, 0.95, -1.6);
  book.rotation.y = 0.3;
  scene.add(book);

  // ---------------- the altar, the crucifix, the candles ----------------
  scene.add(rbox(4.2, 0.2, 2.2, 0.02, stoneFloor(), 0, 0.1, -4.4));
  scene.add(rbox(2.0, 1.0, 0.8, 0.02, mat(0xb8b2a6, { roughness: 0.6 }), 0, 0.7, -4.6));
  scene.add(rbox(2.1, 0.03, 0.9, 0.01, mat(0xe8e4da, { roughness: 1 }), 0, 1.215, -4.6));
  // the carved retable behind the altar, the crucifix above it
  const retable = prop('altarM', { width: 2.6, grey: 0.9 });
  if (retable) {
    retable.position.set(0, 0.2, -D / 2 + 0.35);
    scene.add(retable);
  }
  const crucifix = prop('crossM', { height: 1.9 });
  if (crucifix) {
    crucifix.position.set(0, retable ? 3.3 : 2.2, -D / 2 + 0.1);
    scene.add(crucifix);
  } else {
    scene.add(rbox(0.12, 2.6, 0.12, 0.01, woodDark, 0, 3.0, -D / 2 + 0.15));
    scene.add(rbox(1.3, 0.12, 0.12, 0.01, woodDark, 0, 3.7, -D / 2 + 0.15));
  }
  // two tall iron candle stands either side of the altar
  for (const x of [-1.6, 1.6]) {
    const st = prop('candelabra2', { height: 1.9 });
    if (!st) continue;
    st.position.set(x, 0.2, -4.2);
    scene.add(st);
    const l = new THREE.PointLight(0xffd9a0, 0.5, 4, 1.8);
    l.position.set(x, 2.15, -4.2);
    scene.add(l);
  }
  const candles = [-0.7, 0.7].map((x) => {
    const c = candle(0.45);
    c.group.position.set(x, 1.23, -4.6);
    scene.add(c.group);
    return c;
  });
  // the hymn board, right of the altar
  const board = textPlane([t('ch.boardTitle'), '24', '117', '3'], 0.6, 0.9, { bg: '#1a1612', fg: '#e8e2d0', size: 30, px: 200, border: '#6a5a40' });
  board.position.set(2.6, 2.4, -4.2);
  board.rotation.y = -0.5;
  scene.add(board);

  // ---------------- the confessional (left wall) ----------------
  const conf = new THREE.Group();
  const realConf = prop('confessional', { width: 1.7, grey: 0.8 });
  if (realConf) conf.add(realConf);
  else {
    conf.add(rbox(1.6, 2.4, 0.9, 0.03, woodDark, 0, 1.2, 0));
    for (const x of [-0.5, 0.5]) conf.add(mesh(new THREE.PlaneGeometry(0.5, 1.6), mat(0x1a0c0c, { roughness: 1 }), x, 1.0, 0.46, false));
    conf.add(mesh(new THREE.PlaneGeometry(0.3, 0.3), mat(0x0a0a0a), 0, 1.4, 0.46, false));
  }
  conf.position.set(-W / 2 + 0.5, 0, -0.6);
  conf.rotation.y = Math.PI / 2;
  scene.add(conf);
  // in the confessional, in invisible ink: someone else came here to confess
  const confInk = uvInk([t('ch.uvConf1'), t('ch.uvConf2')], 0.9, 0.36);
  confInk.position.set(-W / 2 + 0.015, 2.75, -0.6);
  confInk.rotation.y = Math.PI / 2;
  scene.add(confInk);

  // ---------------- doors ----------------
  const towerZ = 3.6, sacX = 2.4, cemZ = 1.0;
  // the bell tower door (left, by the entrance)
  scene.add(mesh(new THREE.PlaneGeometry(0.9, 2.1), new THREE.MeshBasicMaterial({ color: 0x040404 }), -W / 2 + 0.012, 1.05, towerZ, false).rotateY(Math.PI / 2));
  const towerPivot = new THREE.Group();
  towerPivot.position.set(-W / 2 + 0.05, 0, towerZ - 0.45);
  towerPivot.add(rbox(0.06, 2.05, 0.9, 0.01, woodDark, 0, 1.025, 0.45));
  towerPivot.add(cyl(0.025, 0.025, 0.05, mat(0x6a5a3a, { metalness: 0.8 }), 0.05, 1.0, 0.8, 8).rotateZ(Math.PI / 2));
  scene.add(towerPivot);
  const towerOpen = () => !!g.flag('ch.tower');
  if (towerOpen()) towerPivot.rotation.y = 1.3;
  const towerSign = textPlane([t('ch.towerSign')], 0.45, 0.1, { bg: '#d9cfb6', size: 20, px: 64 });
  towerSign.position.set(-W / 2 + 0.02, 2.3, towerZ);
  towerSign.rotation.y = Math.PI / 2;
  scene.add(towerSign);
  // the sacristy door (back right)
  scene.add(rbox(0.9, 2.1, 0.06, 0.01, woodDark, sacX, 1.05, -D / 2 + 0.03));
  // the side door to the cemetery (right wall)
  scene.add(rbox(0.06, 2.2, 1.0, 0.01, woodDark, W / 2 - 0.03, 1.1, cemZ));
  const cemSign = textPlane([t('ch.cemSign')], 0.45, 0.1, { bg: '#d9cfb6', size: 20, px: 64 });
  cemSign.position.set(W / 2 - 0.02, 2.4, cemZ);
  cemSign.rotation.y = -Math.PI / 2;
  scene.add(cemSign);

  // ---------------- hotspots ----------------
  const hBook = hitBox(0.3, 0.15, 0.3, -1.0, 0.98, -1.6, 'hymnal');
  const hBoard = hitBox(0.7, 1.0, 0.2, 2.6, 2.4, -4.2, 'board');
  const hAltar = hitBox(2.2, 1.3, 1.0, 0, 0.7, -4.6, 'altar');
  const hConf = hitBox(0.95, 2.4, 1.6, -W / 2 + 0.5, 1.2, -0.6, 'confessional');
  const hTower = hitBox(0.3, 2.1, 1.0, -W / 2 + 0.15, 1.05, towerZ, 'tower');
  const hSac = hitBox(1.0, 2.1, 0.3, sacX, 1.05, -D / 2 + 0.15, 'sacristy');
  const hCem = hitBox(0.3, 2.2, 1.1, W / 2 - 0.15, 1.1, cemZ, 'cemetery');
  const hPews = hitBox(5.5, 1.0, 5.0, 0, 0.5, 0.5, 'pews');
  scene.add(hBook, hBoard, hAltar, hConf, hTower, hSac, hCem, hPews);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'hymnal', obj: hBook, view: 'pew', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      if (!g.flag('ch.boardSeen')) await say('ch.hymnalClosed');
      const read = await g.readDoc('ch.hymnalTitle', 'ch.hymnal');
      if (read && !g.flag('ch.hymn')) {
        g.set('ch.hymn');
        g.note('note.bells');
        await say('ch.hymnalAfter');
      }
    } },
    { id: 'board', obj: hBoard, view: 'altar', tap: async (item) => {
      if (item) return g.nope();
      g.set('ch.boardSeen');
      return g.say([{ who: 'diego', key: 'ch.board1' }, { who: 'diego', key: 'ch.board2' }]);
    } },
    { id: 'altar', obj: hAltar, view: 'altar', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ch.altar');
    } },
    { id: 'confessional', obj: hConf, view: 'confessional', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('whisper');
      if (!g.flag('ch.conf')) {
        g.set('ch.conf');
        return g.say([{ who: 'diego', key: 'ch.conf1' }, { who: 'lisa', key: 'ch.conf2' }, { who: 'diego', key: 'ch.conf3' }]);
      }
      return say('ch.confAgain');
    } },
    { id: 'tower', exit: () => towerOpen(), obj: hTower, view: 'towerdoor', tap: async (item) => {
      if (towerOpen()) {
        if (item) return g.nope();
        g.audio.steps(4, 0.5, false);
        return g.go('chiesa_campanile');
      }
      if (item === 'towerkey') {
        g.deselect();
        g.take('towerkey');
        g.set('ch.tower');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          towerPivot.rotation.y = (i / 20) * 1.3;
          await sleep(25);
        }
        return say('ch.towerOpen');
      }
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say(g.has('towerkey') ? 'ch.towerUseKey' : 'ch.towerLocked');
    } },
    { id: 'sacristy', obj: hSac, view: 'altar', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      g.audio.steps(3, 0.45, false);
      return g.go('chiesa_sagrestia');
    } },
    { id: 'cemetery', obj: hCem, view: 'cemdoor', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      g.audio.steps(3, 0.5, false);
      return g.go('chiesa_cimitero');
    } },
    { id: 'pews', obj: hPews, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ch.pews');
    } },
  ];

  return {
    id: 'chiesa_navata',
    nameKey: 'place.chNavata',
    next: ['chiesa_sagrestia', 'chiesa_cimitero', ...(towerOpen() ? ['chiesa_campanile'] : [])],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'map',
    views: {
      main: { pos: [0, 1.7, 4.6], look: [0, 1.6, -4], yaw: 60, pitch: 20 },
      pew: { pos: [-0.6, 1.5, -0.7], look: [-1.0, 0.95, -1.6], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      altar: { pos: [0.6, 1.8, -1.8], look: [0.8, 1.6, -5], parent: 'main', yaw: 30, pitch: 15 },
      confessional: { pos: [-0.6, 1.6, -0.6], look: [-W / 2, 1.3, -0.6], parent: 'main', yaw: 25, pitch: 15 },
      towerdoor: { pos: [-1.2, 1.6, 3.0], look: [-W / 2, 1.2, towerZ], parent: 'main', yaw: 20, pitch: 12 },
      cemdoor: { pos: [1.2, 1.6, 1.4], look: [W / 2, 1.2, cemZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      candles.forEach((c, i) => {
        const f = 0.85 + Math.sin(time * 9 + i * 2) * 0.08 + Math.sin(time * 23 + i) * 0.05;
        c.light.intensity = 0.6 * f;
        c.flame.scale.y = 1.8 * f;
      });
    },
    enter: async () => {
      if (!g.flag('ch.entered')) {
        g.set('ch.entered');
        await sleep(400);
        g.audio.rec('bell', { gain: 0.35 });
        await g.say([{ who: 'diego', key: 'ch.enter1' }, { who: 'diego', key: 'ch.enter2' }]);
      }
    },
    hint: () => churchHint(g),
  };
}
