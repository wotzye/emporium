import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, woodTex, wallTex, textPlane, hitBox, figure, cursedMat, bulb, fx } from '../builders';
import { t } from '../i18n';

export function createEmporio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);

  const W = 7, H = 3.2, D = 6;
  scene.add(room(W, H, D, {
    wall: mat(0xffffff, { map: wallTex('#3b342c', [3, 1], true) }),
    floor: mat(0xffffff, { map: woodTex('#3a2e22', [3, 3]) }),
    ceil: mat(0x151311),
  }));

  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  scene.add(new THREE.HemisphereLight(0xd8d0c0, 0x1a1410, 0.25));
  const b = bulb(-0.6, 2.7, 0.2, 14, 1.1, 7);
  scene.add(b.group);

  const wood = mat(0xffffff, { map: woodTex('#4a3826', [1, 1]) });
  const dark = mat(0x1d1915);

  // counter
  scene.add(box(3.6, 1.0, 0.6, wood, -0.6, 0.5, -1.3));
  scene.add(box(3.8, 0.05, 0.7, dark, -0.6, 1.02, -1.3));
  // old till & a ledger on the counter
  scene.add(box(0.45, 0.3, 0.35, mat(0x2b2b2b, { metalness: 0.5, roughness: 0.4 }), 0.6, 1.2, -1.35));
  const ledger = box(0.4, 0.04, 0.3, mat(0x3b2a1a), -1.2, 1.06, -1.2);
  ledger.rotation.y = 0.2;
  scene.add(ledger);

  // candles
  const candles: THREE.PointLight[] = [];
  let candleBase = 3.2;
  for (const x of [-1.9, 0.0]) {
    scene.add(cyl(0.035, 0.035, 0.22, mat(0xe8e2d0), x, 1.15, -1.15, 10));
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
    flame.scale.y = 2;
    flame.position.set(x, 1.3, -1.15);
    flame.userData.noPick = true;
    scene.add(flame);
    const pl = new THREE.PointLight(0xffc887, 2.2, 6, 1.4);
    pl.position.set(x, 1.38, -1.1);
    pl.castShadow = x === 0.0;
    pl.shadow.mapSize.set(512, 512);
    scene.add(pl);
    candles.push(pl);
  }

  // the Merchant: never fully lit
  const merchant = figure({ height: 1.95, hat: true });
  merchant.position.set(-0.8, 0, -2.15);
  scene.add(merchant);
  const handM = mat(0xcfc6b6, { roughness: 0.7 });
  const handL = box(0.09, 0.04, 0.16, handM, -1.05, 1.06, -1.25);
  const handR = box(0.09, 0.04, 0.16, handM, -0.55, 1.06, -1.25);
  handL.rotation.y = 0.3;
  handR.rotation.y = -0.3;
  scene.add(handL, handR);
  const eyes = merchant.userData.eyes as THREE.Group;

  // shelves full of things, left wall and back wall
  const rnd = mulberry(7);
  const shelfStuff = (x0: number, z0: number, alongZ: boolean, len: number) => {
    for (const y of [0.5, 1.1, 1.7, 2.3]) {
      const sh = alongZ ? box(0.35, 0.04, len, dark, x0, y, z0) : box(len, 0.04, 0.35, dark, x0, y, z0);
      scene.add(sh);
      let p = -len / 2 + 0.15;
      while (p < len / 2 - 0.15) {
        const k = rnd();
        const shade = 0x2a2520 + Math.floor(rnd() * 0x30) * 0x010101;
        const m = mat(shade, { roughness: 0.6 + rnd() * 0.4 });
        let o: THREE.Mesh;
        if (k < 0.3) o = box(0.12 + rnd() * 0.15, 0.1 + rnd() * 0.3, 0.15, m);
        else if (k < 0.6) o = cyl(0.04 + rnd() * 0.05, 0.05 + rnd() * 0.05, 0.12 + rnd() * 0.25, m, 0, 0, 0, 10);
        else if (k < 0.8) o = sphere(0.05 + rnd() * 0.06, m);
        else o = box(0.25, 0.18, 0.2, m);
        const hgt = (o.geometry as THREE.BufferGeometry).boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox!);
        const oy = y + 0.02 + (hgt.max.y - hgt.min.y) / 2;
        if (alongZ) o.position.set(x0 + (rnd() - 0.5) * 0.1, oy, z0 + p);
        else o.position.set(x0 + p, oy, z0 + (rnd() - 0.5) * 0.1);
        o.rotation.y = rnd() * Math.PI;
        scene.add(o);
        p += 0.18 + rnd() * 0.2;
      }
    }
  };
  shelfStuff(-3.3, -0.5, true, 4.6);
  shelfStuff(-0.8, -2.82, false, 4.4);

  // the display case on the right wall
  const caseX = 3.05;
  const caseZ = -0.4;
  scene.add(box(0.7, 0.6, 3.6, wood, caseX, 0.3, caseZ));
  scene.add(box(0.7, 0.05, 3.6, dark, caseX, 1.25, caseZ));
  scene.add(box(0.7, 0.05, 3.6, dark, caseX, 2.15, caseZ));
  scene.add(box(0.7, 0.05, 3.6, dark, caseX, 0.62, caseZ));
  const glass = mesh(new THREE.PlaneGeometry(3.6, 1.55), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.9 }), caseX - 0.36, 1.4, caseZ);
  glass.rotation.y = -Math.PI / 2;
  glass.castShadow = false;
  fx(glass);
  scene.add(glass);
  const caseLight = new THREE.SpotLight(0xfff2dd, 6, 4, 0.9, 0.7, 1.5);
  caseLight.position.set(2.2, 2.6, caseZ);
  caseLight.target.position.set(caseX, 1.2, caseZ);
  scene.add(caseLight, caseLight.target);

  // top shelf: the five objects already recovered
  const topY = 1.28;
  const zs = [-1.8, -1.1, -0.4, 0.3, 1.0];
  const cm = cursedMat();
  // 1. shoe
  const shoe = new THREE.Group();
  shoe.add(box(0.22, 0.07, 0.09, cm, 0, 0.035, 0));
  shoe.add(box(0.08, 0.12, 0.09, cm, -0.07, 0.09, 0));
  shoe.add(cyl(0.012, 0.012, 0.1, cm, 0.08, 0.05, 0, 6));
  shoe.position.set(caseX, topY, zs[0]);
  shoe.rotation.y = Math.PI / 2 + 0.3;
  // 2. statuette
  const statue = new THREE.Group();
  statue.add(cyl(0.06, 0.07, 0.04, cm, 0, 0.02, 0));
  statue.add(cyl(0.035, 0.05, 0.22, cm, 0, 0.15, 0, 10));
  statue.add(sphere(0.04, cm, 0, 0.3, 0, 10));
  statue.position.set(caseX, topY, zs[1]);
  // 3. doll
  const doll = new THREE.Group();
  doll.add(mesh(new THREE.ConeGeometry(0.08, 0.2, 12), cm, 0, 0.1, 0));
  doll.add(sphere(0.055, cm, 0, 0.25, 0, 12));
  doll.position.set(caseX, topY, zs[2]);
  // 4. butcher's object, wrapped in a stained cloth
  const cloth = mat(0xa8a39a, { roughness: 1 });
  const wrapped1 = new THREE.Group();
  const c1 = sphere(0.13, cloth, 0, 0.1, 0, 12);
  c1.scale.set(1.3, 0.8, 1);
  wrapped1.add(c1);
  const stain = sphere(0.04, cm, 0.02, 0.17, 0.07, 8);
  stain.scale.set(1.4, 0.4, 1);
  wrapped1.add(stain);
  wrapped1.position.set(caseX, topY, zs[3]);
  // 5. suitcase maker's object, wrapped
  const wrapped2 = new THREE.Group();
  const c2 = box(0.26, 0.18, 0.16, cloth, 0, 0.09, 0);
  wrapped2.add(c2);
  const knot = sphere(0.03, cm, 0, 0.2, 0, 8);
  wrapped2.add(knot);
  wrapped2.position.set(caseX, topY, zs[4]);
  scene.add(shoe, statue, doll, wrapped1, wrapped2);
  const topTags = ['tag.shoe', 'tag.statue', 'tag.doll', 'tag.macelleria', 'tag.valigia'];
  topTags.forEach((k, i) => {
    const tg = textPlane([t(k)], 0.55, 0.11, { bg: '#d9d3c4', size: 26, px: 64 });
    tg.position.set(caseX - 0.33, topY + 0.02, zs[i]);
    tg.rotation.set(-0.5, -Math.PI / 2, 0, 'YXZ');
    scene.add(tg);
  });

  // bottom shelf: six empty pedestals waiting
  const lowY = 0.65;
  const lowZ = [-1.85, -1.2, -0.55, 0.1, 0.75, 1.4];
  const lowTags = ['tag.barbiere', 'tag.orologeria', 'tag.fotografo', 'tag.radio', 'tag.ada', 'tag.lisa'];
  const pedestals: THREE.Object3D[] = [];
  lowZ.forEach((z, i) => {
    const p = cyl(0.09, 0.11, 0.08, mat(0x2a2622), caseX, lowY + 0.04, z, 14);
    scene.add(p);
    pedestals.push(p);
    const tg = textPlane([t(lowTags[i])], 0.55, 0.11, { bg: '#d9d3c4', size: 24, px: 64 });
    tg.position.set(caseX - 0.33, lowY + 0.02, z);
    tg.rotation.set(-0.5, -Math.PI / 2, 0, 'YXZ');
    scene.add(tg);
  });

  // razor on its pedestal (hidden until placed)
  const razor = new THREE.Group();
  const blade = box(0.02, 0.03, 0.2, cm, 0, 0.12, 0.05);
  const handle = box(0.025, 0.035, 0.18, cm, 0, 0.12, -0.12);
  razor.add(blade, handle);
  razor.rotation.x = -0.3;
  razor.position.set(caseX, lowY + 0.02, lowZ[0]);
  razor.visible = !!g.flag('placedRazor');
  scene.add(razor);

  // door with bell behind the player
  scene.add(box(1.0, 2.1, 0.06, dark, 0, 1.05, D / 2 - 0.04));

  // ---------------- hotspots ----------------
  const hMerchant = hitBox(1.4, 2.2, 1.2, -0.8, 1.1, -1.8, 'merchant');
  const hCase = hitBox(0.9, 1.8, 3.8, caseX, 1.3, caseZ, 'case');
  const hSlot = hitBox(0.6, 0.5, 0.6, caseX - 0.1, lowY + 0.2, lowZ[0], 'slot');
  const hShelves = hitBox(0.6, 2.4, 4.6, -3.2, 1.3, -0.5, 'shelves');
  const hLedger = hitBox(0.6, 0.3, 0.5, -1.2, 1.1, -1.2, 'ledger');
  scene.add(hMerchant, hCase, hSlot, hShelves, hLedger);

  const merchantTalk = async () => {
    eyes.visible = true;
    try {
      if (g.has('razor') && !g.flag('placedRazor')) {
        await g.say([{ who: 'mercante', key: 'emp.haveRazor' }]);
      } else if (g.flag('placedRazor')) {
        await g.say([{ who: 'mercante', key: 'emp.after1' }, { who: 'mercante', key: 'emp.after2' }]);
      } else if (g.flag('fledButcher')) {
        await g.say([
          { who: 'mercante', key: 'emp.afterButcher1' },
          { who: 'diego', key: 'emp.afterButcher2' },
          { who: 'mercante', key: 'emp.afterButcher3' },
        ]);
      } else {
        await g.say([{ who: 'mercante', key: 'emp.again' }]);
      }
    } finally {
      eyes.visible = false;
    }
  };

  const placeRazor = async () => {
    g.deselect();
    g.take('razor');
    g.set('placedRazor');
    g.rebuild('map');
    razor.visible = true;
    g.audio.sfx('glass');
    g.setFlicker(true, 0.8);
    candleBase = 0.4;
    await sleep(500);
    g.audio.sfx('seal');
    g.audio.sfx('whisper');
    g.engine.shake(0.03, 0.8);
    await sleep(1400);
    candleBase = 3.2;
    g.setFlicker(false);
    await g.say([
      { who: 'narr', key: 'emp.sealed' },
      { who: 'mercante', key: 'emp.placed1' },
      { who: 'mercante', key: 'emp.placed2' },
      { who: 'diego', key: 'emp.placed3' },
    ]);
    await g.view('main');
  };

  const hotspots: Hotspot[] = [
    { id: 'merchant', obj: hMerchant, view: 'counter', tap: async (item) => {
      if (item === 'razor') {
        await g.say([{ who: 'mercante', key: 'emp.notToMe' }]);
        g.deselect();
        return;
      }
      if (item) return g.nope();
      await merchantTalk();
    } },
    { id: 'slot', obj: hSlot, when: () => g.viewName === 'case', tap: async (item) => {
      if (item === 'razor') return placeRazor();
      if (item) return g.nope();
      if (g.flag('placedRazor')) return g.say('emp.slotFull');
      return g.say('emp.slotEmpty');
    } },
    { id: 'case', obj: hCase, view: 'case', when: () => g.viewName !== 'case', tap: async (item) => {
      if (item === 'razor') return placeRazor();
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'emp.case1' }, { who: 'diego', key: 'emp.case2' }]);
    } },
    { id: 'shelves', obj: hShelves, tap: async (item) => {
      if (item) return g.nope();
      await g.say('emp.shelves');
    } },
    { id: 'ledger', obj: hLedger, view: 'counter', tap: async (item) => {
      if (item) return g.nope();
      eyes.visible = true;
      await g.say([{ who: 'diego', key: 'emp.ledger1' }, { who: 'mercante', key: 'emp.ledger2' }]);
      eyes.visible = false;
    } },
  ];

  return {
    id: 'emporio',
    nameKey: 'place.emporio',
    scene,
    drone: 'emporio',
    startView: 'main',
    views: {
      main: { pos: [0, 1.6, 2.5], look: [0, 1.25, -2], yaw: 40, pitch: 15 },
      counter: { pos: [-0.75, 1.5, 0.2], look: [-0.8, 1.45, -2.1], parent: 'main', yaw: 20, pitch: 10 },
      case: { pos: [1.35, 1.35, -0.4], look: [3.1, 1.05, -0.4], parent: 'main', yaw: 30, pitch: 14, fov: 58 },
    },
    hotspots,
    update: (_dt, time) => {
      candles.forEach((c, i) => {
        c.intensity = candleBase * (1 + Math.sin(time * 9 + i * 3) * 0.1 + Math.random() * 0.1);
      });
      merchant.rotation.y = Math.sin(time * 0.3) * 0.05;
    },
    enter: async () => {
      g.audio.sfx('bell');
      if (!g.flag('metMerchant')) {
        await sleep(600);
        await g.view('counter');
        eyes.visible = true;
        await g.say([
          { who: 'mercante', key: 'emp.intro1' },
          { who: 'diego', key: 'emp.intro2' },
          { who: 'mercante', key: 'emp.intro3' },
          { who: 'mercante', key: 'emp.intro4' },
          { who: 'diego', key: 'emp.intro5' },
          { who: 'mercante', key: 'emp.intro6' },
          { who: 'mercante', key: 'emp.intro7' },
        ]);
        eyes.visible = false;
        g.set('metMerchant');
        g.rebuild('map');
        g.note('note.merchant');
      } else if (g.has('razor') && !g.flag('placedRazor')) {
        await sleep(400);
        eyes.visible = true;
        await g.say([{ who: 'mercante', key: 'emp.feelRazor' }]);
        eyes.visible = false;
      }
    },
    hint: () => {
      if (g.has('razor')) return 'hint.emporio.place';
      if (g.flag('placedRazor')) return 'hint.emporio.done';
      return 'hint.emporio.go';
    },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
