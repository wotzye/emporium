import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, mat, hitBox, dust, lathe, uvInk, woodMaterial, plasterMaterial, cyl } from '../builders';
import { createBruno } from '../characters';
import { t } from '../i18n';
import { photoOr } from '../photos';
import { candle } from './chiesa_common';
import { onWall } from './lisa_uv';
import { sleep, mac2Hint, smear } from './mac2_common';

/**
 * The cellar under the curing room, where Bruno met the man in black. Lisa wrote the way to
 * free him on the wall, in her ink: salt in a circle, five flames (one for every memory given
 * back), something of hers in the middle. Then call him, the way you called him as a child.
 * Not holy water: his son's voice.
 */
export function createMacCantina(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 7.5);
  scene.userData.envIntensity = 0.03;
  const W = 4.2, H = 2.3, D = 4.4;
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#55514a', repeat: [3, 2], damp: 1.6 }),
    floor: plasterMaterial({ base: '#35312c', repeat: [3, 3], damp: 1.2 }),
    ceil: woodMaterial({ base: '#1a150f', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.045));
  const motes = dust([-2, 0.2, -2], [2, 2.2, 2], 140);
  scene.add(motes.points);
  // the stairs down from the trapdoor
  for (let i = 0; i < 7; i++) scene.add(rbox(0.9, 0.05, 0.28, 0.01, woodMaterial({ base: '#2c2219' }), -1.4, 0.15 + i * 0.3, D / 2 - 0.25 - i * 0.24));
  // shelves of jars along the left wall
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfd2c8, transparent: true, opacity: 0.35, roughness: 0.1 });
  const brine = mat(0x4a4640, { roughness: 0.6 });
  for (const y of [0.5, 1.1, 1.7]) {
    scene.add(rbox(0.35, 0.03, 2.4, 0.01, woodMaterial({ base: '#3a2c20' }), -W / 2 + 0.2, y, -0.6));
    for (let k = 0; k < 7; k++) {
      const z = -1.7 + k * 0.34;
      scene.add(lathe([[0, 0], [0.06, 0], [0.065, 0.16], [0.04, 0.2], [0.04, 0.22], [0, 0.22]], glass, -W / 2 + 0.2, y + 0.015, z, 12));
      scene.add(cyl(0.055, 0.055, 0.12, brine, -W / 2 + 0.2, y + 0.08, z, 10));
    }
  }
  // the man in black's corner: a chair, a small table, an empty hook on the wall
  const tx = 1.3, tz = -1.5;
  const darkWood = woodMaterial({ base: '#2a2018' });
  scene.add(rbox(0.7, 0.04, 0.5, 0.01, darkWood, tx, 0.75, tz));
  for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) scene.add(rbox(0.04, 0.75, 0.04, 0.01, darkWood, tx + x, 0.375, tz + z));
  const chair = new THREE.Group();
  chair.add(rbox(0.42, 0.04, 0.42, 0.01, darkWood, 0, 0.45, 0));
  chair.add(rbox(0.42, 0.5, 0.04, 0.01, darkWood, 0, 0.72, -0.2));
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) chair.add(rbox(0.035, 0.45, 0.035, 0.01, darkWood, x, 0.225, z));
  chair.position.set(tx + 0.1, 0, tz - 0.55);
  scene.add(chair);
  // a contract on the table, signed
  const contract = rbox(0.21, 0.004, 0.29, 0.002, mat(0xd8d0bc, { roughness: 0.9 }), tx - 0.1, 0.775, tz);
  contract.rotation.y = 0.3;
  scene.add(contract);
  scene.add(smear(1.4, 1.4, 0.2, 0.3, 0.4, 13));
  // an oil lamp on the table, turned low: someone left it burning
  const oil = new THREE.PointLight(0xffc890, 0.9, 4.5, 1.6);
  oil.position.set(tx + 0.22, 1.05, tz + 0.1);
  scene.add(oil);
  scene.add(lathe([[0, 0], [0.06, 0], [0.07, 0.05], [0.03, 0.09], [0.035, 0.2], [0.02, 0.22], [0, 0.22]], new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0x6a5030, transparent: true, opacity: 0.7 }), tx + 0.22, 0.77, tz + 0.1, 12));

  // Lisa's instructions, on the back wall
  const ink = uvInk([t('uv.m2ritual1'), t('uv.m2ritual2'), t('uv.m2ritual3')], 1.8, 0.62, {
    onReveal: async () => {
      if (g.flag('m2.ritualRead')) return;
      g.set('m2.ritualRead');
      g.note('note.m2.ritual');
      g.audio.sfx('whisper');
      await g.say('m2.ritualReadSay');
    },
  });
  onWall(ink, 'back', W, D, -0.4, 1.45);
  scene.add(ink);

  // ---------------- the circle ----------------
  const cx = -0.3, cz = -0.2, R = 0.75;
  const saltRing = mesh(new THREE.RingGeometry(R - 0.04, R + 0.04, 48), new THREE.MeshStandardMaterial({ color: 0xbcbab4, roughness: 1 }), cx, 0.008, cz, false);
  saltRing.rotation.x = -Math.PI / 2;
  saltRing.userData.noPick = true;
  scene.add(saltRing);
  const candles = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const c = candle(0.16 + (i % 2) * 0.05);
    c.group.position.set(cx + Math.cos(a) * (R + 0.12), 0, cz + Math.sin(a) * (R + 0.12));
    c.group.traverse((o) => (o.userData.noPick = true));
    scene.add(c.group);
    return c;
  });
  const ribbonC = new THREE.Group();
  const rib = mat(0xe8e4dc, { roughness: 0.7 });
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), rib, s * 0.05, 0, 0);
    loop.scale.y = 0.6;
    loop.rotation.x = -Math.PI / 2;
    ribbonC.add(loop);
  }
  ribbonC.position.set(cx, 0.02, cz);
  scene.add(ribbonC);
  const show = () => {
    saltRing.visible = !!g.flag('m2.salt');
    const lit = !!g.flag('m2.candles') && !g.flag('m2.done');
    candles.forEach((c) => {
      c.flame.visible = lit;
      c.light.intensity = lit ? 1.0 : 0;
    });
    ribbonC.visible = !!g.flag('m2.ribbon') && !g.flag('m2.done');
  };
  show();

  // Bruno, what's left of him
  const brunoC = createBruno();
  const bruno = brunoC.group;
  bruno.position.set(cx, 0, cz - 0.15);
  bruno.visible = false;
  bruno.traverse((o) => (o.userData.noPick = true));
  scene.add(bruno);
  // a cold light from nowhere, on him only
  const ghostLight = new THREE.SpotLight(0xdfe6ff, 0, 5, 0.5, 0.6, 1.2);
  ghostLight.position.set(cx, H - 0.05, cz + 0.6);
  ghostLight.target.position.set(cx, 1.0, cz - 0.15);
  scene.add(ghostLight, ghostLight.target);
  const fade = (k: number) =>
    bruno.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
        x.transparent = true;
        x.opacity = k;
        x.depthWrite = k > 0.9;
      }
    });

  // ---------------- hotspots ----------------
  const hCircle = hitBox(2.0, 0.4, 2.0, cx, 0.15, cz, 'circle');
  const hTable = hitBox(0.9, 0.5, 0.7, tx, 0.8, tz, 'table');
  const hChair = hitBox(0.5, 1.0, 0.5, tx + 0.1, 0.5, tz - 0.55, 'chair');
  const hJars = hitBox(0.5, 1.8, 2.5, -W / 2 + 0.2, 1.1, -0.6, 'jars');
  const hUp = hitBox(1.0, 2.0, 1.6, -1.4, 1.0, D / 2 - 0.9, 'up');
  const hWall = hitBox(2.0, 0.8, 0.1, -0.4, 1.45, -D / 2 + 0.06, 'wall');
  scene.add(hWall);
  scene.add(hCircle, hTable, hChair, hJars, hUp);
  const say = (k: string) => g.say(k);
  const ready = () => g.flag('m2.salt') && g.flag('m2.candles') && g.flag('m2.ribbon');

  /** Diego's memory of his father: drawn panels, or photos/mem_bruno_N.jpg if they ship */
  const draw = (i: number) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = ['#bdb6aa', '#8a857c', '#2a2622', '#1a1816', '#d8d2c6'][i];
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1816';
    if (i === 0) {
      // the shop front and a man in an apron
      c.fillRect(w * 0.1, h * 0.15, w * 0.8, h * 0.12);
      c.fillRect(w * 0.45, h * 0.35, w * 0.12, h * 0.6);
    }
    if (i === 1) {
      // father and two children
      c.fillRect(w * 0.4, h * 0.25, w * 0.12, h * 0.7);
      c.fillRect(w * 0.6, h * 0.55, w * 0.07, h * 0.4);
      c.fillRect(w * 0.27, h * 0.6, w * 0.06, h * 0.35);
    }
    if (i === 2 || i === 3) {
      c.fillStyle = '#0a0908';
      c.fillRect(w * 0.6, h * 0.15, w * 0.15, h * 0.85);
      c.fillStyle = '#d6cfc2';
      c.fillRect(w * 0.3, h * 0.5, w * 0.12, h * 0.08);
    }
  };
  const panels = [0, 1, 2, 3, 4].map((i) => ({ text: t('mem.bruno.' + (i + 1)), draw: photoOr('mem_bruno_' + (i + 1), draw(i)) }));

  /** he's here: the circle holds him */
  const manifest = async () => {
    g.set('m2.manifest');
    g.audio.hush(6);
    candles.forEach((c) => (c.light.intensity = 0.2));
    await sleep(700);
    g.audio.rec('possessed', { gain: 0.5, dur: 3 });
    fade(0);
    bruno.visible = true;
    ghostLight.intensity = 7;
    for (let k = 0; k <= 20; k++) {
      fade(k / 20);
      await sleep(60);
    }
    brunoC.setEyes(true);
    g.engine.shake(0.05, 0.6);
    await g.view('circle', 0.6);
    await g.say([{ who: 'bruno', key: 'm2.bruno1' }, { who: 'diego', key: 'm2.bruno2' }, { who: 'bruno', key: 'm2.bruno3' }]);
  };

  /** Diego calls him: the shout frees him */
  const callHim = async (forced = false) => {
    const ok = forced || (await g.physical('shout', 'm2.shoutText'));
    if (!ok) return say('m2.notYet');
    g.audio.sfx('whisper');
    brunoC.setEyes(false);
    candles.forEach((c) => (c.light.intensity = 1.2));
    g.engine.shake(0.04, 0.8);
    await sleep(800);
    await g.say([
      { who: 'bruno', key: 'm2.free1' },
      { who: 'diego', key: 'm2.free2' },
      { who: 'bruno', key: 'm2.free3' },
      { who: 'bruno', key: 'm2.free4' },
    ]);
    g.give('blackcard');
    await g.say([{ who: 'bruno', key: 'm2.free5' }, { who: 'diego', key: 'm2.free6' }]);
    // he goes
    for (let k = 20; k >= 0; k--) {
      fade(k / 20);
      await sleep(80);
    }
    bruno.visible = false;
    ghostLight.intensity = 0;
    g.set('m2.done');
    show();
    // what Diego gets back: his father, before
    g.audio.rec('windup', { gain: 0.7 });
    setTimeout(() => g.audio.musicBox({ gain: 0.4, runDown: true, bars: 13 }), 1400);
    await g.ui.fadeOut(800);
    await g.ui.memory(t('mem.bruno.title'), panels);
    g.diaryPage('memBruno');
    await g.ui.fadeIn(800);
    // her ribbon stays with him
    g.give('ribbon');
    await g.say([{ who: 'diego', key: 'm2.after1' }, { who: 'diego', key: 'm2.after2' }]);
    g.rebuild('map');
    g.rebuild('macelleria');
  };

  const hotspots: Hotspot[] = [
    { id: 'circle', obj: hCircle, view: 'circle', tap: async (item) => {
      if (g.flag('m2.done')) return item ? g.nope() : say('m2.circleDone');
      if (item && !g.flag('m2.ritualRead')) return say('m2.dontKnow');
      if (item === 'salt') {
        g.deselect();
        g.take('salt');
        g.set('m2.salt');
        g.audio.sfx('rub');
        show();
        await say('m2.saltDone');
      } else if (item === 'matches') {
        g.deselect();
        g.take('matches');
        g.set('m2.candles');
        g.audio.sfx('switch');
        show();
        await say('m2.candlesDone');
      } else if (item === 'ribbon') {
        if (!g.flag('m2.salt') || !g.flag('m2.candles')) return say('m2.ribbonTooSoon');
        g.deselect();
        g.take('ribbon');
        g.set('m2.ribbon');
        show();
        await say('m2.ribbonDone');
      } else if (item) return g.nope();
      else if (!g.flag('m2.ritualRead')) return say('m2.circle');
      else if (!ready()) return say('m2.circleNeed');
      if (ready()) {
        if (!g.flag('m2.manifest')) await manifest();
        else {
          bruno.visible = true;
          ghostLight.intensity = 7;
          fade(1);
        }
        await callHim();
      }
    } },
    { id: 'table', obj: hTable, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.readDoc('m2.contractTitle', 'm2.contract', false);
      if (!g.flag('m2.contractRead')) {
        g.set('m2.contractRead');
        await say('m2.contractSay');
      }
    } },
    { id: 'chair', obj: hChair, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('m2.chair');
    } },
    { id: 'wall', obj: hWall, view: 'wall', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('m2.ritualRead')) return say('m2.ritualWall');
      return say(g.uvOn && g.engine.torchOn ? 'm2.wallUv' : 'm2.cantinaWall');
    } },
    { id: 'jars', obj: hJars, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('m2.jars');
    } },
    { id: 'up', obj: hUp, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(6, 0.45, false);
      return g.go('mac_retro');
    } },
  ];

  return {
    id: 'mac_cantina',
    nameKey: 'place.macCantina',
    next: ['mac_retro'],
    scene,
    drone: 'cripta',
    startView: 'main',
    exitTo: 'mac_retro',
    dark: () => true,
    views: {
      main: { pos: [-0.9, 1.6, 1.7], look: [0.0, 0.6, -1.5], yaw: 60, pitch: 18 },
      circle: { pos: [cx + 0.2, 1.6, cz + 2.0], look: [cx, 0.8, cz], parent: 'main', yaw: 20, pitch: 14 },
      wall: { pos: [-0.4, 1.5, 0.3], look: [-0.4, 1.45, -D / 2], parent: 'main', yaw: 25, pitch: 14, fov: 55 },
      table: { pos: [tx - 0.2, 1.4, tz + 0.75], look: [tx - 0.1, 0.77, tz], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      candles.forEach((c, i) => {
        if (!c.flame.visible) return;
        const f = 0.85 + Math.sin(time * 9 + i) * 0.08 + Math.sin(time * 23 + i * 2) * 0.05;
        c.flame.scale.y = 1.8 * f;
      });
      if (bruno.visible) brunoC.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('m2.cantinaEntered')) {
        g.set('m2.cantinaEntered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'm2.cantina1' }, { who: 'diego', key: 'm2.cantina2' }]);
      }
    },
    hint: () => mac2Hint(g),
    debug: { callHim, manifest },
  };
}
