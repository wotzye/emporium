import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, lightCone, canvasTex, noise, woodMaterial, plasterMaterial, tileMaterial, mat, cyl } from '../builders';
import { prop } from '../models';
import { t } from '../i18n';
import { wallClock, grandfatherClock, brassMat } from './ora_common';

/**
 * L'Ora Ferma — the shop. Every clock on every wall says 3:17.
 * A mantel clock on the counter won't go: shake it (the phone) and it spits out the workshop key.
 * The stairs to the flat upstairs are behind a door with a 4-digit lock.
 */
export const CLARA_CODE = '0912';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createOraBottega(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);
  scene.userData.envIntensity = 0.1;
  const W = 5, H = 3, D = 4.4;
  const woodDark = woodMaterial({ base: '#2c2016' });
  const woodMid = woodMaterial({ base: '#5a4430' });
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#7a7468', repeat: [3, 2], stripes: true, damp: 0.8 }),
    floor: tileMaterial({ a: '#9a9384', b: '#3d3a34', n: 10, repeat: [3, 3], grime: 0.6 }),
    ceil: plasterMaterial({ base: '#3e3a35', repeat: [2, 2], damp: 1 }),
  }));
  const brass = brassMat();

  scene.add(new THREE.AmbientLight(0xffffff, 0.07));
  const lamp = bulb(0, 2.55, -0.3, 9, 1.2, 8);
  scene.add(lamp.group);
  scene.add(lightCone(0, 2.53, -0.3, 2.5, 1.3, 0.025));
  // grey light from the shop window behind the player
  const win = new THREE.SpotLight(0xc4ccd4, 5, 7, 0.7, 0.8, 1.2);
  win.position.set(0, 2.2, D / 2 + 0.4);
  win.target.position.set(0, 0.6, -1);
  scene.add(win, win.target);
  const motes = dust([-2.3, 0.2, -2], [2.3, 2.7, 2], 160);
  scene.add(motes.points);

  // ---------------- walls of clocks ----------------
  const clocks: ReturnType<typeof wallClock>[] = [];
  const bezels = [brass, woodDark, mat(0x1a1918, { roughness: 0.5 }), woodMid];
  const placeClock = (x: number, y: number, z: number, ry: number, r: number, k: number) => {
    const c = wallClock(r, { roman: k % 2 === 0, dark: k % 5 === 3, bezel: bezels[k % bezels.length] });
    c.group.position.set(x, y, z);
    c.group.rotation.y = ry;
    // a tiny random tilt: hung by an old man with shaking hands
    c.group.rotation.z = (Math.random() - 0.5) * 0.08;
    scene.add(c.group);
    clocks.push(c);
  };
  let k = 0;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 6; i++) {
      const x = -2.0 + i * 0.75 + (row % 2) * 0.3;
      if (x > 2.1) continue;
      // leave the shop's sign clear, up in the middle
      if (row === 2 && Math.abs(x) < 1.25) continue;
      placeClock(x, 1.3 + row * 0.55, -D / 2 + 0.03, 0, 0.12 + ((i + row) % 3) * 0.04, k++);
    }
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4; i++) placeClock(-W / 2 + 0.03, 1.2 + row * 0.55, -1.4 + i * 0.75 + (row % 2) * 0.25, Math.PI / 2, 0.11 + ((i * 2 + row) % 3) * 0.035, k++);
  // a big grandfather clock in the corner: the door to the workshop is behind the counter instead
  const gf = grandfatherClock(woodDark);
  gf.group.position.set(W / 2 - 0.45, 0, -D / 2 + 0.35);
  gf.group.rotation.y = -0.5;
  scene.add(gf.group);

  // ---------------- counter and display case ----------------
  scene.add(rbox(2.6, 0.95, 0.6, 0.02, woodMid, -0.3, 0.475, -0.6));
  scene.add(rbox(2.7, 0.04, 0.68, 0.01, woodDark, -0.3, 0.97, -0.6));
  const glass = mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.15 }), -0.95, 1.11, -0.6, false);
  scene.add(glass);
  // pocket watches lying open in the case, all at 3:17
  for (let i = 0; i < 5; i++) {
    const w = wallClock(0.03, { roman: false, depth: 0.012 });
    w.group.rotation.x = -Math.PI / 2;
    w.group.position.set(-1.3 + i * 0.17, 1.0, -0.6 + (i % 2) * 0.12);
    scene.add(w.group);
  }
  // repair tickets on a spike
  const spike = new THREE.Group();
  spike.add(cyl(0.004, 0.004, 0.14, brass, 0, 0.07, 0, 6));
  for (let i = 0; i < 6; i++) spike.add(mesh(new THREE.PlaneGeometry(0.08, 0.1), mat(0x8a8474, { side: THREE.DoubleSide }), 0, 0.02 + i * 0.012, 0, false).rotateX(-Math.PI / 2).rotateZ(i * 0.6));
  spike.position.set(0.25, 0.99, -0.45);
  scene.add(spike);
  // the mantel clock that won't go
  const mantel = new THREE.Group();
  mantel.add(rbox(0.32, 0.3, 0.14, 0.03, woodDark, 0, 0.15, 0));
  mantel.add(rbox(0.36, 0.03, 0.16, 0.01, woodDark, 0, 0.015, 0));
  const mc = wallClock(0.1, { roman: true, bezel: brass, depth: 0.02 });
  mc.group.position.set(0, 0.17, 0.072);
  mantel.add(mc.group);
  // its little back door, hinged at the side (opens towards the player when it springs)
  const mDoor = new THREE.Group();
  mDoor.position.set(0.16, 0.06, 0.071);
  mDoor.add(rbox(0.07, 0.07, 0.008, 0.002, brass, -0.035, 0, 0));
  mantel.add(mDoor);
  const keyObj = new THREE.Group();
  keyObj.add(cyl(0.004, 0.004, 0.07, brass, 0, 0, 0, 6).rotateZ(Math.PI / 2));
  keyObj.add(mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), brass, -0.04, 0, 0));
  keyObj.position.set(0.12, 0.06, 0.06);
  mantel.add(keyObj);
  mantel.position.set(0.75, 0.99, -0.6);
  mantel.rotation.y = -0.25;
  scene.add(mantel);
  const mantelGo = () => !!g.flag('o.mantel');
  if (mantelGo()) mDoor.rotation.y = 1.7;
  keyObj.visible = mantelGo() && !g.flag('o.labKey');
  const flourish = textPlane([t('ora.sign1'), t('ora.sign2')], 1.9, 0.4, { bg: '#1a1714', fg: '#c9b98f', size: 26, px: 96, font: 'Georgia, serif' });
  flourish.position.set(0, 2.62, -D / 2 + 0.02);
  scene.add(flourish);

  // ---------------- doors ----------------
  // workshop: behind the counter, back-left
  const labDoorX = -1.6;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x060606 }), labDoorX, 1.025, -D / 2 + 0.012, false));
  const labPivot = new THREE.Group();
  labPivot.position.set(labDoorX - 0.42, 0, -D / 2 + 0.04);
  labPivot.add(rbox(0.84, 2.04, 0.05, 0.01, woodMid, 0.42, 1.02, 0));
  labPivot.add(textPlane([t('ora.labDoor')], 0.4, 0.1, { bg: '#d4ccb8', size: 30, px: 48 }).translateX(0.42).translateY(1.6).translateZ(0.03));
  scene.add(labPivot);
  if (g.flag('o.labOpen')) labPivot.rotation.y = 1.4;
  // the clocks on the back wall must not cover the lab door
  for (const c of clocks) if (Math.abs(c.group.position.x - labDoorX) < 0.55 && c.group.position.z < -D / 2 + 0.1 && c.group.position.y < 2.2) c.group.visible = false;
  // stairs door, right wall, with a brass combination lock
  const stairZ = 0.6;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x060606 }), W / 2 - 0.012, 1.025, stairZ, false).rotateY(-Math.PI / 2));
  const stairPivot = new THREE.Group();
  stairPivot.position.set(W / 2 - 0.04, 0, stairZ + 0.42);
  stairPivot.add(rbox(0.05, 2.04, 0.84, 0.01, woodDark, 0, 1.02, -0.42));
  stairPivot.add(rbox(0.04, 0.12, 0.08, 0.01, brass, -0.04, 1.05, -0.75));
  scene.add(stairPivot);
  if (g.flag('o.stairs')) stairPivot.rotation.y = -1.3;

  // ---------------- hotspots ----------------
  const hMantel = hitBox(0.45, 0.4, 0.3, 0.75, 1.15, -0.6, 'mantel');
  const hTickets = hitBox(0.25, 0.25, 0.25, 0.25, 1.08, -0.45, 'tickets');
  // an envelope waiting to be collected: «Morandi — pendola». Inside, the minute hand of the barber's cellar clock.
  const env = textPlane([t('ora.envelope')], 0.2, 0.11, { bg: '#d9cfb6', size: 18, px: 96, font: "'Bradley Hand', 'Segoe Print', cursive" });
  env.rotation.x = -Math.PI / 2;
  env.rotation.z = 0.25;
  env.position.set(-0.05, 0.993, -0.5);
  env.visible = !g.flag('o.hand');
  scene.add(env);
  const hEnv = hitBox(0.22, 0.08, 0.16, -0.05, 1.01, -0.5, 'envelope');
  scene.add(hEnv);
  const hCase = hitBox(1.1, 0.35, 0.6, -0.95, 1.1, -0.6, 'case');
  const hWall = hitBox(4.5, 1.8, 0.2, 0, 1.85, -D / 2 + 0.1, 'clocks');
  const hGf = hitBox(0.7, 2.4, 0.6, W / 2 - 0.45, 1.2, -D / 2 + 0.35, 'grandfather');
  const hLab = hitBox(0.95, 2.1, 0.3, labDoorX, 1.05, -D / 2 + 0.15, 'labdoor');
  const hStairs = hitBox(0.3, 2.1, 0.95, W / 2 - 0.15, 1.05, stairZ, 'stairs');
  const hOut = hitBox(1.2, 2.2, 0.2, 0, 1.1, D / 2 - 0.1, 'out');
  scene.add(hMantel, hTickets, hCase, hWall, hGf, hLab, hStairs, hOut);
  const say = (key: string) => g.say(key);

  const hotspots: Hotspot[] = [
    { id: 'mantel', obj: hMantel, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      if (keyObj.visible) {
        keyObj.visible = false;
        g.set('o.labKey');
        g.give('labkey');
        g.audio.sfx('pickup');
        return say('ora.keyTaken');
      }
      if (mantelGo()) return say('ora.mantelAfter');
      await say('ora.mantel');
      const ok = await g.physical('shake', 'ora.shakeText');
      if (!ok) return;
      g.set('o.mantel');
      g.audio.rec('windup', { gain: 0.6 });
      await sleep(400);
      g.audio.sfx('clunk');
      for (let i = 0; i <= 15; i++) {
        mDoor.rotation.y = (i / 15) * 1.7;
        await sleep(20);
      }
      keyObj.visible = true;
      return say('ora.mantelOpen');
    } },
    { id: 'envelope', obj: hEnv, view: 'counter', when: () => env.visible, tap: async (item) => {
      if (item) return g.nope();
      env.visible = false;
      g.set('o.hand');
      g.give('minutehand');
      g.audio.sfx('paper');
      return g.say([{ who: 'diego', key: 'ora.envelope1' }, { who: 'diego', key: 'ora.envelope2' }]);
    } },
    { id: 'tickets', obj: hTickets, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      return g.ui.doc(t('ora.ticketsTitle'), t('ora.tickets'), true);
    } },
    { id: 'case', obj: hCase, view: 'counter', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ora.case');
    } },
    { id: 'clocks', obj: hWall, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(g.flag('o.restarted') ? 'ora.clocksAfter' : 'ora.clocks');
    } },
    { id: 'grandfather', obj: hGf, view: 'grandfather', tap: async (item) => {
      if (item) return g.nope();
      return say(g.flag('o.restarted') ? 'ora.gfAfter' : 'ora.gf');
    } },
    { id: 'labdoor', obj: hLab, tap: async (item) => {
      if (g.flag('o.labOpen')) {
        if (item) return g.nope();
        g.audio.steps(3, 0.45, false);
        return g.go('ora_laboratorio');
      }
      if (item === 'labkey') {
        g.deselect();
        g.take('labkey');
        g.set('o.labOpen');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          labPivot.rotation.y = (i / 20) * 1.4;
          await sleep(25);
        }
        return say('ora.labOpen');
      }
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say('ora.labLocked');
    } },
    { id: 'stairs', obj: hStairs, view: 'stairs', tap: async (item) => {
      if (g.flag('o.stairs')) {
        if (item) return g.nope();
        g.audio.steps(6, 0.4, false);
        return g.go('ora_camera');
      }
      if (item) return g.nope();
      const ok = await g.ui.keypad(t('ora.stairsLock'), 4, (c) => c === CLARA_CODE, () => g.audio.sfx('click'));
      if (!ok) return;
      g.set('o.stairs');
      g.audio.sfx('unlock');
      g.audio.sfx('creak');
      for (let i = 0; i <= 20; i++) {
        stairPivot.rotation.y = -(i / 20) * 1.3;
        await sleep(25);
      }
      return say('ora.stairsOpen');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // after the restart, the clocks all tell the real time and tick
  const now = new Date();
  let tickAcc = 0;
  return {
    id: 'ora_bottega',
    nameKey: 'place.oraBottega',
    next: ['ora_laboratorio', 'ora_camera'],
    scene,
    drone: 'emporio',
    startView: 'main',
    views: {
      main: { pos: [1.4, 1.65, 1.9], look: [-0.6, 1.2, -1.6], yaw: 60, pitch: 18 },
      counter: { pos: [0.3, 1.55, 0.55], look: [0.2, 1.05, -0.6], parent: 'main', yaw: 25, pitch: 12 },
      grandfather: { pos: [1.2, 1.6, -0.4], look: [W / 2 - 0.45, 1.5, -D / 2 + 0.35], parent: 'main', yaw: 20, pitch: 12 },
      stairs: { pos: [1.0, 1.6, 0.9], look: [W / 2, 1.2, stairZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      const restarted = !!g.flag('o.restarted');
      if (restarted) {
        const m = now.getMinutes() + time / 60;
        clocks.forEach((c, i) => c.setTime(now.getHours(), m + i * 0));
        gf.pendulum.rotation.z = Math.sin(time * 2.2) * 0.12;
        tickAcc += dt;
        if (tickAcc > 1) tickAcc = 0;
      } else {
        // 3:17, always — though now and then a minute hand twitches, as if trying
        clocks.forEach((c, i) => c.setTime(3, 17 + (Math.sin(time * 0.7 + i * 1.3) > 0.995 ? 0.6 : 0)));
        if (mantelGo()) mc.setTime(3, 17 + (time % 60) / 60);
      }
    },
    enter: async () => {
      if (!g.flag('o.entered')) {
        g.set('o.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ora.enter1' }, { who: 'diego', key: 'ora.enter2' }]);
      }
    },
    hint: () => {
      if (g.has('watch')) return 'hint.ora.leave';
      if (!mantelGo()) return 'hint.ora.shake';
      if (!g.flag('o.labOpen')) return g.has('labkey') ? 'hint.ora.labdoor' : 'hint.ora.key';
      if (!g.flag('o.stairs')) return g.flag('o.gears') ? 'hint.ora.code' : 'hint.ora.lab';
      return 'hint.ora.upstairs';
    },
    debug: { clocks, mantel },
  };
}
