import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, textPlane, hitBox, woodMaterial, mat, cyl, lathe, framed } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { stoneWall, stoneFloor, pigeon, sleep, churchHint, BELL_ORDER } from './chiesa_common';

/**
 * Inside the bell tower. Three ropes come down through the ceiling: the big bell, the middle
 * one, the small one. Paolo rang them. Ring them «a morto», the way the hymn book says, and the
 * pigeons in the loft above take fright: up the ladder, in a nest, the tin tube the ringed one lost.
 */
export function createChiesaCampanile(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 12);
  scene.userData.envIntensity = 0.06;
  const W = 3.2, H = 8, D = 3.2;
  scene.add(room(W, H, D, { wall: stoneWall(), floor: stoneFloor(), ceil: mat(0x0a0a0a) }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  // light from the louvres up top
  const top = new THREE.SpotLight(0xb8c4d0, 6, 12, 0.6, 0.7, 1.2);
  top.position.set(0.5, H - 0.5, 0.5);
  top.target.position.set(0, 0, 0);
  scene.add(top, top.target);
  const lowL = new THREE.PointLight(0xffd9a0, 0.8, 4, 1.6);
  lowL.position.set(0.6, 2.2, 0.8);
  scene.add(lowL);

  // ---------------- the loft floor, the ladder, the bells ----------------
  const loftY = 5.2;
  const woodDark = woodMaterial({ base: '#2a2018', plank: true });
  scene.add(rbox(W, 0.1, D * 0.55, 0.01, woodDark, 0, loftY, -D * 0.22));
  // the ladder up to the loft (left)
  const lad = new THREE.Group();
  for (const x of [-0.22, 0.22]) lad.add(rbox(0.06, loftY + 0.4, 0.06, 0.01, woodDark, x, (loftY + 0.4) / 2, 0));
  for (let i = 0; i < 14; i++) lad.add(rbox(0.44, 0.04, 0.05, 0.01, woodDark, 0, 0.35 + i * 0.38, 0));
  lad.position.set(-W / 2 + 0.45, 0, 0.2);
  lad.rotation.x = -0.12;
  scene.add(lad);
  // the three bells, high up, and their ropes coming down
  const bronze = mat(0x5a4a30, { metalness: 0.9, roughness: 0.45 });
  const ropeM = mat(0x8a7a5a, { roughness: 1 });
  const sallyM = mat(0x6a2a24, { roughness: 1 });
  const BELL = { G: { x: -0.55, s: 1.0 }, M: { x: 0.25, s: 0.8 }, P: { x: 0.95, s: 0.6 } } as const;
  const bells: Record<string, THREE.Group> = {};
  const ropes: Record<string, THREE.Group> = {};
  for (const [k, b] of Object.entries(BELL)) {
    const bell = new THREE.Group();
    bell.add(lathe([[0, 0.5], [0.12, 0.48], [0.2, 0.35], [0.24, 0.1], [0.32, 0], [0.3, -0.02], [0, 0.02]], bronze, 0, -0.5, 0, 24));
    bell.scale.setScalar(b.s);
    bell.position.set(b.x, H - 1.0, -0.4);
    scene.add(bell);
    bells[k] = bell;
    const rope = new THREE.Group();
    rope.add(cyl(0.012, 0.012, H - 1.6, ropeM, 0, (H - 1.6) / 2 + 0.6, 0, 5));
    rope.add(cyl(0.035, 0.035, 0.4, sallyM, 0, 1.2, 0, 8));
    rope.position.set(b.x, 0, 0.3);
    scene.add(rope);
    ropes[k] = rope;
    const tag = textPlane([t('ch.bell' + k)], 0.3, 0.08, { bg: '#7d7564', size: 30, px: 64 });
    tag.position.set(b.x, 1.65, 0.34);
    scene.add(tag);
  }
  // Paolo on the wall: the bell-ringer
  const ph = framed(0.36, 0.48, oldPhoto('chiesa_campanaro', 270, 360, (c, w, h) => {
    c.fillStyle = '#8a857a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.35, border: false }), woodMaterial({ base: '#1c1510' }));
  ph.position.set(W / 2 - 0.03, 1.7, -0.6);
  ph.rotation.y = -Math.PI / 2;
  scene.add(ph);

  // ---------------- the pigeons in the loft ----------------
  const birds: { g: THREE.Group; ring: boolean; home: THREE.Vector3 }[] = [];
  const spots: [number, number][] = [[-1.1, -0.9], [-0.6, -1.2], [0.0, -0.95], [0.5, -1.25], [1.1, -0.85], [-0.3, -0.5], [0.8, -0.45]];
  spots.forEach(([x, z], i) => {
    const b = pigeon(i === 4);
    b.position.set(x, loftY + 0.05, z);
    b.rotation.y = (i * 1.7) % (Math.PI * 2);
    scene.add(b);
    birds.push({ g: b, ring: i === 4, home: b.position.clone() });
  });
  const fled = () => !!g.flag('ch.bells');
  if (fled()) birds.forEach((b) => (b.g.visible = false));
  // nests of straw; in one, after the bells, the tin tube
  const nestM = mat(0x8a7a50, { roughness: 1 });
  for (const [x, z] of [[1.15, -1.2], [-1.2, -1.25]]) scene.add(mesh(new THREE.TorusGeometry(0.12, 0.05, 6, 12), nestM, x, loftY + 0.07, z).rotateX(Math.PI / 2));
  const tube = cyl(0.015, 0.015, 0.07, mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 }), 1.15, loftY + 0.1, -1.2, 8);
  tube.rotation.z = Math.PI / 2;
  tube.visible = fled() && !g.flag('ch.tube');
  scene.add(tube);

  // ---------------- hotspots ----------------
  const hRopes = Object.entries(BELL).map(([k, b]) => {
    const hb = hitBox(0.22, 0.9, 0.22, b.x, 1.3, 0.3, 'rope' + k);
    scene.add(hb);
    return [k, hb] as const;
  });
  const hLadder = hitBox(0.6, 2.4, 0.4, -W / 2 + 0.45, 1.3, 0.2, 'ladder');
  const hPhoto = hitBox(0.1, 0.55, 0.42, W / 2 - 0.05, 1.7, -0.6, 'photo');
  const hBirds = birds.map((b, i) => {
    const hb = hitBox(0.25, 0.25, 0.3, b.home.x, b.home.y + 0.1, b.home.z, 'pigeon' + i);
    scene.add(hb);
    return hb;
  });
  const hTube = hitBox(0.3, 0.2, 0.3, 1.15, loftY + 0.1, -1.2, 'tube');
  const hDown = hitBox(1.0, 2.1, 0.2, 0.6, 1.05, D / 2 - 0.1, 'down');
  scene.add(hLadder, hPhoto, hTube, hDown);
  const say = (k: string) => g.say(k);

  let seq = '';
  const ring = async (k: 'G' | 'M' | 'P') => {
    const rope = ropes[k], bell = bells[k];
    g.audio.rec('bell', { gain: 0.55, rate: k === 'G' ? 0.7 : k === 'M' ? 1.0 : 1.4 });
    for (let i = 0; i <= 12; i++) {
      const a = Math.sin((i / 12) * Math.PI);
      rope.position.y = -a * 0.25;
      bell.rotation.z = a * 0.5 * (k === 'M' ? -1 : 1);
      await sleep(30);
    }
    rope.position.y = 0;
    bell.rotation.z = 0;
    if (fled()) return;
    seq = (seq + k).slice(-BELL_ORDER.length);
    if (seq === BELL_ORDER) return bellsDone();
    // the pigeons shift and coo at every toll
    birds.forEach((b) => (b.g.rotation.y += 0.4));
  };
  const bellsDone = async () => {
    g.set('ch.bells');
    await sleep(500);
    g.audio.sfx('sheet');
    g.audio.sfx('sheet');
    // the pigeons burst out of the loft
    for (let i = 0; i <= 30; i++) {
      birds.forEach((b, j) => {
        b.g.position.set(b.home.x + Math.sin(j) * i * 0.03, b.home.y + i * 0.08, b.home.z + Math.cos(j) * i * 0.03);
        b.g.rotation.y += 0.3;
      });
      await sleep(30);
    }
    birds.forEach((b) => (b.g.visible = false));
    tube.visible = true;
    return g.say([{ who: 'diego', key: 'ch.bellsDone1' }, { who: 'diego', key: 'ch.bellsDone2' }]);
  };

  const hotspots: Hotspot[] = [
    ...hRopes.map(([k, hb]): Hotspot => ({
      id: 'rope' + k,
      obj: hb,
      view: 'ropes',
      tap: async (item) => {
        if (item) return g.nope();
        if (!g.flag('ch.ropesSeen')) {
          g.set('ch.ropesSeen');
          await say('ch.ropes');
        }
        return ring(k as 'G' | 'M' | 'P');
      },
    })),
    { id: 'ladder', obj: hLadder, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(6, 0.35, false);
      await g.view('loft');
      if (!g.flag('ch.loftSeen')) {
        g.set('ch.loftSeen');
        await g.say([{ who: 'diego', key: 'ch.loft1' }, { who: 'diego', key: 'ch.loft2' }]);
      }
    } },
    { id: 'photo', obj: hPhoto, view: 'photo', tap: async (item) => {
      if (item) return g.nope();
      return g.say([{ who: 'diego', key: 'ch.paolo1' }, { who: 'diego', key: 'ch.paolo2' }]);
    } },
    ...hBirds.map((hb, i): Hotspot => ({
      id: 'pigeon' + i,
      obj: hb,
      when: () => g.viewName === 'loft' && !fled(),
      tap: async (item) => {
        if (item) return g.nope();
        const b = birds[i];
        g.audio.sfx('sheet');
        // a flutter, and back
        for (let k = 0; k <= 10; k++) {
          b.g.position.y = b.home.y + Math.sin((k / 10) * Math.PI) * 0.25;
          await sleep(25);
        }
        return say(b.ring ? 'ch.pigeonRing' : 'ch.pigeon');
      },
    })),
    { id: 'tube', obj: hTube, when: () => g.viewName === 'loft' && tube.visible, tap: async (item) => {
      if (item) return g.nope();
      tube.visible = false;
      g.set('ch.tube');
      g.audio.sfx('pickup');
      g.audio.sfx('paper');
      await g.ui.doc(t('ch.tubeTitle'), t('ch.tubeNote'), true);
      g.note('note.knock');
      return say('ch.tubeAfter');
    } },
    { id: 'down', obj: hDown, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(4, 0.5, false);
      return g.go('chiesa_navata');
    } },
  ];

  return {
    id: 'chiesa_campanile',
    nameKey: 'place.chCampanile',
    next: ['chiesa_navata'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'chiesa_navata',
    dark: () => true,
    views: {
      main: { pos: [0.6, 1.6, 1.5], look: [0.0, 1.75, -1.2], yaw: 60, pitch: 35 },
      ropes: { pos: [0.2, 1.5, 1.45], look: [0.2, 1.35, 0.2], parent: 'main', yaw: 25, pitch: 20 },
      photo: { pos: [0.3, 1.7, -0.6], look: [W / 2, 1.7, -0.6], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      loft: { pos: [0.0, loftY + 1.0, 0.6], look: [0.1, loftY + 0.1, -1.0], parent: 'main', yaw: 40, pitch: 25 },
    },
    hotspots,
    update: (_dt, time) => {
      if (fled()) return;
      birds.forEach((b, i) => {
        if (b.g.position.y > b.home.y + 0.01) return;
        b.g.rotation.x = Math.sin(time * 3 + i) * 0.06;
      });
    },
    enter: async () => {
      if (!g.flag('ch.towerEntered')) {
        g.set('ch.towerEntered');
        await sleep(300);
        g.audio.sfx('sheet');
        await g.say([{ who: 'diego', key: 'ch.tower1' }, { who: 'diego', key: 'ch.tower2' }]);
      }
    },
    hint: () => churchHint(g),
    debug: { ring },
  };
}
