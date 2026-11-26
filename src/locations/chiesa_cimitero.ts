import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { rbox, mesh, textPlane, hitBox, mat, plasterMaterial, uvInk, woodMaterial } from '../builders';
import { t } from '../i18n';
import { sleep, churchHint, KNOCK } from './chiesa_common';

/**
 * The little cemetery behind San Michele. An iron gate (the key was in the reliquary), the graves
 * of people you have met in the shops, and one with a plain wooden cross and no name: in UV light,
 * it has one. At the back, the chapel over the crypt: you knock the way Paolo's note says.
 */
const GRAVES: [string, string][] = [
  ['Ettore Rinaldi', '1919 – 1971'],
  ['Paolo Sartori', '1952 – 1973'],
  ['Clara Sala', '1958 – 1974'],
  ['Aldo Morandi', '1928 – 1974'],
  ['Giulio Ferri', '1914 – 1974'],
];

export function createChiesaCimitero(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090b);
  scene.fog = new THREE.Fog(0x07090b, 5, 18);
  scene.userData.envIntensity = 0.05;
  scene.add(new THREE.AmbientLight(0x9aa8b8, 0.1));
  const moon = new THREE.DirectionalLight(0xb8c6d4, 0.8);
  moon.position.set(-3, 8, 4);
  scene.add(moon);
  const ground = mesh(new THREE.PlaneGeometry(14, 14), plasterMaterial({ base: '#3a3a34', repeat: [6, 6], damp: 1.5 }), 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const stone = mat(0x7a766e, { roughness: 1 });
  // the wall all round
  for (const [x, z, w, d] of [[0, -6, 12, 0.3], [-6, 0, 0.3, 12], [6, 0, 0.3, 12]] as const) scene.add(rbox(w, 1.6, d, 0.02, stone, x, 0.8, z));
  // the church wall behind you
  scene.add(rbox(12, 6, 0.3, 0.02, plasterMaterial({ base: '#6a665e', repeat: [4, 2] }), 0, 3, 4.2));

  // ---------------- the gate ----------------
  const iron = mat(0x1a1a1a, { metalness: 0.6, roughness: 0.6 });
  const gateZ = 2.2;
  for (const x of [-1.6, 1.6]) scene.add(rbox(0.3, 2.0, 0.3, 0.02, stone, x, 1.0, gateZ));
  for (const x of [-4, 4]) scene.add(rbox(4.6, 1.2, 0.2, 0.02, stone, x * 0.85, 0.6, gateZ));
  const leaves = [-1, 1].map((s) => {
    const p = new THREE.Group();
    p.position.set(s * 1.45, 0, gateZ);
    for (let i = 0; i < 7; i++) p.add(rbox(0.025, 1.9, 0.025, 0.004, iron, -s * (0.1 + i * 0.2), 0.95, 0));
    for (const y of [0.3, 1.0, 1.75]) p.add(rbox(1.42, 0.04, 0.03, 0.004, iron, -s * 0.71, y, 0));
    scene.add(p);
    return { p, s };
  });
  const gateOpen = () => !!g.flag('ch.gate');
  if (gateOpen()) leaves.forEach(({ p, s }) => (p.rotation.y = -s * 1.3));
  const lock = rbox(0.08, 0.1, 0.05, 0.01, mat(0x6b5c3a, { metalness: 0.8 }), 0, 1.0, gateZ + 0.03);
  lock.visible = !gateOpen();
  scene.add(lock);

  // ---------------- the graves ----------------
  const graves = GRAVES.map(([name, years], i) => {
    const x = -3.3 + (i % 3) * 2.2 + (i > 2 ? 1.1 : 0), z = i < 3 ? -1.0 : -3.4;
    const s = new THREE.Group();
    s.add(rbox(0.7, 0.9, 0.14, 0.05, stone, 0, 0.45, 0));
    const plate = textPlane(['✝', name, years], 0.58, 0.5, { bg: '#8a857a', fg: '#1a1814', size: 24, px: 160 });
    plate.position.set(0, 0.55, 0.075);
    s.add(plate);
    s.add(rbox(0.75, 0.08, 1.4, 0.01, stone, 0, 0.04, 0.7));
    s.position.set(x, 0, z);
    s.rotation.y = (i % 2 ? -0.06 : 0.05);
    scene.add(s);
    return { s, x, z };
  });
  // the one with no name: fresh earth, a plain wooden cross
  const lX = 2.6, lZ = -3.6;
  scene.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 1.5), mat(0x2a241e, { roughness: 1 }), lX, 0.06, lZ + 0.6));
  const cross = new THREE.Group();
  const wd = woodMaterial({ base: '#4a3a2a' });
  cross.add(rbox(0.06, 1.0, 0.05, 0.005, wd, 0, 0.5, 0));
  cross.add(rbox(0.45, 0.06, 0.05, 0.005, wd, 0, 0.72, 0));
  cross.position.set(lX, 0, lZ);
  scene.add(cross);
  // a few wild flowers, fresh
  for (let i = 0; i < 5; i++) scene.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), mat(0xd8d4cc), lX - 0.2 + i * 0.1, 0.15, lZ + 0.15 + (i % 2) * 0.08));
  const revealGrave = async () => {
      if (g.flag('ch.grave')) return;
      g.set('ch.grave');
      g.note('note.grave');
      g.audio.sfx('whisper');
      await g.say([{ who: 'diego', key: 'ch.grave1' }, { who: 'lisa', key: 'ch.grave2' }, { who: 'diego', key: 'ch.grave3' }]);
  };
  // the name on the cross, the message written in the earth
  const lisaName = uvInk(t('ch.uvGrave1').split('·').length > 2 ? ['LISA', t('ch.uvGrave1').replace(/^LISA\s*·\s*/, '')] : [t('ch.uvGrave1')], 0.42, 0.26, { onReveal: revealGrave });
  lisaName.position.set(lX, 0.66, lZ + 0.035);
  scene.add(lisaName);
  const lisaMsg = uvInk(t('ch.uvGrave2').replace(/\. /, '.\n').split('\n'), 0.76, 0.5, { onReveal: revealGrave });
  lisaMsg.rotation.x = -Math.PI / 2;
  lisaMsg.position.set(lX, 0.125, lZ + 0.75);
  scene.add(lisaMsg);

  // ---------------- the chapel over the crypt (back left) ----------------
  const cX = -3.6, cZ = -4.9;
  scene.add(rbox(1.8, 2.4, 1.6, 0.03, stone, cX, 1.2, cZ));
  const roofC = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.8, 4), mat(0x2a2826, { roughness: 1 }));
  roofC.position.set(cX, 2.8, cZ);
  roofC.rotation.y = Math.PI / 4;
  scene.add(roofC);
  const cryptDoor = rbox(0.8, 1.7, 0.06, 0.01, woodMaterial({ base: '#2a2018' }), cX, 0.85, cZ + 0.82);
  scene.add(cryptDoor);
  scene.add(textPlane([t('ch.cryptSign')], 0.6, 0.12, { bg: '#8a857a', fg: '#1a1814', size: 26, px: 64 }).translateX(cX).translateY(2.0).translateZ(cZ + 0.81));

  // ---------------- hotspots ----------------
  const hGate = hitBox(3.0, 2.0, 0.4, 0, 1.0, gateZ, 'gate');
  const hGraves = graves.map((gr, i) => {
    const hb = hitBox(0.8, 1.0, 0.4, gr.x, 0.5, gr.z, 'grave' + i);
    scene.add(hb);
    return hb;
  });
  const hCross = hitBox(0.8, 1.1, 1.6, lX, 0.55, lZ + 0.4, 'cross');
  const hCrypt = hitBox(1.0, 1.8, 0.3, cX, 0.9, cZ + 0.85, 'crypt');
  const hBack = hitBox(2.0, 2.2, 0.3, 0, 1.1, 4.0, 'back');
  scene.add(hGate, hCross, hCrypt, hBack);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'gate', obj: hGate, view: 'gate', when: () => !gateOpen(), tap: async (item) => {
      if (item === 'cemkey') {
        g.deselect();
        g.take('cemkey');
        g.set('ch.gate');
        g.audio.sfx('unlock');
        lock.visible = false;
        g.audio.sfx('creak');
        for (let i = 0; i <= 24; i++) {
          leaves.forEach(({ p, s }) => (p.rotation.y = -s * (i / 24) * 1.3));
          await sleep(30);
        }
        await g.view('main');
        return say('ch.gateOpen');
      }
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say('ch.gateLocked');
    } },
    ...hGraves.map((hb, i): Hotspot => ({
      id: 'grave' + i,
      obj: hb,
      view: 'graves',
      when: () => gateOpen(),
      tap: async (item) => {
        if (item) return g.nope();
        return say('ch.graveOf' + i);
      },
    })),
    { id: 'cross', obj: hCross, view: 'lisa', when: () => gateOpen(), tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('ch.grave')) return say('ch.crossAfter');
      return say(g.has('uvlens') ? 'ch.crossUv' : 'ch.cross');
    } },
    { id: 'crypt', obj: hCrypt, view: 'chapel', when: () => gateOpen(), tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('ch.crypt')) {
        g.audio.steps(6, 0.5, false);
        return g.go('chiesa_cripta');
      }
      if (!g.flag('ch.tube')) return say('ch.cryptLocked');
      const ok = await g.ui.knock(t('ch.knockTitle'), t('ch.knockText'), KNOCK, () => g.audio.sfx('thud'));
      if (!ok) return say('ch.knockNo');
      g.set('ch.crypt');
      g.audio.sfx('clunk');
      await sleep(400);
      g.audio.sfx('creak');
      cryptDoor.position.x -= 0.6;
      await say('ch.cryptOpen');
      g.audio.steps(6, 0.5, false);
      return g.go('chiesa_cripta');
    } },
    { id: 'back', obj: hBack, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.5, false);
      return g.go('chiesa_navata');
    } },
  ];
  if (g.flag('ch.crypt')) cryptDoor.position.x -= 0.6;

  return {
    id: 'chiesa_cimitero',
    nameKey: 'place.chCimitero',
    next: ['chiesa_navata', 'chiesa_cripta'],
    scene,
    drone: 'map',
    startView: 'main',
    exitTo: 'chiesa_navata',
    exposure: 1.2,
    views: {
      main: { pos: [0, 1.7, 3.6], look: [0, 0.9, -3.5], yaw: 65, pitch: 20 },
      gate: { pos: [0, 1.6, 3.4], look: [0, 1.1, gateZ], parent: 'main', yaw: 20, pitch: 12 },
      graves: { pos: [-1.0, 1.6, 1.0], look: [-1.2, 0.5, -2.5], parent: 'main', yaw: 35, pitch: 15 },
      lisa: { pos: [lX - 0.15, 1.45, lZ + 1.75], look: [lX, 0.3, lZ + 0.25], parent: 'main', yaw: 20, pitch: 15, fov: 55 },
      chapel: { pos: [cX + 0.6, 1.6, cZ + 2.6], look: [cX, 1.1, cZ + 0.8], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    enter: async () => {
      if (!g.flag('ch.cemEntered')) {
        g.set('ch.cemEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ch.cem1' }, { who: 'diego', key: 'ch.cem2' }]);
      }
    },
    hint: () => churchHint(g),
  };
}
