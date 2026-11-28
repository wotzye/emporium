import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, woodMaterial, plasterMaterial, mat, cyl, canvasTex, noise } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { radioHint } from './radio_negozio';
import { sleep, ether } from './radio_common';

/**
 * The cellar under the radio shop.
 * 1. The fuse box: the main fuse (10 A) is missing. On the shelf, five spare fuses in a rack, each
 *    with its rating written large. Tap one: it goes on Nello's test lamp, and you are told plainly
 *    what it is and whether it works. The good 10 A goes in your pocket; the fuse box takes it.
 * 2. The listening station: a map of the village on the wall, with the photos of the four shops,
 *    and on the table four cables labelled with a first name. Plug each one into the right photo:
 *    the wrong one gives silence, the right one the sound of that shop. All four: the drawer opens.
 */
export const FUSES: { a: number; ok: boolean }[] = [
  { a: 6, ok: true },
  { a: 10, ok: false },
  { a: 16, ok: true },
  { a: 10, ok: true },
  { a: 25, ok: true },
];

/** the four shops on the map, and the name on the cable that belongs to each */
const SHOPS = [
  { id: 'bar', photo: 'mem_bar_1', cap: 'radio.capBar', name: 'ALDO' },
  { id: 'ora', photo: 'mem_ora_1', cap: 'radio.capOra', name: 'OTTAVIO' },
  { id: 'foto', photo: 'mem_foto_3', cap: 'radio.capFoto', name: 'GIULIO' },
  { id: 'ada', photo: 'mem_ada_3', cap: 'radio.capAda', name: 'ADA' },
] as const;
/** the cables on the table, left to right: which shop each one is (shuffled) */
const CABLES = [2, 3, 0, 1];

export function createRadioCantina(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 7.5);
  scene.userData.envIntensity = 0.04;
  const W = 4.6, H = 2.3, D = 3.4;
  const woodDark = woodMaterial({ base: '#2a2018' });
  const woodMid = woodMaterial({ base: '#4a3a2a' });
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#5e5a52', repeat: [3, 2], damp: 1.5 }),
    floor: plasterMaterial({ base: '#3a3631', repeat: [3, 3], damp: 1 }),
    ceil: woodMaterial({ base: '#1e1913', repeat: [2, 2], plank: true }),
  }));
  const power = () => !!g.flag('rl.power');
  const amb = new THREE.AmbientLight(0xffffff, 0.025);
  scene.add(amb);
  const bare = new THREE.PointLight(0xffe2b0, power() ? 2.4 : 0, 6, 1.5);
  bare.position.set(0, 2.0, -0.2);
  scene.add(bare);
  const bareGlass = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: power() ? 0xfff2d0 : 0x1a1a1a }), 0, 2.05, -0.2, false);
  bareGlass.userData.noPick = true;
  scene.add(bareGlass, cyl(0.006, 0.006, 0.25, mat(0x111111), 0, 2.2, -0.2, 4));
  const motes = dust([-2.2, 0.2, -1.6], [2.2, 2.2, 1.6], 120);
  scene.add(motes.points);
  // the stairs up, in front on the left
  for (let i = 0; i < 7; i++) scene.add(rbox(0.8, 0.05, 0.26, 0.01, woodDark, -W / 2 + 0.45, 0.18 + i * 0.3, -0.2 + i * 0.22));
  scene.add(rbox(0.04, 2.2, 1.7, 0.01, woodDark, -W / 2 + 0.87, 1.1, 0.5));
  scene.add(rbox(0.8, 0.04, 0.8, 0.01, woodDark, -W / 2 + 0.45, H - 0.02, 1.3));
  // junk: crates, an old bicycle frame
  scene.add(rbox(0.6, 0.45, 0.45, 0.02, woodDark, 1.6, 0.225, 1.1));
  scene.add(rbox(0.5, 0.4, 0.4, 0.02, woodDark, 1.65, 0.65, 1.1).rotateY(0.3));
  for (const s of [-1, 1]) scene.add(mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 28), mat(0x1a1a1a, { roughness: 0.6 }), 0.8 + s * 0.45, 0.32, 1.5, true).rotateY(0.1));

  // ================= the fuse box (back wall, right) =================
  const bxX = 0.85;
  const box = new THREE.Group();
  box.add(rbox(0.8, 0.6, 0.12, 0.01, mat(0x4a4a46, { metalness: 0.6, roughness: 0.6 }), 0, 0, 0));
  box.add(mesh(new THREE.PlaneGeometry(0.72, 0.52), mat(0x22201c, { roughness: 0.9 }), 0, 0, 0.062, false));
  const LABELS = ['radio.f1', 'radio.f2', 'radio.f3', 'radio.f4', 'radio.f5', 'radio.f6'];
  const MAIN = 2; // the empty slot
  const slotFuses: THREE.Object3D[] = [];
  const ceramic = mat(0xd9d4c6, { roughness: 0.5 });
  const capM = mat(0x9a9a98, { metalness: 0.9, roughness: 0.3 });
  const makeFuse = (a: number, big = false) => {
    const f = new THREE.Group();
    f.add(cyl(0.022, 0.022, 0.07, ceramic, 0, 0, 0, 12));
    f.add(cyl(0.024, 0.024, 0.012, capM, 0, 0.038, 0, 12));
    f.add(cyl(0.024, 0.024, 0.012, capM, 0, -0.038, 0, 12));
    const lab = textPlane([a + 'A'], big ? 0.042 : 0.04, 0.03, { bg: '#ddd5c2', size: 44, px: 64 });
    lab.position.z = 0.0225;
    f.add(lab);
    return f;
  };
  LABELS.forEach((k, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = -0.23 + col * 0.23, y = 0.12 - row * 0.26;
    box.add(cyl(0.032, 0.032, 0.012, mat(0x111111), x, y, 0.066, 14).rotateX(Math.PI / 2));
    const lab = textPlane([t(k)], 0.2, 0.05, { bg: i === MAIN ? '#e8d9a8' : '#ddd5c2', size: 22, px: 64 });
    lab.position.set(x, y + 0.085, 0.064);
    box.add(lab);
    const f = makeFuse(i === MAIN ? 10 : [6, 6, 10, 16, 16, 6][i]);
    f.rotation.x = Math.PI / 2;
    f.position.set(x, y, 0.1);
    f.visible = i !== MAIN || power();
    box.add(f);
    slotFuses.push(f);
  });
  box.add(rbox(0.03, 0.14, 0.03, 0.005, mat(0x1a1a1a), 0.47, 0.05, 0.03));
  box.position.set(bxX, 1.45, -D / 2 + 0.07);
  scene.add(box);

  // ================= the rack of spare fuses and the test lamp (right wall) =================
  const sx = W / 2 - 0.3, sz = -0.4;
  scene.add(rbox(0.5, 0.04, 1.3, 0.01, woodDark, sx, 0.95, sz));
  for (const z of [-0.55, 0.55]) scene.add(rbox(0.04, 0.95, 0.04, 0.005, woodDark, sx, 0.475, sz + z));
  // a wooden rack: five holes, and under each the rating, written large in Nello's hand
  scene.add(rbox(0.12, 0.05, 0.62, 0.01, woodMid, sx - 0.05, 0.995, sz + 0.25));
  const rackZ = (i: number) => sz + 0.25 + (i - 2) * 0.12;
  const rackPos = (i: number) => new THREE.Vector3(sx - 0.05, 1.06, rackZ(i));
  const loose: THREE.Object3D[] = [];
  const cards: THREE.Mesh[] = [];
  const tested = new Set<number>(String(g.flag('rl.tested') ?? '').split('').filter(Boolean).map(Number));
  const cardTex = (i: number) => textPlane([FUSES[i].a + ' A', tested.has(i) ? (FUSES[i].ok ? t('radio.cardOk') : t('radio.cardDead')) : ''], 0.1, 0.07, { bg: tested.has(i) && !FUSES[i].ok ? '#3a3632' : '#e2dccb', fg: tested.has(i) && !FUSES[i].ok ? '#d8d2c4' : '#1a1612', size: 30, px: 96, lineH: 1.1 });
  FUSES.forEach((fz, i) => {
    const f = makeFuse(fz.a, true);
    f.rotation.y = -Math.PI / 2;
    f.position.copy(rackPos(i));
    scene.add(f);
    loose.push(f);
    const c = cardTex(i);
    c.position.set(sx - 0.115, 0.995, rackZ(i));
    c.rotation.y = -Math.PI / 2;
    scene.add(c);
    cards.push(c);
  });
  const remark = (i: number) => {
    tested.add(i);
    g.set('rl.tested', [...tested].join(''));
    const old = cards[i];
    const c = cardTex(i);
    c.position.copy(old.position);
    c.rotation.copy(old.rotation);
    scene.remove(old);
    scene.add(c);
    cards[i] = c;
  };
  // the test lamp: a battery, two clips, a little bulb
  const tester = new THREE.Group();
  tester.add(rbox(0.12, 0.08, 0.08, 0.01, mat(0x2a2a28), 0, 0.04, 0));
  tester.add(textPlane(['4,5 V'], 0.08, 0.03, { bg: '#c9b46a', size: 34, px: 64 }).translateY(0.05).translateZ(0.041));
  const tBulbM = new THREE.MeshBasicMaterial({ color: 0x3a3630 });
  tester.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), tBulbM, 0, 0.11, 0, false));
  tester.add(rbox(0.1, 0.01, 0.03, 0.003, capM, 0, 0.005, 0.08));
  const tLight = new THREE.PointLight(0xffd9a0, 0, 1.4, 2);
  tLight.position.set(0, 0.13, 0);
  tester.add(tLight);
  tester.position.set(sx - 0.05, 0.97, sz - 0.3);
  tester.rotation.y = -Math.PI / 2;
  scene.add(tester);
  const clipPos = new THREE.Vector3(sx - 0.05, 1.03, sz - 0.18);
  const shelfLamp = new THREE.PointLight(0xffe2b0, power() ? 1.4 : 0.5, 2.2, 1.5);
  shelfLamp.position.set(sx - 0.6, 1.7, sz);
  scene.add(shelfLamp);
  const used = () => power() || g.has('rfuse');
  loose[3].visible = !used();

  // ================= the listening station (back wall, left) =================
  const tX = -0.95, tZ = -D / 2 + 0.38, tY = 0.78, tW = 1.5;
  scene.add(rbox(tW, 0.04, 0.62, 0.01, woodMid, tX, tY, tZ));
  for (const x of [-tW / 2 + 0.05, tW / 2 - 0.05]) for (const z of [-0.26, 0.26]) scene.add(rbox(0.04, tY, 0.04, 0.005, woodMid, tX + x, tY / 2, tZ + z));
  // the drawer, under the table top, in front
  const drawer = new THREE.Group();
  drawer.add(rbox(0.5, 0.1, 0.5, 0.01, woodDark, 0, 0, -0.25));
  drawer.add(rbox(0.52, 0.12, 0.02, 0.005, woodMid, 0, 0, 0.0));
  drawer.add(cyl(0.012, 0.012, 0.02, mat(0x8a7a5a, { metalness: 0.8 }), 0, 0, 0.015, 8).rotateX(Math.PI / 2));
  // inside: a folded note and the contact microphone
  const dNote = textPlane([''], 0.12, 0.08, { bg: '#ddd5c2' });
  dNote.rotation.x = -Math.PI / 2;
  dNote.position.set(-0.1, 0.055, -0.2);
  drawer.add(dNote);
  const mic = new THREE.Group();
  mic.add(cyl(0.025, 0.025, 0.012, mat(0x2a2a28, { metalness: 0.6 }), 0, 0, 0, 16));
  mic.add(cyl(0.004, 0.004, 0.2, mat(0x111111), 0.1, 0, 0.0, 6).rotateZ(Math.PI / 2));
  mic.position.set(0.1, 0.06, -0.25);
  drawer.add(mic);
  drawer.position.set(tX, tY - 0.08, tZ + 0.31);
  scene.add(drawer);
  const stationDone = () => !!g.flag('rl.station');
  const micTaken = () => !!g.flag('rl.mic');
  if (stationDone()) drawer.position.z += 0.3;
  dNote.visible = mic.visible = !micTaken();
  // the junction box at the back of the table, and a lamp
  const jbox = rbox(0.34, 0.12, 0.12, 0.01, mat(0x3a3a36, { metalness: 0.5 }), tX, tY + 0.08, tZ - 0.22);
  scene.add(jbox);
  scene.add(textPlane([t('radio.stationSign')], 0.3, 0.05, { bg: '#1e1a16', fg: '#d9cfb6', size: 26, px: 64 }).translateX(tX).translateY(tY + 0.09).translateZ(tZ - 0.159));
  const deskLamp = new THREE.SpotLight(0xffd9a0, power() ? 4 : 0, 3, 0.8, 0.6, 1.3);
  deskLamp.position.set(tX + 0.4, 2.0, tZ + 0.4);
  deskLamp.target.position.set(tX, 1.2, -D / 2);
  scene.add(deskLamp, deskLamp.target);

  // the map of the village, pinned to the wall: every house, the square, the church
  const bW = 1.5, bH = 0.95, bY = 1.62, bZ = -D / 2 + 0.02;
  const mapTex = canvasTex(768, 486, (c, w, h) => {
    c.fillStyle = '#d6cdb6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 4000, 0.08);
    c.strokeStyle = 'rgba(70,60,48,0.55)';
    c.lineWidth = 14;
    c.lineCap = 'round';
    // streets
    for (const [x0, y0, x1, y1] of [[20, 250, 748, 230], [380, 20, 400, 470], [120, 60, 380, 240], [400, 240, 700, 440], [400, 240, 650, 60], [80, 420, 380, 250]]) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    // houses: little squares with a dark roof line
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 90; i++) {
      const x = 20 + rnd() * 720, y = 20 + rnd() * 440;
      const s = 14 + rnd() * 12;
      c.fillStyle = 'rgba(60,52,44,0.5)';
      c.fillRect(x, y, s, s * 0.8);
      c.strokeStyle = 'rgba(40,34,28,0.7)';
      c.lineWidth = 1.5;
      c.strokeRect(x, y, s, s * 0.8);
    }
    // the square and the church
    c.fillStyle = '#c3b99f';
    c.beginPath();
    c.arc(392, 240, 46, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2a241e';
    c.fillRect(372, 120, 40, 60);
    c.fillRect(386, 96, 12, 24);
    c.font = "bold 20px 'Courier New', monospace";
    c.textAlign = 'center';
    c.fillText('S. MICHELE', 392, 200);
    c.fillText('PIAZZA', 392, 248);
    c.font = "bold 26px 'Courier New', monospace";
    c.fillText('ROCCA DEL CASTELLO', w / 2, h - 14);
  });
  const mapM = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 });
  scene.add(mesh(new THREE.PlaneGeometry(bW, bH), mapM, tX, bY, bZ, false));
  scene.add(rbox(bW + 0.06, bH + 0.06, 0.01, 0.003, woodDark, tX, bY, bZ - 0.013));
  // the four photos, each with its socket under it
  const PH = [[-0.5, 0.2], [0.48, 0.24], [-0.42, -0.24], [0.5, -0.2]] as const;
  const sockets: THREE.Vector3[] = [];
  SHOPS.forEach((s, i) => {
    const [px, py] = PH[i];
    const tex = oldPhoto(s.photo, 220, 165, (c, w, h) => {
      c.fillStyle = '#7a756a';
      c.fillRect(0, 0, w, h);
    }, { age: 0.3, border: true });
    const ph = mesh(new THREE.PlaneGeometry(0.24, 0.18), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), tX + px, bY + py + 0.03, bZ + 0.006, false);
    scene.add(ph);
    // a drawing pin
    scene.add(mesh(new THREE.SphereGeometry(0.01, 8, 6), mat(0x8e0710), tX + px, bY + py + 0.115, bZ + 0.012, false));
    const cap = textPlane([t(s.cap)], 0.26, 0.05, { bg: '#e8e2d4', size: 44, px: 96 });
    cap.position.set(tX + px, bY + py - 0.09, bZ + 0.007);
    scene.add(cap);
    const sock = new THREE.Vector3(tX + px + 0.15, bY + py - 0.04, bZ + 0.02);
    scene.add(cyl(0.018, 0.018, 0.02, mat(0x111111, { metalness: 0.6 }), sock.x, sock.y, sock.z - 0.005, 14).rotateX(Math.PI / 2));
    scene.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), mat(0x9a8a62, { metalness: 0.9, roughness: 0.3 }), sock.x, sock.y, sock.z + 0.006, false));
    sockets.push(sock);
  });

  // the cables: from the junction box to a jack plug lying on the table, each with a name tag
  const plugHome = (i: number) => new THREE.Vector3(tX - 0.45 + i * 0.3, tY + 0.035, tZ + 0.2);
  const cableM = [0x2a2622, 0x3a2a1e, 0x22262a, 0x2e2a24].map((c) => mat(c, { roughness: 0.7 }));
  const plugs: THREE.Group[] = [];
  const wires: THREE.Mesh[] = [];
  const plugged = (i: number) => !!g.flag('rl.plug' + i);
  const wireFrom = (i: number) => new THREE.Vector3(tX - 0.12 + i * 0.08, tY + 0.06, tZ - 0.16);
  const setWire = (i: number, end: THREE.Vector3, up: boolean) => {
    const a = wireFrom(i);
    const mid = up
      ? new THREE.Vector3((a.x + end.x) / 2, Math.max(a.y, end.y) - 0.1, (a.z + end.z) / 2 + 0.12)
      : new THREE.Vector3((a.x + end.x) / 2 + (i - 1.5) * 0.04, tY + 0.03, (a.z + end.z) / 2 + 0.02);
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, end]), 24, 0.007, 6, false);
    if (wires[i]) {
      wires[i].geometry.dispose();
      wires[i].geometry = geo;
    } else {
      const m = new THREE.Mesh(geo, cableM[i]);
      m.userData.noPick = true;
      wires[i] = m;
      scene.add(m);
    }
  };
  CABLES.forEach((shop, i) => {
    const p = new THREE.Group();
    p.add(cyl(0.012, 0.012, 0.06, mat(0x1a1a1a), 0, 0, 0, 10).rotateX(Math.PI / 2));
    p.add(cyl(0.005, 0.005, 0.03, mat(0xbfb8a8, { metalness: 0.9, roughness: 0.3 }), 0, 0, -0.045, 8).rotateX(Math.PI / 2));
    const tag = textPlane([SHOPS[shop].name], 0.17, 0.06, { bg: '#e8e2d4', size: 46, px: 128 });
    tag.rotation.x = -0.75;
    tag.position.set(0, 0.025, 0.07);
    p.add(tag);
    scene.add(p);
    plugs.push(p);
  });
  const placePlug = (i: number) => {
    const p = plugs[i];
    if (plugged(i)) {
      const s = sockets[CABLES[i]];
      p.position.set(s.x, s.y, s.z + 0.04);
      p.rotation.set(0, 0, 0);
      p.children[2].visible = false;
      setWire(i, new THREE.Vector3(s.x, s.y - 0.01, s.z + 0.07), true);
    } else {
      p.position.copy(plugHome(i));
      p.rotation.set(0, 0, 0);
      p.children[2].visible = true;
      setWire(i, plugHome(i).add(new THREE.Vector3(0, 0, -0.03)), false);
    }
  };
  CABLES.forEach((_, i) => placePlug(i));
  let sel = -1;
  const select = (i: number) => {
    if (sel >= 0 && !plugged(sel)) plugs[sel].position.y = tY + 0.035;
    sel = i;
    if (i >= 0) plugs[i].position.y = tY + 0.08;
  };

  // ================= hotspots =================
  const hBox = hitBox(0.9, 0.7, 0.3, bxX, 1.45, -D / 2 + 0.15, 'fusebox');
  const hTester = hitBox(0.2, 0.2, 0.2, sx - 0.05, 1.03, sz - 0.3, 'tester');
  const hFuses = FUSES.map((_, i) => {
    const p = rackPos(i);
    const hb = hitBox(0.12, 0.14, 0.11, p.x, p.y, p.z, 'fuse' + i);
    scene.add(hb);
    return hb;
  });
  const hShelf = hitBox(0.55, 0.3, 1.3, sx, 1.05, sz, 'shelf');
  const hStairs = hitBox(0.9, 2.1, 1.7, -W / 2 + 0.45, 1.0, 0.5, 'up');
  const hStation = hitBox(tW, 1.5, 0.7, tX, 1.2, tZ, 'station');
  const hPlugs = plugs.map((_, i) => {
    const p = plugHome(i);
    const hb = hitBox(0.14, 0.08, 0.16, p.x, p.y, p.z + 0.02, 'plug' + i);
    scene.add(hb);
    return hb;
  });
  const hSockets = sockets.map((s, i) => {
    const hb = hitBox(0.36, 0.3, 0.06, s.x - 0.15, s.y + 0.07, s.z + 0.02, 'socket' + i);
    scene.add(hb);
    return hb;
  });
  const hDrawer = hitBox(0.55, 0.15, 0.4, tX, tY - 0.08, tZ + 0.45, 'drawer');
  scene.add(hBox, hTester, hShelf, hStairs, hStation, hDrawer);
  const say = (k: string) => g.say(k);

  // ---------------- fuses ----------------
  let testing = false;
  const test = async (i: number) => {
    if (testing) return;
    testing = true;
    try {
      const f = loose[i];
      f.position.copy(clipPos);
      g.audio.sfx('click');
      await sleep(300);
      const ok = FUSES[i].ok;
      tBulbM.color.set(ok ? 0xfff0c0 : 0x3a3630);
      tLight.intensity = ok ? 1.6 : 0;
      remark(i);
      const a = FUSES[i].a;
      if (a === 10 && ok) {
        await g.say([{ who: 'diego', key: 'radio.fuseRight' }]);
        f.visible = false;
        tBulbM.color.set(0x3a3630);
        tLight.intensity = 0;
        g.give('rfuse');
        g.audio.sfx('pickup');
        return;
      }
      await g.say([{ who: 'diego', key: ok ? 'radio.fuseGoodWrongA' : 'radio.fuseDead', vars: { a: String(a) } }]);
      f.position.copy(rackPos(i));
      tBulbM.color.set(0x3a3630);
      tLight.intensity = 0;
    } finally {
      testing = false;
    }
  };
  const insert = async () => {
    if (power()) return say('radio.fuseDone');
    if (!g.has('rfuse')) return say('radio.slotEmpty');
    g.deselect();
    g.take('rfuse');
    slotFuses[MAIN].visible = true;
    g.audio.sfx('clunk');
    await sleep(300);
    g.set('rl.power');
    g.rebuild('radio_negozio');
    g.rebuild('radio_laboratorio');
    g.audio.sfx('switch');
    g.audio.buzz(true);
    for (let i = 0; i < 6; i++) {
      bare.intensity = i % 2 ? 0 : 2.4;
      (bareGlass.material as THREE.MeshBasicMaterial).color.set(i % 2 ? 0x1a1a1a : 0xfff2d0);
      await sleep(90 + Math.random() * 120);
    }
    bare.intensity = 2.4;
    deskLamp.intensity = 4;
    (bareGlass.material as THREE.MeshBasicMaterial).color.set(0xfff2d0);
    setTimeout(() => g.audio.buzz(false), 1500);
    await say('radio.powerOn');
    // all around, for a moment, voices: muffled, as if through walls
    await sleep(500);
    const e = ether(g.audio);
    e.set(0.2, 0.9);
    g.audio.sfx('whisper');
    await g.say([{ who: 'voci', key: 'radio.cellarVoice' }, { who: 'diego', key: 'radio.cellarVoice2' }]);
    e.stop();
  };

  // ---------------- the listening station ----------------
  const SOUND: Record<string, () => void> = {
    bar: () => {
      g.audio.rec('scissors', { gain: 0.9 });
      g.audio.rec('spray', { gain: 0.8, delay: 1.2 });
    },
    ora: () => g.audio.rec('tictac', { gain: 1.0, dur: 3 }),
    foto: () => {
      g.audio.shutter();
      g.audio.shutter(1.6);
    },
    ada: () => g.audio.rec('sewing', { gain: 0.9, dur: 3 }),
  };
  let busy = false;
  const plugInto = async (socket: number) => {
    if (busy) return;
    if (!power()) return say('radio.stationNoPower');
    if (sel < 0) return say(stationDone() ? 'radio.stationDone' : 'radio.pickCable');
    const i = sel;
    busy = true;
    try {
      // the plug goes in the socket...
      const s = sockets[socket];
      plugs[i].position.set(s.x, s.y, s.z + 0.04);
      plugs[i].rotation.set(0, 0, 0);
      setWire(i, new THREE.Vector3(s.x, s.y - 0.01, s.z + 0.07), true);
      g.audio.sfx('click');
      await sleep(350);
      if (CABLES[i] !== socket) {
        const e = ether(g.audio);
        e.set(0.35, 0);
        await sleep(900);
        e.stop();
        await g.say([{ who: 'diego', key: 'radio.hearNothing' }]);
        sel = -1;
        placePlug(i);
        return;
      }
      g.set('rl.plug' + i);
      sel = -1;
      placePlug(i);
      const e = ether(g.audio);
      e.set(0.12, 0);
      SOUND[SHOPS[socket].id]();
      await sleep(2600);
      e.stop();
      await g.say([{ who: 'diego', key: 'radio.hear.' + SHOPS[socket].id }]);
      if (CABLES.every((_, k) => plugged(k)) && !stationDone()) {
        g.set('rl.station');
        await sleep(300);
        g.audio.sfx('drawer');
        for (let k = 0; k <= 15; k++) {
          drawer.position.z = tZ + 0.31 + (k / 15) * 0.3;
          await sleep(25);
        }
        await say('radio.drawerOpens');
      }
    } finally {
      busy = false;
    }
  };

  const hotspots: Hotspot[] = [
    { id: 'fusebox', obj: hBox, view: 'panel', tap: async (item) => {
      if (item && item !== 'rfuse') return g.nope();
      if (power()) return say('radio.fuseDone');
      if (g.has('rfuse')) return insert();
      if (!g.flag('rl.boxSeen')) {
        g.set('rl.boxSeen');
        return g.say([{ who: 'diego', key: 'radio.box1' }, { who: 'diego', key: 'radio.box2' }]);
      }
      return say('radio.slotEmpty');
    } },
    ...FUSES.map((_, i): Hotspot => ({
      id: 'fuse' + i,
      obj: hFuses[i],
      when: () => g.viewName === 'shelf' && loose[i].visible && !power(),
      tap: async (item) => {
        if (item) return g.nope();
        if (g.has('rfuse')) return say('radio.haveFuse');
        return test(i);
      },
    })),
    { id: 'tester', obj: hTester, view: 'shelf', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.tester');
    } },
    { id: 'shelf', obj: hShelf, view: 'shelf', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(power() ? 'radio.rackAfter' : 'radio.tin');
    } },
    ...plugs.map((_, i): Hotspot => ({
      id: 'plug' + i,
      obj: hPlugs[i],
      when: () => g.viewName === 'station' && !plugged(i),
      tap: async (item) => {
        if (item) return g.nope();
        if (!power()) return say('radio.stationNoPower');
        if (sel === i) return select(-1);
        select(i);
        g.audio.sfx('click');
        if (!g.flag('rl.cableHow')) {
          g.set('rl.cableHow');
          return say('radio.cableHow');
        }
      },
    })),
    ...sockets.map((_, i): Hotspot => ({
      id: 'socket' + i,
      obj: hSockets[i],
      when: () => g.viewName === 'station',
      tap: async (item) => {
        if (item) return g.nope();
        if (CABLES.some((c, k) => c === i && plugged(k))) return say('radio.hear.' + SHOPS[i].id);
        return plugInto(i);
      },
    })),
    { id: 'drawer', obj: hDrawer, view: 'station', tap: async (item) => {
      if (item) return g.nope();
      if (!stationDone()) return say('radio.drawerShut');
      if (micTaken()) return say('radio.drawerEmpty');
      g.audio.sfx('paper');
      await g.ui.doc(t('radio.noteTitle'), t('radio.note'));
      g.note('note.roofStation');
      dNote.visible = mic.visible = false;
      g.set('rl.mic');
      g.give('contactmic');
      g.audio.sfx('pickup');
      return g.say([{ who: 'diego', key: 'radio.micTaken1' }, { who: 'diego', key: 'radio.micTaken2' }]);
    } },
    { id: 'station', obj: hStation, view: 'station', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('rl.stationSeen')) {
        g.set('rl.stationSeen');
        return g.say([{ who: 'diego', key: 'radio.station1' }, { who: 'diego', key: power() ? 'radio.station2' : 'radio.stationNoPower' }]);
      }
      return say(stationDone() ? 'radio.stationDone' : power() ? 'radio.pickCable' : 'radio.stationNoPower');
    } },
    { id: 'up', obj: hStairs, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(6, 0.4, false);
      return g.go('radio_negozio');
    } },
  ];

  return {
    id: 'radio_cantina',
    nameKey: 'place.radioCantina',
    next: ['radio_negozio'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'radio_negozio',
    dark: () => !power(),
    views: {
      main: { pos: [0.3, 1.65, 1.5], look: [-0.1, 1.15, -1.5], yaw: 65, pitch: 18 },
      panel: { pos: [bxX, 1.5, -0.55], look: [bxX, 1.42, -D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      shelf: { pos: [0.95, 1.5, -0.4], look: [sx, 1.0, sz], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      station: { pos: [tX, 1.5, tZ + 1.5], look: [tX, 1.12, -D / 2], parent: 'main', yaw: 18, pitch: 14, fov: 58 },
    },
    hotspots,
    update: (dt, time) => motes.update(dt, time),
    enter: async () => {
      if (!g.flag('rl.cellar')) {
        g.set('rl.cellar');
        await sleep(300);
        await say('radio.cellarEnter');
      }
    },
    hint: () => radioHint(g),
    debug: { loose, test, insert, plugInto, select, CABLES },
  };
}
