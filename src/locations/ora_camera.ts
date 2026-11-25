import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, hitBox, canvasTex, noise, woodMaterial, mat, cyl, lathe, fx } from '../builders';
import { createClara } from '../characters';
import { prop } from '../models';
import { t } from '../i18n';
import { lisaInk, onWall } from './lisa_uv';
import { wallClock, brassMat } from './ora_common';
import { wallpaper } from './ada_common';

/**
 * Clara's room, upstairs. Nothing moves in here: the dust hangs in the air, the curtain is
 * caught mid-billow, the moon doesn't cross the window. Clara lies in bed, neither asleep nor awake.
 * Call her name (into the phone) and she answers. Then the little door to the clock tower opens.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createOraCamera(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.06;
  const W = 3.8, H = 2.6, D = 3.6;
  const woodDark = woodMaterial({ base: '#2e231a' });
  scene.add(room(W, H, D, {
    wall: wallpaper('#a59ea6', [2.2, 1.2]),
    floor: woodMaterial({ base: '#3d3024', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#2a2219', repeat: [2, 2], plank: true }),
  }));
  // Lisa's message, in invisible ink (UV torch)
  scene.add(onWall(lisaInk(g, 'ora'), 'right', W, D, -0.2, 1.7));
  const restarted = () => !!g.flag('o.restarted');

  // moonlight, frozen
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const moon = new THREE.SpotLight(0xbfcbd6, 7, 6, 0.45, 0.8, 1.3);
  moon.position.set(-W / 2 - 0.2, 2.0, -0.4);
  moon.target.position.set(0.3, 0.5, -0.6);
  scene.add(moon, moon.target);
  const winTex = canvasTex(128, 192, (c, w, h) => {
    c.fillStyle = '#2f3740';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8ecef';
    c.beginPath();
    c.arc(80, 50, 16, 0, Math.PI * 2);
    c.fill();
    noise(c, w, h, 600, 0.15);
  });
  scene.add(mesh(new THREE.PlaneGeometry(0.7, 1.0), new THREE.MeshBasicMaterial({ map: winTex }), -W / 2 + 0.012, 1.55, -0.4, false).rotateY(Math.PI / 2));
  // the curtain, frozen in mid-billow
  const curGeo = new THREE.PlaneGeometry(0.5, 1.3, 10, 10);
  const cp = curGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) {
    const y = cp.getY(i);
    cp.setZ(i, Math.sin(cp.getX(i) * 18) * 0.04 + Math.max(0, -y) * 0.45 * (0.6 + 0.4 * Math.sin(cp.getX(i) * 6)));
  }
  curGeo.computeVertexNormals();
  const curtain = mesh(curGeo, new THREE.MeshStandardMaterial({ color: 0xd6d0c4, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), -W / 2 + 0.08, 1.45, -0.05, false);
  curtain.rotation.y = Math.PI / 2;
  scene.add(curtain);

  // dust hanging in the air, perfectly still (until time moves again)
  const N = 260;
  const dpos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) dpos.set([(Math.random() - 0.5) * 3.4, 0.2 + Math.random() * 2.2, (Math.random() - 0.5) * 3.2], i * 3);
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustPts = fx(new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.8, depthWrite: false })));
  scene.add(dustPts);

  // ---------------- the bed and Clara ----------------
  const bedX = 0.6, bedZ = -0.9;
  const bed = new THREE.Group();
  bed.add(rbox(0.95, 0.35, 1.9, 0.03, woodDark, 0, 0.3, 0));
  bed.add(rbox(1.0, 0.9, 0.06, 0.02, woodDark, 0, 0.55, -0.95));
  bed.add(rbox(1.0, 0.82, 0.06, 0.02, woodDark, 0, 0.47, 0.95));
  // brass bed knobs
  for (const x of [-0.48, 0.48]) for (const z of [-0.95, 0.95]) bed.add(lathe([[0, 0], [0.03, 0.01], [0.035, 0.04], [0, 0.07]], brassMat(), x, z < 0 ? 1.0 : 0.68, z, 12));
  const sheetTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#d8d3c8';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 5000, 0.1);
    for (let y = 0; y < h; y += 22) {
      c.fillStyle = 'rgba(0,0,0,0.05)';
      c.fillRect(0, y, w, 3);
    }
  });
  const blanketGeo = new THREE.BoxGeometry(0.92, 0.16, 1.36, 12, 1, 12);
  const bp = blanketGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), z = bp.getZ(i);
    if (bp.getY(i) > 0) bp.setY(i, bp.getY(i) + Math.exp(-(x * x) / 0.03) * 0.08 * (z < 0.5 ? 1 : 0.5)); // her body under the blanket
  }
  blanketGeo.computeVertexNormals();
  bed.add(mesh(blanketGeo, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.95 }), 0, 0.53, 0.2));
  // the blanket hangs over the foot of the mattress (no bare white edge)
  bed.add(rbox(0.92, 0.22, 0.02, 0.005, new THREE.MeshStandardMaterial({ color: 0x8a857a, roughness: 1 }), 0, 0.45, 0.9));
  bed.add(rbox(0.6, 0.1, 0.3, 0.05, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.95 }), 0, 0.52, -0.72));
  bed.position.set(bedX, 0, bedZ);
  scene.add(bed);
  // Clara: lying on her back, the blanket to her chin, eyes open
  const clara = createClara();
  clara.group.traverse((o) => (o.userData.noPick = true));
  const lying = new THREE.Group();
  lying.add(clara.group);
  clara.group.rotation.x = -Math.PI / 2;
  lying.position.set(bedX, 0.5, bedZ + 0.32); // feet towards the foot of the bed, head on the pillow
  scene.add(lying);
  clara.setOpacity(restarted() ? 0 : 0.92);
  // a small grey cloud where she was, after
  const dustBed = fx(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.3), new THREE.MeshBasicMaterial({
    map: canvasTex(64, 128, (c, w, h) => {
      for (let i = 0; i < 300; i++) {
        c.fillStyle = `rgba(200,195,185,${Math.random() * 0.4})`;
        c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    }),
    transparent: true,
    depthWrite: false,
  })));
  dustBed.rotation.x = -Math.PI / 2;
  dustBed.position.set(bedX, 0.62, bedZ - 0.2);
  dustBed.visible = restarted();
  scene.add(dustBed);

  // nightstand: a music box, a glass of water (the water's surface doesn't move), her clock
  const ns = new THREE.Group();
  ns.add(rbox(0.45, 0.55, 0.4, 0.02, woodDark, 0, 0.275, 0));
  ns.add(rbox(0.16, 0.08, 0.11, 0.01, mat(0x5a2a2a, { roughness: 0.6 }), -0.1, 0.59, 0));
  ns.add(cyl(0.03, 0.028, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), 0.1, 0.6, 0.05, 12));
  const nc = wallClock(0.055, { roman: false, depth: 0.04 });
  nc.group.position.set(0.08, 0.63, -0.1);
  nc.group.rotation.x = -0.3;
  ns.add(nc.group);
  ns.position.set(bedX - 0.8, 0, bedZ - 0.6);
  scene.add(ns);
  // a doll on the chair, watching
  const chair = prop('woodChair', { height: 0.85 });
  if (chair) {
    chair.position.set(-1.2, 0, 0.9);
    chair.rotation.y = 0.9;
    scene.add(chair);
  }
  // the low door to the clock tower (back wall, right), barely 1.4 m high
  const tdX = 1.45;
  scene.add(mesh(new THREE.PlaneGeometry(0.6, 1.4), new THREE.MeshBasicMaterial({ color: 0x050505 }), tdX, 0.7, -D / 2 + 0.012, false));
  const tdPivot = new THREE.Group();
  tdPivot.position.set(tdX - 0.3, 0, -D / 2 + 0.035);
  tdPivot.add(rbox(0.6, 1.4, 0.04, 0.01, woodDark, 0.3, 0.7, 0));
  tdPivot.add(cyl(0.015, 0.015, 0.04, brassMat(), 0.52, 0.7, 0.03, 8).rotateX(Math.PI / 2));
  scene.add(tdPivot);
  if (g.flag('o.towerDoor')) tdPivot.rotation.y = 1.5;
  // the stairs down (front wall, left)
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.0), new THREE.MeshBasicMaterial({ color: 0x050505 }), -1.0, 1.0, D / 2 - 0.012, false).rotateY(Math.PI));

  // ---------------- hotspots ----------------
  const hClara = hitBox(0.7, 0.5, 0.7, bedX, 0.7, bedZ - 0.65, 'clara');
  const hBed = hitBox(1.0, 0.7, 1.4, bedX, 0.4, bedZ + 0.3, 'bed');
  const hNs = hitBox(0.5, 0.75, 0.45, bedX - 0.8, 0.35, bedZ - 0.6, 'nightstand');
  const hDust = hitBox(2.4, 0.8, 1.6, -0.6, 1.9, 0.4, 'dust');
  const hTower = hitBox(0.7, 1.45, 0.3, tdX, 0.72, -D / 2 + 0.15, 'tower');
  const hDown = hitBox(0.95, 2.0, 0.2, -1.0, 1.0, D / 2 - 0.1, 'down');
  scene.add(hClara, hBed, hNs, hDust, hTower, hDown);
  const say = (key: string) => g.say(key);

  const hotspots: Hotspot[] = [
    { id: 'clara', obj: hClara, view: 'bed', tap: async (item) => {
      if (item) return g.nope();
      if (restarted()) return say('ora.claraGone');
      if (g.flag('o.called')) return g.say([{ who: 'clara', key: 'ora.clara3' }]);
      await say('ora.claraLook');
      const ok = await g.physical('shout', 'ora.shoutText');
      if (!ok) return;
      g.set('o.called');
      g.audio.hush(3);
      await sleep(900);
      g.audio.rec('possessed', { gain: 0.4, dur: 2 });
      await g.scare('clara', 700);
      await g.say([
        { who: 'clara', key: 'ora.clara1' },
        { who: 'clara', key: 'ora.clara2' },
        { who: 'clara', key: 'ora.clara3' },
      ]);
      g.audio.sfx('creak');
      for (let i = 0; i <= 20; i++) {
        tdPivot.rotation.y = (i / 20) * 1.5;
        await sleep(30);
      }
      g.set('o.towerDoor');
      return say('ora.towerOpen');
    } },
    { id: 'bed', obj: hBed, view: 'bed', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(restarted() ? 'ora.claraGone' : 'ora.bed');
    } },
    { id: 'nightstand', obj: hNs, view: 'bed', tap: async (item) => {
      if (item) return g.nope();
      if (!restarted()) return say('ora.nightstand');
      g.audio.rec('musicbox', { gain: 0.6 });
      return say('ora.nightstandAfter');
    } },
    { id: 'dust', obj: hDust, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(restarted() ? 'ora.dustAfter' : 'ora.dust');
    } },
    { id: 'tower', obj: hTower, tap: async (item) => {
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

  return {
    id: 'ora_camera',
    nameKey: 'place.oraCamera',
    next: ['ora_torre'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'ora_bottega',
    views: {
      main: { pos: [-1.0, 1.55, 1.35], look: [0.6, 0.75, -1.1], yaw: 60, pitch: 18 },
      bed: { pos: [bedX - 0.25, 1.35, bedZ - 0.05], look: [bedX, 0.7, bedZ - 0.75], parent: 'main', yaw: 15, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      if (restarted()) {
        // time again: the dust drifts down and away
        const p = dgeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < N; i++) {
          let y = p.getY(i) - dt * 0.05;
          if (y < 0.1) y = 2.4;
          p.setY(i, y);
          p.setX(i, p.getX(i) + Math.sin(time * 0.5 + i) * dt * 0.02);
        }
        p.needsUpdate = true;
        nc.setTime(new Date().getHours(), new Date().getMinutes() + time / 60);
      } else nc.setTime(3, 17);
      if (clara.group.visible) clara.update(0, 0, g.engine.camera); // nothing moves, not even her
    },
    enter: async () => {
      // once the clocks run again she is gone, even if this room was built before
      if (restarted()) {
        clara.setOpacity(0);
        clara.group.visible = false;
        dustBed.visible = true;
      }
      if (!g.flag('o.camEntered')) {
        g.set('o.camEntered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'ora.cam1' }, { who: 'diego', key: 'ora.cam2' }]);
      } else if (restarted() && !g.flag('o.camAfter')) {
        g.set('o.camAfter');
        await sleep(400);
        await say('ora.camAfter');
      }
    },
    hint: () => {
      if (g.has('watch')) return 'hint.ora.leave';
      if (!g.flag('o.called')) return 'hint.ora.call';
      return 'hint.ora.tower';
    },
    debug: { clara, lying },
  };
}
