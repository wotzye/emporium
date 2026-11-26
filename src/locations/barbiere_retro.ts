import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, box, cyl, sphere, mat, mesh, rbox, lathe, fx, dust, textPlane, hitBox, bulb, canvasTex, noise, tileMaterial, woodMaterial, plasterMaterial, liveCanvas, handwheel, lightCone } from '../builders';
import { t } from '../i18n';
import { lisaInk, onWall } from './lisa_uv';

/** The barber's back room: sink, towels, a bench of bottles, the boiler, a trapdoor to the cellar. */
const RINGS_Z = [-1.2, -0.65, -0.1, 0.45, 0.95];
const RADII = [0.03, 0.055, 0.04, 0.065, 0.047];
const START_Z = [0.9, -1.1, 0.3, -0.5, -0.05];
// index 0 is the rightmost wheel from where you stand: read left to right they must say 2-7-4, like the plate
const VALVES = [4, 7, 2];

export function createBarbiereRetro(g: Game): Location {
  g.location('barbiere'); // the shop itself sets up the leather case and the finale
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 3, 8);
  scene.userData.envIntensity = 0.07;
  const W = 4, H = 2.8, D = 3.6;
  scene.add(room(W, H, D, {
    wall: tileMaterial({ a: '#cfd1cc', b: '#c3c5c0', n: 12, repeat: [3, 2], grout: '#5b5d58', grime: 0.9, rough: 0.25, checker: false }),
    floor: tileMaterial({ a: '#7c7a74', b: '#4c4a46', n: 8, repeat: [3, 3], grout: '#2a2825', grime: 1, rough: 0.5 }),
    ceil: plasterMaterial({ base: '#3a3733', repeat: [2, 2], damp: 0.8 }),
  }));
  // Lisa's message, in invisible ink (UV torch)
  scene.add(onWall(lisaInk(g, 'barbiere'), 'left', W, D, 0.3, 1.9));
  const woodDark = woodMaterial({ base: '#3b2c1f' });
  const woodMid = woodMaterial({ base: '#5b4430' });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.2, metalness: 1, envMapIntensity: 1.5 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.6, metalness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35 });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.2 });

  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const lamp = bulb(0.2, 2.35, -0.2, 9, 1.2, 6);
  scene.add(lamp.group);
  scene.add(lightCone(0.2, 2.33, -0.2, 2.3, 1.1, 0.03));
  const motes = dust([-1.9, 0.2, -1.7], [1.9, 2.6, 1.7], 140);
  scene.add(motes.points);

  // ---------------- bench with dust rings and bottles ----------------
  const benchY = 0.9;
  scene.add(rbox(0.6, benchY, 2.6, 0.02, woodMid, -1.7, benchY / 2, -0.2));
  const dustTop = canvasTex(256, 1024, (c, w, h) => {
    c.fillStyle = '#4e3b28';
    c.fillRect(0, 0, w, h);
    // a film of dust everywhere...
    c.fillStyle = 'rgba(200,195,185,0.55)';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 8000, 0.15);
    // ...except where the bottles used to stand
    RINGS_Z.forEach((z, i) => {
      const cy = ((z + 1.5) / 2.6) * h;
      const cx = ((-1.85 + 2.0) / 0.6) * w;
      const r = (RADII[i] / 0.6) * w;
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.strokeStyle = 'rgba(20,14,8,0.85)';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
    });
  });
  const top = mesh(new THREE.PlaneGeometry(0.6, 2.6), new THREE.MeshStandardMaterial({ map: dustTop, roughness: 0.9, transparent: true }), -1.7, benchY + 0.002, -0.2, false);
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  scene.add(top);
  scene.add(mesh(new THREE.PlaneGeometry(0.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x4e3b28, roughness: 0.6 }), -1.7, benchY + 0.001, -0.2, false).rotateX(-Math.PI / 2));
  // drawer in the bench front
  const drawer = new THREE.Group();
  drawer.add(rbox(0.04, 0.16, 0.5, 0.01, woodDark, 0, 0, 0));
  drawer.add(rbox(0.03, 0.03, 0.14, 0.01, brass, 0.03, 0, 0));
  drawer.position.set(-1.38, benchY - 0.12, -0.2);
  scene.add(drawer);
  const crankMesh = new THREE.Group();
  crankMesh.add(cyl(0.012, 0.012, 0.25, iron, 0, 0, 0, 8).rotateZ(Math.PI / 2));
  crankMesh.add(cyl(0.012, 0.012, 0.12, iron, 0.12, 0.06, 0, 8));
  crankMesh.add(cyl(0.018, 0.018, 0.06, woodDark, 0.12, 0.13, 0, 8));
  crankMesh.position.set(-1.5, benchY - 0.12, -0.2);
  crankMesh.visible = false;
  scene.add(crankMesh);
  // the drawer now holds the key of the back door; the crank is hidden elsewhere (the well, in the courtyard)
  const legacyCrank = () => g.has('crank') || !!g.flag('r.crankIn') || !!g.flag('y.crank');
  const yardKey = new THREE.Group();
  yardKey.add(cyl(0.005, 0.005, 0.09, iron, 0, 0, 0, 6).rotateZ(Math.PI / 2));
  yardKey.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 14), iron, -0.055, 0, 0).rotateX(Math.PI / 2));
  yardKey.add(rbox(0.012, 0.004, 0.02, 0.001, iron, 0.04, 0, 0.01));
  yardKey.add(textPlane(['CORTILE'], 0.05, 0.02, { bg: '#d8cfba', size: 18, px: 24 }).rotateX(-Math.PI / 2).translateX(-0.085));
  yardKey.position.set(-1.5, benchY - 0.08, -0.2);
  yardKey.rotation.y = 0.4;
  yardKey.visible = false;
  scene.add(yardKey);

  // bottles: each has its own footprint
  const glassCols = [0x2a2d30, 0x5c6064, 0x15171a, 0x7a7e80, 0x3d4144];
  const bottles: THREE.Group[] = [];
  const placed: boolean[] = (g.flag('r.bottles') as string | undefined)?.split(',').map((v) => v === '1') ?? [false, false, false, false, false];
  RADII.forEach((r, i) => {
    const b = new THREE.Group();
    const h = 0.16 + r * 2.2;
    const m = new THREE.MeshStandardMaterial({ color: glassCols[i], roughness: 0.08, envMapIntensity: 2 });
    b.add(lathe([[0, 0], [r, 0], [r * 1.02, h * 0.62], [r * 0.45, h * 0.8], [r * 0.3, h * 0.95], [r * 0.34, h], [0, h]], m, 0, 0, 0, 18));
    b.add(textPlane([['TONICO', 'BRILL.', 'COLONIA', 'LOZIONE', 'ACETO'][i]], r * 1.6, 0.05, { bg: '#e6dfcf', size: 14, px: 32 }).translateY(h * 0.35).translateZ(r * 1.03));
    const z = placed[i] ? RINGS_Z[i] : START_Z[i];
    b.position.set(placed[i] ? -1.85 : -1.55, benchY, z);
    b.rotation.y = -Math.PI / 2;
    scene.add(b);
    bottles.push(b);
  });
  const allPlaced = () => placed.every(Boolean);
  const drawerOpen = () => !!g.flag('r.drawer');
  if (drawerOpen()) {
    drawer.position.x += 0.3;
    crankMesh.position.x += 0.3;
    yardKey.position.x += 0.3;
    yardKey.visible = !legacyCrank() && !g.flag('r.yardKey');
  }

  // ---------------- sink, small mirror, towel ----------------
  scene.add(lathe([[0, 0], [0.12, 0], [0.08, 0.1], [0.07, 0.7], [0.0, 0.7]], enamel, -1.1, 0, -1.55, 20));
  scene.add(lathe([[0, 0.0], [0.08, 0.0], [0.26, 0.08], [0.3, 0.16], [0.28, 0.17], [0.24, 0.1], [0.0, 0.08]], enamel, -1.1, 0.7, -1.55, 28));
  scene.add(cyl(0.015, 0.015, 0.2, chrome, -1.1, 0.95, -1.75, 10));
  scene.add(cyl(0.012, 0.012, 0.14, chrome, -1.1, 1.04, -1.68, 10).rotateX(Math.PI / 2));
  const small = liveCanvas(256, 320);
  const smallFog = { v: g.flag('r.valves') ? 1 : 0 };
  const drawSmall = () => {
    const c = small.ctx;
    const gr = c.createLinearGradient(0, 0, 256, 320);
    gr.addColorStop(0, '#5a5f63');
    gr.addColorStop(0.5, '#868b8f');
    gr.addColorStop(1, '#4b4f53');
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 320);
    if (smallFog.v > 0) {
      c.fillStyle = `rgba(225,228,230,${0.85 * smallFog.v})`;
      c.fillRect(0, 0, 256, 320);
      if (smallFog.v > 0.7) {
        // a clock drawn with a fingertip: ten past ten
        c.strokeStyle = `rgba(60,64,68,${(smallFog.v - 0.7) / 0.3})`;
        c.lineWidth = 7;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(128, 150, 80, 0, Math.PI * 2);
        c.stroke();
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          c.beginPath();
          c.moveTo(128 + Math.sin(a) * 68, 150 - Math.cos(a) * 68);
          c.lineTo(128 + Math.sin(a) * 76, 150 - Math.cos(a) * 76);
          c.stroke();
        }
        const ha = ((10 + 10 / 60) / 12) * Math.PI * 2;
        const ma = (10 / 60) * Math.PI * 2;
        c.beginPath();
        c.moveTo(128, 150);
        c.lineTo(128 + Math.sin(ha) * 42, 150 - Math.cos(ha) * 42);
        c.moveTo(128, 150);
        c.lineTo(128 + Math.sin(ma) * 64, 150 - Math.cos(ma) * 64);
        c.stroke();
        c.font = "bold 30px 'Bradley Hand', 'Segoe Print', cursive";
        c.fillStyle = c.strokeStyle;
        c.textAlign = 'center';
        c.fillText(t('retro.mirrorWord'), 128, 280);
      }
    }
    noise(c, 256, 320, 1500, 0.08);
    small.update();
  };
  drawSmall();
  const sm = mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: small.tex, roughness: 0.2, emissive: 0xffffff, emissiveMap: small.tex, emissiveIntensity: 0.12 }), -1.1, 1.55, -1.776, false);
  scene.add(sm);
  scene.add(rbox(0.48, 0.58, 0.02, 0.01, woodDark, -1.1, 1.55, -1.795));
  // towel rack with a cloth
  scene.add(cyl(0.01, 0.01, 0.5, chrome, -0.4, 1.35, -1.74, 8).rotateZ(Math.PI / 2));
  const towelGeo = new THREE.PlaneGeometry(0.34, 0.5, 8, 8);
  {
    const p = towelGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 18) * 0.012);
    towelGeo.computeVertexNormals();
  }
  const towel = mesh(towelGeo, new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: 1, side: THREE.DoubleSide }), -0.4, 1.12, -1.72);
  towel.visible = true;
  scene.add(towel);

  // ---------------- boiler, sooty plate, three valves, gauge ----------------
  const boiler = new THREE.Group();
  boiler.add(lathe([[0, 0], [0.34, 0], [0.35, 0.05], [0.35, 1.55], [0.3, 1.7], [0.12, 1.78], [0, 1.8]], new THREE.MeshStandardMaterial({ color: 0x55524d, roughness: 0.5, metalness: 0.6 }), 0, 0, 0, 28));
  for (const y of [0.3, 0.9, 1.4]) boiler.add(new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.012, 6, 32), iron).translateY(y).rotateX(Math.PI / 2));
  boiler.add(cyl(0.05, 0.05, 1.1, iron, 0, 2.3, 0, 10));
  boiler.position.set(1.55, 0, -1.25);
  scene.add(boiler);
  scene.add(cyl(0.035, 0.035, 0.9, iron, 1.2, 0.95, -1.25, 10).rotateX(Math.PI / 2));
  // plate under the soot
  const plate = liveCanvas(256, 170);
  const sootCv = document.createElement('canvas');
  sootCv.width = 256;
  sootCv.height = 170;
  const soot = sootCv.getContext('2d')!;
  soot.fillStyle = '#161412';
  soot.fillRect(0, 0, 256, 170);
  noise(soot, 256, 170, 3000, 0.25);
  if (g.flag('r.plate')) soot.clearRect(0, 0, 256, 170);
  const drawPlate = () => {
    const c = plate.ctx;
    c.fillStyle = '#a7966a';
    c.fillRect(0, 0, 256, 170);
    c.strokeStyle = '#5c5034';
    c.lineWidth = 6;
    c.strokeRect(6, 6, 244, 158);
    c.fillStyle = '#2b2416';
    c.textAlign = 'center';
    c.font = "bold 20px 'American Typewriter', 'Courier New', monospace";
    c.fillText(t('retro.plate1'), 128, 45);
    c.font = "16px 'American Typewriter', 'Courier New', monospace";
    c.fillText(t('retro.plate2'), 128, 78);
    c.font = "bold 40px 'American Typewriter', 'Courier New', monospace";
    c.fillText([...VALVES].reverse().join(' · '), 128, 132); // the plate reads left to right, like the wheels
    c.drawImage(sootCv, 0, 0);
    plate.update();
  };
  drawPlate();
  const plateMesh = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ map: plate.tex, roughness: 0.45, metalness: 0.5 }), 1.195, 1.32, -1.25, false);
  plateMesh.rotation.y = -Math.PI / 2;
  scene.add(plateMesh);
  let rubCount = 0;
  const sootLeft = () => {
    const d = soot.getImageData(0, 0, 256, 170).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 16) a += d[i];
    return a / (d.length / 16) / 255;
  };
  // valves
  const valveVals: number[] = (g.flag('r.valveVals') as string | undefined)?.split(',').map(Number) ?? [0, 0, 0];
  const valveAngle = valveVals.map((v) => (v / 10) * Math.PI * 2);
  const wheels: THREE.Group[] = [];
  const grips: THREE.Object3D[] = [];
  const digits: ReturnType<typeof liveCanvas>[] = [];
  const valveZ = [-0.95, -1.25, -1.55];
  valveZ.forEach((z, i) => {
    scene.add(cyl(0.02, 0.02, 0.12, iron, 1.26, 0.95, z, 8).rotateZ(Math.PI / 2));
    const w = handwheel(0.07, new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.45, metalness: 0.8 }));
    w.position.set(1.18, 0.95, z);
    w.rotation.y = -Math.PI / 2;
    w.rotation.z = valveAngle[i];
    // a generous invisible grip, so a finger doesn't have to find the thin spokes
    const grip = hitBox(0.22, 0.22, 0.05, 0, 0, 0.05, 'valveGrip');
    grips.push(grip);
    w.add(grip);
    scene.add(w);
    wheels.push(w);
    const dc = liveCanvas(64, 64);
    digits.push(dc);
    const dm = mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ map: dc.tex, roughness: 0.6 }), 1.19, 1.08, z, false);
    dm.rotation.y = -Math.PI / 2;
    scene.add(dm);
  });
  const drawDigits = () =>
    digits.forEach((dc, i) => {
      dc.ctx.fillStyle = '#e8e2d0';
      dc.ctx.fillRect(0, 0, 64, 64);
      dc.ctx.fillStyle = '#111';
      dc.ctx.font = 'bold 44px Georgia, serif';
      dc.ctx.textAlign = 'center';
      dc.ctx.textBaseline = 'middle';
      dc.ctx.fillText(String(valveVals[i]), 32, 34);
      dc.update();
    });
  drawDigits();
  // gauge
  const gaugeFace = textPlane(['', '', 'bar'], 0.16, 0.16, { bg: '#eae4d4', size: 18, px: 128 });
  gaugeFace.position.set(1.19, 1.62, -1.25);
  gaugeFace.rotation.y = -Math.PI / 2;
  scene.add(gaugeFace);
  scene.add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 24), brass).translateX(1.19).translateY(1.62).translateZ(-1.25).rotateY(-Math.PI / 2));
  const needle = new THREE.Group();
  needle.add(box(0.004, 0.07, 0.003, mat(0x111111), 0, 0.03, 0));
  needle.position.set(1.185, 1.62, -1.25);
  needle.rotation.y = -Math.PI / 2;
  needle.rotation.z = g.flag('r.valves') ? -0.6 : 2.2;
  scene.add(needle);

  // ---------------- trapdoor in the floor ----------------
  const trapPivot = new THREE.Group();
  trapPivot.position.set(0.2, 0.012, -0.05);
  const trap = new THREE.Group();
  trap.add(rbox(0.9, 0.04, 0.9, 0.01, woodDark, 0, 0, 0.45));
  for (const x of [-0.3, 0.3]) trap.add(box(0.06, 0.045, 0.85, iron, x, 0.005, 0.45));
  trap.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16), iron).translateZ(0.8).translateY(0.03).rotateX(Math.PI / 2));
  trapPivot.add(trap);
  scene.add(trapPivot);
  const hole = mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0.2, 0.004, 0.4, false);
  hole.rotation.x = -Math.PI / 2;
  scene.add(hole);
  // socket for the crank, next to the trapdoor
  scene.add(cyl(0.035, 0.04, 0.05, iron, 0.78, 0.025, 0.4, 10));
  const crankInPlace = new THREE.Group();
  crankInPlace.add(cyl(0.012, 0.012, 0.2, iron, 0, 0.1, 0, 8));
  const arm = new THREE.Group();
  arm.position.y = 0.2;
  arm.add(cyl(0.012, 0.012, 0.14, iron, 0.07, 0, 0, 8).rotateZ(Math.PI / 2));
  arm.add(cyl(0.018, 0.018, 0.07, woodDark, 0.14, 0.035, 0, 8));
  crankInPlace.add(arm);
  // a generous invisible grip: a finger anywhere on or around the crank takes hold of it
  crankInPlace.add(hitBox(0.6, 0.4, 0.6, 0, 0.2, 0, 'crankGrip'));
  crankInPlace.position.set(0.78, 0.04, 0.4);
  crankInPlace.visible = !!g.flag('r.crankIn');
  scene.add(crankInPlace);
  let crankTurn = g.flag('r.trap') ? Math.PI * 6 : 0;
  const setTrap = () => {
    const k = Math.min(crankTurn / (Math.PI * 6), 1);
    trapPivot.rotation.x = -k * 1.9;
    arm.rotation.y = -crankTurn;
  };
  setTrap();

  // hair-dryer helmet chair and a basket of towels, for company
  const helmet = new THREE.Group();
  helmet.add(cyl(0.025, 0.03, 1.4, chrome, 0, 0.7, 0, 10));
  helmet.add(lathe([[0, 0], [0.2, 0], [0.24, 0.08], [0.22, 0.2], [0.12, 0.3], [0, 0.32]], enamel, 0, 1.3, 0.08, 24).rotateX(-0.5));
  helmet.add(lathe([[0, 0], [0.25, 0], [0.25, 0.03], [0, 0.04]], iron, 0, 0, 0, 20));
  helmet.position.set(1.4, 0, 1.2);
  scene.add(helmet);
  const ladder = prop('ladder', { height: 2.2 });
  if (ladder) {
    ladder.position.set(-1.2, 0, 1.6);
    ladder.rotation.set(0.25, 0.1, 0);
    scene.add(ladder);
  }
  for (const [id, x, z, ry] of [['stool', -0.5, 1.35, 0.4], ['bucket', 1.65, -0.55, 1.2]] as const) {
    const pr = prop(id);
    if (!pr) continue;
    pr.position.set(x, 0, z);
    pr.rotation.y = ry;
    scene.add(pr);
  }
  scene.add(lathe([[0, 0], [0.2, 0], [0.24, 0.35], [0.22, 0.36], [0, 0.02]], woodMaterial({ base: '#6b5a3c' }), -1.6, 0, 1.4, 16));

  // door back to the shop
  scene.add(rbox(0.9, 2.05, 0.06, 0.02, woodDark, 1.2, 1.025, D / 2 - 0.04));
  // the back door to the courtyard (right wall): bolted, a frosted pane with the rain behind it
  const yardZ = 0.4;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x0b0d10 }), W / 2 - 0.012, 1.025, yardZ, false).rotateY(-Math.PI / 2));
  const yardPivot = new THREE.Group();
  yardPivot.position.set(W / 2 - 0.04, 0, yardZ - 0.42);
  yardPivot.add(rbox(0.05, 2.04, 0.84, 0.01, woodMid, 0, 1.02, 0.42));
  yardPivot.add(mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a949c, roughness: 0.3, transparent: true, opacity: 0.55 }), -0.03, 1.55, 0.42, false).rotateY(-Math.PI / 2));
  yardPivot.add(rbox(0.04, 0.06, 0.1, 0.01, brass, -0.04, 1.0, 0.74));
  scene.add(yardPivot);
  const yardOpen = () => !!g.flag('r.yardOpen');
  if (yardOpen()) yardPivot.rotation.y = 1.3;

  // ---------------- hotspots ----------------
  const hTowel = hitBox(0.4, 0.6, 0.15, -0.4, 1.15, -1.7, 'towel');
  const hBench = hitBox(0.7, 0.5, 2.7, -1.7, benchY + 0.1, -0.2, 'bench');
  const hDrawer = hitBox(0.2, 0.25, 0.6, -1.32, benchY - 0.12, -0.2, 'drawer');
  const hSink = hitBox(0.7, 1.2, 0.5, -1.1, 1.2, -1.5, 'sink');
  const hBoiler = hitBox(0.8, 1.9, 0.9, 1.5, 0.95, -1.25, 'boiler');
  // the sooty plate gets its own marker: that's where you rub
  const hPlate = hitBox(0.06, 0.22, 0.32, 1.17, 1.32, -1.25, 'plate');
  scene.add(hPlate);
  const hTrap = hitBox(1.2, 0.3, 1.1, 0.35, 0.1, 0.4, 'trap');
  const hHelmet = hitBox(0.6, 1.7, 0.6, 1.4, 0.85, 1.2, 'helmet');
  const hYard = hitBox(0.3, 2.1, 0.9, W / 2 - 0.15, 1.05, yardZ, 'yard');
  scene.add(hTowel, hBench, hDrawer, hSink, hBoiler, hTrap, hHelmet, hYard);

  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    // the cloth can be put down (it goes back on the rack) and picked up again
    { id: 'towel', obj: hTowel, view: 'sink', when: () => g.held !== 'cloth' && !g.flag('r.plate'), tap: async (item) => {
      if (item) return g.nope();
      towel.visible = false;
      g.set('r.cloth');
      g.audio.sfx('sheet');
      g.setHeld('cloth');
      await say('retro.cloth');
    } },
    { id: 'sink', obj: hSink, view: 'sink', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('r.cloth') && g.held !== 'cloth') {
        // the towel may still be on the rack: pass the tap on
      }
      if (g.flag('r.valves')) return say('retro.sinkClock');
      return say('retro.sink');
    } },
    { id: 'drawer', obj: hDrawer, view: 'bench', when: () => drawerOpen(), tap: async (item) => {
      if (item) return g.nope();
      if (crankMesh.visible) {
        crankMesh.visible = false;
        g.give('crank');
        return say('retro.crank');
      }
      if (yardKey.visible) {
        yardKey.visible = false;
        g.set('r.yardKey');
        g.give('yardkey');
        return say('retro.yardKey');
      }
      return say('retro.drawerEmpty');
    } },
    { id: 'bench', obj: hBench, view: 'bench', tap: async (item) => {
      if (item) return g.nope();
      if (allPlaced()) return say('retro.benchDone');
      await say('retro.bench');
    } },
    { id: 'plate', obj: hPlate, view: 'boiler', when: () => !g.flag('r.plate'), tap: async (item) => {
      if (item) return g.nope();
      return say(g.held === 'cloth' ? 'retro.plateRub' : 'retro.plateDirty');
    } },
    ...grips.map((grip, i): Hotspot => ({ id: 'valve' + i, obj: grip, view: 'boiler', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('r.valves')) return say('retro.boilerDone');
      return say(g.flag('r.plate') ? 'retro.valveTapPlate' : 'retro.valveTap');
    } })),
    // close up, the boiler itself steps aside: the plate and the three wheels answer for themselves
    { id: 'boiler', obj: hBoiler, view: 'boiler', when: () => g.viewName !== 'boiler', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('r.valves')) return say('retro.boilerDone');
      if (!g.flag('r.plate')) return say(g.held === 'cloth' ? 'retro.plateRub' : 'retro.plateDirty');
      return say('retro.valvesHint');
    } },
    { id: 'trap', exit: () => !!g.flag('r.trap'), obj: hTrap, view: 'trap', tap: async (item) => {
      if (g.flag('r.trap')) {
        if (item) return g.nope();
        g.audio.steps(4, 0.45, false);
        return g.go('barbiere_cantina');
      }
      if (!g.flag('r.crankIn')) {
        if (item === 'crank') {
          g.take('crank');
          g.set('r.crankIn');
          crankInPlace.visible = true;
          g.audio.sfx('clunk');
          return say('retro.crankIn');
        }
        if (item) return g.nope();
        return say('retro.trapLocked');
      }
      if (item) return g.nope();
      return say('retro.turnCrank');
    } },
    { id: 'yard', exit: () => yardOpen(), obj: hYard, view: 'yard', tap: async (item) => {
      if (yardOpen()) {
        if (item) return g.nope();
        g.audio.steps(3, 0.45, false);
        return g.go('barbiere_cortile');
      }
      if (item === 'yardkey') {
        g.deselect();
        g.take('yardkey');
        g.set('r.yardOpen');
        g.audio.sfx('unlock');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          yardPivot.rotation.y = (i / 20) * 1.3;
          await sleep(25);
        }
        return say('retro.yardOpen');
      }
      if (item) return g.nope();
      g.audio.sfx('wrong');
      return say('retro.yardLocked');
    } },
    { id: 'helmet', obj: hHelmet, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      await say('retro.helmet');
    } },
  ];

  // ---------------- direct manipulation ----------------
  const benchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -benchY);
  const interactions: Interaction[] = [];
  bottles.forEach((b, i) => {
    interactions.push({
      kind: 'drag',
      obj: b,
      plane: benchPlane,
      when: () => g.viewName === 'bench' && !placed[i],
      onStart: () => g.audio.sfx('scrape'),
      onMove: (p) => {
        b.position.x = THREE.MathUtils.clamp(b.position.x, -1.93, -1.47);
        b.position.z = THREE.MathUtils.clamp(b.position.z, -1.45, 1.05);
        b.position.y = benchY + 0.02;
        if (Math.random() < 0.15) g.audio.sfx('scrape');
        void p;
      },
      onEnd: async () => {
        b.position.y = benchY;
        // the nearest dust ring
        let best = -1, bd = 1;
        RINGS_Z.forEach((z, j) => {
          const d = Math.hypot(b.position.x + 1.85, b.position.z - z);
          if (d < bd) { bd = d; best = j; }
        });
        if (bd < 0.09 && best === i) {
          b.position.set(-1.85, benchY, RINGS_Z[i]);
          placed[i] = true;
          g.set('r.bottles', placed.map((v) => (v ? '1' : '0')).join(','));
          g.audio.sfx('glass');
          if (allPlaced() && !drawerOpen()) {
            await sleep(500);
            g.audio.sfx('drawer');
            drawer.position.x += 0.3;
            crankMesh.position.x += 0.3;
            yardKey.position.x += 0.3;
            yardKey.visible = !legacyCrank();
            g.set('r.drawer');
            await say('retro.drawerOpen');
          }
        } else if (bd < 0.12) {
          // wrong footprint: it slides back
          g.audio.sfx('wrong');
          b.position.set(-1.55, benchY, START_Z[i]);
          await say(RADII[i] > RADII[best] ? 'retro.tooBig' : 'retro.tooSmall');
        } else {
          b.position.x = Math.max(b.position.x, -1.75);
        }
      },
    });
  });
  interactions.push({
    kind: 'rub',
    obj: plateMesh,
    when: () => g.held === 'cloth' && !g.flag('r.plate'),
    onRub: (uv) => {
      soot.save();
      soot.globalCompositeOperation = 'destination-out';
      const x = uv.x * 256, y = (1 - uv.y) * 170;
      const gr = soot.createRadialGradient(x, y, 2, x, y, 26);
      gr.addColorStop(0, 'rgba(0,0,0,0.5)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      soot.fillStyle = gr;
      soot.fillRect(x - 30, y - 30, 60, 60);
      soot.restore();
      drawPlate();
      if (++rubCount % 4 === 0) g.audio.sfx('rub');
    },
    onEnd: async () => {
      if (!g.flag('r.plate') && sootLeft() < 0.3) {
        soot.clearRect(0, 0, 256, 170);
        drawPlate();
        g.set('r.plate');
        g.note('note.valves');
        await say('retro.plateClean');
      }
    },
  });
  wheels.forEach((w, i) => {
    let acc = 0;
    interactions.push({
      kind: 'dial',
      obj: w,
      center: w.getWorldPosition(new THREE.Vector3()),
      when: () => g.viewName === 'boiler' && !g.flag('r.valves'),
      onTurn: (d) => {
        valveAngle[i] += d;
        w.rotation.z = valveAngle[i];
        acc += d;
        const step = (Math.PI * 2) / 10;
        while (acc > step) { acc -= step; valveVals[i] = (valveVals[i] + 1) % 10; g.audio.sfx('valve'); drawDigits(); }
        while (acc < -step) { acc += step; valveVals[i] = (valveVals[i] + 9) % 10; g.audio.sfx('valve'); drawDigits(); }
      },
      onEnd: async () => {
        g.set('r.valveVals', valveVals.join(','));
        if (valveVals.every((v, j) => v === VALVES[j]) && !g.flag('r.valves')) {
          g.set('r.valves');
          g.audio.sfx('hiss');
          for (let k = 0; k <= 20; k++) {
            needle.rotation.z = 2.2 - (k / 20) * 2.8;
            await sleep(40);
          }
          g.audio.sfx('water');
          await g.view('sink');
          for (let k = 0; k <= 40; k++) {
            smallFog.v = k / 40;
            drawSmall();
            await sleep(60);
          }
          g.note('note.clock');
          await g.say([{ who: 'diego', key: 'retro.fogClock1' }, { who: 'diego', key: 'retro.fogClock2' }]);
        }
      },
    });
  });
  interactions.push({
    kind: 'dial',
    obj: crankInPlace,
    center: new THREE.Vector3(0.78, 0.25, 0.4),
    when: () => !!g.flag('r.crankIn') && !g.flag('r.trap'),
    onTurn: (d) => {
      d = Math.abs(d); // either way round works
      crankTurn += d;
      setTrap();
      if (Math.random() < 0.2) g.audio.sfx('creak');
    },
    onEnd: async () => {
      if (crankTurn >= Math.PI * 6 && !g.flag('r.trap')) {
        crankTurn = Math.PI * 6;
        setTrap();
        g.set('r.trap');
        g.audio.sfx('trapdoor');
        await sleep(800);
        g.audio.sfx('breath');
        await say('retro.trapOpen');
      }
    },
  });

  return {
    id: 'barbiere_retro',
    nameKey: 'place.barbiereRetro',
    next: ['barbiere_cantina', 'barbiere_cortile'],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'barbiere',
    views: {
      main: { pos: [1.1, 1.65, 1.35], look: [-0.6, 1.0, -1.1], yaw: 55, pitch: 18 },
      bench: { pos: [-0.75, 1.85, -0.2], look: [-1.75, 0.85, -0.2], parent: 'main', yaw: 25, pitch: 10, fov: 70 },
      sink: { pos: [-0.8, 1.5, -0.1], look: [-0.9, 1.3, -1.8], parent: 'main', yaw: 25, pitch: 15 },
      boiler: { pos: [0.3, 1.3, -1.0], look: [1.4, 1.02, -1.25], parent: 'main', yaw: 25, pitch: 14 },
      yard: { pos: [0.1, 1.6, 0.9], look: [W / 2, 1.1, yardZ - 0.1], parent: 'main', yaw: 20, pitch: 12 },
      trap: { pos: [0.45, 1.9, 1.5], look: [0.45, 0.0, 0.3], parent: 'main', yaw: 20, pitch: 10 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      towel.visible = g.held !== 'cloth';
      motes.update(dt, time);
      // the first time you get close to the boiler, Diego notices the sooty plate
      if (g.viewName === 'boiler' && !g.flag('r.plate') && !g.flag('r.boilerSeen') && !g.busy) {
        g.set('r.boilerSeen');
        g.busy = true;
        g.say(g.held === 'cloth' ? 'retro.plateRub' : 'retro.plateDirty').finally(() => (g.busy = false));
      }
    },
    enter: async () => {
      if (!g.flag('r.entered')) {
        g.set('r.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'retro.enter1' }, { who: 'diego', key: 'retro.enter2' }]);
      }
    },
    hint: () => {
      if (!g.flag('r.cloth') || (g.held !== 'cloth' && !g.flag('r.plate'))) return 'hint.retro.cloth';
      if (!allPlaced()) return 'hint.retro.bottles';
      if (!g.has('crank') && !g.flag('r.crankIn')) {
        if (!legacyCrank() && !g.flag('r.yardKey')) return 'hint.retro.drawer';
        if (!yardOpen()) return 'hint.retro.yard';
        return 'hint.retro.goYard';
      }
      if (!g.flag('r.plate')) return 'hint.retro.plate';
      if (!g.flag('r.valves')) return 'hint.retro.valves';
      if (!g.flag('r.crankIn')) return 'hint.retro.crankIn';
      if (!g.flag('r.trap')) return 'hint.retro.crank';
      return 'hint.retro.down';
    },
    debug: { bottles, placed, valveVals, wheels, plateMesh, crankInPlace, rings: RINGS_Z.map((z) => [-1.85, benchY, z]) },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
