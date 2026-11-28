import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, hitBox, canvasTex, noise, woodMaterial, mat, cyl, lathe, dust } from '../builders';
import { figureGhost } from '../characters';
import { realOttavio, realCharacters } from '../characters_real';
import { prop } from '../models';
import { t } from '../i18n';
import { brassMat } from './ora_common';
import { oldPhoto } from '../photos';

/**
 * The silent room, upstairs: padded from floor to ceiling, door included, so that no sound gets in.
 * Ottavio lies on the bed, as if asleep. Call him and he wakes, furious: your voice, your heart,
 * are noise. Thrashing, he knocks a little key off the nightstand: the key of the music box on the
 * chest of drawers, the one his mother played him when he was afraid of the dark. Wind it, and the
 * lullaby reminds him what sound used to mean. He lets you go up to the tower.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** quilted padding, buttoned in diamonds: grubby cream canvas */
function padding(repeat: [number, number]) {
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#b9b2a2';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 6000, 0.12);
    const n = 4, s = w / n;
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const x = i * s + ((j % 2) * s) / 2, y = j * (s / 2) * 2 * 0.5 + (j * s) / 2;
        // the puff around each button
        const gr = c.createRadialGradient(x, y, 2, x, y, s * 0.55);
        gr.addColorStop(0, 'rgba(60,52,40,0.55)');
        gr.addColorStop(0.25, 'rgba(255,255,255,0.08)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr;
        c.fillRect(x - s, y - s, s * 2, s * 2);
        c.fillStyle = '#4a4134';
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
    // the seams between the buttons
    c.strokeStyle = 'rgba(70,60,48,0.35)';
    c.lineWidth = 2;
    for (let k = -n; k <= n * 2; k++) {
      c.beginPath();
      c.moveTo(k * s, 0);
      c.lineTo(k * s + w, h);
      c.stroke();
      c.beginPath();
      c.moveTo(k * s, 0);
      c.lineTo(k * s - w, h);
      c.stroke();
    }
    // stains where a head leaned, again and again
    for (let i = 0; i < 6; i++) {
      c.fillStyle = 'rgba(90,70,40,0.10)';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 0, Math.PI * 2);
      c.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
}

export function createOraCamera(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.8, H = 2.6, D = 3.6;
  const woodDark = woodMaterial({ base: '#2e231a' });
  scene.add(room(W, H, D, {
    wall: padding([2.5, 1.6]),
    floor: padding([3, 3]),
    ceil: padding([2.5, 2.5]),
  }));
  const calmed = () => !!g.flag('o.lull');
  const called = () => !!g.flag('o.called');
  const keyIn = () => !!g.flag('o.mbKeyIn');

  // a single bulb behind a cloth shade: a sick, yellowish light
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const lamp = new THREE.PointLight(0xffe2b0, 2.2, 5, 1.6);
  lamp.position.set(0.2, 2.3, -0.2);
  scene.add(lamp);
  scene.add(cyl(0.16, 0.24, 0.16, mat(0xcbbf9e, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), 0.2, 2.35, -0.2, 16));
  const motes = dust([-1.8, 0.2, -1.7], [1.8, 2.4, 1.7], 90);
  scene.add(motes.points);

  // ---------------- the bed ----------------
  const bedX = -1.1, bedZ = -0.7;
  const bed = new THREE.Group();
  // an old single bed (the headboard at the back, towards -z)
  const bedModel = prop('bedC', { width: 1.0, grey: 0.85 });
  if (bedModel) bed.add(bedModel);
  else {
    bed.add(rbox(0.95, 0.35, 1.9, 0.03, woodDark, 0, 0.3, 0));
    bed.add(rbox(1.0, 0.9, 0.06, 0.02, woodDark, 0, 0.55, -0.95));
    for (const x of [-0.48, 0.48]) bed.add(lathe([[0, 0], [0.03, 0.01], [0.035, 0.04], [0, 0.07]], brassMat(), x, 1.0, -0.95, 12));
    bed.add(rbox(0.92, 0.12, 1.5, 0.04, new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.95 }), 0, 0.53, 0.18));
    bed.add(rbox(0.6, 0.1, 0.3, 0.05, new THREE.MeshStandardMaterial({ color: 0xe0dacc, roughness: 0.95 }), 0, 0.52, -0.72));
  }
  bed.position.set(bedX, 0, bedZ);
  bed.rotation.y = 0;
  scene.add(bed);

  // ---------------- the nightstand: a glass of water, wax earplugs, the little key ----------------
  const nsX = bedX + 0.75, nsZ = bedZ - 0.75;
  scene.add(rbox(0.42, 0.55, 0.38, 0.02, woodDark, nsX, 0.275, nsZ));
  scene.add(cyl(0.03, 0.028, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), nsX + 0.1, 0.6, nsZ, 12));
  const smallKey = new THREE.Group();
  smallKey.add(cyl(0.004, 0.004, 0.05, brassMat(), 0, 0, 0, 6).rotateZ(Math.PI / 2));
  smallKey.add(mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), brassMat(), -0.035, 0, 0));
  smallKey.scale.setScalar(1.6);
  const keyOnFloor = () => !!g.flag('o.keyDropped');
  const keyTaken = () => !!g.flag('o.mbKey') || keyIn();
  const KEY_TOP: [number, number, number] = [nsX - 0.08, 0.56, nsZ + 0.05];
  const KEY_FLOOR: [number, number, number] = [nsX + 0.15, 0.012, nsZ + 0.45];
  smallKey.position.set(...(keyOnFloor() ? KEY_FLOOR : KEY_TOP));
  smallKey.visible = !keyTaken();
  scene.add(smallKey);
  const hKey = hitBox(0.25, 0.12, 0.25, KEY_FLOOR[0], 0.05, KEY_FLOOR[2], 'mbkeyFloor');
  scene.add(hKey);

  // ---------------- the chest of drawers: the music box, Clara's photo ----------------
  const chX = 1.2, chZ = -D / 2 + 0.3;
  scene.add(rbox(1.0, 0.85, 0.45, 0.02, woodDark, chX, 0.425, chZ));
  for (let i = 0; i < 3; i++) {
    scene.add(rbox(0.9, 0.22, 0.02, 0.01, woodMaterial({ base: '#3a2c1f' }), chX, 0.15 + i * 0.26, chZ + 0.23));
    scene.add(cyl(0.012, 0.012, 0.03, brassMat(), chX, 0.15 + i * 0.26, chZ + 0.25, 8).rotateX(Math.PI / 2));
  }
  const top = 0.85;
  const box = new THREE.Group();
  const mb = prop('musicBoxM', { height: 0.17 });
  const mbKey: THREE.Object3D[] = [];
  mb?.traverse((o) => {
    if (o.name === 'Key' || o.name === 'Key_base') mbKey.push(o);
  });
  const showKey = () => mbKey.forEach((o) => (o.visible = keyIn()));
  showKey();
  if (mb) box.add(mb);
  else {
    box.add(rbox(0.2, 0.1, 0.14, 0.01, woodMaterial({ base: '#6a4a2c' }), 0, 0.05, 0));
    box.add(rbox(0.2, 0.12, 0.012, 0.005, woodMaterial({ base: '#6a4a2c' }), 0, 0.16, -0.07));
  }
  box.position.set(chX - 0.15, top, chZ + 0.02);
  box.rotation.y = -0.35;
  scene.add(box);
  // the winding key on its side: what your finger turns
  const keyGrip = new THREE.Group();
  keyGrip.position.set(chX - 0.15 + 0.12, top + 0.06, chZ + 0.06);
  keyGrip.add(hitBox(0.14, 0.14, 0.14, 0, 0, 0, 'mbkey'));
  scene.add(keyGrip);
  // Clara, a little girl on the workshop stool, in a silver frame
  const claraTex = oldPhoto('clara', 240, 320, (c, w, h) => {
    c.fillStyle = '#6e675c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8e2d6';
    c.beginPath();
    c.arc(w * 0.5, h * 0.4, 22, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.5 - 26, h * 0.48, 52, h * 0.32);
    c.fillStyle = '#2b2824';
    c.fillRect(w * 0.3, h * 0.8, w * 0.4, 10);
  }, { age: 0.3, border: false });
  const frame = new THREE.Group();
  frame.add(rbox(0.15, 0.2, 0.012, 0.004, mat(0xa8a8a8, { metalness: 0.9, roughness: 0.3 }), 0, 0, 0));
  frame.add(mesh(new THREE.PlaneGeometry(0.12, 0.16), new THREE.MeshStandardMaterial({ map: claraTex, roughness: 0.8 }), 0, 0, 0.007, false));
  frame.position.set(chX + 0.28, top + 0.11, chZ - 0.05);
  frame.rotation.set(-0.12, -0.25, 0);
  scene.add(frame);

  // ---------------- Ottavio: on the bed, as if asleep; once called, on his feet ----------------
  const ott = realCharacters() ? realOttavio() : figureGhost('ottavio_figura', 1.7);
  const real3d = realCharacters();
  ott.group.traverse((o) => (o.userData.noPick = true));
  scene.add(ott.group);
  // a heavy wool blanket pulled up to his chest: when he gets up, he throws it off onto the floor
  const blanketGeo = new THREE.PlaneGeometry(1.0, 1.25, 24, 24);
  {
    const p = blanketGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const body = Math.max(0, 1 - Math.pow(Math.abs(x) / 0.36, 2)); // the body underneath
      const feet = y < -0.5 ? Math.max(0, 1 - Math.pow((Math.abs(x) - 0.1) / 0.12, 2)) * 0.06 : 0;
      const edge = Math.abs(x) > 0.42 ? -(Math.abs(x) - 0.42) * 1.4 : 0; // hanging over the sides
      p.setZ(i, Math.sqrt(body) * 0.25 + feet + edge + Math.sin(x * 20 + y * 7) * 0.008);
    }
    blanketGeo.computeVertexNormals();
  }
  const blanketTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#4c4842';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(20,18,16,0.5)';
    c.lineWidth = 3;
    for (let k = 24; k < w; k += 48) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); }
    noise(c, w, h, 6000, 0.12);
  });
  const blanket = mesh(blanketGeo, new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 1, side: THREE.DoubleSide }), 0, 0, 0);
  blanket.userData.noPick = true;
  scene.add(blanket);
  const blanketOn = () => {
    blanket.position.set(bedX, 0.62, bedZ + 0.42);
    blanket.rotation.set(-Math.PI / 2, 0, 0);
    blanket.scale.set(1, 1, 1);
  };
  const blanketOff = () => {
    blanket.position.set(bedX + 0.55, 0.05, bedZ + 1.05);
    blanket.rotation.set(-Math.PI / 2, 0, 0.5);
    blanket.scale.set(0.8, 0.6, 0.6);
  };
  const lieDown = () => {
    blanketOn();
    ott.group.position.set(bedX, real3d ? 0.66 : 0.6, bedZ + 0.82);
    ott.group.rotation.set(-Math.PI / 2, 0, 0);
    (ott as { setLying?: (v: boolean) => void }).setLying?.(true);
  };
  const standUp = () => {
    blanketOff();
    (ott as { setLying?: (v: boolean) => void }).setLying?.(false);
    ott.group.rotation.set(0, 0, 0);
    ott.group.position.set(bedX + 0.7, 0, bedZ + 0.55);
  };
  // he sits up stiffly and swings off the bed, all in one movement
  const riseUp = async () => {
    if (!real3d) return standUp();
    const p0 = ott.group.position.clone();
    const p1 = new THREE.Vector3(bedX + 0.7, 0, bedZ + 0.55);
    for (let i = 1; i <= 24; i++) {
      const k = i / 24, e = k * k * (3 - 2 * k);
      blanket.position.set(bedX + 0.55 * e, 0.62 - 0.57 * e, bedZ + 0.42 + 0.63 * e);
      ott.group.rotation.set(-Math.PI / 2 * (1 - e), 0, 0);
      ott.group.position.set(p0.x + (p1.x - p0.x) * e, p0.y + (p1.y - p0.y) * e + Math.sin(k * Math.PI) * 0.25, p0.z + (p1.z - p0.z) * e);
      await sleep(30);
    }
    standUp();
    ott.setEyes(true);
  };
  if (called()) standUp();
  else lieDown();
  ott.setOpacity(calmed() ? 0 : 0.8);

  // the low tower door, padded too (back wall, right of the chest)
  const tdX = 0.1;
  scene.add(mesh(new THREE.PlaneGeometry(0.6, 1.4), new THREE.MeshBasicMaterial({ color: 0x050505 }), tdX, 0.7, -D / 2 + 0.012, false));
  const tdPivot = new THREE.Group();
  tdPivot.userData.passThrough = true;
  tdPivot.position.set(tdX - 0.3, 0, -D / 2 + 0.035);
  tdPivot.add(rbox(0.6, 1.4, 0.06, 0.02, padding([0.5, 1]), 0.3, 0.7, 0));
  tdPivot.add(cyl(0.015, 0.015, 0.04, brassMat(), 0.52, 0.7, 0.04, 8).rotateX(Math.PI / 2));
  scene.add(tdPivot);
  if (g.flag('o.towerDoor')) tdPivot.rotation.y = 1.5;
  // the stairs down (front wall, left)
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.0), new THREE.MeshBasicMaterial({ color: 0x050505 }), -1.0, 1.0, D / 2 - 0.012, false).rotateY(Math.PI));

  // ---------------- hotspots ----------------
  const hOtt = hitBox(0.8, 0.6, 1.8, bedX, 0.7, bedZ, 'ottavio');
  const hBox = hitBox(0.3, 0.25, 0.3, chX - 0.15, top + 0.1, chZ + 0.02, 'musicbox');
  const hFrame = hitBox(0.2, 0.25, 0.12, chX + 0.28, top + 0.11, chZ - 0.05, 'photo');
  const hBed = hitBox(1.0, 0.7, 1.9, bedX, 0.4, bedZ, 'bed');
  const hTower = hitBox(0.7, 1.45, 0.3, tdX, 0.72, -D / 2 + 0.15, 'tower');
  const hDown = hitBox(0.95, 2.0, 0.2, -1.0, 1.0, D / 2 - 0.1, 'down');
  const hWalls = hitBox(3.6, 1.0, 0.2, 0, 1.8, -D / 2 + 0.1, 'walls');
  scene.add(hOtt, hBox, hFrame, hBed, hTower, hDown, hWalls);
  const say = (key: string) => g.say(key);
  // after the shout his own torment fills the room: everyone's heart, too fast
  const tension = () => g.audio.setLoop('heartfast', called() && !calmed() ? 0.35 : 0, { tau: 0.8 });

  const lullaby = async () => {
    g.set('o.lull');
    g.audio.setLoop('heartfast', 0, { tau: 0.5 });
    g.audio.hush(3);
    await sleep(500);
    const len = g.audio.musicBox({ gain: 0.55, runDown: true });
    await sleep(Math.min(4000, len * 400));
    await g.view('ott', 1.2);
    await g.memoryFlash('ottavio_bambino', 1600);
    await g.say([
      { who: 'ottavio', key: 'ora.lull1' },
      { who: 'ottavio', key: 'ora.lull2' },
    ]);
    // he steps back into the padding, and is gone
    for (let i = 20; i >= 0; i--) {
      ott.setOpacity((i / 20) * 0.8);
      await sleep(60);
    }
    g.audio.sfx('creak');
    for (let i = 0; i <= 20; i++) {
      tdPivot.rotation.y = (i / 20) * 1.5;
      await sleep(30);
    }
    g.set('o.towerDoor');
    await g.say([{ who: 'ottavio', key: 'ora.lull3' }]);
    await say('ora.towerOpen');
  };

  const hotspots: Hotspot[] = [
    { id: 'ottavio', obj: hOtt, view: 'bed', when: () => !calmed(), tap: async (item) => {
      if (item) return g.nope();
      if (called()) return say('ora.ottAngry');
      await say('ora.ottavioLook');
      const ok = await g.physical('shout', 'ora.shoutText');
      if (!ok) return;
      g.set('o.called');
      g.audio.setLoop('heartfast', 0.8, { tau: 0.2 });
      await g.shock();
      await riseUp();
      await g.say([
        { who: 'ottavio', key: 'ora.ott1' },
        { who: 'ottavio', key: 'ora.ott2' },
      ]);
      // thrashing about, he sweeps the nightstand: the little key falls to the floor
      g.engine.shake(0.03, 0.4);
      for (let i = 0; i <= 16; i++) {
        const k = i / 16;
        smallKey.position.set(KEY_TOP[0] + (KEY_FLOOR[0] - KEY_TOP[0]) * k, KEY_TOP[1] + (KEY_FLOOR[1] - KEY_TOP[1]) * k * k, KEY_TOP[2] + (KEY_FLOOR[2] - KEY_TOP[2]) * k);
        smallKey.rotation.z = k * 4;
        await sleep(25);
      }
      g.audio.sfx('clunk');
      g.set('o.keyDropped');
      await g.say([{ who: 'ottavio', key: 'ora.ott3' }, { who: 'diego', key: 'ora.keyFell' }]);
      tension();
    } },
    { id: 'mbkeyFloor', obj: hKey, when: () => keyOnFloor() && !keyTaken(), tap: async (item) => {
      if (item) return g.nope();
      smallKey.visible = false;
      g.set('o.mbKey');
      g.give('mbkey');
      g.audio.sfx('pickup');
      return say('ora.mbKeyTaken');
    } },
    { id: 'musicbox', obj: hBox, view: 'box', tap: async (item) => {
      if (item === 'mbkey') {
        g.deselect();
        g.take('mbkey');
        g.set('o.mbKeyIn');
        showKey();
        g.audio.sfx('click');
        return say('ora.musicboxWind');
      }
      if (item) return g.nope();
      if (calmed()) return say('ora.musicboxAfter');
      if (!keyIn()) {
        await say('ora.musicbox');
        return say('ora.musicboxNoKey');
      }
      return say('ora.musicboxWind');
    } },
    { id: 'photo', obj: hFrame, view: 'box', tap: async (item) => {
      if (item) return g.nope();
      g.note('note.clara');
      return say('ora.photoClara');
    } },
    { id: 'bed', obj: hBed, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ora.bedOtt');
    } },
    { id: 'walls', obj: hWalls, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(calmed() ? 'ora.ottAfter' : 'ora.cam1');
    } },
    { id: 'tower', exit: () => !!g.flag('o.towerDoor'), obj: hTower, tap: async (item) => {
      if (!g.flag('o.towerDoor')) {
        if (item) return g.nope();
        g.audio.sfx('wrong');
        return say('ora.towerLocked');
      }
      if (item) return g.nope();
      g.audio.steps(8, 0.35, false);
      return g.go('ora_torre');
    } },
    { id: 'down', obj: hDown, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // wind the music box: two turns of the little key
  let wound = 0;
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: keyGrip,
      center: keyGrip.position.clone(),
      when: () => g.viewName === 'box' && keyIn() && !calmed(),
      onTurn: (d) => {
        const before = Math.floor(wound / 0.9);
        wound += Math.abs(d);
        if (Math.floor(wound / 0.9) !== before) g.audio.sfx('tick');
      },
      onEnd: async () => {
        if (wound >= Math.PI * 4 && !calmed()) await lullaby();
      },
    },
  ];

  return {
    id: 'ora_camera',
    nameKey: 'place.oraCamera',
    next: ['ora_torre'],
    scene,
    drone: 'orologi',
    startView: 'main',
    exitTo: 'ora_bottega',
    views: {
      main: { pos: [0.9, 1.55, 1.4], look: [-0.3, 1.0, -0.6], yaw: 60, pitch: 18 },
      ott: { pos: [0.9, 1.6, 1.45], look: [bedX + 0.7, 1.35, bedZ + 0.55], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      bed: { pos: [bedX + 0.8, 1.35, bedZ + 0.25], look: [bedX, 0.72, bedZ - 0.65], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      box: { pos: [chX - 0.05, 1.3, chZ + 0.75], look: [chX, top + 0.08, chZ], parent: 'main', yaw: 15, pitch: 10, fov: 52 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      // standing, he turns to face you; lying down, he doesn't move at all
      if (ott.group.visible && (called() || real3d)) ott.update(dt, time, g.engine.camera);
    },
    leave: () => g.audio.setLoop('heartfast', 0),
    enter: async () => {
      if (calmed()) ott.setOpacity(0);
      tension();
      if (!g.flag('o.camEntered')) {
        g.set('o.camEntered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'ora.cam1' }, { who: 'diego', key: 'ora.cam2' }]);
      }
    },
    hint: () => {
      if (g.has('watch')) return 'hint.ora.leave';
      if (!called()) return 'hint.ora.call';
      if (!keyTaken()) return 'hint.ora.mbKey';
      if (!keyIn()) return 'hint.ora.mbKeyUse';
      if (!calmed()) return 'hint.ora.musicbox';
      return 'hint.ora.tower';
    },
    debug: { ott, box, keyGrip },
  };
}
