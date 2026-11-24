import * as THREE from 'three';
import { prop } from '../models';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, cyl, mat, mesh, rbox, lathe, dust, textPlane, hitBox, bulb, lightCone, canvasTex, noise, woodMaterial, plasterMaterial, liveCanvas } from '../builders';
import { createAdaGhost } from '../characters';
import { realEttore, realCharacters } from '../characters_real';
import { t } from '../i18n';
import { wallpaper, sleep } from './ada_common';

/**
 * Ada's living room: the TV, his rocking chair, her wheelchair, the wedding photo,
 * and the hatch to the attic with its cord just out of reach.
 */
export const TV_CHANNEL = 5;

export function createAdaSoggiorno(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 10);
  scene.userData.envIntensity = 0.08;
  const W = 5, H = 2.7, D = 4.5;
  scene.add(room(W, H, D, {
    wall: wallpaper('#b6ad9c'),
    floor: woodMaterial({ base: '#4a3828', repeat: [4, 4], plank: true }),
    ceil: plasterMaterial({ base: '#4a4640', repeat: [2, 2], damp: 1 }),
  }));
  const woodDark = woodMaterial({ base: '#2f2418' });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35 });

  // skirting board
  for (const [x, z, ry, len] of [[0, -D / 2 + 0.01, 0, W], [-W / 2 + 0.01, 0, Math.PI / 2, D], [W / 2 - 0.01, 0, -Math.PI / 2, D]] as const) {
    const sk = rbox(len, 0.12, 0.02, 0.005, woodDark, x, 0.06, z);
    sk.rotation.y = ry;
    scene.add(sk);
  }

  // light: one weak lamp with a fringed shade, the rest is the TV
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const lamp = bulb(0.3, 2.25, 0.2, 7, 1.2, 7);
  scene.add(lamp.group);
  scene.add(lightCone(0.3, 2.23, 0.2, 2.2, 1.2, 0.025));
  const motes = dust([-2.3, 0.2, -2.1], [2.3, 2.5, 2.1], 160);
  scene.add(motes.points);

  // ---------------- the TV on its console ----------------
  const tvX = -0.8, tvZ = -1.9;
  const console_ = prop('console', { height: 0.62 });
  if (console_) {
    console_.position.set(tvX, 0, tvZ);
    scene.add(console_);
  } else scene.add(rbox(1.0, 0.62, 0.45, 0.02, woodDark, tvX, 0.31, tvZ));
  const tvModel = prop('tv', { height: 0.5 });
  const tvGroup = new THREE.Group();
  tvGroup.position.set(tvX, 0.62, tvZ + 0.02);
  scene.add(tvGroup);
  let screenW = 0.36, screenH = 0.27, screenZ = 0.2, screenY = 0.26;
  if (tvModel) {
    tvGroup.add(tvModel);
    const bb = new THREE.Box3().setFromObject(tvModel);
    const sz = bb.getSize(new THREE.Vector3());
    screenW = sz.x * 0.62;
    screenH = sz.y * 0.55;
    screenZ = bb.max.z + 0.004;
    screenY = sz.y * 0.55;
  } else {
    tvGroup.add(rbox(0.55, 0.45, 0.4, 0.04, woodDark, 0, 0.225, 0));
  }
  const screen = liveCanvas(256, 192);
  // the picture on the set: a small studio with Ettore's face, filmed live and mixed with the snow
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x141414);
  const studioCam = new THREE.PerspectiveCamera(28, 4 / 3, 0.05, 10);
  const ettoreTv = realCharacters() ? realEttore() : null;
  if (ettoreTv) {
    studio.add(ettoreTv.group);
    const hp = ettoreTv.head.getWorldPosition(new THREE.Vector3());
    studioCam.position.set(0, hp.y + 0.04, 0.62);
    studioCam.lookAt(0, hp.y + 0.03, 0);
    const key = new THREE.SpotLight(0xffffff, 6, 3, 0.6, 0.6, 1.2);
    key.position.set(0.15, hp.y - 0.5, 0.6);
    key.target.position.set(0, hp.y, 0);
    studio.add(key, key.target, new THREE.AmbientLight(0xffffff, 0.15));
  }
  const rt = new THREE.WebGLRenderTarget(256, 192);
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { tFace: { value: rt.texture }, tIdle: { value: screen.tex }, time: { value: 0 }, face: { value: 0 }, on: { value: 0 }, chan: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tFace, tIdle; uniform float time, face, on, chan; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        if (on < 0.5) { gl_FragColor = texture2D(tIdle, vUv); return; }
        vec2 uv = vUv;
        // bulging tube, wobbling horizontal sync
        vec2 cc = uv - 0.5; uv = 0.5 + cc * (1.0 + dot(cc, cc) * 0.25);
        uv.x += sin(uv.y * 40.0 + time * 9.0) * 0.004 * (1.0 - face * 0.5) + (h(vec2(floor(uv.y * 90.0), floor(time * 24.0))) - 0.5) * 0.012;
        float snow = h(floor(uv * vec2(256.0, 192.0)) + floor(time * 30.0) * 13.1);
        vec3 img = texture2D(tFace, uv).rgb;
        float l = dot(img, vec3(0.3, 0.59, 0.11));
        // the face comes and goes, as if the signal can't quite hold
        float hold = face * (0.75 + 0.25 * sin(time * 3.1) * sin(time * 1.7));
        vec3 c = mix(vec3(snow) * 0.85, vec3(l) * 1.6 + snow * 0.15, hold);
        float roll = smoothstep(0.0, 0.05, abs(fract(uv.y - time * 0.25) - 0.5) - 0.42);
        c *= 0.75 + 0.25 * roll;
        c *= 0.85 + 0.15 * sin(uv.y * 600.0);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) c = vec3(0.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const screenMesh = mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat, -0.04, screenY, screenZ, false);
  tvGroup.add(screenMesh);
  // the channel knob, big enough for a thumb
  const knob = new THREE.Group();
  knob.add(cyl(0.045, 0.05, 0.03, mat(0x161412, { roughness: 0.5 }), 0, 0, 0, 20).rotateX(Math.PI / 2));
  knob.add(rbox(0.012, 0.07, 0.01, 0.003, mat(0xd8d2c4), 0, 0.015, 0.018));
  knob.add(hitBox(0.14, 0.14, 0.06, 0, 0, 0.02, 'knobGrip'));
  knob.position.set(screenW / 2 + 0.02, screenY + 0.02, screenZ + 0.02);
  tvGroup.add(knob);
  const tvLight = new THREE.PointLight(0xd8e4ff, 0, 4, 1.6);
  tvLight.position.set(tvX, 1.0, tvZ + 0.6);
  scene.add(tvLight);

  let channel = Number(g.flag('a.channel') ?? 1);
  let knobAngle = ((channel - 1) / 12) * Math.PI * 2;
  knob.rotation.z = -knobAngle;
  let tvOn = false;
  let face = g.flag('a.tv') ? 1 : 0;
  const drawScreen = (time: number) => {
    const c = screen.ctx;
    screenMat.uniforms.on.value = tvOn ? 1 : 0;
    screenMat.uniforms.time.value = time;
    screenMat.uniforms.face.value = face;
    if (tvOn) {
      if (ettoreTv && face > 0.01) {
        ettoreTv.update(time, 1);
        const r = g.engine.renderer;
        const prev = r.getRenderTarget();
        r.setRenderTarget(rt);
        r.render(studio, studioCam);
        r.setRenderTarget(prev);
      }
      return;
    }
    if (!tvOn) {
      c.fillStyle = '#151515';
      c.fillRect(0, 0, 256, 192);
      const gr = c.createRadialGradient(90, 60, 5, 128, 96, 160);
      gr.addColorStop(0, 'rgba(120,125,130,0.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 256, 192);
      screen.update();
      return;
    }
    // snow
    const img = c.createImageData(256, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255 * (0.55 + 0.45 * Math.random());
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // the face, coming through the snow on the right channel
    if (face > 0.01) {
      c.save();
      c.globalAlpha = face * (0.75 + Math.random() * 0.25);
      c.filter = 'blur(4px)';
      const g2 = c.createRadialGradient(128, 92, 10, 128, 92, 80);
      g2.addColorStop(0, '#d8d4cc');
      g2.addColorStop(0.6, '#77736c');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g2;
      c.beginPath();
      c.ellipse(128, 96, 52, 70, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#050505';
      for (const ex of [108, 148]) {
        c.beginPath();
        c.ellipse(ex, 84, 11, 14, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath();
      c.ellipse(128, 132 + Math.sin(time * 9) * 2, 14, 7 + Math.abs(Math.sin(time * 5)) * 6, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    // rolling bar and channel number
    const bar = ((time * 60) % 240) - 30;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, bar, 256, 22);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.font = 'bold 22px monospace';
    c.fillText(String(channel), 222, 26);
    screen.update();
  };
  drawScreen(0);

  // ---------------- sofa and the TV guide ----------------
  const sofa = prop('sofa', { width: 1.7, turn: Math.PI });
  if (sofa) {
    sofa.position.set(-0.7, 0, 0.55);
    scene.add(sofa);
  } else scene.add(rbox(1.7, 0.8, 0.8, 0.1, mat(0x3c3632), -0.7, 0.4, 0.55));
  const guide = textPlane([t('ada.guideCover1'), t('ada.guideCover2')], 0.2, 0.27, { bg: '#d8d0bd', size: 22, px: 128 });
  guide.rotation.set(-Math.PI / 2, 0, 0.4);
  guide.position.set(-0.1, 0.47, 0.5);
  scene.add(guide);

  // ---------------- his rocking chair ----------------
  const rockPivot = new THREE.Group();
  const rocker = prop('rocking', { height: 1.05 });
  if (rocker) rockPivot.add(rocker);
  else rockPivot.add(rbox(0.6, 1.0, 0.6, 0.05, woodDark, 0, 0.5, 0));
  rockPivot.position.set(-1.85, 0, -0.55);
  rockPivot.rotation.y = 0.9;
  scene.add(rockPivot);
  // his hat on the armrest
  const hat = prop('fisherHat', { width: 0.3 });
  if (hat) {
    hat.position.set(1.95, 1.55, 1.95);
    scene.add(hat);
  }
  // coat rack by the door
  const rack = new THREE.Group();
  rack.add(cyl(0.02, 0.025, 1.7, woodDark, 0, 0.85, 0, 8));
  rack.add(lathe([[0, 0], [0.2, 0], [0.18, 0.04], [0, 0.05]], woodDark, 0, 0, 0, 12));
  for (let k = 0; k < 4; k++) rack.add(cyl(0.008, 0.008, 0.16, brass, Math.cos(k * 1.57) * 0.07, 1.62, Math.sin(k * 1.57) * 0.07, 6).rotateZ(1.1));
  rack.position.set(1.95, 0, 1.95);
  scene.add(rack);

  // ---------------- her wheelchair, facing the wall ----------------
  const wheel = prop('wheelchair', { height: 0.95 });
  const wheelGroup = new THREE.Group();
  if (wheel) wheelGroup.add(wheel);
  wheelGroup.position.set(1.85, 0, -1.55);
  wheelGroup.rotation.y = g.flag('glasses') && !g.flag('placedGlasses') ? -2.3 : 2.6;
  scene.add(wheelGroup);
  const ada = createAdaGhost();
  ada.group.traverse((o) => (o.userData.noPick = true));
  ada.setOpacity(0);
  // seated in the wheelchair (only after you take her glasses)
  ada.group.position.set(1.85, 0.12, -1.55);
  ada.group.rotation.y = -2.3;
  ada.group.scale.set(1, 0.72, 1);
  scene.add(ada.group);

  // ---------------- the wedding photo ----------------
  const photoTex = canvasTex(256, 320, (c, w, h) => {
    c.fillStyle = '#d9d2c2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#8f887b';
    c.fillRect(14, 14, w - 28, h - 70);
    // a kitchen table, he by the window (left), she by the stove (right)
    c.fillStyle = '#c9c3b6';
    c.fillRect(30, 40, 50, 70); // window
    c.fillStyle = '#3c3833';
    c.fillRect(w - 80, 120, 52, 90); // stove
    c.fillStyle = '#5e5850';
    c.beginPath();
    c.ellipse(w / 2, 200, 80, 22, 0, 0, Math.PI * 2);
    c.fill();
    const person = (x: number, dark: boolean, hatOn: boolean) => {
      c.fillStyle = dark ? '#2b2824' : '#efe9dd';
      c.beginPath();
      c.arc(x, 110, 17, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x - 24, 128, 48, 70);
      if (hatOn) {
        c.fillStyle = '#2b2824';
        c.fillRect(x - 22, 92, 44, 7);
        c.fillRect(x - 14, 82, 28, 12);
      }
    };
    person(78, true, true);
    person(w - 82, false, false);
    c.fillStyle = '#efe9dd';
    c.beginPath();
    c.arc(w / 2, 186, 9, 0, Math.PI * 2); // teapot between them
    c.fill();
    noise(c, w, h, 6000, 0.18);
    c.fillStyle = '#2a2622';
    c.font = 'italic 17px Georgia, serif';
    c.textAlign = 'center';
    c.fillText(t('ada.photoCaption'), w / 2, h - 30);
  });
  const frame = prop('frame2', { height: 0.55 });
  const photoGroup = new THREE.Group();
  if (frame) {
    photoGroup.add(frame);
    frame.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && /canvas/i.test(m.name)) m.material = new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.85 });
    });
    frame.position.y = -0.275;
  } else {
    photoGroup.add(rbox(0.42, 0.52, 0.03, 0.01, woodDark, 0, 0, 0));
    photoGroup.add(mesh(new THREE.PlaneGeometry(0.36, 0.45), new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.85 }), 0, 0, 0.017, false));
  }
  photoGroup.position.set(1.0, 1.6, -D / 2 + 0.03);
  scene.add(photoGroup);

  // ---------------- the attic hatch ----------------
  const hatchX = 1.7, hatchZ = 0.1;
  scene.add(rbox(0.86, 0.04, 0.66, 0.01, woodDark, hatchX, H - 0.01, hatchZ));
  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(hatchX - 0.4, H - 0.03, hatchZ);
  const hatchPanel = rbox(0.78, 0.03, 0.6, 0.01, woodMaterial({ base: '#5a4630' }), 0.39, 0, 0);
  hatchPivot.add(hatchPanel);
  scene.add(hatchPivot);
  // the cord, with a little wooden pull, way too high
  const cord = new THREE.Group();
  cord.add(cyl(0.004, 0.004, 0.35, mat(0xcfc8b8), 0, -0.175, 0, 4));
  cord.add(lathe([[0, 0], [0.02, 0.01], [0.022, 0.05], [0, 0.06]], woodDark, 0, -0.41, 0, 10));
  cord.position.set(hatchX + 0.3, H - 0.03, hatchZ);
  scene.add(cord);
  // a slim folding attic ladder, from the hatch down to the floor
  const ladderGroup = new THREE.Group();
  {
    const top = new THREE.Vector3(hatchX - 0.3, H - 0.05, hatchZ);
    const bottom = new THREE.Vector3(hatchX - 1.05, 0, hatchZ);
    const dir = bottom.clone().sub(top);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
    const lw = woodMaterial({ base: '#6b5536' });
    for (const dz of [-0.2, 0.2]) {
      const rail = rbox(0.05, len, 0.035, 0.008, lw, 0, 0, 0);
      rail.quaternion.copy(q);
      rail.position.copy(top).add(bottom).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, dz));
      ladderGroup.add(rail);
    }
    for (let k = 1; k < 10; k++) {
      const p = top.clone().lerp(bottom, k / 10);
      ladderGroup.add(rbox(0.05, 0.025, 0.4, 0.006, lw, p.x, p.y, p.z));
    }
  }
  const hatchOpen = () => !!g.flag('a.hatch');
  const setHatch = (k: number) => {
    hatchPivot.rotation.z = -k * 1.4;
    cord.visible = k < 0.5;
    ladderGroup.visible = k > 0.95;
  };
  ladderGroup.traverse((o) => (o.userData.noPick = true));
  hatchPivot.traverse((o) => (o.userData.noPick = true));
  scene.add(ladderGroup);
  setHatch(hatchOpen() ? 1 : 0);

  // door to the kitchen (left wall), ajar, a grey light beyond
  const doorZ = 1.25;
  scene.add(mesh(new THREE.PlaneGeometry(0.9, 2.05), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), -W / 2 + 0.012, 1.025, doorZ, false).rotateY(Math.PI / 2));
  const kd = rbox(0.06, 2.05, 0.9, 0.02, woodDark, -W / 2 + 0.35, 1.025, doorZ - 0.32);
  kd.rotation.y = 0.9;
  scene.add(kd);
  for (const dz of [-0.47, 0.47]) scene.add(rbox(0.05, 2.12, 0.06, 0.01, woodDark, -W / 2 + 0.03, 1.06, doorZ + dz));
  const kitchenGlow = new THREE.SpotLight(0xc8d0d8, 3, 4, 0.6, 0.8, 1.5);
  kitchenGlow.position.set(-W / 2 - 0.3, 1.9, doorZ);
  kitchenGlow.target.position.set(-1.2, 0, doorZ);
  scene.add(kitchenGlow, kitchenGlow.target);
  // front door behind the player
  scene.add(rbox(0.95, 2.1, 0.06, 0.02, woodDark, -0.9, 1.05, D / 2 - 0.04));

  // ---------------- hotspots ----------------
  const hTv = hitBox(0.8, 0.7, 0.6, tvX, 0.95, tvZ + 0.1, 'tv');
  const hSofa = hitBox(1.8, 0.9, 0.9, -0.7, 0.45, 0.55, 'sofa');
  const hRocker = hitBox(0.8, 1.1, 0.9, -1.85, 0.55, -0.55, 'rocker');
  const hWheel = hitBox(0.8, 1.0, 0.8, 1.85, 0.5, -1.55, 'wheelchair');
  const hPhoto = hitBox(0.5, 0.65, 0.15, 1.0, 1.6, -D / 2 + 0.08, 'photo');
  const hHatch = hitBox(1.0, 1.5, 1.0, hatchX, H - 0.8, hatchZ, 'hatch');
  const hKitchen = hitBox(0.2, 2.1, 1.0, -W / 2 + 0.1, 1.05, doorZ, 'kitchen');
  const hRack = hitBox(0.5, 1.8, 0.5, 1.95, 0.9, 1.95, 'rack');
  const hFront = hitBox(1.0, 2.1, 0.2, -0.9, 1.05, D / 2 - 0.1, 'frontdoor');
  scene.add(hTv, hSofa, hRocker, hWheel, hPhoto, hHatch, hKitchen, hRack, hFront);

  const say = (k: string) => g.say(k);
  const ettore = async () => {
    g.set('a.tv');
    g.audio.hush(5);
    g.audio.sfx('whisper');
    for (let i = 0; i <= 25; i++) {
      face = i / 25;
      await sleep(60);
    }
    await g.say([
      { who: 'ettore', key: 'ada.tv1' },
      { who: 'ettore', key: 'ada.tv2' },
      { who: 'ettore', key: 'ada.tv3' },
      { who: 'diego', key: 'ada.tv4' },
    ]);
    g.note('note.trunk');
  };

  const hotspots: Hotspot[] = [
    { id: 'tv', obj: hTv, view: 'tv', tap: async (item) => {
      if (item) return g.nope();
      if (!tvOn) {
        tvOn = true;
        tvLight.intensity = 2.2;
        g.audio.sfx('switch');
        g.audio.sfx('hiss');
        if (!g.flag('a.tvSeen')) {
          g.set('a.tvSeen');
          return say('ada.tvOn');
        }
        return;
      }
      if (g.flag('a.tv')) return say('ada.tvAfter');
      return say('ada.tvSnow');
    } },
    { id: 'sofa', obj: hSofa, view: 'sofa', tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('paper');
      await g.ui.doc(t('ada.guideTitle'), [t('ada.guide1'), t('ada.guide2'), t('ada.guide3'), t('ada.guide4'), t('ada.guide5')].join('\n'));
      g.note('note.channel');
    } },
    { id: 'rocker', obj: hRocker, view: 'rocker', tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('glasses')) return say('ada.rockerAfter');
      return say('ada.rocker');
    } },
    { id: 'wheelchair', obj: hWheel, tap: async (item) => {
      if (item) return g.nope();
      if (g.flag('glasses') && !g.flag('placedGlasses')) return g.say([{ who: 'ada', key: 'ada.giveBack' }]);
      return say('ada.wheelchair');
    } },
    { id: 'photo', obj: hPhoto, view: 'photo', tap: async (item) => {
      if (item) return g.nope();
      await g.say([{ who: 'diego', key: 'ada.photo1' }]);
      await g.ui.doc(t('ada.photoBackTitle'), t('ada.photoBack'), true);
      g.note('note.seats');
    } },
    { id: 'hatch', obj: hHatch, view: 'hatch', tap: async (item) => {
      if (hatchOpen()) {
        if (item) return g.nope();
        g.audio.steps(5, 0.4, false);
        return g.go('ada_soffitta');
      }
      if (item === 'crutch') {
        g.deselect();
        g.take('crutch');
        g.set('a.hatch');
        g.audio.sfx('creak');
        for (let i = 0; i <= 20; i++) {
          setHatch(i / 20);
          await sleep(30);
        }
        g.audio.rec('chains', { gain: 0.6, dur: 2 });
        g.audio.sfx('thud');
        setHatch(1);
        g.engine.shake(0.03, 0.4);
        return say('ada.hatchOpen');
      }
      if (item) return g.nope();
      return say('ada.hatchHigh');
    } },
    { id: 'kitchen', obj: hKitchen, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('ada_cucina');
    } },
    { id: 'rack', obj: hRack, tap: async (item) => {
      if (item) return g.nope();
      return say('ada.rack');
    } },
    { id: 'frontdoor', obj: hFront, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return g.back();
    } },
  ];

  // ---------------- direct manipulation: the channel knob ----------------
  let knobAcc = 0;
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: knob,
      center: knob.getWorldPosition(new THREE.Vector3()),
      when: () => g.viewName === 'tv' && tvOn,
      onTurn: (d) => {
        knobAngle += d;
        knob.rotation.z = -knobAngle;
        knobAcc += d;
        const step = (Math.PI * 2) / 12;
        while (knobAcc > step) { knobAcc -= step; channel = (channel % 12) + 1; g.audio.sfx('click'); }
        while (knobAcc < -step) { knobAcc += step; channel = ((channel + 10) % 12) + 1; g.audio.sfx('click'); }
      },
      onEnd: async () => {
        g.set('a.channel', channel);
        if (channel === TV_CHANNEL && !g.flag('a.tv')) await ettore();
        else if (channel !== TV_CHANNEL) face = 0;
        else face = 1;
      },
    },
  ];
  // the knob's world centre is only known once the group is in place
  scene.updateMatrixWorld(true);
  (interactions[0] as { center: THREE.Vector3 }).center = knob.getWorldPosition(new THREE.Vector3());

  let rockAmp = g.flag('glasses') && !g.flag('placedGlasses') ? 0.22 : 0.05;
  let nextKick = 6;
  return {
    id: 'ada_soggiorno',
    nameKey: 'place.adaSoggiorno',
    next: ['ada_cucina', 'ada_soffitta'],
    scene,
    drone: 'emporio',
    startView: 'main',
    views: {
      main: { pos: [1.7, 1.6, 1.85], look: [-0.9, 0.95, -1.3], yaw: 60, pitch: 18 },
      tv: { pos: [tvX, 1.15, tvZ + 1.05], look: [tvX, 0.95, tvZ], parent: 'main', yaw: 20, pitch: 10, fov: 55 },
      sofa: { pos: [-0.2, 1.45, 1.5], look: [-0.4, 0.45, 0.4], parent: 'main', yaw: 25, pitch: 12 },
      rocker: { pos: [-0.5, 1.4, 0.6], look: [-1.85, 0.7, -0.55], parent: 'main', yaw: 25, pitch: 12 },
      photo: { pos: [1.0, 1.6, -1.1], look: [1.0, 1.6, -D / 2], parent: 'main', yaw: 15, pitch: 8, fov: 50 },
      hatch: { pos: [0.4, 1.5, 1.1], look: [hatchX, 2.3, hatchZ], parent: 'main', yaw: 20, pitch: 15 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      // the rocking chair: a slow creak, and now and then a push from someone who isn't there
      nextKick -= dt;
      if (nextKick < 0) {
        nextKick = 9 + Math.random() * 10;
        rockAmp = Math.max(rockAmp, 0.12);
        g.audio.sfx('creak');
      }
      rockAmp = Math.max(rockAmp * Math.exp(-dt * 0.2), g.flag('glasses') && !g.flag('placedGlasses') ? 0.18 : 0.03);
      if (rocker) rocker.rotation.x = Math.sin(time * 2) * rockAmp;
      if (tvOn) {
        drawScreen(time);
        tvLight.intensity = 1.6 + Math.random() * 1.2;
      }
      if (ada.group.visible) ada.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('a.entered')) {
        g.set('a.entered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'ada.enter1' }, { who: 'diego', key: 'ada.enter2' }]);
      } else if (g.flag('glasses') && !g.flag('placedGlasses') && !g.flag('a.wheelSeen')) {
        // she is waiting for you downstairs
        g.set('a.wheelSeen');
        wheelGroup.rotation.y = -2.3;
        await sleep(400);
        g.audio.hush(4);
        for (let i = 0; i <= 20; i++) {
          ada.setOpacity((i / 20) * 0.75);
          await sleep(50);
        }
        await g.say([{ who: 'ada', key: 'ada.giveBack' }, { who: 'diego', key: 'ada.sorry' }]);
        for (let i = 20; i >= 0; i--) {
          ada.setOpacity((i / 20) * 0.75);
          await sleep(40);
        }
      }
    },
    hint: () => {
      if (g.flag('glasses')) return 'hint.ada.leave';
      if (!g.flag('a.tv')) return g.flag('a.tvSeen') ? 'hint.ada.channel' : 'hint.ada.tv';
      if (!g.has('crutch') && !hatchOpen()) return 'hint.ada.kitchen';
      if (!hatchOpen()) return 'hint.ada.hatch';
      return 'hint.ada.attic';
    },
    debug: { knob, getChannel: () => channel, setChannel: (c: number) => (channel = c) },
  };
}
