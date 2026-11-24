import * as THREE from 'three';
import type { Game } from '../game';
import { canvasTex, fx } from '../builders';
import { createLisa, createMerchant } from '../characters';

/**
 * Things that happen on the square while you look at the map: shadows of people who aren't
 * there sliding across the cobbles, a pale girl at the edge of a building who is gone when you
 * look again, crows, fog creeping between the houses, the man in black watching from the church.
 */
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
  const shadows = [0, 1].map(() => {
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
      g.audio.sfx('whisper');
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
  const fogTex = canvasTex(256, 256, (c, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = rnd(40, w - 40), y = rnd(40, h - 40), r = rnd(25, 60);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(225,225,220,0.16)');
      gr.addColorStop(1, 'rgba(225,225,220,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
  });
  const fogs = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.55 }));
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
    if (show && !watcher.group.visible) g.audio.sfx('breath');
    watcher.group.visible = show;
    if (show) watcher.update(dt, t, g.engine.camera);
  });

  return (dt: number, t: number) => updaters.forEach((u) => u(dt, t));
}
