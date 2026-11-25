import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot, Interaction } from '../game';
import { mat, mesh, rbox, cyl, lathe, fx, textPlane, hitBox, bulb, canvasTex, noise, woodMaterial, plasterMaterial, stoneMaterial } from '../builders';
import { t } from '../i18n';

/**
 * The courtyard behind the barber's: rain, a line of sheets that never dry, a stone well.
 * Aldo hid the crank of the cellar trapdoor down the well, in the bucket, and padlocked the winch.
 * The padlock key is upstairs, in his room. Wind the bucket up and the crank is in it.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TURNS = 3;

export function createBarbiereCortile(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.Fog(0x05070a, 4, 13);
  scene.userData.envIntensity = 0.05;
  const W = 6.4, D = 5.6, WH = 5;

  const stone = stoneMaterial([5, 4], '#5a5650');
  const wallM = plasterMaterial({ base: '#77716a', repeat: [3, 2], damp: 1 });
  const woodDark = woodMaterial({ base: '#2f241a' });
  const woodMid = woodMaterial({ base: '#54412e' });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 0.55, metalness: 0.8 });
  const wellStone = stoneMaterial([3, 1], '#6e6a62');

  // ---------------- the yard: cobbles, three walls, the night sky ----------------
  const floor = mesh(new THREE.PlaneGeometry(W, D), stone, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  scene.add(floor);
  // puddles: dark, glossy patches that catch the lamp
  for (const [x, z, r] of [[-0.6, 1.2, 0.5], [1.7, 0.6, 0.35], [0.9, -1.5, 0.3]] as const) {
    const p = mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.05, metalness: 0.4 }), x, 0.004, z, false);
    p.rotation.x = -Math.PI / 2;
    p.scale.y = 0.6;
    scene.add(p);
  }
  const back = mesh(new THREE.PlaneGeometry(W, WH), wallM, 0, WH / 2, -D / 2);
  const left = mesh(new THREE.PlaneGeometry(D, WH), wallM, -W / 2, WH / 2, 0).rotateY(Math.PI / 2);
  const right = mesh(new THREE.PlaneGeometry(D, WH), wallM, W / 2, WH / 2, 0).rotateY(-Math.PI / 2);
  scene.add(back, left, right);
  // gutters and a downpipe dripping
  scene.add(cyl(0.05, 0.05, WH, iron, -W / 2 + 0.12, WH / 2, -D / 2 + 0.12, 8));
  // dark windows high up
  for (const [x, y] of [[-1.6, 3.6], [0.4, 3.6], [2.2, 3.6]]) {
    scene.add(rbox(0.7, 1.0, 0.05, 0.01, woodDark, x, y, -D / 2 + 0.03));
    scene.add(mesh(new THREE.PlaneGeometry(0.58, 0.88), mat(0x08090b, { roughness: 0.1 }), x, y, -D / 2 + 0.06, false));
  }

  // ---------------- light: a caged lamp over the back door, the moon behind clouds ----------------
  scene.add(new THREE.AmbientLight(0x9fb0c0, 0.08));
  const moon = new THREE.DirectionalLight(0xb6c4d2, 0.35);
  moon.position.set(-3, 8, 4);
  scene.add(moon);
  const lamp = bulb(1.9, 2.6, -D / 2 + 0.35, 7, 1.2, 7);
  scene.add(lamp.group);

  // ---------------- the back door of the shop (back wall, right) ----------------
  const doorX = 1.9;
  scene.add(rbox(1.0, 2.15, 0.08, 0.02, woodDark, doorX, 1.075, -D / 2 + 0.02));
  scene.add(rbox(0.86, 2.05, 0.05, 0.01, woodMid, doorX - 0.1, 1.025, -D / 2 + 0.25).rotateY(-0.9));
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x1a1612 }), doorX, 1.025, -D / 2 + 0.07, false));

  // ---------------- Aldo's stairs: stone steps up the left wall to his door ----------------
  const landY = 2.3;
  const stepN = 12;
  for (let i = 0; i < stepN; i++) {
    const y = ((i + 1) / stepN) * landY;
    scene.add(rbox(0.8, 0.08, 0.3, 0.01, wellStone, -W / 2 + 0.45, y - 0.04, 1.6 - i * 0.26));
    scene.add(rbox(0.78, y - 0.08, 0.28, 0.01, wallM, -W / 2 + 0.45, (y - 0.08) / 2, 1.6 - i * 0.26));
  }
  const landZ = 1.6 - stepN * 0.26 - 0.35;
  scene.add(rbox(0.9, 0.1, 1.0, 0.01, wellStone, -W / 2 + 0.45, landY - 0.05, landZ));
  scene.add(rbox(0.9, landY - 0.1, 1.0, 0.01, wallM, -W / 2 + 0.45, (landY - 0.1) / 2, landZ));
  // an iron railing
  for (let i = 0; i <= 6; i++) {
    const z = 1.6 - i * 0.6;
    const y = Math.min(landY, ((1.6 - z) / (stepN * 0.26)) * landY);
    scene.add(cyl(0.012, 0.012, 0.9, iron, -W / 2 + 0.85, y + 0.45, z, 6));
  }
  // Aldo's door, ajar, black inside
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 1.95), new THREE.MeshBasicMaterial({ color: 0x030303 }), -W / 2 + 0.012, landY + 0.975, landZ, false).rotateY(Math.PI / 2));
  const aldoDoor = rbox(0.05, 1.95, 0.8, 0.01, woodDark, -W / 2 + 0.3, landY + 0.975, landZ + 0.25);
  aldoDoor.rotation.y = 0.6;
  scene.add(aldoDoor);
  const plate = textPlane([t('yard.aldoPlate')], 0.3, 0.08, { bg: '#b9ad8e', size: 22, px: 64 });
  plate.position.set(-W / 2 + 0.015, landY + 1.55, landZ - 0.55);
  plate.rotation.y = Math.PI / 2;
  scene.add(plate);

  // pruning shears hung on a nail by the back door, with a tag: Ettore's, never given back
  const shears = new THREE.Group();
  for (const sd of [-1, 1]) {
    shears.add(rbox(0.03, 0.3, 0.01, 0.004, mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 }), sd * 0.018, 0.15, 0).rotateZ(sd * 0.12));
    shears.add(rbox(0.04, 0.28, 0.03, 0.008, woodDark, sd * 0.045, -0.14, 0).rotateZ(-sd * 0.15));
  }
  const shTag = textPlane([t('yard.shearsTag')], 0.12, 0.05, { bg: '#e2dccb', size: 18, px: 64 });
  shTag.position.set(0.1, -0.02, 0.01);
  shears.add(shTag);
  shears.position.set(doorX + 0.78, 1.45, -D / 2 + 0.04);
  shears.visible = !g.flag('y.shears') && !g.flag('a.shears');
  scene.add(shears);

  // ---------------- the gate to the alley (right wall), chained ----------------
  const gate = prop('ironGate', { height: 2.3 });
  if (gate) {
    gate.position.set(W / 2 - 0.1, 0, 0.6);
    gate.rotation.y = -Math.PI / 2;
    scene.add(gate);
  } else scene.add(rbox(0.06, 2.3, 1.6, 0.01, iron, W / 2 - 0.1, 1.15, 0.6));
  const can = prop('trashCan', { height: 0.8 });
  if (can) {
    can.position.set(W / 2 - 0.5, 0, -0.9);
    scene.add(can);
  }
  const rat = prop('rat', { height: 0.1 });
  if (rat) {
    rat.position.set(W / 2 - 0.85, 0, -0.6);
    rat.rotation.y = 2.4;
    scene.add(rat);
  }

  // ---------------- the washing line: three sheets that never dry ----------------
  const lineY = 2.35;
  const sheets: { m: THREE.Mesh; base: Float32Array; ph: number }[] = [];
  const sheetTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#d2cdc2';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 1500, 0.12);
    // a stain, faintly the shape of a face
    c.fillStyle = 'rgba(60,50,40,0.18)';
    c.beginPath();
    c.ellipse(64, 50, 16, 22, 0, 0, Math.PI * 2);
    c.fill();
  });
  scene.add(cyl(0.006, 0.006, 3.2, mat(0x777777), -1.3, lineY, -1.9, 4).rotateZ(Math.PI / 2));
  [-2.3, -1.25, -0.2].forEach((x, i) => {
    const geo = new THREE.PlaneGeometry(0.95, 1.3, 8, 10);
    const m = mesh(geo, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.95, side: THREE.DoubleSide }), x, lineY - 0.66, -1.9, false);
    scene.add(m);
    sheets.push({ m, base: Float32Array.from(geo.attributes.position.array as Float32Array), ph: i * 1.7 });
  });

  // ---------------- the well ----------------
  const wellX = 0.6, wellZ = -0.9, rimY = 0.82, wellR = 0.62;
  const well = new THREE.Group();
  well.add(lathe([[wellR - 0.12, 0], [wellR, 0], [wellR, rimY], [wellR + 0.03, rimY], [wellR + 0.03, rimY + 0.08], [wellR - 0.15, rimY + 0.08], [wellR - 0.15, 0]], wellStone, 0, 0, 0, 28));
  const water = mesh(new THREE.CircleGeometry(wellR - 0.15, 28), new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.02, metalness: 0.6 }), 0, 0.05, 0, false);
  water.rotation.x = -Math.PI / 2;
  well.add(water);
  // posts and the winch drum
  for (const s of [-1, 1]) well.add(rbox(0.1, 1.15, 0.1, 0.01, woodDark, s * (wellR - 0.02), rimY + 0.55, 0));
  const drumY = rimY + 0.95;
  const drum = new THREE.Group();
  drum.add(cyl(0.09, 0.09, wellR * 2 - 0.15, woodMid, 0, 0, 0, 14).rotateZ(Math.PI / 2));
  for (let i = 0; i < 9; i++) drum.add(mesh(new THREE.TorusGeometry(0.095, 0.008, 4, 14), iron, -0.4 + i * 0.1, 0, 0).rotateY(Math.PI / 2));
  drum.position.y = drumY;
  well.add(drum);
  well.add(cyl(0.012, 0.012, 0.12, iron, wellR + 0.02, drumY, 0, 6).rotateZ(Math.PI / 2));
  // the handle, on the right post: this is what you turn
  const handle = new THREE.Group();
  handle.add(rbox(0.04, 0.3, 0.04, 0.008, iron, 0, -0.12, 0));
  handle.add(cyl(0.02, 0.02, 0.14, woodDark, 0.07, -0.25, 0, 8).rotateZ(Math.PI / 2));
  handle.position.set(wellR + 0.09, drumY, 0);
  well.add(handle);
  // the padlock: a chain round the drum and the post
  const lockG = new THREE.Group();
  for (let i = 0; i < 6; i++) lockG.add(mesh(new THREE.TorusGeometry(0.018, 0.005, 4, 10), iron, 0, -i * 0.03, 0).rotateY((i % 2) * Math.PI / 2));
  lockG.add(rbox(0.06, 0.07, 0.025, 0.006, mat(0x6b5c3a, { metalness: 0.8, roughness: 0.4 }), 0, -0.21, 0));
  lockG.add(mesh(new THREE.TorusGeometry(0.02, 0.005, 4, 12, Math.PI), iron, 0, -0.17, 0));
  lockG.position.set(wellR - 0.12, drumY, 0.08);
  well.add(lockG);
  // the rope and the bucket, deep down
  const rope = cyl(0.008, 0.008, 1, mat(0x6a5e4a, { roughness: 1 }), 0, 0, 0, 5);
  well.add(rope);
  const bucket = new THREE.Group();
  const bk = prop('bucket', { height: 0.3 });
  if (bk) bucket.add(bk);
  else bucket.add(lathe([[0, 0], [0.12, 0], [0.15, 0.3], [0, 0.3]], woodMid, 0, 0, 0, 14));
  // inside it: something wrapped in oilcloth
  const bundle = rbox(0.24, 0.06, 0.08, 0.02, mat(0x2b2a26, { roughness: 0.35 }), 0, 0.27, 0);
  bundle.rotation.y = 0.5;
  bucket.add(bundle);
  well.add(bucket);
  well.position.set(wellX, 0, wellZ);
  scene.add(well);
  // a little light from the doorway falls on the well
  const wl = new THREE.PointLight(0xffe6c0, 1.6, 4, 1.6);
  wl.position.set(wellX + 1.0, 2.3, wellZ + 0.4);
  scene.add(wl);

  let wound = g.flag('y.bucket') ? 1 : 0;
  const unlocked = () => !!g.flag('y.padlock');
  lockG.visible = !unlocked();
  bundle.visible = !g.flag('y.crank');
  const bucketTopY = rimY + 0.35;
  const setBucket = () => {
    const y = THREE.MathUtils.lerp(-1.8, bucketTopY, wound);
    bucket.position.y = y;
    rope.position.y = (drumY + y + 0.3) / 2;
    rope.scale.y = Math.max(0.01, drumY - y - 0.3);
    drum.rotation.x = -wound * TURNS * Math.PI * 2;
    handle.rotation.x = drum.rotation.x;
  };
  setBucket();

  // rain
  const RN = 900;
  const rpos = new Float32Array(RN * 6);
  for (let i = 0; i < RN; i++) {
    const x = (Math.random() - 0.5) * W, y = Math.random() * 5, z = (Math.random() - 0.5) * D;
    rpos.set([x, y, z, x - 0.01, y - 0.14, z], i * 6);
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = fx(new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: 0xa8b4be, transparent: true, opacity: 0.18, depthWrite: false })));
  scene.add(rain);

  // ---------------- hotspots ----------------
  const hWell = hitBox(1.4, 1.0, 1.4, wellX, 0.5, wellZ, 'well');
  const hLock = hitBox(0.22, 0.3, 0.22, wellX + wellR - 0.14, drumY - 0.17, wellZ + 0.1, 'padlock');
  const hBucket = hitBox(0.45, 0.45, 0.45, wellX, bucketTopY + 0.15, wellZ, 'bucket');
  const hHandle = hitBox(0.25, 0.5, 0.3, wellX + wellR + 0.12, drumY - 0.12, wellZ, 'winch');
  const hBack = hitBox(1.0, 2.2, 0.4, doorX, 1.1, -D / 2 + 0.2, 'back');
  const hAldo = hitBox(0.5, 2.0, 1.0, -W / 2 + 0.3, landY + 1.0, landZ, 'aldo');
  const hStairs = hitBox(0.9, 1.4, 2.8, -W / 2 + 0.45, 0.8, 0.2, 'stairs');
  const hGate = hitBox(0.3, 2.3, 1.8, W / 2 - 0.15, 1.15, 0.6, 'gate');
  const hShears = hitBox(0.3, 0.6, 0.2, doorX + 0.78, 1.4, -D / 2 + 0.1, 'shears');
  scene.add(hShears);
  const hSheets = hitBox(3.2, 1.4, 0.3, -1.3, lineY - 0.66, -1.9, 'sheets');
  scene.add(hWell, hLock, hBucket, hHandle, hBack, hAldo, hStairs, hGate, hSheets);
  const say = (k: string) => g.say(k);

  const goAldo = async () => {
    g.audio.steps(10, 0.4, false);
    return g.go('barbiere_alloggio');
  };

  const hotspots: Hotspot[] = [
    { id: 'padlock', obj: hLock, view: 'winch', when: () => !unlocked(), tap: async (item) => {
      if (item === 'padkey') {
        g.deselect();
        g.take('padkey');
        g.set('y.padlock');
        g.audio.sfx('unlock');
        await sleep(300);
        g.audio.rec('chains', { gain: 0.6, dur: 1.5 });
        for (let i = 0; i <= 15; i++) {
          lockG.position.y = drumY - (i / 15) * (drumY + 0.1);
          await sleep(20);
        }
        lockG.visible = false;
        return say('yard.unlocked');
      }
      if (item) return g.nope();
      return say('yard.padlock');
    } },
    { id: 'winch', obj: hHandle, view: 'winch', tap: async (item) => {
      // the key, touched anywhere near the lock, goes into the lock
      if (item === 'padkey' && !unlocked()) return hotspots.find((h) => h.id === 'padlock')!.tap(item);
      if (item) return g.nope();
      if (!unlocked()) return say('yard.winchLocked');
      if (wound >= 1) return say('yard.winchDone');
      return say('yard.turnWinch');
    } },
    { id: 'bucket', obj: hBucket, view: 'well', when: () => wound >= 1, tap: async (item) => {
      if (item) return g.nope();
      if (bundle.visible) {
        bundle.visible = false;
        g.set('y.crank');
        g.give('crank');
        return g.say([{ who: 'diego', key: 'yard.crank1' }, { who: 'diego', key: 'yard.crank2' }]);
      }
      return say('yard.bucketEmpty');
    } },
    { id: 'well', obj: hWell, view: 'well', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (wound >= 1) return say(bundle.visible ? 'yard.wellBucket' : 'yard.wellAfter');
      return say('yard.well');
    } },
    { id: 'back', obj: hBack, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('barbiere_retro');
    } },
    { id: 'aldo', obj: hAldo, tap: async (item) => {
      if (item) return g.nope();
      return goAldo();
    } },
    { id: 'stairs', obj: hStairs, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return goAldo();
    } },
    { id: 'shears', obj: hShears, when: () => shears.visible, tap: async (item) => {
      if (item) return g.nope();
      shears.visible = false;
      g.set('y.shears');
      g.give('shears');
      return g.say([{ who: 'diego', key: 'yard.shears1' }, { who: 'diego', key: 'yard.shears2' }]);
    } },
    { id: 'gate', obj: hGate, tap: async (item) => {
      if (item) return g.nope();
      g.audio.rec('chains', { gain: 0.4, dur: 1 });
      return say('yard.gate');
    } },
    { id: 'sheets', obj: hSheets, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('yard.sheets');
    } },
  ];

  // ---------------- direct manipulation: turn the winch ----------------
  scene.updateMatrixWorld(true);
  let creakAcc = 0;
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: handle,
      center: new THREE.Vector3(wellX + wellR + 0.09, drumY, wellZ),
      when: () => g.viewName === 'winch' && unlocked() && wound < 1,
      onTurn: (d) => {
        wound = Math.min(1, wound + Math.abs(d) / (Math.PI * 2 * TURNS));
        setBucket();
        creakAcc += Math.abs(d);
        if (creakAcc > 1.2) {
          creakAcc = 0;
          g.audio.sfx('creak');
        }
      },
      onEnd: async () => {
        if (wound >= 1 && !g.flag('y.bucket')) {
          g.set('y.bucket');
          g.audio.sfx('clunk');
          await sleep(500);
          // something comes up with it
          g.audio.rec('ghostmove', { gain: 0.6, dur: 2.5 });
          await sleep(700);
          await g.scare('barber', 600);
          await sleep(300);
          await g.view('well');
          await say('yard.bucketUp');
        }
      },
    },
  ];

  return {
    id: 'barbiere_cortile',
    nameKey: 'place.barbiereCortile',
    next: ['barbiere_alloggio', 'barbiere_retro'],
    scene,
    drone: 'map',
    startView: 'main',
    exitTo: 'barbiere_retro',
    views: {
      main: { pos: [1.4, 1.7, 2.6], look: [-0.4, 1.2, -1.3], yaw: 65, pitch: 20 },
      well: { pos: [wellX - 0.1, 1.85, wellZ + 1.15], look: [wellX, 0.8, wellZ], parent: 'main', yaw: 20, pitch: 12, fov: 60 },
      winch: { pos: [wellX + 1.5, 1.6, wellZ + 0.75], look: [wellX + wellR, drumY - 0.2, wellZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      const p = rgeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RN; i++) {
        let y = p.getY(i * 2) - dt * 7;
        if (y < 0) y += 5;
        p.setY(i * 2, y);
        p.setY(i * 2 + 1, y - 0.14);
      }
      p.needsUpdate = true;
      for (const s of sheets) {
        const pos = s.m.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = s.base[i * 3], y = s.base[i * 3 + 1];
          const k = (0.65 - y) / 1.3; // free at the bottom, pegged at the top
          pos.setZ(i, Math.sin(time * 1.3 + s.ph + x * 3 + y * 2) * 0.09 * k + Math.sin(time * 3.1 + x * 7) * 0.015 * k);
        }
        pos.needsUpdate = true;
      }
      lamp.spot.intensity = 7 * (Math.random() < 0.01 ? 0.3 : 1);
    },
    enter: async () => {
      if (!g.flag('y.entered')) {
        g.set('y.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'yard.enter1' }, { who: 'diego', key: 'yard.enter2' }]);
      }
    },
    hint: () => {
      if (g.has('crank') || g.flag('r.crankIn')) return 'hint.yard.back';
      if (!unlocked()) return g.has('padkey') ? 'hint.yard.padlock' : 'hint.yard.aldo';
      if (wound < 1) return 'hint.yard.winch';
      return 'hint.yard.bucket';
    },
    debug: { handle, getWound: () => wound },
  };
}
