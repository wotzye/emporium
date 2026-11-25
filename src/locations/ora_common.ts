import * as THREE from 'three';
import { canvasTex, noise, mesh, cyl, lathe, mat } from '../builders';

export const brassMat = () => new THREE.MeshStandardMaterial({ color: 0xb59a5c, metalness: 1, roughness: 0.32 });
export const steelMat = () => new THREE.MeshStandardMaterial({ color: 0x8c8c8c, metalness: 1, roughness: 0.35 });

/** A clock face with roman or arabic numerals, aged paper. */
export function clockFace(roman = true, dark = false) {
  return canvasTex(256, 256, (c, w) => {
    const r = w / 2;
    c.fillStyle = dark ? '#2b2824' : '#e2dccb';
    c.beginPath();
    c.arc(r, r, r, 0, Math.PI * 2);
    c.fill();
    noise(c, w, w, 3000, 0.12);
    c.strokeStyle = dark ? '#cfc6b2' : '#1d1a16';
    c.fillStyle = c.strokeStyle;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r, r, r - 8, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const l = i % 5 ? 6 : 14;
      c.lineWidth = i % 5 ? 1.5 : 3;
      c.beginPath();
      c.moveTo(r + Math.sin(a) * (r - 14), r - Math.cos(a) * (r - 14));
      c.lineTo(r + Math.sin(a) * (r - 14 - l), r - Math.cos(a) * (r - 14 - l));
      c.stroke();
    }
    const nums = roman ? ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'] : ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    c.font = `bold ${roman ? 22 : 26}px Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    nums.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2;
      c.fillText(n, r + Math.sin(a) * (r - 46), r - Math.cos(a) * (r - 46));
    });
    // age spots
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(90,70,40,0.12)';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * w, 6 + Math.random() * 20, 0, Math.PI * 2);
      c.fill();
    }
  });
}

/** A wall/mantel clock: face, bezel, two hands. setTime(h, m) moves the hands. */
export function wallClock(radius: number, o: { roman?: boolean; dark?: boolean; bezel?: THREE.Material; depth?: number } = {}) {
  const g = new THREE.Group();
  const bezel = o.bezel ?? brassMat();
  const d = o.depth ?? 0.04;
  g.add(cyl(radius * 1.1, radius * 1.12, d, bezel, 0, 0, -d / 2, 32).rotateX(Math.PI / 2));
  const face = mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshStandardMaterial({ map: clockFace(o.roman ?? true, o.dark), roughness: 0.8 }), 0, 0, 0.002, false);
  g.add(face);
  const handMat = mat(o.dark ? 0xd8d0bc : 0x0d0c0b, { roughness: 0.4 });
  const mk = (len: number, wd: number) => {
    const p = new THREE.Group();
    const h = mesh(new THREE.PlaneGeometry(wd, len), handMat, 0, len / 2 - len * 0.12, 0, false);
    p.add(h);
    p.position.z = 0.006;
    g.add(p);
    return p;
  };
  const hour = mk(radius * 0.55, radius * 0.08);
  const minute = mk(radius * 0.82, radius * 0.05);
  minute.position.z = 0.008;
  g.add(mesh(new THREE.CircleGeometry(radius * 0.06, 12), handMat, 0, 0, 0.01, false));
  const setTime = (h: number, m: number) => {
    minute.rotation.z = -(m / 60) * Math.PI * 2;
    hour.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2;
  };
  setTime(3, 17);
  return { group: g, setTime, hour, minute };
}

/** A toothed gear lying flat (in the XZ plane), centred on its axle. */
export function gear(radius: number, teeth: number, material: THREE.Material, thick = 0.008) {
  const s = new THREE.Shape();
  const ri = radius * 0.88;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? ri : radius;
    if (i === 0) s.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    else s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    s.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  // spokes: four windows cut out
  if (radius > 0.03)
    for (let k = 0; k < 4; k++) {
      const h = new THREE.Path();
      const a = (k / 4) * Math.PI * 2 + 0.3;
      h.absarc(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, radius * 0.2, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
  const hub = new THREE.Path();
  hub.absarc(0, 0, Math.min(0.006, radius * 0.15), 0, Math.PI * 2, true);
  s.holes.push(hub);
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

/** A pendulum: rod and disc bob. Pivot at the top. */
export function pendulum(len: number, bob: number, material: THREE.Material) {
  const p = new THREE.Group();
  p.add(cyl(0.006, 0.006, len, material, 0, -len / 2, 0, 6));
  p.add(cyl(bob, bob, 0.015, material, 0, -len, 0, 28).rotateX(Math.PI / 2));
  return p;
}

/** A grandfather clock (longcase), front facing +z. */
export function grandfatherClock(wood: THREE.Material) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.55, 0.5, 0.36), wood, 0, 0.25, 0));
  g.add(mesh(new THREE.BoxGeometry(0.46, 1.1, 0.3), wood, 0, 1.05, 0));
  g.add(mesh(new THREE.BoxGeometry(0.58, 0.62, 0.36), wood, 0, 1.9, 0));
  g.add(lathe([[0, 0], [0.32, 0], [0.3, 0.04], [0.2, 0.1], [0, 0.12]], wood, 0, 2.21, 0, 4).rotateY(Math.PI / 4));
  const c = wallClock(0.2, { roman: true });
  c.group.position.set(0, 1.92, 0.185);
  g.add(c.group);
  // glass door showing the pendulum
  const pend = pendulum(0.75, 0.07, brassMat());
  pend.position.set(0, 1.5, 0.12);
  g.add(pend);
  g.add(mesh(new THREE.PlaneGeometry(0.34, 0.95), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.2 }), 0, 1.05, 0.153, false));
  return { group: g, clock: c, pendulum: pend };
}
