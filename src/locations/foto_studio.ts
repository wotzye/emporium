import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { room, rbox, mesh, dust, textPlane, hitBox, canvasTex, noise, woodMaterial, mat, cyl, lathe } from '../builders';
import { prop } from '../models';
import { createBarberGhost } from '../characters';
import { t } from '../i18n';
import { fotoWall, bellowsCamera, sleep } from './foto_common';

/**
 * The posing studio. Lift the black cloth and look on the ground glass of the bellows camera:
 * upside down, as it always is, there's the studio... and someone standing by the posing chair
 * who isn't in the room. Bring the picture into focus (the brass wheel) and on the backdrop,
 * behind him, there are numbers that only the lens can see: the darkroom code.
 * At the end, with the magnesium flash bulb from upstairs, you take Giulio's last photograph.
 */
export const DARK_CODE = '2704';
const FOCUS_OK = 0.62;
const L_LENS = 3; // layer seen only through the lens

export function createFotoStudio(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4, 11);
  scene.userData.envIntensity = 0.08;
  const W = 5, H = 3.2, D = 5;
  const woodDark = woodMaterial({ base: '#2a1f16' });
  scene.add(room(W, H, D, {
    wall: fotoWall(),
    floor: woodMaterial({ base: '#3a2d21', repeat: [4, 4], plank: true }),
    ceil: woodMaterial({ base: '#26201a', repeat: [2, 2], plank: true }),
  }));
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  // a skylight, grey, high up over the set
  const sky = new THREE.SpotLight(0xc8d0d8, 9, 9, 0.6, 0.8, 1.2);
  sky.position.set(0, H - 0.05, -1.0);
  sky.target.position.set(0, 0, -1.6);
  scene.add(sky, sky.target);
  scene.add(mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: 0x2a3036 }), 0, H - 0.01, -1.0, false).rotateX(Math.PI / 2));
  const motes = dust([-2.3, 0.2, -2.3], [2.3, 2.9, 2.3], 140);
  scene.add(motes.points);

  // ---------------- the painted backdrop and the posing chair ----------------
  const bdTex = canvasTex(512, 384, (c, w, h) => {
    const gr = c.createRadialGradient(w * 0.45, h * 0.4, 20, w / 2, h / 2, w * 0.7);
    gr.addColorStop(0, '#bdb6a8');
    gr.addColorStop(1, '#5a554d');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    // painted clouds and a balustrade, the way studios did it
    c.fillStyle = 'rgba(230,226,218,0.25)';
    for (let i = 0; i < 14; i++) {
      c.beginPath();
      c.ellipse(Math.random() * w, Math.random() * h * 0.6, 40 + Math.random() * 60, 15 + Math.random() * 20, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#6e685e';
    c.fillRect(0, h * 0.78, w, h * 0.04);
    for (let x = 10; x < w; x += 34) c.fillRect(x, h * 0.82, 12, h * 0.18);
    noise(c, w, h, 6000, 0.12);
  });
  const bdZ = -D / 2 + 0.35;
  scene.add(mesh(new THREE.PlaneGeometry(3.0, 2.4), new THREE.MeshStandardMaterial({ map: bdTex, roughness: 1 }), 0, 1.3, bdZ, false));
  scene.add(cyl(0.025, 0.025, 3.2, woodDark, 0, 2.55, bdZ + 0.02, 8).rotateZ(Math.PI / 2));
  for (const x of [-1.55, 1.55]) scene.add(rbox(0.05, 2.6, 0.05, 0.01, woodDark, x, 1.3, bdZ + 0.03));
  // the numbers the lens sees: painted with something the eye can't make out
  const secret = textPlane([DARK_CODE.split('').join(' ')], 1.2, 0.36, { bg: 'transparent', fg: '#f4efe4', size: 62, px: 160, font: "'Bradley Hand', 'Segoe Print', cursive" });
  secret.position.set(0.55, 1.95, bdZ + 0.01);
  secret.traverse((o) => o.layers.set(L_LENS));
  scene.add(secret);
  const chairX = -0.15, chairZ = bdZ + 0.9;
  const chair = prop('woodChair', { height: 0.95 });
  if (chair) {
    chair.position.set(chairX, 0, chairZ);
    chair.rotation.y = Math.PI + 0.2;
    scene.add(chair);
  } else scene.add(rbox(0.45, 0.95, 0.45, 0.02, woodDark, chairX, 0.475, chairZ));
  // a little round table with a vase of paper flowers, for the portraits
  scene.add(cyl(0.22, 0.22, 0.03, woodDark, 0.75, 0.75, chairZ - 0.1, 18));
  scene.add(cyl(0.03, 0.04, 0.74, woodDark, 0.75, 0.37, chairZ - 0.1, 8));
  scene.add(lathe([[0, 0], [0.05, 0], [0.07, 0.08], [0.04, 0.2], [0.05, 0.24], [0, 0.24]], mat(0xd8d2c6, { roughness: 0.3 }), 0.75, 0.77, chairZ - 0.1, 14));

  // ---------------- the studio lamps (unlit: the skylight does the work) ----------------
  for (const s of [-1, 1]) {
    const lampG = new THREE.Group();
    lampG.add(cyl(0.015, 0.015, 1.7, mat(0x2a2826, { metalness: 0.7 }), 0, 0.85, 0, 6));
    for (let i = 0; i < 3; i++) lampG.add(rbox(0.02, 0.02, 0.5, 0.004, mat(0x2a2826), 0, 0.05, 0).rotateY(i * 2.1));
    const shade = lathe([[0.04, 0], [0.22, 0.25], [0.21, 0.26], [0.03, 0.01]], new THREE.MeshStandardMaterial({ color: 0xbfbab0, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), 0, 0, 0, 18);
    shade.rotation.x = Math.PI / 2 + 0.3;
    shade.position.y = 1.75;
    lampG.add(shade);
    lampG.position.set(s * 1.5, 0, chairZ + 1.0);
    lampG.rotation.y = s * -0.6;
    scene.add(lampG);
  }

  // ---------------- the bellows camera, facing the set ----------------
  const camZ = 1.15;
  const bc = bellowsCamera(true);
  bc.group.position.set(-0.1, 0, camZ);
  scene.add(bc.group);
  const clothOff = () => !!g.flag('f.cloth');
  if (clothOff()) {
    bc.cloth.position.set(0.3, 0.05, 0.3);
    bc.cloth.rotation.set(-Math.PI / 2, 0, 0.4);
  }
  const taken = () => !!g.flag('camera') || !!g.flag('placedCamera');
  bc.body.visible = !taken();

  // the ground glass, on the back of the camera: a live picture through the lens, upside down
  const rt = new THREE.WebGLRenderTarget(320, 320);
  const lensCam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  lensCam.layers.enable(L_LENS);
  bc.group.updateMatrixWorld(true);
  const lensWorld = bc.group.localToWorld(bc.lensLocal.clone());
  lensCam.position.copy(lensWorld);
  lensCam.lookAt(chairX + 0.2, 1.3, bdZ);
  let focus = Number(g.flag('f.focus') ?? 0.15);
  const ggMat = new THREE.ShaderMaterial({
    uniforms: { tImg: { value: rt.texture }, blur: { value: 0.02 }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tImg; uniform float blur, time; varying vec2 vUv;
      void main(){
        vec2 uv = 1.0 - vUv; // a ground glass shows the world upside down and back to front
        vec3 c = vec3(0.0);
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) c += texture2D(tImg, uv + vec2(float(x), float(y)) * blur * 0.5).rgb;
        c /= 25.0;
        float l = dot(c, vec3(0.3, 0.59, 0.11));
        // the grain of the glass and its dark corners
        float n = fract(sin(dot(floor(vUv * 300.0), vec2(12.9898, 78.233)) + time) * 43758.5453);
        float v = smoothstep(0.75, 0.3, length(vUv - 0.5));
        gl_FragColor = vec4(vec3(l * 1.25 + (n - 0.5) * 0.06) * v, 1.0);
      }`,
  });
  const gg = mesh(new THREE.PlaneGeometry(0.22, 0.22), ggMat, 0, 0.15, 0.192, false);
  bc.body.add(gg);
  // the brass focusing wheel beside the glass
  const wheel = new THREE.Group();
  wheel.add(cyl(0.04, 0.04, 0.015, new THREE.MeshStandardMaterial({ color: 0x9a8a62, metalness: 1, roughness: 0.35 }), 0, 0, 0, 20).rotateX(Math.PI / 2));
  wheel.add(rbox(0.01, 0.06, 0.008, 0.002, mat(0x2a2622), 0, 0.01, 0.01));
  wheel.add(hitBox(0.12, 0.12, 0.05, 0, 0, 0.02, 'focusGrip'));
  wheel.position.set(0.19, 0.15, 0.19);
  bc.body.add(wheel);

  // the one who stands by the chair: only the lens sees him (until the end)
  const giulio = createBarberGhost(false);
  giulio.group.position.set(chairX + 0.45, 0, chairZ + 0.1);
  giulio.group.rotation.y = 0.2;
  giulio.setOpacity(0.55);
  giulio.group.traverse((o) => {
    o.layers.set(L_LENS);
    o.userData.noPick = true;
  });
  const freed = () => !!g.flag('f.freed');
  // he only stands by the chair once he has asked for his last portrait (upstairs)
  let fading = false;
  const waiting = () => !!g.flag('f.talked') && !freed();
  giulio.group.visible = waiting();
  scene.add(giulio.group);

  // ---------------- the darkroom door (right wall) ----------------
  const darkZ = -0.4;
  scene.add(mesh(new THREE.PlaneGeometry(0.85, 2.05), new THREE.MeshBasicMaterial({ color: 0x030202 }), W / 2 - 0.012, 1.025, darkZ, false).rotateY(-Math.PI / 2));
  const darkPivot = new THREE.Group();
  darkPivot.userData.passThrough = true; // an open door must not stand between you and the doorway
  darkPivot.position.set(W / 2 - 0.04, 0, darkZ + 0.42);
  darkPivot.add(rbox(0.05, 2.0, 0.84, 0.01, woodDark, 0, 1.0, -0.42));
  scene.add(darkPivot);
  const redSign = textPlane([t('foto.darkSign1'), t('foto.darkSign2')], 0.55, 0.22, { bg: '#7a0d0d', fg: '#f0e6d6', size: 24, px: 96 });
  redSign.position.set(W / 2 - 0.075, 1.75, darkZ);
  redSign.rotation.y = -Math.PI / 2;
  scene.add(redSign);
  const darkOpen = () => !!g.flag('f.dark');
  if (darkOpen()) darkPivot.rotation.y = -1.3;
  // the way back, through the curtain (left wall)
  scene.add(mesh(new THREE.PlaneGeometry(1.0, 2.2), new THREE.MeshStandardMaterial({ color: 0x2e1416, roughness: 1, side: THREE.DoubleSide }), -W / 2 + 0.05, 1.1, 1.3, false).rotateY(Math.PI / 2));

  // ---------------- hotspots ----------------
  const hCam = hitBox(0.6, 1.6, 0.7, -0.1, 0.9, camZ, 'camera');
  const hChair = hitBox(0.6, 1.0, 0.6, chairX, 0.5, chairZ, 'chair');
  const hBd = hitBox(3.0, 2.4, 0.2, 0, 1.3, bdZ + 0.05, 'backdrop');
  const hDark = hitBox(0.3, 2.1, 0.95, W / 2 - 0.15, 1.05, darkZ, 'darkroom');
  const hOut = hitBox(0.3, 2.2, 1.1, -W / 2 + 0.15, 1.1, 1.3, 'shop');
  scene.add(hCam, hChair, hBd, hDark, hOut);
  const say = (k: string) => g.say(k);
  const sharp = () => Math.abs(focus - FOCUS_OK) < 0.06;

  const flash = async () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:60;pointer-events:none;transition:opacity 1.4s ease-out;opacity:' + (g.settings.noFlash ? '0.35' : '1');
    document.body.append(d);
    g.audio.sfx('switch');
    g.audio.sfx('thud');
    await sleep(80);
    d.style.opacity = '0';
    await sleep(1500);
    d.remove();
  };

  const lastPortrait = async () => {
    // the flash bulb is in; he stands by the chair, waiting for his picture
    await say('foto.lastReady');
    const ok = await g.physical('shout', 'foto.shoutText');
    if (!ok) return;
    await flash();
    fading = true;
    g.set('f.freed');
    giulio.group.traverse((o) => o.layers.set(0));
    for (let i = 20; i >= 0; i--) {
      giulio.setOpacity((i / 20) * 0.7);
      await sleep(60);
    }
    giulio.group.visible = false;
    fading = false;
    g.audio.sfx('whisper');
    await g.say([{ who: 'giulio', key: 'foto.giulio9' }, { who: 'diego', key: 'foto.freed1' }, { who: 'diego', key: 'foto.freed2' }]);
  };

  // the ground glass itself: in the lens view, tapping it uses the camera (and never zooms you back out)
  const hGlass = hitBox(0.22, 0.24, 0.06, 0, 0.15, 0.2, 'glass');
  bc.body.add(hGlass);
  const camTap = async (item: string | null) => {
      if (!clothOff()) {
        if (item) return g.nope();
        g.set('f.cloth');
        g.audio.sfx('sheet');
        for (let i = 0; i <= 12; i++) {
          bc.cloth.position.lerp(new THREE.Vector3(0.3, 0.05, 0.3), i / 12);
          await sleep(25);
        }
        bc.cloth.rotation.set(-Math.PI / 2, 0, 0.4);
        await g.view('lens');
        return g.say([{ who: 'diego', key: 'foto.lens1' }, { who: 'diego', key: 'foto.lens2' }]);
      }
      if (freed()) {
        if (item) return g.nope();
        bc.body.visible = false;
        g.set('camera');
        g.give('camera');
        g.audio.sfx('pickup');
        return g.say([{ who: 'diego', key: 'foto.taken1' }, { who: 'diego', key: 'foto.taken2' }]);
      }
      if (item === 'flashbulb') {
        if (!sharp()) return say('foto.bulbNotYet');
        g.deselect();
        g.take('flashbulb');
        g.set('f.bulbIn');
        g.audio.sfx('click');
        if (g.viewName !== 'lens') await g.view('lens');
        return lastPortrait();
      }
      if (item) return g.nope();
      if (g.flag('f.bulbIn')) return lastPortrait();
      if (g.viewName !== 'lens') await g.view('lens');
      return say(sharp() ? (waiting() ? 'foto.lensSharpGiulio' : 'foto.lensSharp') : 'foto.lensBlur');
  };
  const hotspots: Hotspot[] = [
    { id: 'camera', obj: hCam, view: 'camera', when: () => !taken() && g.viewName !== 'lens', tap: camTap },
    { id: 'glass', obj: hGlass, when: () => !taken() && g.viewName === 'lens', tap: camTap },
    { id: 'chair', obj: hChair, tap: async (item) => {
      if (item) return g.nope();
      return say(freed() ? 'foto.chairAfter' : 'foto.chair');
    } },
    { id: 'backdrop', obj: hBd, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('foto.backdrop');
    } },
    { id: 'darkroom', exit: () => darkOpen(), obj: hDark, view: 'door', tap: async (item) => {
      if (darkOpen()) {
        if (item) return g.nope();
        g.audio.steps(2, 0.45, false);
        return g.go('foto_oscura');
      }
      if (item) return g.nope();
      const ok = await g.ui.keypad(t('foto.darkLock'), 4, (c) => c === DARK_CODE, () => g.audio.sfx('click'));
      if (!ok) return;
      g.set('f.dark');
      g.audio.sfx('unlock');
      g.audio.sfx('creak');
      for (let i = 0; i <= 20; i++) {
        darkPivot.rotation.y = -(i / 20) * 1.3;
        await sleep(25);
      }
      return say('foto.darkOpen');
    } },
    { id: 'shop', obj: hOut, tap: async (item) => {
      if (item) return g.nope();
      g.audio.sfx('sheet');
      return g.go('foto_negozio');
    } },
  ];

  // ---------------- direct manipulation: the focusing wheel ----------------
  scene.updateMatrixWorld(true);
  let tick = 0;
  let saidSharp = !!g.flag('f.sharpSeen');
  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: wheel,
      center: wheel.getWorldPosition(new THREE.Vector3()),
      when: () => g.viewName === 'lens' && clothOff() && !taken(),
      onTurn: (d) => {
        focus = THREE.MathUtils.clamp(focus + d / (Math.PI * 4), 0, 1);
        wheel.rotation.z += d;
        tick += Math.abs(d);
        if (tick > 0.5) {
          tick = 0;
          g.audio.sfx('click');
        }
      },
      onEnd: async () => {
        g.set('f.focus', Math.round(focus * 100) / 100);
        if (sharp() && !saidSharp) {
          saidSharp = true;
          g.set('f.sharpSeen');
          g.note('note.darkcode');
          g.audio.sfx('whisper');
          await g.say([{ who: 'diego', key: 'foto.sharp1' }, { who: 'diego', key: 'foto.sharp2' }]);
        }
      },
    },
  ];

  return {
    id: 'foto_studio',
    nameKey: 'place.fotoStudio',
    next: ['foto_negozio', ...(darkOpen() ? ['foto_oscura'] : [])],
    scene,
    drone: 'barbiere',
    startView: 'main',
    exitTo: 'foto_negozio',
    views: {
      main: { pos: [1.2, 1.65, 2.2], look: [-0.3, 1.2, -1.2], yaw: 65, pitch: 18 },
      camera: { pos: [0.75, 1.55, camZ + 1.0], look: [-0.1, 1.2, camZ - 0.2], parent: 'main', yaw: 20, pitch: 12 },
      lens: { pos: [-0.1, 1.41, camZ + 0.62], look: [-0.1, 1.39, camZ + 0.18], parent: 'camera', yaw: 8, pitch: 6, fov: 45 },
      door: { pos: [0.9, 1.6, darkZ + 0.4], look: [W / 2, 1.3, darkZ], parent: 'main', yaw: 20, pitch: 12 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      motes.update(dt, time);
      if (!fading) giulio.group.visible = waiting();
      if (giulio.group.visible) giulio.update(dt, time, lensCam);
      ggMat.uniforms.blur.value = Math.abs(focus - FOCUS_OK) * 0.09;
      ggMat.uniforms.time.value = time;
      // only render the lens picture while you're looking at it
      if (g.viewName === 'lens' && clothOff()) {
        const r = g.engine.renderer;
        const prev = r.getRenderTarget();
        gg.visible = false;
        r.setRenderTarget(rt);
        r.render(scene, lensCam);
        r.setRenderTarget(prev);
        gg.visible = true;
      }
    },
    enter: async () => {
      if (!g.flag('f.studioEntered')) {
        g.set('f.studioEntered');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'foto.studio1' }, { who: 'diego', key: 'foto.studio2' }]);
      }
    },
    hint: () => {
      if (g.has('camera')) return 'hint.foto.leave';
      if (freed()) return 'hint.foto.take';
      if (g.has('flashbulb')) return sharp() ? 'hint.foto.bulb' : 'hint.foto.focusAgain';
      if (!clothOff()) return 'hint.foto.cloth';
      if (!g.flag('f.sharpSeen')) return 'hint.foto.focus';
      if (!darkOpen()) return 'hint.foto.code';
      return 'hint.foto.darkroom';
    },
    debug: { wheel, getFocus: () => focus, setFocus: (v: number) => (focus = v) },
  };
}
