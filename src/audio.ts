/**
 * All sound is synthesized with WebAudio: no audio files to load, nothing to license.
 * iOS only starts audio after a user gesture, so init() is called from the title screen tap.
 */
export type DroneKind = 'map' | 'emporio' | 'macelleria' | 'barbiere' | 'none';

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private noise!: AudioBuffer;
  private droneNodes: AudioNode[] = [];
  private droneGain: GainNode | null = null;
  private droneKind: DroneKind = 'none';
  private buzzNode: { stop: () => void } | null = null;
  volume = 0.8;
  reduced = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // iOS: play a silent buffer to unlock
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.master);
    src.start(0);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  private get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private noiseSrc(loop = false) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // ---------------- Drones ----------------
  drone(kind: DroneKind) {
    if (!this.ctx || kind === this.droneKind) return;
    this.droneKind = kind;
    const ctx = this.ctx;
    const old = this.droneGain;
    const oldNodes = this.droneNodes;
    if (old) {
      old.gain.setTargetAtTime(0.0001, this.now, 0.6);
      setTimeout(() => oldNodes.forEach((n) => { try { (n as OscillatorNode).stop?.(); } catch { /* */ } n.disconnect(); }), 3000);
    }
    this.droneNodes = [];
    this.droneGain = null;
    if (kind === 'none') return;

    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(this.master);
    this.droneGain = g;
    const settings: Record<Exclude<DroneKind, 'none'>, { f: number[]; lp: number; noise: number; level: number }> = {
      map: { f: [55, 55.4, 82.4], lp: 260, noise: 0.5, level: 0.05 },
      emporio: { f: [49, 49.3, 73.4, 103.8], lp: 380, noise: 0.25, level: 0.06 },
      macelleria: { f: [41.2, 41.6, 61.7, 87.3], lp: 220, noise: 0.35, level: 0.07 },
      barbiere: { f: [46.2, 46.5, 69.3, 98], lp: 300, noise: 0.3, level: 0.06 },
    };
    const s = settings[kind];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = s.lp;
    lp.Q.value = 2;
    lp.connect(g);
    for (const f of s.f) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.25;
      o.connect(og).connect(lp);
      o.start();
      this.droneNodes.push(o, og);
    }
    // slow filter breathing
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = s.lp * 0.35;
    lfo.connect(lfoG).connect(lp.frequency);
    lfo.start();
    // wind / room tone
    const n = this.noiseSrc(true);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = s.noise * 0.12;
    n.connect(bp).connect(ng).connect(g);
    n.start();
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 300;
    lfo2.connect(lfo2G).connect(bp.frequency);
    lfo2.start();
    this.droneNodes.push(lp, lfo, lfoG, n, bp, ng, lfo2, lfo2G);
    g.gain.setTargetAtTime(s.level, this.now, 1.2);
  }

  /** Lower the drone for a moment, to build tension before a scare. */
  hush(seconds: number) {
    if (!this.droneGain || !this.ctx) return;
    const g = this.droneGain.gain;
    const t = this.now;
    const cur = g.value;
    g.cancelScheduledValues(t);
    g.setValueAtTime(cur, t);
    g.linearRampToValueAtTime(cur * 0.15, t + 0.8);
    g.linearRampToValueAtTime(cur, t + seconds + 1.5);
  }

  // ---------------- Effects ----------------
  sfx(name: 'click' | 'unlock' | 'wrong' | 'bell' | 'creak' | 'thud' | 'steam' | 'whisper' | 'pickup' | 'switch' | 'drawer' | 'heart' | 'paper' | 'seal' | 'glass') {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = this.now;
    const out = this.master;
    switch (name) {
      case 'click': {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 1800;
        const g = ctx.createGain();
        this.env(g, t, 0.002, 0.08, 0.04);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.06);
        break;
      }
      case 'switch': {
        this.thump(t, 0.25, 900, 0.03);
        this.thump(t + 0.04, 0.15, 2500, 0.02);
        break;
      }
      case 'drawer': {
        const n = this.noiseSrc();
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(400, t);
        f.frequency.linearRampToValueAtTime(900, t + 0.35);
        const g = ctx.createGain();
        this.env(g, t, 0.05, 0.25, 0.35);
        n.connect(f).connect(g).connect(out);
        n.start(t);
        n.stop(t + 0.5);
        this.thump(t + 0.38, 0.3, 300, 0.08);
        break;
      }
      case 'unlock': {
        this.thump(t, 0.3, 2000, 0.02);
        this.thump(t + 0.12, 0.3, 1400, 0.03);
        this.tone(t + 0.2, 880, 0.08, 0.6, 'sine');
        this.tone(t + 0.2, 1318, 0.05, 0.6, 'sine');
        break;
      }
      case 'wrong': {
        this.tone(t, 140, 0.15, 0.25, 'square');
        this.tone(t + 0.12, 110, 0.15, 0.3, 'square');
        break;
      }
      case 'pickup': {
        this.tone(t, 660, 0.06, 0.25, 'triangle');
        this.tone(t + 0.07, 990, 0.05, 0.35, 'triangle');
        break;
      }
      case 'paper': {
        const n = this.noiseSrc();
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 2500;
        const g = ctx.createGain();
        this.env(g, t, 0.01, 0.15, 0.25);
        n.connect(f).connect(g).connect(out);
        n.start(t);
        n.stop(t + 0.3);
        break;
      }
      case 'bell': {
        // old shop door bell
        for (const [f, a] of [[1567, 0.12], [2349, 0.08], [3136, 0.05], [4186, 0.03]] as const) {
          this.tone(t, f, a, 1.6, 'sine');
          this.tone(t + 0.18, f * 1.01, a * 0.7, 1.4, 'sine');
        }
        break;
      }
      case 'creak': {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(90, t);
        o.frequency.linearRampToValueAtTime(160, t + 0.25);
        o.frequency.linearRampToValueAtTime(70, t + 0.6);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 700;
        f.Q.value = 6;
        const g = ctx.createGain();
        this.env(g, t, 0.05, 0.18, 0.6);
        o.connect(f).connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.7);
        break;
      }
      case 'thud': {
        this.thump(t, 0.9, 120, 0.35);
        break;
      }
      case 'steam': {
        const n = this.noiseSrc();
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 3000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
        g.gain.setValueAtTime(0.12, t + 2.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
        n.connect(f).connect(g).connect(out);
        n.start(t);
        n.stop(t + 3.5);
        break;
      }
      case 'whisper': {
        const n = this.noiseSrc();
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 8;
        for (let i = 0; i < 8; i++) f.frequency.setValueAtTime(900 + Math.random() * 2200, t + i * 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
        g.gain.setValueAtTime(0.3, t + 1.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.setValueAtTime(-0.8, t);
          pan.pan.linearRampToValueAtTime(0.8, t + 1.6);
          n.connect(f).connect(g).connect(pan).connect(out);
        } else n.connect(f).connect(g).connect(out);
        n.start(t);
        n.stop(t + 1.8);
        break;
      }
      case 'heart': {
        for (let i = 0; i < 4; i++) {
          this.thump(t + i * 0.8, 0.5, 70, 0.12);
          this.thump(t + i * 0.8 + 0.22, 0.35, 65, 0.1);
        }
        break;
      }
      case 'seal': {
        for (const f of [196, 233, 277, 330]) this.tone(t, f, 0.06, 2.5, 'sine');
        this.thump(t, 0.6, 80, 0.5);
        break;
      }
      case 'glass': {
        for (const f of [2093, 2637, 3520]) this.tone(t, f * (0.98 + Math.random() * 0.04), 0.06, 0.9, 'sine');
        break;
      }
    }
  }

  /** The big one. Softer when reduced scares are on. */
  stinger() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = this.now;
    const level = this.reduced ? 0.25 : 1;
    const n = this.noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 800;
    const g = ctx.createGain();
    this.env(g, t, 0.005, 0.55 * level, 0.9);
    n.connect(f).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 1);
    for (const fr of [311, 329.6, 349.2, 466.2, 622]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(fr, t);
      o.frequency.exponentialRampToValueAtTime(fr * 0.55, t + 1.6);
      const og = ctx.createGain();
      this.env(og, t, 0.01, 0.09 * level, 1.6);
      o.connect(og).connect(this.master);
      o.start(t);
      o.stop(t + 1.7);
    }
    this.thump(t, 0.9 * level, 55, 0.6);
  }

  steps(count: number, interval = 0.55, heavy = true) {
    if (!this.ctx) return;
    const t = this.now;
    for (let i = 0; i < count; i++) {
      this.thump(t + i * interval, heavy ? 0.45 + i * 0.05 : 0.2, heavy ? 90 : 160, 0.12);
    }
  }

  buzz(on: boolean) {
    if (!this.ctx) return;
    if (!on) {
      this.buzzNode?.stop();
      this.buzzNode = null;
      return;
    }
    if (this.buzzNode) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 100;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    o.connect(f).connect(g).connect(this.master);
    o.start();
    this.buzzNode = {
      stop: () => {
        try { o.stop(); } catch { /* */ }
        o.disconnect();
      },
    };
  }

  private tone(t: number, f: number, a: number, d: number, type: OscillatorType) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    this.env(g, t, 0.005, a, d);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  private thump(t: number, a: number, f: number, d: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + d);
    const g = ctx.createGain();
    this.env(g, t, 0.003, a, d);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + d + 0.05);
    const n = this.noiseSrc();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = f * 4;
    const ng = ctx.createGain();
    this.env(ng, t, 0.002, a * 0.5, d * 0.6);
    n.connect(lp).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + d + 0.05);
  }
}
