import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, dust, hitBox, canvasTex, noise, woodMaterial, stoneMaterial, mat, cyl } from '../builders';
import { cursify, prop } from '../models';
import { t } from '../i18n';
import { gear, brassMat, steelMat, pendulum, wallClock } from './ora_common';

/**
 * The clock tower above the shop: the great movement that drives every clock in L'Ora Ferma.
 * The weights are down; a wooden wedge is jammed in the escapement. Wind it with the key from the
 * workshop, pull the wedge, and time starts again. Something red falls out of the gears.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createOraTorre(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 9);
  scene.userData.envIntensity = 0.06;
  const W = 3.6, H = 4.2, D = 3.6;
  scene.add(room(W, H, D, {
    wall: stoneMaterial([2, 2], '#5d5850'),
    floor: woodMaterial({ base: '#3a2d20', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#221b14', repeat: [2, 2], plank: true }),
  }));
  const brass = brassMat();
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2b29, metalness: 0.8, roughness: 0.55 });
  const steel = steelMat();
  const woodDark = woodMaterial({ base: '#2b2017' });
  const restarted = () => !!g.flag('o.restarted');

  // the back of the big dial lets in a grey, backwards light
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const dialTex = canvasTex(512, 512, (c, w) => {
    const r = w / 2;
    c.fillStyle = '#9aa2a8';
    c.beginPath();
    c.arc(r, r, r, 0, Math.PI * 2);
    c.fill();
    noise(c, w, w, 6000, 0.15);
    c.save();
    c.translate(w, 0);
    c.scale(-1, 1); // seen from behind: numerals reversed
    c.fillStyle = 'rgba(30,30,30,0.6)';
    c.font = 'bold 44px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    ['XII', 'III', 'VI', 'IX'].forEach((n, i) => {
      const a = (i / 4) * Math.PI * 2;
      c.fillText(n, r + Math.sin(a) * (r - 60), r - Math.cos(a) * (r - 60));
    });
    c.restore();
  });
  const dial = mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshBasicMaterial({ map: dialTex, color: 0x5a5a5a, transparent: true, opacity: 0.8 }), 0, 2.4, -D / 2 + 0.02, false);
  scene.add(dial);
  const back = new THREE.SpotLight(0xc8d0d8, 8, 6, 0.8, 0.9, 1.3);
  back.position.set(0, 2.4, -D / 2 - 0.3);
  back.target.position.set(0, 1.2, 0.5);
  scene.add(back, back.target);
  // the big hands' shaft through the wall
  const shaft = cyl(0.03, 0.03, 0.9, steel, 0, 2.4, -D / 2 + 0.45, 12).rotateX(Math.PI / 2);
  scene.add(shaft);
  const big = wallClock(0.5, { roman: true });
  big.group.visible = false;
  const motes = dust([-1.7, 0.2, -1.7], [1.7, 3.8, 1.7], 200);
  scene.add(motes.points);

  // ---------------- the movement: an iron frame full of wheels ----------------
  const frame = new THREE.Group();
  frame.add(rbox(1.6, 0.08, 0.08, 0.01, iron, 0, 1.6, 0.3));
  frame.add(rbox(1.6, 0.08, 0.08, 0.01, iron, 0, 1.6, -0.3));
  frame.add(rbox(1.6, 0.08, 0.08, 0.01, iron, 0, 0.6, 0.3));
  frame.add(rbox(1.6, 0.08, 0.08, 0.01, iron, 0, 0.6, -0.3));
  for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) frame.add(rbox(0.08, 1.1, 0.08, 0.01, iron, x, 1.1, z));
  frame.position.set(0, 0, -0.6);
  scene.add(frame);
  const wheels: { o: THREE.Object3D; speed: number }[] = [];
  const wheelDefs: [number, number, number, number, number][] = [
    // x, y, radius, teeth, speed
    [-0.45, 1.2, 0.32, 60, 0.2],
    [0.05, 1.3, 0.18, 36, -0.36],
    [0.35, 1.05, 0.22, 44, 0.3],
    [0.55, 1.4, 0.12, 24, -0.55],
  ];
  for (const [x, y, r, n, sp] of wheelDefs) {
    const w = gear(r, n, brass, 0.02);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, y, -0.6);
    scene.add(w);
    wheels.push({ o: w, speed: sp });
    scene.add(cyl(0.015, 0.015, 0.7, steel, x, y, -0.6, 8).rotateX(Math.PI / 2));
  }
  // the winding drum and its square socket, at the front left
  const drum = cyl(0.14, 0.14, 0.35, woodDark, -0.45, 0.85, -0.6, 20).rotateX(Math.PI / 2);
  scene.add(drum);
  const socket = rbox(0.05, 0.05, 0.04, 0.005, iron, -0.45, 0.85, -0.38);
  scene.add(socket);
  // the key, once inserted, with a crank handle you turn
  const keyIn = new THREE.Group();
  keyIn.add(cyl(0.012, 0.012, 0.18, steel, 0, 0, 0.09, 8).rotateX(Math.PI / 2));
  const keyArm = rbox(0.24, 0.03, 0.03, 0.006, steel, 0.1, 0, 0.18);
  keyIn.add(keyArm);
  keyIn.add(cyl(0.02, 0.02, 0.1, woodDark, 0.21, 0, 0.23, 10).rotateX(Math.PI / 2));
  keyIn.add(hitBox(0.5, 0.5, 0.3, 0.05, 0, 0.15, 'keyGrip'));
  keyIn.position.set(-0.45, 0.85, -0.38);
  keyIn.visible = !!g.flag('o.keyIn') && !restarted();
  scene.add(keyIn);
  // the weights on their chains
  const weights: THREE.Mesh[] = [];
  for (const x of [-0.9, 0.95]) {
    const wgt = cyl(0.09, 0.09, 0.4, iron, x, 0.25, -0.2, 14);
    scene.add(wgt);
    weights.push(wgt);
  }
  const chains = [-0.9, 0.95].map((x) => {
    const c = cyl(0.008, 0.008, 1, steel, x, 1.5, -0.2, 4);
    scene.add(c);
    return c;
  });
  let wound = Number(g.flag('o.wound') ?? 0); // 0..1
  if (restarted()) wound = 1;
  const setWeights = () => {
    weights.forEach((w, i) => {
      w.position.y = 0.25 + wound * 1.8;
      const top = 3.6;
      const c = chains[i];
      const len = top - (w.position.y + 0.2);
      c.scale.y = Math.max(0.05, len);
      c.position.y = w.position.y + 0.2 + len / 2;
    });
  };
  setWeights();
  // the pendulum, long, held by a wedge
  const pend = pendulum(1.8, 0.16, brass);
  pend.position.set(0.25, 2.3, 0.1);
  scene.add(pend);
  const wedge = new THREE.Group();
  const wedgeShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0.02), new THREE.Vector2(0.18, 0.06), new THREE.Vector2(0, 0.08)]);
  wedge.add(new THREE.Mesh(new THREE.ExtrudeGeometry(wedgeShape, { depth: 0.05, bevelEnabled: false }), woodMaterial({ base: '#7a6040' })));
  wedge.add(hitBox(0.3, 0.2, 0.2, 0.09, 0.04, 0.025, 'wedgeGrip'));
  wedge.position.set(0.32, 0.68, 0.06);
  wedge.rotation.z = 0.05;
  wedge.visible = !restarted();
  scene.add(wedge);
  const wedgeHome = wedge.position.clone();
  // the pocket watch, jammed in the wheels: only its chain hangs out until it falls
  const watch = new THREE.Group();
  const wc = wallClock(0.045, { roman: true, depth: 0.015 });
  watch.add(cursify(wc.group));
  watch.add(mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), new THREE.MeshStandardMaterial({ color: 0x8e0710, emissive: 0x9a0a12, emissiveIntensity: 0.55 }), 0, 0.055, 0));
  watch.position.set(0.05, 1.3, -0.5);
  watch.visible = !g.flag('watch') && !g.flag('placedWatch');
  scene.add(watch);
  const watchGlow = new THREE.PointLight(0xff2a2a, 0.6, 1.2, 2);
  watchGlow.position.copy(watch.position).add(new THREE.Vector3(0, 0, 0.2));
  scene.add(watchGlow);
  if (restarted()) watch.position.set(0.1, 0.03, 0.4);
  watch.rotation.x = restarted() ? -Math.PI / 2 : 0;
  // a ladder back down
  const ladder = prop('ladder', { height: 2.4 });
  if (ladder) {
    ladder.position.set(-1.3, 0, 1.3);
    ladder.rotation.y = 0.7;
    scene.add(ladder);
  }

  // ---------------- hotspots ----------------
  const hMove = hitBox(1.8, 1.2, 0.8, 0, 1.1, -0.6, 'movement');
  const hSocket = hitBox(0.3, 0.3, 0.3, -0.45, 0.85, -0.35, 'socket');
  const hWedge = hitBox(0.35, 0.25, 0.3, 0.42, 0.72, 0.1, 'wedge');
  const hWatch = hitBox(0.25, 0.25, 0.25, 0.05, 1.3, -0.45, 'watch');
  // once it has fallen, the hotspot lies on the floor with it (bigger: it's a small thing in the dark)
  const dropHit = () => {
    const ws = hotspotsRef.find((h) => h.id === 'watch');
    if (ws) ws.view = 'floor';
    hWatch.position.set(0.1, 0.1, 0.4);
    hWatch.scale.setScalar(1.6);
    watchGlow.position.set(0.1, 0.25, 0.55);
  };
  const hotspotsRef: Hotspot[] = [];
  const hDial = hitBox(2.0, 2.0, 0.2, 0, 2.4, -D / 2 + 0.1, 'dial');
  const hDown = hitBox(0.8, 1.6, 0.8, -1.3, 0.8, 1.3, 'down');
  scene.add(hMove, hSocket, hWedge, hWatch, hDial, hDown);
  const say = (key: string) => g.say(key);

  const restart = async () => {
    g.set('o.restarted');
    g.rebuild('ora_camera');
    wedge.visible = false;
    g.audio.sfx('clunk');
    g.engine.shake(0.04, 0.8);
    await sleep(500);
    g.audio.rec('bell', { gain: 0.9 });
    await sleep(900);
    g.audio.rec('bell', { gain: 0.7, rate: 0.94 });
    // the watch shakes loose and falls
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      watch.position.set(0.05 + k * 0.05, 1.3 - k * k * 1.27, -0.5 + k * 0.9);
      watch.rotation.x = -k * Math.PI / 2;
      await sleep(25);
    }
    g.audio.sfx('glass');
    dropHit();
    // for a moment the whole village beats at once, then only the tower ticks
    g.audio.setLoop('heartfast', 0.75, { tau: 0.2 });
    g.audio.setLoop('heart', 0.6, { tau: 0.2 });
    await say('ora.restarted1');
    g.audio.setLoop('heartfast', 0, { tau: 0.8 });
    g.audio.setLoop('heart', 0, { tau: 1.2 });
    g.audio.setLoop('towerclock', 0.45);
    await g.view('floor');
    await say('ora.restarted2');
  };

  const hotspots: Hotspot[] = hotspotsRef;
  hotspots.push(
    { id: 'watch', obj: hWatch, tap: async (item) => {
      if (item) return g.nope();
      if (!watch.visible) return;
      if (!restarted()) return say('ora.watchStuck');
      watch.visible = false;
      watchGlow.intensity = 0;
      g.set('watch');
      g.give('watch');
      g.audio.sfx('whisper');
      return g.say([{ who: 'diego', key: 'ora.watchTaken' }]);
    } },
    { id: 'socket', obj: hSocket, view: 'drum', tap: async (item) => {
      if (restarted()) return say('ora.runningNow');
      if (keyIn.visible) {
        if (item) return g.nope();
        return say(wound >= 1 ? 'ora.woundDone' : 'ora.turnKey');
      }
      if (item === 'windkey') {
        g.deselect();
        g.take('windkey');
        g.set('o.keyIn');
        keyIn.visible = true;
        g.audio.sfx('clunk');
        return say('ora.keyIn');
      }
      if (item) return g.nope();
      return say('ora.socket');
    } },
    { id: 'wedge', obj: hWedge, view: 'pendulum', tap: async (item) => {
      if (item) return g.nope();
      if (restarted()) return;
      return say(wound >= 1 ? 'ora.wedgePull' : 'ora.wedge');
    } },
    { id: 'movement', obj: hMove, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (watch.visible && !restarted()) {
        await g.view('watch');
        return say('ora.watchSeen');
      }
      return say(restarted() ? 'ora.movementRuns' : 'ora.movementStill');
    } },
    { id: 'dial', obj: hDial, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ora.dial');
    } },
    { id: 'down', obj: hDown, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  );
  if (restarted()) dropHit();

  // ---------------- direct manipulation ----------------
  scene.updateMatrixWorld(true);
  const keyCenter = keyIn.getWorldPosition(new THREE.Vector3());
  let keyAngle = 0;
  const pullPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -wedgeHome.z);
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: keyIn,
      center: keyCenter,
      when: () => g.viewName === 'drum' && keyIn.visible && wound < 1,
      onTurn: (d) => {
        d = Math.abs(d);
        keyAngle += d;
        keyIn.rotation.z = -keyAngle;
        drum.rotation.y += d * 0.3;
        wound = Math.min(1, wound + d / (Math.PI * 2 * 4));
        setWeights();
        if (Math.random() < 0.15) g.audio.sfx('click');
      },
      onEnd: async () => {
        g.set('o.wound', wound);
        if (wound >= 1 && !g.flag('o.woundSaid')) {
          g.set('o.woundSaid');
          g.audio.sfx('clunk');
          await say('ora.woundDone');
        }
      },
    },
    {
      kind: 'drag',
      obj: wedge,
      plane: pullPlane,
      when: () => g.viewName === 'pendulum' && !restarted() && wound >= 1,
      onStart: () => g.audio.sfx('scrape'),
      onMove: () => {
        wedge.position.y = THREE.MathUtils.clamp(wedge.position.y, wedgeHome.y - 0.1, wedgeHome.y + 0.1);
      },
      onEnd: async () => {
        if (wedge.position.distanceTo(wedgeHome) > 0.25) return restart();
        wedge.position.copy(wedgeHome);
      },
    },
  ];

  return {
    id: 'ora_torre',
    nameKey: 'place.oraTorre',
    scene,
    drone: 'orologi',
    startView: 'main',
    exitTo: 'ora_camera',
    views: {
      main: { pos: [1.2, 1.7, 1.5], look: [-0.1, 1.2, -0.8], yaw: 60, pitch: 20 },
      drum: { pos: [-0.25, 1.1, 0.35], look: [-0.45, 0.85, -0.45], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      pendulum: { pos: [0.6, 1.0, 1.05], look: [0.32, 0.72, 0.06], parent: 'main', yaw: 15, pitch: 10, fov: 55 },
      watch: { pos: [0.15, 1.4, 0.4], look: [0.05, 1.3, -0.5], parent: 'main', yaw: 10, pitch: 8, fov: 50 },
      floor: { pos: [0.35, 1.25, 1.35], look: [0.1, 0.25, 0.4], parent: 'main', yaw: 15, pitch: 10, fov: 50 },
    },
    hotspots,
    interactions,
    dark: () => true,
    update: (dt, time) => {
      motes.update(dt, time);
      if (restarted()) {
        pend.rotation.z = Math.sin(time * 1.6) * 0.18;
        for (const w of wheels) w.o.rotation.y += w.speed * dt;
        if (Math.sin(time * 1.6) * Math.sin((time - dt) * 1.6) < 0) g.audio.sfx('tick');
      }
      if (watch.visible) watchGlow.intensity = 0.5 + Math.sin(time * 3) * 0.2;
    },
    leave: () => g.audio.setLoop('towerclock', 0),
    enter: async () => {
      if (restarted()) g.audio.setLoop('towerclock', 0.45);
      if (!g.flag('o.towerEntered')) {
        g.set('o.towerEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ora.tower1' }, { who: 'diego', key: 'ora.tower2' }]);
      }
    },
    hint: () => {
      if (g.has('watch')) return 'hint.ora.leave';
      if (restarted()) return 'hint.ora.takeWatch';
      if (!keyIn.visible) return g.has('windkey') ? 'hint.ora.socket' : 'hint.ora.needKey';
      if (wound < 1) return 'hint.ora.wind';
      return 'hint.ora.wedge';
    },
    debug: { keyIn, wedge, getWound: () => wound },
  };
}
