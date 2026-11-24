import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { box, cyl, mat, mesh, canvasTex, noise, textPlane, hitBox, cursedMat, fx } from '../builders';
import { LAYER_FX } from '../engine';
import { t } from '../i18n';

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
  const scene = new THREE.Scene();
  const progress = (g.flag('placedRazor') ? 1 : 0) + (g.flag('metMerchant') ? 0.3 : 0);
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
  const ground = mesh(new THREE.PlaneGeometry(60, 60), mat(0xffffff, { map: cobble }));
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  scene.add(ground);

  // fountain
  const stone = mat(0x8d8a83);
  scene.add(cyl(2.2, 2.4, 0.6, stone, 0, 0.3, 0, 32));
  const water = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 32), mat(0x2a2d30, { roughness: 0.15, metalness: 0.3 }), 0, 0.58, 0);
  scene.add(water);
  scene.add(cyl(0.25, 0.35, 1.6, stone, 0, 1.1, 0, 12));
  scene.add(cyl(0.9, 0.5, 0.25, stone, 0, 1.9, 0, 20));
  // bench
  scene.add(box(1.6, 0.08, 0.45, mat(0x4a3a2a), 3.4, 0.45, 2.4));

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
      c.fillStyle = open ? '#ffffff' : 'rgba(200,196,188,0.6)';
      c.fillText(text, w / 2, h / 2);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
    const k = open ? 1.4 : 1.1;
    sp.scale.set((cw / 96) * k, k, 1);
    sp.position.set(x, y, z);
    sp.renderOrder = 10;
    sp.layers.set(LAYER_FX);
    if (target) labelFor.push([sp, target]);
    else sp.userData.noPick = true;
    scene.add(sp);
  };
  const isOpen: Record<string, boolean> = {
    emporio: true,
    macelleria: !!g.flag('metMerchant') && !g.flag('fledButcher'),
    barbiere: !!g.flag('fledButcher') && !g.flag('placedRazor'),
  };

  for (const b of buildings) {
    const grp = new THREE.Group();
    grp.position.set(b.x, 0, b.z);
    grp.rotation.y = b.rot;
    const wallM = mat(b.color);
    grp.add(box(b.w, b.h, b.d, wallM, 0, b.h / 2, 0));
    // roof
    const roof = mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.78, 1.6, 4), mat(0x3a3430), 0, b.h + 0.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, b.d / b.w);
    grp.add(roof);
    // door & windows on front (+z)
    const dark = mat(0x111111);
    const lit = new THREE.MeshBasicMaterial({ color: progress >= 1 ? 0xb8b0a0 : 0x2b2b2b });
    grp.add(box(0.9, 1.9, 0.08, dark, b.id === 'macelleria' ? -1 : 0, 0.95, b.d / 2 + 0.01));
    if (b.id !== 'chiesa') {
      grp.add(box(1.0, 0.9, 0.06, lit, b.w / 2 - 0.9, 1.4, b.d / 2 + 0.02));
      grp.add(box(0.8, 0.8, 0.06, lit, -b.w / 2 + 0.8, b.h - 1.2, b.d / 2 + 0.02));
      grp.add(box(0.8, 0.8, 0.06, lit, b.w / 2 - 0.8, b.h - 1.2, b.d / 2 + 0.02));
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
            if (g.flag('placedRazor')) return g.say('map.barberDone');
            return g.go('barbiere');
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
    if (h) hotspots.push({ id: id + 'Label', obj: sp, tap: h.tap });
  }

  // street lamps (lit when it gets dark)
  for (const [x, z] of [[-3.5, -3], [3.5, -3], [-3.5, 4], [3.5, 4]]) {
    scene.add(cyl(0.05, 0.07, 3.2, mat(0x1a1a1a), x, 1.6, z, 8));
    const lampOn = progress >= 1;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: lampOn ? 0xfff1d0 : 0x666666 }));
    lamp.position.set(x, 3.25, z);
    lamp.userData.noPick = true;
    scene.add(lamp);
    if (lampOn) {
      const pl = new THREE.PointLight(0xfff1d0, 6, 9, 1.6);
      pl.position.set(x, 3.1, z);
      scene.add(pl);
    }
  }

  // a dark figure watching from far away, sometimes
  const watcher = new THREE.Group();
  watcher.add(cyl(0.18, 0.22, 1.2, mat(0x050505), 0, 0.9, 0, 10));
  watcher.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0x050505)));
  (watcher.children[1] as THREE.Mesh).position.y = 1.62;
  watcher.add(cyl(0.22, 0.22, 0.02, mat(0x050505), 0, 1.72, 0, 16));
  watcher.position.set(-1.8, 0, -9.5);
  watcher.visible = false;
  watcher.traverse((o) => (o.userData.noPick = true));
  scene.add(watcher);

  let tAcc = 0;
  return {
    id: 'map',
    nameKey: 'place.map',
    scene,
    drone: 'map',
    startView: 'top',
    views: {
      top: { pos: [0, 25, 19], look: [0, 0, -0.5], yaw: 14, pitch: 8, fov: 48 },
    },
    hotspots,
    update: (dt, time) => {
      scene.traverse((o) => {
        if (o.userData.spin) o.rotation.y += dt * 1.5;
      });
      tAcc += dt;
      // the watcher shows up for a few seconds every ~25 s, only after meeting the Merchant
      watcher.visible = !!g.flag('metMerchant') && tAcc % 25 > 21;
      void time;
    },
    enter: async () => {
      if (!g.flag('introMap')) {
        g.set('introMap');
        await g.say([
          { who: 'diego', key: 'map.intro1' },
          { who: 'diego', key: 'map.intro2' },
        ]);
      }
      if (g.flag('placedRazor') && !g.flag('demoEnd')) {
        g.set('demoEnd');
        await g.ui.cards(['end.1', 'end.2', 'end.3']);
      }
    },
    hint: () => {
      if (!g.flag('metMerchant')) return 'hint.map.emporio';
      if (!g.flag('fledButcher')) return 'hint.map.macelleria';
      if (!g.flag('razor')) return 'hint.map.barbiere';
      return 'hint.map.return';
    },
  };
}
