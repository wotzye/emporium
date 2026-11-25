import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, textPlane, hitBox, canvasTex, liveCanvas, noise, woodMaterial, mat, cyl } from '../builders';
import { t } from '../i18n';
import { lisaInk, onWall } from './lisa_uv';
import { fotoWall, safelight, sleep } from './foto_common';

/**
 * The darkroom. No light without the red safelight, and its bulb isn't here: «lent to E. Bassi»
 * (it's in Ada's attic). With the red light on — the only colour in the whole game — develop the
 * sheet waiting under the enlarger: developer, stop, fixer. The trays aren't labelled with words,
 * only with a sign each; the bottles on the shelf tell you which sign is which. Shake the phone
 * to rock the developer. The print shows the archive cabinet, one drawer marked: 31.
 */
type Tray = 'dev' | 'stop' | 'fix';
const ORDER: Tray[] = ['dev', 'stop', 'fix'];
// left to right on the bench: fixer, developer, stop (so the order isn't simply left to right)
const TRAYS: { id: Tray; x: number; sign: string }[] = [
  { id: 'fix', x: -0.55, sign: '■' },
  { id: 'dev', x: 0, sign: '▲' },
  { id: 'stop', x: 0.55, sign: '●' },
];

export function createFotoOscura(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.02;
  const W = 3.6, H = 2.6, D = 3.4;
  const woodDark = woodMaterial({ base: '#241b14' });
  scene.add(room(W, H, D, {
    wall: fotoWall(),
    floor: woodMaterial({ base: '#2a2119', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#1e1915', repeat: [2, 2], plank: true }),
  }));
  // Lisa's message, in invisible ink (UV torch)
  scene.add(onWall(lisaInk(g, 'foto'), 'right', W, D, 0.3, 1.9));
  scene.add(new THREE.AmbientLight(0xffffff, 0.015));

  // ---------------- the safelight over the bench ----------------
  const bulbIn = () => !!g.flag('f.bulb');
  const benchZ = -D / 2 + 0.45, benchY = 0.9;
  let sl = safelight(bulbIn());
  sl.group.position.set(0, 2.0, -D / 2 + 0.08);
  scene.add(sl.group);
  const red = new THREE.PointLight(0xff2010, bulbIn() ? 6 : 0, 5, 1.4);
  red.position.set(0, 1.9, -D / 2 + 0.4);
  scene.add(red);
  const lentNote = textPlane([t('foto.lentNote')], 0.32, 0.08, { bg: '#d9cfb6', size: 18, px: 64, font: "'Bradley Hand', 'Segoe Print', cursive" });
  lentNote.position.set(0, 1.83, -D / 2 + 0.02);
  lentNote.visible = !bulbIn();
  scene.add(lentNote);

  // ---------------- the bench, the three trays, the enlarger ----------------
  scene.add(rbox(1.9, 0.05, 0.75, 0.01, woodDark, 0, benchY, benchZ));
  scene.add(rbox(1.85, benchY, 0.7, 0.01, woodDark, 0, benchY / 2, benchZ));
  const liquid = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.05, metalness: 0.3 });
  // in the dark (no safelight yet) every label is just a pale smudge: nothing can be read
  const readables: { m: THREE.MeshStandardMaterial; map: THREE.Texture | null }[] = [];
  const smudge = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#3a3733';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 600, 0.3);
  });
  const readable = (o: THREE.Mesh) => {
    const m = o.material as THREE.MeshStandardMaterial;
    readables.push({ m, map: m.map });
    return o;
  };
  const setReadable = (on: boolean) => {
    for (const r of readables) {
      r.m.map = on ? r.map : smudge;
      r.m.needsUpdate = true;
    }
  };
  TRAYS.forEach((tr) => {
    scene.add(rbox(0.42, 0.06, 0.32, 0.01, mat(0xd8d2c6, { roughness: 0.3 }), tr.x, benchY + 0.055, benchZ + 0.05));
    const l = mesh(new THREE.PlaneGeometry(0.38, 0.28), liquid, tr.x, benchY + 0.08, benchZ + 0.05, false);
    l.rotation.x = -Math.PI / 2;
    scene.add(l);
    const s = textPlane([tr.sign], 0.08, 0.06, { bg: '#d8d2c6', fg: '#111', size: 40, px: 48 });
    s.position.set(tr.x, benchY + 0.055, benchZ + 0.215);
    scene.add(readable(s));
  });
  // the enlarger, at the left end, with the sheet of paper waiting under it
  const enlX = -0.75;
  scene.add(cyl(0.02, 0.02, 1.0, mat(0x2a2826, { metalness: 0.7 }), enlX - 0.25, benchY + 0.5, benchZ - 0.2, 8));
  scene.add(rbox(0.22, 0.25, 0.22, 0.02, mat(0x1c1a18), enlX - 0.12, benchY + 0.85, benchZ - 0.05));
  // ...the enlarger stands at the back, the paper at the front left of the bench
  const paperHome = new THREE.Vector3(-0.15, benchY + 0.03, benchZ + 0.3);
  const printCv = liveCanvas(256, 192);
  let devK = g.flag('f.print') ? 1 : 0;
  let burnt = false;
  const drawPrint = () => {
    const c = printCv.ctx;
    c.fillStyle = burnt ? '#141414' : '#f2eee6';
    c.fillRect(0, 0, 256, 192);
    if (!burnt && devK > 0) {
      c.globalAlpha = devK;
      // a cabinet of little drawers, 8 by 5, and a pale hand pointing at one
      c.fillStyle = '#4a4036';
      c.fillRect(40, 20, 176, 150);
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 8; k++) {
          c.fillStyle = r === 3 && k === 6 ? '#e8e2d6' : '#2a241e';
          c.fillRect(46 + k * 21, 26 + r * 28, 17, 22);
          c.fillStyle = '#8a7c66';
          c.fillRect(52 + k * 21, 40 + r * 28, 5, 2);
        }
      c.fillStyle = 'rgba(240,236,228,0.8)';
      c.beginPath();
      c.ellipse(190, 150, 12, 26, -0.6, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    noise(c, 256, 192, 1200, 0.1);
    printCv.update();
  };
  drawPrint();
  const paper = new THREE.Group();
  const sheet = mesh(new THREE.PlaneGeometry(0.24, 0.18), new THREE.MeshStandardMaterial({ map: printCv.tex, roughness: 0.6 }), 0, 0, 0, false);
  sheet.rotation.x = -Math.PI / 2;
  paper.add(sheet);
  paper.add(hitBox(0.28, 0.05, 0.22, 0, 0.01, 0, 'paperGrip'));
  paper.position.copy(paperHome);
  scene.add(paper);
  let step = 0; // how many trays done in the right order
  if (g.flag('f.print')) {
    step = 3;
    paper.position.set(0.55, 1.25, -D / 2 + 0.05); // pegged on the line to dry
    paper.rotation.x = Math.PI / 2;
  }

  // ---------------- the shelf of bottles (the key to the signs) ----------------
  const bottles: [string, string][] = [[t('foto.bottleDev'), '▲'], [t('foto.bottleStop'), '●'], [t('foto.bottleFix'), '■']];
  scene.add(rbox(1.2, 0.03, 0.22, 0.005, woodDark, W / 2 - 0.75, 1.45, -D / 2 + 0.13));
  bottles.forEach(([name, sign], i) => {
    const x = W / 2 - 1.15 + i * 0.4;
    scene.add(cyl(0.06, 0.07, 0.24, new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.15, transparent: true, opacity: 0.85 }), x, 1.585, -D / 2 + 0.13, 12));
    const lb = textPlane([name, sign], 0.12, 0.11, { bg: '#e2dccb', size: 20, px: 96 });
    lb.position.set(x, 1.58, -D / 2 + 0.2);
    scene.add(readable(lb));
  });
  // the chart on the wall: the order of the baths
  const chart = textPlane([t('foto.chart1'), t('foto.chart2'), t('foto.chart3'), t('foto.chart4')], 0.6, 0.5, { bg: '#d9d2c0', size: 20, px: 128 });
  chart.position.set(-W / 2 + 0.02, 1.6, -0.3);
  chart.rotation.y = Math.PI / 2;
  scene.add(readable(chart));
  setReadable(bulbIn());
  // the line with pegs, for drying prints
  scene.add(cyl(0.004, 0.004, 1.4, mat(0x777777), 0.3, 1.38, -D / 2 + 0.05, 4).rotateZ(Math.PI / 2));
  // the light-tight door
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, 0, 1.025, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hLight = hitBox(0.4, 0.4, 0.3, 0, 1.95, -D / 2 + 0.15, 'safelight');
  const hBottles = hitBox(1.3, 0.35, 0.3, W / 2 - 0.75, 1.6, -D / 2 + 0.15, 'bottles');
  const hChart = hitBox(0.2, 0.6, 0.7, -W / 2 + 0.1, 1.6, -0.3, 'chart');
  const hPrint = hitBox(0.3, 0.3, 0.2, 0.55, 1.25, -D / 2 + 0.1, 'print');
  const hBench = hitBox(1.9, 0.3, 0.75, 0, benchY + 0.1, benchZ, 'bench');
  const hDoor = hitBox(1.0, 2.1, 0.2, 0, 1.05, D / 2 - 0.1, 'door');
  scene.add(hLight, hBottles, hChart, hPrint, hBench, hDoor);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'safelight', obj: hLight, view: 'lamp', tap: async (item) => {
      if (bulbIn()) {
        if (item) return g.nope();
        return say('foto.redOn');
      }
      if (item === 'redbulb') {
        g.deselect();
        g.take('redbulb');
        g.set('f.bulb');
        g.audio.sfx('switch');
        scene.remove(sl.group);
        sl = safelight(true);
        sl.group.position.set(0, 2.0, -D / 2 + 0.08);
        scene.add(sl.group);
        lentNote.visible = false;
        setReadable(true);
        for (let i = 0; i <= 20; i++) {
          red.intensity = (i / 20) * 6;
          await sleep(30);
        }
        return g.say([{ who: 'diego', key: 'foto.red1' }, { who: 'diego', key: 'foto.red2' }]);
      }
      if (item) return g.nope();
      return say('foto.noBulb');
    } },
    { id: 'bottles', obj: hBottles, view: 'shelf', tap: async (item) => {
      if (item) return g.nope();
      return say(bulbIn() ? 'foto.bottles' : 'foto.tooDark');
    } },
    { id: 'chart', obj: hChart, view: 'chart', tap: async (item) => {
      if (item) return g.nope();
      if (!bulbIn()) return say('foto.tooDark');
      g.note('note.baths');
      return say('foto.chartRead');
    } },
    { id: 'print', obj: hPrint, when: () => step === 3, tap: async (item) => {
      if (item) return g.nope();
      g.note('note.drawer');
      return g.say([{ who: 'diego', key: 'foto.print1' }, { who: 'diego', key: 'foto.print2' }]);
    } },
    { id: 'bench', obj: hBench, view: 'bench', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (!bulbIn()) return say('foto.benchDark');
      if (step === 3) return say('foto.benchDone');
      return say(step === 0 ? 'foto.bench' : 'foto.benchGoing');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(2, 0.45, false);
      return g.go('foto_studio');
    } },
  ];

  // ---------------- direct manipulation: the sheet through the baths ----------------
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(benchY + 0.03));
  const restart = async (why: string) => {
    burnt = true;
    drawPrint();
    g.audio.sfx('wrong');
    await say(why);
    // a fresh sheet from the box
    await sleep(400);
    burnt = false;
    devK = 0;
    step = 0;
    drawPrint();
    paper.position.copy(paperHome);
  };
  const interactions: Interaction[] = [
    {
      kind: 'drag',
      obj: paper,
      plane,
      when: () => g.viewName === 'bench' && bulbIn() && step < 3,
      onStart: () => g.audio.sfx('paper'),
      onMove: () => {
        paper.position.y = benchY + 0.1;
      },
      onEnd: async () => {
        paper.position.y = benchY + 0.03;
        const tr = TRAYS.find((q) => Math.abs(paper.position.x - q.x) < 0.2 && Math.abs(paper.position.z - (benchZ + 0.05)) < 0.18);
        if (!tr) return;
        paper.position.set(tr.x, benchY + 0.075, benchZ + 0.05);
        g.audio.sfx('water');
        if (tr.id !== ORDER[step]) return restart(step === 0 ? 'foto.wrongFirst' : 'foto.wrongBath');
        if (tr.id === 'dev') {
          // rock the tray: the image comes up out of nothing
          const ok = await g.physical('shake', 'foto.shakeText');
          if (!ok) {
            paper.position.copy(paperHome);
            return;
          }
          for (let i = 0; i <= 30; i++) {
            devK = i / 30;
            drawPrint();
            await sleep(60);
          }
          step = 1;
          return say('foto.devDone');
        }
        if (tr.id === 'stop') {
          step = 2;
          return say('foto.stopDone');
        }
        // fixer: done. Peg it on the line.
        step = 3;
        g.set('f.print');
        await sleep(600);
        paper.position.set(0.55, 1.25, -D / 2 + 0.05);
        paper.rotation.x = Math.PI / 2;
        g.audio.sfx('whisper');
        g.note('note.drawer');
        return g.say([{ who: 'diego', key: 'foto.print1' }, { who: 'diego', key: 'foto.print2' }]);
      },
    },
  ];

  return {
    id: 'foto_oscura',
    nameKey: 'place.fotoOscura',
    next: ['foto_studio'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'foto_studio',
    dark: () => !bulbIn(),
    views: {
      main: { pos: [0.5, 1.6, 1.2], look: [-0.1, 1.2, -1.4], yaw: 60, pitch: 18 },
      bench: { pos: [0, 1.6, benchZ + 0.85], look: [0, benchY, benchZ + 0.02], parent: 'main', yaw: 20, pitch: 10, fov: 58 },
      lamp: { pos: [0, 1.55, -0.2], look: [0, 1.9, -D / 2], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      shelf: { pos: [W / 2 - 0.75, 1.6, -0.3], look: [W / 2 - 0.75, 1.55, -D / 2], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      chart: { pos: [-0.5, 1.6, -0.3], look: [-W / 2, 1.6, -0.3], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
    },
    hotspots,
    interactions,
    enter: async () => {
      if (!g.flag('f.darkEntered')) {
        g.set('f.darkEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.dark1' }, { who: 'diego', key: 'foto.dark2' }]);
      }
    },
    hint: () => {
      if (!bulbIn()) return g.has('redbulb') ? 'hint.foto.bulbIn' : 'hint.foto.needBulb';
      if (step < 3) return g.save.notebook.includes('note.baths') ? 'hint.foto.baths' : 'hint.foto.chart';
      return 'hint.foto.archive';
    },
    debug: { paper, trays: TRAYS.map((q) => new THREE.Vector3(q.x, benchY + 0.03, benchZ + 0.05)), getStep: () => step },
  };
}
