import * as THREE from 'three';

/**
 * Old photographs. Each one has a key; if a real (public-domain) photo is shipped as
 * photos/<key>.jpg it is printed like a 1940s-70s snapshot (silver grain, soft focus, vignette,
 * a white border, scratches) into the texture. Until then, or if it is missing,
 * the hand-drawn picture stays. The texture updates itself when the photo arrives.
 */
export interface PhotoOpts {
  border?: boolean;
  tone?: 'sepia' | 'grey';
  age?: number;
  /** draw on the finished print (a face scratched out, a caption), inside the image area */
  after?: (c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) => void;
}

const base = () => (import.meta.env.MODE === 'single' ? './' : import.meta.env.BASE_URL);

/** photos/index.json lists the real photos that ship with the game (so nothing 404s) */
let listP: Promise<string[]> | null = null;
const available = () =>
  (listP ??= fetch(`${base()}photos/index.json`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []));

export function oldPhoto(key: string, w: number, h: number, fallback: (c: CanvasRenderingContext2D, w: number, h: number) => void, o: PhotoOpts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  fallback(c, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  available().then((list) => {
    if (!list.includes(key)) return;
    const img = new Image();
    img.onload = () => {
      printInto(c, w, h, img, o);
      tex.needsUpdate = true;
    };
    img.src = `${base()}photos/${key}.jpg`;
  });
  return tex;
}

function printInto(c: CanvasRenderingContext2D, w: number, h: number, img: HTMLImageElement, o: PhotoOpts) {
  const age = o.age ?? 0.5;
  const bw = o.border === false ? 0 : Math.round(Math.min(w, h) * 0.06);
  const iw = w - bw * 2, ih = h - bw * 2;
  c.fillStyle = '#e9e3d6';
  c.fillRect(0, 0, w, h);
  // cover-fit the photo into the print area
  const s = Math.max(iw / img.width, ih / img.height);
  const sw = iw / s, sh = ih / s;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, bw, bw, iw, ih);
  // silver print: grey (or warm), S-curve, lifted blacks, faded highlights, grain
  const d = c.getImageData(bw, bw, iw, ih);
  const sepia = (o.tone ?? 'sepia') === 'sepia';
  for (let i = 0; i < d.data.length; i += 4) {
    let l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
    l = l * l * (3 - 2 * l);
    l = 0.07 + l * (0.86 - age * 0.12);
    l = Math.max(0, Math.min(1, l + (Math.random() - 0.5) * 0.11));
    d.data[i] = Math.min(255, l * 255 * (sepia ? 1.06 : 1));
    d.data[i + 1] = l * 255 * (sepia ? 0.98 : 1);
    d.data[i + 2] = l * 255 * (sepia ? 0.86 : 1);
  }
  c.putImageData(d, bw, bw);
  // soft focus (blur by shrinking and growing: works on every browser)
  const small = document.createElement('canvas');
  small.width = Math.max(1, iw >> 3);
  small.height = Math.max(1, ih >> 3);
  small.getContext('2d')!.drawImage(c.canvas, bw, bw, iw, ih, 0, 0, small.width, small.height);
  c.globalAlpha = 0.25;
  c.drawImage(small, bw, bw, iw, ih);
  c.globalAlpha = 1;
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(iw, ih) * 0.3, w / 2, h / 2, Math.max(iw, ih) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(20,14,8,${0.3 + age * 0.25})`);
  c.fillStyle = vg;
  c.fillRect(bw, bw, iw, ih);
  o.after?.(c, bw, bw, iw, ih);
  c.strokeStyle = 'rgba(240,235,225,0.35)';
  c.lineWidth = 1;
  for (let i = 0; i < 4 + age * 8; i++) {
    const x = bw + Math.random() * iw, y = bw + Math.random() * ih;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (Math.random() - 0.5) * 40, y + Math.random() * 60);
    c.stroke();
  }
  if (bw) {
    c.fillStyle = 'rgba(120,100,70,0.25)';
    c.beginPath();
    c.moveTo(w, h - bw * 2.5);
    c.lineTo(w, h);
    c.lineTo(w - bw * 2.5, h);
    c.fill();
  }
}

/**
 * A drawing that turns into a real photo when one ships with the game (photos/<key>.jpg):
 * the memories use it, so a scene drawn with puppets can be swapped for a real print.
 */
const loaded = new Map<string, HTMLImageElement>();
/** start loading real photos ahead of time (the Emporio does it for the memories) */
export function preloadPhotos(keys: string[]) {
  available().then((list) => {
    for (const k of keys) {
      if (!list.includes(k) || loaded.has(k)) continue;
      const im = new Image();
      im.onload = () => loaded.set(k, im);
      im.src = `${base()}photos/${k}.jpg`;
    }
  });
}
export function photoOr(key: string, fallback: (c: CanvasRenderingContext2D, w: number, h: number) => void, o: PhotoOpts = { border: false, age: 0.4 }) {
  preloadPhotos([key]);
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    const img = loaded.get(key);
    if (img) printInto(c, w, h, img, o);
    else fallback(c, w, h);
  };
}
