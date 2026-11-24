import * as THREE from 'three';
import { instance, dress, bones, aimAt, turnWorld, saveRest, restore, attachHair, ghostMaterial, hasModel, skinMask } from './models';
import { lathe, rbox, mesh, mat, canvasTex, noise, fx } from './builders';
import type { Character } from './characters';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export const realCharacters = () => hasModel('male') && hasModel('female');

function base(id: 'male' | 'female', scale: number) {
  const g = new THREE.Group();
  const body = instance(id)!;
  body.scale.setScalar(scale);
  g.add(body);
  g.updateMatrixWorld(true);
  const b = bones(body);
  return { g, body, b };
}

const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

/** two-bone arm: elbow towards `elbow`, hand towards `hand` (world points). */
function armTo(b: Record<string, THREE.Bone>, side: 'l' | 'r', elbow: THREE.Vector3, hand: THREE.Vector3) {
  aimAt(b['upperarm_' + side], b['lowerarm_' + side], elbow);
  aimAt(b['lowerarm_' + side], b['hand_' + side], hand);
}
function armDown(b: Record<string, THREE.Bone>, side: 'l' | 'r', out = 0.08, fwd = 0.04, bend = 0.1) {
  const s = wp(b['upperarm_' + side]);
  const sx = side === 'l' ? 1 : -1;
  const len1 = wp(b['lowerarm_' + side]).distanceTo(s);
  const len2 = wp(b['hand_' + side]).distanceTo(wp(b['lowerarm_' + side]));
  const e = s.clone().add(new THREE.Vector3(sx * out, -len1, fwd).setLength(len1));
  armTo(b, side, e, e.clone().add(new THREE.Vector3(sx * out * 0.5, -len2, fwd + bend).setLength(len2)));
}
export const CURL_AXIS = new THREE.Vector3(1, 0, 0);
function curlFingers(b: Record<string, THREE.Bone>, side: 'l' | 'r', amount: number) {
  const q = new THREE.Quaternion();
  for (const f of ['index', 'middle', 'ring', 'pinky'])
    for (const k of ['01', '02', '03']) {
      const bone = b[`${f}_${k}_${side}`];
      if (bone) bone.quaternion.multiply(q.setFromAxisAngle(CURL_AXIS, amount * (k === '01' ? 0.8 : 1)));
    }
  const th = b['thumb_02_' + side];
  if (th) th.quaternion.multiply(q.setFromAxisAngle(CURL_AXIS, amount * 0.5));
}
/** tint the eyebrows that come with the body */
function browColor(root: THREE.Object3D, c: THREE.ColorRepresentation) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && /eyebrow/i.test(m.name)) (m.material as THREE.MeshStandardMaterial).color = new THREE.Color(c);
  });
}
function eyesMaterial(root: THREE.Object3D) {
  let m: THREE.MeshStandardMaterial | null = null;
  root.traverse((o) => {
    const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (mm && /eye/i.test(mm.name) && !/brow/i.test(mm.name)) m = mm;
  });
  return m as THREE.MeshStandardMaterial | null;
}
/** turn the head towards the camera, within limits */
function makeLook(head: THREE.Bone, g: THREE.Group, maxYaw: number, maxPitch: number) {
  let yaw = 0, pitch = 0;
  return (camera: THREE.Camera, k: number, extraTilt = 0) => {
    const h = wp(head);
    const c = camera.getWorldPosition(new THREE.Vector3());
    const local = g.worldToLocal(c.clone()).sub(g.worldToLocal(h.clone()));
    const ty = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -maxYaw, maxYaw);
    const tp = THREE.MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -maxPitch, maxPitch);
    yaw += (ty - yaw) * k;
    pitch += (tp - pitch) * k;
    restore(head);
    const gq = g.getWorldQuaternion(new THREE.Quaternion());
    turnWorld(head, Y.clone().applyQuaternion(gq), yaw);
    turnWorld(head, X.clone().applyQuaternion(gq), pitch);
    if (extraTilt) turnWorld(head, Z.clone().applyQuaternion(gq), extraTilt);
  };
}

// ======================================================================
export function realMerchant(handsAt?: { y: number; z: number; spread: number }): Character {
  const { g, body, b } = base('male', 1.08);
  dress(body, { cloth: '#121212', clothRough: 0.8, puff: 0.014, skinTint: '#e6e1d8', skinBright: 1.08, face: { sockets: 1, grin: 1, gaunt: 1 } });
  browColor(body, 0x1a1a1a);
  const H = handsAt ?? { y: 1.07, z: 0.85, spread: 0.24 };
  // leaning slightly over the counter
  turnWorld(b.spine_02, X, 0.1);
  turnWorld(b.spine_03, X, 0.06);
  for (const side of ['l', 'r'] as const) {
    const sx = side === 'l' ? 1 : -1;
    const s = wp(b['upperarm_' + side]);
    armTo(b, side, new THREE.Vector3(sx * 0.3, s.y - 0.25, s.z + 0.12), new THREE.Vector3(sx * H.spread, H.y + 0.05, H.z - 0.12));
    // palm down on the wood
    turnWorld(b['hand_' + side], new THREE.Vector3(0, 0, 1), sx * 0.2);
    curlFingers(b, side, 0.12);
  }
  saveRest(b);
  // ---- a proper black suit over the body: jacket, lapels, sleeves, shirt and tie ----
  const suitTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#141414';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 9000, 0.06);
    // the faintest pinstripe
    for (let x = 0; x < w; x += 16) {
      c.fillStyle = 'rgba(255,255,255,0.035)';
      c.fillRect(x, 0, 1, h);
    }
  }, [3, 3]);
  const suit = new THREE.MeshStandardMaterial({ map: suitTex, color: 0xffffff, roughness: 0.78, side: THREE.DoubleSide });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.8 });
  const chest = wp(b.spine_03), mid = wp(b.spine_01), neck = wp(b.neck_01), pel = wp(b.pelvis);
  const shL = wp(b.upperarm_l), shR = wp(b.upperarm_r);
  const shoulderW = shL.distanceTo(shR) / 2 + 0.06;
  const jacket = new THREE.Group();
  // body of the jacket: a tapered tube from the shoulders to below the hips, open at the front in a V
  const prof: [number, number][] = [[shoulderW * 0.55, neck.y - 0.02], [shoulderW, shL.y - 0.02], [shoulderW * 0.93, chest.y - 0.1], [shoulderW * 0.8, mid.y], [shoulderW * 0.86, pel.y - 0.12]];
  const ring = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y - mid.y)), 32, Math.PI * 0.07, Math.PI * 1.86);
  const jBody = new THREE.Mesh(ring, suit);
  jBody.scale.z = 0.62;
  jBody.position.set(0, mid.y, mid.z);
  jacket.add(jBody);
  // shirt and tie visible in the V
  const front = mesh(new THREE.PlaneGeometry(0.11, neck.y - mid.y + 0.02), shirt, 0, (neck.y + mid.y) / 2, mid.z + shoulderW * 0.6 * 0.95, false);
  front.rotation.x = -0.12;
  jacket.add(front);
  jacket.add(rbox(0.024, neck.y - mid.y - 0.04, 0.008, 0.004, mat(0x070707, { roughness: 0.35 }), 0, (neck.y + mid.y) / 2 - 0.01, mid.z + shoulderW * 0.6 * 0.95 + 0.006).rotateX(-0.12));
  // lapels: two dark slanted panels framing the V
  for (const sd of [-1, 1]) {
    const lap = rbox(0.07, (neck.y - mid.y) * 0.95, 0.012, 0.005, suit, sd * 0.07, (neck.y + mid.y) / 2, mid.z + shoulderW * 0.6 + 0.004);
    lap.rotation.set(-0.12, 0, sd * 0.32);
    jacket.add(lap);
  }
  // collar of the shirt
  jacket.add(mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.05, 16, 1, true), shirt, 0, neck.y + 0.02, neck.z + 0.005, false));
  g.add(jacket);
  b.spine_02.attach(jacket);
  // sleeves: tubes along the arm bones, wider than the arms underneath
  const sleeve = (a: THREE.Bone, z: THREE.Object3D, r1: number, r2: number) => {
    const p1 = wp(a), p2 = wp(z);
    const len = p1.distanceTo(p2);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 14, 1, true), suit);
    m.position.copy(p1).add(p2).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    g.add(m);
    a.attach(m);
  };
  for (const sd of ['l', 'r'] as const) {
    sleeve(b['upperarm_' + sd], b['lowerarm_' + sd], 0.07, 0.058);
    sleeve(b['lowerarm_' + sd], b['hand_' + sd], 0.058, 0.05);
    // white cuff at the wrist
    const wr = wp(b['hand_' + sd]), el = wp(b['lowerarm_' + sd]);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.03, 14, 1, true), shirt);
    cuff.position.copy(wr).lerp(el, 0.06);
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wr.clone().sub(el).normalize());
    g.add(cuff);
    b['lowerarm_' + sd].attach(cuff);
  }
  // long coat skirt from the waist down
  const coat = lathe([[shoulderW * 0.86, pel.y - 0.1], [0.27, 0.35], [0.3, 0.06], [0.3, 0.04]], suit, 0, 0, pel.z, 28);
  coat.scale.z = 0.7;
  g.add(coat);
  // a tall black top hat, a little too tall, with a dull silk band
  const head = b.Head;
  const hp = wp(head);
  const silk = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.35, metalness: 0.05 });
  const hat = new THREE.Group();
  hat.add(lathe([[0, 0], [0.2, 0], [0.215, 0.006], [0.205, 0.016], [0.118, 0.018], [0, 0.018]], silk, 0, 0, 0, 32)); // brim
  hat.add(lathe([[0.108, 0.012], [0.112, 0.08], [0.118, 0.2], [0.124, 0.26], [0, 0.262]], silk, 0, 0, 0, 32)); // crown, slightly flared
  hat.add(mesh(new THREE.CylinderGeometry(0.113, 0.111, 0.04, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.8, side: THREE.DoubleSide }), 0, 0.04, 0, false)); // band
  hat.position.set(0, hp.y + 0.115, hp.z - 0.01);
  hat.rotation.x = -0.08;
  hat.scale.set(0.93, 1, 0.93);
  g.add(hat);
  head.attach(hat);
  const eyes = eyesMaterial(body);
  const look = makeLook(head, g, 0.8, 0.35);
  let nextTwitch = 6 + Math.random() * 5, twitch = 0;
  // fingers drumming on the wood: a rolling pinky-to-index tap, a pause, again; sometimes he stops
  const drumFingers = ['pinky', 'ring', 'middle', 'index'].map((f) => [b[`${f}_01_l`], b[`${f}_02_l`]] as const).filter(([a]) => a);
  const qTmp = new THREE.Quaternion();
  let drumClock = 0, drumPause = 0;
  g.traverse((o) => (o.castShadow = true));
  return {
    group: g,
    head,
    setEyes: (on) => {
      if (eyes) {
        eyes.emissive = new THREE.Color(0xffffff);
        eyes.emissiveIntensity = on ? 0.35 : 0;
      }
    },
    update: (dt, t, camera) => {
      nextTwitch -= dt;
      if (nextTwitch < 0) {
        twitch = 1;
        nextTwitch = 7 + Math.random() * 8;
      }
      twitch = Math.max(0, twitch - dt * 2.5);
      look(camera, Math.min(dt * 1.2, 1), Math.sin(t * 0.4) * 0.12 + twitch * 0.35);
      restore(b.spine_03);
      turnWorld(b.spine_03, X.clone().applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())), Math.sin(t * 1.1) * 0.015);
      drumClock += dt;
      if (drumPause > 0) drumPause -= dt;
      else if (drumClock > 2.4) {
        drumClock = 0;
        if (Math.random() < 0.18) drumPause = 3 + Math.random() * 3;
      }
      drumFingers.forEach(([b1, b2], i) => {
        restore(b1);
        if (b2) restore(b2);
        // each finger lifts a little and comes down, 90 ms after the one before
        const ph = drumPause > 0 ? -1 : (drumClock - i * 0.09) / 0.2;
        const lift = ph > 0 && ph < 1 ? Math.sin(ph * Math.PI) ** 2 : 0;
        if (lift > 0) {
          b1.quaternion.multiply(qTmp.setFromAxisAngle(CURL_AXIS, -lift * 0.32));
          if (b2) b2.quaternion.multiply(qTmp.setFromAxisAngle(CURL_AXIS, lift * 0.12));
        }
      });
    },
  };
}

// ======================================================================
export function realBruno(): Character {
  const { g, body, b } = base('male', 1.13);
  const stains = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(60,25,20,${0.2 + Math.random() * 0.35})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 22, 0, Math.PI * 2);
      c.fill();
    }
  };
  dress(body, { cloth: '#2c2a27', clothRough: 0.95, puff: 0.022, face: { sockets: 0.8 }, skinTint: '#b3a99c', skinBright: 0.85, bare: /^lowerarm_/, pattern: stains });
  browColor(body, 0x111111);
  attachHair(body, 'beard', 0x2a2724);
  // hunched, head pushed forward, looking from under the brow
  turnWorld(b.spine_01, X, 0.12);
  turnWorld(b.spine_02, X, 0.12);
  turnWorld(b.spine_03, X, 0.1);
  turnWorld(b.neck_01, X, 0.2);
  turnWorld(b.Head, X, -0.25);
  armDown(b, 'l', 0.16, 0.12, 0.15);
  curlFingers(b, 'l', 0.6);
  // right arm hanging, the cleaver along his leg
  armDown(b, 'r', 0.2, 0.1, 0.12);
  curlFingers(b, 'r', 1.1);
  saveRest(b);
  // apron
  const apronTex = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#c9c3b6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 8000, 0.1);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = h * 0.2 + Math.random() * h * 0.8, r = 10 + Math.random() * 45;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(30,10,8,0.85)');
      gr.addColorStop(1, 'rgba(40,14,10,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 18; i++) {
      c.fillStyle = 'rgba(25,8,6,0.7)';
      c.fillRect(Math.random() * w, h * 0.4 + Math.random() * h * 0.4, 2 + Math.random() * 4, 40 + Math.random() * 120);
    }
  });
  const apronM = new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.75, side: THREE.DoubleSide });
  const ch = wp(b.spine_03), pe = wp(b.pelvis);
  const apron = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.2, 0.42 - pe.y), new THREE.Vector2(0.21, -0.05), new THREE.Vector2(0.2, ch.y - pe.y - 0.02), new THREE.Vector2(0.15, ch.y - pe.y + 0.2)], 18, -Math.PI * 0.4, Math.PI * 0.8), apronM);
  apron.position.set(0, pe.y, pe.z + 0.02);
  apron.scale.set(1.05, 1, 0.85);
  g.add(apron);
  b.spine_01.attach(apron);
  // cleaver in the right fist
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 1, roughness: 0.3 });
  const cleaver = new THREE.Group();
  cleaver.add(rbox(0.03, 0.13, 0.025, 0.008, mat(0x1a120c), 0, 0, 0));
  cleaver.add(rbox(0.008, 0.15, 0.28, 0.004, steel, 0, -0.12, 0.09));
  cleaver.add(mesh(new THREE.PlaneGeometry(0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a0806, roughness: 0.2, transparent: true, opacity: 0.8 }), 0.0051, -0.14, 0.1, false).rotateY(Math.PI / 2));
  const hr = wp(b.middle_01_r ?? b.hand_r);
  cleaver.position.copy(hr).add(new THREE.Vector3(-0.01, -0.03, 0.0));
  cleaver.rotation.set(0.15, 0, -0.1);
  g.add(cleaver);
  b.hand_r.attach(cleaver);
  const eyes = eyesMaterial(body);
  const look = makeLook(b.Head, g, 0.5, 0.3);
  let walk = 0;
  g.traverse((o) => (o.castShadow = true));
  return {
    group: g,
    head: b.Head,
    setEyes: (on) => {
      if (eyes) {
        eyes.emissive = new THREE.Color(0xff1010);
        eyes.emissiveIntensity = on ? 3 : 0;
        eyes.color.setScalar(on ? 0.2 : 1);
      }
    },
    update: (dt, t, camera) => {
      const gq = g.getWorldQuaternion(new THREE.Quaternion());
      const ax = X.clone().applyQuaternion(gq), az = Z.clone().applyQuaternion(gq);
      const moving = g.userData.moving ? 1 : 0;
      walk += dt * moving * 4;
      for (const n of ['spine_03', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'spine_01']) restore(b[n]);
      // heavy breathing
      turnWorld(b.spine_03, ax, Math.sin(t * 1.8) * 0.03);
      if (moving) {
        // a lurching, dragging gait
        turnWorld(b.thigh_l, ax, -Math.sin(walk) * 0.45);
        turnWorld(b.thigh_r, ax, Math.sin(walk) * 0.45);
        turnWorld(b.calf_l, ax, Math.max(0, Math.cos(walk)) * 0.5);
        turnWorld(b.calf_r, ax, Math.max(0, -Math.cos(walk)) * 0.5);
        turnWorld(b.spine_01, az, Math.sin(walk) * 0.1);
      }
      look(camera, Math.min(dt * 0.8, 1), Math.sin(t * 0.5) * 0.05);
      turnWorld(b.Head, ax, -0.25);
    },
  };
}

// ======================================================================
export function realLisa(floorY = 0): Character & { setOpacity: (v: number) => void } {
  const { g, body, b } = base('female', 0.86);
  const uniforms = { time: { value: 0 }, opacity: { value: 0 }, floorY: { value: floorY } };
  const ghost = ghostMaterial(uniforms, 0.1);
  // only head, neck, arms and hands of the body show: the nightgown is the rest
  const faceGhost = ghostMaterial(uniforms, 0.3, true);
  body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const n = (m.material as THREE.Material).name;
    if (/superhero/i.test(n)) skinMask(m as THREE.SkinnedMesh, /^(lowerarm|upperarm)_/);
    m.material = /superhero/i.test(n) ? faceGhost : /eye/i.test(n) && !/brow/i.test(n) ? new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }) : ghost;
    m.userData.eyes = /eye/i.test(n) && !/brow/i.test(n);
  });
  const hair = attachHair(body, 'hairLong', 0xffffff);
  hair?.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material = ghost) : null));
  // the eyes are only darkness
  const eyeMeshes: THREE.Mesh[] = [];
  body.traverse((o) => (o.userData.eyes ? eyeMeshes.push(o as THREE.Mesh) : null));
  for (const side of ['l', 'r'] as const) armDown(b, side, 0.06, 0.05, 0.08);
  turnWorld(b.Head, Z, 0.25);
  saveRest(b);
  // nightgown over the body
  const pe = wp(b.pelvis);
  const sh = wp(b.upperarm_l).y;
  const gown = lathe([[0.001, 0.0], [0.3, 0.0], [0.25, 0.3], [0.19, pe.y - 0.05], [0.16, pe.y + 0.1], [0.135, pe.y + 0.2], [0.15, sh - 0.12], [0.14, sh - 0.03], [0.07, sh + 0.02], [0.045, sh + 0.04]], ghost, 0, 0, pe.z, 32);
  gown.scale.z = 0.66;
  g.add(gown);
  fx(g);
  const look = makeLook(b.Head, g, 0.6, 0.3);
  return {
    group: g,
    head: b.Head,
    setEyes: () => {},
    setOpacity: (v: number) => {
      uniforms.opacity.value = v;
      eyeMeshes.forEach((m) => (((m.material as THREE.MeshBasicMaterial).opacity = v)));
    },
    update: (_dt, t, camera) => {
      uniforms.time.value = t;
      g.position.y = Math.sin(t * 1.3) * 0.03;
      gown.rotation.y = Math.sin(t * 0.7) * 0.08;
      look(camera, 0.02, 0.25 + Math.sin(t * 0.6) * 0.05);
    },
  };
}

// ======================================================================
export function realBarberGhost(scare = false): Character & { setOpacity: (v: number) => void } {
  const { g, body, b } = base('male', 1.0);
  const coatSpots = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = 'rgba(90,80,70,0.25)';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 18, 0, Math.PI * 2);
      c.fill();
    }
  };
  dress(body, { cloth: '#e3dfd6', clothRough: 0.8, puff: 0.018, face: { sockets: 1, gaunt: 0.8 }, skinTint: '#e0dad0', skinBright: 0.95, pattern: coatSpots });
  attachHair(body, 'hairParted', 0x8a8680);
  browColor(body, 0x77736d);
  // arms reaching forward, as if to shave someone who isn't there (hanging, for the jumpscare)
  if (scare) for (const side of ['l', 'r'] as const) armDown(b, side, 0.1, 0.05, 0.1);
  else for (const side of ['l', 'r'] as const) {
    const sx = side === 'l' ? 1 : -1;
    const s = wp(b['upperarm_' + side]);
    armTo(b, side, new THREE.Vector3(s.x + sx * 0.04, s.y - 0.18, s.z + 0.2), new THREE.Vector3(sx * 0.1, s.y - 0.02, s.z + 0.5));
    curlFingers(b, side, 0.5);
  }
  turnWorld(b.Head, X, 0.25);
  turnWorld(b.Head, Z, -0.15);
  saveRest(b);
  // coat skirt
  const pe = wp(b.pelvis);
  const coatTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e3dfd6';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 5000, 0.1);
  });
  g.add(lathe([[0.17, pe.y + 0.1], [0.2, pe.y - 0.1], [0.24, 0.55]], new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.8, side: THREE.DoubleSide }), 0, 0, pe.z, 24));
  // the razor
  const razor = rbox(0.015, 0.004, 0.11, 0.002, new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 1, roughness: 0.2 }), 0, 0, 0);
  razor.position.copy(wp(b.hand_r)).add(new THREE.Vector3(0, 0, 0.08));
  g.add(razor);
  b.hand_r.attach(razor);
  const mats: THREE.Material[] = [];
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && !mats.includes(m)) {
      m.transparent = true;
      mats.push(m);
    }
  });
  const eyes = eyesMaterial(body);
  return {
    group: g,
    head: b.Head,
    setEyes: (on) => {
      if (eyes) {
        eyes.emissive = new THREE.Color(0xffffff);
        eyes.emissiveIntensity = on ? 0.5 : 0;
      }
    },
    setOpacity: (v: number) => {
      mats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = v));
      g.visible = v > 0.01;
    },
    update: (_dt, t) => {
      g.position.y = Math.sin(t * 2.1) * 0.005;
      restore(b.Head);
      turnWorld(b.Head, Z.clone().applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())), Math.sin(t * 0.7) * 0.06);
    },
  };
}

// ======================================================================
// Ada: an old widow, long grey hair loose over her face, a nightgown that moves on its own.
// Half there: a pale translucent body with a cold glow at the edges, wisps where her feet should be.
export function realAdaGhost(): Character & { setOpacity: (v: number) => void } {
  const { g, body, b } = base('female', 0.92);
  dress(body, { cloth: '#c9c5bd', clothRough: 0.95, puff: 0.045, skinTint: '#d8dde0', skinBright: 1.0, bare: /^lowerarm_/, face: { sockets: 1, gaunt: 1 } });
  const faceU = body.userData.faceU;
  if (faceU) faceU.uScare.value = 0.55; // dark hollow eyes, veins, the mouth a little open
  browColor(body, 0x8d8983);
  const hair = attachHair(body, 'hairLong', 0xb9b6b0);
  // long grey hair hanging straight down over the face, parted just enough to show one eye
  const strands = canvasTex(256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      let x = Math.random() * w;
      if (Math.abs(x - w * 0.42) < 16 && Math.random() < 0.85) continue; // the parting
      const shade = 150 + Math.random() * 70;
      c.strokeStyle = `rgba(${shade},${shade - 4},${shade - 10},${0.35 + Math.random() * 0.5})`;
      c.lineWidth = 0.8 + Math.random() * 2.2;
      c.beginPath();
      c.moveTo(x, 0);
      const len = h * (0.55 + Math.random() * 0.45);
      c.bezierCurveTo(x + (Math.random() - 0.5) * 20, len * 0.4, x + (Math.random() - 0.5) * 30, len * 0.7, x + (Math.random() - 0.5) * 40, len);
      c.stroke();
    }
  });
  const hairVeil = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.5, 6, 8), new THREE.MeshStandardMaterial({ map: strands, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false }));
  {
    // curve it around the face
    const p = hairVeil.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getX(i) / 0.12, 2) * 0.06);
    hairVeil.geometry.computeVertexNormals();
  }
  const hp0 = wp(b.Head);
  hairVeil.position.set(0, hp0.y - 0.12, hp0.z + 0.11);
  g.add(hairVeil);
  b.Head.attach(hairVeil);
  const veilBase = (hairVeil.geometry.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array;

  // slumped, head hanging forward and to the side, arms reaching
  turnWorld(b.spine_02, X, 0.14);
  turnWorld(b.spine_03, X, 0.1);
  turnWorld(b.neck_01, X, 0.28);
  for (const side of ['l', 'r'] as const) {
    const sx = side === 'l' ? 1 : -1;
    const sh = wp(b['upperarm_' + side]);
    armTo(b, side, new THREE.Vector3(sh.x + sx * 0.05, sh.y - 0.22, sh.z + 0.12), new THREE.Vector3(sh.x - sx * 0.01, sh.y - 0.24, sh.z + 0.42));
    curlFingers(b, side, 0.55);
  }
  turnWorld(b.Head, Z, 0.32);
  saveRest(b);

  // translucent: all body materials fade together
  const solid: THREE.Material[] = [];
  body.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && !solid.includes(m)) {
      m.transparent = true;
      (m as THREE.MeshStandardMaterial).depthWrite = true;
      solid.push(m);
    }
  });
  // a cold fresnel glow over the same skeleton, slightly larger: the ghost's edge
  const uni = { time: { value: 0 }, opacity: { value: 0 }, floorY: { value: 0 } };
  const glow = ghostMaterial(uni, 0.02);
  glow.polygonOffset = true;
  glow.polygonOffsetFactor = -2;
  glow.polygonOffsetUnits = -2;
  body.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh || !/superhero/i.test(((sm.material as THREE.Material).name || '') + 'superhero')) return;
    if (/eye/i.test(sm.name)) return;
    if (/hair|brow/i.test(sm.name + (sm.material as THREE.Material).name)) return;
    const shell = new THREE.SkinnedMesh(sm.geometry, glow);
    shell.bind(sm.skeleton, sm.bindMatrix);
    shell.frustumCulled = false;
    shell.renderOrder = 3;
    sm.parent!.add(shell);
  });
  solid.push(hairVeil.material as THREE.Material);
  if (hair) {
    const hm = (hair as THREE.Mesh).material as THREE.MeshStandardMaterial;
    hm.transparent = true;
    solid.push(hm);
  }

  // the nightgown: long, ragged at the hem, moving as if under water
  const pe = wp(b.pelvis);
  const sh = wp(b.upperarm_l).y;
  const gownTex = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#ddd8ce';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, 8000, 0.12);
    for (let x = 0; x < w; x += 11) {
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(x, 0, 4, h);
    }
    // stains and a torn, see-through hem
    for (let i = 0; i < 14; i++) {
      c.fillStyle = `rgba(80,70,55,${0.1 + Math.random() * 0.2})`;
      c.beginPath();
      c.arc(Math.random() * w, h * 0.5 + Math.random() * h * 0.5, 8 + Math.random() * 30, 0, Math.PI * 2);
      c.fill();
    }
    const gr = c.createLinearGradient(0, h * 0.72, 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) c.fillRect(x, h * (0.8 + Math.random() * 0.2), 4, h);
  });
  gownTex.wrapS = THREE.RepeatWrapping;
  const gownMat = new THREE.MeshStandardMaterial({ map: gownTex, roughness: 0.95, side: THREE.DoubleSide, transparent: true, alphaTest: 0.02, depthWrite: false });
  const prof: [number, number][] = [[0.38, -0.05], [0.32, 0.25], [0.25, pe.y - 0.1], [0.21, pe.y + 0.1], [0.2, pe.y + 0.25], [0.22, sh - 0.14], [0.215, sh - 0.04], [0.12, sh + 0.03], [0.06, sh + 0.06]];
  const gownGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 40, 0, Math.PI * 2);
  // uv.y from the profile order: make the ragged (bottom of the texture) edge sit at the hem
  const uv = gownGeo.attributes.uv as THREE.BufferAttribute;
  const pa = gownGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, THREE.MathUtils.clamp(pa.getY(i) / (sh + 0.04), 0, 1));
  const gown = new THREE.Mesh(gownGeo, gownMat);
  gown.position.set(0, 0, pe.z);
  gown.scale.z = 0.78;
  const base0 = (gownGeo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array;
  g.add(gown);
  solid.push(gownMat);

  const look = makeLook(b.Head, g, 0.5, 0.3);
  let glitch = 0;
  const setOpacity = (v: number) => {
    for (const m of solid) (m as THREE.MeshStandardMaterial).opacity = v * 0.78;
    uni.opacity.value = v;
    g.visible = v > 0.01;
  };
  return {
    group: g,
    head: b.Head,
    setEyes: () => {},
    setOpacity,
    update: (dt, t, camera) => {
      uni.time.value = t;
      // the gown ripples, more towards the hem
      const pos = gownGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = base0[i * 3], y = base0[i * 3 + 1], z = base0[i * 3 + 2];
        const k = Math.max(0, 1 - y / (pe.y + 0.1));
        const a = Math.atan2(z, x);
        const w = Math.sin(a * 5 + t * 1.6 + y * 3) * 0.035 * k + Math.sin(a * 11 - t * 2.3) * 0.012 * k;
        pos.setXYZ(i, x * (1 + w * 3), y + Math.sin(t * 1.1 + a * 3) * 0.01 * k, z * (1 + w * 3));
      }
      pos.needsUpdate = true;
      const vp = hairVeil.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < vp.count; i++) {
        const y = veilBase[i * 3 + 1];
        const k = (0.25 - y) / 0.5;
        vp.setX(i, veilBase[i * 3] + Math.sin(t * 0.8 + y * 9) * 0.012 * k);
      }
      vp.needsUpdate = true;
      // floating, and every so often a jerk, as if a frame of film were missing
      glitch -= dt;
      if (glitch < -2.5 - Math.random() * 4) glitch = 0.12;
      g.position.y = Math.sin(t * 1.3) * 0.03 + (glitch > 0 ? 0.04 : 0);
      g.position.x += glitch > 0 ? (Math.random() - 0.5) * 0.02 : 0;
      look(camera, 0.015, 0.32 + Math.sin(t * 0.5) * 0.06);
      for (const side of ['l', 'r'] as const) {
        restore(b['lowerarm_' + side]);
        turnWorld(b['lowerarm_' + side], X.clone().applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())), Math.sin(t * 0.9 + (side === 'l' ? 0 : 1.7)) * 0.08);
      }
    },
  };
}

/** Ettore, for the television: an old man's face, grey and hollow-eyed, only ever seen through snow. */
export function realEttore() {
  const { g, body, b } = base('male', 1.0);
  dress(body, { cloth: '#3a3632', clothRough: 0.9, skinTint: '#cfd2d2', skinBright: 0.95, face: { sockets: 1, gaunt: 1 } });
  if (body.userData.faceU) body.userData.faceU.uScare.value = 0.35;
  browColor(body, 0x9a968f);
  attachHair(body, 'hairParted', 0x9f9b94);
  saveRest(b);
  const head = b.Head;
  return {
    group: g,
    head,
    /** the head turns slowly towards the viewer, the jaw (well, the head) nods as it speaks */
    update: (t: number, talking: number) => {
      restore(head);
      turnWorld(head, Y, Math.sin(t * 0.4) * 0.12);
      turnWorld(head, X, Math.sin(t * 7) * 0.04 * talking + 0.05);
      turnWorld(head, Z, 0.08 + Math.sin(t * 0.9) * 0.03);
    },
  };
}
