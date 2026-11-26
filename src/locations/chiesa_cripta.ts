import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, hitBox, mat } from '../builders';
import { t } from '../i18n';
import { photoImage, photoOr } from '../photos';
import { stoneWall, stoneFloor, candle, sleep, churchHint } from './chiesa_common';

/**
 * The crypt. Niches, old bones, one candle that somebody keeps lit. On the stone table, Lisa's
 * diary. Reading it, Diego remembers: the 24th of October, the butcher's, his father, the cold
 * room where Lisa hid him. And the man in black: «I can make you forget. In return, you'll bring
 * my things back to me.» Tucked in the diary: the key to the Suitcase of Dreams.
 */
export function createChiesaCripta(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 2.5, 8);
  scene.userData.envIntensity = 0.03;
  const W = 4, H = 2.6, D = 5;
  scene.add(room(W, H, D, { wall: stoneWall(), floor: stoneFloor(), ceil: stoneWall() }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.02));
  const motes = dust([-1.8, 0.2, -2.3], [1.8, 2.4, 2.3], 120);
  scene.add(motes.points);
  // niches with bones along the side walls
  const bone = mat(0xd6d0c0, { roughness: 0.9 });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) for (const y of [0.6, 1.5]) {
    const z = -1.8 + i * 1.1;
    scene.add(mesh(new THREE.PlaneGeometry(0.8, 0.6), mat(0x0a0a0a), s * (W / 2 - 0.012), y + 0.3, z, false).rotateY(-s * Math.PI / 2));
    for (let k = 0; k < 3; k++) scene.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), bone, s * (W / 2 - 0.12), y + 0.1, z - 0.2 + k * 0.2));
  }
  // the stone table, the candle, the diary
  const tZ = -1.6;
  scene.add(rbox(1.2, 0.85, 0.7, 0.02, mat(0x6a665e, { roughness: 1 }), 0, 0.425, tZ));
  const cnd = candle(0.25);
  cnd.group.position.set(-0.4, 0.85, tZ - 0.1);
  scene.add(cnd.group);
  const diary = new THREE.Group();
  diary.add(rbox(0.22, 0.04, 0.3, 0.006, mat(0x3a1a1a, { roughness: 0.7 }), 0, 0.02, 0));
  diary.position.set(0.15, 0.86, tZ);
  diary.rotation.y = -0.2;
  scene.add(diary);
  const done = () => !!g.flag('ch.done');
  // the stairs back up
  for (let i = 0; i < 6; i++) scene.add(rbox(1.0, 0.05, 0.3, 0.01, stoneFloor(), 0, 0.15 + i * 0.3, D / 2 - 0.3 - i * 0.05));

  const hDiary = hitBox(0.35, 0.15, 0.4, 0.15, 0.9, tZ, 'diary');
  const hUp = hitBox(1.1, 2.0, 0.6, 0, 1.0, D / 2 - 0.4, 'up');
  const hNiches = hitBox(W, 2.0, 4.4, 0, 1.0, -0.1, 'niches');
  scene.add(hDiary, hUp, hNiches);
  const say = (k: string) => g.say(k);

  // Diego's memory: drawn panels, or photos/mem_diego_N.jpg if they ship
  const draw = (i: number) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = ['#2a2622', '#1a1816', '#d8d2c6', '#0d0c0b', '#4a463f'][i];
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#0d0c0b';
    if (i === 0 || i === 1) {
      // two kids behind a counter; a big shadow with a cleaver
      c.fillRect(w * 0.3, h * 0.55, w * 0.06, h * 0.4);
      c.fillRect(w * 0.4, h * 0.6, w * 0.05, h * 0.35);
      c.fillRect(w * 0.65, h * 0.2, w * 0.12, h * 0.8);
    }
    if (i === 3) {
      c.fillStyle = '#d6cfc2';
      c.beginPath();
      c.ellipse(w * 0.7, h * 0.4, 30, 40, 0, 0, Math.PI * 2);
      c.fill();
    }
  };
  const panels = [0, 1, 2, 3, 4].map((i) => ({ text: t('mem.diego.' + (i + 1)), draw: photoOr('mem_diego_' + (i + 1), draw(i)) }));

  const hotspots: Hotspot[] = [
    { id: 'diary', obj: hDiary, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('ch.diaryTitle'), t('ch.diary'), true);
      if (done()) return;
      // and then he remembers
      await g.ui.fadeOut(800);
      g.audio.rec('possessed', { gain: 0.35, dur: 4 });
      await g.ui.memory(t('mem.diego.title'), panels);
      g.diaryPage('memDiego');
      await g.ui.fadeIn(600);
      // she's here
      const shot = photoImage('scare_lisa');
      if (shot && !g.settings.reducedScares) {
        const cv = document.createElement('canvas');
        cv.width = 1024;
        cv.height = 576;
        const c = cv.getContext('2d')!;
        const k = Math.max(cv.width / shot.width, cv.height / shot.height);
        c.drawImage(shot, (cv.width - shot.width * k) / 2, (cv.height - shot.height * k) / 2, shot.width * k, shot.height * k);
        g.audio.stinger();
        g.audio.rec('ghostwail', { gain: 0.6, dur: 2 });
        await g.ui.showScare(cv, 900);
      }
      await g.say([{ who: 'lisa', key: 'ch.lisa1' }, { who: 'diego', key: 'ch.lisa2' }, { who: 'lisa', key: 'ch.lisa3' }]);
      g.set('ch.done');
      g.give('suitcasekey');
      g.audio.sfx('pickup');
      await say('ch.keyTaken');
      g.rebuild('map');
      // the butcher's is not the same place any more
      g.rebuild('macelleria');
    } },
    { id: 'niches', obj: hNiches, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('ch.niches');
    } },
    { id: 'up', obj: hUp, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(6, 0.5, false);
      return g.go('chiesa_cimitero');
    } },
  ];

  return {
    id: 'chiesa_cripta',
    nameKey: 'place.chCripta',
    next: ['chiesa_cimitero'],
    scene,
    drone: 'cripta',
    startView: 'main',
    exitTo: 'chiesa_cimitero',
    dark: () => true,
    views: {
      main: { pos: [0, 1.6, 1.6], look: [0, 0.9, -2.0], yaw: 60, pitch: 18 },
      table: { pos: [0.1, 1.45, tZ + 0.8], look: [0.1, 0.86, tZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      const f = 0.85 + Math.sin(time * 9) * 0.08 + Math.sin(time * 23) * 0.05;
      cnd.light.intensity = 0.8 * f;
      cnd.flame.scale.y = 1.8 * f;
    },
    enter: async () => {
      if (!g.flag('ch.cryptEntered')) {
        g.set('ch.cryptEntered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'ch.crypt1' }, { who: 'diego', key: 'ch.crypt2' }]);
      }
    },
    hint: () => churchHint(g),
  };
}
