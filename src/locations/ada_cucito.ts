import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, mat, hitBox, dust, textPlane, woodMaterial, cyl, bulb, lightCone } from '../builders';
import { prop, cursify } from '../models';
import { createAdaGhost } from '../characters';
import { t } from '../i18n';
import { wallpaper } from './ada_common';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** the drawers open on Clara's birthday: Ada was her godmother (9 December) */
export const SEW_CODE = '0912';
/** the treadle, in waltz time like the record: toc ... toc toc ... toc toc */
export const SEW_RHYTHM = 'LSLS';

/**
 * Ada's sewing room: Ada la sarta. She sewed for the whole village: the barber's white coat,
 * Clara's communion dress, Paolo's uniform taken in. On the dress form, Ettore's army jacket,
 * the one she mended every year. The drawers open on her goddaughter Clara's birthday; thread the
 * machine, work the treadle in time with the waltz on the gramophone, and the machine stitches a
 * message by itself: NELL'ORLO. In the hem of the jacket, the glasses.
 */
export function createAdaCucito(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.07;
  const W = 3.8, H = 2.6, D = 3.4;
  scene.add(room(W, H, D, { wall: wallpaper('#aaa294'), floor: woodMaterial({ base: '#3a2c20', repeat: [3, 3], plank: true }), ceil: woodMaterial({ base: '#2a2118', repeat: [2, 2] }) }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const lamp = bulb(0.2, 2.25, -0.3, 5, 1.0, 5);
  scene.add(lamp.group);
  scene.add(lightCone(0.2, 2.23, -0.3, 2.1, 0.9, 0.022));
  const motes = dust([-1.7, 0.2, -1.5], [1.7, 2.4, 1.5], 130);
  scene.add(motes.points);
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#5a4430' });

  // ---------------- the sewing machine on its table (back wall, by the window) ----------------
  const mX = -0.7, mZ = -D / 2 + 0.45, mY = 0.76;
  scene.add(rbox(1.1, 0.04, 0.55, 0.01, woodMid, mX, mY, mZ));
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) scene.add(rbox(0.04, mY, 0.04, 0.005, woodDark, mX + x, mY / 2, mZ + z));
  // the treadle under the table
  scene.add(rbox(0.6, 0.03, 0.3, 0.005, mat(0x2a2826, { metalness: 0.6, roughness: 0.5 }), mX, 0.12, mZ + 0.05).rotateX(0.2));
  const machine = prop('sewing', { width: 0.55, grey: 0.9 });
  const mach = machine ?? rbox(0.45, 0.3, 0.2, 0.03, mat(0x1a1a1a), 0, 0.15, 0);
  mach.position.set(mX, mY + 0.02, mZ);
  scene.add(mach);
  // the cloth under the needle, and the words the machine sews by itself
  scene.add(rbox(0.4, 0.004, 0.25, 0.002, mat(0xd8d2c4, { roughness: 1 }), mX + 0.15, mY + 0.025, mZ + 0.12));
  const words = textPlane([t('sew.words')], 0.36, 0.08, { bg: 'transparent', fg: '#1a1814', size: 40, px: 96, font: "'Bradley Hand', 'Segoe Print', cursive" });
  words.rotation.x = -Math.PI / 2;
  words.position.set(mX + 0.15, mY + 0.034, mZ + 0.12);
  (words.material as THREE.MeshStandardMaterial).depthWrite = false;
  words.renderOrder = 2;
  words.visible = !!g.flag('a.sewn');
  scene.add(words);
  const thread = cyl(0.015, 0.015, 0.035, mat(0x2a2622, { roughness: 0.8 }), mX - 0.1, mY + 0.32, mZ - 0.02, 10);
  thread.visible = !!g.flag('a.threaded');
  scene.add(thread);
  // a window over it, shut
  scene.add(mesh(new THREE.PlaneGeometry(0.9, 1.0), new THREE.MeshBasicMaterial({ color: 0x2a3036 }), mX, 1.65, -D / 2 + 0.01, false));

  // ---------------- the dress form with Ettore's jacket ----------------
  const fX = 1.0, fZ = -0.6;
  const form = new THREE.Group();
  const df = prop('dressForm', { height: 1.65 });
  if (df) form.add(df);
  else form.add(cyl(0.18, 0.15, 0.6, mat(0x2a2826), 0, 1.25, 0, 14), cyl(0.015, 0.015, 1.0, mat(0x2a2826), 0, 0.5, 0, 6));
  // the jacket: a grey-green army jacket, buttoned, a little short at the hem
  const jacket = new THREE.Group();
  const cloth = mat(0x4a4c44, { roughness: 1 });
  // shoulders, chest, waist, a flared skirt to the hem
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.33], [0.13, 0.33], [0.21, 0.28], [0.22, 0.16], [0.19, 0.0], [0.21, -0.18], [0.24, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 18), cloth);
  body.scale.z = 0.75;
  body.position.y = 1.2;
  jacket.add(body);
  // a collar and two pockets
  jacket.add(rbox(0.2, 0.06, 0.05, 0.02, cloth, 0, 1.5, 0.12));
  for (const s of [-1, 1]) jacket.add(rbox(0.1, 0.09, 0.01, 0.005, mat(0x3e403a, { roughness: 1 }), s * 0.1, 1.36, 0.16));
  for (const s of [-1, 1]) {
    const sleeve = cyl(0.05, 0.06, 0.5, cloth, s * 0.24, 1.22, 0, 10);
    sleeve.rotation.z = s * 0.25;
    jacket.add(sleeve);
  }
  for (let i = 0; i < 5; i++) jacket.add(mesh(new THREE.SphereGeometry(0.012, 6, 4), mat(0x8a8060, { metalness: 0.8 }), 0, 1.45 - i * 0.1, 0.205));
  const hem = rbox(0.47, 0.05, 0.47, 0.02, mat(0x3e403a, { roughness: 1 }), 0, 0.9, 0);
  jacket.add(hem);
  form.add(jacket);
  form.position.set(fX, 0, fZ);
  form.rotation.y = -0.4;
  scene.add(form);
  // the glasses, once the hem is unpicked (they fall on the floor)
  const glasses = new THREE.Group();
  const spec = prop('spectacles', { width: 0.14 });
  if (spec) glasses.add(cursify(spec));
  glasses.position.set(fX - 0.1, 0.01, fZ + 0.35);
  glasses.visible = !!g.flag('a.hemOpen') && !g.flag('glasses');
  scene.add(glasses);

  // ---------------- the chest of little drawers (left wall), the gramophone, fabric ----------------
  const cX = -W / 2 + 0.3, cZ = 0.4;
  scene.add(rbox(0.5, 1.0, 0.8, 0.02, woodDark, cX, 0.5, cZ));
  for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
    scene.add(rbox(0.02, 0.2, 0.36, 0.005, woodMid, cX + 0.26, 0.15 + r * 0.24, cZ - 0.19 + k * 0.38));
    scene.add(mesh(new THREE.SphereGeometry(0.012, 6, 4), mat(0x9a8a62, { metalness: 1 }), cX + 0.28, 0.15 + r * 0.24, cZ - 0.19 + k * 0.38));
  }
  // a little brass combination lock on the top drawer
  scene.add(rbox(0.02, 0.06, 0.1, 0.005, mat(0x9a8a62, { metalness: 1, roughness: 0.35 }), cX + 0.28, 0.95, cZ));
  const gram = prop('gramophone', { height: 0.55, turn: Math.PI / 2, grey: 0.9 });
  scene.add(rbox(0.6, 0.6, 0.5, 0.02, woodMid, W / 2 - 0.35, 0.3, 1.0));
  if (gram) {
    gram.position.set(W / 2 - 0.35, 0.6, 1.0);
    scene.add(gram);
  }
  // bolts of cloth on a shelf, a pincushion, scissors
  scene.add(rbox(0.3, 0.03, 1.4, 0.005, woodDark, W / 2 - 0.16, 1.6, -0.6));
  for (let i = 0; i < 5; i++) scene.add(cyl(0.07, 0.07, 0.28, mat([0x6a665e, 0x3a3836, 0x8a8478, 0x4a4640, 0x9a948a][i], { roughness: 1 }), W / 2 - 0.16, 1.7, -1.15 + i * 0.27, 12).rotateZ(Math.PI / 2));
  const order = rbox(0.2, 0.02, 0.27, 0.004, mat(0xd8d0bc, { roughness: 0.9 }), mX + 0.38, mY + 0.03, mZ + 0.05);
  order.rotation.y = -0.2;
  scene.add(order);
  // the door back to the living room
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, 0.4, 1.025, D / 2 - 0.03));

  // Ada, when the glasses come out
  const ada = createAdaGhost();
  ada.group.traverse((o) => (o.userData.noPick = true));
  ada.setOpacity(0);
  ada.group.position.set(-0.3, 0, 0.6);
  scene.add(ada.group);

  // ---------------- hotspots ----------------
  const hMachine = hitBox(0.6, 0.45, 0.45, mX, mY + 0.2, mZ, 'machine');
  const hOrder = hitBox(0.3, 0.1, 0.35, mX + 0.38, mY + 0.06, mZ + 0.05, 'orders');
  const hForm = hitBox(0.6, 1.7, 0.6, fX, 0.85, fZ, 'form');
  const hChest = hitBox(0.55, 1.05, 0.85, cX + 0.02, 0.52, cZ, 'chest');
  const hGram = hitBox(0.6, 0.6, 0.5, W / 2 - 0.35, 0.85, 1.0, 'gramophone');
  const hGlasses = hitBox(0.25, 0.1, 0.2, fX - 0.1, 0.05, fZ + 0.35, 'glasses');
  const hDoor = hitBox(1.0, 2.1, 0.2, 0.4, 1.05, D / 2 - 0.1, 'door');
  const hCloth = hitBox(0.35, 0.3, 1.5, W / 2 - 0.16, 1.7, -0.6, 'cloth');
  scene.add(hMachine, hOrder, hForm, hChest, hGram, hGlasses, hDoor, hCloth);
  const say = (k: string) => g.say(k);

  const unpick = async () => {
    g.deselect();
    g.set('a.hemOpen');
    g.audio.sfx('rub');
    hem.scale.y = 1.6;
    await sleep(500);
    g.audio.sfx('clunk');
    glasses.visible = true;
    await say('sew.hemOpen');
  };
  const takeGlasses = async () => {
    glasses.visible = false;
    g.set('glasses');
    g.give('glasses');
    g.audio.hush(4);
    await sleep(500);
    await g.say([{ who: 'ada', key: 'sew.ada1' }]);
    ada.setOpacity(0.8);
    g.audio.rec('possessed', { gain: 0.6, dur: 3 });
    await g.scare('ada', 650, 'scare_donna#close');
    ada.setOpacity(0);
    await g.say([{ who: 'diego', key: 'sew.after1' }, { who: 'diego', key: 'sew.after2' }]);
  };

  const hotspots: Hotspot[] = [
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
      await g.say([{ who: 'diego', key: 'sew.sewn1' }, { who: 'diego', key: 'sew.sewn2' }]);
      g.note('note.sew.hem');
    } },
    { id: 'orders', obj: hOrder, view: 'machine', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.readDoc('sew.ordersTitle', 'sew.orders');
      g.note('note.sew.orders');
    } },
    { id: 'form', obj: hForm, view: 'form', tap: async (item) => {
      if (item === 'ripper') {
        if (!g.flag('a.sewn')) return say('sew.whereCut');
        g.take('ripper');
        return unpick();
      }
      if (item) return g.nope();
      if (g.flag('a.hemOpen')) return say('sew.formOpen');
      return g.say([{ who: 'diego', key: 'sew.form1' }, { who: 'diego', key: g.flag('a.sewn') ? 'sew.form3' : 'sew.form2' }]);
    } },
    { id: 'glasses', obj: hGlasses, view: 'form', when: () => glasses.visible, tap: async (item) => {
      if (item) return g.nope();
      return takeGlasses();
    } },
    { id: 'chest', obj: hChest, view: 'chest', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('a.cab')) return say('sew.chestEmpty');
      await say('sew.chest');
      const ok = await g.ui.keypad(t('sew.chestLock'), 4, (c) => c === SEW_CODE, () => g.audio.sfx('click'));
      if (!ok) return;
      g.set('a.cab');
      g.audio.sfx('drawer');
      g.give('thread');
      g.give('ripper');
      return say('sew.chestOpen');
    } },
    { id: 'gramophone', obj: hGram, view: 'gramophone', tap: async (item) => {
      if (item) return g.nope();
      g.set('a.waltz');
      g.audio.sfx('click');
      g.audio.rec('gramophone', { gain: 0.55, dur: 12 });
      return g.say([{ who: 'diego', key: 'sew.gram1' }, { who: 'diego', key: 'sew.gram2' }]);
    } },
    { id: 'cloth', obj: hCloth, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('sew.cloth');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(2, 0.45, false);
      return g.go('ada_soggiorno');
    } },
  ];

  return {
    id: 'ada_cucito',
    nameKey: 'place.adaCucito',
    next: ['ada_soggiorno'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'ada_soggiorno',
    dark: () => true,
    views: {
      main: { pos: [0.2, 1.6, 1.3], look: [-0.2, 0.95, -1.2], yaw: 65, pitch: 20 },
      machine: { pos: [mX + 0.1, 1.35, mZ + 0.85], look: [mX + 0.05, mY + 0.1, mZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      form: { pos: [0.3, 1.4, 0.6], look: [fX, 0.9, fZ], parent: 'main', yaw: 25, pitch: 15 },
      chest: { pos: [-0.5, 1.3, 0.5], look: [cX, 0.6, cZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      gramophone: { pos: [0.9, 1.4, 0.9], look: [W / 2 - 0.35, 0.8, 1.0], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      ada.update(dt, time, g.engine.camera);
      // the empty sleeves stir, though there's no draught
      jacket.rotation.y = Math.sin(time * 0.5) * 0.03;
    },
    enter: async () => {
      if (!g.flag('a.sewEntered')) {
        g.set('a.sewEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'sew.enter1' }, { who: 'diego', key: 'sew.enter2' }]);
      }
    },
    hint: () => {
      if (g.flag('glasses')) return 'hint.ada.leave';
      if (!g.flag('a.cab')) return g.save.notebook.includes('note.clara') ? 'hint.sew.chestKnown' : 'hint.sew.chest';
      if (!g.flag('a.threaded')) return 'hint.sew.thread';
      if (!g.flag('a.sewn')) return 'hint.sew.treadle';
      if (!g.flag('a.hemOpen')) return 'hint.sew.hem';
      return 'hint.sew.glasses';
    },
    debug: { unpick },
  };
}
