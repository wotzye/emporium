import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, woodMaterial, tileMaterial, plasterMaterial, mat, framed, cyl, uvInk } from '../builders';
import { t } from '../i18n';
import { oldPhoto } from '../photos';
import { radioHint } from './radio_negozio';
import { radioWall, valveRadio, ether, sleep } from './radio_common';

/**
 * Nello's lab. The bench, the soldering iron still in its stand, a tape recorder with a reel
 * already threaded: Nello recorded himself backwards, so that nobody else would understand.
 * Played forwards it's gibberish; turn the reel back by hand and you hear him, and the code of
 * his room.
 */
export function createRadioLaboratorio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 9);
  scene.userData.envIntensity = 0.06;
  const W = 4, H = 2.7, D = 3.6;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#4f3d2b' });
  scene.add(room(W, H, D, {
    wall: radioWall(),
    floor: tileMaterial({ a: '#8f8a80', b: '#3a3631', n: 9, repeat: [3, 3], grime: 0.7 }),
    ceil: plasterMaterial({ base: '#35312c', repeat: [2, 2], damp: 1 }),
  }));
  const power = () => !!g.flag('rl.power');
  scene.add(new THREE.AmbientLight(0xffffff, power() ? 0.06 : 0.025));
  const lamp = bulb(0.2, 2.25, -0.9, power() ? 7 : 0, 1.0, 6);
  lamp.fill.intensity = power() ? 0.8 : 0;
  (lamp.glass.material as THREE.MeshBasicMaterial).color.set(power() ? 0xfff2d0 : 0x222222);
  scene.add(lamp.group);
  const motes = dust([-1.9, 0.2, -1.7], [1.9, 2.5, 1.7], 120);
  scene.add(motes.points);

  // ---------------- the bench (back wall) ----------------
  const bY = 0.9, bZ = -D / 2 + 0.4;
  scene.add(rbox(3.2, 0.05, 0.75, 0.01, woodMid, 0, bY, bZ));
  for (const x of [-1.5, 1.5]) for (const z of [-0.3, 0.3]) scene.add(rbox(0.05, bY, 0.05, 0.005, woodMid, x, bY / 2, bZ + z));
  // a pegboard of tools and valves, schematics pinned up
  scene.add(rbox(3.0, 1.0, 0.02, 0.005, woodMaterial({ base: '#6a5640' }), 0, 1.75, -D / 2 + 0.02));
  for (let i = 0; i < 14; i++) {
    const v = cyl(0.015, 0.015, 0.07, mat(0x9aa0a4, { transparent: true, opacity: 0.6, roughness: 0.1 }), -1.3 + i * 0.09, 1.45, -D / 2 + 0.06, 8);
    scene.add(v);
  }
  const schema = textPlane([t('radio.schema1'), t('radio.schema2')], 0.5, 0.36, { bg: '#d8d4c8', size: 18, px: 160 });
  schema.position.set(-0.9, 1.9, -D / 2 + 0.04);
  scene.add(schema);
  const benchPhoto = oldPhoto('radio_nello_banco', 330, 246, (c, w, h) => {
    c.fillStyle = '#7a756a';
    c.fillRect(0, 0, w, h);
  }, { age: 0.4, border: false });
  const bp = framed(0.36, 0.27, benchPhoto, woodMaterial({ base: '#1c1510' }));
  bp.position.set(0.9, 1.9, -D / 2 + 0.05);
  scene.add(bp);
  // a calendar stopped on March 1973, one day circled
  const cal = textPlane([t('radio.calendar1'), t('radio.calendar2')], 0.3, 0.4, { bg: '#e2dccc', size: 22, px: 160 });
  cal.position.set(W / 2 - 0.02, 1.6, -0.6);
  cal.rotation.y = -Math.PI / 2;
  scene.add(cal);
  // stuff on the bench
  scene.add(valveRadio(0.45, 0.28, 0.22).translateX(-1.1).translateY(bY + 0.025).translateZ(bZ - 0.1));
  scene.add(cyl(0.01, 0.006, 0.22, mat(0x8a7a5a, { metalness: 0.8 }), -0.35, bY + 0.1, bZ + 0.1, 8).rotateZ(1.0));
  scene.add(rbox(0.25, 0.18, 0.2, 0.01, mat(0x3a3a36, { metalness: 0.5 }), 1.15, bY + 0.115, bZ - 0.05));

  // ---------------- the tape recorder ----------------
  const tr = new THREE.Group();
  tr.add(rbox(0.5, 0.1, 0.34, 0.015, mat(0x5a5650, { roughness: 0.6 }), 0, 0.05, 0));
  tr.add(mesh(new THREE.PlaneGeometry(0.46, 0.3), mat(0x2a2826, { roughness: 0.7 }), 0, 0.101, 0, false).rotateX(-Math.PI / 2));
  const reelM = mat(0x8a8a86, { metalness: 0.7, roughness: 0.35 });
  const tapeM = mat(0x2a1a14, { roughness: 0.6 });
  const makeReel = (full: number) => {
    const r = new THREE.Group();
    r.add(cyl(0.08, 0.08, 0.006, reelM, 0, 0, 0, 24));
    r.add(cyl(0.035 + full * 0.04, 0.035 + full * 0.04, 0.012, tapeM, 0, 0.006, 0, 24));
    for (let k = 0; k < 3; k++) {
      const hole = cyl(0.014, 0.014, 0.014, mat(0x111111), Math.cos((k * Math.PI * 2) / 3) * 0.05, 0.004, Math.sin((k * Math.PI * 2) / 3) * 0.05, 10);
      r.add(hole);
    }
    return r;
  };
  const reelL = makeReel(0.3);
  const reelR = makeReel(0.8);
  reelL.position.set(-0.12, 0.11, -0.02);
  reelR.position.set(0.12, 0.11, -0.02);
  reelR.add(hitBox(0.2, 0.06, 0.2, 0, 0.02, 0, 'reelGrip'));
  tr.add(reelL, reelR);
  tr.add(mesh(new THREE.PlaneGeometry(0.24, 0.006), tapeM, 0, 0.125, 0.06, false).rotateX(-Math.PI / 2));
  const keys = ['◀◀', '▶', '■', '▶▶'];
  keys.forEach((k, i) => tr.add(rbox(0.06, 0.02, 0.03, 0.004, mat(0xcfc8b8), -0.12 + i * 0.08, 0.11, 0.14)));
  tr.position.set(0.3, bY + 0.025, bZ + 0.05);
  scene.add(tr);
  const trLabel = textPlane(['GELOSO G.256'], 0.16, 0.03, { bg: '#5a5650', fg: '#e0d8c4', size: 34, px: 64 });
  trLabel.position.set(0.3, bY + 0.08, bZ + 0.223);
  scene.add(trLabel);

  // ---------------- the Wood's lens (UV), repaired for the parish ----------------
  const lensTaken = () => !!g.flag('rl.lens');
  const lens = new THREE.Group();
  lens.add(cyl(0.045, 0.045, 0.012, new THREE.MeshStandardMaterial({ color: 0x2a1a44, roughness: 0.05, metalness: 0.2, emissive: 0x1a0a33, transparent: true, opacity: 0.9 }), 0, 0.006, 0, 20));
  lens.add(mesh(new THREE.TorusGeometry(0.046, 0.006, 6, 20), mat(0x1a1a1a, { metalness: 0.7 }), 0, 0.006, 0).rotateX(Math.PI / 2));
  const lensTag = textPlane([t('radio.lensTag')], 0.09, 0.04, { bg: '#e2dccb', size: 26, px: 64 });
  lensTag.rotation.x = -Math.PI / 2;
  lensTag.position.set(0.07, 0.002, 0.03);
  lens.add(lensTag);
  lens.position.set(-0.6, bY + 0.026, bZ + 0.18);
  lens.visible = false; // the UV lens is out of the game
  scene.add(lens);
  // chalked on the wall above the recorder: Nello's reminder to himself
  scene.add(uvInk([t('radio.uvTape1'), t('radio.uvTape2')], 0.7, 0.26).translateX(0.3).translateY(1.3).translateZ(-D / 2 + 0.03));

  // ---------------- hotspots ----------------
  const hTape = hitBox(0.55, 0.2, 0.4, 0.3, bY + 0.1, bZ + 0.05, 'tape');
  const hBench = hitBox(3.2, 0.4, 0.8, 0, bY + 0.15, bZ, 'bench');
  const hPhoto = hitBox(0.4, 0.32, 0.1, 0.9, 1.9, -D / 2 + 0.08, 'photo');
  const hSchema = hitBox(0.55, 0.4, 0.1, -0.9, 1.9, -D / 2 + 0.08, 'schema');
  const hCal = hitBox(0.1, 0.45, 0.35, W / 2 - 0.05, 1.6, -0.6, 'calendar');
  const hOut = hitBox(1.0, 2.1, 0.2, 0, 1.05, D / 2 - 0.1, 'out');
  const hLens = hitBox(0.16, 0.08, 0.14, -0.6, bY + 0.04, bZ + 0.18, 'lens');
  scene.add(hTape, hBench, hPhoto, hSchema, hCal, hOut, hLens);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'tape', obj: hTape, view: 'tape', tap: async (item) => {
      if (item) return g.nope();
      if (!power()) return say('radio.tapeNoPower');
      if (!g.flag('rl.tapeSeen')) {
        g.set('rl.tapeSeen');
        g.audio.sfx('click');
        await say('radio.tapePlay');
        await playTape(false);
        return g.say([{ who: 'diego', key: 'radio.tapeAfter1' }, { who: 'diego', key: 'radio.tapeAfter2' }]);
      }
      return say(g.flag('rl.code') ? 'radio.tapeDone' : 'radio.tapeHint');
    } },
    { id: 'lens', obj: hLens, view: 'bench', when: () => false && !lensTaken(), tap: async (item) => {
      if (item) return g.nope();
      lens.visible = false;
      g.set('rl.lens');
      g.give('uvlens');
      g.audio.sfx('pickup');
      await g.say([{ who: 'diego', key: 'radio.lens1' }, { who: 'diego', key: 'radio.lens2' }, { who: 'diego', key: 'radio.lens3' }]);
      g.note('note.uvGoal');
      g.ui.toast(t('radio.lensHow'));
      g.rebuild('map');
    } },
    { id: 'bench', obj: hBench, view: 'bench', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('radio.bench');
    } },
    { id: 'photo', obj: hPhoto, view: 'bench', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.benchPhoto');
    } },
    { id: 'schema', obj: hSchema, view: 'bench', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.schema');
    } },
    { id: 'calendar', obj: hCal, view: 'calendar', tap: async (item) => {
      if (item) return g.nope();
      return say('radio.calendar');
    } },
    { id: 'out', obj: hOut, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // the tape, played one way or the other
  let playing = false;
  const playTape = async (backwards: boolean) => {
    if (playing) return;
    playing = true;
    const e = ether(g.audio);
    e.set(0.15, 1);
    try {
      if (!backwards) {
        await g.say([{ who: 'nello', key: 'radio.tapeFwd' }]);
      } else {
        await g.say([{ who: 'nello', key: 'radio.tapeBack1' }, { who: 'nello', key: 'radio.tapeBack2' }, { who: 'nello', key: 'radio.tapeBack3' }]);
        if (!g.flag('rl.code')) {
          g.set('rl.code');
          g.note('note.nelloCode');
        }
      }
    } finally {
      e.stop();
      playing = false;
    }
  };
  let turned = 0;
  let spinEther: ReturnType<typeof ether> | null = null;
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: reelR,
      center: reelR.getWorldPosition(new THREE.Vector3()),
      when: () => power() && g.viewName === 'tape' && !playing,
      onTurn: (d) => {
        turned += d;
        reelR.rotation.y -= d;
        reelL.rotation.y -= d * 1.6;
        if (!spinEther) {
          spinEther = ether(g.audio);
        }
        spinEther.set(0.1, Math.min(1, Math.abs(d) * 8));
      },
      onEnd: async () => {
        spinEther?.stop();
        spinEther = null;
        const tr2 = turned;
        turned = 0;
        // about a turn and a half one way or the other plays the message
        if (Math.abs(tr2) < Math.PI * 3) return;
        return playTape(tr2 < 0);
      },
    },
  ];

  return {
    id: 'radio_laboratorio',
    nameKey: 'place.radioLab',
    next: ['radio_negozio'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'radio_negozio',
    dark: () => !power(),
    views: {
      main: { pos: [0.2, 1.6, 1.4], look: [0, 1.2, -1.6], yaw: 65, pitch: 18 },
      bench: { pos: [0, 1.65, 0.3], look: [0, 1.3, -D / 2], parent: 'main', yaw: 25, pitch: 12 },
      tape: { pos: [0.3, 1.45, bZ + 0.55], look: [0.3, bY + 0.1, bZ + 0.02], parent: 'main', yaw: 15, pitch: 10, fov: 50 },
      calendar: { pos: [0.6, 1.6, -0.6], look: [W / 2, 1.6, -0.6], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    interactions,
    update: (dt, time) => motes.update(dt, time),
    leave: () => {
      spinEther?.stop();
      spinEther = null;
    },
    enter: async () => {
      if (!g.flag('rl.labEntered')) {
        g.set('rl.labEntered');
        await sleep(300);
        await say(power() ? 'radio.labEnter' : 'radio.labEnterDark');
      }
    },
    hint: () => radioHint(g),
    debug: { reelR, playTape },
  };
}
