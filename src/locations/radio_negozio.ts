import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, woodMaterial, tileMaterial, plasterMaterial, mat, framed, cyl, canvasTex } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { radioWall, valveRadio, oldTv, drawSnow, sleep } from './radio_common';

/**
 * Le Voci dell'Etere — the shop. Radios on every shelf, a stack of dead televisions, the ticket
 * spike on the counter (one ticket: a valve lent to Ferri the photographer). A door to the lab,
 * one down to the cellar (the fuse box: no power), and the stairs to Paolo's room, locked with a
 * combination padlock since March 1973.
 */
export const PAOLO_CODE = '318';

export function createRadioNegozio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);
  scene.userData.envIntensity = 0.08;
  const W = 5, H = 3, D = 4.2;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#5a4430' });
  scene.add(room(W, H, D, {
    wall: radioWall(),
    floor: tileMaterial({ a: '#9a958a', b: '#34302b', n: 10, repeat: [3, 3], grime: 0.6 }),
    ceil: plasterMaterial({ base: '#3a3631', repeat: [2, 2], damp: 1 }),
  }));
  const power = () => !!g.flag('rl.power');
  const amb = new THREE.AmbientLight(0xffffff, power() ? 0.08 : 0.03);
  scene.add(amb);
  const lamp = bulb(0, 2.55, -0.3, power() ? 9 : 0, 1.2, 8);
  lamp.fill.intensity = power() ? 1 : 0;
  (lamp.glass.material as THREE.MeshBasicMaterial).color.set(power() ? 0xfff2d0 : 0x222222);
  scene.add(lamp.group);
  // the shop window: street light through the dirty glass
  const win = new THREE.SpotLight(0xb8c4d0, 4, 7, 0.7, 0.8, 1.2);
  win.position.set(0.8, 2.2, D / 2 + 0.4);
  win.target.position.set(0, 0.6, -1);
  scene.add(win, win.target);
  const motes = dust([-2.3, 0.2, -2], [2.3, 2.7, 2], 140);
  scene.add(motes.points);

  // ---------------- shelves of radios (back wall) ----------------
  for (let r = 0; r < 3; r++) {
    scene.add(rbox(3.2, 0.04, 0.35, 0.01, woodDark, -0.2, 0.9 + r * 0.6, -D / 2 + 0.2));
    for (let i = 0; i < 4; i++) {
      const s = 0.85 + ((i * 7 + r * 3) % 4) * 0.08;
      const rad = valveRadio(0.5 * s, 0.3 * s, 0.22);
      rad.position.set(-1.45 + i * 0.8, 0.92 + r * 0.6, -D / 2 + 0.2);
      rad.rotation.y = ((i + r) % 3 - 1) * 0.06;
      scene.add(rad);
    }
  }
  const sign = textPlane([t('radio.signShop')], 2.6, 0.3, { bg: '#1e1a16', fg: '#d9cfb6', size: 34, px: 96 });
  sign.position.set(-0.2, 2.75, -D / 2 + 0.02);
  scene.add(sign);

  // ---------------- the televisions (left), one on top of the other ----------------
  const tvs: ReturnType<typeof oldTv>[] = [];
  const tvPos: [number, number, number][] = [[-W / 2 + 0.35, 0, 0.0], [-W / 2 + 0.35, 0, 0.62], [-W / 2 + 0.35, 0.42, 0.3]];
  tvPos.forEach(([x, y, z], i) => {
    const tv = oldTv();
    tv.group.position.set(x, y, z);
    tv.group.rotation.y = Math.PI / 2 + (i - 1) * 0.08;
    scene.add(tv.group);
    tvs.push(tv);
  });
  const paoloTex = oldPhoto('radio_paolo', 128, 96, (c, w, h) => {
    c.fillStyle = '#555';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ddd';
    c.beginPath();
    c.ellipse(w / 2, h * 0.45, 18, 24, 0, 0, Math.PI * 2);
    c.fill();
  }, { border: false, age: 0.6 });
  const snowTex = tvs[2].mat.map;

  // ---------------- counter, the ticket spike, the till ----------------
  scene.add(rbox(2.0, 0.95, 0.6, 0.02, woodMid, 0.5, 0.475, -0.5));
  scene.add(rbox(2.1, 0.04, 0.66, 0.01, woodDark, 0.5, 0.97, -0.5));
  const spike = new THREE.Group();
  spike.add(cyl(0.04, 0.05, 0.02, mat(0x2a2a2a, { metalness: 0.8 }), 0, 0.01, 0, 12));
  spike.add(cyl(0.003, 0.003, 0.16, mat(0x9a9a98, { metalness: 0.9 }), 0, 0.09, 0, 6));
  for (let i = 0; i < 7; i++) {
    const p = textPlane([''], 0.08, 0.11, { bg: i % 2 ? '#e0d8c4' : '#d4ccb6' });
    p.rotation.set(-Math.PI / 2, 0, i * 0.7);
    p.position.y = 0.03 + i * 0.012;
    spike.add(p);
  }
  spike.position.set(0.1, 0.99, -0.45);
  scene.add(spike);
  // a radio open on the counter, its guts out
  const open = valveRadio(0.46, 0.28, 0.22);
  open.position.set(0.85, 0.99, -0.55);
  open.rotation.y = -0.4;
  scene.add(open);

  // ---------------- father and son on the roof (right wall) ----------------
  const famTex = oldPhoto('radio_famiglia', 440, 240, (c, w, h) => {
    c.fillStyle = '#8a857a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.35, border: false });
  const fam = framed(0.55, 0.3, famTex, woodMaterial({ base: '#1c1510' }));
  fam.position.set(W / 2 - 0.03, 1.7, -0.9);
  fam.rotation.y = -Math.PI / 2;
  scene.add(fam);

  // ---------------- doors: lab (back right), cellar (left, front), stairs (right) ----------------
  const labX = 1.85;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x050505 }), labX, 1.025, -D / 2 + 0.012, false));
  scene.add(rbox(0.84, 2.0, 0.05, 0.01, woodDark, labX, 1.0, -D / 2 + 0.04).rotateY(0.0));
  const labSign = textPlane([t('radio.labSign')], 0.4, 0.1, { bg: '#d9cfb6', size: 20, px: 64 });
  labSign.position.set(labX, 1.75, -D / 2 + 0.08);
  scene.add(labSign);
  const cellarZ = 1.3;
  scene.add(rbox(0.06, 2.0, 0.85, 0.01, woodDark, -W / 2 + 0.03, 1.0, cellarZ));
  const cellarSign = textPlane([t('radio.cellarSign')], 0.4, 0.1, { bg: '#d9cfb6', size: 20, px: 64 });
  cellarSign.position.set(-W / 2 + 0.07, 1.7, cellarZ);
  cellarSign.rotation.y = Math.PI / 2;
  scene.add(cellarSign);
  const stairZ = 0.7;
  const stairsOpen = () => !!g.flag('rl.stairs');
  // the doorway behind it: dark, the first steps going up
  const stairHole = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#040404';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(120,110,95,${0.35 - i * 0.045})`;
      c.fillRect(8, h - 18 - i * 30, w - 16, 5);
    }
  });
  scene.add(mesh(new THREE.PlaneGeometry(0.84, 2.0), new THREE.MeshBasicMaterial({ map: stairHole }), W / 2 - 0.012, 1.0, stairZ, false).rotateY(-Math.PI / 2));
  const stairPivot = new THREE.Group();
  stairPivot.position.set(W / 2 - 0.05, 0, stairZ + 0.42);
  stairPivot.add(rbox(0.05, 2.0, 0.84, 0.01, woodDark, 0, 1.0, -0.42));
  const padlock = new THREE.Group();
  padlock.add(rbox(0.05, 0.06, 0.02, 0.006, mat(0x8a7a5a, { metalness: 0.9, roughness: 0.4 }), 0, 0, 0));
  padlock.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12, Math.PI), mat(0x9a9a98, { metalness: 1 }), 0, 0.03, 0));
  padlock.position.set(-0.05, 1.05, -0.75);
  padlock.rotation.y = -Math.PI / 2;
  padlock.visible = !stairsOpen();
  stairPivot.add(padlock);
  const paoloTag = textPlane([t('radio.paoloDoor')], 0.3, 0.09, { bg: '#d9cfb6', size: 20, px: 64 });
  paoloTag.position.set(-0.04, 1.6, -0.42);
  paoloTag.rotation.y = -Math.PI / 2;
  stairPivot.add(paoloTag);
  scene.add(stairPivot);
  if (stairsOpen()) stairPivot.rotation.y = -1.3;

  // ---------------- hotspots ----------------
  const hSpike = hitBox(0.25, 0.25, 0.25, 0.1, 1.08, -0.45, 'tickets');
  const hOpen = hitBox(0.55, 0.35, 0.35, 0.85, 1.12, -0.55, 'openRadio');
  const hShelves = hitBox(3.4, 1.9, 0.3, -0.2, 1.6, -D / 2 + 0.15, 'shelves');
  const hTvs = hitBox(0.6, 0.95, 1.4, -W / 2 + 0.35, 0.5, 0.3, 'tvs');
  const hPhoto = hitBox(0.1, 0.4, 0.65, W / 2 - 0.05, 1.7, -0.9, 'photo');
  const hLab = hitBox(0.95, 2.1, 0.3, labX, 1.05, -D / 2 + 0.15, 'lab');
  const hCellar = hitBox(0.3, 2.0, 0.95, -W / 2 + 0.15, 1.0, cellarZ, 'cellar');
  const hStairs = hitBox(0.3, 2.0, 0.95, W / 2 - 0.15, 1.0, stairZ, 'stairs');
  const hOut = hitBox(2.0, 2.2, 0.2, 0.6, 1.1, D / 2 - 0.1, 'out');
  scene.add(hSpike, hOpen, hShelves, hTvs, hPhoto, hLab, hCellar, hStairs, hOut);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'tickets', obj: hSpike, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('radio.ticketsTitle'), t('radio.tickets'), true);
      g.set('rl.ticket');
      g.note('note.valve');
      if (!g.has('valve') && !g.flag('rl.valveIn')) await say('radio.ticketsAfter');
    } },
    { id: 'openRadio', obj: hOpen, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.openRadio');
    } },
    { id: 'shelves', obj: hShelves, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('radio.shelves');
    } },
    { id: 'tvs', obj: hTvs, view: 'tvs', tap: async (item) => {
      if (item) return g.nope();
      return say(power() ? 'radio.tvsOn' : 'radio.tvsOff');
    } },
    { id: 'photo', obj: hPhoto, view: 'photo', tap: async (item) => {
      if (item) return g.nope();
      return g.say([{ who: 'diego', key: 'radio.photo1' }, { who: 'diego', key: 'radio.photo2' }]);
    } },
    { id: 'lab', obj: hLab, view: 'labdoor', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      g.audio.steps(2, 0.45, false);
      return g.go('radio_laboratorio');
    } },
    { id: 'cellar', obj: hCellar, view: 'cellardoor', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      g.audio.steps(6, 0.45, false);
      return g.go('radio_cantina');
    } },
    { id: 'stairs', obj: hStairs, view: 'stairs', tap: async (item) => {
      if (stairsOpen()) {
        if (item) return g.nope();
        g.audio.steps(8, 0.4, false);
        return g.go('radio_camera');
      }
      if (item) return g.nope();
      g.audio.sfx('click');
      const ok = await g.ui.keypad(t('radio.padlock'), 3, (c) => c === PAOLO_CODE, () => g.audio.sfx('click'));
      if (!ok) return say('radio.padlockNo');
      g.set('rl.stairs');
      g.audio.sfx('unlock');
      padlock.visible = false;
      await sleep(300);
      g.audio.sfx('creak');
      for (let i = 0; i <= 20; i++) {
        stairPivot.rotation.y = -(i / 20) * 1.3;
        await sleep(25);
      }
      return say('radio.stairsOpen');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // the televisions: snow, when there's power. And once, for a moment, a face.
  let snowT = 0;
  let face = false;
  const drawTvs = () => {
    tvs.forEach((tv, i) => {
      if (face && i === 2) return;
      drawSnow(tv.screen.ctx, 128, 96, 0.55 + Math.random() * 0.2);
      tv.screen.update();
    });
  };
  const tvScare = async () => {
    g.set('rl.tvScare');
    await sleep(600);
    g.audio.sfx('switch');
    g.audio.sfx('hiss');
    await sleep(1400);
    face = true;
    tvs[2].mat.map = paoloTex;
    tvs[2].mat.needsUpdate = true;
    g.audio.stinger();
    g.audio.sfx('whisper');
    g.engine.shake(0.05, 0.5);
    await sleep(700);
    face = false;
    tvs[2].mat.map = snowTex;
    tvs[2].mat.needsUpdate = true;
    await g.say([{ who: 'diego', key: 'radio.tvFace1' }, { who: 'diego', key: 'radio.tvFace2' }]);
  };

  return {
    id: 'radio_negozio',
    nameKey: 'place.radioNegozio',
    next: ['radio_laboratorio', 'radio_cantina', ...(stairsOpen() ? ['radio_camera'] : [])],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'map',
    dark: () => !power(),
    views: {
      main: { pos: [0.6, 1.6, 1.8], look: [-0.1, 1.3, -1.6], yaw: 65, pitch: 18 },
      counter: { pos: [0.5, 1.6, 0.5], look: [0.5, 0.95, -0.6], parent: 'main', yaw: 25, pitch: 12 },
      tvs: { pos: [0.3, 1.2, 0.35], look: [-W / 2, 0.55, 0.3], parent: 'main', yaw: 25, pitch: 12 },
      photo: { pos: [1.2, 1.65, -0.9], look: [W / 2, 1.7, -0.9], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      labdoor: { pos: [1.0, 1.6, 0.5], look: [labX, 1.2, -D / 2], parent: 'main', yaw: 20, pitch: 12 },
      cellardoor: { pos: [-0.6, 1.6, 0.9], look: [-W / 2, 1.1, cellarZ], parent: 'main', yaw: 20, pitch: 12 },
      stairs: { pos: [0.8, 1.6, 0.6], look: [W / 2, 1.1, stairZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      if (!power()) return;
      snowT += dt;
      if (snowT > 0.09) {
        snowT = 0;
        drawTvs();
      }
    },
    enter: async () => {
      if (!g.flag('rl.entered')) {
        g.set('rl.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'radio.enter1' }, { who: 'diego', key: 'radio.enter2' }]);
      }
      if (power() && !g.flag('rl.tvScare')) await tvScare();
    },
    hint: () => radioHint(g),
    debug: { tvs },
  };
}

/** One hint chain for the whole radio shop: where are you stuck? */
export function radioHint(g: Game): string {
  if (g.has('radio')) return 'hint.radio.leave';
  if (!g.flag('rl.ticket')) return 'hint.radio.tickets';
  if (!g.flag('rl.power')) return 'hint.radio.power';
  if (!g.flag('rl.code')) return 'hint.radio.tape';
  if (!g.flag('rl.stairs')) return 'hint.radio.stairs';
  if (!g.flag('rl.morse')) return 'hint.radio.notebook';
  if (!g.flag('rl.valveIn') && !g.has('valve')) return 'hint.radio.valve';
  if (!g.flag('rl.valveIn')) return 'hint.radio.valveIn';
  if (!g.flag('rl.tuned')) return 'hint.radio.tune';
  if (!g.flag('rl.contact')) return 'hint.radio.antenna';
  if (!g.flag('rl.freed')) return 'hint.radio.key';
  return 'hint.radio.take';
}
