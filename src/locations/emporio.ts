import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, textPlane, hitBox, cursedMat, bulb, fx, rbox, lathe, dust, lightCone, canvasTex, noise, woodMaterial, plasterMaterial } from '../builders';
import { createMerchant } from '../characters';
import { barberMemory } from '../memories';
import { prop } from '../models';
import { t } from '../i18n';

export function createEmporio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 5, 12);
  scene.userData.envIntensity = 0.06;

  const W = 7, H = 3.2, D = 6;
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#2f2a24', repeat: [3, 1], stripes: true, damp: 0.7 }),
    floor: woodMaterial({ base: '#3a2c1f', repeat: [3, 3], plank: true, rough: 0.45 }),
    ceil: plasterMaterial({ base: '#1d1a17', repeat: [2, 2], damp: 0.3 }),
  }));
  const woodDark = woodMaterial({ base: '#2c2118', repeat: [1, 1] });
  const woodMid = woodMaterial({ base: '#4a3826', repeat: [1, 1] });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35, envMapIntensity: 1.4 });
  const dark = mat(0x1d1915);
  // ceiling beams
  for (let z = -2.4; z <= 2.4; z += 1.2) scene.add(rbox(W, 0.16, 0.14, 0.03, woodDark, 0, H - 0.08, z));

  // ---------------- light ----------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  // two dim wall sconces: one over the shelves, one by the display case
  for (const [x, z, ry] of [[-3.38, 0.9, Math.PI / 2], [3.38, 1.6, -Math.PI / 2]] as const) {
    const sc = new THREE.Group();
    sc.add(rbox(0.05, 0.16, 0.1, 0.02, mat(0x6d6248, { metalness: 0.9, roughness: 0.4 }), 0, 0, 0));
    sc.add(lathe([[0, 0], [0.04, 0], [0.07, 0.1], [0.065, 0.11], [0, 0.11]], new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.4, emissive: 0xffe3b0, emissiveIntensity: 0.7 }), 0.1, 0.02, 0, 16));
    sc.position.set(x, 2.3, z);
    sc.rotation.y = ry;
    scene.add(sc);
    const pl = new THREE.PointLight(0xffd9a0, 6, 6, 1.5);
    pl.position.set(x + (x < 0 ? 0.25 : -0.25), 2.25, z);
    scene.add(pl);
  }
  // a rocking chair in the corner, which sometimes rocks on its own
  const rockPivot = new THREE.Group();
  const rocker = prop('rocking', { height: 1.05 });
  if (rocker) {
    rockPivot.add(rocker);
    rockPivot.position.set(2.55, 0, 1.75);
    rockPivot.rotation.y = -2.4;
    scene.add(rockPivot);
  }
  let rockAmp = 0;
  let nextRock = 8 + Math.random() * 10;
  const b = bulb(-0.6, 2.7, 0.2, 10, 1.1, 7);
  scene.add(b.group);
  scene.add(lightCone(-0.6, 2.68, 0.2, 2.6, 1.2, 0.02));
  const motes = dust([-3.2, 0.2, -2.6], [3.2, 3.0, 2.6], 200);
  scene.add(motes.points);

  // ---------------- counter ----------------
  scene.add(rbox(3.6, 0.98, 0.6, 0.03, woodMid, -0.6, 0.49, -1.3));
  for (let i = 0; i < 4; i++) scene.add(rbox(0.75, 0.6, 0.03, 0.03, woodDark, -1.95 + i * 0.9, 0.5, -0.99));
  scene.add(rbox(3.8, 0.05, 0.7, 0.02, woodDark, -0.6, 1.0, -1.3));
  scene.add(rbox(3.8, 0.015, 0.02, 0.006, brass, -0.6, 1.0, -0.95));
  // brass till
  const till = new THREE.Group();
  till.add(rbox(0.42, 0.26, 0.36, 0.04, brass, 0, 0.13, 0));
  const tillTop = rbox(0.42, 0.16, 0.2, 0.03, brass, 0, 0.32, 0.06);
  tillTop.rotation.x = -0.5;
  till.add(tillTop);
  till.add(textPlane(['£ 0'], 0.2, 0.06, { bg: '#111', fg: '#e8e0c8', size: 30, px: 48 }).translateY(0.42).translateZ(0.02));
  till.position.set(0.6, 1.025, -1.4);
  till.rotation.y = -0.2;
  scene.add(till);
  // ledger
  const ledger = new THREE.Group();
  ledger.add(rbox(0.42, 0.03, 0.3, 0.01, mat(0x2a1d14, { roughness: 0.6 }), 0, 0, 0));
  const pages = mesh(new THREE.PlaneGeometry(0.4, 0.28), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 180, (c, w, h) => {
      c.fillStyle = '#ddd3bd';
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(30,25,20,0.75)';
      for (let y = 16; y < h; y += 11) {
        c.fillRect(10, y - 3, 40 + Math.random() * 50, 2);
        c.fillRect(w / 2 + 10, y - 3, 30 + Math.random() * 40, 2);
        c.fillRect(w / 2 - 40, y - 3, 22, 2);
        c.fillRect(w - 40, y - 3, 24, 2);
      }
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(w / 2 - 2, 0, 4, h);
      noise(c, w, h, 900, 0.1);
    }),
    roughness: 0.85,
  }), 0, 0.017, 0, false);
  pages.rotation.x = -Math.PI / 2;
  ledger.add(pages);
  ledger.add(cyl(0.004, 0.004, 0.17, mat(0x111111), 0.1, 0.022, 0.04, 6).rotateZ(Math.PI / 2).rotateY(0.6));
  ledger.position.set(-1.2, 1.04, -1.2);
  ledger.rotation.y = 0.2;
  scene.add(ledger);
  // service bell
  scene.add(lathe([[0, 0], [0.05, 0], [0.05, 0.006], [0.045, 0.02], [0.03, 0.045], [0.008, 0.055], [0.006, 0.07], [0, 0.072]], brass, -2.1, 1.025, -1.15, 20));

  // candles in brass holders
  const candles: THREE.PointLight[] = [];
  let candleBase = 2.6;
  const flames: THREE.Mesh[] = [];
  for (const x of [-1.9, 0.0]) {
    scene.add(lathe([[0, 0], [0.07, 0], [0.07, 0.01], [0.02, 0.03], [0.015, 0.12], [0.035, 0.14], [0.03, 0.15], [0, 0.15]], brass, x, 1.025, -1.15, 20));
    const candle = lathe([[0, 0], [0.028, 0], [0.03, 0.02], [0.029, 0.15], [0.034, 0.16], [0.026, 0.19], [0.0, 0.19]], new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.5, emissive: 0xffe0b0, emissiveIntensity: 0.15 }), x, 1.17, -1.15, 16);
    scene.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    flame.scale.y = 2.4;
    flame.position.set(x, 1.39, -1.15);
    flame.userData.noPick = true;
    scene.add(flame);
    flames.push(flame);
    const pl = new THREE.PointLight(0xffc887, 2.6, 6, 1.4);
    pl.position.set(x, 1.42, -1.1);
    pl.castShadow = x === 0.0;
    pl.shadow.mapSize.set(512, 512);
    scene.add(pl);
    candles.push(pl);
  }

  // velvet curtain behind the Merchant
  const curtainGeo = new THREE.PlaneGeometry(2.6, 2.6, 60, 4);
  {
    const p = curtainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.05 + Math.sin(p.getX(i) * 5.3) * 0.03);
    curtainGeo.computeVertexNormals();
  }
  const curtain = mesh(curtainGeo, new THREE.MeshStandardMaterial({ color: 0x241e1c, roughness: 0.95 }), -0.8, 1.3, -2.78);
  curtain.castShadow = false;
  scene.add(curtain);
  scene.add(rbox(2.8, 0.05, 0.05, 0.02, brass, -0.8, 2.62, -2.75));

  // the Merchant: sculpted, never fully lit, always watching
  const merchantC = createMerchant({ y: 1.07, z: 0.82, spread: 0.24 });
  const merchant = merchantC.group;
  // rim light from behind and above: he is a silhouette cut out of the dark
  const rim = new THREE.SpotLight(0xe8eef5, 9, 4.2, 0.32, 0.6, 1.2);
  rim.position.set(-0.8, 3.05, -2.75);
  rim.target.position.set(-0.8, 1.85, -1.95);
  scene.add(rim, rim.target);
  merchant.position.set(-0.8, 0, -2.15);
  merchant.traverse((o) => (o.userData.noPick = true));
  scene.add(merchant);
  const eyes = { set visible(v: boolean) { merchantC.setEyes(v); } };
  merchantC.setEyes(false);

  // shelves full of things, left wall and back wall (right part)
  const rnd = mulberry(7);
  const shelfStuff = (x0: number, z0: number, alongZ: boolean, len: number) => {
    scene.add(alongZ ? rbox(0.4, 2.5, len + 0.1, 0.02, woodDark, x0 - 0.05 * Math.sign(x0), 1.25, z0) : rbox(len + 0.1, 2.5, 0.4, 0.02, woodDark, x0, 1.25, z0 - 0.05));
    for (const y of [0.5, 1.1, 1.7, 2.3]) {
      const sh = alongZ ? rbox(0.36, 0.035, len, 0.01, woodMid, x0, y, z0) : rbox(len, 0.035, 0.36, 0.01, woodMid, x0, y, z0);
      scene.add(sh);
      let p = -len / 2 + 0.15;
      while (p < len / 2 - 0.15) {
        const k = rnd();
        const shade = Math.floor(0x22 + rnd() * 0x40);
        const m = new THREE.MeshStandardMaterial({ color: (shade << 16) | (shade << 8) | Math.floor(shade * 0.92), roughness: 0.25 + rnd() * 0.6, metalness: rnd() < 0.2 ? 0.8 : 0 });
        let o: THREE.Object3D;
        if (k < 0.25) {
          // vase / bottle
          const r = 0.04 + rnd() * 0.05, hh = 0.12 + rnd() * 0.25;
          o = lathe([[0, 0], [r, 0], [r * 1.2, hh * 0.3], [r * 0.9, hh * 0.7], [r * 0.4, hh * 0.85], [r * 0.5, hh], [0, hh]], m, 0, 0, 0, 16);
        } else if (k < 0.4) {
          // books
          o = new THREE.Group();
          const n = 3 + Math.floor(rnd() * 5);
          for (let i = 0; i < n; i++) {
            const bh = 0.16 + rnd() * 0.1;
            (o as THREE.Group).add(rbox(0.035, bh, 0.15, 0.006, new THREE.MeshStandardMaterial({ color: (Math.floor(0x20 + rnd() * 0x30) * 0x010101), roughness: 0.7 }), i * 0.04, bh / 2, 0));
          }
        } else if (k < 0.55) {
          // small clock
          o = new THREE.Group();
          (o as THREE.Group).add(rbox(0.14, 0.16, 0.08, 0.03, woodMid, 0, 0.08, 0));
          const face = textPlane(['XII'], 0.09, 0.09, { bg: '#e2dccb', size: 16, px: 48 });
          face.position.set(0, 0.09, 0.041);
          (o as THREE.Group).add(face);
        } else if (k < 0.7) {
          // doll / figurine
          o = new THREE.Group();
          (o as THREE.Group).add(lathe([[0, 0], [0.05, 0], [0.04, 0.08], [0.025, 0.13], [0, 0.14]], m, 0, 0, 0, 12));
          (o as THREE.Group).add(sphere(0.03, new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.3 }), 0, 0.17, 0, 12));
        } else if (k < 0.85) {
          // box / music box
          o = new THREE.Group();
          (o as THREE.Group).add(rbox(0.2, 0.1, 0.14, 0.015, m, 0, 0.05, 0));
          (o as THREE.Group).add(rbox(0.21, 0.02, 0.15, 0.008, brass, 0, 0.1, 0));
        } else {
          // jar with something inside
          o = new THREE.Group();
          (o as THREE.Group).add(sphere(0.035, mat(0x3a332c), 0, 0.06, 0, 10));
          (o as THREE.Group).add(fx(lathe([[0, 0], [0.06, 0], [0.065, 0.12], [0.05, 0.14], [0, 0.14]], new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0.05 }), 0, 0, 0, 16)));
          (o as THREE.Group).add(cyl(0.052, 0.052, 0.02, brass, 0, 0.145, 0, 16));
        }
        if (alongZ) o.position.set(x0 + (rnd() - 0.5) * 0.1, y + 0.018, z0 + p);
        else o.position.set(x0 + p, y + 0.018, z0 + (rnd() - 0.5) * 0.1);
        o.rotation.y = rnd() * Math.PI;
        scene.add(o);
        p += 0.2 + rnd() * 0.2;
      }
    }
  };
  shelfStuff(-3.27, -0.5, true, 4.6);
  shelfStuff(1.55, -2.79, false, 1.6);

  // grandfather clock, ticking, at the back
  const clock = new THREE.Group();
  clock.add(rbox(0.55, 2.1, 0.32, 0.03, woodDark, 0, 1.05, 0));
  clock.add(rbox(0.62, 0.12, 0.38, 0.03, woodMid, 0, 2.15, 0));
  const face = mesh(new THREE.CircleGeometry(0.19, 40), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#e4ddcb';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1b1712';
      c.font = 'bold 26px Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const nums = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      nums.forEach((n, i) => {
        const a = (i / 12) * Math.PI * 2;
        c.fillText(n, w / 2 + Math.sin(a) * 96, h / 2 - Math.cos(a) * 96);
      });
      // hands stopped at 3:33
      c.strokeStyle = '#1b1712';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2 + 50, h / 2 + 10);
      c.stroke();
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2 + 20, h / 2 + 80);
      c.stroke();
      noise(c, w, h, 1500, 0.1);
    }),
    roughness: 0.4,
  }), 0, 1.75, 0.165, false);
  clock.add(face);
  clock.add(fx(mesh(new THREE.PlaneGeometry(0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 1 }), 0, 0.95, 0.165, false)));
  const pendulum = new THREE.Group();
  pendulum.position.set(0, 1.45, 0.1);
  pendulum.add(cyl(0.006, 0.006, 0.6, brass, 0, -0.3, 0, 6));
  pendulum.add(cyl(0.07, 0.07, 0.015, brass, 0, -0.62, 0, 24).rotateX(Math.PI / 2));
  clock.add(pendulum);
  clock.position.set(2.65, 0, -2.75);
  scene.add(clock);
  let lastTick = 0;

  // the display case on the right wall
  const caseX = 3.05;
  const caseZ = -0.4;
  scene.add(rbox(0.7, 0.6, 3.6, 0.03, woodMid, caseX, 0.3, caseZ));
  scene.add(rbox(0.72, 0.05, 3.62, 0.015, woodDark, caseX, 1.25, caseZ));
  scene.add(rbox(0.74, 0.08, 3.66, 0.02, woodDark, caseX, 2.17, caseZ));
  scene.add(rbox(0.72, 0.05, 3.62, 0.015, woodDark, caseX, 0.62, caseZ));
  for (const z of [caseZ - 1.8, caseZ - 0.6, caseZ + 0.6, caseZ + 1.8]) scene.add(rbox(0.05, 1.55, 0.05, 0.015, brass, caseX - 0.34, 1.4, z));
  scene.add(rbox(0.05, 1.6, 3.6, 0.01, woodDark, caseX + 0.33, 1.4, caseZ));
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

  // door with a bell behind the player
  scene.add(rbox(1.0, 2.1, 0.06, 0.02, woodDark, 0, 1.05, D / 2 - 0.04));
  scene.add(lathe([[0, 0], [0.04, 0], [0.035, 0.03], [0.015, 0.06], [0, 0.065]], brass, 0.3, 2.2, D / 2 - 0.12, 16).rotateX(Math.PI));

  // ---------------- hotspots ----------------
  const hMerchant = hitBox(1.4, 2.2, 1.2, -0.8, 1.1, -1.8, 'merchant');
  const hCase = hitBox(0.9, 1.8, 3.8, caseX, 1.3, caseZ, 'case');
  const hSlot = hitBox(0.6, 0.5, 0.6, caseX - 0.1, lowY + 0.2, lowZ[0], 'slot');
  const hShelves = hitBox(0.6, 2.4, 4.6, -3.2, 1.3, -0.5, 'shelves');
  const hLedger = hitBox(0.6, 0.3, 0.5, -1.2, 1.1, -1.2, 'ledger');
  scene.add(hMerchant, hCase, hSlot, hShelves, hLedger);

  const giveTorch = async () => {
    await g.say([{ who: 'mercante', key: 'emp.torch1' }]);
    g.set('hasTorch');
    g.audio.sfx('pickup');
    g.ui.toast(t('ui.got', { item: t('item.torch') }));
    g.setTorch(false, true);
    await g.say([{ who: 'narr', key: 'emp.torch2' }]);
  };

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
    await g.say([{ who: 'narr', key: 'emp.sealed' }]);
    // the object remembers: the story of the man it belonged to, to a music box
    g.audio.rec('windup', { gain: 0.8 });
    g.audio.rec('musicbox', { gain: 0.7, delay: 1.4 });
    g.audio.rec('musicbox', { gain: 0.55, delay: 4.2, rate: 0.94 });
    g.audio.rec('musicbox', { gain: 0.4, delay: 7.0, rate: 0.88 });
    await g.ui.fadeOut(800);
    const m = barberMemory();
    await g.ui.memory(m.title, m.panels);
    g.diaryPage('memBarbiere');
    await g.ui.fadeIn(800);
    await g.say([
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
    update: (dt, time) => {
      if (rocker) {
        nextRock -= dt;
        if (nextRock < 0) {
          rockAmp = 0.12;
          nextRock = 14 + Math.random() * 16;
          g.audio.sfx('creak');
        }
        rockAmp *= Math.exp(-dt * 0.35);
        rocker.rotation.x = Math.sin(time * 2.2) * rockAmp;
      }
      candles.forEach((c, i) => {
        c.intensity = candleBase * (1 + Math.sin(time * 9 + i * 3) * 0.1 + Math.random() * 0.1);
        flames[i].scale.set(1 + Math.random() * 0.15, 2.4 + Math.sin(time * 11 + i) * 0.3, 1);
      });
      merchantC.update(dt, time, g.engine.camera);
      motes.update(dt, time);
      pendulum.rotation.z = Math.sin(time * Math.PI) * 0.18;
      const tick = Math.floor(time);
      if (tick !== lastTick) {
        lastTick = tick;
        g.audio.sfx('tick');
      }
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
        g.set('metMerchant');
        g.rebuild('map');
        g.note('note.merchant');
        await giveTorch();
        eyes.visible = false;
      } else if (!g.flag('hasTorch')) {
        await g.view('counter');
        eyes.visible = true;
        await giveTorch();
        eyes.visible = false;
      } else if (g.has('razor') && !g.flag('placedRazor')) {
        await sleep(400);
        eyes.visible = true;
        await g.say([{ who: 'mercante', key: 'emp.feelRazor' }]);
        eyes.visible = false;
      }
    },
    debug: { rim },
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
