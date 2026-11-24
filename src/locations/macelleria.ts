import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, tileTex, textPlane, hitBox, figure, ghostSprite, canvasTex, noise } from '../builders';
import { t } from '../i18n';

export function createMacelleria(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3.5, 10);
  const W = 7, H = 3, D = 6;
  const wallMat = mat(0xffffff, { map: tileTex('#d4d2cc', '#cbc8c1', 10, [4, 2]) });
  const rm = room(W, H, D, {
    wall: wallMat,
    floor: mat(0xffffff, { map: tileTex('#9a968e', '#4a4741', 8, [4, 4]) }),
    ceil: mat(0x2a2826),
  });
  scene.add(rm);
  // back wall rebuilt with an opening for the cold room door
  const backWall = rm.userData.walls.back as THREE.Mesh;
  backWall.visible = false;
  backWall.userData.noPick = true;
  const segTex = (w: number, h: number) => {
    const m = mat(0xffffff, { map: tileTex('#d4d2cc', '#cbc8c1', 10, [w / 1.75, h / 1.5]) });
    return m;
  };
  const wallSeg = (x0: number, x1: number, y0: number, y1: number) => {
    const w = x1 - x0, h = y1 - y0;
    const p = mesh(new THREE.PlaneGeometry(w, h), segTex(w, h), (x0 + x1) / 2, (y0 + y1) / 2, -D / 2);
    p.castShadow = false;
    scene.add(p);
  };
  wallSeg(-W / 2, 1.25, 0, H);
  wallSeg(2.55, W / 2, 0, H);
  wallSeg(1.25, 2.55, 2.2, H);
  // the cold room itself, seen only through the door
  const cellaRoom = mesh(new THREE.BoxGeometry(1.3, 2.2, 1.5), mat(0x8f949a, { side: THREE.BackSide, roughness: 0.4, metalness: 0.4 }), 1.9, 1.1, -3.75);
  cellaRoom.castShadow = false;
  scene.add(cellaRoom);

  // neon tube, flickering
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const tube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0xf4f7ff }));
  tube.position.set(-0.4, H - 0.08, -0.2);
  tube.userData.noPick = true;
  scene.add(tube);
  const neon = new THREE.SpotLight(0xeef3ff, 14, 9, 1.2, 0.8, 1.4);
  neon.position.set(-0.4, H - 0.15, -0.2);
  neon.target.position.set(-0.4, 0, -0.6);
  neon.castShadow = true;
  neon.shadow.mapSize.set(1024, 1024);
  scene.add(neon, neon.target);
  let neonOn = 1;

  const steel = mat(0x9a9a9a, { metalness: 0.7, roughness: 0.35 });
  const enamel = mat(0xdedbd3, { roughness: 0.5 });

  // counter with glass display
  const cx = -0.5, cz = -0.8;
  scene.add(box(4.0, 0.85, 0.7, enamel, cx, 0.425, cz));
  scene.add(box(4.0, 0.04, 0.72, steel, cx, 0.87, cz));
  const glass = mesh(new THREE.BoxGeometry(3.9, 0.38, 0.62), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.8 }), cx, 1.08, cz);
  glass.castShadow = false;
  glass.userData.noPick = true;
  scene.add(glass);
  // meat: dark, desaturated so the film keeps it gray (red is only for cursed things)
  const meat = mat(0x6b5552, { roughness: 0.55 });
  const fat = mat(0xcfc6bc, { roughness: 0.6 });
  const pieces: [number, number, number, number][] = [[-2.1, 0.12, 0.08, 1.4], [-1.5, 0.1, 0.1, 1.1], [-0.9, 0.09, 0.07, 0.7], [-0.3, 0.12, 0.09, 1.6], [0.35, 0.08, 0.06, 0.9], [0.9, 0.11, 0.1, 1.2]];
  for (const [x, rx, ry, sx] of pieces) {
    const p = sphere(rx, meat, x, 0.95, cz + (Math.random() - 0.5) * 0.15, 10);
    p.scale.set(sx, ry / rx, 1);
    scene.add(p);
    const f = sphere(rx * 0.5, fat, x + 0.04, 0.97, cz + 0.05, 8);
    f.scale.set(sx * 0.8, 0.3, 0.6);
    scene.add(f);
  }
  // a hand among the cuts. Grey, so it is just one more cut until you look closely.
  const hand = new THREE.Group();
  hand.add(box(0.1, 0.03, 0.12, meat, 0, 0, 0));
  for (let i = 0; i < 4; i++) hand.add(box(0.016, 0.02, 0.08, meat, -0.035 + i * 0.023, 0, 0.09));
  hand.add(box(0.018, 0.02, 0.06, meat, 0.06, 0, 0.03));
  hand.position.set(-1.2, 0.94, cz + 0.1);
  hand.rotation.y = 0.6;
  scene.add(hand);
  // price cards stuck in the meat
  const cards = [['price.tongue'], ['price.fingers'], ['price.special']];
  [-2.1, -1.2, -0.3].forEach((x, i) => {
    const c = textPlane([t(cards[i][0])], 0.36, 0.14, { bg: '#f2efe6', size: 22, px: 64 });
    c.position.set(x, 1.0, cz + 0.27);
    c.rotation.x = -0.4;
    scene.add(c);
  });

  // scale
  scene.add(box(0.35, 0.12, 0.3, enamel, 1.1, 0.95, cz));
  scene.add(cyl(0.16, 0.16, 0.02, steel, 1.1, 1.03, cz, 20));
  const dial = textPlane(['0'], 0.18, 0.18, { bg: '#f4f1e8', size: 60, px: 64 });
  dial.position.set(1.1, 1.08, cz + 0.16);
  scene.add(dial);

  // delivery ledger
  const book = box(0.36, 0.05, 0.26, mat(0x2a2420), -2.05, 0.92, cz + 0.05);
  book.rotation.y = -0.2;
  scene.add(book);

  // hooks rail with carcasses along the back wall
  scene.add(box(3.2, 0.05, 0.05, steel, -1.4, 2.55, -2.6));
  for (const x of [-2.6, -1.9, -1.1, -0.3]) {
    scene.add(cyl(0.008, 0.008, 0.3, steel, x, 2.4, -2.6, 4));
    const carcass = sphere(0.22, meat, x, 1.75, -2.6, 12);
    carcass.scale.set(0.75, 2.2, 0.55);
    scene.add(carcass);
    carcass.userData.sway = Math.random() * 6;
  }

  // cold room door
  const cellaX = 1.9;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(cellaX - 0.65, 0, -2.96);
  const door = box(1.3, 2.2, 0.12, steel, 0.65, 1.1, 0);
  doorPivot.add(door);
  doorPivot.add(box(0.06, 0.35, 0.08, mat(0x333333), 1.15, 1.15, 0.1));
  scene.add(doorPivot);
  scene.add(box(1.5, 0.12, 0.2, steel, cellaX, 2.26, -2.95));
  // cold light inside the cella (only when open)
  const coldLight = new THREE.SpotLight(0xdfe8ff, 0, 8, 0.7, 0.5, 1.2);
  coldLight.position.set(cellaX, 2.05, -4.35);
  coldLight.target.position.set(cellaX, 0.5, 0.5);
  coldLight.castShadow = true;
  scene.add(coldLight, coldLight.target);
  // frozen carcasses inside the cella
  for (const x of [cellaX - 0.4, cellaX + 0.4]) {
    const c = sphere(0.2, meat, x, 1.4, -4.2, 10);
    c.scale.set(0.8, 2.3, 0.6);
    scene.add(c);
  }

  // Bruno
  const bruno = figure({ height: 2.05, bulk: 1.35, apron: true, cleaver: true });
  bruno.position.set(cellaX, 0, -3.9);
  bruno.visible = false;
  bruno.traverse((o) => (o.userData.noPick = true));
  scene.add(bruno);

  // family photo on the left wall
  const photoTex = canvasTex(256, 200, (c, w, h) => {
    c.fillStyle = '#3a3836';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9d4c8';
    c.fillRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#8a857c';
    c.fillRect(18, 18, w - 36, h - 36);
    const people = [[70, 1.25, 30], [115, 1.05, 24], [160, 0.75, 17], [200, 0.85, 19]];
    for (const [x, s, r] of people) {
      c.fillStyle = '#2a2826';
      c.beginPath();
      c.arc(x, 140 - 80 * s, r * 0.7, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x - r, 150 - 70 * s, r * 2, 80 * s);
    }
    // Bruno's face scratched out
    c.strokeStyle = '#d9d4c8';
    c.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(55 + Math.random() * 10, 30 + Math.random() * 20);
      c.lineTo(80 + Math.random() * 10, 50 + Math.random() * 20);
      c.stroke();
    }
    noise(c, w, h, 1500, 0.2);
  });
  const photo = mesh(new THREE.PlaneGeometry(0.62, 0.48), mat(0xffffff, { map: photoTex }), -3.48, 1.65, 0.6);
  photo.rotation.y = Math.PI / 2;
  scene.add(photo);
  // door to the stairs (upstairs: the family home)
  scene.add(box(0.06, 2.1, 0.95, mat(0x2a2622), -3.47, 1.05, -1.9));

  // exit door
  scene.add(box(1.0, 2.1, 0.06, mat(0x1a1816), 0, 1.05, D / 2 - 0.04));

  // Lisa
  const lisa = ghostSprite(1.55);
  lisa.position.set(-2.75, 0.95, -1.75);
  scene.add(lisa);
  let lisaTarget = 0;

  // ---------------- hotspots ----------------
  const hCounter = hitBox(2.5, 0.6, 0.8, -0.5, 1.0, cz, 'counter');
  const hBook = hitBox(0.7, 0.45, 0.75, -2.05, 0.98, cz + 0.05, 'book');
  const hScale = hitBox(0.55, 0.5, 0.75, 1.1, 1.0, cz, 'scale');
  const hPhoto = hitBox(0.2, 0.7, 0.8, -3.4, 1.65, 0.6, 'photo');
  const hCella = hitBox(1.5, 2.3, 0.4, cellaX, 1.15, -2.8, 'cella');
  const hHooks = hitBox(3.2, 1.6, 0.6, -1.4, 1.8, -2.6, 'hooks');
  const hStairs = hitBox(0.3, 2.1, 1.0, -3.4, 1.05, -1.9, 'stairs');
  scene.add(hCounter, hBook, hScale, hPhoto, hCella, hHooks, hStairs);

  const seen = () => (g.flag('m.book') ? 1 : 0) + (g.flag('m.counter') ? 1 : 0) + (g.flag('m.photo') ? 1 : 0);

  const lisaScene = async () => {
    g.audio.sfx('whisper');
    g.setFlicker(true, 0.6);
    await sleep(700);
    await g.view('lisa');
    lisaTarget = 0.85;
    await sleep(1200);
    await g.say([
      { who: 'lisa', key: 'mac.lisa1' },
      { who: 'diego', key: 'mac.lisa2' },
      { who: 'lisa', key: 'mac.lisa3' },
      { who: 'lisa', key: 'mac.lisa4' },
      { who: 'diego', key: 'mac.lisa5' },
      { who: 'lisa', key: 'mac.lisa6' },
      { who: 'lisa', key: 'mac.lisa7' },
    ]);
    g.set('metLisa');
    g.diaryPage('lisa1');
    g.note('note.barber');
    g.updateLisaBadge();
    await g.say([{ who: 'narr', key: 'mac.diaryGiven' }]);
    // the cella
    g.audio.hush(6);
    g.audio.sfx('thud');
    g.engine.shake(0.03, 0.3);
    await sleep(900);
    g.audio.sfx('thud');
    g.engine.shake(0.05, 0.3);
    lisaTarget = 0.35;
    await g.say([{ who: 'lisa', key: 'mac.lisa8' }]);
    lisaTarget = 0;
    await chase();
  };

  const chase = async () => {
    await g.view('cella', 0.6);
    g.audio.sfx('thud');
    g.engine.shake(0.08, 0.4);
    await sleep(700);
    // door swings open, cold light, Bruno
    g.audio.sfx('creak');
    coldLight.intensity = 25;
    bruno.visible = true;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 900, 1);
        doorPivot.rotation.y = k * 1.5;
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    neonOn = 0.15;
    g.setFlicker(true, 1);
    g.audio.steps(3, 0.5);
    for (let i = 0; i < 30; i++) {
      bruno.position.z = -3.9 + (i / 30) * 1.6;
      await sleep(40);
    }
    (bruno.userData.eyes as THREE.Group).visible = true;
    await g.say([{ who: 'bruno', key: 'mac.bruno1' }]);
    await g.scare('bruno');
    g.audio.sfx('heart');
    const ok = await g.ui.quick(t('ui.run'), 3200);
    if (!ok) {
      bruno.position.z = -0.2;
      await g.scare('bruno', 450);
      await g.say([{ who: 'narr', key: 'mac.caught' }]);
    }
    await g.ui.fadeOut(300);
    g.setFlicker(false);
    g.set('fledButcher');
    g.rebuild('map');
    await g.say([{ who: 'diego', key: 'mac.outside1' }, { who: 'diego', key: 'mac.outside2' }]);
    await g.go('map', false);
    await g.ui.fadeIn(600);
  };

  const after = async () => {
    if (!g.flag('metLisa') && seen() >= 3) await lisaScene();
  };

  const hotspots: Hotspot[] = [
    { id: 'counter', obj: hCounter, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'mac.counter1' }, { who: 'diego', key: 'mac.counter2' }]);
      if (!g.flag('m.counter')) g.set('m.counter');
      await after();
    } },
    { id: 'book', obj: hBook, view: 'book', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('mac.ledgerTitle'), t('mac.ledgerText'));
      if (!g.flag('m.book')) {
        g.set('m.book');
        g.note('note.ledger');
      }
      await after();
    } },
    { id: 'scale', obj: hScale, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.scale');
    } },
    { id: 'photo', obj: hPhoto, view: 'photo', tap: async (item) => {
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'mac.photo1' }, { who: 'diego', key: 'mac.photo2' }]);
      if (!g.flag('m.photo')) g.set('m.photo');
      await after();
    } },
    { id: 'cella', obj: hCella, view: 'cella', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('thud');
      await g.say('mac.cella');
    } },
    { id: 'hooks', obj: hHooks, tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.hooks');
    } },
    { id: 'stairs', obj: hStairs, tap: async (item) => {
      if (item) return g.nope();
      await g.say('mac.stairs');
    } },
  ];

  return {
    id: 'macelleria',
    nameKey: 'place.macelleria',
    scene,
    drone: 'macelleria',
    startView: 'main',
    views: {
      main: { pos: [0, 1.6, 2.4], look: [-0.4, 1.2, -3], yaw: 40, pitch: 14 },
      counter: { pos: [-0.8, 1.75, 0.55], look: [-0.8, 0.85, -0.85], parent: 'main', yaw: 30, pitch: 10 },
      book: { pos: [-2.0, 1.5, 0.05], look: [-2.05, 0.9, -0.75], parent: 'main', yaw: 15, pitch: 8, fov: 55 },
      photo: { pos: [-2.4, 1.62, 0.6], look: [-3.5, 1.62, 0.6], parent: 'main', yaw: 15, pitch: 8, fov: 50 },
      cella: { pos: [1.0, 1.6, 0.6], look: [1.9, 1.25, -3], parent: 'main', yaw: 15, pitch: 8 },
      lisa: { pos: [-1.0, 1.5, 0.6], look: [-2.75, 1.25, -1.75], parent: 'main', yaw: 10, pitch: 6 },
    },
    hotspots,
    canLeave: () => !g.busy,
    update: (dt, time) => {
      // neon: buzzing, sometimes dropping
      const drop = Math.random() < 0.015 ? 0.1 : 1;
      neon.intensity = 14 * neonOn * drop;
      (tube.material as THREE.MeshBasicMaterial).color.setScalar(neonOn * drop > 0.5 ? 1 : 0.25);
      scene.traverse((o) => {
        if (o.userData.sway !== undefined) o.rotation.z = Math.sin(time * 0.6 + o.userData.sway) * 0.03;
      });
      const m = lisa.material as THREE.SpriteMaterial;
      m.opacity += (lisaTarget * (0.85 + Math.sin(time * 7) * 0.1) - m.opacity) * Math.min(dt * 2, 1);
      lisa.position.y = 0.95 + Math.sin(time * 1.3) * 0.03;
    },
    enter: async () => {
      g.audio.buzz(true);
      if (g.flag('metLisa') && !g.flag('fledButcher')) {
        // reloaded in the middle of the escape: Bruno is still coming
        await sleep(600);
        await chase();
        return;
      }
      if (!g.flag('m.entered')) {
        g.set('m.entered');
        await sleep(500);
        await g.say([
          { who: 'diego', key: 'mac.enter1' },
          { who: 'diego', key: 'mac.enter2' },
          { who: 'narr', key: 'mac.enter3' },
        ]);
      }
    },
    leave: () => g.audio.buzz(false),
    hint: () => 'hint.macelleria',
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
