import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, bulb, lightCone, woodMaterial, mat, cyl, canvasTex, noise } from '../builders';
import { prop } from '../models';
import { t } from '../i18n';
import { fotoWall, sleep, groupPhoto, photoScrap, piecesFound, PIECES } from './foto_common';

/**
 * The retouching room, behind the archive: where Giulio painted out wrinkles and scratches on
 * the negatives, at a sloping light table, with brushes thin as an eyelash. Somebody tore up a
 * photograph here and scattered the pieces: two in the archive, three in this room (one only
 * shows in UV light: Lisa marked it). Put back together on the light table, it is the village
 * feast of 1973, everybody from the shops; one face scratched out, the man in the apron.
 * «Chi manca, apre»: the tin in drawer 31 opens with his name.
 */
export function createFotoRitocco(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.07;
  const W = 3.2, H = 2.6, D = 3.0;
  scene.add(room(W, H, D, {
    wall: fotoWall(),
    floor: woodMaterial({ base: '#2f251c', repeat: [3, 3], plank: true }),
    ceil: woodMaterial({ base: '#211b16', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const lamp = bulb(-0.6, 2.2, 0.2, 4, 1.0, 5);
  scene.add(lamp.group);
  scene.add(lightCone(-0.6, 2.18, 0.2, 2.0, 0.9, 0.022));
  const motes = dust([-1.5, 0.2, -1.4], [1.5, 2.4, 1.4], 120);
  scene.add(motes.points);
  const woodDark = woodMaterial({ base: '#2a1f16' });
  const woodMid = woodMaterial({ base: '#4e3b2a' });

  // ---------------- the sloping light table (back wall) ----------------
  const tX = 0.2, tZ = -D / 2 + 0.45, tY = 0.86;
  scene.add(rbox(1.3, 0.05, 0.7, 0.01, woodMid, tX, tY, tZ));
  for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) scene.add(rbox(0.05, tY, 0.05, 0.005, woodMid, tX + x, tY / 2, tZ + z));
  const desk = new THREE.Group();
  desk.add(rbox(0.9, 0.04, 0.55, 0.01, woodDark, 0, 0, 0));
  const glow = mesh(new THREE.PlaneGeometry(0.75, 0.42), new THREE.MeshBasicMaterial({ color: 0xe6e8ea }), 0, 0.022, 0, false);
  glow.rotation.x = -Math.PI / 2;
  desk.add(glow);
  desk.position.set(tX, tY + 0.12, tZ);
  desk.rotation.x = 0.35;
  scene.add(desk);
  const tableLight = new THREE.PointLight(0xeef0f2, 0.8, 2.2, 1.8);
  tableLight.position.set(tX, tY + 0.35, tZ + 0.1);
  scene.add(tableLight);
  // the finished collage, once it is whole
  const whole = mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(groupPhoto()), roughness: 0.9 }), 0, 0.03, 0, false);
  whole.rotation.x = -Math.PI / 2;
  (whole.material as THREE.MeshStandardMaterial).map!.colorSpace = THREE.SRGBColorSpace;
  whole.visible = !!g.flag('f.collage');
  desk.add(whole);
  // brushes in a jar, dye bottles, a magnifier on an arm
  scene.add(cyl(0.04, 0.035, 0.1, mat(0x5a5650, { roughness: 0.5 }), tX + 0.5, tY + 0.075, tZ - 0.2, 10));
  for (let i = 0; i < 6; i++) scene.add(cyl(0.003, 0.002, 0.18, mat(0x2a1a10), tX + 0.48 + (i % 3) * 0.015, tY + 0.17, tZ - 0.21 + Math.floor(i / 3) * 0.02, 4).rotateZ((i - 2.5) * 0.08));
  for (let i = 0; i < 4; i++) scene.add(cyl(0.02, 0.02, 0.07, new THREE.MeshStandardMaterial({ color: [0x2a2622, 0x4a4640, 0x6a665e, 0x8a867e][i], transparent: true, opacity: 0.8, roughness: 0.1 }), tX - 0.5 + i * 0.05, tY + 0.06, tZ - 0.25, 10));
  const lens = new THREE.Group();
  lens.add(cyl(0.006, 0.006, 0.5, mat(0x3a3a38, { metalness: 0.7 }), 0, 0.25, 0, 6));
  lens.add(mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 20), mat(0x3a3a38, { metalness: 0.7 }), 0, 0.5, 0.04));
  lens.add(mesh(new THREE.CircleGeometry(0.065, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0.02 }), 0, 0.5, 0.04, false));
  lens.position.set(tX - 0.45, tY + 0.03, tZ + 0.1);
  lens.rotation.x = -0.6;
  scene.add(lens);
  // negatives drying on a line
  scene.add(cyl(0.003, 0.003, W - 0.2, mat(0x8a8478), 0, 2.15, -0.2, 4).rotateZ(Math.PI / 2));
  const stripTex = canvasTex(64, 256, (c, w, h) => {
    c.fillStyle = '#1a1816';
    c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 52) {
      c.fillStyle = '#5a564e';
      c.fillRect(8, y, w - 16, 44);
      c.fillStyle = '#2a2622';
      c.beginPath();
      c.arc(w / 2, y + 18, 9, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, w, h, 400, 0.1);
  });
  for (let i = 0; i < 7; i++) {
    const s = mesh(new THREE.PlaneGeometry(0.06, 0.32), new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), -1.3 + i * 0.4, 1.98, -0.2, false);
    s.userData.sway = i;
    scene.add(s);
  }

  // ---------------- the wastebasket, the framed proof on the wall, a dark corner ----------------
  const binX = 1.1, binZ = -0.7;
  const bin = prop('trashCan', { height: 0.42, grey: 0.7 }) ?? cyl(0.15, 0.12, 0.4, mat(0x3a3836, { metalness: 0.5 }), 0, 0.2, 0, 14);
  bin.position.set(binX, 0, binZ);
  scene.add(bin);
  for (let i = 0; i < 4; i++) {
    const ball = mesh(new THREE.IcosahedronGeometry(0.045, 0), mat(0xd8d2c4, { roughness: 1, flatShading: true }), binX + (i - 1.5) * 0.04, 0.38, binZ + (i % 2) * 0.04);
    scene.add(ball);
  }
  // a proof print, framed and hung crooked: something sticks out from behind it
  const frameX = -1.15, frameZ = -D / 2 + 0.02;
  const proof = textPlane([t('foto.proof')], 0.42, 0.32, { bg: '#cfc8b8', size: 20, px: 128, border: '#2a1f16' });
  proof.position.set(frameX, 1.55, frameZ + 0.01);
  proof.rotation.set(0, 0, 0.06);
  scene.add(proof);
  // a cupboard in the far right corner; the floor behind it only Lisa's ink can show
  scene.add(rbox(0.5, 1.6, 0.45, 0.01, woodDark, W / 2 - 0.3, 0.8, -D / 2 + 0.3));

  // the three pieces in this room
  const p3 = photoScrap(3);
  p3.position.set(binX + 0.02, 0.43, binZ - 0.02);
  p3.rotation.set(-1.2, 0.4, 0.2);
  const p4 = photoScrap(4);
  p4.position.set(frameX + 0.19, 1.37, frameZ + 0.015);
  p4.rotation.set(0, 0, -0.3);
  const p5 = photoScrap(5, true);
  p5.position.set(W / 2 - 0.62, 0.006, -D / 2 + 0.25);
  p5.rotation.set(-Math.PI / 2, 0, 0.7);
  // Lisa's mark on it: it glows in the UV beam (until then it's lost in the dark corner)
  const p5mat = p5.material as THREE.MeshStandardMaterial;
  p5mat.transparent = true;
  const pieces = [null, null, p3, p4, p5];
  pieces.forEach((p, i) => {
    if (!p) return;
    p.visible = !g.flag('f.p' + (i + 1));
    scene.add(p);
  });
  // the door back to the archive
  scene.add(rbox(0.85, 2.05, 0.05, 0.01, woodDark, -0.6, 1.025, D / 2 - 0.03));

  // ---------------- hotspots ----------------
  const hTable = hitBox(1.0, 0.4, 0.7, tX, tY + 0.15, tZ, 'table');
  const hBin = hitBox(0.4, 0.55, 0.4, binX, 0.28, binZ, 'bin');
  const hProof = hitBox(0.6, 0.5, 0.1, frameX, 1.5, frameZ + 0.05, 'proof');
  const hCorner = hitBox(0.5, 0.2, 0.5, W / 2 - 0.62, 0.08, -D / 2 + 0.3, 'corner');
  const hCup = hitBox(0.55, 1.65, 0.5, W / 2 - 0.3, 0.82, -D / 2 + 0.3, 'cupboard');
  const hDoor = hitBox(1.0, 2.1, 0.2, -0.6, 1.05, D / 2 - 0.1, 'door');
  const hLine = hitBox(W - 0.2, 0.4, 0.2, 0, 1.98, -0.2, 'line');
  scene.add(hTable, hBin, hProof, hCorner, hCup, hDoor, hLine);
  const say = (k: string) => g.say(k);

  const found = async (i: number) => {
    g.set('f.p' + i);
    if (pieces[i - 1]) pieces[i - 1]!.visible = false;
    g.audio.sfx('paper');
    g.note('note.foto.pieces');
    await g.say([{ who: 'diego', key: 'foto.pieceFound', vars: { n: piecesFound(g), tot: PIECES } }]);
  };

  const hotspots: Hotspot[] = [
    { id: 'table', obj: hTable, view: 'table', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('f.collage')) return say('foto.collageDone');
      const n = piecesFound(g);
      if (n === 0) return say('foto.table');
      if (n < PIECES) return g.say([{ who: 'diego', key: 'foto.tableSome', vars: { n, tot: PIECES } }]);
      const ok = await g.ui.collage(t('foto.collageTitle'), t('foto.collageText'), groupPhoto(), PIECES, () => g.audio.sfx('paper'));
      if (!ok) return;
      g.set('f.collage');
      whole.visible = true;
      g.audio.sfx('whisper');
      await g.say([{ who: 'diego', key: 'foto.collage1' }, { who: 'diego', key: 'foto.collage2' }, { who: 'diego', key: 'foto.collage3' }]);
      await g.readDoc('foto.backTitle', 'foto.back');
      g.note('note.foto.collage');
    } },
    // the pieces you can find here: no marker, they're small and easy to miss
    { id: 'bin', obj: hBin, tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('f.p3')) return found(3);
      return say('foto.bin');
    } },
    { id: 'proof', obj: hProof, tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('f.p4')) {
        await say('foto.proofBehind');
        return found(4);
      }
      return say('foto.proofLook');
    } },
    { id: 'corner', obj: hCorner, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('f.p5')) return say('foto.cornerEmpty');
      // in the dark it's just floorboards: Lisa's ink shows it
      await say('foto.cornerUv');
      return found(5);
    } },
    { id: 'cupboard', obj: hCup, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.cupboard');
    } },
    { id: 'line', obj: hLine, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.line');
    } },
    { id: 'door', obj: hDoor, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(2, 0.45, false);
      return g.go('foto_archivio');
    } },
  ];

  return {
    id: 'foto_ritocco',
    nameKey: 'place.fotoRitocco',
    next: ['foto_archivio'],
    scene,
    drone: 'emporio',
    startView: 'main',
    exitTo: 'foto_archivio',
    dark: () => true,
    views: {
      main: { pos: [-0.3, 1.6, 1.1], look: [0.3, 0.9, -1.3], yaw: 65, pitch: 22 },
      table: { pos: [tX, 1.55, tZ + 0.75], look: [tX, tY + 0.1, tZ], parent: 'main', yaw: 20, pitch: 12, fov: 55 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      // the scrap in the corner glows only in the UV beam
      const k = 1;
      p5mat.emissive.setRGB(0.55 * k, 0.4 * k, 0.9 * k);
      p5mat.opacity = 0.25 + 0.75 * k;
      scene.traverse((o) => {
        if (o.userData.sway !== undefined) o.rotation.z = Math.sin(time * 0.7 + o.userData.sway) * 0.04;
      });
    },
    enter: async () => {
      if (!g.flag('f.ritEntered')) {
        g.set('f.ritEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.rit1' }, { who: 'diego', key: 'foto.rit2' }]);
      }
    },
    hint: () => {
      if (g.flag('f.collage')) return g.flag('f.key') ? 'hint.foto.stairs' : 'hint.foto.tin';
      if (piecesFound(g) < PIECES) return 'hint.foto.pieces';
      return 'hint.foto.collage';
    },
    debug: { found, photo: groupPhoto },
  };
}
