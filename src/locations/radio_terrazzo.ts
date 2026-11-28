import * as THREE from 'three';
import { Game, Location, Hotspot, Interaction } from '../game';
import { rbox, mesh, textPlane, hitBox, woodMaterial, plasterMaterial, mat, cyl, cursedMat, liveCanvas, handwheel } from '../builders';
import { figureGhost } from '../characters';
import { prop } from '../models';
import { t } from '../i18n';
import { radioHint } from './radio_negozio';
import { valveRadio, ether, beacon, sleep, FREQ_OK, FREQ_START, SK } from './radio_common';

/**
 * The roof: the antenna, and Nello's station in the shack. With the red transistor the man in
 * black sold him he could hear everyone in the village; up here, every night, he tried to hear the
 * one voice above all of them: the Supreme. Put the valve back, decode the beacon (7045) and tune
 * the separate tuner to it; the voice says «higher»: crank the antenna up until it points at the
 * sky. The Supreme answers, and will not let him go. Only then the telegraph key works: key
 * «fine trasmissione» and close the transmission once and for all, so that he can rest.
 */
const MAST: [number, number] = [-0.3, -0.6];
const TOWER: [number, number] = [-6.5, -9.5];
/** the antenna's elevation: flat at the start, straight up at the sky when it is right */
const ELEV_OK = 1.35;

export function createRadioTerrazzo(g: Game): Location {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090b);
  scene.fog = new THREE.Fog(0x07090b, 8, 26);
  scene.userData.envIntensity = 0.05;
  scene.add(new THREE.AmbientLight(0x9aa8b8, 0.09));
  const moon = new THREE.DirectionalLight(0xb8c6d4, 0.9);
  moon.position.set(4, 8, 3);
  scene.add(moon);
  const concrete = plasterMaterial({ base: '#6a665e', repeat: [4, 4], damp: 1.2 });
  const floor = mesh(new THREE.PlaneGeometry(7, 6), concrete, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // the parapet
  for (const [x, z, w, d] of [[0, -3, 7, 0.2], [-3.5, 0, 0.2, 6], [3.5, 0, 0.2, 6]] as const) scene.add(rbox(w, 0.9, d, 0.02, concrete, x, 0.45, z));
  // the dormer you came out of (front)
  scene.add(rbox(1.4, 1.6, 0.6, 0.02, plasterMaterial({ base: '#7a756a', repeat: [1, 1] }), 0.3, 0.8, 2.7));
  scene.add(mesh(new THREE.PlaneGeometry(0.75, 1.1), new THREE.MeshBasicMaterial({ color: 0x2a2620 }), 0.3, 0.9, 2.39, false).rotateY(Math.PI));

  // ---------------- the village below, and the bell tower ----------------
  const roofM = mat(0x2a2826, { roughness: 1 });
  const wallM = mat(0x3a3834, { roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.3;
    const r = 9 + (i * 37) % 7;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.hypot(x - TOWER[0], z - TOWER[1]) < 3) continue;
    const h = 2 + ((i * 13) % 5) * 0.8;
    const b = rbox(3 + (i % 3), h, 3, 0.05, wallM, x, h / 2 - 3, z);
    b.rotation.y = a;
    scene.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), roofM);
    roof.position.set(x, h - 3 + 0.6, z);
    roof.rotation.y = a + Math.PI / 4;
    scene.add(roof);
  }
  const tower = new THREE.Group();
  const stone = mat(0x55524c, { roughness: 1 });
  tower.add(rbox(2.2, 11, 2.2, 0.05, stone, 0, 2.5, 0));
  tower.add(rbox(2.4, 0.3, 2.4, 0.05, stone, 0, 8.1, 0));
  const belfry = new THREE.Group();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) belfry.add(rbox(0.35, 2.2, 0.35, 0.03, stone, x, 9.3, z));
  belfry.add(mesh(new THREE.ConeGeometry(0.45, 0.6, 16, 1, true), mat(0x2a2620, { metalness: 0.7, side: THREE.DoubleSide }), 0, 9.6, 0));
  belfry.add(rbox(2.4, 0.3, 2.4, 0.05, stone, 0, 10.5, 0));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.6, 4), roofM);
  spire.position.y = 12;
  spire.rotation.y = Math.PI / 4;
  belfry.add(spire);
  tower.add(belfry);
  tower.position.set(TOWER[0], -3, TOWER[1]);
  scene.add(tower);
  // one dim light in the belfry


  // ---------------- the antenna ----------------
  const iron = mat(0x3a3a38, { metalness: 0.8, roughness: 0.5 });
  scene.add(cyl(0.035, 0.045, 3.6, iron, MAST[0], 1.8, MAST[1], 10));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const guy = cyl(0.004, 0.004, 3.4, mat(0x888888), MAST[0] + Math.sin(a) * 0.9, 1.7, MAST[1] + Math.cos(a) * 0.9, 4);
    guy.lookAt(MAST[0], 3.4, MAST[1]);
    guy.rotateX(Math.PI / 2);
    scene.add(guy);
  }
  const yagi = new THREE.Group();
  // aluminium catches the moon: pale against the night sky
  const alu = mat(0xc8c8c0, { metalness: 0.4, roughness: 0.4, emissive: 0x3a3a38 });
  yagi.add(cyl(0.022, 0.022, 2.2, alu, 0, 0, 0, 6).rotateX(Math.PI / 2));
  for (let i = 0; i < 7; i++) {
    const len = 1.0 - i * 0.07;
    yagi.add(cyl(0.014, 0.014, len, alu, 0, 0, 0.95 - i * 0.3, 5).rotateZ(Math.PI / 2));
  }
  // a little arrow, so you can see which end is the front
  yagi.add(mesh(new THREE.ConeGeometry(0.09, 0.26, 8), mat(0xe8e2d4, { emissive: 0x6a6660 }), 0, 0, -1.22).rotateX(-Math.PI / 2));
  yagi.position.set(MAST[0], 3.5, MAST[1]);
  yagi.rotation.order = 'YXZ';
  yagi.rotation.y = -0.96; // side-on to the antenna view, so you can see it tilt
  let antElev = Number(g.flag('rl.elev') ?? -0.3); // starts pointing down at the village
  yagi.rotation.x = antElev;
  scene.add(yagi);
  // the rotator: a hand wheel on the mast, at chest height
  const wheel = handwheel(0.2, mat(0x2a2826, { metalness: 0.7, roughness: 0.4 }));
  wheel.position.set(MAST[0], 1.25, MAST[1] + 0.1);
  wheel.add(hitBox(0.42, 0.42, 0.08, 0, 0, 0.04, 'antGrip'));
  scene.add(wheel);
  const dir = textPlane([t('radio.elevLabel')], 0.3, 0.06, { bg: '#d9cfb6', size: 28, px: 64 });
  dir.position.set(MAST[0], 1.5, MAST[1] + 0.06);
  scene.add(dir);

  // ---------------- the shack: Nello's station ----------------
  const sX = 2.2, sZ = -1.4;
  const woodDark = woodMaterial({ base: '#2a2018' });
  const shack = new THREE.Group();
  shack.add(rbox(1.8, 2.2, 0.06, 0.01, woodDark, 0, 1.1, -0.7));
  shack.add(rbox(0.06, 2.2, 1.4, 0.01, woodDark, 0.9, 1.1, 0));
  shack.add(rbox(0.06, 2.2, 1.4, 0.01, woodDark, -0.9, 1.1, 0));
  shack.add(rbox(2.0, 0.06, 1.6, 0.01, mat(0x1e1c1a), 0, 2.22, 0));
  shack.add(rbox(1.4, 0.04, 0.55, 0.01, woodMaterial({ base: '#4f3d2b' }), 0, 0.78, -0.4));
  shack.position.set(sX, 0, sZ);
  scene.add(shack);
  // a cold light from straight above, when the Supreme answers
  const skyLight = new THREE.SpotLight(0xd8e4ff, 0, 14, 0.5, 0.7, 1.2);
  skyLight.position.set(sX - 0.5, 10, sZ + 0.5);
  skyLight.target.position.set(sX - 0.5, 0, sZ);
  scene.add(skyLight, skyLight.target);
  if (g.flag('rl.contact') && !g.flag('rl.freed')) skyLight.intensity = 2.2;
  const tY = 0.8, tZ = sZ - 0.42;
  const lampIn = new THREE.PointLight(0xffd9a0, g.flag('rl.power') ? 1.4 : 0.2, 3, 1.6);
  lampIn.position.set(sX, 1.9, sZ - 0.2);
  scene.add(lampIn);
  // the receiver, with a lit dial we draw on
  const dial = liveCanvas(256, 96);
  const rx = valveRadio(0.7, 0.4, 0.3, dial.tex);
  rx.position.set(sX - 0.02, tY, tZ - 0.05);
  scene.add(rx);
  // the empty valve socket on top, and the valve when it's back
  scene.add(cyl(0.025, 0.025, 0.01, mat(0x111111), sX + 0.21, tY + 0.405, tZ - 0.12, 10));
  const valve = new THREE.Group();
  valve.add(cyl(0.017, 0.017, 0.07, new THREE.MeshStandardMaterial({ color: 0xbfc8cc, transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 0.035, 0, 12));
  const filament = new THREE.MeshBasicMaterial({ color: 0x3a2010 });
  valve.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6), filament, 0, 0.03, 0, false));
  valve.position.set(sX + 0.21, tY + 0.41, tZ - 0.12);
  scene.add(valve);
  // the tuner: a separate box on the left of the set, with one big knob for the frequency
  const tuner = new THREE.Group();
  tuner.add(rbox(0.22, 0.2, 0.18, 0.01, mat(0x3a3632, { metalness: 0.4, roughness: 0.5 }), 0, 0.1, 0));
  tuner.add(textPlane([t('radio.tunerLabel')], 0.18, 0.035, { bg: '#1e1a16', fg: '#d9cfb6', size: 26, px: 64 }).translateY(0.175).translateZ(0.091));
  tuner.position.set(sX - 0.56, tY + 0.02, tZ + 0.0);
  scene.add(tuner);
  const knob = new THREE.Group();
  knob.add(cyl(0.065, 0.065, 0.035, mat(0x1a1612, { roughness: 0.4 }), 0, 0, 0, 24).rotateX(Math.PI / 2));
  for (let k = 0; k < 12; k++) knob.add(rbox(0.006, 0.012, 0.03, 0.002, mat(0x2a2622), Math.sin((k / 12) * Math.PI * 2) * 0.066, Math.cos((k / 12) * Math.PI * 2) * 0.066, 0));
  knob.add(rbox(0.01, 0.045, 0.01, 0.002, mat(0xcfc8b8), 0, 0.03, 0.019));
  knob.add(hitBox(0.2, 0.2, 0.06, 0, 0, 0.03, 'tuneGrip'));
  knob.position.set(sX - 0.56, tY + 0.1, tZ + 0.11);
  scene.add(knob);
  // the signal lamp: blinks with whatever comes in
  const sigM = new THREE.MeshBasicMaterial({ color: 0x2a2a26 });
  scene.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), sigM, sX + 0.23, tY + 0.32, tZ + 0.105, false));
  // the telegraph key, on its own at the right end of the table
  const key = new THREE.Group();
  const keyModel = prop('telegraph', { height: 0.09, turn: Math.PI / 2 });
  const lever = new THREE.Group();
  if (keyModel) lever.add(keyModel);
  else {
    key.add(rbox(0.12, 0.02, 0.07, 0.004, woodMaterial({ base: '#3a2a1c' }), 0, 0.01, 0));
    lever.add(rbox(0.1, 0.01, 0.015, 0.003, mat(0x9a8a62, { metalness: 0.9, roughness: 0.3 }), 0, 0.03, 0));
    lever.add(cyl(0.012, 0.012, 0.012, mat(0x111111), 0.045, 0.04, 0, 12));
  }
  key.add(lever);
  // a little lamp by the key: dark until the Supreme answers, then lit (the key is live)
  const keyLampM = new THREE.MeshBasicMaterial({ color: 0x2a2a26 });
  key.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), keyLampM, -0.09, 0.02, -0.03, false));
  key.position.set(sX + 0.58, tY + 0.02, tZ + 0.02);
  key.rotation.y = -0.25;
  scene.add(key);
  // the red transistor radio
  const radiolina = new THREE.Group();
  radiolina.add(rbox(0.16, 0.1, 0.045, 0.01, cursedMat(), 0, 0.05, 0));
  radiolina.add(mesh(new THREE.CircleGeometry(0.03, 16), mat(0x2a0a0a), -0.035, 0.05, 0.0235, false));
  radiolina.add(cyl(0.003, 0.003, 0.3, mat(0x9a9a98, { metalness: 1 }), 0.06, 0.2, -0.01, 4).rotateZ(-0.3));
  radiolina.position.set(sX + 0.4, tY + 0.02, tZ + 0.12);
  radiolina.rotation.y = 0.3;
  const taken = () => !!g.flag('radio') || !!g.flag('placedRadio');
  radiolina.visible = !taken();
  scene.add(radiolina);
  // his chair, and him
  // the chair is pushed back against the side wall: he stands now, by the set
  const cX = sX + 0.6, cZ = sZ + 0.25;
  scene.add(rbox(0.42, 0.05, 0.42, 0.01, woodDark, cX, 0.45, cZ));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) scene.add(rbox(0.035, 0.45, 0.035, 0.005, woodDark, cX + x, 0.225, cZ + z));
  scene.add(rbox(0.04, 0.5, 0.42, 0.01, woodDark, cX + 0.2, 0.72, cZ));
  const nello = figureGhost('nello_figura', 1.7);
  nello.group.position.set(sX + 0.62, 0, sZ - 0.25);
  nello.group.rotation.y = -Math.PI / 2 - 0.3;
  nello.group.traverse((o) => (o.userData.noPick = true));
  const freed = () => !!g.flag('rl.freed');
  const contact = () => !!g.flag('rl.contact');
  nello.setOpacity(0.35);
  nello.group.visible = contact() && !freed();
  scene.add(nello.group);

  // ---------------- state ----------------
  const power = () => !!g.flag('rl.power');
  const valveIn = () => !!g.flag('rl.valveIn');
  const tuned = () => !!g.flag('rl.tuned');
  const on = () => power() && valveIn() && !freed();
  valve.visible = valveIn();
  let freq = tuned() ? FREQ_OK : Number(g.flag('rl.freq') ?? FREQ_START);
  const drawDial = () => {
    const c = dial.ctx;
    c.fillStyle = on() ? '#d9cc9e' : '#5a5446';
    c.fillRect(0, 0, 256, 96);
    c.strokeStyle = '#2a2418';
    c.fillStyle = '#2a2418';
    c.font = "14px 'Courier New', monospace";
    c.textAlign = 'center';
    for (let f = 6.9; f <= 7.2001; f += 0.01) {
      const x = 16 + ((f - 6.9) / 0.3) * 224;
      const major = Math.round(f * 100) % 5 === 0;
      c.fillRect(x, 50, 1, major ? 16 : 8);
      if (Math.round(f * 100) % 10 === 0) c.fillText(f.toFixed(1), x, 82);
    }
    c.font = "bold 26px 'Courier New', monospace";
    c.fillText(on() ? freq.toFixed(3) + ' MHz' : '', 128, 34);
    const nx = 16 + ((freq - 6.9) / 0.3) * 224;
    c.fillStyle = '#8e0710';
    c.fillRect(nx - 1, 44, 3, 30);
    dial.update();
  };
  drawDial();
  filament.color.set(on() ? 0xff9a50 : 0x3a2010);

  // the sound: static, Paolo's beacon (only off his frequency), his voice (only on it)
  let eth: ReturnType<typeof ether> | null = null;
  let bea: ReturnType<typeof beacon> | null = null;
  const antOk = () => antElev > ELEV_OK;
  const mix = () => {
    if (!eth) return;
    const dOk = Math.abs(freq - FREQ_OK);
    const dStart = Math.abs(freq - FREQ_START);
    const voice = Math.max(0, 1 - dOk / 0.01) * (contact() ? 1 : antOk() ? 0.8 : 0.35);
    eth.set(0.25 + 0.5 * Math.min(1, dOk / 0.02) * (1 - voice * 0.5), voice);
    bea?.volume(Math.max(0, 1 - dStart / 0.012));
  };
  const startSound = () => {
    if (!on() || eth) return;
    eth = ether(g.audio);
    if (!tuned()) bea = beacon(g.audio, '7045', (k) => sigM.color.set(k ? 0xffd070 : 0x2a2a26));
    mix();
  };
  const stopSound = () => {
    eth?.stop();
    bea?.stop();
    eth = null;
    bea = null;
  };

  // ---------------- the big moments ----------------
  const tunedIn = async () => {
    g.set('rl.tuned');
    freq = FREQ_OK;
    drawDial();
    bea?.stop();
    bea = null;
    sigM.color.set(0xffd070);
    mix();
    g.audio.sfx('whisper');
    await g.say([{ who: 'supremo', key: 'radio.faint1' }, { who: 'supremo', key: 'radio.faint2' }, { who: 'diego', key: 'radio.faint3' }]);
  };
  const makeContact = async () => {
    g.set('rl.contact');
    mix();
    skyLight.intensity = 2.2;
    g.audio.rec('spooky', { gain: 0.6, dur: 6 });
    g.engine.shake(0.03, 1.2);
    await sleep(900);
    g.audio.sfx('hiss');
    await g.glimpse('nello_figura');
    nello.group.visible = true;
    nello.setOpacity(0.35);
    await g.view('station');
    await g.say([
      { who: 'supremo', key: 'radio.contact1' },
      { who: 'nello', key: 'radio.contact2' },
      { who: 'supremo', key: 'radio.contact3' },
      { who: 'nello', key: 'radio.contact4' },
      { who: 'supremo', key: 'radio.contact5' },
      { who: 'nello', key: 'radio.contact6' },
      { who: 'diego', key: 'radio.contact7' },
    ]);
    keyLampM.color.set(0xffd070);
  };
  // a tone for the key
  let keyOsc: { stop: () => void } | null = null;
  const keyTone = (down: boolean) => {
    lever.position.y = down ? -0.006 : 0;
    const ctx = g.audio.ctx;
    if (!ctx) return;
    if (down && !keyOsc) {
      const o = ctx.createOscillator();
      o.frequency.value = 760;
      const gn = ctx.createGain();
      gn.gain.value = 0.06;
      o.connect(gn).connect(g.audio.bus);
      o.start();
      keyOsc = {
        stop: () => {
          gn.gain.setTargetAtTime(0, ctx.currentTime, 0.005);
          setTimeout(() => { try { o.stop(); } catch { /* */ } o.disconnect(); }, 60);
        },
      };
    } else if (!down && keyOsc) {
      keyOsc.stop();
      keyOsc = null;
    }
  };
  const release = async () => {
    g.set('rl.freed');
    stopSound();
    sigM.color.set(0x2a2a26);
    filament.color.set(0x3a2010);
    drawDial();
    keyLampM.color.set(0x2a2a26);
    await g.say([{ who: 'nello', key: 'radio.free1' }, { who: 'supremo', key: 'radio.free2' }, { who: 'nello', key: 'radio.free2b' }]);
    g.audio.sfx('whisper');
    for (let i = 20; i >= 0; i--) {
      nello.setOpacity((i / 20) * 0.35);
      skyLight.intensity = (i / 20) * 2.2;
      await sleep(70);
    }
    nello.group.visible = false;
    await sleep(400);
    await g.say([{ who: 'diego', key: 'radio.free3' }, { who: 'diego', key: 'radio.free4' }]);
  };

  // ---------------- hotspots ----------------
  const hRx = hitBox(0.62, 0.45, 0.35, sX + 0.01, tY + 0.2, tZ - 0.05, 'receiver');
  const hKey = hitBox(0.22, 0.12, 0.18, sX + 0.58, tY + 0.06, tZ + 0.02, 'key');
  const hRadiolina = hitBox(0.2, 0.18, 0.16, sX + 0.4, tY + 0.08, tZ + 0.1, 'radiolina');
  const hTuner = hitBox(0.26, 0.24, 0.22, sX - 0.56, tY + 0.12, tZ, 'tuner');
  const hShack = hitBox(1.8, 2.2, 1.4, sX, 1.1, sZ, 'shack');
  const hMast = hitBox(0.6, 1.0, 0.6, MAST[0], 1.25, MAST[1], 'mast');
  const hTower = hitBox(3, 14, 3, TOWER[0], 3, TOWER[1], 'tower');
  const hBack = hitBox(1.4, 1.6, 0.4, 0.3, 0.8, 2.6, 'back');
  scene.add(hRx, hKey, hRadiolina, hTuner, hShack, hMast, hTower, hBack);
  const say = (k: string) => g.say(k);

  const hotspots: Hotspot[] = [
    { id: 'receiver', obj: hRx, view: 'station', tap: async (item) => {
      if (item === 'valve') {
        g.deselect();
        g.take('valve');
        g.set('rl.valveIn');
        valve.visible = true;
        g.audio.sfx('click');
        if (!power()) return say('radio.valveInNoPower');
        filament.color.set(0xff9a50);
        drawDial();
        g.audio.sfx('hiss');
        await sleep(800);
        startSound();
        return g.say([{ who: 'diego', key: 'radio.valveIn1' }, { who: 'diego', key: 'radio.valveIn2' }]);
      }
      if (item) return g.nope();
      if (freed()) return say('radio.rxAfter');
      if (!valveIn()) {
        g.set('rl.rxSeen');
        return g.say([{ who: 'diego', key: 'radio.rxNoValve1' }, { who: 'diego', key: 'radio.rxNoValve2' }]);
      }
      if (!power()) return say('radio.rxNoPower');
      if (!tuned()) return say('radio.rxBeacon');
      if (!contact()) return say('radio.rxFaint');
      return say('radio.rxContact');
    } },
    { id: 'tuner', obj: hTuner, view: 'station', tap: async (item) => {
      if (item) return g.nope();
      if (!on()) return say('radio.tunerOff');
      return say(tuned() ? 'radio.tunerDone' : 'radio.tunerHow');
    } },
    { id: 'key', obj: hKey, view: 'station', tap: async (item) => {
      if (item) return g.nope();
      if (freed()) return say('radio.keyAfter');
      if (!contact()) return say(tuned() ? 'radio.keyDead' : 'radio.keyBefore');
      const ok = await g.ui.telegraph(t('radio.keyTitle'), SK, keyTone);
      keyTone(false);
      if (!ok) return say('radio.keyNo');
      return release();
    } },
    { id: 'radiolina', obj: hRadiolina, view: 'station', when: () => !taken(), tap: async (item) => {
      if (item) return g.nope();
      if (!freed()) {
        g.audio.sfx('whisper');
        return say(contact() ? 'radio.radiolinaContact' : 'radio.radiolina');
      }
      radiolina.visible = false;
      g.set('radio');
      g.give('radio');
      g.audio.sfx('pickup');
      await g.say([{ who: 'diego', key: 'radio.taken1' }, { who: 'diego', key: 'radio.taken2' }]);
      g.give('towerkey');
      g.set('rl.towerkey');
      g.audio.sfx('unlock');
      await say('radio.towerKey');
      g.rebuild('map');
    } },
    { id: 'shack', obj: hShack, view: 'station', lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say(contact() && !freed() ? 'radio.shackNello' : 'radio.shack');
    } },
    { id: 'mast', obj: hMast, view: 'antenna', tap: async (item) => {
      if (item) return g.nope();
      return say(contact() ? 'radio.mastDone' : 'radio.mast');
    } },
    { id: 'tower', obj: hTower, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      return say('radio.tower');
    } },
    { id: 'back', obj: hBack, lowPriority: true, tap: async (item) => {
      if (item) return g.nope();
      g.audio.steps(3, 0.45, false);
      return g.go('radio_camera');
    } },
  ];

  const interactions: Interaction[] = [
    {
      kind: 'dial',
      obj: knob,
      center: knob.getWorldPosition(new THREE.Vector3()),
      when: () => on() && !tuned() && g.viewName === 'station',
      onTurn: (d) => {
        freq = THREE.MathUtils.clamp(freq + (d / (Math.PI * 2)) * 0.05, 6.9, 7.2);
        knob.rotation.z -= d;
        drawDial();
        mix();
      },
      onEnd: async () => {
        g.set('rl.freq', Math.round(freq * 1000) / 1000);
        if (Math.abs(freq - FREQ_OK) < 0.0025) return tunedIn();
      },
    },
    {
      kind: 'dial',
      obj: wheel,
      center: wheel.getWorldPosition(new THREE.Vector3()),
      when: () => !contact() && g.viewName === 'antenna',
      onTurn: (d) => {
        antElev = THREE.MathUtils.clamp(antElev - d * 0.25, -0.35, Math.PI / 2);
        yagi.rotation.x = antElev;
        wheel.rotation.z -= d;
        mix();
      },
      onEnd: async () => {
        g.set('rl.elev', Math.round(antElev * 100) / 100);
        g.audio.sfx('scrape');
        if (!antOk()) return;
        if (!on() || !tuned()) return say('radio.antNothing');
        return makeContact();
      },
    },
  ];

  return {
    id: 'radio_terrazzo',
    nameKey: 'place.radioTerrazzo',
    next: ['radio_camera'],
    scene,
    drone: 'map',
    startView: 'main',
    exitTo: 'radio_camera',
    exposure: 1.2,
    views: {
      main: { pos: [-0.2, 1.7, 2.1], look: [0.2, 1.8, -2.5], yaw: 70, pitch: 25 },
      station: { pos: [sX, 1.35, sZ + 0.75], look: [sX, tY + 0.15, tZ], parent: 'main', yaw: 25, pitch: 12, fov: 55 },
      antenna: { pos: [MAST[0] + 1.9, 1.6, MAST[1] + 2.7], look: [MAST[0] - 2.2, 3.4, MAST[1] - 3.2], parent: 'main', yaw: 35, pitch: 30, fov: 75 },
    },
    hotspots,
    interactions,
    update: (dt, time) => {
      if (nello.group.visible) nello.update(dt, time, g.engine.camera);
    },
    enter: async () => {
      if (!g.flag('rl.terrace')) {
        g.set('rl.terrace');
        await sleep(300);
        await g.say([{ who: 'diego', key: 'radio.terrace1' }, { who: 'diego', key: 'radio.terrace2' }]);
      }
      startSound();
    },
    leave: () => {
      stopSound();
      keyTone(false);
    },
    hint: () => radioHint(g),
    debug: {
      knob,
      wheel,
      getFreq: () => freq,
      getElev: () => antElev,
      ELEV_OK,
    },
  };
}
