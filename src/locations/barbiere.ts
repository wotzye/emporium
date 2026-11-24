import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, wallTex, tileTex, textPlane, hitBox, canvasTex, noise, bulb, cursedMat } from '../builders';
import { t } from '../i18n';

/** Chair facing: 0 = mirror, 1 = left wall, 2 = door, 3 = right wall. */
const CHAIR_TARGET = [2, 0, 1];
const CHAIR_START = [3, 3, 3];

export function createBarbiere(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3.5, 9);
  const W = 6, H = 3, D = 5;
  scene.add(room(W, H, D, {
    wall: mat(0xffffff, { map: wallTex('#8a857b', [3, 1], true) }),
    floor: mat(0xffffff, { map: tileTex('#e2e0da', '#2b2a28', 10, [3, 3]) }),
    ceil: mat(0x252321),
  }));

  // ---------------- light ----------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const streetLight = new THREE.SpotLight(0xdfe6ee, 4, 9, 0.7, 0.8, 1.2);
  streetLight.position.set(0.5, 2.4, 2.4);
  streetLight.target.position.set(0, 0.6, -2);
  scene.add(streetLight, streetLight.target);
  const lamp = bulb(0, 2.55, -0.7, 0, 1.2, 8);
  scene.add(lamp.group);
  const lampGlass = lamp.glass.material as THREE.MeshBasicMaterial;
  const setLights = (on: number) => {
    lamp.spot.intensity = 16 * on;
    lamp.fill.intensity = 2 * on;
    lampGlass.color.setScalar(on > 0.3 ? 1 : 0.15);
  };
  let lightLevel = g.flag('b.lights') ? 1 : 0;
  setLights(lightLevel);

  const wood = mat(0x4a3a2a);
  const enamel = mat(0xe5e2da, { roughness: 0.5 });
  const chrome = mat(0xc8c8c8, { metalness: 0.35, roughness: 0.3 });
  const leather = mat(0x2a2522, { roughness: 0.6 });

  // ---------------- counter under the mirror ----------------
  scene.add(box(4.6, 0.9, 0.45, enamel, 0, 0.45, -2.27));
  scene.add(box(4.6, 0.04, 0.5, mat(0x3a3a3a), 0, 0.92, -2.27));
  // drawer
  const drawer = box(0.55, 0.18, 0.4, wood, -0.72, 0.72, -2.27);
  scene.add(drawer);
  scene.add(box(0.12, 0.03, 0.03, chrome, -0.72, 0.72, -2.05));
  const drawerKnob = scene.children[scene.children.length - 1];
  if (g.flag('b.drawer')) {
    drawer.position.z += 0.3;
    drawerKnob.position.z += 0.3;
  }
  // combs, jars, brushes
  for (let i = 0; i < 5; i++) scene.add(cyl(0.035, 0.04, 0.16, mat(0x6a6a6a + i * 0x111111, { roughness: 0.3 }), -0.4 + i * 0.16, 1.02, -2.35, 10));
  scene.add(box(0.2, 0.01, 0.04, mat(0x111111), 0.6, 0.95, -2.2));
  scene.add(box(0.2, 0.01, 0.04, mat(0x111111), 0.62, 0.96, -2.14));
  // towel steamer
  const steamer = new THREE.Group();
  steamer.add(cyl(0.16, 0.16, 0.42, chrome, 0, 0.21, 0, 20));
  steamer.add(sphere(0.16, chrome, 0, 0.42, 0, 20));
  steamer.add(box(0.06, 0.06, 0.06, mat(0x111111), 0, 0.15, 0.16));
  steamer.position.set(1.65, 0.94, -2.25);
  scene.add(steamer);

  // ---------------- mirror ----------------
  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = 1024;
  mirrorCanvas.height = 256;
  const mirrorTex = new THREE.CanvasTexture(mirrorCanvas);
  mirrorTex.colorSpace = THREE.SRGBColorSpace;
  let fog = g.flag('b.steam') ? 1 : 0;
  let showWord = !!g.flag('b.reflect');
  let ghost = 0;
  const base = document.createElement('canvas');
  base.width = 1024;
  base.height = 256;
  {
    const c = base.getContext('2d')!;
    const gr = c.createLinearGradient(0, 0, 1024, 256);
    gr.addColorStop(0, '#5d6266');
    gr.addColorStop(0.4, '#8a8f93');
    gr.addColorStop(0.55, '#6c7175');
    gr.addColorStop(1, '#4a4e52');
    c.fillStyle = gr;
    c.fillRect(0, 0, 1024, 256);
    // the "reflection": a darker room, a lamp, chair backs
    c.fillStyle = 'rgba(20,20,20,0.35)';
    for (const x of [200, 512, 824]) c.fillRect(x - 60, 150, 120, 106);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath();
    c.arc(512, 40, 30, 0, Math.PI * 2);
    c.fill();
    // silvering decay at the edges
    for (let i = 0; i < 80; i++) {
      c.fillStyle = `rgba(10,10,10,${Math.random() * 0.4})`;
      const edge = Math.random() < 0.5;
      c.beginPath();
      c.arc(edge ? Math.random() * 60 : 1024 - Math.random() * 60, Math.random() * 256, 4 + Math.random() * 14, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, 1024, 256, 9000, 0.12);
  }
  const fogNoise = document.createElement('canvas');
  fogNoise.width = 1024;
  fogNoise.height = 256;
  {
    const c = fogNoise.getContext('2d')!;
    c.fillStyle = 'rgb(225,228,230)';
    c.fillRect(0, 0, 1024, 256);
    noise(c, 1024, 256, 14000, 0.18);
  }
  const drawMirror = () => {
    const c = mirrorCanvas.getContext('2d')!;
    c.drawImage(base, 0, 0);
    if (ghost > 0) {
      // the barber, old, standing behind you in the reflection
      c.save();
      c.globalAlpha = ghost;
      const gx = 380, gy = 40;
      const gr = c.createRadialGradient(gx, gy + 50, 5, gx, gy + 50, 80);
      gr.addColorStop(0, '#e6e2da');
      gr.addColorStop(1, 'rgba(230,226,218,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(gx, gy + 50, 42, 56, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#000';
      c.beginPath();
      c.ellipse(gx - 15, gy + 42, 9, 7, 0, 0, Math.PI * 2);
      c.ellipse(gx + 15, gy + 42, 9, 7, 0, 0, Math.PI * 2);
      c.ellipse(gx, gy + 82, 12, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d8d4cc';
      c.fillRect(gx - 50, gy + 105, 100, 120);
      c.restore();
    }
    if (fog > 0) {
      c.save();
      c.globalAlpha = fog * 0.85;
      c.drawImage(fogNoise, 0, 0);
      c.restore();
      if (fog > 0.6) {
        // words traced with a finger: the fog is wiped away along the letters
        c.save();
        c.globalAlpha = Math.min(1, (fog - 0.6) / 0.3);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = 'rgba(70,74,78,0.95)';
        c.font = "bold 50px 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(t('bar.mirror1'), 512, 90, 960);
        c.fillText(t('bar.mirror2'), 512, 165, 960);
        c.restore();
      }
    }
    if (showWord) {
      c.save();
      c.font = "bold 70px 'American Typewriter', 'Courier New', monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(15,15,15,0.85)';
      c.fillText(t('bar.lockWord').split('').join(' '), 820, 215);
      c.restore();
    }
    mirrorTex.needsUpdate = true;
  };
  drawMirror();
  const mirror = mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: mirrorTex, roughness: 0.25, metalness: 0.1, emissive: 0xffffff, emissiveMap: mirrorTex, emissiveIntensity: 0.06 }), 0, 1.6, -2.455);
  mirror.castShadow = false;
  scene.add(mirror);
  scene.add(box(4.35, 1.2, 0.03, wood, 0, 1.6, -2.495));

  // steam particles
  const steamTex = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.noPick = true;
    s.userData.phase = Math.random();
    s.position.set(1.65, 1.4, -2.2);
    scene.add(s);
    puffs.push(s);
  }
  let steaming = 0;

  // ---------------- chairs ----------------
  const chairState: number[] = (g.flag('b.chairState') as string | undefined)?.split(',').map(Number) ?? [...CHAIR_START];
  const chairs: THREE.Group[] = [];
  const footrests: THREE.Mesh[] = [];
  [-1.45, 0, 1.45].forEach((x, i) => {
    const c = new THREE.Group();
    c.add(cyl(0.28, 0.32, 0.06, chrome, 0, 0.03, 0, 20));
    c.add(cyl(0.07, 0.07, 0.4, chrome, 0, 0.25, 0, 10));
    c.add(box(0.6, 0.14, 0.55, leather, 0, 0.5, 0));
    c.add(box(0.6, 0.75, 0.12, leather, 0, 0.95, 0.27));
    c.add(box(0.5, 0.2, 0.1, leather, 0, 1.42, 0.3));
    c.add(box(0.08, 0.08, 0.5, chrome, -0.32, 0.72, 0));
    c.add(box(0.08, 0.08, 0.5, chrome, 0.32, 0.72, 0));
    const foot = box(0.42, 0.04, 0.2, chrome, 0, 0.22, -0.38);
    c.add(foot);
    footrests.push(foot);
    c.position.set(x, 0, -1.35);
    c.rotation.y = chairState[i] * (Math.PI / 2);
    c.userData.passThrough = true;
    scene.add(c);
    chairs.push(c);
  });
  if (g.flag('b.chairs')) footrests[1].rotation.x = -0.6;

  // ---------------- left wall: fuse box, cabinet ----------------
  scene.add(box(0.1, 0.55, 0.42, mat(0x3c3c3c, { metalness: 0.4 }), -2.95, 1.65, 0.9));
  const fuseLabel = textPlane(['⚡'], 0.2, 0.2, { bg: '#e8e2d0', size: 70, px: 64 });
  fuseLabel.position.set(-2.89, 1.85, 0.9);
  fuseLabel.rotation.y = Math.PI / 2;
  scene.add(fuseLabel);
  scene.add(box(0.4, 0.95, 0.75, wood, -2.8, 1.55, -1.0));
  const cabDoorPivot = new THREE.Group();
  cabDoorPivot.position.set(-2.59, 1.55, -1.37);
  cabDoorPivot.add(box(0.03, 0.9, 0.72, mat(0x5a4632), 0, 0, 0.36));
  cabDoorPivot.add(sphere(0.025, chrome, 0.03, 0, 0.66, 8));
  scene.add(cabDoorPivot);
  if (g.flag('b.cabinet')) cabDoorPivot.rotation.y = -1.6;
  // the case inside the cabinet
  const caseMesh = box(0.12, 0.06, 0.3, mat(0x3a2a1e), -2.75, 1.35, -1.0);
  caseMesh.visible = !!g.flag('b.cabinet') && !g.has('case') && !g.flag('razor');
  scene.add(caseMesh);

  // ---------------- right wall: price list, till ----------------
  const prices = textPlane([t('bar.priceTitle'), t('bar.price1'), t('bar.price2'), t('bar.price3'), t('bar.price4'), t('bar.price5')], 1.0, 1.1, { bg: '#1c1a18', fg: '#efe9dc', size: 30, px: 320, border: '#8d8576', align: 'left' });
  prices.position.set(2.98, 1.75, 0.3);
  prices.rotation.y = -Math.PI / 2;
  scene.add(prices);
  scene.add(box(0.6, 0.85, 0.7, wood, 2.65, 0.425, -1.25));
  const till = new THREE.Group();
  till.add(box(0.42, 0.24, 0.4, mat(0x4b4b4b, { metalness: 0.7, roughness: 0.35 }), 0, 0.12, 0));
  const tillTop = box(0.42, 0.14, 0.18, mat(0x4b4b4b, { metalness: 0.7, roughness: 0.35 }), 0, 0.3, 0.1);
  tillTop.rotation.x = -0.5;
  till.add(tillTop);
  const tillDrawer = box(0.38, 0.08, 0.36, mat(0x333333), 0, 0.03, 0);
  till.add(tillDrawer);
  till.position.set(2.62, 0.86, -1.25);
  till.rotation.y = -Math.PI / 2;
  scene.add(till);
  if (g.flag('b.till')) tillDrawer.position.z += 0.2;
  // old calendar: October 1974
  const cal = textPlane([t('bar.calendar1'), t('bar.calendar2')], 0.42, 0.55, { bg: '#e6e0d0', size: 38, px: 192 });
  cal.position.set(2.98, 1.7, -1.3);
  cal.rotation.y = -Math.PI / 2;
  scene.add(cal);

  // door
  scene.add(box(1.0, 2.1, 0.06, mat(0x1a1816), 0.5, 1.05, D / 2 - 0.04));

  // ---------------- hotspots ----------------
  const hFuse = hitBox(0.3, 0.7, 0.6, -2.9, 1.65, 0.9, 'fuse');
  const hDrawer = hitBox(0.7, 0.45, 0.6, -0.72, 0.72, -2.0, 'drawer');
  const hSteamer = hitBox(0.5, 0.7, 0.5, 1.65, 1.2, -2.2, 'steamer');
  const hMirror = hitBox(4.2, 1.1, 0.1, 0, 1.6, -2.45, 'mirror');
  const hPrices = hitBox(0.1, 1.2, 1.1, 2.95, 1.75, 0.3, 'prices');
  const hTill = hitBox(0.6, 0.5, 0.6, 2.62, 1.05, -1.25, 'till');
  const hCabinet = hitBox(0.6, 1.0, 0.85, -2.7, 1.55, -1.0, 'cabinet');
  const hCalendar = hitBox(0.1, 0.6, 0.5, 2.95, 1.7, -1.3, 'calendar');
  const hChairs = [-1.45, 0, 1.45].map((x, i) => hitBox(0.7, 1.4, 0.7, x, 0.7, -1.35, 'chair' + i));
  scene.add(hFuse, hDrawer, hSteamer, hMirror, hPrices, hTill, hCabinet, hCalendar, ...hChairs);

  const lit = () => !!g.flag('b.lights');

  const lightsOn = async () => {
    g.audio.sfx('switch');
    for (const v of [0.6, 0, 0.9, 0.1, 1]) {
      setLights(v);
      await sleep(120 + Math.random() * 120);
    }
    lightLevel = 1;
    g.set('b.lights');
  };

  const runSteam = async () => {
    g.audio.sfx('steam');
    steaming = 1;
    await g.view('mirror');
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 3200, 1);
        fog = k;
        drawMirror();
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    steaming = 0;
    g.set('b.steam');
    g.note('note.mirror');
    await g.say([{ who: 'diego', key: 'bar.mirrorRead' }, { who: 'diego', key: 'bar.mirrorThink' }]);
  };

  const finale = async () => {
    // the razor is out of its case: the barber wants it back
    await g.view('mirror', 1.2);
    g.audio.hush(6);
    g.audio.sfx('heart');
    for (let i = 0; i <= 30; i++) {
      ghost = i / 30;
      drawMirror();
      await sleep(60);
    }
    g.setFlicker(true, 0.8);
    await g.say([{ who: 'narr', key: 'bar.ghost1' }]);
    await g.scare('barber');
    setLights(0);
    ghost = 0;
    drawMirror();
    g.setFlicker(false);
    await sleep(500);
    await g.say([{ who: 'diego', key: 'bar.after1' }, { who: 'diego', key: 'bar.after2' }]);
    setLights(0.35);
    g.set('razor');
    g.rebuild('map');
  };

  const openCase = async () => {
    const word = t('bar.lockWord');
    g.audio.sfx('click');
    const ok = await g.ui.letterLock(t('bar.caseLock'), word.length, (w) => w === word, () => g.audio.sfx('click'));
    if (!ok) return;
    g.audio.sfx('unlock');
    g.take('case');
    g.give('razor');
    await g.say([{ who: 'diego', key: 'bar.razor1' }, { who: 'narr', key: 'bar.razor2' }]);
    await finale();
  };

  g.examiners.case = async () => {
    await g.say([{ who: 'diego', key: 'bar.case1' }, { who: 'diego', key: 'bar.case2' }]);
    await openCase();
  };
  g.examiners.photo = async () => {
    g.audio.sfx('paper');
    await g.ui.picture(t('bar.photoTitle'), photoDataUrl(), t('bar.photoBack'));
  };

  const chairTap = async (i: number) => {
    if (g.flag('b.chairs')) return g.say('bar.chairsDone');
    chairState[i] = (chairState[i] + 1) % 4;
    g.set('b.chairState', chairState.join(','));
    g.audio.sfx('creak');
    const from = chairs[i].rotation.y;
    const to = from + Math.PI / 2;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 350, 1);
        chairs[i].rotation.y = from + (to - from) * (1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    if (chairState.every((v, j) => v === CHAIR_TARGET[j])) {
      await sleep(300);
      g.audio.sfx('unlock');
      footrests[1].rotation.x = -0.6;
      g.set('b.chairs');
      await g.say([{ who: 'narr', key: 'bar.chairsOpen' }]);
      g.give('key');
    }
  };

  const hotspots: Hotspot[] = [
    { id: 'fuse', obj: hFuse, view: 'fuse', tap: async (item) => {
      if (lit()) return item ? g.nope() : g.say('bar.fuseOk');
      if (item === 'fuse') {
        g.take('fuse');
        await lightsOn();
        await g.say([{ who: 'diego', key: 'bar.lightOn' }]);
        await g.view('main');
        return;
      }
      if (item) return g.nope();
      await g.say('bar.fuseMissing');
    } },
    { id: 'drawer', obj: hDrawer, view: 'drawer', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('b.drawer')) {
        g.audio.sfx('drawer');
        drawer.position.z += 0.3;
        drawerKnob.position.z += 0.3;
        g.set('b.drawer');
        await g.say('bar.drawer');
        g.give('fuse');
      } else await g.say('bar.drawerEmpty');
    } },
    { id: 'steamer', obj: hSteamer, view: 'steamer', tap: async (item) => {
      if (item) return g.nope();
      if (!lit()) return g.say('bar.noPower');
      if (!g.flag('b.steam')) return runSteam();
      await g.say('bar.steamDone');
    } },
    { id: 'mirror', obj: hMirror, view: 'mirror', tap: async (item) => {
      if (item === 'case') {
        g.deselect();
        showWord = true;
        drawMirror();
        g.set('b.reflect');
        g.note('note.caseWord');
        await g.say([{ who: 'diego', key: 'bar.reflect' }]);
        return;
      }
      if (item) return g.nope();
      if (g.flag('b.steam')) return g.say([{ who: 'diego', key: 'bar.mirrorRead' }]);
      await g.say(lit() ? 'bar.mirrorLit' : 'bar.mirrorDark');
    } },
    { id: 'prices', obj: hPrices, view: 'prices', tap: async (item) => {
      if (item) return g.nope();
      if (!lit()) return g.say('bar.tooDark');
      g.audio.sfx('paper');
      await g.ui.doc(t('bar.priceTitle'), [t('bar.price1'), t('bar.price2'), t('bar.price3'), t('bar.price4'), t('bar.price5')].join('\n'));
      g.note('note.prices');
    } },
    { id: 'till', obj: hTill, view: 'till', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('b.till')) return g.say('bar.tillEmpty');
      if (!lit()) return g.say('bar.tooDark');
      const ok = await g.ui.keypad(t('bar.tillTitle'), 3, (c) => c === '850', () => g.audio.sfx('click'));
      if (!ok) return;
      g.audio.sfx('bell');
      tillDrawer.position.z += 0.2;
      g.set('b.till');
      await g.say([{ who: 'narr', key: 'bar.tillOpen' }]);
      g.give('photo');
      g.diaryPage('lisa2');
      g.note('note.receipt');
      await g.say([{ who: 'diego', key: 'bar.tillPage' }]);
    } },
    { id: 'cabinet', obj: hCabinet, view: 'cabinet', tap: async (item) => {
      if (g.flag('b.cabinet')) {
        if (item) return g.nope();
        if (caseMesh.visible) {
          caseMesh.visible = false;
          g.give('case');
          return g.say('bar.caseFound');
        }
        return g.say('bar.cabinetEmpty');
      }
      if (item === 'key') {
        g.take('key');
        g.audio.sfx('unlock');
        g.set('b.cabinet');
        const t0 = performance.now();
        await new Promise<void>((res) => {
          const step = () => {
            const k = Math.min((performance.now() - t0) / 600, 1);
            cabDoorPivot.rotation.y = -1.6 * k;
            if (k < 1) requestAnimationFrame(step);
            else res();
          };
          step();
        });
        caseMesh.visible = true;
        await g.say('bar.cabinetOpen');
        return;
      }
      if (item) return g.nope();
      await g.say('bar.cabinetLocked');
    } },
    { id: 'calendar', obj: hCalendar, tap: async (item) => {
      if (item) return g.nope();
      await g.say('bar.calendar');
    } },
    ...hChairs.map((h, i) => ({
      id: 'chair' + i,
      obj: h,
      view: 'chairs',
      lowPriority: true,
      tap: async (item: string | null) => {
        if (item) return g.nope();
        if (!lit()) return g.say('bar.tooDark');
        await chairTap(i);
      },
    })),
  ];

  return {
    id: 'barbiere',
    nameKey: 'place.barbiere',
    scene,
    drone: 'barbiere',
    startView: 'main',
    views: {
      main: { pos: [0, 1.6, 2.0], look: [0, 1.2, -2.5], yaw: 45, pitch: 14 },
      mirror: { pos: [0, 2.0, -0.1], look: [0, 1.5, -2.5], parent: 'main', yaw: 25, pitch: 10 },
      drawer: { pos: [-0.72, 1.4, -0.75], look: [-0.72, 0.75, -2.3], parent: 'main', yaw: 15, pitch: 8 },
      steamer: { pos: [0.72, 1.75, -0.95], look: [1.65, 1.15, -2.25], parent: 'main', yaw: 15, pitch: 8 },
      chairs: { pos: [0, 2.7, 0.9], look: [0, 0.3, -1.4], parent: 'main', yaw: 20, pitch: 8 },
      fuse: { pos: [-1.7, 1.6, 0.9], look: [-3, 1.6, 0.9], parent: 'main', yaw: 15, pitch: 8 },
      cabinet: { pos: [-1.4, 1.55, -0.6], look: [-3, 1.45, -1.0], parent: 'main', yaw: 15, pitch: 10 },
      prices: { pos: [1.7, 1.7, 0.3], look: [3, 1.7, 0.3], parent: 'main', yaw: 15, pitch: 8 },
      till: { pos: [1.5, 1.65, -0.5], look: [2.65, 1.0, -1.25], parent: 'main', yaw: 15, pitch: 8 },
    },
    hotspots,
    update: (dt, time) => {
      puffs.forEach((p) => {
        const ph = (p.userData.phase + time * 0.35) % 1;
        p.position.set(1.65 + Math.sin(ph * 9 + p.userData.phase * 6) * 0.12 - ph * 0.6, 1.4 + ph * 1.2, -2.2 + ph * 0.1);
        p.scale.setScalar(0.15 + ph * 0.6);
        (p.material as THREE.SpriteMaterial).opacity = steaming * (1 - ph) * 0.5;
      });
      void dt;
      void lightLevel;
    },
    enter: async () => {
      g.audio.sfx('bell');
      if (!g.flag('b.entered')) {
        g.set('b.entered');
        await sleep(500);
        await g.say([{ who: 'diego', key: 'bar.enter1' }, { who: 'diego', key: 'bar.enter2' }]);
      }
    },
    hint: () => {
      if (!lit()) return g.has('fuse') ? 'hint.bar.useFuse' : 'hint.bar.fuse';
      if (!g.flag('b.steam')) return 'hint.bar.steam';
      if (!g.flag('b.till')) return 'hint.bar.till';
      if (!g.flag('b.chairs')) return 'hint.bar.chairs';
      if (!g.flag('b.cabinet')) return 'hint.bar.cabinet';
      if (!g.flag('razor')) return 'hint.bar.case';
      return 'hint.bar.leave';
    },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let photoUrl = '';
/** The photo found in the till: the shop seen from the loft, the day *he* arrived. Shows the chairs' facing. */
function photoDataUrl() {
  if (photoUrl) return photoUrl;
  const cv = document.createElement('canvas');
  cv.width = 600;
  cv.height = 420;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#9a958b';
  c.fillRect(0, 0, 600, 420);
  // floor tiles in perspective-free top view
  for (let x = 0; x < 600; x += 40)
    for (let y = 80; y < 420; y += 40) {
      c.fillStyle = (x / 40 + y / 40) % 2 ? '#c9c5bc' : '#57544e';
      c.fillRect(x, y, 40, 40);
    }
  // mirror wall on top
  c.fillStyle = '#2a2826';
  c.fillRect(0, 0, 600, 80);
  c.fillStyle = '#b8bcbf';
  c.fillRect(80, 12, 440, 50);
  c.fillStyle = '#e9e4d6';
  c.font = "18px 'American Typewriter', 'Courier New', monospace";
  c.textAlign = 'center';
  c.fillText(t('bar.photoMirror'), 300, 44);
  // door at the bottom
  c.fillStyle = '#1d1b19';
  c.fillRect(310, 400, 110, 20);
  // chairs from above: seat + backrest; backrest is opposite to where the chair faces
  const dirs = CHAIR_TARGET;
  [150, 300, 450].forEach((x, i) => {
    c.save();
    c.translate(x, 230);
    c.rotate((-dirs[i] * Math.PI) / 2);
    c.fillStyle = '#1a1816';
    c.fillRect(-38, -34, 76, 68);
    c.fillStyle = '#0c0b0a';
    c.fillRect(-40, 26, 80, 20); // backrest (towards +y = away from where it faces)
    c.fillStyle = '#9c9c9c';
    c.fillRect(-26, -54, 52, 12); // footrest, in front
    c.restore();
  });
  // a dark figure near the door
  c.fillStyle = 'rgba(0,0,0,0.85)';
  c.beginPath();
  c.arc(470, 372, 22, 0, Math.PI * 2);
  c.fill();
  c.fillRect(440, 352, 60, 8);
  // age
  for (let i = 0; i < 9000; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.12})`;
    c.fillRect(Math.random() * 600, Math.random() * 420, 2, 2);
  }
  const gr = c.createRadialGradient(300, 210, 120, 300, 210, 380);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = gr;
  c.fillRect(0, 0, 600, 420);
  photoUrl = cv.toDataURL('image/jpeg', 0.85);
  return photoUrl;
}
