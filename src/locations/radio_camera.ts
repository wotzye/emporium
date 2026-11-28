import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, mat, cyl, canvasTex, liveCanvas } from '../builders';
import { t } from '../i18n';
import { wallpaper } from './ada_common';
import { radioHint } from './radio_negozio';
import { prop } from '../models';
import { sleep, ether } from './radio_common';

/**
 * Nello's room. His bed against the wall he shares with the Contis next door; on the wall, pencil
 * circles where he used to put his contact microphone. The dormer window has no handle.
 * Put the microphone from the cellar on the wall and slide it until the voices come clear; then
 * keep perfectly quiet (the phone's microphone) to hear them: every night at three the neighbours
 * hear him drag the bed, lift a creaking floorboard, put it back, and open the window. Under the
 * bed, a loose board: the window handle. Fit it, open the window, and out onto the roof.
 */
export function createRadioCamera(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.6, H = 2.4, D = 3.4;
  const woodDark = woodMaterial({ base: '#2d2218' });
  const woodMid = woodMaterial({ base: '#55422f' });
  scene.add(room(W, H, D, {
    wall: wallpaper('#8e897e', [2.2, 1.1]),
    floor: woodMaterial({ base: '#3a2d21', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#26201a', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const lampL = new THREE.PointLight(0xffd9a0, g.flag('rl.power') ? 1.8 : 0.5, 4, 1.6);
  lampL.position.set(-1.1, 1.3, -1.0);
  scene.add(lampL);
  // the dormer window (right wall): moonlight
  const winZ = 0.5;
  const moon = new THREE.SpotLight(0xa9b8c6, 5, 6, 0.6, 0.8, 1.3);
  moon.position.set(W / 2 + 0.3, 1.9, winZ);
  moon.target.position.set(-0.5, 0.3, 0);
  scene.add(moon, moon.target);
  const winOpen = () => !!g.flag('rl.window');
  scene.add(mesh(new THREE.PlaneGeometry(0.75, 1.1), new THREE.MeshBasicMaterial({ color: 0x1b2128 }), W / 2 - 0.012, 1.4, winZ, false).rotateY(-Math.PI / 2));
  const sash = new THREE.Group();
  sash.position.set(W / 2 - 0.03, 1.4, winZ - 0.37);
  const frameM = woodMaterial({ base: '#cfc8b8' });
  sash.add(rbox(0.04, 1.1, 0.04, 0.005, frameM, 0, 0, 0.0));
  sash.add(rbox(0.04, 1.1, 0.04, 0.005, frameM, 0, 0, 0.72));
  sash.add(rbox(0.04, 0.04, 0.76, 0.005, frameM, 0, 0.53, 0.36));
  sash.add(rbox(0.04, 0.04, 0.76, 0.005, frameM, 0, -0.53, 0.36));
  sash.add(rbox(0.03, 1.1, 0.03, 0.005, frameM, 0, 0, 0.36));
  sash.add(mesh(new THREE.PlaneGeometry(0.72, 1.06), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.1 }), 0, 0, 0.36, false).rotateY(-Math.PI / 2));
  // the square spindle where the handle should be, and the handle once fitted
  sash.add(rbox(0.03, 0.03, 0.03, 0.004, mat(0x7a7a76, { metalness: 0.9 }), -0.03, 0, 0.66));
  const handle = new THREE.Group();
  handle.add(cyl(0.02, 0.02, 0.03, mat(0xb8a878, { metalness: 0.9, roughness: 0.3 }), 0, 0, 0, 12).rotateZ(Math.PI / 2));
  handle.add(rbox(0.02, 0.12, 0.02, 0.006, mat(0xb8a878, { metalness: 0.9, roughness: 0.3 }), -0.02, -0.05, 0));
  handle.position.set(-0.05, 0, 0.66);
  handle.visible = winOpen();
  sash.add(handle);
  if (winOpen()) sash.rotation.y = -1.4;
  scene.add(sash);
  const motes = dust([-1.7, 0.2, -1.6], [1.7, 2.2, 1.6], 120);
  scene.add(motes.points);

  // ---------------- the bed, against the neighbours' wall (left) ----------------
  const bedX = -W / 2 + 0.55, bedZ = 0.55;
  const bedMoved = () => !!g.flag('rl.bedMoved');
  const bed = new THREE.Group();
  const bedModel = prop('bedC', { width: 0.95, grey: 0.8 });
  if (bedModel) bed.add(bedModel);
  else {
    bed.add(rbox(0.95, 0.45, 1.9, 0.03, woodDark, 0, 0.225, 0));
    bed.add(rbox(0.9, 0.1, 1.8, 0.04, mat(0x9a948a, { roughness: 1 }), 0, 0.5, 0));
    bed.add(rbox(0.95, 0.85, 0.06, 0.02, woodDark, 0, 0.42, -0.95));
    bed.add(rbox(0.5, 0.1, 0.3, 0.04, mat(0xc8c2b6, { roughness: 1 }), 0, 0.58, -0.7));
  }
  bed.position.set(bedX, 0, bedZ);
  if (bedMoved()) bed.position.x += 1.0;
  scene.add(bed);
  // the loose floorboard under it
  const boardZ = bedZ - 0.1;
  const board = rbox(0.16, 0.025, 0.8, 0.004, woodMaterial({ base: '#8a7458' }), bedX + 0.05, 0.012, boardZ);
  scene.add(board);
  const hole = mesh(new THREE.PlaneGeometry(0.14, 0.8), new THREE.MeshBasicMaterial({ color: 0x060504 }), bedX + 0.05, 0.004, boardZ, false);
  hole.rotation.x = -Math.PI / 2;
  hole.visible = false;
  scene.add(hole);
  // the little lamp on the nightstand lights the floor beside the bed
  const nightLamp = new THREE.PointLight(0xffd9a0, 2.2, 3, 1.4);
  nightLamp.position.set(bedX - 0.1, 0.95, bedZ - 0.75);
  scene.add(nightLamp);
  const loose = () => !!g.flag('rl.boardUp');
  const handleTaken = () => !!g.flag('rl.handle');
  const floorHandle = new THREE.Group();
  floorHandle.add(rbox(0.1, 0.02, 0.02, 0.006, mat(0xb8a878, { metalness: 0.9, roughness: 0.3 }), 0, 0.01, 0));
  floorHandle.add(cyl(0.018, 0.018, 0.025, mat(0xb8a878, { metalness: 0.9, roughness: 0.3 }), -0.05, 0.015, 0, 12));
  floorHandle.position.set(bedX + 0.05, 0.0, boardZ + 0.1);
  scene.add(floorHandle);
  const showBoard = () => {
    board.position.set(bedX + (loose() ? 0.3 : 0.05), loose() ? 0.03 : 0.012, boardZ);
    board.rotation.z = loose() ? 0.15 : 0;
    hole.visible = loose();
    floorHandle.visible = loose() && !handleTaken();
  };
  showBoard();

  // pencil circles on the wall, over the bed: where he listened. One is gone over again and again.
  const SPOT = new THREE.Vector2(-0.35, 1.32); // (z, y) on the left wall
  const marksTex = canvasTex(512, 300, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(30,26,22,0.75)';
    c.fillStyle = 'rgba(30,26,22,0.8)';
    c.lineWidth = 2;
    c.font = "16px 'Courier New', monospace";
    const toPx = (z: number, y: number) => [((z + 1.1) / 2.2) * w, ((1.9 - y) / 0.9) * h];
    const marks: [number, number, number, string][] = [[0.75, 1.55, 1, '3/4'], [0.2, 1.2, 1, '17/5'], [-0.85, 1.65, 1, '2/6'], [SPOT.x, SPOT.y, 6, '12/6 !!'], [0.55, 1.15, 1, '?']];
    for (const [z, y, n, lab] of marks) {
      const [x, yy] = toPx(z, y);
      for (let k = 0; k < n; k++) {
        c.beginPath();
        c.ellipse(x + (k % 2) * 2, yy - (k % 3), 22 + k * 1.5, 18 + k, 0.2 * k, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillText(lab, x + 26, yy - 20);
    }
  });
  const marks = mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshBasicMaterial({ map: marksTex, transparent: true, depthWrite: false }), -W / 2 + 0.012, 1.45, 0, false);
  marks.rotation.y = Math.PI / 2;
  marks.userData.noPick = true;
  scene.add(marks);

  // ---------------- the nightstand: his amplifier and headphones ----------------
  const nsX = -W / 2 + 0.3, nsZ = bedZ - 1.25;
  scene.add(rbox(0.45, 0.55, 0.4, 0.02, woodMid, nsX + 0.05, 0.275, nsZ));
  const amp = new THREE.Group();
  amp.add(rbox(0.28, 0.12, 0.2, 0.01, mat(0x3a3632, { metalness: 0.4 }), 0, 0.06, 0));
  const vu = liveCanvas(128, 64);
  const vuM = new THREE.MeshBasicMaterial({ map: vu.tex });
  amp.add(mesh(new THREE.PlaneGeometry(0.1, 0.05), vuM, -0.05, 0.065, 0.101, false));
  amp.add(cyl(0.015, 0.015, 0.02, mat(0x1a1612), 0.08, 0.06, 0.105, 12).rotateX(Math.PI / 2));
  amp.position.set(nsX + 0.05, 0.55, nsZ);
  amp.rotation.y = Math.PI / 2;
  scene.add(amp);
  const phones = new THREE.Group();
  phones.add(mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 16, Math.PI), mat(0x1a1a1a), 0, 0.07, 0));
  for (const s of [-1, 1]) phones.add(cyl(0.03, 0.03, 0.02, mat(0x2a2622), s * 0.07, 0.0, 0, 12).rotateZ(Math.PI / 2));
  phones.position.set(nsX + 0.08, 0.6, nsZ + 0.12);
  phones.rotation.set(-1.2, 0.4, 0);
  scene.add(phones);
  let level = 0;
  const drawVu = () => {
    const c = vu.ctx;
    c.fillStyle = '#d9cc9e';
    c.fillRect(0, 0, 128, 64);
    c.strokeStyle = '#2a2418';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(64, 70, 50, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    c.fillStyle = '#8e0710';
    c.fillRect(96, 22, 20, 4);
    const a = Math.PI * 1.2 + level * Math.PI * 0.6;
    c.strokeStyle = '#111';
    c.beginPath();
    c.moveTo(64, 66);
    c.lineTo(64 + Math.cos(a) * 54, 66 + Math.sin(a) * 54);
    c.stroke();
    vu.update();
  };
  drawVu();

  // the contact microphone, once it's on the wall, and its cable to the amplifier
  const micOn = () => !!g.flag('rl.micOn');
  const overheard = () => !!g.flag('rl.overheard');
  const mic = new THREE.Group();
  mic.add(cyl(0.03, 0.03, 0.015, mat(0x2a2a28, { metalness: 0.6 }), 0, 0, 0, 16).rotateZ(Math.PI / 2));
  mic.add(hitBox(0.08, 0.14, 0.14, 0.02, 0, 0, 'micGrip'));
  mic.position.set(-W / 2 + 0.02, 1.6, 0.6);
  if (overheard()) mic.position.set(-W / 2 + 0.02, SPOT.y, SPOT.x);
  mic.visible = micOn();
  scene.add(mic);
  const cable = new THREE.Mesh(new THREE.BufferGeometry(), mat(0x111111));
  cable.userData.noPick = true;
  scene.add(cable);
  const drawCable = () => {
    cable.visible = mic.visible;
    if (!mic.visible) return;
    const a = mic.position.clone().add(new THREE.Vector3(0.02, -0.02, 0));
    const b = amp.position.clone().add(new THREE.Vector3(0.12, 0.06, 0));
    const m = a.clone().lerp(b, 0.5);
    m.y = Math.min(a.y, b.y) - 0.15;
    cable.geometry.dispose();
    cable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, m, b]), 20, 0.004, 5, false);
  };
  drawCable();

  // ---------------- the desk: his station notebook and the listening log ----------------
  const dX = -0.1, dZ = -D / 2 + 0.35, dY = 0.75;
  scene.add(rbox(1.1, 0.04, 0.55, 0.01, woodMid, dX, dY, dZ));
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) scene.add(rbox(0.04, dY, 0.04, 0.005, woodMid, dX + x, dY / 2, dZ + z));
  const nb = new THREE.Group();
  nb.add(rbox(0.22, 0.02, 0.3, 0.004, mat(0x2a3a2a, { roughness: 0.8 }), 0, 0.01, 0));
  nb.add(textPlane([t('radio.notebookCover')], 0.18, 0.12, { bg: '#d9d3c4', size: 20, px: 96 }).rotateX(-Math.PI / 2).translateZ(0.021));
  nb.position.set(dX - 0.2, dY + 0.02, dZ + 0.05);
  nb.rotation.y = 0.2;
  scene.add(nb);
  const log = new THREE.Group();
  log.add(rbox(0.24, 0.025, 0.32, 0.004, mat(0x3a2a1c, { roughness: 0.8 }), 0, 0.012, 0));
  log.add(textPlane([t('radio.logCover')], 0.2, 0.12, { bg: '#d9d3c4', size: 20, px: 96 }).rotateX(-Math.PI / 2).translateZ(0.026));
  log.position.set(dX + 0.25, dY + 0.02, dZ + 0.05);
  log.rotation.y = -0.15;
  scene.add(log);
  // QSL cards from radio hams all over the world
  for (let i = 0; i < 6; i++) {
    const q = textPlane(['QSL', 'I1' + ['PSR', 'ABC', 'XYZ', 'RTV', 'MNO', 'KLB'][i]], 0.14, 0.09, { bg: i % 2 ? '#e0d8c4' : '#cfc6b0', size: 18, px: 64 });
    q.position.set(0.6 + (i % 3) * 0.17, 1.75 - Math.floor(i / 3) * 0.12, -D / 2 + 0.02);
    q.rotation.z = (i % 3 - 1) * 0.08;
    scene.add(q);
  }

  // ---------------- hotspots ----------------
  const hWall = hitBox(0.1, 0.9, 2.2, -W / 2 + 0.06, 1.45, 0, 'nwall');
  const hAmp = hitBox(0.4, 0.3, 0.45, nsX + 0.05, 0.65, nsZ, 'amp');
  const hNb = hitBox(0.3, 0.1, 0.36, dX - 0.2, dY + 0.04, dZ + 0.05, 'notebook');
  const hLog = hitBox(0.3, 0.1, 0.38, dX + 0.25, dY + 0.04, dZ + 0.05, 'log');
  const hQsl = hitBox(0.55, 0.3, 0.1, 0.77, 1.7, -D / 2 + 0.06, 'qsl');
  const hBed = hitBox(1.0, 0.65, 1.9, bedX, 0.32, bedZ, 'bed');
  if (bedMoved()) hBed.position.x += 1.0;
  const hBoard = hitBox(0.4, 0.15, 0.9, bedX + 0.15, 0.06, boardZ, 'board');
  const hWin = hitBox(0.3, 1.2, 0.85, W / 2 - 0.15, 1.4, winZ, 'window');
  const hOut = hitBox(1.0, 2.1, 0.2, 0.6, 1.05, D / 2 - 0.1, 'out');
  scene.add(hWall, hAmp, hNb, hLog, hQsl, hBed, hBoard, hWin, hOut);
  const say = (k: string) => g.say(k);

  // ---------------- listening through the wall ----------------
  let eth: ReturnType<typeof ether> | null = null;
  const clarity = () => {
    const d = Math.hypot(mic.position.z - SPOT.x, mic.position.y - SPOT.y);
    return Math.max(0, 1 - d / 0.6);
  };
  const listen = () => {
    if (!micOn() || overheard()) return;
    if (!eth) eth = ether(g.audio);
    const k = clarity();
    level = k;
    drawVu();
    eth.set(0.5 - k * 0.3, k * k);
  };
  const stopListen = () => {
    eth?.stop();
    eth = null;
  };
  const tryHere = async () => {
    if (clarity() < 0.8) return say(clarity() > 0.4 ? 'radio.micCloser' : 'radio.micFar');
    mic.position.set(-W / 2 + 0.02, SPOT.y, SPOT.x);
    drawCable();
    await say('radio.micHere');
    const ok = await g.physical('silence', 'radio.silenceText');
    if (!ok) return;
    g.set('rl.overheard');
    eth?.set(0.08, 0.6);
    g.audio.sfx('whisper');
    await g.say([
      { who: 'vicini', key: 'radio.nb1' },
      { who: 'vicini', key: 'radio.nb2' },
      { who: 'vicini', key: 'radio.nb3' },
      { who: 'vicini', key: 'radio.nb4' },
    ]);
    stopListen();
    level = 0;
    drawVu();
    await g.say([{ who: 'diego', key: 'radio.nbAfter1' }, { who: 'diego', key: 'radio.nbAfter2' }]);
    g.note('note.board');
  };
  const placeMic = async () => {
    g.deselect();
    g.take('contactmic');
    g.set('rl.micOn');
    mic.visible = true;
    drawCable();
    g.audio.sfx('click');
    await g.view('nwall');
    listen();
    return g.say([{ who: 'diego', key: 'radio.micOn1' }, { who: 'diego', key: 'radio.micOn2' }]);
  };

  const hotspots: Hotspot[] = [
    { id: 'nwall', obj: hWall, view: 'nwall', tap: async (item) => {
      if (item === 'contactmic') return placeMic();
      if (item) return g.nope();
      if (overheard()) return say('radio.wallAfter');
      if (micOn()) return tryHere();
      if (g.has('contactmic')) return placeMic();
      return g.say([{ who: 'diego', key: 'radio.wall1' }, { who: 'diego', key: 'radio.wall2' }]);
    } },
    { id: 'amp', obj: hAmp, view: 'nwall', tap: async (item) => {
      if (item === 'contactmic') return placeMic();
      if (item) return g.nope();
      if (overheard()) return say('radio.ampAfter');
      return say(micOn() ? 'radio.ampVu' : 'radio.amp');
    } },
    { id: 'notebook', obj: hNb, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      const read = await g.readDoc('radio.notebookTitle', 'radio.notebook');
      if (!g.flag('rl.alphabet')) {
        g.set('rl.alphabet');
        g.note('note.morse');
      }
      if (read && !g.flag('rl.morse')) {
        g.set('rl.morse');
        g.note('note.sk');
        await g.say([{ who: 'diego', key: 'radio.notebookAfter' }]);
      }
    } },
    { id: 'log', obj: hLog, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('radio.logTitle'), t('radio.log'), true);
      if (!g.flag('rl.logRead')) {
        g.set('rl.logRead');
        await say('radio.logAfter');
      }
    } },
    { id: 'qsl', obj: hQsl, view: 'desk', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.qsl');
    } },
    { id: 'board', obj: hBoard, view: 'bed', when: () => bedMoved() && !handleTaken(), tap: async (item) => {
      if (item) return g.nope();
      if (!loose()) {
        g.set('rl.boardUp');
        g.audio.sfx('creak');
        showBoard();
        floorHandle.visible = true;
        return say('radio.boardUp');
      }
      floorHandle.visible = false;
      g.set('rl.handle');
      g.give('winhandle');
      g.audio.sfx('pickup');
      return say('radio.handleTaken');
    } },
    { id: 'bed', obj: hBed, view: 'bed', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (bedMoved()) return say(handleTaken() ? 'radio.bedAfter' : loose() ? 'radio.boardSee' : 'radio.boardHint');
      if (!overheard()) return say('radio.bed');
      g.set('rl.bedMoved');
      g.audio.sfx('scrape');
      for (let i = 0; i <= 20; i++) {
        bed.position.x = bedX + (i / 20) * 1.0;
        await sleep(30);
      }
      hBed.position.x = bedX + 1.0;
      return say('radio.bedMoved');
    } },
    { id: 'window', exit: () => winOpen(), obj: hWin, view: 'window', tap: async (item) => {
      if (item && item !== 'winhandle') return g.nope();
      if (!winOpen()) {
        if (!g.has('winhandle')) return say(handleTaken() ? 'radio.windowFit' : 'radio.windowNoHandle');
        g.deselect();
        g.take('winhandle');
        handle.visible = true;
        g.audio.sfx('click');
        await sleep(300);
        g.set('rl.window');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          handle.rotation.x = (i / 20) * 1.5;
          sash.rotation.y = -(i / 20) * 1.4;
          await sleep(25);
        }
        return say('radio.windowOpen');
      }
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('radio_terrazzo');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(8, 0.4, false);
      return g.go('radio_negozio');
    } },
  ];

  const interactions: Interaction[] = [
    {
      kind: 'drag',
      obj: mic,
      plane: new THREE.Plane(new THREE.Vector3(1, 0, 0), W / 2 - 0.02),
      when: () => micOn() && !overheard() && g.viewName === 'nwall',
      onStart: () => g.audio.sfx('scrape'),
      onMove: () => {
        mic.position.x = -W / 2 + 0.02;
        mic.position.y = THREE.MathUtils.clamp(mic.position.y, 1.05, 1.85);
        mic.position.z = THREE.MathUtils.clamp(mic.position.z, -1.05, 1.05);
        drawCable();
        listen();
      },
      onEnd: async () => {
        drawCable();
        listen();
        return tryHere();
      },
    },
  ];

  return {
    id: 'radio_camera',
    nameKey: 'place.radioCamera',
    next: ['radio_negozio', 'radio_terrazzo'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'radio_negozio',
    views: {
      main: { pos: [0.6, 1.6, 1.3], look: [-0.5, 1.1, -1.0], yaw: 65, pitch: 18 },
      nwall: { pos: [0.3, 1.45, 0.1], look: [-W / 2, 1.35, -0.1], parent: 'main', yaw: 20, pitch: 12, fov: 60 },
      desk: { pos: [dX + 0.1, 1.45, dZ + 0.75], look: [dX, dY + 0.05, dZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      bed: { pos: [-0.5, 1.85, 1.35], look: [bedX + 0.1, 0.1, boardZ - 0.1], parent: 'main', yaw: 15, pitch: 12, fov: 62 },
      window: { pos: [0.4, 1.5, winZ], look: [W / 2, 1.4, winZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    interactions,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('rl.roomEntered')) {
        g.set('rl.roomEntered');
        await sleep(300);
        g.audio.sfx('whisper');
        await g.say([{ who: 'diego', key: 'radio.roomEnter1' }, { who: 'diego', key: 'radio.roomEnter2' }]);
      }
    },
    leave: () => stopListen(),
    hint: () => radioHint(g),
    debug: { mic, SPOT, tryHere, placeMic },
  };
}
