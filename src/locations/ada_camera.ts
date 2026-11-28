import * as THREE from 'three';
import { prop } from '../models';
import { createAdaGhost } from '../characters';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, mat, mesh, rbox, cyl, lathe, sphere, textPlane, hitBox, canvasTex, noise, woodMaterial, dust } from '../builders';
import { t } from '../i18n';
import { wallpaper, doilyTex, sleep } from './ada_common';

/**
 * Ada's bedroom, reached from the garden through the French window. The double bed made on one
 * side only. In the wardrobe: Ettore's suit, his crutch, and Ada's work basket (thread, a seam
 * ripper). By the wall, her treadle sewing machine and the gramophone: thread the machine, put the
 * waltz on, work the treadle in time, and the machine sews a message by itself: SCUCI L'ORLO.
 * (The music box on the dressing table still plays; it only holds memories now.)
 */
/** the treadle, in waltz time like the record: toc ... toc toc ... toc toc */
const SEW_RHYTHM = 'LSLS';
const TURNS = 2;

export function createAdaCamera(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.07;
  const W = 4.0, H = 2.6, D = 3.8;
  const walnut = woodMaterial({ base: '#3a2a1c' });
  const walnutL = woodMaterial({ base: '#56402c' });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35 });
  scene.add(room(W, H, D, {
    wall: wallpaper('#b6aea2', [2.4, 1.3]),
    floor: woodMaterial({ base: '#4a3a2b', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#2d261f', repeat: [2, 2], plank: true }),
  }));

  // light: moonlight through the French window (left wall) and a small bedside lamp
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const moon = new THREE.SpotLight(0xb9c6d2, 7, 7, 0.55, 0.8, 1.3);
  moon.position.set(-W / 2 - 0.3, 1.9, 0.4);
  moon.target.position.set(0.6, 0.3, -0.4);
  scene.add(moon, moon.target);
  const lampL = new THREE.PointLight(0xffdcae, 1.6, 3.5, 1.7);
  lampL.position.set(1.35, 1.0, -1.45);
  scene.add(lampL);
  const motes = dust([-1.9, 0.2, -1.8], [1.9, 2.4, 1.8], 120);
  scene.add(motes.points);
  // the French window we came in by
  const fwTex = canvasTex(128, 192, (c, w, h) => {
    c.fillStyle = '#1f262d';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(40,46,40,0.9)';
    for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, 0, 3, Math.random() * h * 0.5);
    c.strokeStyle = '#d8d2c6';
    c.lineWidth = 6;
    c.strokeRect(3, 3, w - 6, h - 6);
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    for (const y of [0.25, 0.5, 0.75]) {
      c.moveTo(0, h * y);
      c.lineTo(w, h * y);
    }
    c.stroke();
  });
  scene.add(mesh(new THREE.PlaneGeometry(1.2, 2.1), new THREE.MeshBasicMaterial({ map: fwTex }), -W / 2 + 0.012, 1.05, 0.4, false).rotateY(Math.PI / 2));
  // net curtains
  for (const s of [-1, 1]) {
    const cg = new THREE.PlaneGeometry(0.45, 2.2, 6, 6);
    const p = cg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 25) * 0.02);
    scene.add(mesh(cg, new THREE.MeshStandardMaterial({ color: 0xe2ddd2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 1 }), -W / 2 + 0.08, 1.15, 0.4 + s * 0.55, false).rotateY(Math.PI / 2));
  }

  // ---------------- the bed (back wall, centre): made on her side only ----------------
  const bedX = 0.2, bedZ = -1.0;
  const bed = new THREE.Group();
  bed.add(rbox(1.5, 0.35, 2.0, 0.03, walnut, 0, 0.25, 0));
  bed.add(rbox(1.6, 1.15, 0.08, 0.03, walnut, 0, 0.6, -1.0));
  bed.add(rbox(1.6, 0.6, 0.08, 0.03, walnut, 0, 0.35, 1.0));
  const quilt = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#cfc8bb';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < w; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, h);
      c.moveTo(0, i);
      c.lineTo(w, i);
      c.stroke();
    }
    noise(c, w, h, 3000, 0.08);
  });
  const qm = new THREE.MeshStandardMaterial({ map: quilt, roughness: 1 });
  bed.add(rbox(0.74, 0.12, 1.55, 0.04, qm, -0.37, 0.48, 0.2)); // her side: smooth
  const folded = rbox(0.74, 0.16, 0.5, 0.05, qm, 0.37, 0.5, 0.75); // his side: folded down, never slept in
  bed.add(folded);
  bed.add(rbox(0.72, 0.06, 1.1, 0.02, mat(0xe6e1d6, { roughness: 1 }), 0.37, 0.44, -0.05));
  for (const s of [-1, 1]) bed.add(rbox(0.55, 0.12, 0.32, 0.06, mat(0xe6e1d6, { roughness: 1 }), s * 0.37, 0.54, -0.78));
  bed.position.set(bedX, 0, bedZ);
  scene.add(bed);
  // nightstand with the lamp
  scene.add(rbox(0.45, 0.6, 0.4, 0.02, walnut, 1.35, 0.3, -1.5));
  scene.add(cyl(0.05, 0.08, 0.3, mat(0xb8b0a0), 1.35, 0.75, -1.5, 12));
  scene.add(lathe([[0.08, 0], [0.16, 0], [0.12, 0.18], [0.06, 0.18]], new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 1, side: THREE.DoubleSide, emissive: 0x3a2e1e }), 1.35, 0.9, -1.5, 16));

  // ---------------- the dressing table (right wall) with the music box ----------------
  const dtX = W / 2 - 0.3, dtZ = 0.55, dtY = 0.75;
  const dresser = new THREE.Group();
  dresser.add(rbox(0.5, 0.04, 1.1, 0.01, walnutL, 0, dtY, 0));
  for (const z of [-0.5, 0.5]) dresser.add(rbox(0.45, dtY, 0.08, 0.01, walnut, 0, dtY / 2, z));
  const doily = mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshStandardMaterial({ map: doilyTex(), transparent: true, roughness: 1 }), 0, dtY + 0.022, -0.2, false);
  doily.rotation.x = -Math.PI / 2;
  dresser.add(doily);
  // the oval mirror
  const mirrorFrame = mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 40), walnut, 0.18, dtY + 0.5, 0, false);
  mirrorFrame.scale.y = 1.35;
  mirrorFrame.rotation.y = Math.PI / 2;
  dresser.add(mirrorFrame);
  const mirror = mesh(new THREE.CircleGeometry(0.31, 40), new THREE.MeshStandardMaterial({ color: 0xa9adb0, roughness: 0.04, metalness: 1 }), 0.17, dtY + 0.5, 0, false);
  mirror.scale.y = 1.35;
  mirror.rotation.y = -Math.PI / 2;
  dresser.add(mirror);
  // hairbrush, a perfume bottle, a photo turned face down
  dresser.add(rbox(0.06, 0.03, 0.22, 0.015, walnutL, -0.05, dtY + 0.035, 0.3));
  dresser.add(lathe([[0, 0], [0.04, 0], [0.045, 0.06], [0.015, 0.09], [0.02, 0.12], [0, 0.12]], new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05 }), -0.08, dtY + 0.02, -0.4, 14));
  dresser.add(rbox(0.12, 0.008, 0.16, 0.002, mat(0x1e1915), -0.1, dtY + 0.026, 0.05));
  // the music box: lacquered, with a dancer under a glass lid and a winding key in front
  const mb = new THREE.Group();
  mb.add(rbox(0.16, 0.08, 0.12, 0.01, mat(0x4a2424, { roughness: 0.25 }), 0, 0.04, 0));
  mb.add(cyl(0.05, 0.05, 0.08, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 }), 0, 0.12, 0, 16));
  const dancer = new THREE.Group();
  dancer.add(cyl(0.004, 0.004, 0.04, mat(0xd8d2c8), 0, 0.1, 0, 5));
  dancer.add(mesh(new THREE.ConeGeometry(0.018, 0.02, 10), mat(0xe8e2d8), 0, 0.105, 0));
  dancer.add(sphere(0.006, mat(0xd8d2c8), 0, 0.13, 0, 8));
  mb.add(dancer);
  const mbDrawer = rbox(0.12, 0.025, 0.1, 0.004, mat(0x3a1c1c, { roughness: 0.3 }), 0, 0.013, 0);
  mb.add(mbDrawer);
  const wardKey = new THREE.Group();
  wardKey.add(cyl(0.003, 0.003, 0.04, brass, 0, 0, 0, 6).rotateZ(Math.PI / 2));
  wardKey.add(mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 10), brass, -0.025, 0, 0).rotateX(Math.PI / 2));
  wardKey.position.set(0.035, 0.03, 0);
  wardKey.scale.setScalar(1.8);
  const hKey = hitBox(0.08, 0.05, 0.08, 0.035, 0.035, 0, 'mbkey');
  mbDrawer.add(hKey);
  mbDrawer.add(wardKey);
  const winder = new THREE.Group();
  winder.add(cyl(0.004, 0.004, 0.03, brass, 0, 0, 0.015, 6).rotateX(Math.PI / 2));
  winder.add(rbox(0.035, 0.012, 0.004, 0.002, brass, 0, 0, 0.032));
  winder.position.set(0, 0.04, 0.06);
  mb.add(winder);
  mb.position.set(-0.05, dtY + 0.02, -0.2);
  mb.rotation.y = -Math.PI / 2; // the key faces the room
  dresser.add(mb);
  dresser.position.set(dtX, 0, dtZ);
  scene.add(dresser);
  const stool = prop('stool', { height: 0.45 });
  if (stool) {
    stool.position.set(dtX - 0.55, 0, dtZ + 0.1);
    scene.add(stool);
  }
  const boxPlayed = () => !!g.flag('ac.music');
  if (boxPlayed()) mbDrawer.position.x = 0.09;
  wardKey.visible = false;

  // ---------------- the wardrobe (left, back corner) ----------------
  const wX = -1.35, wZ = -1.45;
  const ward = new THREE.Group();
  ward.add(rbox(1.2, 2.2, 0.6, 0.02, walnut, 0, 1.1, 0));
  ward.add(rbox(1.26, 0.1, 0.66, 0.02, walnutL, 0, 2.22, 0));
  ward.add(mesh(new THREE.PlaneGeometry(1.1, 2.05), new THREE.MeshBasicMaterial({ color: 0x060504 }), 0, 1.1, 0.301, false));
  // Ettore's suit on a hanger, and the crutch leaning inside
  const suit = new THREE.Group();
  suit.add(cyl(0.004, 0.004, 0.4, brass, 0, 1.92, 0.05, 5).rotateZ(Math.PI / 2));
  suit.add(rbox(0.42, 0.75, 0.12, 0.05, mat(0x26241f, { roughness: 0.9 }), 0, 1.5, 0.05));
  suit.add(rbox(0.12, 0.6, 0.1, 0.04, mat(0x22201c, { roughness: 0.9 }), -0.25, 1.4, 0.05).rotateZ(0.05));
  const sleeve = rbox(0.12, 0.6, 0.1, 0.04, mat(0x22201c, { roughness: 0.9 }), 0.25, 1.4, 0.05);
  suit.add(sleeve);
  suit.add(rbox(0.1, 0.18, 0.02, 0.01, mat(0xe2ddd2), 0, 1.75, 0.12));
  suit.position.x = -0.2;
  ward.add(suit);
  const crutch = new THREE.Group();
  const cm = prop('crutches', { height: 1.25, only: /crutch01/ });
  if (cm) crutch.add(cm);
  else crutch.add(rbox(0.06, 1.25, 0.04, 0.01, walnutL, 0, 0.62, 0));
  crutch.position.set(0.3, 0.02, 0.05);
  crutch.rotation.z = -0.1;
  ward.add(crutch);
  const doorL = new THREE.Group();
  doorL.position.set(-0.58, 0, 0.31);
  doorL.add(rbox(0.56, 2.1, 0.03, 0.01, walnutL, 0.28, 1.1, 0));
  const doorR = new THREE.Group();
  doorR.position.set(0.58, 0, 0.31);
  doorR.add(rbox(0.56, 2.1, 0.03, 0.01, walnutL, -0.28, 1.1, 0));
  doorR.add(cyl(0.012, 0.012, 0.03, brass, -0.52, 1.1, 0.03, 8).rotateX(Math.PI / 2));
  ward.add(doorL, doorR);
  // a faint light inside, as if from the moon through a crack: enough to see the suit and the crutch
  const wl = new THREE.PointLight(0xc8d2dc, 1.3, 1.8, 1.5);
  wl.position.set(0, 1.5, 0.12);
  ward.add(wl);
  ward.position.set(wX, 0, wZ);
  ward.rotation.y = 0.35;
  scene.add(ward);
  const wardOpen = () => !!g.flag('ac.ward');
  const setWard = (k: number) => {
    doorL.rotation.y = -k * 1.8;
    doorR.rotation.y = k * 1.8;
  };
  setWard(wardOpen() ? 1 : 0);
  crutch.visible = !g.flag('a.crutch');

  // ---------------- Ada's sewing machine (right wall, back) and the gramophone (right wall, front) ----------------
  const mX = W / 2 - 0.32, mZ = -0.55, mY = 0.76;
  const woodMid = woodMaterial({ base: '#5a4430' });
  scene.add(rbox(0.55, 0.04, 1.0, 0.01, woodMid, mX, mY, mZ));
  for (const [x, z] of [[-0.22, -0.45], [0.22, -0.45], [-0.22, 0.45], [0.22, 0.45]]) scene.add(rbox(0.04, mY, 0.04, 0.005, walnut, mX + x, mY / 2, mZ + z));
  scene.add(rbox(0.3, 0.03, 0.6, 0.005, mat(0x2a2826, { metalness: 0.6, roughness: 0.5 }), mX - 0.05, 0.12, mZ).rotateZ(-0.2));
  const machine = prop('sewing', { width: 0.55, grey: 0.9, turn: -Math.PI / 2 });
  const mach = machine ?? rbox(0.2, 0.3, 0.45, 0.03, mat(0x1a1a1a), 0, 0.15, 0);
  mach.position.set(mX + 0.02, mY + 0.02, mZ);
  scene.add(mach);
  scene.add(rbox(0.25, 0.004, 0.4, 0.002, mat(0xd8d2c4, { roughness: 1 }), mX - 0.12, mY + 0.025, mZ + 0.15));
  const words = textPlane([t('sew.words')], 0.36, 0.08, { bg: 'transparent', fg: '#1a1814', size: 40, px: 96, font: "'Bradley Hand', 'Segoe Print', cursive" });
  words.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  words.position.set(mX - 0.12, mY + 0.034, mZ + 0.15);
  (words.material as THREE.MeshStandardMaterial).depthWrite = false;
  words.renderOrder = 2;
  words.visible = !!g.flag('a.sewn');
  scene.add(words);
  const thread = cyl(0.015, 0.015, 0.035, mat(0x2a2622, { roughness: 0.8 }), mX + 0.02, mY + 0.32, mZ - 0.1, 10);
  thread.visible = !!g.flag('a.threaded');
  scene.add(thread);
  const sewLamp = new THREE.PointLight(0xffdcae, 1.2, 2.2, 1.6);
  sewLamp.position.set(mX - 0.3, 1.5, mZ);
  scene.add(sewLamp);
  const gX = W / 2 - 0.35, gZ = 1.45;
  scene.add(rbox(0.55, 0.6, 0.45, 0.02, woodMid, gX, 0.3, gZ));
  const gram = prop('gramophone', { height: 0.55, turn: -Math.PI / 2, grey: 0.9 });
  if (gram) {
    gram.position.set(gX, 0.6, gZ);
    scene.add(gram);
  }
  // Ada, when the machine sews by itself
  const ada = createAdaGhost();
  ada.group.traverse((o) => (o.userData.noPick = true));
  ada.setOpacity(0);
  ada.group.position.set(mX - 0.6, 0, mZ + 0.2);
  scene.add(ada.group);

  // the door to the hall: locked from the other side
  scene.add(rbox(0.9, 2.05, 0.06, 0.02, walnut, 0.9, 1.025, D / 2 - 0.04));
  const plaque = textPlane(t('ac.sampler').split('\n'), 0.42, 0.3, { bg: '#e2dccd', size: 22, px: 128, font: 'Georgia, serif' });
  plaque.position.set(bedX, 1.75, -D / 2 + 0.015);
  scene.add(plaque);

  // ---------------- hotspots ----------------
  const hBox = hitBox(0.22, 0.2, 0.22, dtX - 0.05, dtY + 0.1, dtZ - 0.2, 'musicbox');
  const hDresser = hitBox(0.5, 1.3, 1.1, dtX, 0.9, dtZ, 'dresser');
  const hWard = hitBox(1.3, 2.2, 0.8, wX, 1.1, wZ + 0.1, 'wardrobe');
  const hBed = hitBox(1.6, 0.8, 2.0, bedX, 0.4, bedZ, 'bed');
  const hSampler = hitBox(0.5, 0.4, 0.1, bedX, 1.75, -D / 2 + 0.05, 'sampler');
  const hDoor = hitBox(1.0, 2.1, 0.2, 0.9, 1.05, D / 2 - 0.1, 'halldoor');
  const hWin = hitBox(0.2, 2.1, 1.3, -W / 2 + 0.1, 1.05, 0.4, 'out');
  const hMachine = hitBox(0.6, 0.5, 1.0, mX, mY + 0.2, mZ, 'machine');
  const hGram = hitBox(0.6, 0.9, 0.5, gX, 0.6, gZ, 'gramophone');
  scene.add(hBox, hDresser, hWard, hBed, hSampler, hDoor, hWin, hMachine, hGram);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'mbkey', obj: hKey, view: 'dresser', when: () => boxPlayed() && wardKey.visible, tap: async (item) => {
      if (item) return g.nope();
      wardKey.visible = false;
      g.set('ac.wardKey');
      g.give('wardkey');
      return say('ac.keyTaken');
    } },
    { id: 'musicbox', obj: hBox, view: 'dresser', when: () => !(boxPlayed() && wardKey.visible), tap: async (item) => {
      if (item) return g.nope();
      if (boxPlayed()) {
        if (wardKey.visible) {
          wardKey.visible = false;
          g.set('ac.wardKey');
          g.give('wardkey');
          return say('ac.keyTaken');
        }
        return say('ac.boxAfter');
      }
      return say('ac.musicbox');
    } },
    { id: 'dresser', obj: hDresser, view: 'dresser', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(boxPlayed() ? 'ac.mirrorAfter' : 'ac.dresser');
    } },
    { id: 'wardrobe', obj: hWard, view: 'wardrobe', tap: async (item) => {
      if (item) return g.nope();
      if (!wardOpen()) {
        g.set('ac.ward');
        g.audio.sfx('creak');
        for (let i = 0; i <= 24; i++) {
          setWard(i / 24);
          await sleep(30);
        }
        return g.say([{ who: 'diego', key: 'ac.wardOpen1' }, { who: 'diego', key: 'ac.wardOpen2' }]);
      }
      if (crutch.visible || !g.flag('a.basket')) {
        crutch.visible = false;
        g.set('a.crutch');
        g.give('crutch');
        g.set('a.basket');
        g.give('thread');
        g.give('ripper');
        g.audio.sfx('whisper');
        return g.say([{ who: 'diego', key: 'ac.crutch' }, { who: 'diego', key: 'ac.basket' }, { who: 'ada', key: 'ac.adaWhisper' }]);
      }
      return say('ac.wardEmpty');
    } },
    { id: 'machine', obj: hMachine, view: 'machine', tap: async (item) => {
      if (item === 'thread') {
        g.deselect();
        g.take('thread');
        g.set('a.threaded');
        thread.visible = true;
        g.audio.sfx('click');
        return say('sew.threaded');
      }
      if (item) return g.nope();
      if (g.flag('a.sewn')) return say('sew.machineDone');
      if (!g.flag('a.threaded')) return say('sew.machine');
      const ok = await g.ui.knock(t('sew.treadleTitle'), t(g.flag('a.waltz') ? 'sew.treadleTextWaltz' : 'sew.treadleText'), SEW_RHYTHM, () => g.audio.rec('sewing', { gain: 0.7, dur: 0.35 }));
      if (!ok) return;
      g.set('a.sewn');
      g.audio.rec('sewing', { gain: 0.8, dur: 2.5 });
      await sleep(1500);
      words.visible = true;
      g.audio.sfx('whisper');
      ada.setOpacity(0.7);
      await sleep(700);
      ada.setOpacity(0);
      await g.say([{ who: 'diego', key: 'sew.sewn1' }, { who: 'diego', key: 'sew.sewn2' }]);
      g.note('note.sew.hem');
    } },
    { id: 'gramophone', obj: hGram, view: 'gramophone', tap: async (item) => {
      if (item) return g.nope();
      g.set('a.waltz');
      g.audio.sfx('click');
      g.audio.rec('gramophone', { gain: 0.55, dur: 12 });
      return g.say([{ who: 'diego', key: 'sew.gram1' }, { who: 'diego', key: 'sew.gram2' }]);
    } },
    { id: 'bed', obj: hBed, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ac.bed');
    } },
    { id: 'sampler', obj: hSampler, tap: async (item) => {
      if (item) return g.nope();
      return say('ac.samplerRead');
    } },
    { id: 'halldoor', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say('ac.hallDoor');
    } },
    { id: 'out', obj: hWin, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(2, 0.45, false);
      return g.go('ada_giardino');
    } },
  ];

  // ---------------- direct manipulation: wind the music box ----------------
  scene.updateMatrixWorld(true);
  let wound = boxPlayed() ? 1 : 0;
  let playing = false;
  let tick = 0;
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: winder,
      center: winder.getWorldPosition(new THREE.Vector3()),
      when: () => g.viewName === 'dresser' && !boxPlayed() && !playing,
      onTurn: (d) => {
        wound = Math.min(1, wound + Math.abs(d) / (Math.PI * 2 * TURNS));
        winder.rotation.z -= Math.abs(d);
        tick += Math.abs(d);
        if (tick > 0.6) {
          tick = 0;
          g.audio.sfx('click');
        }
      },
      onEnd: async () => {
        if (wound < 1 || playing || boxPlayed()) return;
        playing = true;
        const len = g.audio.musicBox({ gain: 0.6, runDown: true, bars: 13 });
        await say('ac.playing');
        await sleep(Math.max(1500, len * 1000 - 2500));
        // the tune slows, and stops; the little drawer clicks open; and in the mirror...
        g.set('ac.music');
        g.audio.sfx('drawer');
        for (let i = 0; i <= 10; i++) {
          mbDrawer.position.x = (i / 10) * 0.09;
          await sleep(25);
        }
        await sleep(600);
        g.audio.hush(3);
        await sleep(500);
        await g.glimpse('ada_figura');
        playing = false;
        return g.say([{ who: 'diego', key: 'ac.afterScare' }, { who: 'diego', key: 'ac.drawerOpen' }]);
      },
    },
  ];

  return {
    id: 'ada_camera',
    nameKey: 'place.adaCamera',
    next: ['ada_giardino'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'ada_giardino',
    views: {
      main: { pos: [-0.6, 1.6, 1.5], look: [0.4, 0.95, -1.0], yaw: 65, pitch: 18 },
      dresser: { pos: [dtX - 0.75, 1.15, dtZ - 0.2], look: [dtX, dtY + 0.08, dtZ - 0.2], parent: 'main', yaw: 15, pitch: 10, fov: 50 },
      wardrobe: { pos: [wX + 0.6, 1.55, wZ + 1.9], look: [wX, 1.2, wZ], parent: 'main', yaw: 20, pitch: 12, fov: 60 },
      machine: { pos: [mX - 0.95, 1.35, mZ + 0.1], look: [mX, mY + 0.1, mZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      gramophone: { pos: [gX - 1.0, 1.4, gZ - 0.2], look: [gX, 0.8, gZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      if (playing) dancer.rotation.y += dt * 3;
      if (ada.group.visible) ada.update(dt, time, g.engine.camera);
      if (wardOpen()) sleeve.rotation.z = Math.sin(time * 0.9) * 0.08; // as if someone had just let go of it
    },
    enter: async () => {
      if (!g.flag('ac.entered')) {
        g.set('ac.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ac.enter1' }, { who: 'diego', key: 'ac.enter2' }]);
      }
    },
    hint: () => {
      if (g.flag('glasses')) return 'hint.ada.leave';
      if (!g.flag('a.basket')) return wardOpen() ? 'hint.ac.crutch' : 'hint.ac.wardrobe';
      if (!g.flag('a.threaded')) return 'hint.sew.thread';
      if (!g.flag('a.sewn')) return g.flag('a.waltz') ? 'hint.sew.treadle' : 'hint.sew.gramophone';
      return 'hint.ada.hem';
    },
    debug: { winder, getWound: () => wound },
  };
}
