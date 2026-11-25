import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, plasterMaterial, mat, cyl } from '../builders';
import { t } from '../i18n';
import { radioHint } from './radio_negozio';
import { sleep } from './radio_common';

/**
 * The cellar under the radio shop: the fuse box. The main fuse (10 A) is missing. In a tin on
 * the shelf, five loose fuses, two of them 10 A: one is blown. Nello's test lamp tells them apart.
 */
export const FUSES: { a: number; ok: boolean }[] = [
  { a: 6, ok: true },
  { a: 10, ok: false },
  { a: 16, ok: true },
  { a: 10, ok: true },
  { a: 25, ok: true },
];

export function createRadioCantina(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 7);
  scene.userData.envIntensity = 0.04;
  const W = 3.8, H = 2.3, D = 3.4;
  const woodDark = woodMaterial({ base: '#2a2018' });
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#5e5a52', repeat: [3, 2], damp: 1.5 }),
    floor: plasterMaterial({ base: '#3a3631', repeat: [3, 3], damp: 1 }),
    ceil: woodMaterial({ base: '#1e1913', repeat: [2, 2], plank: true }),
  }));
  const power = () => !!g.flag('rl.power');
  const amb = new THREE.AmbientLight(0xffffff, 0.025);
  scene.add(amb);
  const bare = new THREE.PointLight(0xffe2b0, power() ? 2.2 : 0, 5, 1.6);
  bare.position.set(0, 2.0, 0);
  scene.add(bare);
  const bareGlass = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: power() ? 0xfff2d0 : 0x1a1a1a }), 0, 2.05, 0, false);
  bareGlass.userData.noPick = true;
  scene.add(bareGlass, cyl(0.006, 0.006, 0.25, mat(0x111111), 0, 2.2, 0, 4));
  const motes = dust([-1.8, 0.2, -1.6], [1.8, 2.2, 1.6], 120);
  scene.add(motes.points);
  // the stairs up, in front
  for (let i = 0; i < 7; i++) scene.add(rbox(0.8, 0.05, 0.26, 0.01, woodDark, -W / 2 + 0.45, 0.18 + i * 0.3, -0.4 + i * 0.24));
  scene.add(rbox(0.04, 2.2, 1.9, 0.01, woodDark, -W / 2 + 0.87, 1.1, 0.35).rotateX(0));
  scene.add(rbox(0.8, 0.04, 0.9, 0.01, woodDark, -W / 2 + 0.45, H - 0.02, 1.2));
  // junk: crates, an old bicycle frame, a TV with no tube
  scene.add(rbox(0.6, 0.45, 0.45, 0.02, woodDark, 1.3, 0.225, 1.0));
  scene.add(rbox(0.5, 0.4, 0.4, 0.02, woodDark, 1.35, 0.65, 1.0).rotateY(0.3));
  for (const s of [-1, 1]) scene.add(mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 28), mat(0x1a1a1a, { roughness: 0.6 }), 0.6 + s * 0.45, 0.32, 1.45, true).rotateY(0.1));

  // ---------------- the fuse box (back wall) ----------------
  const box = new THREE.Group();
  box.add(rbox(0.8, 0.6, 0.12, 0.01, mat(0x4a4a46, { metalness: 0.6, roughness: 0.6 }), 0, 0, 0));
  box.add(mesh(new THREE.PlaneGeometry(0.72, 0.52), mat(0x22201c, { roughness: 0.9 }), 0, 0, 0.062, false));
  const LABELS = ['radio.f1', 'radio.f2', 'radio.f3', 'radio.f4', 'radio.f5', 'radio.f6'];
  const MAIN = 2; // the empty slot
  const slotFuses: THREE.Object3D[] = [];
  const ceramic = mat(0xd9d4c6, { roughness: 0.5 });
  const capM = mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 });
  const makeFuse = (a: number) => {
    const f = new THREE.Group();
    f.add(cyl(0.022, 0.022, 0.07, ceramic, 0, 0, 0, 12));
    f.add(cyl(0.024, 0.024, 0.012, capM, 0, 0.038, 0, 12));
    f.add(cyl(0.024, 0.024, 0.012, capM, 0, -0.038, 0, 12));
    const lab = textPlane([a + 'A'], 0.04, 0.028, { bg: '#ddd5c2', size: 40, px: 64 });
    lab.position.z = 0.0225;
    f.add(lab);
    return f;
  };
  LABELS.forEach((k, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = -0.23 + col * 0.23, y = 0.12 - row * 0.26;
    box.add(cyl(0.032, 0.032, 0.012, mat(0x111111), x, y, 0.066, 14).rotateX(Math.PI / 2));
    const lab = textPlane([t(k)], 0.2, 0.05, { bg: '#ddd5c2', size: 22, px: 64 });
    lab.position.set(x, y + 0.085, 0.064);
    box.add(lab);
    const f = makeFuse(i === MAIN ? 10 : [6, 6, 10, 16, 16, 6][i]);
    f.rotation.x = Math.PI / 2;
    f.position.set(x, y, 0.1);
    f.visible = i !== MAIN || power();
    box.add(f);
    slotFuses.push(f);
  });
  // the main switch lever, on the side
  const lever = rbox(0.03, 0.14, 0.03, 0.005, mat(0x1a1a1a), 0.47, 0.05, 0.03);
  box.add(lever);
  box.position.set(0, 1.45, -D / 2 + 0.07);
  scene.add(box);

  // ---------------- the shelf with the tin of fuses and the test lamp (right wall) ----------------
  const sx = W / 2 - 0.3, sz = -0.6;
  scene.add(rbox(0.5, 0.04, 1.2, 0.01, woodDark, sx, 0.95, sz));
  for (const z of [-0.5, 0.5]) scene.add(rbox(0.04, 0.95, 0.04, 0.005, woodDark, sx, 0.475, sz + z));
  scene.add(cyl(0.12, 0.12, 0.05, mat(0x6a6a64, { metalness: 0.7, roughness: 0.5 }), sx, 0.995, sz + 0.25, 20));
  const loose: THREE.Object3D[] = [];
  const homePos = (i: number) => new THREE.Vector3(sx - 0.07 + (i % 3) * 0.07, 1.045, sz + 0.2 + Math.floor(i / 3) * 0.09);
  FUSES.forEach((fz, i) => {
    const f = makeFuse(fz.a);
    f.rotation.set(0, -Math.PI / 2, Math.PI / 2);
    f.position.copy(homePos(i));
    scene.add(f);
    loose.push(f);
  });
  // the test lamp: a battery, two clips, a little bulb
  const tester = new THREE.Group();
  tester.add(rbox(0.12, 0.08, 0.08, 0.01, mat(0x2a2a28), 0, 0.04, 0));
  tester.add(textPlane(['4,5 V'], 0.08, 0.03, { bg: '#c9b46a', size: 34, px: 64 }).translateY(0.05).translateZ(0.041));
  const tBulbM = new THREE.MeshBasicMaterial({ color: 0x3a3630 });
  tester.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), tBulbM, 0, 0.1, 0, false));
  tester.add(rbox(0.1, 0.01, 0.03, 0.003, capM, 0, 0.005, 0.08));
  const tLight = new THREE.PointLight(0xffd9a0, 0, 1.2, 2);
  tLight.position.set(0, 0.12, 0);
  tester.add(tLight);
  tester.position.set(sx, 0.97, sz - 0.25);
  scene.add(tester);
  const clipPos = new THREE.Vector3(sx, 1.0, sz - 0.16);
  let onTester = -1;
  const used = new Set<number>(power() ? [3] : []);
  loose.forEach((f, i) => (f.visible = !used.has(i)));

  // ---------------- hotspots ----------------
  const hBox = hitBox(0.9, 0.7, 0.3, 0, 1.45, -D / 2 + 0.15, 'fusebox');
  const hSlot = hitBox(0.16, 0.16, 0.12, 0.23, 1.45 + 0.12, -D / 2 + 0.2, 'slot');
  const hLever = hitBox(0.12, 0.25, 0.12, 0.47, 1.5, -D / 2 + 0.15, 'lever');
  const hTester = hitBox(0.2, 0.18, 0.2, sx, 1.03, sz - 0.25, 'tester');
  const hFuses = FUSES.map((_, i) => {
    const p = homePos(i);
    const hb = hitBox(0.07, 0.07, 0.09, p.x, p.y, p.z, 'fuse' + i);
    scene.add(hb);
    return hb;
  });
  const hShelf = hitBox(0.55, 0.3, 1.2, sx, 1.05, sz, 'shelf');
  const hStairs = hitBox(0.9, 2.1, 1.8, -W / 2 + 0.45, 1.0, 0.35, 'up');
  scene.add(hBox, hSlot, hLever, hTester, hShelf, hStairs);
  const say = (k: string) => g.say(k);

  const putBack = (i: number) => {
    loose[i].position.copy(homePos(i));
    loose[i].rotation.set(0, -Math.PI / 2, Math.PI / 2);
  };
  const test = async (i: number) => {
    if (onTester >= 0 && onTester !== i) putBack(onTester);
    onTester = i;
    const f = loose[i];
    f.position.copy(clipPos);
    f.rotation.set(0, 0, Math.PI / 2);
    g.audio.sfx('click');
    await sleep(250);
    const ok = FUSES[i].ok;
    tBulbM.color.set(ok ? 0xffe8b0 : 0x3a3630);
    tLight.intensity = ok ? 1.2 : 0;
    return say(ok ? 'radio.testOk' : 'radio.testDead');
  };
  const insert = async (item: string | null = null) => {
    if (power()) return say('radio.fuseDone');
    // a fuse in your hand (taken off the tester) or the one still in the clip
    const idx = item === 'rfuse' ? Number(g.flag('rl.fuseIdx') ?? -1) : onTester;
    if (idx < 0) return say('radio.slotEmpty');
    if (item === 'rfuse') onTester = idx;
    const fz = FUSES[idx];
    if (fz.a !== 10) {
      if (item === 'rfuse') {
        // back in the tin, it isn't the right one
        g.deselect();
        g.take('rfuse');
        loose[idx].visible = true;
        putBack(idx);
        onTester = -1;
      }
      return say(fz.a > 10 ? 'radio.fuseTooBig' : 'radio.fuseTooSmall');
    }
    if (!fz.ok) {
      g.audio.sfx('click');
      if (item === 'rfuse') {
        g.deselect();
        g.take('rfuse');
        loose[idx].visible = true;
        putBack(idx);
        onTester = -1;
      }
      await sleep(400);
      return say('radio.fuseNothing');
    }
    // the right one
    if (item === 'rfuse') {
      g.deselect();
      g.take('rfuse');
    }
    loose[onTester].visible = false;
    used.add(onTester);
    onTester = -1;
    tBulbM.color.set(0x3a3630);
    tLight.intensity = 0;
    slotFuses[MAIN].visible = true;
    g.audio.sfx('clunk');
    await sleep(300);
    g.set('rl.power');
    g.rebuild('radio_negozio');
    g.rebuild('radio_laboratorio');
    g.audio.sfx('switch');
    g.audio.buzz(true);
    for (let i = 0; i < 6; i++) {
      bare.intensity = i % 2 ? 0 : 2.2;
      (bareGlass.material as THREE.MeshBasicMaterial).color.set(i % 2 ? 0x1a1a1a : 0xfff2d0);
      await sleep(90 + Math.random() * 120);
    }
    bare.intensity = 2.2;
    (bareGlass.material as THREE.MeshBasicMaterial).color.set(0xfff2d0);
    setTimeout(() => g.audio.buzz(false), 1500);
    await say('radio.powerOn');
    // upstairs, somewhere, a radio warms up by itself
    await sleep(500);
    g.audio.sfx('hiss');
    g.audio.sfx('whisper');
    return g.say([{ who: 'paolo', key: 'radio.cellarVoice' }, { who: 'diego', key: 'radio.cellarVoice2' }]);
  };

  const hotspots: Hotspot[] = [
    { id: 'slot', obj: hSlot, when: () => g.viewName === 'panel', tap: async (item) => {
      if (item === 'rfuse') return insert(item);
      if (item) return g.nope();
      return insert();
    } },
    { id: 'fusebox', obj: hBox, view: 'panel', tap: async (item) => {
      if (item === 'rfuse') return insert(item);
      if (item) return g.nope();
      if (power()) return say('radio.fuseDone');
      if (!g.flag('rl.boxSeen')) {
        g.set('rl.boxSeen');
        return g.say([{ who: 'diego', key: 'radio.box1' }, { who: 'diego', key: 'radio.box2' }]);
      }
      return insert();
    } },
    { id: 'lever', obj: hLever, view: 'panel', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('clunk');
      return say(power() ? 'radio.leverOn' : 'radio.leverOff');
    } },
    ...FUSES.map((_, i): Hotspot => ({
      id: 'fuse' + i,
      obj: hFuses[i],
      when: () => g.viewName === 'shelf' && !used.has(i) && loose[i].visible,
      tap: async (item) => {
        if (item) return g.nope();
        if (onTester === i) {
          putBack(i);
          onTester = -1;
          tBulbM.color.set(0x3a3630);
          tLight.intensity = 0;
          return;
        }
        return test(i);
      },
    })),
    { id: 'tester', obj: hTester, view: 'shelf', tap: async (item) => {
      if (item) return g.nope();
      if (onTester < 0) return say('radio.tester');
      // take the fuse off the clip: it goes in your pocket
      const i = onTester;
      onTester = -1;
      loose[i].visible = false;
      tBulbM.color.set(0x3a3630);
      tLight.intensity = 0;
      g.set('rl.fuseIdx', i);
      g.give('rfuse');
      g.audio.sfx('pickup');
      return say(FUSES[i].ok ? 'radio.fuseTakenOk' : 'radio.fuseTakenDead');
    } },
    { id: 'shelf', obj: hShelf, view: 'shelf', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('radio.tin');
    } },
    { id: 'up', obj: hStairs, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(6, 0.4, false);
      return g.go('radio_negozio');
    } },
  ];

  return {
    id: 'radio_cantina',
    nameKey: 'place.radioCantina',
    next: ['radio_negozio'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'radio_negozio',
    dark: () => !power(),
    views: {
      main: { pos: [0.25, 1.65, 1.5], look: [0.0, 1.1, -1.5], yaw: 65, pitch: 18 },
      panel: { pos: [0, 1.5, -0.55], look: [0, 1.42, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      shelf: { pos: [0.6, 1.55, -0.6], look: [sx, 0.98, sz], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('rl.cellar')) {
        g.set('rl.cellar');
        await sleep(300);
        await say('radio.cellarEnter');
      }
    },
    hint: () => radioHint(g),
    debug: { loose, test, insert },
  };
}
