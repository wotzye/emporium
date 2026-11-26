import * as THREE from 'three';
import { prop, cursify } from '../models';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, cyl, mat, mesh, rbox, lathe, dust, hitBox, canvasTex, noise, woodMaterial, cursedMat } from '../builders';
import { createAdaGhost } from '../characters';
import { t } from '../i18n';
import { lisaInk, onWall } from './lisa_uv';
import { sleep } from './ada_common';

/** Ada's attic: low, dark, crates stacked in front of the trunk she climbed up to every night. */
export const TRUNK_CODE = '1406';

export function createAdaSoffitta(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 7);
  scene.userData.envIntensity = 0.05;
  const W = 4.6, H = 2.3, D = 4.2;
  const boards = woodMaterial({ base: '#3b2e21', repeat: [4, 4], plank: true });
  scene.add(room(W, H, D, { wall: woodMaterial({ base: '#2e241a', repeat: [3, 1.5], plank: true }), floor: boards, ceil: woodMaterial({ base: '#241c14', repeat: [3, 3], plank: true }) }));
  // Lisa's message, in invisible ink (UV torch)
  scene.add(onWall(lisaInk(g, 'ada'), 'back', W, D, 0.8, 1.55));
  const woodDark = woodMaterial({ base: '#2a2016' });
  // rafters
  for (let x = -2; x <= 2; x += 0.8) scene.add(rbox(0.12, 0.16, D, 0.01, woodDark, x, H - 0.08, 0));

  // a crack of moonlight from a tiny round window, the rest is your torch
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const moon = new THREE.SpotLight(0xb8c4d0, 6, 6, 0.35, 0.9, 1.3);
  moon.position.set(-W / 2 + 0.1, 1.9, -0.6);
  moon.target.position.set(0, 0, -0.9);
  scene.add(moon, moon.target);
  scene.add(mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshBasicMaterial({ color: 0x59636b }), -W / 2 + 0.01, 1.9, -0.6, false).rotateY(Math.PI / 2));
  const motes = dust([-2.2, 0.1, -2], [2.2, 2.2, 2], 200);
  scene.add(motes.points);
  // the dead lamp, swinging
  const cage = prop('cagedLight', { height: 0.4 });
  const cagePivot = new THREE.Group();
  if (cage) {
    cage.position.y = -0.4;
    cagePivot.add(cage);
  }
  cagePivot.position.set(0.3, H, 0.3);
  scene.add(cagePivot);
  // the hatch you came up through
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0x111111 }), 0.6, 0.003, 1.4, false).rotateX(-Math.PI / 2));

  // ---------------- the trunk ----------------
  const trunkPos = new THREE.Vector3(-0.35, 0, -1.6);
  const chest = prop('chest', { width: 0.9 });
  const chestGroup = new THREE.Group();
  let lid: THREE.Object3D | null = null;
  if (chest) {
    chestGroup.add(chest);
    lid = chest.getObjectByName('treasure_chest_lid') ?? null;
  } else {
    chestGroup.add(rbox(0.9, 0.45, 0.5, 0.03, woodDark, 0, 0.225, 0));
    lid = rbox(0.9, 0.1, 0.5, 0.03, woodDark, 0, 0.5, 0);
    chestGroup.add(lid);
  }
  chestGroup.position.copy(trunkPos);
  scene.add(chestGroup);
  const lidRest = lid ? lid.rotation.x : 0;
  const trunkOpen = () => !!g.flag('a.trunk');
  const setLid = (k: number) => {
    if (lid) lid.rotation.x = lidRest - k * 1.3;
  };
  setLid(trunkOpen() ? 1 : 0);
  // the glasses, inside, on a folded wedding veil
  const veil = mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 }), trunkPos.x, 0.36, trunkPos.z, false);
  veil.rotation.x = -Math.PI / 2;
  scene.add(veil);
  const glasses = new THREE.Group();
  const spec = prop('spectacles', { width: 0.14 });
  if (spec) {
    glasses.add(cursify(spec));
  } else {
    for (const s of [-1, 1]) glasses.add(mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 20), cursedMat(), s * 0.035, 0.02, 0));
  }
  glasses.position.set(trunkPos.x, 0.37, trunkPos.z + 0.02);
  glasses.rotation.y = 0.3;
  scene.add(glasses);
  const glow = new THREE.PointLight(0xff2a2a, 0, 1.4, 2);
  glow.position.set(trunkPos.x, 0.6, trunkPos.z + 0.1);
  scene.add(glow);
  // new route: the glasses are sewn into Ettore's jacket downstairs; the trunk only keeps the key
  const sewRoute = () => !!g.flag('a.sewRoute');
  glasses.visible = trunkOpen() && !g.flag('glasses') && !sewRoute();

  // ---------------- crates in the way ----------------
  type Crate = { o: THREE.Object3D; start: THREE.Vector3 };
  const crateDefs: [Parameters<typeof prop>[0], number, number, number, number][] = [
    ['armyCrate', -0.75, -0.85, 0.75, 0.2],
    ['crate', 0.15, -0.95, 0.8, -0.15],
    ['crate', -0.25, -0.45, 0.7, 0.5],
  ];
  const moved: number[][] = ((g.flag('a.crates') as string | undefined) ?? '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));
  const crates: Crate[] = crateDefs.map(([id, x, z, w, ry], i) => {
    const grp = new THREE.Group();
    const p = prop(id, { width: w });
    if (p) grp.add(p);
    else grp.add(rbox(w, 0.4, 0.45, 0.02, woodDark, 0, 0.2, 0));
    const bb = new THREE.Box3().setFromObject(grp);
    const sz = bb.getSize(new THREE.Vector3());
    grp.add(hitBox(sz.x + 0.06, sz.y + 0.06, sz.z + 0.06, 0, sz.y / 2, 0, 'crate' + i));
    grp.position.set(x, 0, z);
    if (moved[i]) grp.position.set(moved[i][0], 0, moved[i][1]);
    grp.rotation.y = ry;
    scene.add(grp);
    return { o: grp, start: new THREE.Vector3(x, 0, z) };
  });
  // the trunk is reachable when nothing stands in the strip in front of it
  const blocking = (c: Crate) => c.o.position.z < -0.15 && c.o.position.z > -1.35 && Math.abs(c.o.position.x - trunkPos.x) < 0.75;
  const clear = () => crates.every((c) => !blocking(c));

  // ---------------- her wedding dress on a tailor's dummy ----------------
  const dummy = new THREE.Group();
  dummy.add(cyl(0.015, 0.015, 0.9, woodDark, 0, 0.45, 0, 8));
  dummy.add(lathe([[0, 0], [0.18, 0], [0.16, 0.02], [0, 0.03]], woodDark, 0, 0, 0, 14));
  const dressTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e6e1d6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 6000, 0.12);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = 'rgba(90,80,60,0.18)';
      c.beginPath();
      c.arc(Math.random() * w, h * 0.5 + Math.random() * h * 0.5, 6 + Math.random() * 30, 0, Math.PI * 2);
      c.fill();
    }
  });
  const dressMat = new THREE.MeshStandardMaterial({ map: dressTex, roughness: 0.9, side: THREE.DoubleSide });
  dummy.add(lathe([[0.0, 1.55], [0.09, 1.52], [0.16, 1.42], [0.13, 1.2], [0.12, 1.05], [0.22, 0.75], [0.33, 0.25], [0.36, 0.05]], dressMat, 0, 0, 0, 28));
  dummy.add(cyl(0.035, 0.04, 0.12, woodDark, 0, 1.6, 0, 10));
  dummy.position.set(1.55, 0, -1.3);
  dummy.rotation.y = -0.7;
  scene.add(dummy);
  // a suitcase of letters, the old lantern
  for (const [id, x, z, ry, y] of [['suitcase', 1.6, 0.9, -1.2, 0], ['lantern', -1.8, 1.4, 0.3, 0], ['bucket', 1.9, -0.1, 0, 0]] as const) {
    const pr = prop(id);
    if (!pr) continue;
    pr.position.set(x, y, z);
    pr.rotation.y = ry;
    scene.add(pr);
  }

  // ---------------- Ada ----------------
  const ada = createAdaGhost();
  ada.group.traverse((o) => (o.userData.noPick = true));
  ada.setOpacity(0);
  ada.group.position.set(0.7, 0, 1.0);
  ada.group.rotation.y = Math.PI + 0.5;
  scene.add(ada.group);

  // ---------------- hotspots ----------------
  const hTrunk = hitBox(1.0, 0.7, 0.7, trunkPos.x, 0.35, trunkPos.z, 'trunk');
  const hDummy = hitBox(0.7, 1.7, 0.7, 1.55, 0.85, -1.3, 'dummy');
  const hSuitcase = hitBox(0.8, 0.6, 0.6, 1.6, 0.3, 0.9, 'suitcase');
  const hHatch = hitBox(0.9, 0.3, 0.7, 0.6, 0.1, 1.4, 'down');
  scene.add(hTrunk, hDummy, hSuitcase, hHatch);
  const say = (k: string) => g.say(k);

  const takeGlasses = async () => {
    glasses.visible = false;
    glow.intensity = 0;
    g.set('glasses');
    g.give('glasses');
    g.engine.torchFlicker = 0.8;
    g.audio.hush(4);
    await sleep(600);
    await g.say([{ who: 'ada', key: 'ada.ghost1' }]);
    // behind you
    ada.setOpacity(0.85);
    ada.group.position.set(0.15, 0, 0.55);
    ada.group.lookAt(new THREE.Vector3(-0.35, 0, -1.6));
    await g.view('behind', 0.5);
    g.audio.rec('possessed', { gain: 0.7, dur: 3 });
    await g.scare('ada', 650, 'scare_donna2');
    ada.setOpacity(0);
    g.engine.torchFlicker = 0;
    await g.view('main');
    await g.say([{ who: 'diego', key: 'ada.ghost2' }, { who: 'diego', key: 'ada.ghost3' }]);
  };

  const hotspots: Hotspot[] = [
    { id: 'trunk', obj: hTrunk, view: 'trunk', tap: async (item) => {
      if (item) return g.nope();
      if (!clear()) return say('ada.trunkBlocked');
      if (!trunkOpen()) {
        const ok = await g.ui.keypad(t('ada.trunkLock'), 4, (c) => c === TRUNK_CODE, () => g.audio.sfx('click'));
        if (!ok) return;
        g.set('a.trunk');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 25; i++) {
          setLid(i / 25);
          await sleep(30);
        }
        g.set('a.sewRoute');
        g.audio.sfx('whisper');
        g.give('sewkey');
        return g.say([{ who: 'diego', key: 'ada.trunkOpenSew1' }, { who: 'diego', key: 'ada.trunkOpenSew2' }]);
      }
      if (glasses.visible) return takeGlasses();
      if (sewRoute() && !g.flag('glasses')) return say('ada.trunkSew');
      return say('ada.trunkEmpty');
    } },
    { id: 'dummy', obj: hDummy, view: 'dummy', tap: async (item) => {
      if (item) return g.nope();
      return say('ada.dummy');
    } },
    { id: 'suitcase', obj: hSuitcase, tap: async (item) => {
      if (item) return g.nope();
      // in the case, with her letters, a box of spare bulbs: one red, for a darkroom. Ettore borrowed everything.
      if (!g.flag('a.redbulb')) {
        g.set('a.redbulb');
        g.give('redbulb');
        await g.say([{ who: 'diego', key: 'ada.redbulb1' }, { who: 'diego', key: 'ada.redbulb2' }]);
      }
      g.audio.sfx('paper');
      return g.ui.doc(t('ada.letterTitle'), t('ada.letter'), true);
    } },
    { id: 'down', obj: hHatch, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // ---------------- direct manipulation: shove the crates aside ----------------
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const interactions: Interaction[] = crates.map((c) => ({
    kind: 'drag' as const,
    obj: c.o,
    plane: floor,
    when: () => g.viewName === 'main' || g.viewName === 'crates',
    onStart: () => g.audio.sfx('scrape'),
    onMove: () => {
      c.o.position.y = 0;
      c.o.position.x = THREE.MathUtils.clamp(c.o.position.x, -W / 2 + 0.45, W / 2 - 0.45);
      c.o.position.z = THREE.MathUtils.clamp(c.o.position.z, -D / 2 + 0.75, D / 2 - 0.5);
      // they're heavy: they drag and grind
      if (Math.random() < 0.12) g.audio.sfx('scrape');
    },
    onEnd: async () => {
      g.set('a.crates', crates.map((k) => `${k.o.position.x.toFixed(2)},${k.o.position.z.toFixed(2)}`).join(';'));
      g.audio.sfx('thud');
      if (clear() && !g.flag('a.cleared')) {
        g.set('a.cleared');
        await sleep(300);
        await say('ada.cleared');
      }
    },
  }));

  return {
    id: 'ada_soffitta',
    nameKey: 'place.adaSoffitta',
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'ada_soggiorno',
    views: {
      main: { pos: [0.6, 1.55, 1.55], look: [-0.3, 0.3, -1.2], yaw: 60, pitch: 18 },
      trunk: { pos: [trunkPos.x, 1.2, trunkPos.z + 1.0], look: [trunkPos.x, 0.35, trunkPos.z], parent: 'main', yaw: 20, pitch: 10 },
      dummy: { pos: [0.6, 1.4, -0.4], look: [1.55, 1.1, -1.3], parent: 'main', yaw: 20, pitch: 12 },
      behind: { pos: [trunkPos.x + 0.1, 1.45, trunkPos.z + 0.9], look: [0.15, 1.35, 0.55], parent: 'main', yaw: 10, pitch: 8 },
    },
    hotspots,
    interactions,
    dark: () => true,
    update: (dt, time) => {
      motes.update(dt, time);
      cagePivot.rotation.z = Math.sin(time * 1.1) * 0.07;
      if (glasses.visible) glow.intensity = 0.6 + Math.sin(time * 3) * 0.25;
      if (ada.group.visible) ada.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('a.atticEntered')) {
        g.set('a.atticEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ada.attic1' }, { who: 'diego', key: 'ada.attic2' }]);
      }
    },
    hint: () => {
      if (g.flag('glasses')) return 'hint.ada.leave';
      if (!clear()) return 'hint.ada.crates';
      if (!trunkOpen()) return 'hint.ada.code';
      if (sewRoute()) return 'hint.ada.sewDoor';
      return 'hint.ada.take';
    },
    debug: { crates, clear, trunkPos },
  };
}
