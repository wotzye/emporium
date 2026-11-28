import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, mat, hitBox, dust, textPlane, uvInk, woodMaterial, plasterMaterial, cyl } from '../builders';
import { prop, cursify, type ModelId } from '../models';
import { t } from '../i18n';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** the day Lisa went away: 24 October 1974 (the register in the sacristy) */
export const SUITCASE_CODE = '241074';
/** the four suitcases on the high shelf, left to right: whose dream is in each */
const HIGH = ['Aldo', 'Ada', 'Paolo', 'LISA'] as const;
const LISA_IDX = 3;

/**
 * The suitcase maker's, at the end of the alley. Suitcases to the ceiling, every one closed,
 * every one breathing a little. He made them for the man in black: each holds somebody's dream.
 * On the high shelf four small ones with blank luggage tags: only in UV light do the tags show a
 * name. Lisa's comes down; the key from the crypt and the day she went away open it.
 */
export function createValigiaBottega(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3.5, 10);
  scene.userData.envIntensity = 0.05;
  const W = 5, H = 3.2, D = 5;
  scene.add(room(W, H, D, {
    wall: plasterMaterial({ base: '#5c5750', repeat: [3, 2], damp: 1.2 }),
    floor: woodMaterial({ base: '#2c2219', repeat: [3, 3], plank: true }),
    ceil: plasterMaterial({ base: '#2e2b27', repeat: [2, 2], damp: 0.6 }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.04));
  const lamp = new THREE.PointLight(0xffd9a8, 1.4, 6, 1.6);
  lamp.position.set(0.4, 2.2, 0.2);
  scene.add(lamp);
  const shade = mesh(new THREE.ConeGeometry(0.22, 0.18, 16, 1, true), mat(0x1a1814, { side: THREE.DoubleSide }), 0.4, 2.35, 0.2, false);
  shade.userData.noPick = true;
  scene.add(shade, cyl(0.005, 0.005, 0.8, mat(0x111111), 0.4, 2.8, 0.2, 4));
  const motes = dust([-2.3, 0.2, -2.3], [2.3, 3, 2.3], 160);
  scene.add(motes.points);
  const woodDark = woodMaterial({ base: '#2a2018' });

  /** a suitcase from one of the models (grey and old), or a plain box */
  const KINDS: ModelId[] = ['suitA', 'suitB', 'suitC', 'trunkA', 'suitD'];
  let k = 0;
  const suitcase = (w: number, flat = true) => {
    const id = KINDS[k++ % KINDS.length];
    const o = prop(id, { width: w, grey: 0.75 });
    if (o) {
      if (!flat) o.rotation.z = Math.PI / 2;
      return o;
    }
    return rbox(w, w * 0.35, w * 0.6, 0.02, mat(0x3a332c, { roughness: 0.8 }), 0, w * 0.175, 0);
  };

  // ---------------- shelves of suitcases, back and left walls ----------------
  for (const y of [0.05, 0.85, 1.65]) {
    scene.add(rbox(4.4, 0.04, 0.6, 0.01, woodDark, 0, y, -D / 2 + 0.32));
    for (let i = 0; i < 6; i++) {
      const s = suitcase(0.6 + ((i * 7 + y * 10) % 3) * 0.08);
      s.position.set(-1.9 + i * 0.75, y + 0.02, -D / 2 + 0.32);
      s.rotation.y = ((i % 3) - 1) * 0.08;
      s.userData.noPick = true;
      scene.add(s);
    }
  }
  for (const y of [0.05, 0.85]) {
    scene.add(rbox(0.6, 0.04, 3.4, 0.01, woodDark, -W / 2 + 0.32, y, 0.3));
    for (let i = 0; i < 4; i++) {
      const s = suitcase(0.65);
      s.rotation.y = Math.PI / 2 + ((i % 2) - 0.5) * 0.1;
      s.position.set(-W / 2 + 0.32, y + 0.02, -1.0 + i * 0.85);
      scene.add(s);
    }
  }
  // a big trunk standing on the floor, by the door
  const trunk = prop('trunkB', { width: 1.0, grey: 0.7, turn: -Math.PI / 2 });
  if (trunk) {
    trunk.position.set(W / 2 - 0.5, 0, 1.4);
    scene.add(trunk);
  }

  // ---------------- the high shelf (right wall): four small suitcases, blank tags ----------------
  const hy = 2.35, hx = W / 2 - 0.3;
  scene.add(rbox(0.5, 0.04, 2.8, 0.01, woodDark, hx, hy, -0.6));
  const highZ = [-1.65, -0.95, -0.25, 0.45];
  const high = highZ.map((z, i) => {
    const grp = new THREE.Group();
    const s = prop('suitC', { width: 0.5, grey: 0.75, turn: -Math.PI / 2 }) ?? rbox(0.3, 0.18, 0.5, 0.02, mat(0x3a332c), 0, 0.09, 0);
    grp.add(s);
    // the luggage tag on its string: blank; the name only in UV light
    const tag = mesh(new THREE.PlaneGeometry(0.11, 0.06), mat(0xd9d2c0, { roughness: 1, side: THREE.DoubleSide }), -0.13, 0.05, 0.12, false);
    tag.rotation.y = -Math.PI / 2;
    grp.add(tag);
    const ink = uvInk([HIGH[i]], 0.1, 0.05, { size: 22 });
    ink.position.set(-0.132, 0.05, 0.12);
    ink.rotation.y = -Math.PI / 2;
    ink.userData.onReveal = () => g.set('v.tag' + i);
    grp.add(ink);
    grp.position.set(hx, hy + 0.02, z);
    scene.add(grp);
    return grp;
  });
  const ladder = prop('ladder', { height: 2.6, turn: Math.PI / 2 });
  if (ladder) {
    ladder.position.set(W / 2 - 0.65, 0, -2.0);
    ladder.rotation.z = 0.12;
    scene.add(ladder);
  }

  // ---------------- the workbench ----------------
  const bx = 0.2, bz = 0.3, bY = 0.9;
  scene.add(rbox(1.8, 0.06, 0.8, 0.01, woodMaterial({ base: '#4a3a2a' }), bx, bY, bz));
  for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) scene.add(rbox(0.06, bY, 0.06, 0.01, woodDark, bx + x, bY / 2, bz + z));
  // the order book, open
  const book = rbox(0.42, 0.03, 0.3, 0.006, mat(0xd8d0bc, { roughness: 0.9 }), bx - 0.5, bY + 0.045, bz + 0.1);
  book.rotation.y = 0.2;
  scene.add(book);
  // leather, thread, an awl
  scene.add(rbox(0.5, 0.01, 0.35, 0.004, mat(0x2a1c14, { roughness: 0.6 }), bx + 0.45, bY + 0.035, bz - 0.1));
  scene.add(cyl(0.004, 0.002, 0.14, mat(0x8a8a88, { metalness: 0.8 }), bx + 0.2, bY + 0.04, bz + 0.2, 6).rotateZ(Math.PI / 2));
  // Lisa's suitcase, once it is down: on the bench
  const lisaCase = new THREE.Group();
  const lc = prop('suitC', { width: 0.55, turn: 0 }) ?? rbox(0.55, 0.2, 0.34, 0.02, mat(0x5a1a1a), 0, 0.1, 0);
  // the only red in the room: it is cursed
  lisaCase.add(cursify(lc));
  lisaCase.position.set(bx + 0.25, bY + 0.03, bz + 0.05);
  scene.add(lisaCase);
  const down = () => !!g.flag('v.down');
  lisaCase.visible = down();
  high[LISA_IDX].visible = !down();
  // Lisa's own writing, on the wall above the bench
  const note = uvInk([t('uv.v1'), t('uv.v2')], 1.3, 0.4);
  note.position.set(bx, 1.85, -D / 2 + 0.66);
  scene.add(note);
  // the maker's apron on a nail, his name sewn on it
  const apron = textPlane([t('v.apronName')], 0.5, 0.75, { bg: '#4a4038', fg: '#cfc6b4', size: 26, px: 128 });
  apron.position.set(-1.0, 1.4, D / 2 - 0.03);
  apron.rotation.y = Math.PI;
  scene.add(apron);

  // ---------------- hotspots ----------------
  const hHigh = high.map((grp, i) => {
    const h = hitBox(0.45, 0.3, 0.6, hx, hy + 0.15, highZ[i], 'high' + i);
    scene.add(h);
    return h;
  });
  const hBook = hitBox(0.5, 0.2, 0.4, bx - 0.5, bY + 0.08, bz + 0.1, 'orders');
  const hCase = hitBox(0.7, 0.35, 0.5, bx + 0.25, bY + 0.15, bz + 0.05, 'lisacase');
  const hShelves = hitBox(4.4, 2.2, 0.7, 0, 1.1, -D / 2 + 0.35, 'shelves');
  const hApron = hitBox(0.6, 0.85, 0.1, -1.0, 1.4, D / 2 - 0.06, 'apron');
  const hTrunk = hitBox(1.1, 0.7, 0.7, W / 2 - 0.5, 0.35, 1.4, 'trunk');
  scene.add(hBook, hCase, hShelves, hApron, hTrunk);
  const say = (k: string) => g.say(k);
  const lit = () => true;

  const openCase = async () => {
    g.set('v.open');
    g.audio.sfx('unlock');
    await sleep(400);
    g.audio.sfx('creak');
    await say('v.caseOpen');
    g.audio.rec('windup', { gain: 0.6 });
    g.audio.musicBox({ gain: 0.45, bars: 9 });
    await g.ui.fadeOut(1400);
    await g.go('valigia_sogno', false);
  };

  const hotspots: Hotspot[] = [
    ...hHigh.map((h, i): Hotspot => ({ id: 'high' + i, obj: h, view: 'high', when: () => i !== LISA_IDX || !down(), tap: async (item) => {
      if (item) return g.nope();
      if (!lit()) return say(g.has('uvlens') ? 'v.tagBlankLens' : 'v.tagBlank');
      g.set('v.tag' + i);
      g.audio.sfx('whisper');
      await g.say([{ who: 'diego', key: 'v.tagName', vars: { name: HIGH[i] } }]);
      if (i !== LISA_IDX) return say('v.tagOther');
      // hers: down it comes
      g.set('v.down');
      g.audio.sfx('scrape');
      high[i].visible = false;
      lisaCase.visible = true;
      await say('v.caseDown');
    } })),
    { id: 'lisacase', obj: hCase, view: 'bench', when: () => down(), tap: async (item) => {
      if (g.flag('v.open')) {
        if (item) return g.nope();
        return openCase();
      }
      if (item === 'suitcasekey') {
        g.deselect();
        g.take('suitcasekey');
        g.set('v.key');
        g.audio.sfx('unlock');
        return say('v.keyIn');
      }
      if (item) return g.nope();
      if (!g.flag('v.key')) return say('v.caseLocked');
      const ok = await g.ui.keypad(t('v.comboTitle'), 6, (c) => c === SUITCASE_CODE, () => g.audio.sfx('tick'));
      if (!ok) return;
      return openCase();
    } },
    { id: 'orders', obj: hBook, view: 'bench', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.readDoc('v.ordersTitle', 'v.orders');
      if (!g.flag('v.ordersRead')) {
        g.set('v.ordersRead');
        g.note('note.v.orders');
      }
    } },
    { id: 'shelves', obj: hShelves, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('v.shelves');
    } },
    { id: 'apron', obj: hApron, tap: async (item) => {
      if (item) return g.nope();
      return say('v.apron');
    } },
    { id: 'trunk', obj: hTrunk, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('thud');
      return say('v.trunk');
    } },
  ];

  return {
    id: 'valigia_bottega',
    nameKey: 'place.valigia',
    next: ['valigia_sogno'],
    scene,
    drone: 'emporio',
    startView: 'main',
    dark: () => true,
    views: {
      main: { pos: [-0.6, 1.65, 2.0], look: [0.6, 1.3, -1.2], yaw: 70, pitch: 22 },
      high: { pos: [0.6, 2.0, -0.6], look: [hx, hy + 0.15, -0.6], parent: 'main', yaw: 30, pitch: 15, fov: 60 },
      bench: { pos: [bx, 1.55, bz + 1.0], look: [bx, bY, bz], parent: 'main', yaw: 25, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      // the suitcases breathe
      high.forEach((s, i) => (s.scale.y = 1 + Math.sin(time * 1.3 + i) * 0.015));
      lamp.intensity = Math.random() < 0.01 ? 0.4 : 1.4;
    },
    enter: async () => {
      if (!g.flag('v.entered')) {
        g.set('v.entered');
        await sleep(400);
        await g.say([{ who: 'diego', key: 'v.enter1' }, { who: 'diego', key: 'v.enter2' }, { who: 'lisa', key: 'v.enter3' }]);
      }
    },
    hint: () => {
      if (!g.flag('v.ordersRead')) return 'hint.v.orders';
      if (!down()) return 'hint.v.tags';
      if (!g.flag('v.key')) return 'hint.v.key';
      return 'hint.v.combo';
    },
    debug: { openCase },
  };
}
