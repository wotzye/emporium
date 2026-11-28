import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot } from '../game';
import { mat, mesh, rbox, cyl, lathe, fx, textPlane, hitBox, canvasTex, noise, woodMaterial, plasterMaterial, stoneMaterial } from '../builders';
import { t } from '../i18n';
import { sleep } from './ada_common';

/**
 * Behind the Villino: the wisteria that gave the house its name has grown over everything,
 * the French window of Ada's bedroom included. A swing that moves on its own, a stone birdbath,
 * the garden shed. The shed key was in the pantry. The shears aren't in the shed: Ettore lent them to Aldo,
 * the barber (they hang in his courtyard). In the shed there's a tin with the clockmaker's big wheel.
 */
export function createAdaGiardino(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080a);
  scene.fog = new THREE.Fog(0x06080a, 4, 14);
  scene.userData.envIntensity = 0.05;
  const W = 6.6, D = 6.2, WH = 4.2;
  const houseM = plasterMaterial({ base: '#a09a8e', repeat: [3, 2], damp: 0.9 });
  const woodDark = woodMaterial({ base: '#2c2219' });
  const woodShed = woodMaterial({ base: '#4a3a2a', plank: true, repeat: [1, 1] });
  const stone = stoneMaterial([2, 1], '#6e6a62');
  const iron = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 0.55, metalness: 0.8 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2d332a, roughness: 0.9, side: THREE.DoubleSide });
  const flowerM = new THREE.MeshStandardMaterial({ color: 0x8e8aa0, roughness: 0.8 });

  // ---------------- grass, garden walls, the back of the house ----------------
  const grassTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#262a22';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      c.fillStyle = `rgba(${60 + Math.random() * 50},${70 + Math.random() * 50},${55 + Math.random() * 40},0.5)`;
      c.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 4);
    }
  }, [6, 6]);
  const grass = mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }), 0, 0, 0);
  grass.rotation.x = -Math.PI / 2;
  grass.castShadow = false;
  scene.add(grass);
  // a gravel path from the kitchen door
  const path = mesh(new THREE.PlaneGeometry(0.9, 3.2), stoneMaterial([1, 3], '#5d5953'), 1.25, 0.005, -1.4, false);
  path.rotation.x = -Math.PI / 2;
  scene.add(path);
  scene.add(mesh(new THREE.PlaneGeometry(W, WH), houseM, 0, WH / 2, -D / 2));
  const wallM = stoneMaterial([4, 1], '#5f5b54');
  scene.add(mesh(new THREE.PlaneGeometry(D, 1.8), wallM, -W / 2, 0.9, 0).rotateY(Math.PI / 2));
  scene.add(mesh(new THREE.PlaneGeometry(D, 1.8), wallM, W / 2, 0.9, 0).rotateY(-Math.PI / 2));
  // trees beyond the walls, black against the sky
  for (const [x, z, h] of [[-4.2, -1, 4.5], [4.3, 1.5, 5], [-4, 2.5, 3.8], [3.9, -2.4, 4.2]] as const) {
    scene.add(cyl(0.12, 0.2, h, mat(0x0d0d0c), x, h / 2, z, 6));
    const crown = mesh(new THREE.IcosahedronGeometry(1.4, 1), mat(0x0b0c0b, { roughness: 1, flatShading: true }), x, h, z, false);
    crown.scale.y = 0.8;
    scene.add(crown);
  }

  // ---------------- light: moon and the kitchen light spilling out ----------------
  scene.add(new THREE.AmbientLight(0x9fb0c0, 0.15));
  const moon = new THREE.DirectionalLight(0xb6c4d2, 0.8);
  moon.position.set(3, 8, 5);
  scene.add(moon);
  const kitchenX = 1.25;
  const spill = new THREE.SpotLight(0xffe2b0, 6, 6, 0.6, 0.9, 1.4);
  spill.position.set(kitchenX, 1.8, -D / 2 + 0.1);
  spill.target.position.set(kitchenX, 0, -1.2);
  scene.add(spill, spill.target);

  // ---------------- the kitchen door (house, right) ----------------
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 2.0), new THREE.MeshBasicMaterial({ color: 0x6b5a40 }), kitchenX, 1.0, -D / 2 + 0.01, false));
  scene.add(rbox(0.06, 2.0, 0.8, 0.01, woodMaterial({ base: '#6d6252' }), kitchenX - 0.42, 1.0, -D / 2 + 0.4).rotateY(0.2));
  scene.add(rbox(1.0, 0.08, 0.3, 0.01, stone, kitchenX, 0.04, -D / 2 + 0.15));

  // ---------------- the French window of the bedroom, buried in wisteria ----------------
  const fwX = -0.9, fwW = 1.3, fwH = 2.15;
  const fwTex = canvasTex(128, 192, (c, w, h) => {
    c.fillStyle = '#0d0f12';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(140,145,150,0.25)';
    c.fillRect(0, 0, w, h * 0.12);
    c.strokeStyle = '#3a3128';
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
    noise(c, w, h, 400, 0.12);
  });
  const fwGlass = mesh(new THREE.PlaneGeometry(fwW, fwH), new THREE.MeshStandardMaterial({ map: fwTex, roughness: 0.15, metalness: 0.4 }), fwX, fwH / 2, -D / 2 + 0.02, false);
  scene.add(fwGlass);
  const fwPivot = new THREE.Group();
  fwPivot.userData.passThrough = true; // an open door must not stand between you and the doorway // the right leaf opens when you go in
  fwPivot.position.set(fwX + fwW / 2, 0, -D / 2 + 0.04);
  scene.add(fwPivot);
  scene.add(rbox(fwW + 0.4, 0.08, 0.35, 0.01, stone, fwX, 0.04, -D / 2 + 0.17));
  // the pergola over it, and the wisteria: a trunk as thick as an arm, racemes hanging
  const pergolaY = 2.6;
  for (const x of [-2.4, 0.6]) scene.add(rbox(0.1, pergolaY, 0.1, 0.01, woodDark, x, pergolaY / 2, -D / 2 + 1.1));
  scene.add(rbox(3.2, 0.1, 0.1, 0.01, woodDark, -0.9, pergolaY, -D / 2 + 1.1));
  for (let i = 0; i < 6; i++) scene.add(rbox(0.07, 0.07, 1.2, 0.01, woodDark, -2.3 + i * 0.58, pergolaY + 0.06, -D / 2 + 0.55));
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.4, 0, -D / 2 + 1.25), new THREE.Vector3(-2.3, 0.8, -D / 2 + 1.0), new THREE.Vector3(-2.45, 1.6, -D / 2 + 1.2), new THREE.Vector3(-2.3, 2.5, -D / 2 + 1.05), new THREE.Vector3(-1.2, 2.62, -D / 2 + 0.9), new THREE.Vector3(0.5, 2.6, -D / 2 + 0.7),
  ]);
  scene.add(mesh(new THREE.TubeGeometry(trunk, 40, 0.06, 7), mat(0x2a241e, { roughness: 1 }), 0, 0, 0));
  const raceme = (x: number, y: number, z: number, len: number, parent: THREE.Object3D) => {
    const c = mesh(new THREE.ConeGeometry(0.06, len, 6), flowerM, x, y - len / 2, z, false);
    c.rotation.x = Math.PI;
    parent.add(c);
  };
  const canopy = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const x = -2.4 + Math.random() * 3.1, z = -D / 2 + 0.3 + Math.random() * 1.0;
    raceme(x, pergolaY - 0.02, z, 0.2 + Math.random() * 0.3, canopy);
    if (i % 2) {
      const l = mesh(new THREE.PlaneGeometry(0.25, 0.12), leafM, x, pergolaY - 0.05, z, false);
      l.rotation.set(-Math.PI / 2 + Math.random() * 0.6, 0, Math.random() * 3);
      canopy.add(l);
    }
  }
  scene.add(canopy);
  // the curtain of vines over the window: strands, leaves, racemes. Cut it in clumps.
  const clumps: THREE.Group[] = [];
  const CLUMPS = 6;
  for (let k = 0; k < CLUMPS; k++) {
    const cg = new THREE.Group();
    const cx = fwX - fwW / 2 + 0.1 + (k / (CLUMPS - 1)) * (fwW - 0.2);
    for (let s = 0; s < 6; s++) {
      const x = cx + (Math.random() - 0.5) * 0.25, len = 1.4 + Math.random() * 0.9;
      const pts = [0, 1, 2, 3].map((j) => new THREE.Vector3(x + Math.sin(j * 1.7 + s) * 0.06, pergolaY - (j / 3) * len, -D / 2 + 0.12 + Math.random() * 0.08));
      cg.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.008 + Math.random() * 0.01, 4), mat(0x2b261f, { roughness: 1 }), 0, 0, 0, false));
      for (let l = 0; l < 7; l++) {
        const yy = pergolaY - Math.random() * len;
        const lf = mesh(new THREE.PlaneGeometry(0.16, 0.08), leafM, x + (Math.random() - 0.5) * 0.12, yy, -D / 2 + 0.16 + Math.random() * 0.08, false);
        lf.rotation.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() * 3);
        cg.add(lf);
      }
      if (s % 2 === 0) raceme(x, pergolaY - 0.1 - Math.random() * 0.5, -D / 2 + 0.2, 0.25, cg);
    }
    scene.add(cg);
    clumps.push(cg);
  }
  const vinesCut = () => !!g.flag('a.vines');
  if (vinesCut()) clumps.forEach((c) => (c.visible = false));

  // ---------------- the shed (right, front of the wall) ----------------
  const shedX = 2.6, shedZ = -0.7;
  const shed = new THREE.Group();
  const SW = 1.3, SH = 2.0, SD = 1.1;
  shed.add(rbox(SW, SH, 0.04, 0.01, woodShed, 0, SH / 2, -SD / 2));
  shed.add(rbox(0.04, SH, SD, 0.01, woodShed, -SW / 2, SH / 2, 0));
  shed.add(rbox(0.04, SH, SD, 0.01, woodShed, SW / 2, SH / 2, 0));
  shed.add(rbox(0.4, SH, 0.04, 0.01, woodShed, -SW / 2 + 0.2, SH / 2, SD / 2));
  shed.add(rbox(0.1, SH, 0.04, 0.01, woodShed, SW / 2 - 0.05, SH / 2, SD / 2));
  shed.add(rbox(SW + 0.2, 0.05, SD + 0.25, 0.01, mat(0x1e1d1b, { roughness: 0.9 }), 0, SH + 0.1, 0).rotateX(-0.12));
  shed.add(mesh(new THREE.PlaneGeometry(SW - 0.1, SH), new THREE.MeshBasicMaterial({ color: 0x040404 }), 0, SH / 2, -SD / 2 + 0.03, false));
  // tools on the back wall inside: a rake, a spade, and the shears on a nail
  shed.add(rbox(0.03, 1.4, 0.03, 0.005, woodDark, -0.35, 0.9, -SD / 2 + 0.08).rotateZ(0.1));
  shed.add(rbox(0.03, 1.2, 0.03, 0.005, woodDark, 0.4, 0.75, -SD / 2 + 0.08).rotateZ(-0.08));
  const shears = new THREE.Group();
  for (const s of [-1, 1]) {
    shears.add(rbox(0.02, 0.22, 0.008, 0.003, mat(0x8a8a88, { metalness: 0.9, roughness: 0.3 }), s * 0.012, 0.11, 0).rotateZ(s * 0.12));
    shears.add(rbox(0.028, 0.2, 0.02, 0.006, woodDark, s * 0.03, -0.1, 0).rotateZ(-s * 0.15));
  }
  shears.position.set(0.05, 1.35, -SD / 2 + 0.09);
  shears.scale.setScalar(1.6);
  shed.add(shears);
  // moonlight through the gaps in the planks
  const shedLight = new THREE.PointLight(0xc4d0dc, 1.4, 2.5, 1.5);
  shedLight.position.set(0, 1.7, 0.1);
  shed.add(shedLight);
  // the door: hinged on the left, padlocked
  const sDoor = new THREE.Group();
  sDoor.userData.passThrough = true;
  sDoor.position.set(-SW / 2 + 0.4, 0, SD / 2 + 0.02);
  sDoor.add(rbox(0.75, SH - 0.05, 0.04, 0.01, woodShed, 0.375, SH / 2, 0));
  const shedLock = new THREE.Group();
  shedLock.add(rbox(0.05, 0.06, 0.02, 0.005, mat(0x6b5c3a, { metalness: 0.8, roughness: 0.4 }), 0, 0, 0));
  shedLock.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 10, Math.PI), iron, 0, 0.03, 0));
  shedLock.position.set(0.68, 1.05, 0.04);
  sDoor.add(shedLock);
  shed.add(sDoor);
  shed.position.set(shedX, 0, shedZ);
  shed.rotation.y = -0.7;
  scene.add(shed);
  const shedOpen = () => !!g.flag('a.shed');
  if (shedOpen()) {
    sDoor.rotation.y = -2.6;
    shedLock.visible = false;
  }
  // the shears are gone: an empty nail, and a pencil note on the plank. (An old save that saw them here keeps them.)
  shears.visible = false;
  const note = textPlane([t('garden.nailNote')], 0.22, 0.07, { bg: '#4a3a2a', fg: '#d8d0bd', size: 18, px: 96, font: "'Bradley Hand', 'Segoe Print', cursive" });
  note.position.set(0.05, 1.12, -SD / 2 + 0.07);
  shed.add(note);
  shed.add(cyl(0.004, 0.004, 0.04, iron, 0.05, 1.45, -SD / 2 + 0.08, 5).rotateX(Math.PI / 2));
  // Ettore's tin of odds and ends: screws, springs... and a big brass wheel
  const tin = new THREE.Group();
  tin.add(cyl(0.09, 0.09, 0.1, mat(0x5a5650, { metalness: 0.6, roughness: 0.5 }), 0, 0.05, 0, 18));
  tin.add(cyl(0.092, 0.092, 0.015, mat(0x6e6a62, { metalness: 0.6, roughness: 0.4 }), 0, 0.105, 0, 18));
  tin.position.set(-0.3, 0.75, -SD / 2 + 0.2);
  shed.add(rbox(0.7, 0.04, 0.3, 0.005, woodDark, -0.2, 0.73, -SD / 2 + 0.17));
  shed.add(tin);
  const gearTaken = () => !!g.flag('a.gear');
  const planter = prop('roundTable', { height: 0.6 });
  if (planter) {
    planter.position.set(0.3, 0, 1.3);
    scene.add(planter);
    const chairA = prop('woodChair', { height: 0.85 });
    if (chairA) {
      chairA.position.set(-0.3, 0, 1.5);
      chairA.rotation.set(0, 1.2, 1.35); // knocked over
      chairA.position.y = 0.2;
      scene.add(chairA);
    }
  }

  // ---------------- the swing (left), moving on its own ----------------
  const swX = -2.3, swZ = 1.2;
  for (const s of [-1, 1]) {
    scene.add(rbox(0.08, 2.3, 0.08, 0.01, woodDark, swX + s * 0.55, 1.1, swZ + 0.25).rotateX(0.2));
    scene.add(rbox(0.08, 2.3, 0.08, 0.01, woodDark, swX + s * 0.55, 1.1, swZ - 0.25).rotateX(-0.2));
  }
  scene.add(rbox(1.25, 0.08, 0.08, 0.01, woodDark, swX, 2.22, swZ));
  const swing = new THREE.Group();
  swing.position.set(swX, 2.2, swZ);
  for (const s of [-1, 1]) swing.add(cyl(0.006, 0.006, 1.7, mat(0x6a5e4a, { roughness: 1 }), s * 0.25, -0.85, 0, 4));
  swing.add(rbox(0.6, 0.04, 0.22, 0.01, woodMaterial({ base: '#5b4a36' }), 0, -1.7, 0));
  scene.add(swing);
  // the birdbath, full of black rainwater
  scene.add(lathe([[0, 0], [0.18, 0], [0.08, 0.1], [0.06, 0.7], [0.32, 0.75], [0.34, 0.85], [0.28, 0.82], [0, 0.8]], stone, -1.1, 0, 0.4, 20));
  const bathWater = mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.02, metalness: 0.5 }), -1.1, 0.83, 0.4, false);
  bathWater.rotation.x = -Math.PI / 2;
  scene.add(bathWater);

  // leaves drifting
  const LN = 40;
  const leaves = fx(new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.03), leafM, LN));
  const lv = Array.from({ length: LN }, () => ({ p: new THREE.Vector3((Math.random() - 0.5) * W, Math.random() * 3, (Math.random() - 0.5) * D), s: 0.2 + Math.random() * 0.4, ph: Math.random() * 6 }));
  scene.add(leaves);
  const dummy = new THREE.Object3D();

  // ---------------- hotspots ----------------
  const hWindow = hitBox(fwW + 0.2, fwH, 0.5, fwX, fwH / 2, -D / 2 + 0.25, 'frenchwindow');
  const hShed = hitBox(SW + 0.1, SH, SD + 0.1, shedX, SH / 2, shedZ, 'shed');
  shed.updateMatrixWorld(true);
  const shP = shears.getWorldPosition(new THREE.Vector3());
  const hShears = hitBox(0.3, 0.4, 0.3, shP.x, shP.y, shP.z + 0.1, 'shears');
  const tP = tin.getWorldPosition(new THREE.Vector3());
  const hTin = hitBox(0.3, 0.3, 0.3, tP.x, tP.y + 0.06, tP.z, 'tin');
  scene.add(hTin);
  const hKitchen = hitBox(0.9, 2.0, 0.4, kitchenX, 1.0, -D / 2 + 0.2, 'kitchen');
  const hSwing = hitBox(1.0, 2.2, 0.6, swX, 1.1, swZ, 'swing');
  const hBath = hitBox(0.7, 0.9, 0.7, -1.1, 0.45, 0.4, 'birdbath');
  const hWisteria = hitBox(3.2, 0.6, 1.2, -0.9, pergolaY - 0.1, -D / 2 + 0.6, 'wisteria');
  // the shed door itself gets a marker (the shed box is low priority, so the shears inside win)
  const hShedDoor = hitBox(SW * 0.7, SH * 0.8, 0.12, 0, SH * 0.42, SD / 2 + 0.03, 'shedDoor');
  shed.add(hShedDoor); // in the shed's own frame: the shed is turned
  scene.add(hWindow, hShed, hShears, hKitchen, hSwing, hBath, hWisteria);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'frenchwindow', exit: () => vinesCut(), obj: hWindow, view: 'window', tap: async (item) => {
      if (vinesCut()) {
        if (item) return g.nope();
        g.audio.sfx('creak');
        for (let i = 0; i <= 10; i++) {
          fwPivot.rotation.y = (i / 10) * 0.6;
          await sleep(25);
        }
        g.audio.steps(2, 0.45, false);
        return g.go('ada_camera');
      }
      if (item === 'shears') {
        g.deselect();
        for (let k = 0; k < CLUMPS; k++) {
          g.audio.rec('scissors', { gain: 0.8, dur: 0.6 });
          const cg = clumps[k];
          for (let i = 0; i <= 8; i++) {
            cg.position.y = -(i / 8) * 0.6;
            cg.rotation.z = (i / 8) * 0.15 * (k % 2 ? 1 : -1);
            await sleep(25);
          }
          cg.visible = false;
          await sleep(120);
        }
        g.take('shears');
        g.set('a.vines');
        await sleep(400);
        g.audio.sfx('whisper');
        return g.say([{ who: 'diego', key: 'garden.cut1' }, { who: 'diego', key: 'garden.cut2' }]);
      }
      if (item) return g.nope();
      return say('garden.window');
    } },
    { id: 'shed', obj: hShed, view: 'shed', lowPriority: true, tap: async (item) => {
      if (!shedOpen()) {
        if (item === 'shedkey') {
          g.deselect();
          g.take('shedkey');
          g.set('a.shed');
          g.audio.sfx('unlock');
          shedLock.visible = false;
          g.audio.sfx('creak');
          for (let i = 0; i <= 20; i++) {
            sDoor.rotation.y = -(i / 20) * 2.6;
            await sleep(25);
          }
          return say('garden.shedOpen');
        }
        if (item) return g.nope();
        g.audio.sfx('wrong');
        return say('garden.shedLocked');
      }
      if (item) return g.nope();
      return say('garden.shedInside');
    } },
    { id: 'tin', obj: hTin, view: 'shed', when: () => shedOpen(), tap: async (item) => {
      if (item) return g.nope();
      if (gearTaken()) return say('garden.tinEmpty');
      g.set('a.gear');
      g.give('gear');
      g.audio.sfx('clunk');
      return g.say([{ who: 'diego', key: 'garden.tin1' }, { who: 'diego', key: 'garden.tin2' }]);
    } },
    { id: 'nail', obj: hShears, view: 'shed', when: () => shedOpen() && !shears.visible, tap: async (item) => {
      if (item) return g.nope();
      return say('garden.nail');
    } },
    { id: 'shears', obj: hShears, view: 'shed', when: () => shedOpen() && shears.visible, tap: async (item) => {
      if (item) return g.nope();
      shears.visible = false;
      g.set('a.shears');
      g.give('shears');
      return say('garden.shears');
    } },
    { id: 'kitchen', obj: hKitchen, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('ada_cucina');
    } },
    { id: 'swing', obj: hSwing, tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('creak');
      return say(g.flag('glasses') ? 'garden.swingAfter' : 'garden.swing');
    } },
    { id: 'birdbath', obj: hBath, tap: async (item) => {
      if (item) return g.nope();
      return say('garden.birdbath');
    } },
    { id: 'wisteria', obj: hWisteria, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('garden.wisteria');
    } },
    { id: 'shedDoor', obj: hShedDoor, view: 'shed', when: () => g.viewName !== 'shed', tap: async (item) => hotspots.find((h) => h.id === 'shed')!.tap(item) },
  ];

  let creakT = 3;
  return {
    id: 'ada_giardino',
    nameKey: 'place.adaGiardino',
    next: ['ada_camera', 'ada_cucina'],
    scene,
    drone: 'map',
    startView: 'main',
    exitTo: 'ada_cucina',
    views: {
      main: { pos: [0.2, 1.85, 2.95], look: [0.0, 1.0, -2.0], yaw: 65, pitch: 20 },
      window: { pos: [fwX + 0.3, 1.6, -D / 2 + 2.4], look: [fwX, 1.15, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 60 },
      shed: { pos: [shedX - 1.5, 1.6, shedZ + 1.6], look: [shedX, 1.1, shedZ - 0.2], parent: 'main', yaw: 20, pitch: 12, fov: 58 },
    },
    hotspots,
    update: (dt, time) => {
      // the swing: slow, as if someone had just got off it
      swing.rotation.x = Math.sin(time * 1.4) * 0.22;
      creakT -= dt;
      if (creakT < 0) {
        creakT = 4 + Math.random() * 5;
        if (Math.random() < 0.5) g.audio.sfx('creak');
      }
      for (let i = 0; i < LN; i++) {
        const l = lv[i];
        l.p.y -= dt * l.s * 0.3;
        l.p.x += Math.sin(time + l.ph) * dt * 0.3;
        if (l.p.y < 0) l.p.y = 3;
        dummy.position.copy(l.p);
        dummy.rotation.set(time * l.s + l.ph, time * 0.7, l.ph);
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
      canopy.rotation.z = Math.sin(time * 0.6) * 0.004;
    },
    enter: async () => {
      if (!g.flag('garden.entered')) {
        g.set('garden.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'garden.enter1' }, { who: 'diego', key: 'garden.enter2' }]);
      }
    },
    hint: () => {
      if (g.has('crutch') || g.flag('a.crutch')) return 'hint.ada.hatch';
      if (vinesCut()) return 'hint.garden.bedroom';
      if (g.has('shears')) return 'hint.garden.cut';
      if (!shedOpen()) return g.has('shedkey') ? 'hint.garden.shed' : 'hint.ada.shedKey';
      if (!gearTaken()) return 'hint.garden.tin';
      return g.flag('a.shears') ? 'hint.garden.cut' : 'hint.garden.shearsAway';
    },
    debug: { clumps },
  };
}
