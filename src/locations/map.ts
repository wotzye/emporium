import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot } from '../game';
import { box, cyl, sphere, mat, mesh, canvasTex, noise, textPlane, hitBox, cursedMat, fx, rbox, lathe, normalFromCanvas, woodMaterial, plasterMaterial } from '../builders';
import { LAYER_FX } from '../engine';
import { t } from '../i18n';
import { createHaunts } from './map_haunt';

interface Building {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  sign: string;
  color: number;
}

export function createMap(g: Game): Location {
  const roofMat = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#3e3732';
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16)
      for (let x = (y / 16) % 2 ? 0 : 12; x < 256; x += 24) {
        const v = 50 + Math.random() * 30;
        c.fillStyle = `rgb(${v},${v * 0.9},${v * 0.85})`;
        c.beginPath();
        c.ellipse(x, y + 8, 11, 9, 0, 0, Math.PI);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(x - 12, y + 15, 24, 2);
      }
    noise(c, 256, 256, 4000, 0.15);
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 2);
    return new THREE.MeshStandardMaterial({ map, normalMap: normalFromCanvas(cv, 3, [3, 2]), roughness: 0.8, flatShading: true });
  })();
  const glassLit = new THREE.MeshStandardMaterial({ color: 0x302c26, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 0.3 });
  const glassDark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.1, metalness: 0.2, envMapIntensity: 1.5 });
  const shutterMat = woodMaterial({ base: '#3d3a34', repeat: [1, 1] });
  const frameMat = plasterMaterial({ base: '#b3ada2' });
  /** window on a facade facing +z at depth d/2: frame, glass, open shutters */
  const windowWithShutters = (w: number, h: number, lit: boolean, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.add(rbox(w + 0.16, h + 0.16, 0.06, 0.02, frameMat, 0, 0, 0));
    g.add(mesh(new THREE.PlaneGeometry(w, h), lit ? glassLit : glassDark, 0, 0, 0.035, false));
    g.add(box(0.03, h, 0.02, mat(0x222222), 0, 0, 0.045));
    g.add(box(w, 0.03, 0.02, mat(0x222222), 0, h * 0.15, 0.045));
    for (const sd of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(sd * (w / 2 + 0.08), 0, 0.04);
      const panel = rbox(w / 2, h, 0.03, 0.01, shutterMat, sd * w / 4, 0, 0);
      sh.add(panel);
      for (let k = -4; k <= 4; k++) sh.add(box(w / 2 - 0.04, 0.012, 0.02, mat(0x222222), sd * w / 4, k * (h / 10), 0.02));
      sh.rotation.y = sd * (1.9 + Math.random() * 0.6);
      g.add(sh);
    }
    g.add(rbox(w + 0.3, 0.06, 0.2, 0.02, frameMat, 0, -h / 2 - 0.1, 0.08));
    g.position.set(x, y, z + 0.02);
    return g;
  };
  const scene = new THREE.Scene();
  const progress = (g.flag('placedRazor') ? 1 : 0) + (g.flag('placedGlasses') ? 1 : 0) + (g.flag('placedWatch') ? 1 : 0) + (g.flag('placedCamera') ? 1 : 0) + (g.flag('metMerchant') ? 0.3 : 0);
  const skyShade = progress >= 1 ? 0x1a1c20 : 0x55585c;
  scene.background = new THREE.Color(skyShade);
  scene.fog = new THREE.Fog(skyShade, 16, 42);

  // light: overcast afternoon, getting darker as objects come back
  const hemi = new THREE.HemisphereLight(0xdde3ea, 0x2a2622, progress >= 1 ? 0.35 : 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, progress >= 1 ? 0.25 : 1.1);
  sun.position.set(-10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  // cobbles
  const cobble = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#5c5953';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) {
      for (let x = (y / 22) % 2 ? 0 : 14; x < w; x += 28) {
        c.fillStyle = `rgb(${120 + Math.random() * 40},${118 + Math.random() * 40},${112 + Math.random() * 40})`;
        c.beginPath();
        c.ellipse(x, y, 12, 9, Math.random() * 0.3, 0, Math.PI * 2);
        c.fill();
      }
    }
    noise(c, w, h, 6000, 0.12);
  }, [8, 8]);
  const cobbleCanvas = (cobble.image as HTMLCanvasElement);
  const ground = mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: cobble, normalMap: normalFromCanvas(cobbleCanvas, 4, [8, 8]), normalScale: new THREE.Vector2(1, 1), roughness: 0.75 }));
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  scene.add(ground);

  // fountain
  const stone = plasterMaterial({ base: '#8d8a83', repeat: [3, 1], damp: 0.8 });
  scene.add(lathe([[0, 0], [2.45, 0], [2.45, 0.1], [2.35, 0.15], [2.35, 0.55], [2.45, 0.6], [2.45, 0.68], [2.1, 0.68], [2.1, 0.3], [0, 0.3]], stone, 0, 0, 0, 48));
  const water = mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.04, 48), new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 }), 0, 0.55, 0);
  water.castShadow = false;
  scene.add(water);
  scene.add(lathe([[0, 0], [0.4, 0], [0.32, 0.2], [0.22, 0.4], [0.2, 1.3], [0.28, 1.45], [0.95, 1.6], [0.98, 1.7], [0.6, 1.72], [0.15, 1.8], [0.12, 2.3], [0.2, 2.35], [0, 2.45]], stone, 0, 0.3, 0, 32));
  // benches
  for (const [x, z, r] of [[3.6, 2.6, -0.6], [-3.6, 2.6, 0.6], [0, -3.8, 0]] as const) {
    const bench = new THREE.Group();
    const wood = woodMaterial({ base: '#4a3a2a' });
    for (let k = 0; k < 3; k++) bench.add(rbox(1.6, 0.04, 0.12, 0.01, wood, 0, 0.45, -0.15 + k * 0.15));
    for (let k = 0; k < 2; k++) bench.add(rbox(1.6, 0.1, 0.03, 0.01, wood, 0, 0.62 + k * 0.14, -0.26).rotateX(-0.15));
    for (const sx of [-0.7, 0.7]) bench.add(rbox(0.05, 0.45, 0.5, 0.01, mat(0x1a1a1a, { metalness: 0.6, roughness: 0.5 }), sx, 0.25, -0.05));
    bench.position.set(x, 0, z);
    bench.rotation.y = r;
    scene.add(bench);
  }
  // bare trees around the square
  const bark = woodMaterial({ base: '#2a2622', repeat: [1, 3] });
  const branch = (parent: THREE.Object3D, len: number, rad: number, depth: number, seed: number) => {
    const b = mesh(new THREE.CylinderGeometry(rad * 0.65, rad, len, 7), bark, 0, len / 2, 0);
    parent.add(b);
    if (depth === 0) return;
    const n = depth > 2 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const j = new THREE.Group();
      j.position.y = len * (0.6 + 0.35 * ((i + seed) % 2));
      j.rotation.set(0.5 + ((seed * 7 + i * 3) % 5) * 0.12, ((seed * 13 + i * 2.1) % 6.28), 0);
      parent.add(j);
      branch(j, len * 0.68, rad * 0.6, depth - 1, seed + i + 1);
    }
  };
  for (const [x, z, sd] of [[-4.8, 4.8, 1], [4.8, 5.2, 2], [-4.5, -3.2, 3], [12, 8, 4], [-13, -4, 5], [3.5, -10, 6]] as const) {
    const tree = new THREE.Group();
    branch(tree, 2.2, 0.16, 4, sd);
    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  const buildings: Building[] = [
    { id: 'macelleria', x: -7.5, z: -6, w: 5, d: 4, h: 6.2, rot: 0.25, sign: 'sign.macelleria', color: 0x9b968b },
    { id: 'barbiere', x: 7, z: -6.5, w: 4, d: 4, h: 4.6, rot: -0.25, sign: 'sign.barbiere', color: 0x8b877f },
    { id: 'orologeria', x: -10.5, z: 2.5, w: 3.6, d: 3.6, h: 4.2, rot: Math.PI / 2 - 0.1, sign: 'sign.orologeria', color: 0x77736c },
    { id: 'fotografo', x: 10.5, z: 2, w: 3.6, d: 3.6, h: 4.8, rot: -Math.PI / 2 + 0.1, sign: 'sign.fotografo', color: 0x7d7a73 },
    { id: 'radio', x: -5, z: 9.5, w: 4, d: 3.4, h: 4, rot: Math.PI - 0.3, sign: 'sign.radio', color: 0x6f6b65 },
    { id: 'ada', x: 5, z: 9.5, w: 3.6, d: 3.6, h: 5, rot: Math.PI + 0.3, sign: 'sign.ada', color: 0x85817a },
    { id: 'chiesa', x: 0, z: -13, w: 4, d: 5, h: 8, rot: 0, sign: '', color: 0x6a6761 },
  ];

  const hotspots: Hotspot[] = [];
  const signs: THREE.Object3D[] = [];
  const labelFor: [THREE.Sprite, string][] = [];
  const label = (text: string, x: number, y: number, z: number, open: boolean, target?: string) => {
    const font = "bold 58px 'American Typewriter', 'Courier New', monospace";
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font;
    const cw = Math.ceil(probe.measureText(text).width + 60);
    const tex = canvasTex(cw, 96, (c, w, h) => {
      c.font = font;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 8;
      c.strokeStyle = 'rgba(0,0,0,0.75)';
      c.strokeText(text, w / 2, h / 2);
      c.shadowColor = 'rgba(0,0,0,0.9)';
      c.shadowBlur = 16;
      c.fillStyle = open ? '#ffffff' : 'rgba(215,210,200,0.85)';
      c.fillText(text, w / 2, h / 2);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
    const k = (open ? 1.4 : 1.15) * [1.0, 1.4, 1.75][g.save.settings.textSize ?? 1];
    sp.scale.set((cw / 96) * k, k, 1);
    sp.position.set(x, y, z);
    sp.renderOrder = 10;
    sp.layers.set(LAYER_FX);
    if (target) labelFor.push([sp, target]);
    else sp.userData.noPick = true;
    scene.add(sp);
  };
  // a finished shop opens again while it still holds something another unfinished shop needs
  const stillNeeded = {
    get ada() {
      const gear = !g.flag('placedWatch') && !g.flag('a.gear') && !g.flag('o.gearIn') && !g.has('gear');
      const bulb = !g.flag('placedCamera') && !g.flag('a.redbulb') && !g.flag('f.bulb') && !g.has('redbulb');
      return gear || bulb;
    },
    get barbiere() {
      return !g.flag('placedGlasses') && !g.flag('y.shears') && !g.flag('a.shears') && !g.flag('a.vines') && !g.has('shears');
    },
    get orologeria() {
      return !g.flag('placedRazor') && !g.flag('o.hand') && !g.flag('c.hand') && !g.flag('c.clock') && !g.has('minutehand');
    },
    get fotografo() {
      return !!g.flag('rl.ticket') && !g.has('valve') && !g.flag('rl.valveIn');
    },
  };
  const isOpen: Record<string, boolean> = {
    emporio: true,
    macelleria: !!g.flag('metMerchant') && !g.flag('fledButcher'),
    barbiere: !!g.flag('fledButcher') && (!g.flag('placedRazor') || stillNeeded.barbiere),
    ada: !!g.flag('fledButcher') && (!g.flag('placedGlasses') || stillNeeded.ada),
    orologeria: !!g.flag('fledButcher') && (!g.flag('placedWatch') || stillNeeded.orologeria),
    fotografo: !!g.flag('fledButcher') && (!g.flag('placedCamera') || stillNeeded.fotografo),
    radio: !!g.flag('fledButcher') && !g.flag('placedRadio'),
  };

  for (const b of buildings) {
    const grp = new THREE.Group();
    grp.position.set(b.x, 0, b.z);
    grp.rotation.y = b.rot;
    const hex = '#' + b.color.toString(16).padStart(6, '0');
    const wallM = plasterMaterial({ base: hex, repeat: [b.w / 3, b.h / 3], damp: 0.8 });
    grp.add(box(b.w, b.h, b.d, wallM, 0, b.h / 2, 0));
    // plinth and cornice
    grp.add(rbox(b.w + 0.1, 0.5, b.d + 0.1, 0.03, plasterMaterial({ base: '#55524c', repeat: [b.w / 2, 0.3] }), 0, 0.25, 0));
    grp.add(rbox(b.w + 0.3, 0.18, b.d + 0.3, 0.04, plasterMaterial({ base: '#77736b', repeat: [b.w / 2, 0.2] }), 0, b.h + 0.06, 0));
    grp.add(rbox(b.w + 0.12, 0.08, 0.06, 0.02, plasterMaterial({ base: '#77736b' }), 0, 3.0, b.d / 2 + 0.03));
    // roof with clay tiles
    const roof = mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.78, 1.6, 4), roofMat, 0, b.h + 0.95, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, b.d / b.w);
    grp.add(roof);
    // chimney
    grp.add(rbox(0.4, 1.2, 0.4, 0.03, wallM, b.w * 0.25, b.h + 1.3, -b.d * 0.15));
    // door & windows on front (+z)
    const lit = progress >= 1 && b.id !== 'chiesa';
    const door = new THREE.Group();
    door.add(rbox(1.0, 2.1, 0.1, 0.02, plasterMaterial({ base: '#4d4a44' }), 0, 1.05, 0));
    door.add(rbox(0.86, 1.95, 0.08, 0.02, woodMaterial({ base: '#2a2018', repeat: [1, 2] }), 0, 0.98, 0.03));
    door.add(sphere(0.035, mat(0x777777, { metalness: 0.8, roughness: 0.4 }), 0.3, 1.0, 0.09, 10));
    door.position.set(b.id === 'macelleria' ? -1 : 0, 0, b.d / 2 + 0.01);
    grp.add(door);
    if (b.id !== 'chiesa') {
      const wins: [number, number, number, number][] = [[b.w / 2 - 0.95, 1.5, 1.1, 1.0], [-b.w / 2 + 0.85, b.h - 1.3, 0.75, 1.05], [b.w / 2 - 0.85, b.h - 1.3, 0.75, 1.05]];
      if (b.h > 5) wins.push([0, b.h - 1.3, 0.75, 1.05]);
      for (const [wx, wy, ww, wh] of wins) grp.add(windowWithShutters(ww, wh, lit && Math.random() < 0.7, wx, wy, b.d / 2));
    } else {
      // church: bell tower
      grp.add(box(1.4, 4, 1.4, wallM, 0, b.h + 2, -1.5));
      const tip = mesh(new THREE.ConeGeometry(1.1, 2, 4), mat(0x3a3430), 0, b.h + 5, -1.5);
      tip.rotation.y = Math.PI / 4;
      grp.add(tip);
    }
    if (b.id !== 'chiesa') {
      const wp = new THREE.Vector3(0, b.h + 2.1, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rot).add(new THREE.Vector3(b.x, 0, b.z));
      if (b.id === 'macelleria') {
        label(t('place.macelleria'), wp.x - 1.2, wp.y, wp.z, isOpen.macelleria, 'macelleria');
        const ep = new THREE.Vector3(1.4, 3.4, b.d / 2 + 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rot).add(new THREE.Vector3(b.x, 0, b.z));
        label(t('place.emporio').split(' ')[0], ep.x, ep.y, ep.z, true, 'emporio');
      } else label(t(`label.${b.id}`), wp.x, wp.y, wp.z, !!isOpen[b.id], b.id);
    }
    if (b.sign) {
      const s = textPlane([t(b.sign)], b.w * 0.9, 0.55, { bg: '#1a1816', fg: '#e8e2d4', size: 90, px: 128 });
      s.position.set(0, 2.45, b.d / 2 + 0.05);
      grp.add(s);
      signs.push(s);
    }
    if (b.id === 'barbiere') {
      // barber pole (stripes read fine in black & white)
      const poleTex = canvasTex(64, 256, (c, w, h) => {
        c.fillStyle = '#eee';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#222';
        for (let y = -h; y < h * 2; y += 40) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(w, y + 30);
          c.lineTo(w, y + 48);
          c.lineTo(0, y + 18);
          c.fill();
        }
      });
      const pole = cyl(0.12, 0.12, 1.2, mat(0xffffff, { map: poleTex }), b.w / 2 - 0.3, 2.0, b.d / 2 + 0.2);
      grp.add(pole);
      (pole as THREE.Mesh).userData.spin = true;
    }
    if (b.id === 'macelleria') {
      // Emporio: steps going down at the side of the butcher's, with its own small sign
      grp.add(box(1.3, 0.1, 1.6, mat(0x242424), 1.3, 0.02, b.d / 2 + 0.9));
      grp.add(box(1.0, 1.6, 0.08, mat(0x050505), 1.3, 0.8, b.d / 2 + 0.01));
      const es = textPlane([t('sign.emporio')], 1.6, 0.42, { bg: '#0b0b0b', fg: '#d8cfbd', size: 60, px: 96, border: '#8b7d63' });
      es.position.set(1.3, 1.95, b.d / 2 + 0.06);
      grp.add(es);
      signs.push(es);
      // a red glint in the Emporio window: cursed things inside
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), cursedMat());
      glint.position.set(1.3, 0.9, b.d / 2 + 0.07);
      grp.add(glint);
      const eh = hitBox(1.6, 2.4, 1.8, 1.3, 1.2, b.d / 2 + 0.6, 'emporio');
      grp.add(eh);
      hotspots.push({ id: 'emporio', obj: eh, tap: () => g.go('emporio') });
      const mh = hitBox(b.w + 0.3, b.h + 0.8, b.d + 0.3, 0, (b.h + 0.8) / 2, 0, 'macelleria');
      grp.add(mh);
      hotspots.push({
        id: 'macelleria',
        obj: mh,
        tap: async () => {
          if (!g.flag('metMerchant')) return g.say('map.notYet');
          if (g.flag('fledButcher')) return g.say('map.butcherClosed');
          return g.go('macelleria');
        },
      });
    } else if (b.id !== 'chiesa') {
      const hb = hitBox(b.w + 0.4, b.h + 0.4, b.d + 0.4, 0, b.h / 2, 0, b.id);
      grp.add(hb);
      hotspots.push({
        id: b.id,
        obj: hb,
        tap: async () => {
          if (b.id === 'barbiere') {
            if (!g.flag('fledButcher')) return g.say('map.barberLocked');
            if (g.flag('placedRazor') && !stillNeeded.barbiere) return g.say('map.barberDone');
            return g.go('barbiere');
          }
          if (b.id === 'orologeria') {
            if (!g.flag('fledButcher')) return g.say('map.oraLocked');
            if (g.flag('placedWatch') && !stillNeeded.orologeria) return g.say('map.oraDone');
            return g.go('ora_bottega');
          }
          if (b.id === 'fotografo') {
            if (!g.flag('fledButcher')) return g.say('map.fotoLocked');
            // the radio man's valve is still in Ferri's archive: you may go back in for it
            if (g.flag('placedCamera') && !stillNeeded.fotografo) return g.say('map.fotoDone');
            return g.go('foto_negozio');
          }
          if (b.id === 'radio') {
            if (!g.flag('fledButcher')) return g.say('map.radioLocked');
            if (g.flag('placedRadio')) return g.say('map.radioDone');
            return g.go('radio_negozio');
          }
          if (b.id === 'ada') {
            if (!g.flag('fledButcher')) return g.say('map.adaLocked');
            if (g.flag('placedGlasses') && !stillNeeded.ada) return g.say('map.adaDone');
            return g.go('ada_soggiorno');
          }
          g.ui.toast(t('map.soon'));
        },
      });
    }
    scene.add(grp);
  }

  // the alley to the suitcase maker: fog and a narrow gap
  const alleyFog = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({
      map: canvasTex(128, 128, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(230,230,230,0.6)');
        gr.addColorStop(1, 'rgba(230,230,230,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  alleyFog.position.set(12.5, 1.6, -2.5);
  alleyFog.rotation.y = -Math.PI / 2;
  fx(alleyFog);
  scene.add(alleyFog);
  scene.add(box(0.6, 5, 6, mat(0x5b5853), 13.8, 2.5, -3.5));
  const vs = textPlane([t('sign.valigia')], 2.2, 0.45, { bg: '#1a1816', fg: '#e8e2d4', size: 60, px: 96 });
  vs.position.set(12.2, 2.8, -3.2);
  vs.rotation.y = -Math.PI / 2;
  scene.add(vs);
  label(t('label.valigia'), 12, 5.6, -2.5, false, 'valigia');
  label(t('label.stazione'), 0, 4.6, 17, false, 'stazione');
  const vh = hitBox(2, 3, 3, 12.5, 1.5, -2.5, 'valigia');
  scene.add(vh);
  hotspots.push({ id: 'valigia', obj: vh, tap: () => g.say('map.alley') });

  // station at the edge
  scene.add(box(6, 0.4, 2, mat(0x4d4a45), 0, 0.2, 17));
  scene.add(box(0.15, 3, 0.15, mat(0x222222), -2, 1.5, 17));
  scene.add(box(0.15, 3, 0.15, mat(0x222222), 2, 1.5, 17));
  scene.add(box(4.6, 0.12, 2.2, mat(0x2a2a2a), 0, 3, 17));
  const st = textPlane([t('sign.stazione')], 3, 0.5, { bg: '#e6e0d0', fg: '#111', size: 70, px: 96 });
  st.position.set(0, 2.6, 16);
  scene.add(st);
  const sh = hitBox(6, 3.5, 3, 0, 1.5, 17, 'stazione');
  scene.add(sh);
  hotspots.push({ id: 'stazione', obj: sh, tap: () => g.say('map.station') });

  for (const [sp, id] of labelFor) {
    const h = hotspots.find((x) => x.id === id);
    if (h) hotspots.push({ id: id + 'Label', obj: sp, tap: h.tap, lowPriority: true }); // a label in front never steals a tap from the building behind it
  }

  // street lamps (lit when it gets dark)
  for (const [x, z] of [[-3.5, -3], [3.5, -3], [-3.5, 4], [3.5, 4]]) {
    const iron = mat(0x161616, { metalness: 0.5, roughness: 0.5 });
    const realLamp = prop('streetLamp', { height: 3.4 });
    if (realLamp) {
      realLamp.position.set(x, 0, z);
      realLamp.traverse((o) => (o.userData.noPick = true));
      scene.add(realLamp);
    } else scene.add(lathe([[0, 0], [0.18, 0], [0.16, 0.12], [0.08, 0.2], [0.06, 0.5], [0.045, 2.9], [0.07, 3.0], [0, 3.0]], iron, x, 0, z, 12));
    const lampOn = progress >= 1;
    const lantern = new THREE.Group();
    lantern.add(lathe([[0, 0], [0.12, 0], [0.18, 0.35], [0.22, 0.38], [0, 0.5]], iron, 0, 0, 0, 4));
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.3, 4, 1, true), new THREE.MeshBasicMaterial({ color: lampOn ? 0xfff1d0 : 0x55585a, side: THREE.DoubleSide }));
    glow.position.y = 0.18;
    glow.userData.noPick = true;
    lantern.add(glow);
    lantern.position.set(x, 3.0, z);
    lantern.traverse((o) => (o.userData.noPick = true));
    if (!realLamp) scene.add(lantern);
    else {
      glow.removeFromParent();
      (glow as THREE.Mesh).geometry = new THREE.SphereGeometry(0.12, 10, 8);
      glow.position.set(x, 3.0, z);
      if (lampOn) scene.add(glow);
    }
    if (lampOn) {
      const pl = new THREE.PointLight(0xfff1d0, 6, 9, 1.6);
      pl.position.set(x, 3.1, z);
      scene.add(pl);
    }
  }

  // shadows, a pale girl, crows, fog and the man in black
  const haunt = createHaunts(scene, g);

  let tAcc = 0;
  return {
    id: 'map',
    nameKey: 'place.map',
    scene,
    drone: 'map',
    startView: 'top',
    exposure: 0.8,
    // the places you can walk into right now are prepared while you look at the square
    next: ['emporio', ...(isOpen.macelleria ? ['macelleria'] : []), ...(isOpen.barbiere ? ['barbiere'] : []), ...(isOpen.ada ? ['ada_soggiorno'] : []), ...(isOpen.orologeria ? ['ora_bottega'] : []), ...(isOpen.fotografo ? ['foto_negozio'] : []), ...(isOpen.radio ? ['radio_negozio'] : [])],
    views: {
      top: { pos: [0, 25, 19], look: [0, 0, -0.5], yaw: 14, pitch: 8, fov: 48 },
    },
    hotspots,
    update: (dt, time) => {
      scene.traverse((o) => {
        if (o.userData.spin) o.rotation.y += dt * 1.5;
      });
      tAcc += dt;
      haunt(dt, time);
    },
    enter: async () => {
      if (!g.flag('introMap')) {
        g.set('introMap');
        await g.say([
          { who: 'diego', key: 'map.intro1' },
          { who: 'diego', key: 'map.intro2' },
        ]);
      }
      const nPlaced = ['placedRazor', 'placedGlasses', 'placedWatch', 'placedCamera', 'placedRadio'].filter((f) => g.flag(f)).length;
      if (nPlaced > 0 && !g.flag('chapter2')) {
        g.set('chapter2');
        await g.ui.cards(['mid.1', 'mid.2']);
      }
      if (nPlaced >= 5 && !g.flag('demoEnd')) {
        g.set('demoEnd');
        await g.ui.cards(['end.1', 'end.2', 'end.3']);
      }
    },
    hint: () => {
      if (!g.flag('metMerchant')) return 'hint.map.emporio';
      if (!g.flag('fledButcher')) return 'hint.map.macelleria';
      if (g.has('razor')) return 'hint.map.return';
      if (g.has('glasses')) return 'hint.map.returnGlasses';
      if (g.has('watch')) return 'hint.map.returnWatch';
      if (g.has('camera')) return 'hint.map.returnCamera';
      if (g.has('radio')) return 'hint.map.returnRadio';
      if (g.flag('placedGlasses') && stillNeeded.ada && g.flag('o.labEntered') && !g.flag('a.gear')) return 'hint.map.gear';
      if (g.flag('placedGlasses') && stillNeeded.ada && g.flag('f.dark')) return 'hint.map.redbulb';
      if (g.flag('placedRazor') && stillNeeded.barbiere && g.flag('a.shedKey')) return 'hint.map.shears';
      if (g.flag('placedWatch') && stillNeeded.orologeria && g.flag('c.sheet.clock')) return 'hint.map.hand';
      if (!g.flag('placedRazor') && !g.flag('placedGlasses') && !g.flag('placedWatch') && !g.flag('placedCamera') && !g.flag('placedRadio')) return 'hint.map.choose';
      if (!g.flag('placedRazor')) return 'hint.map.barbiere';
      if (!g.flag('placedGlasses')) return 'hint.map.ada';
      if (!g.flag('placedWatch')) return 'hint.map.ora';
      if (!g.flag('placedCamera')) return 'hint.map.foto';
      if (g.flag('rl.ticket') && !g.has('valve') && !g.flag('rl.valveIn')) return 'hint.map.valve';
      if (!g.flag('placedRadio')) return 'hint.map.radio';
      return 'hint.map.done';
    },
  };
}
