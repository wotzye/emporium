import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, cyl, mesh, mat, hitBox, dust, lathe, uvInk, woodMaterial, canvasTex, noise, sphere } from '../builders';
import { createBruno } from '../characters';
import { prop } from '../models';
import { t } from '../i18n';
import { sleep, mac2Hint, butcherTiles, butcherPlaster, butcherFloor, smear, hangingTorso } from './mac2_common';
import { onWall } from './lisa_uv';

/**
 * The curing room behind the shop: hams and salami hanging in the dark, the salt bin, the block
 * with the cleaver stuck in it, the grinder clamped to the bench. Under the floor, the cellar.
 * Lisa (invisible ink, on the wall by the bench): the cellar key went into the grinder, and the
 * grinder gives it back only turned the wrong way. Turning it makes noise. Bruno hears.
 */
export function createMacRetro(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.04;
  const W = 4.4, H = 2.8, D = 4.2;
  const rm = room(W, H, D, { wall: butcherPlaster(W, H), floor: butcherFloor(), ceil: woodMaterial({ base: '#211a13', repeat: [2, 2], plank: true }) });
  scene.add(rm);
  // tiles up to 1.6 m on the walls
  for (const [x, z, ry, len] of [[0, -D / 2 + 0.006, 0, W], [-W / 2 + 0.006, 0, Math.PI / 2, D], [W / 2 - 0.006, 0, -Math.PI / 2, D]] as const) {
    const p = mesh(new THREE.PlaneGeometry(len, 1.6), butcherTiles(len, 1.6), x, 0.8, z, false);
    p.rotation.y = ry;
    scene.add(p);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.03));
  // one bare bulb, nearly dead
  const bulb = new THREE.PointLight(0xffd8a8, 0.9, 5, 1.7);
  bulb.position.set(0.3, 2.45, 0);
  scene.add(bulb);
  const bulbGlass = mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0d0 }), 0.3, 2.5, 0, false);
  bulbGlass.userData.noPick = true;
  scene.add(bulbGlass, cyl(0.005, 0.005, 0.3, mat(0x111111), 0.3, 2.65, 0, 4));
  const motes = dust([-2, 0.2, -2], [2, 2.6, 2], 140);
  scene.add(motes.points);
  const steel = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, metalness: 1, roughness: 0.32 });
  const wood = woodMaterial({ base: '#4a3a2a' });

  // ---------------- curing rods: hams and salami ----------------
  const meatDark = new THREE.MeshStandardMaterial({
    map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#4a3a36';
      c.fillRect(0, 0, w, h);
      noise(c, w, h, 2500, 0.2);
    }),
    roughness: 0.6,
  });
  const twine = mat(0xb8ae9c, { roughness: 1 });
  for (const z of [-0.9, 0.4]) {
    scene.add(cyl(0.02, 0.02, 3.4, wood, -0.2, 2.45, z, 6).rotateZ(Math.PI / 2));
    for (let i = 0; i < 7; i++) {
      const x = -1.7 + i * 0.5;
      const ham = i % 3 === 1;
      const m = ham
        ? lathe([[0, -0.32], [0.08, -0.28], [0.14, -0.1], [0.12, 0.08], [0.05, 0.2], [0.02, 0.26], [0, 0.27]], meatDark, 0, 0, 0, 14)
        : cyl(0.04, 0.035, 0.45, meatDark, 0, 0, 0, 10);
      const grp = new THREE.Group();
      grp.add(m);
      grp.add(cyl(0.003, 0.003, ham ? 0.2 : 0.15, twine, 0, ham ? 0.37 : 0.3, 0, 4));
      grp.position.set(x, ham ? 2.0 : 2.1, z);
      grp.userData.sway = i * 1.3 + z;
      grp.traverse((o) => (o.userData.noPick = true));
      scene.add(grp);
    }
  }
  // the third thing on the rod at the back is not a ham
  const torso = hangingTorso(0.8);
  if (torso) {
    torso.position.set(1.6, 1.33, -1.5);
    torso.userData.sway = 2;
    scene.add(torso);
  }

  // ---------------- the bench with the grinder ----------------
  const bx = -1.4, bz = -D / 2 + 0.4;
  scene.add(rbox(1.5, 0.06, 0.7, 0.01, wood, bx, 0.88, bz));
  for (const [x, z] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) scene.add(rbox(0.06, 0.88, 0.06, 0.01, wood, bx + x, 0.44, bz + z));
  const grinderG = new THREE.Group();
  const realGrinder = prop('grinder', { height: 0.42, turn: Math.PI / 2 });
  if (realGrinder) grinderG.add(realGrinder);
  else {
    const iron = mat(0x2a2a2a, { metalness: 0.7, roughness: 0.5 });
    grinderG.add(cyl(0.07, 0.07, 0.22, iron, 0, 0.22, 0, 14).rotateZ(Math.PI / 2));
    grinderG.add(lathe([[0, 0], [0.09, 0.02], [0.05, 0.12], [0, 0.12]], iron, 0, 0.3, 0, 14));
    grinderG.add(rbox(0.04, 0.2, 0.04, 0.01, iron, 0, 0.1, 0));
  }
  grinderG.position.set(bx + 0.2, 0.91, bz);
  scene.add(grinderG);
  // a tray under the mouth of the grinder: where the key falls
  scene.add(rbox(0.3, 0.02, 0.2, 0.005, steel, bx + 0.48, 0.92, bz + 0.05));
  const keyOut = new THREE.Group();
  keyOut.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 14), mat(0x8a7a50, { metalness: 0.8, roughness: 0.4 })));
  keyOut.add(rbox(0.07, 0.008, 0.006, 0.002, mat(0x8a7a50, { metalness: 0.8, roughness: 0.4 }), 0.05, 0, 0));
  keyOut.rotation.x = -Math.PI / 2;
  keyOut.position.set(bx + 0.48, 0.935, bz + 0.05);
  keyOut.visible = false;
  scene.add(keyOut);
  // Lisa's writing above the bench
  const ink = uvInk([t('uv.m2grinder1'), t('uv.m2grinder2')], 1.2, 0.4, {
    onReveal: async () => {
      if (g.flag('m2.grinderUv')) return;
      g.set('m2.grinderUv');
      g.note('note.m2.grinder');
      g.audio.sfx('whisper');
      await g.say('m2.grinderUvRead');
    },
  });
  onWall(ink, 'back', W, D, bx, 1.75);
  scene.add(ink);

  // ---------------- the block and the cleaver ----------------
  const blockG = new THREE.Group();
  blockG.add(cyl(0.34, 0.36, 0.8, woodMaterial({ base: '#6a5641' }), 0, 0.4, 0, 28));
  blockG.add(cyl(0.35, 0.35, 0.02, mat(0x241a12), 0, 0.8, 0, 28));
  const cleaver = prop('cleaver', { width: 0.36, rot: [0, 0, -0.35], grey: 1 });
  if (cleaver) {
    cleaver.position.set(0.02, 0.72, 0);
    cleaver.rotation.y = 0.5;
    blockG.add(cleaver);
  } else {
    const c = new THREE.Group();
    c.add(rbox(0.22, 0.12, 0.01, 0.004, steel, 0, 0, 0));
    c.add(rbox(0.13, 0.03, 0.025, 0.01, mat(0x1a1410), 0.17, 0.03, 0));
    c.position.set(0.05, 0.84, 0);
    c.rotation.set(0, 0.4, -0.25);
    blockG.add(c);
  }
  blockG.position.set(1.2, 0, 0.2);
  scene.add(blockG);

  // ---------------- the salt bin ----------------
  const saltG = new THREE.Group();
  saltG.add(rbox(0.6, 0.55, 0.45, 0.02, woodMaterial({ base: '#3a2c20' }), 0, 0.275, 0));
  const heap = sphere(0.24, mat(0xe8e6e0, { roughness: 1 }), 0, 0.5, 0, 14);
  heap.scale.set(1.1, 0.35, 0.8);
  saltG.add(heap);
  const scoop = cyl(0.04, 0.035, 0.08, steel, 0.12, 0.6, 0.05, 10);
  saltG.add(scoop);
  saltG.position.set(W / 2 - 0.45, 0, -1.2);
  scene.add(saltG);

  // ---------------- trapdoor to the cellar ----------------
  const tdX = 0.2, tdZ = 1.1;
  const trap = new THREE.Group();
  trap.add(rbox(1.0, 0.04, 0.8, 0.01, woodMaterial({ base: '#2c2219', plank: true }), 0.5, 0.02, 0));
  trap.add(mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16), steel, 0.85, 0.045, 0).rotateX(Math.PI / 2));
  const padlock = rbox(0.06, 0.07, 0.03, 0.01, mat(0x5a5a58, { metalness: 0.8, roughness: 0.4 }), 0.92, 0.06, 0);
  trap.add(padlock);
  trap.position.set(tdX - 0.5, 0, tdZ);
  scene.add(trap);
  const hole = mesh(new THREE.PlaneGeometry(0.98, 0.78), new THREE.MeshBasicMaterial({ color: 0x000000 }), tdX, 0.004, tdZ, false);
  hole.rotation.x = -Math.PI / 2;
  hole.userData.noPick = true;
  scene.add(hole);
  const showTrap = () => {
    const open = !!g.flag('m2.cellarOpen');
    trap.rotation.z = open ? 1.9 : 0;
    padlock.visible = !open;
  };
  showTrap();
  scene.add(smear(1.2, 1.4, -0.4, 0.4, 0.8, 5));

  // the door back to the shop (in the front wall)
  const doorG = new THREE.Group();
  doorG.add(rbox(0.95, 2.1, 0.06, 0.02, woodMaterial({ base: '#3a2c20', repeat: [1, 2] }), 0, 1.05, 0));
  doorG.position.set(-1.3, 0, D / 2 - 0.04);
  scene.add(doorG);

  // Bruno, for when he comes looking
  const brunoC = createBruno();
  const bruno = brunoC.group;
  bruno.visible = false;
  bruno.traverse((o) => (o.userData.noPick = true));
  scene.add(bruno);

  // ---------------- hotspots ----------------
  const hGrinder = hitBox(0.6, 0.55, 0.6, bx + 0.2, 1.15, bz, 'grinder');
  const hBench = hitBox(1.6, 0.4, 0.8, bx, 0.85, bz, 'bench');
  const hBlock = hitBox(0.8, 1.0, 0.8, 1.2, 0.5, 0.2, 'block');
  const hSalt = hitBox(0.7, 0.7, 0.55, W / 2 - 0.45, 0.35, -1.2, 'salt');
  const hTrap = hitBox(1.1, 0.25, 0.9, tdX, 0.1, tdZ, 'trap');
  const hHams = hitBox(3.6, 0.8, 2.0, -0.2, 2.1, -0.25, 'hams');
  const hDoor = hitBox(1.0, 2.1, 0.3, -1.3, 1.05, D / 2 - 0.15, 'door');
  const hWall = hitBox(1.4, 0.6, 0.1, bx, 1.75, -D / 2 + 0.06, 'wall');
  scene.add(hWall);
  scene.add(hGrinder, hBench, hBlock, hSalt, hTrap, hHams, hDoor);
  const say = (k: string) => g.say(k);

  /** he heard the grinder: torch off, phone face down, don't breathe */
  const brunoComes = async () => {
    g.audio.hush(5);
    await sleep(600);
    g.audio.steps(4, 0.7);
    g.engine.shake(0.03, 0.4);
    await g.say([{ who: 'diego', key: 'm2.hide1' }]);
    g.audio.sfx('creak');
    bruno.position.set(-1.3, 0, D / 2 - 0.3);
    bruno.rotation.y = Math.PI;
    bruno.visible = true;
    g.setTorch(false, true);
    bulb.intensity = 0.6;
    await g.view('hide', 0.5);
    // walk him in, slowly, while you try to vanish
    let walking = true;
    const walk = (async () => {
      const path: [number, number][] = [[-1.3, 1.4], [-0.6, 0.6], [0.4, -0.2], [1.0, -0.6]];
      bruno.userData.moving = true;
      for (let i = 1; i < path.length && walking; i++) {
        const [x0, z0] = path[i - 1], [x1, z1] = path[i];
        bruno.rotation.y = Math.atan2(x1 - x0, z1 - z0);
        for (let k = 0; k <= 30 && walking; k++) {
          bruno.position.set(x0 + ((x1 - x0) * k) / 30, 0, z0 + ((z1 - z0) * k) / 30);
          await sleep(60);
        }
      }
      bruno.userData.moving = false;
    })();
    g.audio.rec('growl', { gain: 0.6, rate: 0.8 });
    const timeout = sleep(14000).then(() => 'late' as const);
    const hid = await Promise.race([g.physical('facedown', 'm2.hideText').then((ok) => (ok ? 'ok' : 'no')), timeout]);
    if (hid === 'late') g.ui.closeModal();
    walking = false;
    await walk;
    if (hid === 'ok') {
      g.audio.sfx('heart');
      brunoC.setEyes(true);
      await sleep(1200);
      await g.say([{ who: 'bruno', key: 'm2.brunoSniff' }]);
      await sleep(800);
      g.audio.steps(4, 0.7);
      bruno.userData.moving = true;
      for (let k = 0; k < 30; k++) {
        bruno.position.z += 0.06;
        bruno.position.x -= 0.04;
        await sleep(50);
      }
      bruno.visible = false;
      bruno.userData.moving = false;
      await g.say([{ who: 'diego', key: 'm2.hideOk' }]);
    } else {
      brunoC.setEyes(true);
      g.audio.rec('smash', { gain: 1.1 });
      await g.scare('bruno', 600);
      bruno.visible = false;
      await g.say([{ who: 'narr', key: 'm2.hideFail' }, { who: 'diego', key: 'm2.hideFail2' }]);
    }
    bulb.intensity = 0.9;
    g.set('m2.hidden');
    g.setTorch(true, true);
    await g.view('main', 0.6);
  };

  let turnAcc = 0, wrongWay = 0, grinding = 0;
  const keyDrops = async () => {
    g.set('m2.cellarKey');
    keyOut.visible = true;
    g.audio.sfx('clunk');
    await g.say('m2.keyOut');
    keyOut.visible = false;
    g.give('cellarkey');
    if (!g.flag('m2.hidden')) await brunoComes();
  };
  /** test handle: turn it back as if by hand */
  const reverse = async () => {
    if (!g.flag('m2.cellarKey')) await keyDrops();
  };

  const hotspots: Hotspot[] = [
    { id: 'grinder', obj: hGrinder, view: 'grinder', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('m2.cellarKey')) return say('m2.grinderDone');
      return say(g.flag('m2.grinderUv') ? 'm2.grinderHow' : 'm2.grinder');
    } },
    { id: 'bench', obj: hBench, view: 'grinder', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('m2.bench');
    } },
    { id: 'block', obj: hBlock, view: 'block', tap: async (item) => {
      if (item) return g.nope();
      return g.say([{ who: 'diego', key: 'm2.block1' }, { who: 'diego', key: 'm2.block2' }]);
    } },
    { id: 'salt', obj: hSalt, view: 'salt', tap: async (item) => {
      if (item) return g.nope();
      if (g.has('salt') || g.flag('m2.salt')) return say('m2.saltMore');
      g.audio.sfx('rub');
      g.give('salt');
      return say('m2.saltTaken');
    } },
    { id: 'trap', obj: hTrap, view: 'trap', tap: async (item) => {
      if (g.flag('m2.cellarOpen')) {
        if (item) return g.nope();
        g.audio.steps(6, 0.45, false);
        return g.go('mac_cantina');
      }
      if (item === 'cellarkey') {
        g.deselect();
        g.take('cellarkey');
        g.set('m2.cellarOpen');
        g.audio.sfx('unlock');
        await sleep(300);
        g.audio.sfx('trapdoor');
        showTrap();
        return say('m2.trapOpen');
      }
      if (item) return g.nope();
      return say('m2.trapLocked');
    } },
    { id: 'wall', obj: hWall, view: 'wall', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('m2.grinderUv')) return say('m2.wallRead');
      return say(g.uvOn && g.engine.torchOn ? 'm2.wallUv' : 'm2.wall');
    } },
    { id: 'hams', obj: hHams, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('m2.hams');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.5, false);
      return g.go('macelleria');
    } },
  ];

  // ---------------- the grinder's crank: turn it with a finger ----------------
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: hGrinder,
      center: new THREE.Vector3(bx + 0.2, 1.12, bz),
      when: () => g.viewName === 'grinder' && !g.flag('m2.cellarKey'),
      onTurn: (d) => {
        turnAcc += d;
        grinding += Math.abs(d);
        grinderG.rotation.x = (Math.random() - 0.5) * 0.02;
        if (grinding > 0.9) {
          grinding = 0;
          g.audio.sfx(d < 0 ? 'clunk' : 'scrape');
        }
      },
      onEnd: async () => {
        grinderG.rotation.x = 0;
        // clockwise grinds on, empty; three turns the wrong way bring the key back up
        if (turnAcc < -Math.PI * 2 * 2.5) {
          turnAcc = 0;
          await keyDrops();
        } else if (turnAcc > Math.PI * 2 * 1.5) {
          turnAcc = 0;
          wrongWay++;
          await say(wrongWay === 1 || !g.flag('m2.grinderUv') ? 'm2.grinderWrong' : 'm2.grinderWrong2');
        } else if (turnAcc < -Math.PI) await say('m2.grinderAlmost');
      },
    },
  ];

  return {
    id: 'mac_retro',
    nameKey: 'place.macRetro',
    next: ['macelleria', 'mac_cantina'],
    scene,
    drone: 'macelleria',
    startView: 'main',
    exitTo: 'macelleria',
    dark: () => true,
    views: {
      main: { pos: [0.6, 1.65, 1.8], look: [-0.6, 1.0, -1.6], yaw: 60, pitch: 18 },
      grinder: { pos: [bx + 0.25, 1.4, bz + 0.85], look: [bx + 0.25, 1.05, bz], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      block: { pos: [0.6, 1.5, 1.1], look: [1.2, 0.75, 0.2], parent: 'main', yaw: 20, pitch: 12 },
      salt: { pos: [0.9, 1.5, -0.6], look: [W / 2 - 0.45, 0.5, -1.2], parent: 'main', yaw: 20, pitch: 12 },
      trap: { pos: [tdX, 1.55, tdZ + 1.0], look: [tdX, 0.0, tdZ], parent: 'main', yaw: 20, pitch: 12 },
      wall: { pos: [bx, 1.72, bz + 1.1], look: [bx, 1.75, -D / 2], parent: 'main', yaw: 25, pitch: 14, fov: 55 },
      hide: { pos: [1.7, 1.0, -1.7], look: [-0.6, 1.2, 1.0], yaw: 5, pitch: 5 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      bulb.intensity *= Math.random() < 0.02 ? 0.3 : 1;
      if (bulb.intensity < (bruno.visible ? 0.6 : 0.9)) bulb.intensity = Math.min(0.9, bulb.intensity + dt * 2);
      scene.traverse((o) => {
        if (o.userData.sway !== undefined) o.rotation.z = Math.sin(time * 0.5 + o.userData.sway) * 0.025;
      });
      if (bruno.visible) brunoC.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('m2.labEntered')) {
        g.set('m2.labEntered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'm2.labEnter1' }, { who: 'diego', key: 'm2.labEnter2' }]);
      }
    },
    hint: () => mac2Hint(g),
    debug: { reverse, bruno: brunoC },
  };
}
