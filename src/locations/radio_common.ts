import * as THREE from 'three';
import { mat, rbox, cyl, mesh, plasterMaterial, woodMaterial, liveCanvas, noise } from '../builders';
import type { Audio } from '../audio';

/**
 * Le Voci dell'Etere — shared bits: walls, an old valve radio, Morse code and the sounds of the
 * ether (static, a Morse beacon, a far-away voice).
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let wallM: THREE.Material | null = null;
export function radioWall() {
  if (!wallM) {
    wallM = plasterMaterial({ base: '#7d786e', repeat: [3, 2], damp: 0.8 });
    wallM.userData.shared = true;
  }
  return wallM;
}

/** The frequency Paolo's beacon spells out (MHz), and where the dial starts. */
export const FREQ_OK = 7.045;
export const FREQ_START = 7.0;
/** «fine trasmissione»: SK, sent as one sign */
export const SK = '...-.-';
export const MORSE: Record<string, string> = {
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', R: '.-.', S: '...', T: '-', U: '..-', V: '...-',
};

/** A table radio of the fifties: wooden cabinet, cloth grille, a lit dial. */
export function valveRadio(w = 0.5, h = 0.3, d = 0.22, dial?: THREE.Texture) {
  const g = new THREE.Group();
  const wood = woodMaterial({ base: '#4a3424' });
  g.add(rbox(w, h, d, 0.03, wood, 0, h / 2, 0));
  const cloth = mat(0x6e675c, { roughness: 1 });
  g.add(mesh(new THREE.PlaneGeometry(w * 0.42, h * 0.62), cloth, -w * 0.22, h * 0.52, d / 2 + 0.002, false));
  const dialM = dial ? new THREE.MeshBasicMaterial({ map: dial }) : mat(0xd8cfb4, { roughness: 0.4, emissive: 0x2a2418 });
  g.add(mesh(new THREE.PlaneGeometry(w * 0.42, h * 0.3), dialM, w * 0.22, h * 0.62, d / 2 + 0.002, false));
  const knobM = mat(0x1a1612, { roughness: 0.4 });
  for (const x of [0.12, 0.32]) g.add(cyl(0.022, 0.022, 0.02, knobM, w * (x - 0.02), h * 0.24, d / 2 + 0.01, 14).rotateX(Math.PI / 2));
  return g;
}

/** An old television set with a screen we can draw on. */
export function oldTv(sw = 0.36, sh = 0.27) {
  const g = new THREE.Group();
  const wood = woodMaterial({ base: '#3e2c1e' });
  g.add(rbox(sw + 0.14, sh + 0.12, 0.38, 0.03, wood, 0, (sh + 0.12) / 2, 0));
  const screen = liveCanvas(128, 96);
  screen.ctx.fillStyle = '#0d0e0e';
  screen.ctx.fillRect(0, 0, 128, 96);
  screen.update();
  const sm = new THREE.MeshBasicMaterial({ map: screen.tex, color: 0x9a9a9a });
  const s = mesh(new THREE.PlaneGeometry(sw, sh), sm, -0.03, (sh + 0.12) / 2, 0.192, false);
  g.add(s);
  for (const y of [0.25, 0.55]) g.add(cyl(0.018, 0.018, 0.02, mat(0x1a1612), sw / 2 + 0.02, (sh + 0.12) * y, 0.195, 12).rotateX(Math.PI / 2));
  return { group: g, screen, mat: sm };
}

/** Snow on a dead channel. */
export function drawSnow(c: CanvasRenderingContext2D, w: number, h: number, k = 1) {
  const img = c.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255 * k;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

/** A little paper label (for fuses, tickets...). */
export function paperTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const lc = liveCanvas(w, h);
  lc.ctx.fillStyle = '#ddd5c2';
  lc.ctx.fillRect(0, 0, w, h);
  draw(lc.ctx);
  noise(lc.ctx, w, h, 300, 0.1);
  lc.update();
  return lc.tex;
}

// ---------------- the sound of the ether ----------------

/**
 * Static from the loudspeaker, with a far-away voice under it. level 0..1 is the hiss,
 * voice 0..1 how much of the voice comes through.
 */
export function ether(audio: Audio) {
  const ctx = audio.ctx;
  if (!ctx) return { set: (_l: number, _v: number) => {}, stop: () => {} };
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.5;
  const hiss = ctx.createGain();
  hiss.gain.value = 0;
  src.connect(bp).connect(hiss).connect(audio.bus);
  src.start();
  // the voice: a buzzing larynx through two moving formants, chopped into syllables
  const larynx = ctx.createOscillator();
  larynx.type = 'sawtooth';
  larynx.frequency.value = 118;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.Q.value = 6;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.Q.value = 8;
  const vg = ctx.createGain();
  vg.gain.value = 0;
  const syl = ctx.createGain();
  syl.gain.value = 0;
  larynx.connect(f1);
  larynx.connect(f2);
  f1.connect(syl);
  f2.connect(syl);
  syl.connect(vg).connect(audio.bus);
  larynx.start();
  let voice = 0;
  let alive = true;
  const vowels = [[700, 1200], [400, 2000], [300, 2300], [500, 900], [350, 800]];
  const speak = () => {
    if (!alive) return;
    const t = ctx.currentTime;
    const [a, b] = vowels[Math.floor(Math.random() * vowels.length)];
    f1.frequency.setTargetAtTime(a, t, 0.03);
    f2.frequency.setTargetAtTime(b, t, 0.03);
    larynx.frequency.setTargetAtTime(105 + Math.random() * 30, t, 0.05);
    const dur = 0.12 + Math.random() * 0.18;
    syl.gain.setTargetAtTime(Math.random() < 0.15 ? 0 : 1, t, 0.02);
    syl.gain.setTargetAtTime(0.1, t + dur, 0.03);
    setTimeout(speak, (dur + (Math.random() < 0.2 ? 0.35 : 0.04)) * 1000);
  };
  speak();
  return {
    set(level: number, v: number) {
      if (!alive) return;
      const t = ctx.currentTime;
      hiss.gain.setTargetAtTime(level * 0.09, t, 0.08);
      voice = v;
      vg.gain.setTargetAtTime(voice * 0.05, t, 0.1);
    },
    stop() {
      if (!alive) return;
      alive = false;
      const t = ctx.currentTime;
      hiss.gain.setTargetAtTime(0, t, 0.05);
      vg.gain.setTargetAtTime(0, t, 0.05);
      setTimeout(() => {
        try { src.stop(); larynx.stop(); } catch { /* */ }
        src.disconnect();
        larynx.disconnect();
      }, 400);
    },
  };
}

/**
 * A Morse beacon repeating `text` for ever (until stopped). onKey(true/false) follows the
 * tone, so the panel lamp can blink with it (and the game works with the sound off).
 */
export function beacon(audio: Audio, text: string, onKey: (on: boolean) => void, unit = 0.11) {
  const ctx = audio.ctx;
  let alive = true;
  let gain = 1;
  const o = ctx?.createOscillator();
  const gn = ctx?.createGain();
  if (ctx && o && gn) {
    o.type = 'sine';
    o.frequency.value = 760;
    gn.gain.value = 0;
    o.connect(gn).connect(audio.bus);
    o.start();
  }
  const seq: [boolean, number][] = [];
  for (const ch of text) {
    if (ch === ' ') {
      seq.push([false, unit * 4]);
      continue;
    }
    const code = MORSE[ch] ?? '';
    for (const s of code) {
      seq.push([true, s === '.' ? unit : unit * 3]);
      seq.push([false, unit]);
    }
    seq.push([false, unit * 2]);
  }
  seq.push([false, unit * 10]);
  let i = 0;
  const step = () => {
    if (!alive) return;
    const [on, dur] = seq[i];
    i = (i + 1) % seq.length;
    onKey(on);
    if (ctx && gn) gn.gain.setTargetAtTime(on ? 0.06 * gain : 0, ctx.currentTime, 0.004);
    setTimeout(step, dur * 1000);
  };
  step();
  return {
    volume(v: number) {
      gain = v;
    },
    stop() {
      alive = false;
      onKey(false);
      if (ctx && gn && o) {
        gn.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
        setTimeout(() => {
          try { o.stop(); } catch { /* */ }
          o.disconnect();
        }, 200);
      }
    },
  };
}

/** A gibberish voice on the tape: forward it's backwards; backwards it's (almost) words. */
export function tapeVoice(audio: Audio, seconds: number, reversed: boolean) {
  const e = ether(audio);
  e.set(0.12, reversed ? 1 : 0.8);
  return new Promise<void>((res) =>
    setTimeout(() => {
      e.stop();
      res();
    }, seconds * 1000),
  );
}
