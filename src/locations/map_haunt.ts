import * as THREE from 'three';
import type { Game } from '../game';
import { canvasTex, fx } from '../builders';
import { prop } from '../models';
import { createLisa, createMerchant } from '../characters';

/**
 * Things that happen on the square while you look at the map: shadows of people who aren't
 * there sliding across the cobbles, a pale girl at the edge of a building who is gone when you
 * look again, crows, fog creeping between the houses, the man in black watching from the church.
 */
/**
 * Canvas fog fades to transparent, and the canvas keeps its pixels premultiplied: on upload the
 * faintest ones come back dark, and with mipmaps they pile up into black blotches (iPhone).
 * Repaint every pixel in one flat fog colour, keeping only the alpha.
 */
function soft(t: THREE.CanvasTexture) {
  // keep only the alpha, as an opaque grey picture: used as an alphaMap over a flat fog colour,
  // nothing premultiplied can come back dark (the old black blotches on the iPhone)
  const src = t.image as HTMLCanvasElement;
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const a = src.getContext('2d')!.getImageData(0, 0, src.width, src.height);
  const d = a.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i + 3];
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  cv.getContext('2d')!.putImageData(a, 0, 0);
  const out = new THREE.CanvasTexture(cv);
  out.colorSpace = THREE.NoColorSpace;
  out.wrapS = t.wrapS;
  out.wrapT = t.wrapT;
  t.dispose();
  return out;
}
/** the flat colour of all the fog on the square */
const FOG = 0xd6d7d5;

export function createHaunts(scene: THREE.Scene, g: Game) {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const updaters: ((dt: number, t: number) => void)[] = [];

  // ---------------- shadows crossing the square ----------------
  const shadowTex = canvasTex(128, 256, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h * 0.62, 4, w / 2, h * 0.62, w * 0.45);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.save();
    c.translate(w / 2, h * 0.62);
    c.scale(0.55, 1.6);
    c.beginPath();
    c.arc(0, 0, w * 0.45, 0, Math.PI * 2);
    c.fill();
    c.restore();
    // the head
    const hg = c.createRadialGradient(w / 2, h * 0.14, 2, w / 2, h * 0.14, 22);
    hg.addColorStop(0, 'rgba(0,0,0,0.95)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hg;
    c.fillRect(0, 0, w, h * 0.3);
  });
  // (off: seen from above, under the fog, they only read as two black blotches)
  const shadows = ([] as number[]).map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.0), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.04;
    m.renderOrder = 2;
    fx(m);
    m.userData.noPick = true;
    scene.add(m);
    return { m, t: 0, dur: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), next: rnd(4, 12) };
  });
  updaters.push((dt) => {
    for (const s of shadows) {
      if (s.dur === 0) {
        s.next -= dt;
        if (s.next > 0) continue;
        const a = rnd(0, Math.PI * 2);
        s.from.set(Math.cos(a) * 9, 0.04, Math.sin(a) * 7);
        s.to.set(-Math.cos(a + rnd(-0.6, 0.6)) * 9, 0.04, -Math.sin(a + rnd(-0.6, 0.6)) * 7);
        s.dur = rnd(5, 9);
        s.t = 0;
        s.m.rotation.z = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
      }
      s.t += dt / s.dur;
      const k = Math.min(s.t, 1);
      s.m.position.lerpVectors(s.from, s.to, k);
      // a long stride: the shadow stretches and shrinks a little as it walks
      s.m.scale.y = 1 + Math.sin(k * Math.PI * 12) * 0.06;
      (s.m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.sin(k * Math.PI) * 1.4) * 0.75;
      if (s.t >= 1) {
        s.dur = 0;
        s.next = rnd(8, 20);
      }
    }
  });

  // ---------------- the pale girl ----------------
  const spots: [number, number, number][] = [
    [-4.6, -4.2, 0.6], [4.6, -4.6, -0.5], [-8.2, 0.8, 1.4], [8.2, 0.4, -1.4], [-2.6, 7.2, 2.8], [2.8, 7.4, -2.8], [0, -10.4, 0], [1.6, -1.4, 0.3],
  ];
  const lisa = createLisa(0);
  lisa.group.traverse((o) => (o.userData.noPick = true));
  lisa.group.visible = false;
  lisa.group.scale.setScalar(2.0);
  scene.add(lisa.group);
  let lisaT = -1, lisaNext = rnd(6, 12), lisaSpot = 0;
  updaters.push((dt, t) => {
    if (lisaT < 0) {
      lisaNext -= dt;
      if (lisaNext > 0) return;
      lisaSpot = (lisaSpot + 1 + Math.floor(Math.random() * (spots.length - 1))) % spots.length;
      const [x, z, ry] = spots[lisaSpot];
      lisa.group.position.set(x, 0, z);
      lisa.group.rotation.y = ry;
      lisa.group.visible = true;
      lisaT = 0;
      if (!g.audio.rec('ghostmove', { gain: 0.5, dur: 5 })) g.audio.sfx('whisper');
    }
    lisaT += dt;
    // fade in, stand still, and vanish all at once (with a flicker)
    const op = lisaT < 1.6 ? lisaT / 1.6 : lisaT < 4.5 ? 1 : lisaT < 4.9 ? (Math.random() < 0.5 ? 1 : 0.1) : 0;
    lisa.setOpacity(op * 0.85);
    lisa.update(dt, t, g.engine.camera);
    if (lisaT > 4.9) {
      lisa.group.visible = false;
      lisaT = -1;
      lisaNext = rnd(14, 26);
    }
  });

  // ---------------- crows ----------------
  const crowMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(0.55, 0.05, 0.05), new THREE.Vector3(0, 0, 0.18)]);
  const crows = Array.from({ length: 7 }, () => {
    const c = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, crowMat), r = new THREE.Mesh(wingGeo, crowMat);
    r.scale.x = -1;
    c.add(l, r, new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), crowMat));
    c.visible = false;
    c.traverse((o) => (o.userData.noPick = true));
    scene.add(c);
    return { c, l, r, off: new THREE.Vector3(rnd(-2, 2), rnd(-0.8, 0.8), rnd(-2, 2)), ph: rnd(0, 6) };
  });
  let flockT = -1, flockNext = rnd(10, 18);
  const fFrom = new THREE.Vector3(), fTo = new THREE.Vector3();
  updaters.push((dt, t) => {
    if (flockT < 0) {
      flockNext -= dt;
      if (flockNext > 0) return;
      const a = rnd(0, Math.PI * 2);
      fFrom.set(Math.cos(a) * 22, rnd(7, 10), Math.sin(a) * 18);
      fTo.set(-Math.cos(a) * 22, rnd(7, 11), -Math.sin(a) * 18);
      flockT = 0;
      crows.forEach((k) => (k.c.visible = true));
    }
    flockT += dt / 7;
    const p = new THREE.Vector3().lerpVectors(fFrom, fTo, flockT);
    const heading = Math.atan2(fTo.x - fFrom.x, fTo.z - fFrom.z);
    for (const k of crows) {
      k.c.position.copy(p).add(k.off).add(new THREE.Vector3(0, Math.sin(t * 2 + k.ph) * 0.3, 0));
      k.c.rotation.y = heading;
      const flap = Math.sin(t * 14 + k.ph) * 0.7;
      k.l.rotation.z = flap;
      k.r.rotation.z = -flap;
    }
    if (flockT >= 1) {
      flockT = -1;
      flockNext = rnd(20, 35);
      crows.forEach((k) => (k.c.visible = false));
    }
  });

  // ---------------- fog creeping between the houses ----------------
  const fogTex = soft(canvasTex(256, 256, (c, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = rnd(40, w - 40), y = rnd(40, h - 40), r = rnd(25, 60);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(225,225,220,0.16)');
      gr.addColorStop(1, 'rgba(225,225,220,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
  }));
  const fogs = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: FOG, alphaMap: fogTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(rnd(-12, 12), 0.3 + i * 0.12, rnd(-10, 10));
    fx(m);
    m.userData.noPick = true;
    m.userData.v = new THREE.Vector2(rnd(-0.35, 0.35), rnd(-0.25, 0.25));
    scene.add(m);
    return m;
  });
  updaters.push((dt, t) => {
    for (const m of fogs) {
      m.position.x += m.userData.v.x * dt;
      m.position.z += m.userData.v.y * dt;
      if (Math.abs(m.position.x) > 16) m.position.x *= -0.95;
      if (Math.abs(m.position.z) > 13) m.position.z *= -0.95;
      m.rotation.z += dt * 0.02;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 0.3 + m.position.x) * 0.15;
    }
  });

  // ---------------- the man in black, by the church ----------------
  const watcher = createMerchant({ y: 0.9, z: 0.35, spread: 0.3 });
  watcher.group.traverse((o) => (o.userData.noPick = true));
  watcher.group.position.set(-2.0, 0, -9.6);
  watcher.group.scale.setScalar(1.7);
  watcher.group.visible = false;
  scene.add(watcher.group);
  let wAcc = 0;
  updaters.push((dt, t) => {
    wAcc += dt;
    const show = !!g.flag('metMerchant') && wAcc % 31 > 26;
    if (show && !watcher.group.visible && !g.audio.rec('possessed', { gain: 0.35, dur: 5 })) g.audio.sfx('breath');
    watcher.group.visible = show;
    if (show) watcher.update(dt, t, g.engine.camera);
  });

  // ---------------- an empty wheelchair that rolls a little by itself ----------------
  const chair = prop('wheelchair', { height: 0.95 });
  if (chair) {
    chair.traverse((o) => (o.userData.noPick = true));
    const base = new THREE.Vector3(2.6, 0, 5.6);
    chair.position.copy(base);
    chair.rotation.y = -2.5;
    scene.add(chair);
    let roll = 0, next = rnd(10, 20);
    updaters.push((dt) => {
      next -= dt;
      if (next < 0 && roll <= 0) {
        roll = 3;
        next = rnd(25, 40);
        g.audio.sfx('creak');
      }
      if (roll > 0) {
        roll -= dt;
        // creeping forward towards the fountain, then back next time
        const dir = new THREE.Vector3(Math.sin(chair.rotation.y), 0, Math.cos(chair.rotation.y));
        chair.position.addScaledVector(dir, dt * 0.25);
        if (chair.position.distanceTo(base) > 2) chair.rotation.y += Math.PI;
      }
    });
  }
  const bin = prop('trashCan', { height: 0.9 });
  if (bin) {
    bin.traverse((o) => (o.userData.noPick = true));
    bin.position.set(6.2, 0, -3.4);
    bin.rotation.y = 0.4;
    scene.add(bin);
  }
  // the church bell, now and then, one toll
  let bellNext = rnd(15, 25);
  updaters.push((dt) => {
    bellNext -= dt;
    if (bellNext < 0) {
      bellNext = rnd(40, 70);
      g.audio.rec('bell', { gain: 0.45 });
    }
  });

  // ---------------- a wall of fog all round the village, always moving ----------------
  // tall soft billboards on a ring beyond the houses: they turn to face you and drift sideways
  const wallTex = soft(canvasTex(256, 256, (c, w, h) => {
    for (let i = 0; i < 70; i++) {
      const x = rnd(20, w - 20), y = rnd(h * 0.25, h - 10), r = rnd(30, 70);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(170,172,172,0.11)');
      gr.addColorStop(1, 'rgba(210,212,210,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
    // fade out at the top and the sides
    const fade = c.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.45, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = fade;
    c.fillRect(0, 0, w, h);
    const side = c.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)');
    side.addColorStop(0.2, 'rgba(0,0,0,0)');
    side.addColorStop(0.8, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = side;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }));
  const wall = Array.from({ length: 26 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(14, 19), rnd(5, 7.5)), new THREE.MeshBasicMaterial({ color: FOG, alphaMap: wallTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    fx(m);
    m.userData.noPick = true;
    m.userData.a = (i / 26) * Math.PI * 2 + rnd(-0.1, 0.1);
    m.userData.r = rnd(19, 25);
    m.userData.speed = rnd(0.008, 0.02) * (i % 2 ? 1 : -1);
    m.userData.ph = rnd(0, 6);
    scene.add(m);
    return m;
  });
  const camPos = new THREE.Vector3();
  updaters.push((dt, t) => {
    g.engine.camera.getWorldPosition(camPos);
    for (const m of wall) {
      m.userData.a += m.userData.speed * dt;
      const r = m.userData.r + Math.sin(t * 0.13 + m.userData.ph) * 1.5;
      m.position.set(Math.cos(m.userData.a) * r, 2.2, Math.sin(m.userData.a) * r * 0.85);
      m.lookAt(camPos.x, 2.2, camPos.z);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 0.21 + m.userData.ph) * 0.12;
    }
  });

  // ---------------- crows always circling the bell tower ----------------
  const ring = Array.from({ length: 5 }, (_, i) => {
    const c = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, crowMat), r = new THREE.Mesh(wingGeo, crowMat);
    r.scale.x = -1;
    c.add(l, r, new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), crowMat));
    c.scale.setScalar(0.8);
    c.traverse((o) => (o.userData.noPick = true));
    scene.add(c);
    return { c, l, r, a: (i / 5) * Math.PI * 2, rad: rnd(2.2, 3.6), h: rnd(9.5, 12), sp: rnd(0.35, 0.55), ph: rnd(0, 6) };
  });
  updaters.push((dt, t) => {
    for (const k of ring) {
      k.a += k.sp * dt;
      k.c.position.set(Math.cos(k.a) * k.rad, k.h + Math.sin(t * 0.8 + k.ph) * 0.4, -13 + Math.sin(k.a) * k.rad);
      k.c.rotation.y = -k.a;
      const flap = Math.sin(t * 9 + k.ph) * (Math.sin(t * 0.7 + k.ph) > 0.3 ? 0.1 : 0.6); // glide, then flap
      k.l.rotation.z = flap;
      k.r.rotation.z = -flap;
    }
  });

  // ---------------- bats, now and then, a quick flurry over the roofs ----------------
  const batMat = new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.DoubleSide });
  const batWing = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0.12, 0.02, -0.1), new THREE.Vector3(0.3, 0, 0), new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0.3, 0, 0), new THREE.Vector3(0, 0, 0.08)]);
  const bats = Array.from({ length: 9 }, () => {
    const c = new THREE.Group();
    const l = new THREE.Mesh(batWing, batMat), r = new THREE.Mesh(batWing, batMat);
    r.scale.x = -1;
    c.add(l, r, new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), batMat));
    c.visible = false;
    c.traverse((o) => (o.userData.noPick = true));
    scene.add(c);
    return { c, l, r, off: new THREE.Vector3(rnd(-1.5, 1.5), rnd(-0.6, 0.6), rnd(-1.5, 1.5)), ph: rnd(0, 6) };
  });
  let batT = -1, batNext = rnd(6, 12);
  const bFrom = new THREE.Vector3(), bTo = new THREE.Vector3(), bTmp = new THREE.Vector3();
  updaters.push((dt, t) => {
    if (batT < 0) {
      batNext -= dt;
      if (batNext > 0) return;
      const a = rnd(0, Math.PI * 2);
      bFrom.set(Math.cos(a) * 14, rnd(4, 6), Math.sin(a) * 12);
      bTo.set(-Math.cos(a + 0.6) * 14, rnd(5, 8), -Math.sin(a + 0.6) * 12);
      batT = 0;
      bats.forEach((k) => (k.c.visible = true));
    }
    batT += dt / 3.5;
    bTmp.lerpVectors(bFrom, bTo, batT);
    const heading = Math.atan2(bTo.x - bFrom.x, bTo.z - bFrom.z);
    for (const k of bats) {
      // erratic, the way bats fly
      k.c.position.copy(bTmp).add(k.off).add(new THREE.Vector3(Math.sin(t * 7 + k.ph) * 0.4, Math.sin(t * 11 + k.ph) * 0.3, Math.cos(t * 6 + k.ph) * 0.4));
      k.c.rotation.y = heading + Math.sin(t * 5 + k.ph) * 0.5;
      const flap = Math.sin(t * 30 + k.ph) * 0.9;
      k.l.rotation.z = flap;
      k.r.rotation.z = -flap;
    }
    if (batT >= 1) {
      batT = -1;
      batNext = rnd(14, 26);
      bats.forEach((k) => (k.c.visible = false));
    }
  });

  // ---------------- pale figures walking in the fog, at the edge of the village ----------------
  const figTex = soft(canvasTex(128, 256, (c, w, h) => {
    const body = c.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.5);
    body.addColorStop(0, 'rgba(230,232,235,0.55)');
    body.addColorStop(1, 'rgba(230,232,235,0)');
    c.save();
    c.translate(w / 2, h * 0.6);
    c.scale(0.45, 1.5);
    c.fillStyle = body;
    c.beginPath();
    c.arc(0, 0, w * 0.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
    const head = c.createRadialGradient(w / 2, h * 0.15, 2, w / 2, h * 0.15, 20);
    head.addColorStop(0, 'rgba(235,236,238,0.6)');
    head.addColorStop(1, 'rgba(235,236,238,0)');
    c.fillStyle = head;
    c.fillRect(0, 0, w, h * 0.3);
  }));
  const walkers = Array.from({ length: 3 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xe6e8eb, alphaMap: figTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    sp.scale.set(1.1, 2.2, 1);
    sp.userData.noPick = true;
    scene.add(sp);
    return { sp, a: rnd(0, Math.PI * 2), dir: i % 2 ? 1 : -1, life: -rnd(2, 15), r: rnd(15.5, 18) };
  });
  updaters.push((dt, t) => {
    for (const w of walkers) {
      w.life += dt;
      if (w.life < 0) {
        w.sp.visible = false;
        continue;
      }
      w.sp.visible = true;
      w.a += w.dir * dt * 0.025;
      w.sp.position.set(Math.cos(w.a) * w.r, 1.1 + Math.sin(t * 2 + w.a) * 0.03, Math.sin(w.a) * w.r * 0.85);
      // fade in, walk a while, fade out; then somewhere else, later
      const k = Math.min(1, w.life / 3) * Math.min(1, Math.max(0, (18 - w.life) / 3));
      (w.sp.material as THREE.SpriteMaterial).opacity = k * 0.5;
      if (w.life > 18) {
        w.life = -rnd(8, 20);
        w.a = rnd(0, Math.PI * 2);
        w.r = rnd(15.5, 18);
      }
    }
  });

  return (dt: number, t: number) => updaters.forEach((u) => u(dt, t));
}
