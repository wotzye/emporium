import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, mat, hitBox, dust, canvasTex, noise, woodMaterial, cyl, lathe } from '../builders';
import { createLisa, createMerchant } from '../characters';
import { prop } from '../models';
import { t } from '../i18n';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** the flight across the room, among the floating suitcases, to the window ('S' start, 'E' Lisa) */
export const SKY = [
  '###############',
  '#S....#.......#',
  '#.##..#..###..#',
  '#..#.....#....#',
  '##.#.###.#.##.#',
  '#..#...#...#..#',
  '#.####.#####.##',
  '#......#.....E#',
  '###############',
];

/**
 * Inside Lisa's suitcase: her dream. The room they shared as children, as she remembers it:
 * two small beds, the striped wallpaper, a window full of a Sunday that never ends; the ceiling
 * is the lining of the lid, and suitcases float in the air like thoughts. Lisa stands at the
 * window, humming, and doesn't hear him, until he gives her back her ribbon.
 * Then the man in black comes for what is his. Diego chooses; and turns the hourglass.
 */
export function createValigiaSogno(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.Fog(0x1a1a1a, 3, 9);
  scene.userData.envIntensity = 0.12;
  const W = 4.4, H = 2.8, D = 4.6;
  const paper = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#b9b2a4';
      c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = 'rgba(70,64,56,0.35)';
        c.fillRect(x, 0, 10, h);
        c.fillStyle = 'rgba(70,64,56,0.15)';
        for (let y = 8; y < h; y += 24) c.fillRect(x + 18, y, 6, 6);
      }
      noise(c, w, h, 3000, 0.1);
    }, [4, 2]),
    roughness: 0.9,
  });
  const lining = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#5a5048';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(30,26,22,0.6)';
      c.lineWidth = 3;
      for (let i = -h; i < w; i += 24) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + h, h);
        c.stroke();
      }
      noise(c, w, h, 2000, 0.12);
    }, [3, 3]),
    roughness: 0.8,
  });
  scene.add(room(W, H, D, { wall: paper, floor: woodMaterial({ base: '#4a3a2a', repeat: [3, 3], plank: true }), ceil: lining }));
  // the lid's straps across the ceiling
  for (const x of [-1.2, 1.2]) scene.add(rbox(0.18, 0.02, D, 0.005, mat(0x2a1e16, { roughness: 0.6 }), x, H - 0.02, 0));
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.14));
  // the window: a Sunday that never ends
  const win = mesh(new THREE.PlaneGeometry(1.2, 1.3), new THREE.MeshBasicMaterial({ color: 0xf2efe6 }), 0.6, 1.5, -D / 2 + 0.01, false);
  win.userData.noPick = true;
  scene.add(win);
  for (const [x, y, w, h] of [[0.6, 1.5, 0.05, 1.3], [0.6, 1.5, 1.2, 0.05], [0.6, 2.17, 1.3, 0.06], [0.6, 0.83, 1.3, 0.08]] as const) scene.add(rbox(w, h, 0.06, 0.01, mat(0xd8d2c6), x, y, -D / 2 + 0.03));
  const sun = new THREE.SpotLight(0xfff6e2, 9, 9, 0.6, 0.7, 1.2);
  sun.position.set(0.6, 1.9, -D / 2 - 0.6);
  sun.target.position.set(0.2, 0, 0.6);
  sun.castShadow = true;
  scene.add(sun, sun.target);
  const motes = dust([-2, 0.2, -2.2], [2, 2.6, 2.2], 200);
  scene.add(motes.points);

  // two small beds
  const quilt = mat(0xcfc8ba, { roughness: 1 });
  const bedWood = woodMaterial({ base: '#5a4330' });
  for (const x of [-1.5, 1.5]) {
    scene.add(rbox(0.9, 0.35, 1.8, 0.03, bedWood, x, 0.2, 0.6));
    scene.add(rbox(0.86, 0.12, 1.7, 0.05, quilt, x, 0.43, 0.62));
    scene.add(rbox(0.9, 0.7, 0.06, 0.02, bedWood, x, 0.55, -0.32));
    scene.add(rbox(0.5, 0.1, 0.3, 0.05, mat(0xe8e4da, { roughness: 1 }), x, 0.53, -0.08));
  }
  // her doll on her bed
  const doll = prop('doll', { height: 0.32, turn: Math.PI });
  if (doll) {
    doll.position.set(1.4, 0.49, -0.05);
    scene.add(doll);
  }
  // the door, where he will come in
  scene.add(rbox(0.9, 2.05, 0.06, 0.02, woodMaterial({ base: '#3a2c20' }), -1.4, 1.025, D / 2 - 0.04));

  // suitcases floating in the air, like thoughts
  const floaters: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const id = (['suitA', 'suitB', 'suitC', 'suitD'] as const)[i % 4];
    const s = prop(id, { width: 0.45 + (i % 3) * 0.1, grey: 0.8 }) ?? rbox(0.45, 0.16, 0.3, 0.02, mat(0x4a4038), 0, 0, 0);
    const holder = new THREE.Group();
    holder.add(s);
    holder.position.set(-1.6 + (i % 3) * 1.6, 1.9 + (i % 2) * 0.35, -1.2 + Math.floor(i / 3) * 1.8);
    holder.userData.ph = i * 1.7;
    holder.traverse((o) => (o.userData.noPick = true));
    scene.add(holder);
    floaters.push(holder);
  }

  // Lisa, at the window
  const lisaC = createLisa(0);
  const lisa = lisaC.group;
  lisa.position.set(0.6, 0, -D / 2 + 0.7);
  lisa.rotation.y = Math.PI;
  scene.add(lisa);
  let lisaOp = 0.55, lisaTarget = 0.55;
  // the ribbon in her hair, once she has it back
  const ribbonM = mat(0xece8e0, { roughness: 0.7 });
  const bow = new THREE.Group();
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12), ribbonM, s * 0.035, 0, 0);
    loop.scale.y = 0.6;
    bow.add(loop);
  }
  bow.position.set(0.6, 1.55, -D / 2 + 0.62);
  bow.visible = !!g.flag('v.ribbon');
  scene.add(bow);

  // the man in black, and his hourglass
  const merC = createMerchant();
  const mer = merC.group;
  mer.position.set(-1.4, 0, D / 2 - 0.5);
  mer.rotation.y = Math.PI;
  mer.visible = false;
  mer.traverse((o) => (o.userData.noPick = true));
  scene.add(mer);
  const brass = mat(0x8a7444, { metalness: 0.85, roughness: 0.35 });
  const hourglass = new THREE.Group();
  hourglass.add(lathe([[0, 0], [0.045, 0], [0.045, 0.006], [0.04, 0.03], [0.006, 0.075], [0.04, 0.12], [0.045, 0.144], [0.045, 0.15], [0, 0.15]], new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 }), 0, 0, 0, 16));
  for (const y of [0, 0.15]) hourglass.add(cyl(0.055, 0.055, 0.012, brass, 0, y, 0, 16));
  const sand = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.04, 14), mat(0xcfc4a8, { roughness: 1 }));
  sand.position.y = 0.11;
  sand.rotation.x = Math.PI;
  hourglass.add(sand);
  hourglass.scale.setScalar(1.6);
  hourglass.position.set(-0.9, 0.9, 1.2);
  hourglass.visible = false;
  scene.add(hourglass);
  // when he goes: sand
  const sandFall = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 600 * 3 }, (_, i) => (i % 3 === 1 ? Math.random() * 2 : (Math.random() - 0.5) * 0.6)), 3)),
    new THREE.PointsMaterial({ color: 0xcfc4a8, size: 0.02, transparent: true, opacity: 0 }),
  );
  sandFall.position.copy(mer.position);
  scene.add(sandFall);
  let sandK = -1;

  const fadeMer = (k: number) =>
    mer.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
        x.transparent = true;
        x.opacity = k;
        x.depthWrite = k > 0.9;
      }
    });

  // ---------------- hotspots ----------------
  const hLisa = hitBox(0.7, 1.7, 0.6, 0.6, 0.85, -D / 2 + 0.7, 'lisa');
  const hDoll = hitBox(0.35, 0.4, 0.35, 1.4, 0.65, -0.05, 'doll');
  const hBeds = hitBox(4, 0.7, 2, 0, 0.35, 0.6, 'beds');
  const hWin = hitBox(1.3, 1.4, 0.2, 0.6, 1.5, -D / 2 + 0.1, 'window');
  const hDoor = hitBox(1.0, 2.1, 0.3, -1.4, 1.05, D / 2 - 0.15, 'door');
  scene.add(hLisa, hDoll, hBeds, hWin, hDoor);
  const say = (k: string) => g.say(k);

  // ---------------- the two nightmares that always come back ----------------
  /** falling: the floor isn't there any more. You wake from it with a jolt: jump. */
  const fall = async () => {
    g.audio.hush(4);
    g.audio.sfx('creak');
    g.engine.shake(0.05, 0.6);
    await g.say([{ who: 'diego', key: 'v.fall1' }]);
    g.audio.sfx('whistle');
    await g.view('fall', 1.4);
    for (;;) {
      g.engine.shake(0.04, 1.5);
      const ok = await g.physical('jump', 'v.fallText');
      if (ok) break;
      await g.say([{ who: 'diego', key: 'v.fallAgain' }]);
    }
    g.audio.sfx('thud');
    g.engine.shake(0.08, 0.3);
    g.set('v.fall');
    await g.view('main', 0.3);
    await g.say([{ who: 'diego', key: 'v.fall2' }, { who: 'diego', key: 'v.fall3' }]);
  };
  /** flying: you can't walk to her, the room stretches; your feet leave the floor. Steer with the phone. */
  const fly = async () => {
    await g.say([{ who: 'diego', key: 'v.fly1' }, { who: 'diego', key: 'v.fly2' }]);
    await g.view('fly', 1.6);
    const ok = await g.ui.tiltMaze(t('v.flyTitle'), t('v.flyText'), SKY, g.settings.sensors ?? true, () => g.audio.sfx('thud'));
    if (!ok) {
      await g.view('main', 0.8);
      return say('v.flyFail');
    }
    g.set('v.fly');
    await g.view('lisa', 1.0);
    await say('v.fly3');
  };

  /** the end: the choice, the hourglass, goodbye */
  const finale = async () => {
    g.audio.hush(6);
    g.audio.sfx('creak');
    await sleep(600);
    mer.visible = true;
    fadeMer(0);
    for (let i = 0; i <= 20; i++) {
      fadeMer(i / 20);
      await sleep(50);
    }
    merC.setEyes(true);
    hourglass.visible = true;
    sun.intensity = 3;
    await g.view('door', 0.8);
    await g.say([
      { who: 'mercante', key: 'fin.m1' },
      { who: 'mercante', key: 'fin.m2' },
      { who: 'diego', key: 'fin.d1' },
      { who: 'mercante', key: 'fin.m3' },
    ]);
    for (;;) {
      const c = await g.ui.choice(t('fin.choiceTitle'), t('fin.choiceText'), [t('fin.choiceForget'), t('fin.choiceStay')]);
      if (c === 1) break;
      // the other way: it ends here, again, for ever. Then back to the moment.
      await g.ui.fadeOut(900);
      await g.ui.cards(['fin.bad1', 'fin.bad2', 'fin.bad3']);
      await g.ui.fadeIn(600);
      await g.say([{ who: 'lisa', key: 'fin.again' }]);
    }
    await g.say([{ who: 'diego', key: 'fin.d2' }, { who: 'mercante', key: 'fin.m4' }, { who: 'lisa', key: 'fin.l1' }]);
    g.audio.sfx('heart');
    for (;;) {
      const ok = await g.physical('flip', 'fin.flipText');
      if (ok) break;
      await g.say([{ who: 'lisa', key: 'fin.l2' }]);
    }
    // the sand runs out of him
    hourglass.rotation.z = Math.PI;
    g.audio.rec('possessed', { gain: 0.5, dur: 3 });
    g.engine.shake(0.06, 1.2);
    merC.setEyes(false);
    sandK = 0;
    for (let i = 20; i >= 0; i--) {
      fadeMer(i / 20);
      mer.scale.y = 0.5 + (i / 20) * 0.5;
      await sleep(90);
    }
    mer.visible = false;
    hourglass.visible = false;
    sun.intensity = 12;
    await sleep(1200);
    await g.view('main', 0.8);
    lisaTarget = 1;
    await g.say([
      { who: 'lisa', key: 'fin.l3' },
      { who: 'diego', key: 'fin.d3' },
      { who: 'lisa', key: 'fin.l4' },
      { who: 'lisa', key: 'fin.l5' },
      { who: 'diego', key: 'fin.d4' },
    ]);
    lisaTarget = 0;
    g.audio.musicBox({ gain: 0.5, runDown: true, bars: 13 });
    await sleep(1500);
    g.set('finale');
    g.diaryPage('finale');
    g.rebuild('map');
    g.rebuild('emporio');
    await g.ui.fadeOut(1500);
    await g.ui.cards(['fin.end1', 'fin.end2', 'fin.end3', 'fin.end4', 'fin.end5']);
    g.audio.musicBox({ gain: 0.35, bars: 24 });
    await g.ui.rollCredits(`${import.meta.env.MODE === 'single' ? './' : import.meta.env.BASE_URL}logo.jpg`, t('title.name'), t('fin.creditsHead') + '\n\n' + t('ui.creditsText') + '\n\n' + t('fin.creditsTail'));
    await g.go('map', false);
  };

  const hotspots: Hotspot[] = [
    { id: 'lisa', obj: hLisa, view: 'lisa', tap: async (item) => {
      if (g.flag('finale')) return item ? g.nope() : say('fin.after');
      if (!g.flag('v.fly')) {
        if (item) g.deselect();
        return fly();
      }
      if (item === 'ribbon') {
        g.deselect();
        g.take('ribbon');
        g.set('v.ribbon');
        bow.visible = true;
        g.audio.sfx('whisper');
        lisaTarget = 0.95;
        // she turns round
        for (let i = 0; i <= 20; i++) {
          lisa.rotation.y = Math.PI - (i / 20) * Math.PI;
          await sleep(40);
        }
        await g.say([
          { who: 'lisa', key: 'v.l1' },
          { who: 'diego', key: 'v.d1' },
          { who: 'lisa', key: 'v.l2' },
          { who: 'diego', key: 'v.d2' },
          { who: 'lisa', key: 'v.l3' },
          { who: 'lisa', key: 'v.l4' },
        ]);
        return finale();
      }
      if (item) return g.nope();
      if (g.flag('v.ribbon')) return finale();
      return g.say([{ who: 'diego', key: 'v.lisaHum1' }, { who: 'diego', key: 'v.lisaHum2' }]);
    } },
    { id: 'doll', obj: hDoll, tap: async (item) => {
      if (item) return g.nope();
      return say('v.doll');
    } },
    { id: 'beds', obj: hBeds, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('v.beds');
    } },
    { id: 'window', obj: hWin, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('v.window');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, exit: false, tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('finale')) return say('fin.door');
      // the falling dream comes back whenever it likes
      await say('v.door');
      return fall();
    } },
  ];

  return {
    id: 'valigia_sogno',
    nameKey: 'place.sogno',
    next: ['valigia_bottega'],
    scene,
    drone: 'none',
    startView: 'main',
    exitTo: 'valigia_bottega',
    canLeave: () => !g.busy,
    dark: () => false,
    views: {
      main: { pos: [-0.4, 1.6, 1.9], look: [0.3, 1.1, -1.6], yaw: 60, pitch: 20 },
      fall: { pos: [-0.4, -2.6, 1.9], look: [0.0, 1.2, 0.0], yaw: 10, pitch: 10, fov: 80 },
      fly: { pos: [0.0, 2.45, 1.6], look: [0.4, 1.6, -1.6], yaw: 10, pitch: 10, fov: 75 },
      lisa: { pos: [0.2, 1.45, -0.2], look: [0.6, 1.2, -D / 2 + 0.7], parent: 'main', yaw: 20, pitch: 12 },
      door: { pos: [0.6, 1.55, -0.6], look: [-1.4, 1.4, D / 2 - 0.5], yaw: 15, pitch: 10 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      floaters.forEach((f) => {
        f.position.y += Math.sin(time * 0.6 + f.userData.ph) * 0.0015;
        f.rotation.y = time * 0.08 + f.userData.ph;
        f.rotation.z = Math.sin(time * 0.4 + f.userData.ph) * 0.15;
      });
      lisaOp += (lisaTarget - lisaOp) * Math.min(dt * 1.5, 1);
      lisaC.setOpacity(lisaOp);
      lisa.visible = lisaOp > 0.02;
      if (lisa.visible) lisaC.update(dt, time, g.engine.camera);
      bow.visible = !!g.flag('v.ribbon') && lisa.visible;
      if (mer.visible) merC.update(dt, time, g.engine.camera);
      if (sandK >= 0) {
        sandK += dt;
        const pm = sandFall.material as THREE.PointsMaterial;
        pm.opacity = Math.max(0, 0.9 - sandK * 0.25);
        sandFall.position.y = -sandK * 0.6;
        if (pm.opacity <= 0) sandK = -1;
      }
    },
    enter: async () => {
      if (!g.flag('v.dream')) {
        g.set('v.dream');
        g.audio.musicBox({ gain: 0.35, bars: 9 });
        await sleep(600);
        await g.say([{ who: 'diego', key: 'v.dream1' }, { who: 'diego', key: 'v.dream2' }, { who: 'diego', key: 'v.dream3' }]);
      }
      if (!g.flag('v.fall')) await fall();
    },
    hint: () => (g.flag('finale') ? 'hint.fin.after' : !g.flag('v.fly') ? 'hint.v.fly' : g.flag('v.ribbon') ? 'hint.v.lisaAgain' : 'hint.v.ribbon'),
    debug: { finale, fall, fly },
  };
}
