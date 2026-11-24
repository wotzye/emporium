import * as THREE from 'three';
import { canvasTex, noise, cachedMaterial } from '../builders';

/** Faded floral wallpaper with damp stains and a darker band where furniture used to stand. */
export function wallpaper(base = '#b8b0a0', repeat: [number, number] = [3, 1.5]) {
  return cachedMaterial('wallpaper' + base + repeat, () => makeWallpaper(base, repeat));
}
function makeWallpaper(base: string, repeat: [number, number]) {
  const tex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    // stripes
    for (let x = 0; x < w; x += 64) {
      c.fillStyle = 'rgba(80,70,60,0.12)';
      c.fillRect(x, 0, 6, h);
      c.fillRect(x + 30, 0, 2, h);
    }
    // little flowers between the stripes
    for (let y = 16; y < h; y += 48)
      for (let x = 16; x < w; x += 64) {
        const ox = x + ((y / 48) % 2) * 32;
        c.fillStyle = 'rgba(70,60,52,0.3)';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          c.beginPath();
          c.ellipse(ox + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 2.5, a, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = 'rgba(40,34,30,0.45)';
        c.beginPath();
        c.arc(ox, y, 2, 0, Math.PI * 2);
        c.fill();
      }
    noise(c, w, h, 9000, 0.12);
    // damp blooms
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * w, y = Math.random() * h * 0.6, r = 40 + Math.random() * 90;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(60,50,38,0.35)');
      gr.addColorStop(0.7, 'rgba(60,50,38,0.12)');
      gr.addColorStop(1, 'rgba(60,50,38,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
  }, repeat);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
}

/** A lace doily, seen from above. */
export function doilyTex() {
  return canvasTex(256, 256, (c, w) => {
    c.clearRect(0, 0, w, w);
    const cx = w / 2;
    c.fillStyle = 'rgba(232,228,218,0.95)';
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = w * 0.44 + (i % 2 ? 0 : w * 0.04);
      c.lineTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
    }
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (let ring = 1; ring < 5; ring++)
      for (let i = 0; i < 6 + ring * 6; i++) {
        const a = (i / (6 + ring * 6)) * Math.PI * 2;
        c.beginPath();
        c.arc(cx + Math.cos(a) * ring * w * 0.085, cx + Math.sin(a) * ring * w * 0.085, 3 + ring, 0, Math.PI * 2);
        c.fill();
      }
  });
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
