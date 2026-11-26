import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, mat, hitBox, dust, lathe, textPlane, canvasTex, noise, cyl } from '../builders';
import { prop } from '../models';
import { t } from '../i18n';
import { sleep, mac2Hint, smear } from './mac2_common';

/**
 * The cold room. Steel walls furred with frost, carcasses, a shape under a sheet. This is where
 * Lisa pushed Diego on the 24th of October. On the inside of the door, scratched low down by
 * a child's nails: LISA. Frozen into the ice on the floor, her hair ribbon: breathe on it
 * (blow into the phone) to melt it free. In Bruno's coat on the hook, a box of matches.
 */
export function createMacCella(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x05070a, 2, 6.5);
  scene.userData.envIntensity = 0.06;
  const W = 2.8, H = 2.3, D = 3.2;
  const frost = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#9aa2a8';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) {
        c.fillStyle = `rgba(235,240,245,${Math.random() * 0.25})`;
        c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1 + Math.random() * 2);
      }
      noise(c, w, h, 3000, 0.1);
    }, [3, 2]),
    roughness: 0.55,
    metalness: 0.3,
  });
  scene.add(room(W, H, D, { wall: frost, floor: mat(0x4a5054, { roughness: 0.3, metalness: 0.2 }), ceil: frost }));
  scene.add(new THREE.AmbientLight(0xc8d8ff, 0.05));
  const cold = new THREE.PointLight(0xdfe8ff, 1.6, 5, 1.6);
  cold.position.set(0, 2.1, -0.6);
  scene.add(cold);
  const lamp = rbox(0.5, 0.05, 0.12, 0.01, new THREE.MeshBasicMaterial({ color: 0xe8f0ff }), 0, H - 0.03, -0.6);
  lamp.userData.noPick = true;
  scene.add(lamp);
  const motes = dust([-1.3, 0.2, -1.5], [1.3, 2.2, 1.5], 160);
  scene.add(motes.points);

  // rail and carcasses
  const steel = new THREE.MeshStandardMaterial({ color: 0xa8b0b4, metalness: 1, roughness: 0.3 });
  scene.add(rbox(2.4, 0.04, 0.04, 0.01, steel, 0, 2.0, -1.1));
  const meat = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#6a5856';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) {
        c.strokeStyle = `rgba(220,212,200,${0.1 + Math.random() * 0.25})`;
        c.lineWidth = 0.5 + Math.random() * 3;
        c.beginPath();
        let x = Math.random() * w, y = Math.random() * h;
        c.moveTo(x, y);
        for (let k = 0; k < 6; k++) c.lineTo((x += (Math.random() - 0.5) * 60), (y += (Math.random() - 0.5) * 60));
        c.stroke();
      }
      for (let i = 0; i < 20; i++) {
        c.fillStyle = `rgba(35,20,20,${Math.random() * 0.4})`;
        c.beginPath();
        c.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 20, 0, Math.PI * 2);
        c.fill();
      }
      // frost on top
      for (let i = 0; i < 300; i++) {
        c.fillStyle = `rgba(230,236,240,${Math.random() * 0.3})`;
        c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1);
      }
      noise(c, w, h, 2500, 0.1);
    }, [1, 2]),
    roughness: 0.45,
  });
  const fat = mat(0xd8d2c8, { roughness: 0.6 });
  for (const x of [-0.9, -0.3, 0.7]) {
    const c = new THREE.Group();
    const body = lathe([[0, -0.55], [0.1, -0.45], [0.2, -0.1], [0.18, 0.2], [0.06, 0.45], [0, 0.5]], meat, 0, 0, 0, 14);
    body.scale.z = 0.7;
    c.add(body);
    const cut = lathe([[0, -0.5], [0.08, -0.42], [0.17, -0.1], [0.15, 0.18], [0.05, 0.4], [0, 0.44]], fat, 0, 0, 0.03, 14);
    cut.scale.set(0.9, 0.95, 0.6);
    c.add(cut);
    const hook = prop('meatHook', { height: 0.3, grey: 0.6 });
    if (hook) {
      hook.position.set(0, 0.42, 0);
      c.add(hook);
    }
    c.position.set(x, 1.4, -1.1);
    c.userData.sway = x * 3;
    c.traverse((o) => (o.userData.noPick = true));
    scene.add(c);
  }
  // the shape under the sheet, along the right wall
  const body = prop('corpse', { width: 0.85, turn: Math.PI / 2, grey: 1.4 });
  if (body) {
    body.position.set(W / 2 - 0.5, 0, 0.0);
    scene.add(body);
  } else {
    const sheet = rbox(0.6, 0.25, 1.7, 0.1, mat(0xcfcac0, { roughness: 1 }), W / 2 - 0.5, 0.12, 0.0);
    scene.add(sheet);
  }
  scene.add(smear(0.8, 1.6, W / 2 - 0.6, 0.6, 0.2, 9));

  // Bruno's coat on a hook by the door (left wall)
  const coat = new THREE.Group();
  const cloth = mat(0x2a2826, { roughness: 1 });
  coat.add(lathe([[0, -0.6], [0.24, -0.55], [0.22, 0.1], [0.18, 0.3], [0.08, 0.38], [0, 0.38]], cloth, 0, 0, 0, 12));
  coat.children[0].scale.z = 0.35;
  coat.add(cyl(0.012, 0.012, 0.12, steel, 0, 0.42, 0, 6).rotateX(Math.PI / 2));
  coat.position.set(-W / 2 + 0.15, 1.45, 0.7);
  coat.userData.sway = 1;
  scene.add(coat);

  // the ice on the floor, with the ribbon frozen inside
  const iceX = -0.5, iceZ = 0.2;
  const ice = mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0xa9bcc8, transparent: true, opacity: 0.42, roughness: 0.04, metalness: 0.2, depthWrite: false }), iceX, 0.03, iceZ);
  ice.scale.z = 0.7;
  scene.add(ice);
  const ribbon = new THREE.Group();
  const rib = mat(0xe8e4dc, { roughness: 0.7 });
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), rib, s * 0.05, 0, 0);
    loop.scale.y = 0.6;
    loop.rotation.x = -Math.PI / 2;
    ribbon.add(loop);
    ribbon.add(rbox(0.025, 0.004, 0.14, 0.002, rib, s * 0.03, 0, 0.09).rotateY(s * 0.3));
  }
  ribbon.position.set(iceX, 0.035, iceZ);
  scene.add(ribbon);
  const showIce = () => {
    const free = !!g.flag('m2.melted');
    ice.scale.set(free ? 0.6 : 1, free ? 0.2 : 1, free ? 0.42 : 0.7);
    (ice.material as THREE.MeshStandardMaterial).opacity = free ? 0.2 : 0.42;
    ribbon.visible = !g.flag('m2.ribbonTaken');
  };
  showIce();

  // the inside of the door: scratched by a child, low down
  const scratches = textPlane(['LISA', 'LISA', 'LISA'], 0.5, 0.45, { bg: 'transparent', fg: '#4a5054', size: 34, px: 128, font: "'Bradley Hand', 'Segoe Print', cursive" });
  scratches.position.set(0, 0.75, D / 2 - 0.085);
  scratches.rotation.y = Math.PI;
  scene.add(scratches);
  scene.add(rbox(1.2, 2.1, 0.06, 0.02, new THREE.MeshStandardMaterial({ color: 0x8a9094, metalness: 0.4, roughness: 0.75 }), 0, 1.05, D / 2 - 0.05));

  // ---------------- hotspots ----------------
  const hIce = hitBox(0.9, 0.3, 0.7, iceX, 0.1, iceZ, 'ice');
  const hCoat = hitBox(0.5, 1.1, 0.4, -W / 2 + 0.2, 1.3, 0.7, 'coat');
  const hBody = hitBox(0.9, 0.5, 1.9, W / 2 - 0.5, 0.25, 0, 'body');
  const hDoor = hitBox(1.3, 2.1, 0.3, 0, 1.05, D / 2 - 0.15, 'door');
  const hMeat = hitBox(2.4, 1.2, 0.6, 0, 1.4, -1.1, 'meat');
  scene.add(hIce, hCoat, hBody, hDoor, hMeat);
  const say = (k: string) => g.say(k);

  const melt = async () => {
    g.audio.sfx('breath');
    g.set('m2.melted');
    g.audio.sfx('water');
    showIce();
    await say('m2.iceMelted');
  };

  const hotspots: Hotspot[] = [
    { id: 'ice', obj: hIce, view: 'ice', tap: async (item) => {
      if (item === 'matches') return say('m2.iceMatches');
      if (item) return g.nope();
      if (g.flag('m2.ribbonTaken')) return say('m2.iceEmpty');
      if (!g.flag('m2.melted')) {
        await say('m2.ice');
        const ok = await g.physical('blow', 'm2.blowText');
        if (!ok) return;
        return melt();
      }
      g.set('m2.ribbonTaken');
      showIce();
      g.give('ribbon');
      return g.say([{ who: 'diego', key: 'm2.ribbon1' }, { who: 'diego', key: 'm2.ribbon2' }]);
    } },
    { id: 'coat', obj: hCoat, view: 'coat', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('m2.matchesTaken')) return say('m2.coatEmpty');
      g.set('m2.matchesTaken');
      g.audio.sfx('sheet');
      g.give('matches');
      return g.say([{ who: 'diego', key: 'm2.coat1' }, { who: 'diego', key: 'm2.coat2' }]);
    } },
    { id: 'body', obj: hBody, view: 'body', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('m2.bodyLooked')) {
        g.set('m2.bodyLooked');
        await say('m2.body1');
        g.audio.sfx('breath');
        g.engine.shake(0.02, 0.4);
        return say('m2.body2');
      }
      return say('m2.body3');
    } },
    { id: 'door', obj: hDoor, view: 'door', tap: async (item) => {
      if (item) return g.nope();
      if (g.viewName === 'door' && !g.flag('m2.scratches')) {
        g.set('m2.scratches');
        return g.say([{ who: 'diego', key: 'm2.scratch1' }, { who: 'diego', key: 'm2.scratch2' }]);
      }
      g.audio.steps(3, 0.5, false);
      return g.go('macelleria');
    } },
    { id: 'meat', obj: hMeat, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('m2.cellaMeat');
    } },
  ];

  return {
    id: 'mac_cella',
    nameKey: 'place.macCella',
    next: ['macelleria'],
    scene,
    drone: 'macelleria',
    startView: 'main',
    exitTo: 'macelleria',
    dark: () => false,
    views: {
      main: { pos: [0, 1.65, 1.35], look: [0, 0.55, -0.9], yaw: 60, pitch: 20 },
      ice: { pos: [iceX + 0.1, 1.2, iceZ + 0.75], look: [iceX, 0.03, iceZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      coat: { pos: [-0.3, 1.5, 0.75], look: [-W / 2, 1.3, 0.7], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
      body: { pos: [0.1, 1.5, 0.2], look: [W / 2 - 0.5, 0.2, 0], parent: 'main', yaw: 20, pitch: 12 },
      door: { pos: [0, 1.1, 0.1], look: [0, 0.75, D / 2], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      cold.intensity = Math.random() < 0.01 ? 0.3 : 1.6;
      scene.traverse((o) => {
        if (o.userData.sway !== undefined) o.rotation.z = Math.sin(time * 0.4 + o.userData.sway) * 0.02;
      });
    },
    enter: async () => {
      if (!g.flag('m2.cellaEntered')) {
        g.set('m2.cellaEntered');
        // the door swings shut behind him, the way it did that day
        await sleep(500);
        g.audio.sfx('thud');
        g.engine.shake(0.06, 0.4);
        cold.intensity = 0.2;
        await sleep(900);
        g.audio.sfx('whisper');
        await g.say([{ who: 'lisa', key: 'm2.cellaLisa' }, { who: 'diego', key: 'm2.cellaEnter1' }]);
        g.audio.sfx('creak');
        cold.intensity = 1.6;
        await g.say([{ who: 'diego', key: 'm2.cellaEnter2' }]);
      }
    },
    hint: () => mac2Hint(g),
    debug: { melt },
  };
}
