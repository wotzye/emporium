import * as THREE from 'three';
import { Game, Location, Hotspot } from '../game';
import { room, box, cyl, sphere, mat, mesh, textPlane, hitBox, canvasTex, noise, bulb, rbox, lathe, fx, dust, lightCone, framed, tileMaterial, woodMaterial, plasterMaterial } from '../builders';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { t } from '../i18n';

/** Chair facing: 0 = mirror, 1 = left wall, 2 = door, 3 = right wall. */
const CHAIR_TARGET = [2, 0, 1];
const CHAIR_START = [3, 3, 3];

export function createBarbiere(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 10);
  scene.userData.envIntensity = 0.08;
  const W = 6, H = 3, D = 5;
  const hiQ = g.settings.quality !== 'low';

  // ---------------- room shell ----------------
  const wallMat = plasterMaterial({ base: '#8f897e', repeat: [3, 1], stripes: true, damp: 0.6 });
  const rm = room(W, H, D, {
    wall: wallMat,
    floor: tileMaterial({ a: '#e4e2dc', b: '#1f1e1c', n: 10, repeat: [3, 2.5], grout: '#3a3834', grime: 0.5, rough: 0.35 }),
    ceil: plasterMaterial({ base: '#3a3631', repeat: [2, 2], damp: 0.3 }),
  });
  scene.add(rm);
  // right wall rebuilt with a window (venetian blinds: the street light comes in striped)
  const walls = rm.userData.walls;
  (walls.right as THREE.Mesh).visible = false;
  const rightSeg = (z0: number, z1: number, y0: number, y1: number) => {
    const w = z1 - z0, h = y1 - y0;
    const p = mesh(new THREE.PlaneGeometry(w, h), wallMat.clone(), W / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    p.rotation.y = -Math.PI / 2;
    const m = p.material as THREE.MeshStandardMaterial;
    m.map = m.map!.clone();
    m.map.repeat.set(w / 1.7, h / 3);
    m.map.needsUpdate = true;
    p.castShadow = false;
    scene.add(p);
  };
  const winZ0 = 0.95, winZ1 = 1.95, winY0 = 1.0, winY1 = 2.35;
  rightSeg(-D / 2, winZ0, 0, H);
  rightSeg(winZ1, D / 2, 0, H);
  rightSeg(winZ0, winZ1, 0, winY0);
  rightSeg(winZ0, winZ1, winY1, H);

  const woodDark = woodMaterial({ base: '#3b2c1f', repeat: [2, 1] });
  const woodMid = woodMaterial({ base: '#5b4430', repeat: [1, 1] });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xb9b5ac, roughness: 0.32, metalness: 0 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.18, metalness: 1, envMapIntensity: 1.6 });
  const leather = plasterMaterial({ base: '#2a2420', repeat: [1, 1], damp: 0 });
  leather.roughness = 0.45;
  leather.normalScale.set(0.8, 0.8);
  const blackGlass = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.08, metalness: 0.1, envMapIntensity: 2 });

  // wainscoting on the side walls
  for (const side of [-1, 1]) {
    const pan = rbox(0.04, 1.0, D - 0.1, 0.01, woodDark, side * (W / 2 - 0.02), 0.5, 0);
    pan.castShadow = false;
    scene.add(pan);
    scene.add(rbox(0.07, 0.05, D - 0.1, 0.02, woodMid, side * (W / 2 - 0.03), 1.02, 0));
  }
  // cornice
  for (const z of [-D / 2 + 0.03, D / 2 - 0.03]) scene.add(rbox(W, 0.08, 0.06, 0.02, woodDark, 0, H - 0.04, z));
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) scene.add(rbox(0.06, 0.08, D, 0.02, woodDark, x, H - 0.04, 0));

  // ---------------- light ----------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.03));
  // street light through the blinds
  const streetLight = new THREE.SpotLight(0xdfe6ee, 26, 12, 0.45, 0.35, 1.0);
  streetLight.position.set(W / 2 + 2.6, 3.4, 1.6);
  streetLight.target.position.set(-0.6, 0, 0.6);
  streetLight.castShadow = true;
  streetLight.shadow.mapSize.set(1024, 1024);
  streetLight.shadow.bias = -0.0008;
  scene.add(streetLight, streetLight.target);
  // window frame, glass and blinds
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: 0.6 });
  scene.add(box(0.08, 0.06, winZ1 - winZ0 + 0.1, frameMat, W / 2 - 0.02, winY0, (winZ0 + winZ1) / 2));
  scene.add(box(0.08, 0.06, winZ1 - winZ0 + 0.1, frameMat, W / 2 - 0.02, winY1, (winZ0 + winZ1) / 2));
  for (const z of [winZ0, winZ1]) scene.add(box(0.08, winY1 - winY0, 0.06, frameMat, W / 2 - 0.02, (winY0 + winY1) / 2, z));
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.5 });
  for (let y = winY0 + 0.06; y < winY1 - 0.02; y += 0.07) {
    const slat = box(0.05, 0.008, winZ1 - winZ0 - 0.04, slatMat, W / 2 - 0.09, y, (winZ0 + winZ1) / 2);
    slat.rotation.z = 0.5;
    scene.add(slat);
  }
  scene.add(cyl(0.004, 0.004, winY1 - winY0, mat(0xbbbbbb), W / 2 - 0.12, (winY0 + winY1) / 2, winZ0 + 0.15, 4));
  // outside: a dim wall across the street so the window is not a void
  const outside = mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x1a1c1f }), W / 2 + 1.5, 1.5, 1.4);
  outside.rotation.y = -Math.PI / 2;
  outside.castShadow = false;
  outside.receiveShadow = false;
  scene.add(outside);

  // ceiling lamp: opal glass, chain
  const lamp = bulb(0, 2.45, -0.7, 0, 1.15, 8);
  scene.add(lamp.group);
  const lampGlass = lamp.glass.material as THREE.MeshBasicMaterial;
  const shadeOpal = lathe([[0.0, 0.0], [0.16, 0.0], [0.2, 0.05], [0.17, 0.14], [0.06, 0.2], [0.02, 0.22]], new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.3, emissive: 0xfff3dd, emissiveIntensity: 0 }), 0, 2.42, -0.7);
  scene.add(shadeOpal);
  const shadeMat = shadeOpal.material as THREE.MeshStandardMaterial;
  const cone = lightCone(0, 2.4, -0.7, 2.4, 1.3, 0.045);
  scene.add(cone);
  const setLights = (on: number) => {
    lamp.spot.intensity = 18 * on;
    lamp.fill.intensity = 2.2 * on;
    lampGlass.color.setScalar(on > 0.3 ? 1 : 0.15);
    shadeMat.emissiveIntensity = on * 0.9;
    cone.visible = on > 0.3;
  };
  let lightLevel = g.flag('b.lights') ? 1 : 0;
  setLights(lightLevel);
  const motes = dust([-2.6, 0.2, -2.2], [2.8, 2.8, 2.2], 220);
  scene.add(motes.points);

  // ---------------- counter under the mirror ----------------
  scene.add(rbox(4.6, 0.86, 0.45, 0.03, enamel, 0, 0.43, -2.27));
  const marble = tileMaterial({ a: '#2a2a2a', b: '#2a2a2a', n: 1, repeat: [3, 0.4], grout: '#2a2a2a', grime: 0.1, rough: 0.12, checker: false });
  scene.add(rbox(4.7, 0.05, 0.52, 0.015, marble, 0, 0.895, -2.26));
  scene.add(box(4.6, 0.02, 0.02, chrome, 0, 0.86, -2.03));
  // cupboard doors on the counter front
  for (let i = 0; i < 6; i++) {
    const x = -1.95 + i * 0.78;
    if (Math.abs(x - -0.72) < 0.3) continue;
    scene.add(rbox(0.66, 0.5, 0.02, 0.01, enamel, x, 0.4, -2.04));
    scene.add(cyl(0.012, 0.012, 0.03, chrome, x + 0.25, 0.55, -2.02, 8).rotateX(Math.PI / 2));
  }
  // drawer
  const drawer = rbox(0.55, 0.18, 0.4, 0.02, woodMid, -0.72, 0.72, -2.27);
  scene.add(drawer);
  const drawerKnob = rbox(0.14, 0.03, 0.03, 0.012, chrome, -0.72, 0.72, -2.05);
  scene.add(drawerKnob);
  if (g.flag('b.drawer')) {
    drawer.position.z += 0.3;
    drawerKnob.position.z += 0.3;
  }
  // bottles of tonic, brilliantine, a jar of disinfectant with combs
  const bottleProfiles: [number, number][][] = [
    [[0, 0], [0.04, 0], [0.042, 0.005], [0.042, 0.15], [0.03, 0.18], [0.012, 0.2], [0.012, 0.24], [0.014, 0.25], [0, 0.25]],
    [[0, 0], [0.05, 0], [0.05, 0.1], [0.045, 0.12], [0.015, 0.14], [0.015, 0.17], [0, 0.17]],
    [[0, 0], [0.032, 0], [0.034, 0.12], [0.02, 0.16], [0.01, 0.2], [0.012, 0.22], [0, 0.22]],
  ];
  const bottleMats = [blackGlass, new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.1, envMapIntensity: 2 }), new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.12, envMapIntensity: 2 })];
  [-1.9, -1.78, -1.62, -0.25, -0.12, 0.05, 0.2, 0.95, 1.08].forEach((x, i) => {
    const b = lathe(bottleProfiles[i % 3], bottleMats[(i * 2) % 3], x, 0.92, -2.38 + (i % 2) * 0.05, 16);
    scene.add(b);
    if (i % 3 === 0) {
      const label = textPlane([i % 2 ? 'TONICO' : 'PETROLIO'], 0.07, 0.05, { bg: '#e6dfcf', size: 14, px: 32 });
      label.position.set(x, 1.0, -2.338 + (i % 2) * 0.05);
      scene.add(label);
    }
  });
  const jar = fx(lathe([[0, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.24], [0.07, 0.26], [0, 0.26]], new THREE.MeshStandardMaterial({ color: 0xdde4e6, transparent: true, opacity: 0.35, roughness: 0.05, envMapIntensity: 2 }), 0.55, 0.92, -2.32, 24));
  jar.userData.noPick = false;
  scene.add(jar);
  scene.add(fx(cyl(0.068, 0.068, 0.18, new THREE.MeshBasicMaterial({ color: 0x0c3033, transparent: true, opacity: 0.6 }), 0.55, 1.01, -2.32, 20)));
  for (let i = 0; i < 4; i++) {
    const comb = box(0.012, 0.22, 0.035, mat(0x111111, { roughness: 0.3 }), 0.53 + i * 0.015, 1.1, -2.32 + (i - 1.5) * 0.02);
    comb.rotation.z = (i - 1.5) * 0.12;
    scene.add(comb);
  }
  // scissors and a brush laid on the counter
  const scis = new THREE.Group();
  scis.add(box(0.16, 0.006, 0.012, chrome, 0.06, 0, 0).rotateY(0.15));
  scis.add(box(0.16, 0.006, 0.012, chrome, 0.06, 0.002, 0).rotateY(-0.15));
  scis.add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 16), chrome).translateX(-0.04).translateZ(0.02).rotateX(Math.PI / 2));
  scis.position.set(0.3, 0.925, -2.15);
  scene.add(scis);
  scene.add(cyl(0.025, 0.02, 0.09, woodMid, -0.4, 0.97, -2.2, 12));
  scene.add(cyl(0.035, 0.03, 0.05, mat(0xd9d2c4, { roughness: 1 }), -0.4, 1.035, -2.2, 12));

  // towel steamer: chrome cylinder with a domed lid on three legs
  const steamer = new THREE.Group();
  steamer.add(lathe([[0, 0.05], [0.15, 0.05], [0.16, 0.07], [0.16, 0.38], [0.15, 0.4], [0.12, 0.47], [0.04, 0.5], [0.03, 0.53], [0, 0.53]], chrome, 0, 0, 0, 32));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    steamer.add(cyl(0.008, 0.008, 0.06, chrome, Math.cos(a) * 0.12, 0.03, Math.sin(a) * 0.12, 6));
  }
  steamer.add(rbox(0.06, 0.05, 0.04, 0.01, mat(0x111111), 0, 0.15, 0.16));
  steamer.add(sphere(0.012, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.02, 0.15, 0.18, 6));
  steamer.position.set(1.65, 0.92, -2.25);
  scene.add(steamer);
  const steamerLed = steamer.children[steamer.children.length - 1] as THREE.Mesh;
  steamerLed.visible = lightLevel > 0;

  // ---------------- mirror ----------------
  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = 1024;
  mirrorCanvas.height = 256;
  const mirrorTex = new THREE.CanvasTexture(mirrorCanvas);
  mirrorTex.colorSpace = THREE.SRGBColorSpace;
  let fog = g.flag('b.steam') ? 1 : 0;
  let showWord = !!g.flag('b.reflect');
  let ghost = 0;
  // silvering decay at the edges (drawn over the real reflection)
  const edges = document.createElement('canvas');
  edges.width = 1024;
  edges.height = 256;
  {
    const c = edges.getContext('2d')!;
    for (let i = 0; i < 140; i++) {
      c.fillStyle = `rgba(12,12,12,${0.2 + Math.random() * 0.5})`;
      const edge = Math.random() < 0.5;
      c.beginPath();
      c.arc(edge ? Math.random() * 70 : 1024 - Math.random() * 70, Math.random() * 256, 3 + Math.random() * 16, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(12,12,12,${Math.random() * 0.35})`;
      c.beginPath();
      c.arc(Math.random() * 1024, Math.random() < 0.5 ? Math.random() * 25 : 256 - Math.random() * 25, 2 + Math.random() * 9, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, 1024, 256, 6000, 0.1);
  }
  const base = document.createElement('canvas');
  base.width = 1024;
  base.height = 256;
  {
    const c = base.getContext('2d')!;
    const gr = c.createLinearGradient(0, 0, 1024, 256);
    gr.addColorStop(0, '#5d6266');
    gr.addColorStop(0.4, '#8a8f93');
    gr.addColorStop(0.55, '#6c7175');
    gr.addColorStop(1, '#4a4e52');
    c.fillStyle = gr;
    c.fillRect(0, 0, 1024, 256);
    c.drawImage(edges, 0, 0);
  }
  const fogNoise = document.createElement('canvas');
  fogNoise.width = 1024;
  fogNoise.height = 256;
  {
    const c = fogNoise.getContext('2d')!;
    c.fillStyle = 'rgb(225,228,230)';
    c.fillRect(0, 0, 1024, 256);
    noise(c, 1024, 256, 14000, 0.18);
    // condensation droplets
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(120,125,130,${Math.random() * 0.35})`;
      c.beginPath();
      c.arc(Math.random() * 1024, Math.random() * 256, 1 + Math.random() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  const drawMirror = () => {
    const c = mirrorCanvas.getContext('2d')!;
    if (hiQ) {
      c.clearRect(0, 0, 1024, 256);
      c.drawImage(edges, 0, 0);
    } else c.drawImage(base, 0, 0);
    if (ghost > 0) {
      // the barber, old, standing behind you in the reflection
      c.save();
      c.globalAlpha = ghost;
      const gx = 380, gy = 40;
      const gr = c.createRadialGradient(gx, gy + 50, 5, gx, gy + 50, 80);
      gr.addColorStop(0, '#e6e2da');
      gr.addColorStop(1, 'rgba(230,226,218,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(gx, gy + 50, 42, 56, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#000';
      c.beginPath();
      c.ellipse(gx - 15, gy + 42, 9, 7, 0, 0, Math.PI * 2);
      c.ellipse(gx + 15, gy + 42, 9, 7, 0, 0, Math.PI * 2);
      c.ellipse(gx, gy + 82, 12, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d8d4cc';
      c.fillRect(gx - 50, gy + 105, 100, 120);
      c.restore();
    }
    if (fog > 0) {
      c.save();
      c.globalAlpha = fog * 0.85;
      c.drawImage(fogNoise, 0, 0);
      c.restore();
      if (fog > 0.6) {
        // words traced with a finger: the fog is wiped away along the letters
        c.save();
        c.globalAlpha = Math.min(1, (fog - 0.6) / 0.3);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = 'rgba(70,74,78,0.95)';
        c.font = "bold 50px 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(t('bar.mirror1'), 512, 90, 960);
        c.fillText(t('bar.mirror2'), 512, 165, 960);
        c.restore();
      }
    }
    if (showWord) {
      c.save();
      c.font = "bold 70px 'American Typewriter', 'Courier New', monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(15,15,15,0.85)';
      c.fillText(t('bar.lockWord').split('').join(' '), 820, 215);
      c.restore();
    }
    mirrorTex.needsUpdate = true;
  };
  drawMirror();
  const mirrorW = 4.2, mirrorH = 1.05;
  if (hiQ) {
    // a real reflection of the room, with the fog / writing / ghost drawn on a layer in front of it
    const refl = new Reflector(new THREE.PlaneGeometry(mirrorW, mirrorH), {
      textureWidth: 1024,
      textureHeight: 256,
      color: 0x8a8e90,
      clipBias: 0.003,
    });
    refl.position.set(0, 1.6, -2.465);
    scene.add(refl);
    const overlay = fx(mesh(new THREE.PlaneGeometry(mirrorW, mirrorH), new THREE.MeshBasicMaterial({ map: mirrorTex, transparent: true, depthWrite: false }), 0, 1.6, -2.455, false));
    scene.add(overlay);
  } else {
    const mirror = mesh(new THREE.PlaneGeometry(mirrorW, mirrorH), new THREE.MeshStandardMaterial({ map: mirrorTex, roughness: 0.25, metalness: 0.1, emissive: 0xffffff, emissiveMap: mirrorTex, emissiveIntensity: 0.06 }), 0, 1.6, -2.455);
    mirror.castShadow = false;
    scene.add(mirror);
  }
  // carved frame
  scene.add(rbox(4.42, 0.08, 0.05, 0.02, woodDark, 0, 2.16, -2.47));
  scene.add(rbox(4.42, 0.08, 0.05, 0.02, woodDark, 0, 1.04, -2.47));
  for (const x of [-2.17, 2.17]) scene.add(rbox(0.08, 1.2, 0.05, 0.02, woodDark, x, 1.6, -2.47));
  scene.add(rbox(1.2, 0.18, 0.05, 0.04, woodDark, 0, 2.27, -2.47));
  // two wall sconces at the mirror's sides (always off: broken)
  for (const x of [-2.45, 2.45]) {
    scene.add(cyl(0.03, 0.03, 0.12, chrome, x, 1.9, -2.42, 10).rotateX(Math.PI / 2));
    scene.add(lathe([[0, 0], [0.05, 0], [0.08, 0.12], [0.07, 0.14], [0, 0.14]], new THREE.MeshStandardMaterial({ color: 0xd8d4ca, roughness: 0.3 }), x, 1.92, -2.34, 16));
  }

  // steam particles
  const steamTex = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const s = fx(new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })));
    s.userData.phase = Math.random();
    s.position.set(1.65, 1.4, -2.2);
    scene.add(s);
    puffs.push(s);
  }
  let steaming = 0;

  // ---------------- chairs ----------------
  const chairState: number[] = (g.flag('b.chairState') as string | undefined)?.split(',').map(Number) ?? [...CHAIR_START];
  const chairs: THREE.Group[] = [];
  const footrests: THREE.Object3D[] = [];
  [-1.45, 0, 1.45].forEach((x, i) => {
    const c = new THREE.Group();
    // pedestal: wide enamel base, chrome column, hydraulic pump pedal
    c.add(lathe([[0, 0], [0.3, 0], [0.31, 0.02], [0.28, 0.05], [0.1, 0.08], [0.08, 0.12], [0, 0.12]], enamel, 0, 0, 0, 32));
    c.add(cyl(0.065, 0.075, 0.3, chrome, 0, 0.26, 0, 20));
    c.add(rbox(0.06, 0.03, 0.18, 0.01, chrome, 0.2, 0.06, 0.12).rotateY(0.6));
    // seat frame and cushion
    c.add(rbox(0.62, 0.1, 0.58, 0.03, enamel, 0, 0.44, 0));
    c.add(rbox(0.56, 0.12, 0.52, 0.05, leather, 0, 0.53, -0.01));
    // backrest, slightly reclined, with tufted pads
    const back = new THREE.Group();
    back.add(rbox(0.6, 0.72, 0.1, 0.04, enamel, 0, 0, 0));
    for (let k = 0; k < 3; k++) back.add(rbox(0.5, 0.2, 0.06, 0.04, leather, 0, -0.22 + k * 0.22, -0.05));
    back.position.set(0, 0.95, 0.29);
    back.rotation.x = -0.18;
    c.add(back);
    // headrest on a chrome rod
    c.add(cyl(0.012, 0.012, 0.22, chrome, 0, 1.38, 0.37, 8));
    c.add(rbox(0.36, 0.13, 0.09, 0.045, leather, 0, 1.47, 0.36));
    // armrests: chrome brackets with leather pads
    for (const s of [-1, 1]) {
      c.add(rbox(0.06, 0.2, 0.06, 0.02, chrome, s * 0.33, 0.6, 0.15));
      c.add(rbox(0.06, 0.2, 0.06, 0.02, chrome, s * 0.33, 0.6, -0.18));
      c.add(rbox(0.1, 0.06, 0.52, 0.03, leather, s * 0.33, 0.72, -0.02));
    }
    // footrest: ribbed chrome plate on two arms
    const foot = new THREE.Group();
    foot.add(rbox(0.44, 0.025, 0.2, 0.008, chrome, 0, 0, 0));
    for (let k = 0; k < 5; k++) foot.add(box(0.4, 0.006, 0.012, mat(0x222222), 0, 0.015, -0.08 + k * 0.04));
    for (const s of [-1, 1]) foot.add(rbox(0.02, 0.2, 0.02, 0.008, chrome, s * 0.18, 0.1, 0.09).rotateX(-0.6));
    foot.position.set(0, 0.22, -0.4);
    c.add(foot);
    footrests.push(foot);
    c.position.set(x, 0, -1.35);
    c.rotation.y = chairState[i] * (Math.PI / 2);
    c.userData.passThrough = true;
    scene.add(c);
    chairs.push(c);
  });
  if (g.flag('b.chairs')) footrests[1].rotation.x = -0.6;

  // ---------------- left wall: fuse box, cabinet, diplomas, coat rack ----------------
  const metal = new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 0.45, metalness: 0.6 });
  scene.add(rbox(0.12, 0.58, 0.44, 0.02, metal, -2.94, 1.65, 0.9));
  for (let k = 0; k < 3; k++) scene.add(cyl(0.025, 0.025, 0.04, mat(0xd8d2c4), -2.86, 1.55 + k * 0.1, 0.8, 10).rotateZ(Math.PI / 2));
  scene.add(cyl(0.02, 0.02, 0.6, metal, -2.95, 2.25, 0.9, 6));
  const fuseLabel = textPlane(['⚡'], 0.16, 0.16, { bg: '#e8e2d0', size: 70, px: 64 });
  fuseLabel.position.set(-2.875, 1.85, 1.0);
  fuseLabel.rotation.y = Math.PI / 2;
  scene.add(fuseLabel);
  // razor cabinet with glass door
  scene.add(rbox(0.4, 0.95, 0.75, 0.02, woodMid, -2.8, 1.55, -1.0));
  scene.add(rbox(0.44, 0.06, 0.8, 0.02, woodDark, -2.8, 2.05, -1.0));
  const cabDoorPivot = new THREE.Group();
  cabDoorPivot.position.set(-2.59, 1.55, -1.37);
  cabDoorPivot.add(rbox(0.03, 0.9, 0.72, 0.01, woodDark, 0, 0, 0.36));
  cabDoorPivot.add(sphere(0.022, chrome, 0.03, 0, 0.66, 10));
  const keyhole = box(0.005, 0.03, 0.012, mat(0x050505), 0.017, -0.05, 0.66);
  cabDoorPivot.add(keyhole);
  scene.add(cabDoorPivot);
  if (g.flag('b.cabinet')) cabDoorPivot.rotation.y = -1.6;
  for (const y of [1.25, 1.6]) scene.add(box(0.36, 0.015, 0.7, woodDark, -2.8, y, -1.0));
  const caseMesh = rbox(0.12, 0.06, 0.3, 0.02, mat(0x3a2a1e, { roughness: 0.5 }), -2.75, 1.29, -1.0);
  caseMesh.visible = !!g.flag('b.cabinet') && !g.has('case') && !g.flag('razor');
  scene.add(caseMesh);
  // diplomas
  const diploma = (lines: string[]) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#e8e1cf';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6b5d45';
    c.lineWidth = 4;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#2b241b';
    c.textAlign = 'center';
    c.font = "bold 20px Georgia, serif";
    c.fillText(lines[0], w / 2, h * 0.3);
    c.font = "14px Georgia, serif";
    lines.slice(1).forEach((l, i) => c.fillText(l, w / 2, h * 0.5 + i * 18));
    c.fillStyle = 'rgba(120,20,20,0.5)';
    c.beginPath();
    c.arc(w * 0.78, h * 0.8, 14, 0, Math.PI * 2);
    c.fill();
    noise(c, w, h, 1500, 0.12);
  };
  const d1 = framed(0.42, 0.3, diploma(['DIPLOMA', 'Arte del Barbiere', 'Aldo M. — 1951']), woodDark);
  d1.position.set(-2.97, 1.85, -0.1);
  d1.rotation.y = Math.PI / 2;
  scene.add(d1);
  const d2 = framed(0.3, 0.38, (c, w, h) => {
    c.fillStyle = '#9a958c';
    c.fillRect(0, 0, w, h);
    const gr = c.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, w * 0.6);
    gr.addColorStop(0, '#d8d2c6');
    gr.addColorStop(1, '#4a4640');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b1916';
    c.beginPath();
    c.ellipse(w / 2, h * 0.38, w * 0.16, h * 0.15, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.22, h * 0.55, w * 0.56, h * 0.5);
    noise(c, w, h, 2500, 0.2);
  }, woodDark);
  d2.position.set(-2.97, 1.62, 0.32);
  d2.rotation.y = Math.PI / 2;
  scene.add(d2);
  // coat rack with a hat and an overcoat by the door
  const rack = new THREE.Group();
  rack.add(lathe([[0, 0], [0.18, 0], [0.18, 0.02], [0.03, 0.05], [0.025, 1.75], [0.04, 1.8], [0, 1.82]], woodDark, 0, 0, 0, 16));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    rack.add(cyl(0.01, 0.012, 0.18, woodDark, Math.cos(a) * 0.07, 1.68, Math.sin(a) * 0.07, 6).rotateZ(Math.cos(a) * 0.7).rotateX(-Math.sin(a) * 0.7));
  }
  const coat = lathe([[0, 1.62], [0.12, 1.6], [0.2, 1.45], [0.22, 1.0], [0.25, 0.75], [0.02, 0.74]], new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.95 }), 0.05, 0, 0.05, 20);
  coat.scale.set(1, 1, 0.6);
  rack.add(coat);
  rack.add(cyl(0.16, 0.16, 0.015, mat(0x111111), 0, 1.83, 0, 20));
  rack.add(cyl(0.09, 0.1, 0.11, mat(0x111111), 0, 1.89, 0, 20));
  rack.position.set(-2.55, 0, 2.05);
  scene.add(rack);

  // ---------------- right wall: price board, till, calendar ----------------
  const prices = textPlane([t('bar.priceTitle'), t('bar.price1'), t('bar.price2'), t('bar.price3'), t('bar.price4'), t('bar.price5')], 0.96, 1.06, { bg: '#1c1a18', fg: '#efe9dc', size: 30, px: 320, border: '#8d8576', align: 'left' });
  prices.position.set(2.965, 1.75, 0.3);
  prices.rotation.y = -Math.PI / 2;
  scene.add(prices);
  scene.add(rbox(0.04, 1.14, 1.04, 0.015, woodDark, 2.985, 1.75, 0.3));
  scene.add(rbox(0.6, 0.85, 0.7, 0.02, woodMid, 2.65, 0.425, -1.25));
  scene.add(rbox(0.64, 0.04, 0.74, 0.015, woodDark, 2.65, 0.865, -1.25));
  const tillMetal = new THREE.MeshStandardMaterial({ color: 0x5a5852, roughness: 0.3, metalness: 0.8, envMapIntensity: 1.4 });
  const till = new THREE.Group();
  till.add(rbox(0.42, 0.24, 0.4, 0.03, tillMetal, 0, 0.12, 0));
  const tillTop = rbox(0.42, 0.14, 0.18, 0.03, tillMetal, 0, 0.3, 0.1);
  tillTop.rotation.x = -0.5;
  till.add(tillTop);
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 5; k++) till.add(cyl(0.014, 0.014, 0.02, mat(0xe2ddd2), -0.14 + k * 0.07, 0.27 + r * 0.03, 0.17 - r * 0.045, 10).rotateX(-0.5));
  till.add(rbox(0.3, 0.07, 0.02, 0.01, mat(0x111111), 0, 0.42, 0.02));
  const tillDrawer = rbox(0.38, 0.08, 0.36, 0.01, mat(0x2f2f2f), 0, 0.03, 0);
  till.add(tillDrawer);
  till.position.set(2.62, 0.885, -1.25);
  till.rotation.y = -Math.PI / 2;
  scene.add(till);
  if (g.flag('b.till')) tillDrawer.position.z += 0.2;
  const cal = textPlane([t('bar.calendar1'), t('bar.calendar2')], 0.42, 0.55, { bg: '#e6e0d0', size: 38, px: 192 });
  cal.position.set(2.975, 1.7, -1.3);
  cal.rotation.y = -Math.PI / 2;
  scene.add(cal);
  scene.add(cyl(0.008, 0.008, 0.02, mat(0x111111), 2.97, 1.99, -1.3, 6).rotateZ(Math.PI / 2));

  // ---------------- door ----------------
  const doorG = new THREE.Group();
  doorG.add(rbox(1.0, 2.1, 0.06, 0.02, woodDark, 0, 1.05, 0));
  doorG.add(fx(mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0x9aa4aa, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 1 }), 0, 1.5, -0.032, false)));
  const sign = textPlane([t('bar.closed')], 0.3, 0.12, { bg: '#e2dccd', size: 40, px: 64 });
  sign.position.set(0, 1.25, -0.035);
  sign.rotation.y = Math.PI;
  doorG.add(sign);
  doorG.add(sphere(0.03, chrome, 0.38, 1.05, -0.05, 10));
  doorG.position.set(0.5, 0, D / 2 - 0.04);
  scene.add(doorG);
  // radiator under the price board
  const rad = new THREE.Group();
  for (let k = 0; k < 9; k++) rad.add(rbox(0.06, 0.6, 0.1, 0.025, enamel, 0, 0.4, -0.32 + k * 0.08));
  rad.position.set(2.9, 0, 0.3);
  scene.add(rad);

  // ---------------- hotspots ----------------
  const hFuse = hitBox(0.3, 0.7, 0.6, -2.9, 1.65, 0.9, 'fuse');
  const hDrawer = hitBox(0.7, 0.45, 0.6, -0.72, 0.72, -2.0, 'drawer');
  const hSteamer = hitBox(0.5, 0.7, 0.5, 1.65, 1.2, -2.2, 'steamer');
  const hMirror = hitBox(4.2, 1.1, 0.1, 0, 1.6, -2.45, 'mirror');
  const hPrices = hitBox(0.1, 1.2, 1.1, 2.95, 1.75, 0.3, 'prices');
  const hTill = hitBox(0.6, 0.5, 0.6, 2.62, 1.05, -1.25, 'till');
  const hCabinet = hitBox(0.6, 1.0, 0.85, -2.7, 1.55, -1.0, 'cabinet');
  const hCalendar = hitBox(0.1, 0.6, 0.5, 2.95, 1.7, -1.3, 'calendar');
  const hChairs = [-1.45, 0, 1.45].map((x, i) => hitBox(0.7, 1.4, 0.7, x, 0.7, -1.35, 'chair' + i));
  scene.add(hFuse, hDrawer, hSteamer, hMirror, hPrices, hTill, hCabinet, hCalendar, ...hChairs);

  const lit = () => !!g.flag('b.lights');

  const lightsOn = async () => {
    g.audio.sfx('switch');
    for (const v of [0.6, 0, 0.9, 0.1, 1]) {
      setLights(v);
      await sleep(120 + Math.random() * 120);
    }
    lightLevel = 1;
    steamerLed.visible = true;
    g.set('b.lights');
  };

  const runSteam = async () => {
    g.audio.sfx('steam');
    steaming = 1;
    await g.view('mirror');
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 3200, 1);
        fog = k;
        drawMirror();
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    steaming = 0;
    g.set('b.steam');
    g.note('note.mirror');
    await g.say([{ who: 'diego', key: 'bar.mirrorRead' }, { who: 'diego', key: 'bar.mirrorThink' }]);
  };

  const finale = async () => {
    // the razor is out of its case: the barber wants it back
    await g.view('mirror', 1.2);
    g.audio.hush(6);
    g.audio.sfx('heart');
    for (let i = 0; i <= 30; i++) {
      ghost = i / 30;
      drawMirror();
      await sleep(60);
    }
    g.setFlicker(true, 0.8);
    await g.say([{ who: 'narr', key: 'bar.ghost1' }]);
    await g.scare('barber');
    setLights(0);
    ghost = 0;
    drawMirror();
    g.setFlicker(false);
    await sleep(500);
    await g.say([{ who: 'diego', key: 'bar.after1' }, { who: 'diego', key: 'bar.after2' }]);
    setLights(0.35);
    g.set('razor');
    g.rebuild('map');
  };

  const openCase = async () => {
    const word = t('bar.lockWord');
    g.audio.sfx('click');
    const ok = await g.ui.letterLock(t('bar.caseLock'), word.length, (w) => w === word, () => g.audio.sfx('click'));
    if (!ok) return;
    g.audio.sfx('unlock');
    g.take('case');
    g.give('razor');
    await g.say([{ who: 'diego', key: 'bar.razor1' }, { who: 'narr', key: 'bar.razor2' }]);
    await finale();
  };

  g.examiners.case = async () => {
    await g.say([{ who: 'diego', key: 'bar.case1' }, { who: 'diego', key: 'bar.case2' }]);
    await openCase();
  };
  g.examiners.photo = async () => {
    g.audio.sfx('paper');
    await g.ui.picture(t('bar.photoTitle'), photoDataUrl(), t('bar.photoBack'));
  };

  const chairTap = async (i: number) => {
    if (g.flag('b.chairs')) return g.say('bar.chairsDone');
    chairState[i] = (chairState[i] + 1) % 4;
    g.set('b.chairState', chairState.join(','));
    g.audio.sfx('creak');
    const from = chairs[i].rotation.y;
    const to = from + Math.PI / 2;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min((performance.now() - t0) / 350, 1);
        chairs[i].rotation.y = from + (to - from) * (1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    if (chairState.every((v, j) => v === CHAIR_TARGET[j])) {
      await sleep(300);
      g.audio.sfx('unlock');
      footrests[1].rotation.x = -0.6;
      g.set('b.chairs');
      await g.say([{ who: 'narr', key: 'bar.chairsOpen' }]);
      g.give('key');
    }
  };

  const hotspots: Hotspot[] = [
    { id: 'fuse', obj: hFuse, view: 'fuse', tap: async (item) => {
      if (lit()) return item ? g.nope() : g.say('bar.fuseOk');
      if (item === 'fuse') {
        g.take('fuse');
        await lightsOn();
        await g.say([{ who: 'diego', key: 'bar.lightOn' }]);
        await g.view('main');
        return;
      }
      if (item) return g.nope();
      await g.say('bar.fuseMissing');
    } },
    { id: 'drawer', obj: hDrawer, view: 'drawer', tap: async (item) => {
      if (item) return g.nope();
      if (!g.flag('b.drawer')) {
        g.audio.sfx('drawer');
        drawer.position.z += 0.3;
        drawerKnob.position.z += 0.3;
        g.set('b.drawer');
        await g.say('bar.drawer');
        g.give('fuse');
      } else await g.say('bar.drawerEmpty');
    } },
    { id: 'steamer', obj: hSteamer, view: 'steamer', tap: async (item) => {
      if (item) return g.nope();
      if (!lit()) return g.say('bar.noPower');
      if (!g.flag('b.steam')) return runSteam();
      await g.say('bar.steamDone');
    } },
    { id: 'mirror', obj: hMirror, view: 'mirror', tap: async (item) => {
      if (item === 'case') {
        g.deselect();
        showWord = true;
        drawMirror();
        g.set('b.reflect');
        g.note('note.caseWord');
        await g.say([{ who: 'diego', key: 'bar.reflect' }]);
        return;
      }
      if (item) return g.nope();
      if (g.flag('b.steam')) return g.say([{ who: 'diego', key: 'bar.mirrorRead' }]);
      await g.say(lit() ? 'bar.mirrorLit' : 'bar.mirrorDark');
    } },
    { id: 'prices', obj: hPrices, view: 'prices', tap: async (item) => {
      if (item) return g.nope();
      if (!lit()) return g.say('bar.tooDark');
      g.audio.sfx('paper');
      await g.ui.doc(t('bar.priceTitle'), [t('bar.price1'), t('bar.price2'), t('bar.price3'), t('bar.price4'), t('bar.price5')].join('\n'));
      g.note('note.prices');
    } },
    { id: 'till', obj: hTill, view: 'till', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('b.till')) return g.say('bar.tillEmpty');
      if (!lit()) return g.say('bar.tooDark');
      const ok = await g.ui.keypad(t('bar.tillTitle'), 3, (c) => c === '850', () => g.audio.sfx('click'));
      if (!ok) return;
      g.audio.sfx('bell');
      tillDrawer.position.z += 0.2;
      g.set('b.till');
      await g.say([{ who: 'narr', key: 'bar.tillOpen' }]);
      g.give('photo');
      g.diaryPage('lisa2');
      g.note('note.receipt');
      await g.say([{ who: 'diego', key: 'bar.tillPage' }]);
    } },
    { id: 'cabinet', obj: hCabinet, view: 'cabinet', tap: async (item) => {
      if (g.flag('b.cabinet')) {
        if (item) return g.nope();
        if (caseMesh.visible) {
          caseMesh.visible = false;
          g.give('case');
          return g.say('bar.caseFound');
        }
        return g.say('bar.cabinetEmpty');
      }
      if (item === 'key') {
        g.take('key');
        g.audio.sfx('unlock');
        g.set('b.cabinet');
        const t0 = performance.now();
        await new Promise<void>((res) => {
          const step = () => {
            const k = Math.min((performance.now() - t0) / 600, 1);
            cabDoorPivot.rotation.y = -1.6 * k;
            if (k < 1) requestAnimationFrame(step);
            else res();
          };
          step();
        });
        caseMesh.visible = true;
        await g.say('bar.cabinetOpen');
        return;
      }
      if (item) return g.nope();
      await g.say('bar.cabinetLocked');
    } },
    { id: 'calendar', obj: hCalendar, tap: async (item) => {
      if (item) return g.nope();
      await g.say('bar.calendar');
    } },
    ...hChairs.map((h, i) => ({
      id: 'chair' + i,
      obj: h,
      view: 'chairs',
      lowPriority: true,
      tap: async (item: string | null) => {
        if (item) return g.nope();
        if (!lit()) return g.say('bar.tooDark');
        await chairTap(i);
      },
    })),
  ];

  return {
    id: 'barbiere',
    nameKey: 'place.barbiere',
    scene,
    drone: 'barbiere',
    startView: 'main',
    views: {
      main: { pos: [0, 1.6, 2.0], look: [0, 1.2, -2.5], yaw: 45, pitch: 14 },
      mirror: { pos: [0, 2.0, -0.1], look: [0, 1.5, -2.5], parent: 'main', yaw: 25, pitch: 10 },
      drawer: { pos: [-0.72, 1.4, -0.75], look: [-0.72, 0.75, -2.3], parent: 'main', yaw: 15, pitch: 8 },
      steamer: { pos: [0.72, 1.75, -0.95], look: [1.65, 1.15, -2.25], parent: 'main', yaw: 15, pitch: 8 },
      chairs: { pos: [0, 2.7, 0.9], look: [0, 0.3, -1.4], parent: 'main', yaw: 20, pitch: 8 },
      fuse: { pos: [-1.7, 1.6, 0.9], look: [-3, 1.6, 0.9], parent: 'main', yaw: 15, pitch: 8 },
      cabinet: { pos: [-1.4, 1.55, -0.6], look: [-3, 1.45, -1.0], parent: 'main', yaw: 15, pitch: 10 },
      prices: { pos: [1.7, 1.7, 0.3], look: [3, 1.7, 0.3], parent: 'main', yaw: 15, pitch: 8 },
      till: { pos: [1.5, 1.65, -0.5], look: [2.65, 1.0, -1.25], parent: 'main', yaw: 15, pitch: 8 },
    },
    hotspots,
    update: (dt, time) => {
      motes.update(dt, time);
      puffs.forEach((p) => {
        const ph = (p.userData.phase + time * 0.35) % 1;
        p.position.set(1.65 + Math.sin(ph * 9 + p.userData.phase * 6) * 0.12 - ph * 0.6, 1.4 + ph * 1.2, -2.2 + ph * 0.1);
        p.scale.setScalar(0.15 + ph * 0.6);
        (p.material as THREE.SpriteMaterial).opacity = steaming * (1 - ph) * 0.5;
      });
      void dt;
      void lightLevel;
    },
    enter: async () => {
      g.audio.sfx('bell');
      if (!g.flag('b.entered')) {
        g.set('b.entered');
        await sleep(500);
        await g.say([{ who: 'diego', key: 'bar.enter1' }, { who: 'diego', key: 'bar.enter2' }]);
      }
    },
    hint: () => {
      if (!lit()) return g.has('fuse') ? 'hint.bar.useFuse' : 'hint.bar.fuse';
      if (!g.flag('b.steam')) return 'hint.bar.steam';
      if (!g.flag('b.till')) return 'hint.bar.till';
      if (!g.flag('b.chairs')) return 'hint.bar.chairs';
      if (!g.flag('b.cabinet')) return 'hint.bar.cabinet';
      if (!g.flag('razor')) return 'hint.bar.case';
      return 'hint.bar.leave';
    },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let photoUrl = '';
/** The photo found in the till: the shop seen from the loft, the day *he* arrived. Shows the chairs' facing. */
function photoDataUrl() {
  if (photoUrl) return photoUrl;
  const cv = document.createElement('canvas');
  cv.width = 600;
  cv.height = 420;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#9a958b';
  c.fillRect(0, 0, 600, 420);
  // floor tiles in perspective-free top view
  for (let x = 0; x < 600; x += 40)
    for (let y = 80; y < 420; y += 40) {
      c.fillStyle = (x / 40 + y / 40) % 2 ? '#c9c5bc' : '#57544e';
      c.fillRect(x, y, 40, 40);
    }
  // mirror wall on top
  c.fillStyle = '#2a2826';
  c.fillRect(0, 0, 600, 80);
  c.fillStyle = '#b8bcbf';
  c.fillRect(80, 12, 440, 50);
  c.fillStyle = '#e9e4d6';
  c.font = "18px 'American Typewriter', 'Courier New', monospace";
  c.textAlign = 'center';
  c.fillText(t('bar.photoMirror'), 300, 44);
  // door at the bottom
  c.fillStyle = '#1d1b19';
  c.fillRect(310, 400, 110, 20);
  // chairs from above: seat + backrest; backrest is opposite to where the chair faces
  const dirs = CHAIR_TARGET;
  [150, 300, 450].forEach((x, i) => {
    c.save();
    c.translate(x, 230);
    c.rotate((-dirs[i] * Math.PI) / 2);
    c.fillStyle = '#1a1816';
    c.fillRect(-38, -34, 76, 68);
    c.fillStyle = '#0c0b0a';
    c.fillRect(-40, 26, 80, 20); // backrest (towards +y = away from where it faces)
    c.fillStyle = '#9c9c9c';
    c.fillRect(-26, -54, 52, 12); // footrest, in front
    c.restore();
  });
  // a dark figure near the door
  c.fillStyle = 'rgba(0,0,0,0.85)';
  c.beginPath();
  c.arc(470, 372, 22, 0, Math.PI * 2);
  c.fill();
  c.fillRect(440, 352, 60, 8);
  // age
  for (let i = 0; i < 9000; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.12})`;
    c.fillRect(Math.random() * 600, Math.random() * 420, 2, 2);
  }
  const gr = c.createRadialGradient(300, 210, 120, 300, 210, 380);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = gr;
  c.fillRect(0, 0, 600, 420);
  photoUrl = cv.toDataURL('image/jpeg', 0.85);
  return photoUrl;
}
