import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, lightCone, woodMaterial, mat } from '../builders';
import { t } from '../i18n';
import { fotoWall, sleep } from './foto_common';

/**
 * The archive: a cabinet of forty little drawers of glass plates and negatives, numbered.
 * Drawer 31 (the register says «lastra 31»; the print in the darkroom shows which drawer) holds
 * the plate of Giulio's self-portrait and, under it, the key of the flat upstairs.
 */
const ROWS = 5, COLS = 8, THE_ONE = 31;

export function createFotoArchivio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 9);
  scene.userData.envIntensity = 0.08;
  const W = 3.8, H = 2.7, D = 3.6;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#4e3b2a' });
  scene.add(room(W, H, D, {
    wall: fotoWall(),
    floor: woodMaterial({ base: '#2f251c', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#211b16', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const lamp = bulb(0, 2.25, -0.2, 6, 1.1, 6);
  scene.add(lamp.group);
  scene.add(lightCone(0, 2.23, -0.2, 2.1, 1.1, 0.025));
  const motes = dust([-1.8, 0.2, -1.7], [1.8, 2.5, 1.7], 140);
  scene.add(motes.points);

  // shelves of boxes along the walls
  for (const s of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      scene.add(rbox(0.35, 0.03, 2.6, 0.005, woodDark, s * (W / 2 - 0.2), 0.45 + r * 0.5, 0));
      for (let k = 0; k < 7; k++) scene.add(rbox(0.28, 0.22 + ((k * 7 + r) % 3) * 0.04, 0.3, 0.01, mat(0x8a8070 - ((k + r) % 3) * 0x101010, { roughness: 0.9 }), s * (W / 2 - 0.2), 0.58 + r * 0.5, -1.1 + k * 0.36));
    }
  }

  // ---------------- the cabinet of drawers (back wall) ----------------
  const cabW = 1.9, cabH = 1.35, cabY = 0.55;
  const cab = new THREE.Group();
  cab.add(rbox(cabW + 0.08, cabH + 0.08, 0.45, 0.01, woodDark, 0, cabY + cabH / 2, 0));
  const dw = cabW / COLS, dh = cabH / ROWS;
  const drawers: { n: number; g: THREE.Group; hb: THREE.Object3D }[] = [];
  const opened = new Set<number>(((g.flag('f.opened') as string | undefined) ?? '').split(',').filter(Boolean).map(Number));
  for (let r = 0; r < ROWS; r++)
    for (let k = 0; k < COLS; k++) {
      const n = r * COLS + k + 1;
      const d = new THREE.Group();
      d.add(rbox(dw - 0.02, dh - 0.02, 0.04, 0.005, woodMid, 0, 0, 0));
      d.add(rbox(0.05, 0.012, 0.02, 0.003, mat(0x9a8a62, { metalness: 1, roughness: 0.4 }), 0, -dh * 0.18, 0.03));
      const lab = textPlane([String(n)], 0.07, 0.04, { bg: '#e6dfcf', size: 22, px: 48 });
      lab.position.set(0, dh * 0.12, 0.022);
      d.add(lab);
      const hb = hitBox(dw - 0.02, dh - 0.02, 0.08, 0, 0, 0.03, 'drawer' + n);
      d.add(hb);
      // rows counted from the top, like the print shows
      d.position.set(-cabW / 2 + dw / 2 + k * dw, cabY + cabH - dh / 2 - r * dh, 0.24);
      if (opened.has(n)) d.position.z += 0.14;
      cab.add(d);
      drawers.push({ n, g: d, hb });
    }
  cab.position.set(0, 0, -D / 2 + 0.25);
  scene.add(cab);
  // the key and the plate inside 31
  const keyTaken = () => !!g.flag('f.key') || !!g.flag('f.stairs');
  const flatKey = new THREE.Group();
  flatKey.add(rbox(0.07, 0.006, 0.012, 0.002, mat(0x9a8a62, { metalness: 1, roughness: 0.35 }), 0, 0, 0));
  flatKey.add(mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 12), mat(0x9a8a62, { metalness: 1, roughness: 0.35 }), -0.045, 0, 0).rotateX(Math.PI / 2));
  const d31 = drawers.find((d) => d.n === THE_ONE)!;
  flatKey.position.set(0, 0.03, 0.06);
  d31.g.add(flatKey);
  flatKey.visible = opened.has(THE_ONE) && !keyTaken();

  // a light box on a table, for looking at negatives
  scene.add(rbox(0.9, 0.04, 0.55, 0.01, woodMid, 1.0, 0.78, 0.6));
  for (const [x, z] of [[0.6, 0.38], [1.4, 0.38], [0.6, 0.82], [1.4, 0.82]]) scene.add(rbox(0.04, 0.76, 0.04, 0.005, woodMid, x, 0.38, z));
  const lightbox = mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshBasicMaterial({ color: 0xbfc4c8 }), 1.0, 0.805, 0.6, false);
  lightbox.rotation.x = -Math.PI / 2;
  scene.add(lightbox);
  const neg = textPlane([''], 0.12, 0.09, { bg: '#2a2622' });
  neg.rotation.x = -Math.PI / 2;
  neg.position.set(0.95, 0.81, 0.6);
  scene.add(neg);
  // the door back to the shop
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, 0, 1.025, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hCab = hitBox(cabW + 0.1, cabH + 0.1, 0.5, 0, cabY + cabH / 2, -D / 2 + 0.3, 'cabinet');
  const hLight = hitBox(0.9, 0.2, 0.6, 1.0, 0.85, 0.6, 'lightbox');
  const hDoor = hitBox(1.0, 2.1, 0.2, 0, 1.05, D / 2 - 0.1, 'door');
  scene.add(hCab, hLight, hDoor);
  const say = (k: string) => g.say(k);
  const saveOpened = () => g.set('f.opened', [...opened].join(','));
  // what's in the other drawers: plates of the villagers, by year
  const contents = ['foto.drawerA', 'foto.drawerB', 'foto.drawerC', 'foto.drawerD', 'foto.drawerE'];

  const hotspots: Hotspot[] = [
    { id: 'cabinet', obj: hCab, view: 'cabinet', when: () => g.viewName !== 'cabinet', tap: async (item) => {
      if (item) return g.nope();
      return say('foto.cabinet');
    } },
    ...drawers.map((d): Hotspot => ({
      id: 'drawer' + d.n,
      obj: d.hb,
      lowPriority: true,
      when: () => g.viewName === 'cabinet',
      tap: async (item) => {
        if (item) return g.nope();
        if (!opened.has(d.n)) {
          opened.add(d.n);
          saveOpened();
          g.audio.sfx('drawer');
          for (let i = 0; i <= 8; i++) {
            d.g.position.z = 0.24 + (i / 8) * 0.14;
            await sleep(20);
          }
          if (d.n === THE_ONE) {
            flatKey.visible = !keyTaken();
            g.audio.sfx('whisper');
            return g.say([{ who: 'diego', key: 'foto.d31a' }, { who: 'diego', key: 'foto.d31b' }]);
          }
          if (d.n === 13) {
            // the one nobody should open
            g.audio.sfx('whisper');
            return say('foto.drawer13');
          }
          return say(contents[d.n % contents.length]);
        }
        if (d.n === THE_ONE && flatKey.visible) {
          flatKey.visible = false;
          g.set('f.key');
          g.give('flatkey');
          return say('foto.keyTaken');
        }
        // close it again
        g.audio.sfx('drawer');
        opened.delete(d.n);
        saveOpened();
        for (let i = 8; i >= 0; i--) {
          d.g.position.z = 0.24 + (i / 8) * 0.14;
          await sleep(20);
        }
      },
    })),
    { id: 'lightbox', obj: hLight, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.lightbox');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(2, 0.45, false);
      return g.go('foto_negozio');
    } },
  ];

  return {
    id: 'foto_archivio',
    nameKey: 'place.fotoArchivio',
    next: ['foto_negozio'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'foto_negozio',
    views: {
      main: { pos: [-0.6, 1.6, 1.3], look: [0.2, 1.1, -1.4], yaw: 60, pitch: 18 },
      cabinet: { pos: [0, 1.25, -D / 2 + 1.75], look: [0, cabY + cabH / 2, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('f.archEntered')) {
        g.set('f.archEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.arch1' }]);
      }
    },
    hint: () => {
      if (keyTaken()) return 'hint.foto.stairs';
      if (!g.flag('f.print')) return 'hint.foto.archiveWhich';
      return 'hint.foto.drawer';
    },
    debug: { drawers },
  };
}
