import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, box, cyl, mat, mesh, rbox, lathe, fx, dust, textPlane, hitBox, canvasTex, noise, woodMaterial, stoneMaterial, drapedSheet, liveCanvas } from '../builders';
import { t } from '../i18n';
import { createBarberGhost } from '../characters';
import { prop } from '../models';

/**
 * The barber's cellar: dark, damp, full of mirrors covered with sheets.
 * Pull the sheets off. One of them hides the clock. Set it to ten past ten.
 */
export function createBarbiereCantina(g: Game): Location {
  g.location('barbiere'); // the shop itself sets up the leather case and the finale
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 7);
  scene.userData.envIntensity = 0.04;
  const W = 5, H = 2.4, D = 4.5;
  scene.add(room(W, H, D, {
    wall: stoneMaterial([2.5, 1.2]),
    floor: stoneMaterial([3, 3], '#55514a'),
    ceil: woodMaterial({ base: '#241b13', repeat: [3, 1], plank: true }),
  }));
  const woodDark = woodMaterial({ base: '#2e2218' });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2f2d2b, roughness: 0.6, metalness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a7a52, metalness: 1, roughness: 0.4 });
  for (let x = -2; x <= 2; x += 1) scene.add(rbox(0.14, 0.16, D, 0.03, woodDark, x, H - 0.08, 0));

  // almost no light: a crack of grey from the trapdoor, and the torch
  scene.add(new THREE.AmbientLight(0xffffff, 0.07));
  const crack = new THREE.SpotLight(0xd8dee6, 10, 6, 0.55, 0.8, 1.3);
  crack.position.set(1.8, H + 0.3, 1.7);
  crack.target.position.set(1.4, 0, 1.2);
  scene.add(crack, crack.target);
  const cage = prop('cagedLight', { height: 0.45 });
  const cagePivot = new THREE.Group();
  if (cage) {
    cage.position.y = -0.45;
    cagePivot.add(cage);
    cagePivot.position.set(-0.2, H, 0.2);
    cagePivot.traverse((o) => (o.userData.noPick = true));
    scene.add(cagePivot);
  }
  const motes = dust([-2.3, 0.1, -2.1], [2.3, 2.3, 2.1], 160);
  scene.add(motes.points);

  // stairs down from the trapdoor
  for (let k = 0; k < 7; k++) scene.add(rbox(0.8, 0.06, 0.3, 0.01, woodDark, 1.9, 0.33 * k + 0.03, 2.05 - k * 0.22));
  scene.add(rbox(0.04, 2.4, 1.6, 0.01, woodDark, 1.48, 1.0, 1.4));

  // wine racks and junk
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 6; k++) {
      const b = cyl(0.04, 0.04, 0.3, new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.1 }), -2.3, 0.25 + r * 0.22, 0.3 + k * 0.18, 10);
      b.rotation.z = Math.PI / 2;
      scene.add(b);
    }
  scene.add(rbox(0.35, 1.0, 1.2, 0.02, woodDark, -2.3, 0.5, 0.75));
  // an old barber chair, broken, on its side
  const oldChair = new THREE.Group();
  oldChair.add(rbox(0.6, 0.14, 0.55, 0.04, mat(0x1c1a18), 0, 0.3, 0));
  oldChair.add(rbox(0.6, 0.7, 0.12, 0.04, mat(0x1c1a18), 0, 0.3, 0.33).rotateX(-1.3));
  oldChair.add(lathe([[0, 0], [0.28, 0], [0.2, 0.06], [0.07, 0.1], [0, 0.1]], iron, 0.3, 0.1, -0.2, 20).rotateZ(1.4));
  oldChair.position.set(0.3, 0, 0.9);
  oldChair.rotation.y = 0.6;
  const realChair = prop('barberChair', { height: 1.25 });
  if (realChair) {
    // the old chair, dumped on its side
    oldChair.clear();
    realChair.rotation.z = Math.PI / 2;
    realChair.position.set(0.32, 0, 0);
    oldChair.add(realChair);
  }
  scene.add(oldChair);
  // junk: a crate, a bucket, a dead lantern
  const junk: [Parameters<typeof prop>[0], number, number, number, number?][] = [
    ['crate', 1.75, -1.75, 0.3],
    ['bucket', 1.45, 1.75, 0],
    ['lantern', 1.6, -1.75, 0.9, 0.35],
  ];
  for (const [id, x, z, ry, y] of junk) {
    const pr = prop(id);
    if (!pr) continue;
    pr.position.set(x, y ?? 0, z);
    pr.rotation.y = ry;
    scene.add(pr);
  }

  // ---------------- the clock (under a sheet) ----------------
  const clock = new THREE.Group();
  clock.add(rbox(0.6, 1.5, 0.2, 0.03, woodDark, 0, 0.75, 0));
  clock.add(rbox(0.66, 0.12, 0.24, 0.03, woodDark, 0, 1.55, 0));
  const faceCv = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#d8d1bd';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1b1712';
    c.font = 'bold 26px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2;
      c.fillText(n, w / 2 + Math.sin(a) * 98, h / 2 - Math.cos(a) * 98);
    });
    noise(c, w, h, 2000, 0.12);
  });
  clock.add(mesh(new THREE.CircleGeometry(0.2, 40), new THREE.MeshStandardMaterial({ map: faceCv, roughness: 0.5 }), 0, 1.15, 0.105, false));
  const hourHand = new THREE.Group();
  hourHand.add(box(0.012, 0.11, 0.004, mat(0x111111), 0, 0.045, 0));
  hourHand.position.set(0, 1.15, 0.112);
  clock.add(hourHand);
  const minuteHand = new THREE.Group();
  minuteHand.add(box(0.008, 0.17, 0.004, mat(0x111111), 0, 0.075, 0));
  minuteHand.add(hitBox(0.42, 0.42, 0.06, 0, 0, 0.03, 'clockGrip'));
  minuteHand.position.set(0, 1.15, 0.116);
  clock.add(minuteHand);
  clock.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), brass).translateY(1.15).translateZ(0.12));
  // the pendulum door: opens when the time is right
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.22, 0.45, 0.105);
  doorPivot.add(rbox(0.44, 0.6, 0.02, 0.01, woodDark, 0.22, 0, 0));
  doorPivot.add(fx(mesh(new THREE.PlaneGeometry(0.3, 0.45), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, metalness: 1, roughness: 0.05 }), 0.22, 0, 0.012, false)));
  clock.add(doorPivot);
  const caseInClock = rbox(0.12, 0.06, 0.3, 0.02, mat(0x3a2a1e, { roughness: 0.5 }), 0, 0.3, 0.02);
  caseInClock.rotation.x = Math.PI / 2;
  clock.add(caseInClock);
  clock.position.set(-0.7, 0, -2.1);
  scene.add(clock);
  let minutes = Number(g.flag('c.minutes') ?? 213); // stopped at 3:33
  const setHands = () => {
    minuteHand.rotation.z = -((minutes % 60) / 60) * Math.PI * 2;
    hourHand.rotation.z = -(((minutes / 60) % 12) / 12) * Math.PI * 2;
  };
  setHands();
  // the minute hand is missing: Aldo took it to the clockmaker's to be straightened (it's at L'Ora Ferma).
  // An old save that already turned it keeps it.
  const haveHand = () => !!g.flag('c.hand') || !!g.flag('c.clock') || g.flag('c.minutes') !== undefined;
  const handBar = minuteHand.children[0];
  handBar.visible = haveHand();
  if (g.flag('c.clock')) doorPivot.rotation.y = -1.8;
  caseInClock.visible = !!g.flag('c.clock') && !g.has('case') && !g.flag('razor');

  // writing on the wall that only shows in the torchlight
  const writing = textPlane([t('cantina.wall1'), t('cantina.wall2')], 1.3, 0.5, { bg: 'transparent', fg: '#e8e4da', size: 36, px: 192, font: "'Bradley Hand', 'Segoe Print', cursive" });
  const wm = writing.material as THREE.MeshStandardMaterial;
  wm.opacity = 0;
  wm.emissive = new THREE.Color(0xffffff);
  wm.emissiveMap = wm.map;
  wm.emissiveIntensity = 0.6;
  writing.position.set(0.55, 1.65, -2.24);
  scene.add(fx(writing));

  // ---------------- mirrors, all covered ----------------
  type Covered = { id: string; sheet: THREE.Mesh; base: THREE.Vector3; under: THREE.Object3D; pulled: boolean };
  const covered: Covered[] = [];
  const addMirror = (id: string, x: number, z: number, ry: number) => {
    const m = new THREE.Group();
    m.add(rbox(0.7, 1.7, 0.06, 0.02, woodDark, 0, 0.85, 0));
    m.add(mesh(new THREE.PlaneGeometry(0.58, 1.55), new THREE.MeshStandardMaterial({ color: 0x3a3f43, roughness: 0.05, metalness: 1, envMapIntensity: 1.2 }), 0, 0.88, 0.035, false));
    m.position.set(x, 0, z);
    m.rotation.set(-0.08, ry, 0);
    scene.add(m);
    return m;
  };
  const mirrorA = addMirror('mA', 1.2, -2.05, 0);
  const mirrorB = addMirror('mB', -2.3, -1.1, Math.PI / 2);
  const mirrorC = addMirror('mC', 2.3, -0.6, -Math.PI / 2);
  const addSheet = (id: string, under: THREE.Object3D, w: number, h: number) => {
    const s = drapedSheet(w, h, 0.25);
    const wp = under.getWorldPosition(new THREE.Vector3());
    const q = under.getWorldQuaternion(new THREE.Quaternion());
    s.quaternion.copy(q);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    s.position.copy(wp).add(new THREE.Vector3(0, h / 2 + 0.02, 0)).add(fwd.multiplyScalar(0.06));
    const base = s.position.clone();
    const pulled = !!g.flag('c.sheet.' + id);
    if (pulled) dropSheet(s, true);
    scene.add(s);
    covered.push({ id, sheet: s, base, under, pulled });
  };
  const dropSheet = (s: THREE.Mesh, instant: boolean) => {
    const end = () => {
      s.scale.set(1, 0.12, 1);
      s.position.y = 0.05;
      s.rotation.x = -1.2;
    };
    if (instant) return end();
    const y0 = s.position.y;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min((performance.now() - t0) / 500, 1);
      s.position.y = y0 - (y0 - 0.05) * k * k;
      s.scale.y = 1 - 0.88 * k;
      s.rotation.x = -1.2 * k;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  };
  addSheet('clock', clock, 0.8, 1.75);
  addSheet('mA', mirrorA, 0.85, 1.85);
  addSheet('mB', mirrorB, 0.85, 1.85);
  addSheet('mC', mirrorC, 0.85, 1.85);

  // the old barber, glimpsed in one mirror
  const ghostC = createBarberGhost();
  ghostC.group.position.set(-1.2, 0, 0.6);
  ghostC.group.rotation.y = -1.9;
  ghostC.setOpacity(0);
  ghostC.group.traverse((o) => (o.userData.noPick = true));
  scene.add(ghostC.group);

  // ---------------- hotspots ----------------
  const hClock = hitBox(0.8, 1.8, 0.5, -0.7, 0.9, -2.0, 'clock');
  const hStairs = hitBox(0.9, 2.2, 1.6, 1.9, 1.1, 1.5, 'stairs');
  const hRack = hitBox(0.5, 1.1, 1.4, -2.25, 0.55, 0.75, 'rack');
  const hChair = hitBox(0.9, 0.8, 0.9, 0.3, 0.35, 0.9, 'oldchair');
  scene.add(hClock, hStairs, hRack, hChair);
  const sheetPulled = (id: string) => covered.find((c) => c.id === id)!.pulled;

  const hotspots: Hotspot[] = [
    { id: 'clock', obj: hClock, view: 'clock', tap: async (item) => {
      if (item === 'minutehand' && sheetPulled('clock') && !haveHand()) {
        g.deselect();
        g.take('minutehand');
        g.set('c.hand');
        handBar.visible = true;
        g.audio.sfx('click');
        return g.say('cantina.handOn');
      }
      if (item) return g.nope();
      if (!sheetPulled('clock')) return g.say('cantina.sheet');
      if (!haveHand()) return g.say('cantina.noHand');
      if (g.flag('c.clock')) {
        if (caseInClock.visible) {
          caseInClock.visible = false;
          g.give('case');
          return g.say('bar.caseFound');
        }
        return g.say('cantina.clockEmpty');
      }
      return g.say('cantina.clock');
    } },
    { id: 'stairs', obj: hStairs, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(4, 0.4, false);
      return g.go('barbiere_retro');
    } },
    { id: 'rack', obj: hRack, tap: async (item) => {
      if (item) return g.nope();
      await g.say('cantina.rack');
    } },
    { id: 'oldchair', obj: hChair, tap: async (item) => {
      if (item) return g.nope();
      await g.say('cantina.oldChair');
    } },
  ];

  // ---------------- direct manipulation ----------------
  const interactions: Interaction[] = [];
  for (const c of covered) {
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(c.sheet.quaternion);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, c.base);
    interactions.push({
      kind: 'drag',
      obj: c.sheet,
      plane,
      when: () => !c.pulled,
      onStart: () => g.audio.sfx('sheet'),
      onMove: () => {
        // a sheet only comes down
        c.sheet.position.x = c.base.x;
        c.sheet.position.z = c.base.z;
        c.sheet.position.y = Math.min(c.base.y, c.sheet.position.y);
      },
      onEnd: async () => {
        if (c.sheet.position.y < c.base.y - 0.3) {
          c.pulled = true;
          g.set('c.sheet.' + c.id);
          g.audio.sfx('sheet');
          dropSheet(c.sheet, false);
          await sleep(500);
          if (c.id === 'clock') return g.say('cantina.clockFound');
          if (c.id === 'mB' && !g.flag('c.glimpse')) {
            // in that mirror, for a moment, someone is standing behind you
            g.set('c.glimpse');
            g.audio.hush(4);
            ghostC.setOpacity(0.9);
            g.audio.sfx('breath');
            g.audio.rec('scratch', { gain: 1 });
            g.engine.torchFlicker = 1;
            await sleep(900);
            ghostC.setOpacity(0);
            g.engine.torchFlicker = 0;
            return g.say('cantina.glimpse');
          }
          return g.say('cantina.mirror');
        }
        c.sheet.position.copy(c.base);
      },
    });
  }
  let snapAcc = 0;
  interactions.push({
    kind: 'dial',
    obj: minuteHand,
    center: minuteHand.getWorldPosition(new THREE.Vector3()),
    when: () => sheetPulled('clock') && haveHand() && !g.flag('c.clock') && g.viewName === 'clock',
    onTurn: (d) => {
      minutes = (minutes + (d / (Math.PI * 2)) * 60 + 720) % 720;
      setHands();
      snapAcc += Math.abs(d);
      if (snapAcc > 0.5) {
        snapAcc = 0;
        g.audio.sfx('tick');
      }
    },
    onEnd: async () => {
      g.set('c.minutes', Math.round(minutes));
      if (Math.abs(minutes - 610) < 8 && !g.flag('c.clock')) {
        minutes = 610;
        setHands();
        g.set('c.clock');
        g.audio.sfx('unlock');
        await sleep(300);
        g.audio.sfx('creak');
        const t0 = performance.now();
        await new Promise<void>((res) => {
          const step = () => {
            const k = Math.min((performance.now() - t0) / 700, 1);
            doorPivot.rotation.y = -1.8 * k;
            if (k < 1) requestAnimationFrame(step);
            else res();
          };
          step();
        });
        caseInClock.visible = true;
        await g.say('cantina.clockOpen');
      }
    },
  });

  return {
    id: 'barbiere_cantina',
    nameKey: 'place.barbiereCantina',
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'barbiere_retro',
    views: {
      main: { pos: [1.05, 1.55, 1.45], look: [-0.6, 1.0, -1.6], yaw: 60, pitch: 18 },
      clock: { pos: [-0.65, 1.35, -1.1], look: [-0.7, 1.1, -2.1], parent: 'main', yaw: 25, pitch: 12 },
    },
    hotspots,
    interactions,
    dark: () => true,
    update: (dt, time) => {
      // the dead lamp swings, as if someone just brushed past it
      cagePivot.rotation.z = Math.sin(time * 1.3) * 0.08 + (g.flag('c.glimpse') ? Math.sin(time * 2.1) * 0.05 : 0);
      cagePivot.rotation.x = Math.sin(time * 0.9) * 0.04;
      motes.update(dt, time);
      wm.opacity = g.torchOn(writing) * 0.95;
      if (ghostC.group.visible) ghostC.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('c.entered')) {
        g.set('c.entered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'cantina.enter1' }, { who: 'diego', key: 'cantina.enter2' }]);
      }
    },
    hint: () => {
      if (!sheetPulled('clock')) return 'hint.cantina.sheets';
      if (!haveHand()) return g.has('minutehand') ? 'hint.cantina.handOn' : 'hint.cantina.noHand';
      if (!g.flag('c.clock')) return 'hint.cantina.clock';
      if (caseInClock.visible) return 'hint.cantina.take';
      return 'hint.cantina.up';
    },
    debug: { covered, minuteHand, getMinutes: () => minutes, setMinutes: (m: number) => { minutes = m; setHands(); } },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
