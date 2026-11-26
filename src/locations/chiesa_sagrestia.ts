import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, mat, framed, cyl } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { motionNeedsTap, askMotion } from '../sensors';
import { stoneWall, stoneFloor, candle, sleep, churchHint } from './chiesa_common';

/**
 * The sacristy. Don Pietro's portrait, the register of the dead (the 24th of October 1974: Lisa),
 * vestments in the wardrobe, and on the table a reliquary that's really a puzzle box: a little maze
 * under glass. Tilt it (tilt the phone) and roll the ball into the hole: the drawer under it opens.
 */
export const MAZE = [
  '#############',
  '#S..#.....#.#',
  '###.#.###.#.#',
  '#...#...#...#',
  '#.#####.#####',
  '#.....#.....#',
  '#####.#####.#',
  '#E........#.#',
  '#############',
];

export function createChiesaSagrestia(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 9);
  scene.userData.envIntensity = 0.06;
  const W = 4.2, H = 3.2, D = 3.6;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#4f3d2b' });
  scene.add(room(W, H, D, { wall: stoneWall(), floor: stoneFloor(), ceil: woodMaterial({ base: '#1e1913', repeat: [2, 2], plank: true }) }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const motes = dust([-2, 0.3, -1.7], [2, 2.9, 1.7], 120);
  scene.add(motes.points);

  // ---------------- the table, with the reliquary and a candle ----------------
  const tY = 0.82, tZ = -0.7;
  scene.add(rbox(1.5, 0.05, 0.8, 0.01, woodMid, 0, tY, tZ));
  for (const [x, z] of [[-0.68, -0.33], [0.68, -0.33], [-0.68, 0.33], [0.68, 0.33]]) scene.add(rbox(0.06, tY, 0.06, 0.01, woodMid, x, tY / 2, tZ + z));
  const cnd = candle(0.3);
  cnd.group.position.set(-0.5, tY + 0.025, tZ - 0.15);
  scene.add(cnd.group);
  // the reliquary: a gilt box with a glass top, a maze inside, a drawer below
  const rel = new THREE.Group();
  const gilt = mat(0x8a7444, { metalness: 0.85, roughness: 0.35 });
  rel.add(rbox(0.42, 0.16, 0.3, 0.02, gilt, 0, 0.08, 0));
  rel.add(mesh(new THREE.PlaneGeometry(0.36, 0.24), mat(0x3a2c1e, { roughness: 0.9 }), 0, 0.162, 0, false).rotateX(-Math.PI / 2));
  for (const x of [-0.22, 0.22]) for (const z of [-0.16, 0.16]) rel.add(cyl(0.02, 0.02, 0.06, gilt, x, -0.01, z, 8));
  const relDrawer = rbox(0.3, 0.05, 0.22, 0.01, gilt, 0, 0.03, 0.03);
  rel.add(relDrawer);
  rel.position.set(0.15, tY + 0.045, tZ);
  scene.add(rel);
  const mazeDone = () => !!g.flag('ch.maze');
  if (mazeDone()) relDrawer.position.z = 0.2;
  const key = new THREE.Group();
  key.add(rbox(0.08, 0.006, 0.014, 0.002, mat(0x2a2a28, { metalness: 0.8 }), 0, 0, 0));
  key.add(mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), mat(0x2a2a28, { metalness: 0.8 }), -0.05, 0, 0).rotateX(Math.PI / 2));
  key.position.set(0.15, tY + 0.09, tZ + 0.2);
  key.visible = mazeDone() && !g.flag('ch.cemkey');
  scene.add(key);

  // ---------------- the register of the dead, on the lectern ----------------
  scene.add(rbox(0.4, 1.1, 0.35, 0.01, woodDark, -1.5, 0.55, -1.2));
  const reg = rbox(0.42, 0.04, 0.3, 0.008, mat(0x2a1a12, { roughness: 0.7 }), -1.5, 1.14, -1.2);
  reg.rotation.x = 0.35;
  scene.add(reg);

  // ---------------- Don Pietro, the wardrobe ----------------
  const pr = framed(0.42, 0.56, oldPhoto('chiesa_parroco', 300, 400, (c, w, h) => {
    c.fillStyle = '#8a857a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.3, border: false }), woodMaterial({ base: '#1c1510' }));
  pr.position.set(0.15, 1.95, -D / 2 + 0.03);
  scene.add(pr);
  scene.add(rbox(1.0, 2.2, 0.55, 0.02, woodDark, W / 2 - 0.6, 1.1, -0.9));
  for (let i = 0; i < 3; i++) scene.add(mesh(new THREE.PlaneGeometry(0.28, 1.4), mat([0xe8e2d4, 0x2a2622, 0x6a1a1a][i], { roughness: 1, side: THREE.DoubleSide }), W / 2 - 0.85 + i * 0.25, 1.35, -0.6, false));
  // the door back to the nave
  scene.add(rbox(0.9, 2.1, 0.06, 0.01, woodDark, -0.6, 1.05, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hRel = hitBox(0.5, 0.25, 0.4, 0.15, tY + 0.12, tZ, 'reliquary');
  const hKey = hitBox(0.2, 0.1, 0.2, 0.15, tY + 0.09, tZ + 0.2, 'cemkey');
  const hReg = hitBox(0.5, 0.25, 0.4, -1.5, 1.15, -1.2, 'register');
  const hPr = hitBox(0.5, 0.65, 0.1, 0.15, 1.95, -D / 2 + 0.06, 'parroco');
  const hWard = hitBox(1.1, 2.2, 0.6, W / 2 - 0.6, 1.1, -0.9, 'wardrobe');
  const hOut = hitBox(1.0, 2.1, 0.2, -0.6, 1.05, D / 2 - 0.1, 'out');
  scene.add(hRel, hKey, hReg, hPr, hWard, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'reliquary', obj: hRel, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      if (mazeDone()) return say('ch.relDone');
      // iPhone: ask for the motion sensors now, while this is still a tap
      if ((g.settings.sensors ?? true) && motionNeedsTap()) void askMotion();
      if (!g.flag('ch.relSeen')) {
        g.set('ch.relSeen');
        await g.say([{ who: 'diego', key: 'ch.rel1' }, { who: 'diego', key: 'ch.rel2' }]);
      }
      const ok = await g.ui.tiltMaze(t('ch.mazeTitle'), t('ch.mazeText'), MAZE, g.settings.sensors ?? true, () => g.audio.sfx('tick'));
      if (!ok) return;
      g.set('ch.maze');
      g.audio.sfx('clunk');
      g.audio.sfx('drawer');
      for (let i = 0; i <= 10; i++) {
        relDrawer.position.z = 0.03 + (i / 10) * 0.17;
        await sleep(25);
      }
      key.visible = true;
      return say('ch.mazeDone');
    } },
    { id: 'cemkey', obj: hKey, view: 'table', when: () => key.visible, tap: async (item) => {
      if (item) return g.nope();
      key.visible = false;
      g.set('ch.cemkey');
      g.give('cemkey');
      g.audio.sfx('pickup');
      return say('ch.cemkeyTaken');
    } },
    { id: 'register', obj: hReg, view: 'lectern', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('ch.registerTitle'), t('ch.register'), true);
      if (!g.flag('ch.register')) {
        g.set('ch.register');
        g.note('note.lisaDate');
        await g.say([{ who: 'diego', key: 'ch.registerAfter1' }, { who: 'diego', key: 'ch.registerAfter2' }]);
      }
    } },
    { id: 'parroco', obj: hPr, view: 'portrait', tap: async (item) => {
      if (item) return g.nope();
      return say('ch.parroco');
    } },
    { id: 'wardrobe', obj: hWard, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ch.wardrobe');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('chiesa_navata');
    } },
  ];

  return {
    id: 'chiesa_sagrestia',
    nameKey: 'place.chSagrestia',
    next: ['chiesa_navata'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'chiesa_navata',
    views: {
      main: { pos: [0.3, 1.65, 1.4], look: [-0.1, 1.1, -1.4], yaw: 60, pitch: 18 },
      table: { pos: [0.15, 1.45, tZ + 0.75], look: [0.1, tY + 0.05, tZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      lectern: { pos: [-1.0, 1.65, -0.3], look: [-1.5, 1.1, -1.25], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      portrait: { pos: [0.15, 1.85, 0.2], look: [0.15, 1.9, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      const f = 0.85 + Math.sin(time * 9) * 0.08 + Math.sin(time * 23) * 0.05;
      cnd.light.intensity = 0.7 * f;
      cnd.flame.scale.y = 1.8 * f;
    },
    enter: async () => {
      if (!g.flag('ch.sacEntered')) {
        g.set('ch.sacEntered');
        await sleep(300);
        await say('ch.sacEnter');
      }
    },
    hint: () => churchHint(g),
  };
}
