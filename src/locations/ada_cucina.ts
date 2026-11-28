import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, cyl, mat, mesh, rbox, lathe, dust, fx, textPlane, hitBox, bulb, lightCone, canvasTex, noise, woodMaterial, plasterMaterial, tileMaterial, liveCanvas } from '../builders';
import { t } from '../i18n';
import { wallpaper, doilyTex, sleep } from './ada_common';

/**
 * Ada's kitchen. Every evening she laid the table for two, as in their photo:
 * he by the window, she by the stove, the teapot between them. Lay it again, and he sits down.
 */
export function createAdaCucina(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3.5, 9);
  scene.userData.envIntensity = 0.08;
  const W = 4, H = 2.6, D = 3.6;
  const rm = room(W, H, D, {
    wall: wallpaper('#c2bcae', [2.5, 1.3]),
    floor: tileMaterial({ a: '#a7a196', b: '#56524b', n: 8, repeat: [3, 3], grout: '#2b2925', grime: 0.8, rough: 0.45 }),
    ceil: plasterMaterial({ base: '#4c4842', repeat: [2, 2], damp: 1 }),
  });
  scene.add(rm);
  const woodDark = woodMaterial({ base: '#2f2418' });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.25, metalness: 1 });

  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const lamp = bulb(0.0, 2.15, -0.2, 8, 1.1, 6);
  scene.add(lamp.group);
  scene.add(lightCone(0.0, 2.13, -0.2, 2.1, 1.0, 0.03));
  const motes = dust([-1.9, 0.2, -1.7], [1.9, 2.4, 1.7], 120);
  scene.add(motes.points);

  // ---------------- the window (his side) ----------------
  const winZ = -0.2;
  const winCv = liveCanvas(256, 320);
  const drawWindow = (fog: number, writing: number) => {
    const c = winCv.ctx;
    const gr = c.createLinearGradient(0, 0, 0, 320);
    gr.addColorStop(0, '#3e454c');
    gr.addColorStop(1, '#15181b');
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 320);
    // bare branches outside
    c.strokeStyle = '#0a0b0c';
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(20 + i * 45, 320);
      c.quadraticCurveTo(60 + i * 30, 150, 10 + i * 50, 20);
      c.stroke();
    }
    if (fog > 0) {
      c.fillStyle = `rgba(225,225,220,${0.88 * fog})`;
      c.fillRect(0, 0, 256, 320);
      if (writing > 0) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.globalAlpha = writing;
        // written with a fingertip: thick, wobbly strokes, one word per pane so the glazing bars don't cut them
        c.font = "bold 46px 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 4;
        c.lineJoin = 'round';
        c.strokeStyle = '#000';
        for (const [txt, y] of [[t('ada.fog1'), 92], [t('ada.fog2'), 238]] as const) {
          c.save();
          c.translate(128, y);
          c.rotate(y < 160 ? -0.06 : 0.04);
          const sc = Math.min(1, 220 / c.measureText(txt).width);
          c.scale(sc, 1);
          c.strokeText(txt, 0, 0);
          c.fillText(txt, 0, 0);
          c.restore();
        }
        // drips running down from the letters
        c.lineWidth = 3;
        for (let i = 0; i < 9; i++) {
          const x = 40 + ((i * 53) % 180), y0 = i % 2 ? 110 : 256;
          c.beginPath();
          c.moveTo(x, y0);
          c.lineTo(x + 2, y0 + 25 + ((i * 17) % 30));
          c.stroke();
        }
        c.restore();
      }
    }
    winCv.update();
  };
  const kettleDone = () => !!g.flag('a.kettle');
  drawWindow(kettleDone() ? 1 : 0, kettleDone() ? 1 : 0);
  const winMesh = mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshStandardMaterial({ map: winCv.tex, roughness: 0.2, emissive: 0xffffff, emissiveMap: winCv.tex, emissiveIntensity: 0.35 }), -W / 2 + 0.02, 1.5, winZ, false);
  winMesh.rotation.y = Math.PI / 2;
  scene.add(winMesh);
  for (const [dy, dz, w, h] of [[0, -0.47, 0.06, 1.2], [0, 0.47, 0.06, 1.2], [0.57, 0, 1.0, 0.06], [-0.57, 0, 1.0, 0.06], [0, 0, 0.03, 1.1], [0, 0, 0.9, 0.03]] as const)
    scene.add(rbox(0.05, h, w, 0.01, enamel, -W / 2 + 0.04, 1.5 + dy, winZ + dz));
  const moon = new THREE.SpotLight(0xb8c4d0, 4, 5, 0.5, 0.8, 1.3);
  moon.position.set(-W / 2 - 0.5, 2.2, winZ);
  moon.target.position.set(-0.3, 0.7, winZ);
  scene.add(moon, moon.target);
  // curtains
  for (const dz of [-0.62, 0.62]) {
    const cur = mesh(new THREE.PlaneGeometry(0.35, 1.5, 6, 1), new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95, side: THREE.DoubleSide }), -W / 2 + 0.1, 1.45, winZ + dz, false);
    const pos = cur.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 40) * 0.03);
    cur.geometry.computeVertexNormals();
    cur.rotation.y = Math.PI / 2;
    scene.add(cur);
  }

  // ---------------- the stove (her side) and the kettle ----------------
  const stove = prop('stove', { height: 0.9, turn: -Math.PI / 2 });
  if (stove) {
    stove.position.set(W / 2 - 0.35, 0, winZ);
    scene.add(stove);
  } else scene.add(rbox(0.6, 0.9, 0.6, 0.02, enamel, W / 2 - 0.35, 0.45, winZ));
  const kettle = prop('kettle', { height: 0.24 });
  const kettleGroup = new THREE.Group();
  if (kettle) kettleGroup.add(kettle);
  else kettleGroup.add(lathe([[0, 0], [0.1, 0], [0.11, 0.1], [0.06, 0.2], [0, 0.22]], chrome));
  kettleGroup.position.set(W / 2 - 0.42, 0.9, winZ + 0.12);
  scene.add(kettleGroup);
  const steam: THREE.Mesh[] = [];
  const steamTex = canvasTex(64, 64, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(240,240,240,0.6)');
    gr.addColorStop(1, 'rgba(240,240,240,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, w);
  });
  for (let i = 0; i < 10; i++) {
    const s = fx(new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })));
    s.userData.noPick = true;
    s.userData.ph = i / 10;
    scene.add(s);
    steam.push(s);
  }
  let steaming = 0;

  // ---------------- the table, chairs, doilies ----------------
  const tableH = 0.76;
  const table = prop('roundTable', { height: tableH });
  if (table) scene.add(table);
  else {
    scene.add(cyl(0.48, 0.48, 0.04, woodDark, 0, tableH - 0.02, 0, 32));
    scene.add(cyl(0.06, 0.12, tableH - 0.04, woodDark, 0, (tableH - 0.04) / 2, 0, 12));
  }
  // measure the real table top so things sit on it
  let top = tableH;
  if (table) {
    const bb = new THREE.Box3().setFromObject(table);
    top = bb.max.y;
    table.position.z = winZ;
  }
  const TZ = winZ;
  const chairs: THREE.Object3D[] = [];
  for (const [x, ry] of [[-0.78, Math.PI / 2], [0.78, -Math.PI / 2]] as const) {
    const ch = prop('woodChair', { height: 0.95 });
    const grp = new THREE.Group();
    if (ch) grp.add(ch);
    else grp.add(rbox(0.45, 0.9, 0.45, 0.03, woodDark, 0, 0.45, 0));
    grp.position.set(x, 0, TZ);
    grp.rotation.y = ry;
    scene.add(grp);
    chairs.push(grp);
  }
  type Slot = 'E' | 'A' | 'T' | 'S';
  const MATS: Record<Slot, THREE.Vector3> = { E: new THREE.Vector3(-0.27, top, TZ), A: new THREE.Vector3(0.27, top, TZ), T: new THREE.Vector3(0, top, TZ - 0.02), S: new THREE.Vector3(-0.26, top, TZ + 0.21) };
  const dTex = doilyTex();
  for (const p of [MATS.E, MATS.A]) {
    const d = mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: dTex, transparent: true, roughness: 0.9 }), p.x, top + 0.002, p.z, false);
    d.rotation.x = -Math.PI / 2;
    scene.add(d);
  }
  const big = mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: dTex, transparent: true, roughness: 0.9 }), MATS.T.x, top + 0.002, MATS.T.z, false);
  big.rotation.x = -Math.PI / 2;
  scene.add(big);

  // the tea things: four cups (only two are theirs), the teapot, the sugar bowl. No labels: you have to know them.
  //   E = his cup, chipped (the calendar: «don't throw it away»); A = hers, with wisteria; X/Y = two other cups
  type Piece = { id: 'E' | 'A' | 'T' | 'S' | 'X' | 'Y'; g: THREE.Group; start: THREE.Vector3 };
  const bandTex = (kind: 'flower' | 'stripe') => canvasTex(256, 64, (c, w, h) => {
    if (kind === 'stripe') {
      // bold black and white bands: readable even from across the table
      c.fillStyle = '#f0ece4';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#141210';
      for (const y of [4, 24, 44]) c.fillRect(0, y, w, 12);
    } else {
      // big clusters of wisteria, dark on a grey ground
      c.fillStyle = '#8f8a92';
      c.fillRect(0, 0, w, h);
      for (let x = 16; x < w; x += 43) {
        c.fillStyle = '#26232a';
        for (let k = 0; k < 6; k++) {
          c.beginPath();
          c.arc(x + (k % 2 ? 5 : -5), 10 + k * 8, 7 - k * 0.8, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#e8e4ea';
        c.beginPath();
        c.arc(x - 3, 12, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
  const mkPiece = (id: Piece['id'], only: RegExp, h: number, deco: 'flower' | 'stripe' | 'chip' | null, start: THREE.Vector3): Piece => {
    const grp = new THREE.Group();
    const p = prop('teaSet', { height: h, only });
    if (p) grp.add(p);
    else grp.add(id === 'T' ? lathe([[0, 0], [0.07, 0], [0.08, 0.06], [0.05, 0.11], [0, 0.12]], enamel) : lathe([[0, 0], [0.03, 0], [0.04, 0.05], [0, 0.05]], enamel));
    if (deco) {
      const bb = new THREE.Box3().setFromObject(grp);
      const sz = bb.getSize(new THREE.Vector3());
      // the bowl's centre and radius, from the rim alone (the handle would skew a bounding box)
      const rim = new THREE.Box3();
      const v = new THREE.Vector3();
      grp.updateMatrixWorld(true);
      grp.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        const pos = m.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          if (v.y - bb.min.y > sz.y * 0.9) rim.expandByPoint(v);
        }
      });
      const rs = rim.isEmpty() ? sz : rim.getSize(new THREE.Vector3());
      const rc = rim.isEmpty() ? bb.getCenter(new THREE.Vector3()) : rim.getCenter(new THREE.Vector3());
      const r = Math.min(rs.x, rs.z) / 2;
      const bowlX = rc.x - grp.position.x, bowlZ = rc.z - grp.position.z;
      if (deco === 'chip') {
        // a dark notch out of the rim and a hairline crack under it
        grp.add(rbox(0.022, 0.016, 0.012, 0.002, mat(0x0c0b0a, { roughness: 0.9 }), bowlX, h - 0.006, bowlZ + r * 0.97));
        const crack = rbox(0.003, h * 0.6, 0.003, 0.0005, mat(0x0c0b0a), bowlX + 0.004, h * 0.62, bowlZ + r * 0.99);
        crack.rotation.z = 0.25;
        grp.add(crack);
      } else {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.9, h * 0.5, 28, 1, true), new THREE.MeshStandardMaterial({ map: bandTex(deco), roughness: 0.3 }));
        band.position.set(bowlX, h * 0.6, bowlZ);
        grp.add(band);
      }
    }
    const hb = hitBox(0.13, h + 0.04, 0.13, 0, h / 2, 0, 'piece' + id);
    grp.add(hb);
    grp.userData.hb = hb;
    scene.add(grp);
    return { id, g: grp, start };
  };
  const pieces: Piece[] = [
    mkPiece('E', /cup_small_01/, 0.065, 'chip', new THREE.Vector3(0.12, top, TZ - 0.32)),
    mkPiece('A', /cup_small_02/, 0.065, 'flower', new THREE.Vector3(-0.12, top, TZ - 0.33)),
    mkPiece('X', /cup_small_01/, 0.065, 'stripe', new THREE.Vector3(0.34, top, TZ - 0.14)),
    mkPiece('Y', /cup_small_02/, 0.065, null, new THREE.Vector3(-0.37, top, TZ - 0.12)),
    mkPiece('T', /teapot_01/, 0.16, null, new THREE.Vector3(0.28, top, TZ + 0.17)),
    mkPiece('S', /sugar_cup_01/, 0.08, null, new THREE.Vector3(0.04, top, TZ + 0.24)),
  ];
  const isSlot = (id: string): id is Slot => id === 'E' || id === 'A' || id === 'T' || id === 'S';
  const placed = new Set<string>(((g.flag('a.pieces') as string | undefined) ?? '').split('').filter(Boolean));
  const tableDone = () => !!g.flag('a.table');
  for (const p of pieces) p.g.position.copy(isSlot(p.id) && (placed.has(p.id) || tableDone()) ? MATS[p.id] : p.start);
  if (tableDone()) chairs[0].position.x = -0.95;

  // ---------------- the pantry: tall narrow door, holds the crutches ----------------
  const pantryX = 1.15;
  const pantryPivot = new THREE.Group();
  pantryPivot.userData.passThrough = true; // an open door must not stand between you and the doorway
  pantryPivot.position.set(pantryX - 0.3, 0, -D / 2 + 0.05);
  pantryPivot.add(rbox(0.6, 2.0, 0.04, 0.01, woodMaterial({ base: '#6d6252' }), 0.3, 1.0, 0));
  pantryPivot.add(cyl(0.015, 0.015, 0.05, chrome, 0.53, 1.0, 0.04, 8).rotateX(Math.PI / 2));
  scene.add(pantryPivot);
  scene.add(mesh(new THREE.PlaneGeometry(0.6, 2.0), new THREE.MeshBasicMaterial({ color: 0x050505 }), pantryX, 1.0, -D / 2 + 0.012, false));
  const crutches = prop('crutches', { height: 1.25, only: /crutch01/ });
  const crutchGroup = new THREE.Group();
  if (crutches) crutchGroup.add(crutches);
  else crutchGroup.add(rbox(0.06, 1.25, 0.04, 0.01, woodDark, 0, 0.62, 0));
  crutchGroup.position.set(pantryX - 0.1, 0.02, -D / 2 + 0.2);
  crutchGroup.rotation.z = 0.08;
  scene.add(crutchGroup);
  const pantryOpen = () => tableDone();
  const setPantry = (k: number) => (pantryPivot.rotation.y = k * 1.7);
  setPantry(pantryOpen() ? 1 : 0);
  // the crutch is no longer here (it is in the wardrobe, in her bedroom): only an old save still finds it
  crutchGroup.visible = false;
  // on a nail inside the pantry: the key of the garden shed
  const shedKey = new THREE.Group();
  shedKey.add(cyl(0.005, 0.005, 0.08, chrome, 0, 0, 0, 6));
  shedKey.add(mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), chrome, 0, 0.05, 0));
  shedKey.add(textPlane([t('ada.shedTag')], 0.06, 0.03, { bg: '#d8cfba', size: 16, px: 32 }).translateY(-0.06).translateZ(0.01));
  shedKey.position.set(pantryX, 1.35, -D / 2 + 0.06);
  shedKey.visible = pantryOpen() && !g.flag('a.crutch') && !g.flag('a.shedKey');
  scene.add(shedKey);
  // the back door to the garden (right wall, near the front): glass panes, the wisteria pressing against them
  const gdZ = 1.05;
  const gdTex = canvasTex(64, 128, (c, w, h) => {
    c.fillStyle = '#1b2026';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(150,150,160,${Math.random() * 0.4})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h * 0.6, 2 + Math.random() * 4, 0, Math.PI * 2);
      c.fill();
    }
  });
  scene.add(mesh(new THREE.PlaneGeometry(0.8, 2.0), new THREE.MeshBasicMaterial({ color: 0x050505 }), W / 2 - 0.012, 1.0, gdZ, false).rotateY(-Math.PI / 2));
  const gdPivot = new THREE.Group();
  gdPivot.userData.passThrough = true; // an open door must not stand between you and the doorway
  gdPivot.position.set(W / 2 - 0.04, 0, gdZ - 0.4);
  gdPivot.add(rbox(0.05, 2.0, 0.8, 0.01, woodMaterial({ base: '#6d6252' }), 0, 1.0, 0.4));
  gdPivot.add(mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ map: gdTex }), -0.03, 1.4, 0.4, false).rotateY(-Math.PI / 2));
  gdPivot.add(cyl(0.015, 0.015, 0.05, chrome, -0.04, 1.0, 0.7, 8).rotateZ(Math.PI / 2));
  scene.add(gdPivot);
  if (g.flag('a.gardenDoor')) gdPivot.rotation.y = 1.2;

  // sink and drainboard on the back wall, calendar
  scene.add(rbox(1.0, 0.86, 0.55, 0.02, enamel, -0.8, 0.43, -D / 2 + 0.3));
  scene.add(rbox(1.04, 0.04, 0.6, 0.01, mat(0x7a756c, { roughness: 0.4 }), -0.8, 0.88, -D / 2 + 0.3));
  scene.add(cyl(0.012, 0.012, 0.25, chrome, -0.8, 1.02, -D / 2 + 0.1, 8));
  const cal = textPlane([t('ada.calMonth'), '1 2 3 4 5 6 7', '8 9 10 11 12 13 [14]', '15 16 17 · · ·'], 0.3, 0.42, { bg: '#e4ddcb', size: 20, px: 192 });
  cal.position.set(0.25, 1.55, -D / 2 + 0.012);
  scene.add(cal);
  // door back to the living room (front wall)
  scene.add(rbox(0.9, 2.05, 0.06, 0.02, woodDark, -1.2, 1.025, D / 2 - 0.04));

  // ---------------- hotspots ----------------
  const hTable = hitBox(1.1, 0.5, 1.1, 0, top - 0.1, TZ, 'table');
  const hKettle = hitBox(0.35, 0.4, 0.35, W / 2 - 0.42, 1.05, winZ + 0.12, 'kettle');
  const hStove = hitBox(0.7, 0.9, 0.8, W / 2 - 0.35, 0.45, winZ, 'stove');
  const hWindow = hitBox(0.2, 1.2, 1.0, -W / 2 + 0.1, 1.5, winZ, 'window');
  const hPantry = hitBox(0.7, 2.0, 0.3, pantryX, 1.0, -D / 2 + 0.15, 'pantry');
  const hCal = hitBox(0.35, 0.45, 0.1, 0.25, 1.55, -D / 2 + 0.05, 'calendar');
  const hSink = hitBox(1.0, 1.0, 0.6, -0.8, 0.5, -D / 2 + 0.3, 'sink');
  const hDoor = hitBox(1.0, 2.1, 0.2, -1.2, 1.05, D / 2 - 0.1, 'door');
  const hGarden = hitBox(0.3, 2.0, 0.85, W / 2 - 0.15, 1.0, gdZ, 'garden');
  scene.add(hGarden);
  scene.add(hTable, hKettle, hStove, hWindow, hPantry, hCal, hSink, hDoor);

  const say = (k: string) => g.say(k);

  const boilKettle = async () => {
    g.set('a.kettle');
    g.audio.sfx('switch');
    await say('ada.kettleOn');
    await sleep(1500);
    g.audio.sfx('whistle');
    steaming = 1;
    await sleep(1800);
    await g.view('window');
    for (let i = 0; i <= 30; i++) {
      drawWindow(i / 30, 0);
      await sleep(50);
    }
    g.audio.sfx('breath');
    for (let i = 0; i <= 30; i++) {
      drawWindow(1, i / 30);
      await sleep(70);
    }
    steaming = 0;
    await g.say([{ who: 'diego', key: 'ada.fogSeen' }]);
  };

  const tableComplete = async () => {
    g.set('a.table');
    await sleep(500);
    // the chair by the window scrapes back. Someone sits down.
    g.audio.sfx('scrape');
    for (let i = 0; i <= 20; i++) {
      chairs[0].position.x = -0.78 - (i / 20) * 0.17;
      await sleep(25);
    }
    g.audio.hush(3);
    await sleep(700);
    g.audio.sfx('whisper');
    await g.say([{ who: 'ettore', key: 'ada.thanks' }]);
    await sleep(300);
    g.audio.sfx('creak');
    for (let i = 0; i <= 25; i++) {
      setPantry(i / 25);
      await sleep(30);
    }
    shedKey.visible = !g.flag('a.crutch');
    await g.say([{ who: 'diego', key: 'ada.pantryOpen' }]);
  };

  // tap a piece (without dragging it) to look at it closely
  const pieceSpots: Hotspot[] = pieces.map((p) => ({
    id: 'look' + p.id,
    obj: p.g, // the whole cup: whichever part the finger lands on
    view: 'table',
    when: () => !tableDone(),
    tap: async (item: string | null) => {
      if (item) return g.nope();
      if (!g.flag('a.tableSeen')) {
        g.set('a.tableSeen');
        await say('ada.table');
      }
      return say('ada.piece' + p.id);
    },
  }));
  const hotspots: Hotspot[] = [
    ...pieceSpots,
    { id: 'table', obj: hTable, view: 'table', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (tableDone()) return say('ada.tableAfter');
      if (!g.flag('a.tableSeen')) {
        g.set('a.tableSeen');
        return say('ada.table');
      }
    } },
    { id: 'kettle', obj: hKettle, view: 'stove', tap: async (item) => {
      if (item) return g.nope();
      if (kettleDone()) return say('ada.kettleAfter');
      return boilKettle();
    } },
    { id: 'stove', obj: hStove, view: 'stove', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ada.stove');
    } },
    { id: 'window', obj: hWindow, view: 'window', tap: async (item) => {
      if (item) return g.nope();
      return say(kettleDone() ? 'ada.windowFog' : 'ada.window');
    } },
    { id: 'pantry', obj: hPantry, view: 'pantry', tap: async (item) => {
      if (item) return g.nope();
      if (!pantryOpen()) {
        g.audio.sfx('wrong');
        return say('ada.pantryShut');
      }
      if (shedKey.visible) {
        shedKey.visible = false;
        g.set('a.shedKey');
        g.give('shedkey');
        return say('ada.shedKey');
      }
      return say('ada.pantryEmpty');
    } },
    { id: 'calendar', obj: hCal, tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('ada.calTitle'), t('ada.calText'), true);
      g.note('note.cups');
    } },
    { id: 'sink', obj: hSink, tap: async (item) => {
      if (item) return g.nope();
      return say('ada.sink');
    } },
    { id: 'garden', obj: hGarden, view: 'garden', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('a.gardenDoor')) {
        g.set('a.gardenDoor');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 18; i++) {
          gdPivot.rotation.y = (i / 18) * 1.2;
          await sleep(25);
        }
        await say('ada.gardenOpen');
      }
      g.audio.steps(3, 0.45, false);
      return g.go('ada_giardino');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // ---------------- direct manipulation: lay the table ----------------
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -top);
  const interactions: Interaction[] = pieces.map((p) => ({
    kind: 'drag' as const,
    obj: p.g,
    plane,
    when: () => g.viewName === 'table' && !tableDone() && !(isSlot(p.id) && placed.has(p.id)),
    onStart: () => g.audio.sfx('glass'),
    onMove: () => {
      // stay on the table top
      const dx = p.g.position.x, dz = p.g.position.z - TZ;
      const r = Math.hypot(dx, dz);
      if (r > 0.42) {
        p.g.position.x = (dx / r) * 0.42;
        p.g.position.z = TZ + (dz / r) * 0.42;
      }
      p.g.position.y = top + 0.015;
    },
    onEnd: async () => {
      p.g.position.y = top;
      let best: Slot | null = null, bd = 1;
      for (const k of ['E', 'A', 'T', 'S'] as const) {
        if (placed.has(k)) continue;
        const d = Math.hypot(p.g.position.x - MATS[k].x, p.g.position.z - MATS[k].z);
        if (d < bd) { bd = d; best = k; }
      }
      if (bd > 0.09 || !best) return;
      if (best === p.id) {
        p.g.position.copy(MATS[best]);
        placed.add(p.id);
        g.set('a.pieces', [...placed].join(''));
        g.audio.sfx('glass');
        if (['E', 'A', 'T', 'S'].every((k) => placed.has(k)) && !tableDone()) await tableComplete();
      } else {
        // not their places / not their cups: it slides back to where it was
        g.audio.sfx('wrong');
        p.g.position.copy(p.start);
        const why = p.id === 'X' || p.id === 'Y' ? 'ada.wrongCup'
          : p.id === 'T' ? 'ada.wrongPot'
          : p.id === 'S' ? 'ada.wrongSugar'
          : best === 'T' || best === 'S' ? 'ada.wrongThing'
          : 'ada.wrongSeat';
        await say(why);
      }
    },
  }));

  return {
    id: 'ada_cucina',
    nameKey: 'place.adaCucina',
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'ada_soggiorno',
    next: ['ada_giardino'],
    views: {
      main: { pos: [-0.9, 1.6, 1.45], look: [0.6, 0.95, -1.1], yaw: 60, pitch: 18 },
      table: { pos: [0, 1.32, TZ + 0.62], look: [0, top, TZ - 0.03], parent: 'main', yaw: 15, pitch: 10, fov: 56 },
      stove: { pos: [0.6, 1.5, winZ + 0.9], look: [W / 2 - 0.4, 1.0, winZ], parent: 'main', yaw: 20, pitch: 12 },
      window: { pos: [-0.6, 1.55, winZ + 0.3], look: [-W / 2, 1.5, winZ], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      garden: { pos: [0.2, 1.6, 0.5], look: [W / 2, 1.1, gdZ], parent: 'main', yaw: 20, pitch: 12 },
      pantry: { pos: [0.8, 1.5, -0.2], look: [pantryX, 1.0, -D / 2], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      steam.forEach((s, i) => {
        const k = (time * 0.4 + s.userData.ph) % 1;
        s.position.set(kettleGroup.position.x - 0.05 - k * 0.2, kettleGroup.position.y + 0.25 + k * 0.6, kettleGroup.position.z + Math.sin(time + i) * 0.05);
        s.scale.setScalar(0.6 + k * 1.6);
        s.lookAt(g.engine.camera.position);
        (s.material as THREE.MeshBasicMaterial).opacity = steaming * Math.sin(k * Math.PI) * 0.7;
      });
    },
    enter: async () => {
      if (!g.flag('a.kEntered')) {
        g.set('a.kEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ada.kitchen1' }, { who: 'diego', key: 'ada.kitchen2' }]);
      }
    },
    hint: () => {
      if (!tableDone()) return g.flag('a.photoSeen') || g.save.notebook.includes('note.seats') ? 'hint.ada.table' : 'hint.ada.photo';
      if (!g.flag('a.crutch')) return g.flag('a.shedKey') ? 'hint.ada.garden' : 'hint.ada.shedKey';
      return 'hint.ada.hatch';
    },
    debug: { pieces, MATS, top, getPlaced: () => [...placed] },
  };
}
