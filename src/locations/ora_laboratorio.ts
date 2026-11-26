import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, lightCone, canvasTex, noise, woodMaterial, plasterMaterial, mat, cyl, lathe, liveCanvas } from '../builders';
import { prop } from '../models';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { gear, brassMat, steelMat, wallClock } from './ora_common';

/**
 * The workshop. On the bench, an open movement with three empty arbors between the spring
 * barrel and the hand pinion. Four loose gears in a tray. The engraved plate that says which goes
 * where is under a crust of dust: blow on it. Mesh the train and the drawer under the bench opens.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// radii: the right order is small, large, medium (P · G · M)
const R = { P: 0.035, G: 0.07, M: 0.05, X: 0.06 } as const;
type GearId = keyof typeof R;
const RIGHT: GearId[] = ['P', 'G', 'M'];

export function createOraLaboratorio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.08;
  const W = 3.6, H = 2.7, D = 3.4;
  const woodDark = woodMaterial({ base: '#2a1f15' });
  const woodBench = woodMaterial({ base: '#5c4630' });
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#5e5a52', repeat: [2, 1.5], damp: 1 }),
    floor: woodMaterial({ base: '#3a2d20', repeat: [3, 3], plank: true }),
    ceil: plasterMaterial({ base: '#2e2b27', repeat: [2, 2] }),
  }));
  const brass = brassMat();
  const steel = steelMat();
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const motes = dust([-1.7, 0.2, -1.6], [1.7, 2.5, 1.6], 120);
  scene.add(motes.points);

  // ---------------- the bench ----------------
  const benchZ = -1.15, benchTop = 0.92;
  scene.add(rbox(2.6, 0.06, 0.8, 0.01, woodBench, 0, benchTop - 0.03, benchZ));
  for (const x of [-1.2, 1.2]) for (const z of [-0.35, 0.35]) scene.add(rbox(0.07, benchTop - 0.06, 0.07, 0.01, woodDark, x, (benchTop - 0.06) / 2, benchZ + z));
  // drawer under the bench (slides towards the player)
  const drawer = new THREE.Group();
  drawer.add(rbox(0.6, 0.14, 0.6, 0.01, woodDark, 0, 0, 0));
  drawer.add(rbox(0.6, 0.14, 0.02, 0.005, woodBench, 0, 0, 0.31));
  drawer.add(cyl(0.012, 0.012, 0.05, brass, 0, 0, 0.34, 8).rotateX(Math.PI / 2));
  drawer.position.set(0.5, benchTop - 0.14, benchZ + 0.05);
  scene.add(drawer);
  const drawerOpen = () => !!g.flag('o.gears');
  if (drawerOpen()) drawer.position.z = benchZ + 0.4;
  // the photo of Clara and the winding key lie inside
  const claraTex = oldPhoto('clara', 320, 240, (c, w, h) => {
    c.fillStyle = '#cfc8b8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#6e675c';
    c.fillRect(14, 14, w - 28, h - 28);
    // a man and a little girl, under the clocks
    c.fillStyle = '#2b2824';
    c.beginPath();
    c.arc(w * 0.38, h * 0.36, 20, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.38 - 30, h * 0.44, 60, h * 0.5);
    c.fillStyle = '#e8e2d6';
    c.beginPath();
    c.arc(w * 0.64, h * 0.56, 14, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.64 - 20, h * 0.62, 40, h * 0.3);
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(30 + i * 45, 40, 12, 0, Math.PI * 2);
      c.fill();
    }
  }, { age: 0.3, border: false });
  const photo = mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshStandardMaterial({ map: claraTex, roughness: 0.9 }), -0.1, 0.075, 0, false);
  photo.rotation.x = -Math.PI / 2;
  drawer.add(photo);
  const wkey = new THREE.Group();
  wkey.add(cyl(0.008, 0.008, 0.1, steel, 0, 0, 0, 6).rotateX(Math.PI / 2));
  wkey.add(rbox(0.08, 0.012, 0.04, 0.004, steel, 0, 0, -0.06));
  wkey.position.set(0.15, 0.08, 0);
  drawer.add(wkey);
  wkey.scale.setScalar(1.4);
  const hPhoto = hitBox(0.18, 0.05, 0.14, -0.1, 0.08, 0, 'drawerPhoto');
  const hWkey = hitBox(0.12, 0.06, 0.2, 0.15, 0.08, -0.02, 'drawerKey');
  drawer.add(hPhoto, hWkey);
  photo.visible = !g.flag('o.photo');
  wkey.visible = !g.flag('o.windKey');

  // magnifier lamp on an arm, the only real light in here
  const lampHead = new THREE.Group();
  lampHead.add(lathe([[0, 0], [0.11, 0], [0.12, 0.02], [0.06, 0.09], [0.03, 0.12], [0, 0.12]], mat(0x1f1d1a, { roughness: 0.4, side: THREE.DoubleSide })));
  lampHead.position.set(-0.15, 1.55, benchZ + 0.05);
  lampHead.rotation.x = Math.PI;
  scene.add(lampHead);
  scene.add(cyl(0.01, 0.01, 0.8, steel, -0.7, 1.25, benchZ - 0.3, 6).rotateZ(-0.6));
  const work = new THREE.SpotLight(0xffe8c4, 12, 3.2, 0.55, 0.5, 1.4);
  work.position.set(-0.15, 1.5, benchZ + 0.05);
  work.target.position.set(0.05, benchTop, benchZ + 0.05);
  work.castShadow = true;
  scene.add(work, work.target);
  scene.add(lightCone(-0.15, 1.5, benchZ + 0.05, 0.58, 0.45, 0.04));

  // ---------------- the movement ----------------
  // a brass plate; spring barrel on the left, hand pinion on the right, three empty arbors between
  const plateX = -0.2, plateZ = benchZ + 0.05, y0 = benchTop + 0.012;
  scene.add(rbox(0.68, 0.012, 0.26, 0.01, brass, plateX + 0.2, benchTop + 0.006, plateZ));
  const barrelR = 0.05, pinionR = 0.04;
  const xs = [0, 0.085, 0.19, 0.31, 0.4].map((d) => plateX - 0.02 + d);
  const barrel = gear(barrelR, 22, brass);
  barrel.position.set(xs[0], y0, plateZ);
  scene.add(barrel);
  const pinion = gear(pinionR, 16, steel);
  pinion.position.set(xs[4], y0, plateZ);
  scene.add(pinion);
  // a tiny clock hand on the pinion's axle, so you see it go when the train meshes
  const hand = rbox(0.008, 0.008, 0.12, 0.002, mat(0x0d0c0b), 0, 0.03, -0.05);
  pinion.add(hand);
  const arbors = [1, 2, 3].map((i) => {
    const a = cyl(0.004, 0.004, 0.03, steel, xs[i], y0 + 0.015, plateZ, 6);
    scene.add(a);
    return new THREE.Vector3(xs[i], y0, plateZ);
  });

  // the engraved instruction plate, under dust
  const plateCv = liveCanvas(256, 96);
  let dustK = g.flag('o.blown') ? 0 : 1;
  const drawPlate = () => {
    const c = plateCv.ctx;
    c.fillStyle = '#6e5c36';
    c.fillRect(0, 0, 256, 96);
    c.fillStyle = '#120c04';
    c.font = 'bold 46px Georgia, serif';
    c.textAlign = 'center';
    c.fillText(t('ora.plate'), 128, 62);
    if (dustK > 0) {
      // thick grey felt of dust: dark enough that the torch doesn't wash it out
      c.fillStyle = `rgba(62,58,52,${0.97 * dustK})`;
      c.fillRect(0, 0, 256, 96);
      noise(c, 256, 96, 4000, 0.45 * dustK);
      c.strokeStyle = `rgba(150,140,120,${0.5 * dustK})`;
      c.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        c.beginPath();
        const x = Math.random() * 256, y = Math.random() * 96;
        c.moveTo(x, y);
        c.lineTo(x + Math.random() * 20 - 10, y + Math.random() * 8 - 4);
        c.stroke();
      }
    }
    c.strokeStyle = '#2a2010';
    c.lineWidth = 6;
    c.strokeRect(3, 3, 250, 90);
    plateCv.update();
  };
  drawPlate();
  // the plate stands on a little brass foot behind the movement, tilted towards you
  const plateY = benchTop + 0.07, plateZ2 = plateZ - 0.17;
  const plate = mesh(new THREE.PlaneGeometry(0.3, 0.1125), new THREE.MeshStandardMaterial({ map: plateCv.tex, roughness: 0.95, metalness: 0 }), plateX + 0.2, plateY, plateZ2, false);
  plate.rotation.x = -0.45;
  scene.add(plate);
  scene.add(rbox(0.32, 0.012, 0.05, 0.004, brass, plateX + 0.2, benchTop + 0.006, plateZ2 - 0.02));

  // the loose gears, in a tray at the right
  const trayX = 0.75, trayZ = benchZ + 0.12;
  scene.add(rbox(0.36, 0.02, 0.24, 0.005, woodDark, trayX, benchTop + 0.01, trayZ));
  type Loose = { id: GearId; o: THREE.Group; home: THREE.Vector3; on: number };
  const startPos: Record<GearId, [number, number]> = { P: [-0.1, -0.06], G: [0.09, 0.03], M: [-0.07, 0.07], X: [0.1, -0.08] };
  const saved: Record<string, number> = JSON.parse((g.flag('o.gearPos') as string | undefined) ?? '{}');
  const loose: Loose[] = (Object.keys(R) as GearId[]).map((id) => {
    const o = gear(R[id], Math.round(R[id] * 420), id === 'X' ? steel : brass);
    o.add(hitBox(R[id] * 2 + 0.03, 0.05, R[id] * 2 + 0.03, 0, 0.015, 0, 'gear' + id));
    const home = new THREE.Vector3(trayX + startPos[id][0], benchTop + 0.02, trayZ + startPos[id][1]);
    o.position.copy(home);
    scene.add(o);
    return { id, o, home, on: -1 };
  });
  for (const l of loose) {
    const a = saved[l.id];
    if (a !== undefined && a >= 0) {
      l.on = a;
      l.o.position.copy(arbors[a]);
    }
  }
  if (drawerOpen()) RIGHT.forEach((id, i) => {
    const l = loose.find((q) => q.id === id)!;
    l.on = i;
    l.o.position.copy(arbors[i]);
  });
  const save = () => g.set('o.gearPos', JSON.stringify(Object.fromEntries(loose.map((l) => [l.id, l.on]))));
  // the big wheel is not in the tray: Ottavio lent it to Ettore, at the Villino (it's in the shed there)
  const haveBig = () => !!g.flag('o.gearIn') || drawerOpen() || (saved.G ?? -1) >= 0;
  const bigG = loose.find((l) => l.id === 'G')!;
  bigG.o.visible = haveBig();
  const lentTag = textPlane([t('ora.lentTag')], 0.09, 0.04, { bg: '#e2dccb', size: 18, px: 64 });
  lentTag.rotation.x = -Math.PI / 2;
  lentTag.position.set(trayX + startPos.G[0], benchTop + 0.022, trayZ + startPos.G[1]);
  lentTag.visible = !haveBig();
  scene.add(lentTag);
  let spinning = drawerOpen();

  // shelves of parts, a cabinet of drawers, clocks in pieces
  for (let r = 0; r < 3; r++) scene.add(rbox(1.4, 0.03, 0.3, 0.005, woodDark, W / 2 - 0.85, 1.3 + r * 0.42, -D / 2 + 0.18));
  for (let i = 0; i < 9; i++) {
    const c = wallClock(0.06 + (i % 3) * 0.02, { roman: i % 2 === 0, bezel: i % 2 ? brass : woodDark });
    c.group.position.set(W / 2 - 1.45 + (i % 3) * 0.45, 1.42 + Math.floor(i / 3) * 0.42, -D / 2 + 0.2);
    c.group.rotation.x = -0.15;
    scene.add(c.group);
  }
  const cab = prop('sideboard', { width: 1.0 });
  if (cab) {
    cab.position.set(-W / 2 + 0.6, 0, 0.6);
    cab.rotation.y = Math.PI / 2;
    scene.add(cab);
  }
  // Ottavio's apron and loupe on a hook
  const apron = mesh(new THREE.PlaneGeometry(0.4, 0.7), mat(0x3a352f, { side: THREE.DoubleSide }), -W / 2 + 0.02, 1.4, -0.9, false);
  apron.rotation.y = Math.PI / 2;
  scene.add(apron);
  // the door back to the shop
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, 0.9, 1.025, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hBench = hitBox(0.9, 0.2, 0.45, plateX + 0.2, benchTop + 0.05, plateZ, 'movement');
  const hPlate = hitBox(0.34, 0.16, 0.1, plateX + 0.2, plateY, plateZ2, 'plate');
  const hDrawer = hitBox(0.7, 0.22, 0.7, 0.5, benchTop - 0.14, benchZ + 0.35, 'drawer');
  const hShelves = hitBox(1.5, 1.2, 0.4, W / 2 - 0.85, 1.7, -D / 2 + 0.2, 'shelves');
  const hApron = hitBox(0.5, 0.8, 0.2, -W / 2 + 0.1, 1.4, -0.9, 'apron');
  const hDoor = hitBox(1.0, 2.1, 0.2, 0.9, 1.05, D / 2 - 0.1, 'door');
  const hTray = hitBox(0.38, 0.06, 0.26, trayX, benchTop + 0.03, trayZ, 'tray');
  scene.add(hTray);
  scene.add(hBench, hPlate, hDrawer, hShelves, hApron, hDoor);
  const say = (key: string) => g.say(key);

  const solved = async () => {
    g.set('o.gears');
    spinning = true;
    g.audio.rec('windup', { gain: 0.7 });
    g.audio.sfx('tick');
    await sleep(1400);
    await g.view('drawer');
    g.audio.sfx('drawer');
    for (let i = 0; i <= 20; i++) {
      drawer.position.z = benchZ + 0.05 + (i / 20) * 0.35;
      await sleep(25);
    }
    await say('ora.drawerOpen');
  };

  const hotspots: Hotspot[] = [
    { id: 'tray', obj: hTray, view: 'bench', when: () => !haveBig(), tap: async (item) => {
      if (item === 'gear') {
        g.deselect();
        g.take('gear');
        g.set('o.gearIn');
        lentTag.visible = false;
        bigG.o.visible = true;
        g.audio.sfx('clunk');
        return say('ora.gearBack');
      }
      if (item) return g.nope();
      return say('ora.trayMissing');
    } },
    { id: 'movement', obj: hBench, view: 'bench', lowPriority: true, tap: async (item) => {
      if (item === 'gear') {
        g.deselect();
        g.take('gear');
        g.set('o.gearIn');
        lentTag.visible = false;
        bigG.o.visible = true;
        g.audio.sfx('clunk');
        return say('ora.gearBack');
      }
      if (item) return g.nope();
      if (drawerOpen()) return say('ora.movementAfter');
      return say(g.flag('o.blown') ? 'ora.movement2' : 'ora.movement');
    } },
    { id: 'plate', obj: hPlate, view: 'bench', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('o.blown')) return say('ora.plateRead');
      await say('ora.plateDusty');
      const ok = await g.physical('blow', 'ora.blowText');
      if (!ok) return;
      g.set('o.blown');
      g.audio.sfx('steam');
      for (let i = 20; i >= 0; i--) {
        dustK = i / 20;
        drawPlate();
        await sleep(40);
      }
      g.note('note.gears');
      return say('ora.plateRead');
    } },
    { id: 'drawerPhoto', obj: hPhoto, view: 'drawer', when: () => drawerOpen() && photo.visible, tap: async (item) => {
      if (item) return g.nope();
      photo.visible = false;
      g.set('o.photo');
      g.audio.sfx('paper');
      await g.ui.doc(t('ora.photoTitle'), t('ora.photoBack'), true);
      g.note('note.clara');
    } },
    { id: 'drawerKey', obj: hWkey, view: 'drawer', when: () => drawerOpen() && wkey.visible, tap: async (item) => {
      if (item) return g.nope();
      wkey.visible = false;
      g.set('o.windKey');
      g.give('windkey');
      g.audio.sfx('pickup');
      return say('ora.windKey');
    } },
    { id: 'drawer', obj: hDrawer, view: 'drawer', when: () => !drawerOpen() || (!photo.visible && !wkey.visible) || g.viewName !== 'drawer', tap: async (item) => {
      if (item) return g.nope();
      if (!drawerOpen()) return say('ora.drawerShut');
      if (photo.visible) {
        photo.visible = false;
        g.set('o.photo');
        g.audio.sfx('paper');
        await g.ui.doc(t('ora.photoTitle'), t('ora.photoBack'), true);
        g.note('note.clara');
        return;
      }
      if (wkey.visible) {
        wkey.visible = false;
        g.set('o.windKey');
        g.give('windkey');
        g.audio.sfx('pickup');
        return say('ora.windKey');
      }
      return say('ora.drawerEmpty');
    } },
    { id: 'shelves', obj: hShelves, tap: async (item) => {
      if (item) return g.nope();
      return say('ora.shelves');
    } },
    { id: 'apron', obj: hApron, tap: async (item) => {
      if (item) return g.nope();
      return say('ora.apron');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // ---------------- direct manipulation: put the gears on the arbors ----------------
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(benchTop + 0.03));
  const interactions: Interaction[] = loose.map((l) => ({
    kind: 'drag' as const,
    obj: l.o,
    plane,
    when: () => g.viewName === 'bench' && !drawerOpen() && (l.id !== 'G' || haveBig()),
    onStart: () => {
      g.audio.sfx('click');
      l.on = -1;
    },
    onMove: () => {
      l.o.position.y = benchTop + 0.03;
    },
    onEnd: async () => {
      // snap to the nearest free arbor, or back to the tray
      let best = -1, bd = 0.04;
      arbors.forEach((a, i) => {
        const d = Math.hypot(l.o.position.x - a.x, l.o.position.z - a.z);
        if (d < bd && !loose.some((q) => q !== l && q.on === i)) {
          bd = d;
          best = i;
        }
      });
      if (best < 0) {
        l.o.position.copy(l.home);
        save();
        return;
      }
      l.on = best;
      l.o.position.copy(arbors[best]);
      g.audio.sfx('clunk');
      save();
      const full = [0, 1, 2].map((i) => loose.find((q) => q.on === i)?.id);
      if (full.every(Boolean)) {
        if (full.every((id, i) => id === RIGHT[i])) await solved();
        else {
          await sleep(300);
          g.audio.sfx('wrong');
          await say(full.includes('X') ? 'ora.gearsWrongX' : 'ora.gearsWrong');
        }
      }
    },
  }));

  return {
    id: 'ora_laboratorio',
    nameKey: 'place.oraLaboratorio',
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'ora_bottega',
    views: {
      main: { pos: [0.9, 1.6, 1.25], look: [-0.2, 0.95, -1.1], yaw: 60, pitch: 18 },
      drawer: { pos: [0.5, benchTop + 0.4, benchZ + 1.05], look: [0.5, benchTop - 0.16, benchZ + 0.35], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      bench: { pos: [0.25, 1.48, benchZ + 0.62], look: [0.15, benchTop, benchZ + 0.02], parent: 'main', yaw: 15, pitch: 10, fov: 52 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      if (spinning) {
        // the train turns: each wheel the opposite way to its neighbour, speed by size
        const w = time * 1.2;
        barrel.rotation.y = w;
        loose.forEach((l) => {
          if (l.on < 0) return;
          const dir = l.on % 2 === 0 ? -1 : 1;
          l.o.rotation.y = dir * w * (barrelR / R[l.id]);
        });
        pinion.rotation.y = w * (barrelR / pinionR);
      }
    },
    enter: async () => {
      if (!g.flag('o.labEntered')) {
        g.set('o.labEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ora.lab1' }]);
      }
    },
    hint: () => {
      if (!g.flag('o.blown')) return 'hint.ora.blow';
      if (!drawerOpen() && !haveBig()) return g.has('gear') ? 'hint.ora.gearBack' : 'hint.ora.needGear';
      if (!drawerOpen()) return 'hint.ora.gears';
      if (!g.flag('o.photo') || !g.flag('o.windKey')) return 'hint.ora.drawer';
      return 'hint.ora.code';
    },
    debug: { loose, arbors, benchTop },
  };
}
