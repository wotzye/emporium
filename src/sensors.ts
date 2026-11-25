/**
 * "Physical" clues: blow (or shout) into the microphone, shake the phone.
 * Each one degrades gracefully: if the sensor is missing, blocked, or switched off in the
 * settings, the player holds a button instead. Nothing ever stalls the game.
 */
export type SensorKind = 'blow' | 'shout' | 'shake';

let micStream: MediaStream | null = null;
let micCtx: AudioContext | null = null;
let motionGranted: boolean | null = null;
let sharedCtx: AudioContext | null = null;
/** the game's own audio context: already unlocked by a tap, so iOS lets the mic analyser run */
export function useAudioContext(ctx: AudioContext | null) {
  sharedCtx = ctx;
}

export async function micAvailable() {
  return !!navigator.mediaDevices?.getUserMedia;
}

async function openMic(): Promise<AnalyserNode | null> {
  try {
    if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    micCtx = sharedCtx ?? micCtx ?? new AudioContext();
    if (micCtx.state === 'suspended') await micCtx.resume();
    const src = micCtx.createMediaStreamSource(micStream);
    const an = micCtx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    return an;
  } catch {
    return null;
  }
}

export function closeMic() {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}

type MotionCtor = { requestPermission?: () => Promise<string> };
const motionCtor = () => (window as unknown as { DeviceMotionEvent?: MotionCtor }).DeviceMotionEvent;
/** true on iPhone until the player has said yes: the question can only be asked from inside a tap */
export function motionNeedsTap() {
  const D = motionCtor();
  return !!D && typeof D.requestPermission === 'function' && motionGranted !== true;
}
/** Ask for the motion sensors. Call it from a tap handler (iOS refuses otherwise, and then we may ask again). */
export async function askMotion(): Promise<boolean> {
  if (motionGranted !== null) return motionGranted;
  const D = motionCtor();
  if (!D) return (motionGranted = false);
  if (typeof D.requestPermission === 'function') {
    try {
      const r = await D.requestPermission();
      // only a real answer is remembered; "not from a tap" errors leave the door open
      motionGranted = r === 'granted';
    } catch {
      return false;
    }
  } else motionGranted = 'ontouchstart' in window;
  return motionGranted;
}

/**
 * Listen until the action is done. `onLevel` gets 0..1 progress for the UI.
 * Resolves true when the player blew / shouted / shook enough, false if cancelled.
 */
export function listen(kind: SensorKind, onLevel: (k: number) => void, cancel: { cancelled: boolean }): Promise<boolean> {
  return new Promise(async (res) => {
    let progress = 0;
    const finish = (ok: boolean) => {
      window.removeEventListener('devicemotion', onMotion);
      res(ok);
    };
    // ---- shake ----
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      // prefer the acceleration without gravity; else take gravity off the total
      const a = e.acceleration, ag = e.accelerationIncludingGravity;
      let m = 0;
      if (a && a.x !== null) m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      else if (ag) {
        const t = Math.hypot(ag.x ?? 0, ag.y ?? 0, ag.z ?? 0);
        m = Math.abs(t - last) * 2;
        last = t;
      }
      // a brisk shake is 8-20 m/s²; about a second of it fills the bar
      if (m > 6) progress = Math.min(1, progress + Math.min(m, 25) / 600);
    };
    if (kind === 'shake') {
      if (!(await askMotion())) return finish(false);
      window.addEventListener('devicemotion', onMotion);
      const tick = () => {
        if (cancel.cancelled) return finish(false);
        progress = Math.max(0, progress - 0.004);
        onLevel(progress);
        if (progress >= 1) return finish(true);
        requestAnimationFrame(tick);
      };
      tick();
      return;
    }
    // ---- blow / shout ----
    const an = await openMic();
    if (!an) return finish(false);
    const buf = new Float32Array(an.fftSize);
    // phones squash the mic level (automatic gain), so judge against the room's own noise:
    // listen to the silence for a moment, then anything well above it counts
    let floor = 0.01, n = 0;
    let lastT = performance.now();
    const t0 = lastT;
    const tick = () => {
      if (cancel.cancelled) return finish(false);
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      an.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      if (now - t0 < 400) {
        floor = (floor * n + rms) / (n + 1);
        n++;
        onLevel(0);
        requestAnimationFrame(tick);
        return;
      }
      const need = kind === 'blow' ? Math.max(0.02, floor * 3) : Math.max(0.06, floor * 6);
      const loud = rms > need;
      // about a second and a half of blowing (or a good shout) fills the bar
      progress = Math.max(0, Math.min(1, progress + (loud ? dt / (kind === 'blow' ? 1.4 : 1.0) : -dt * 0.35)));
      onLevel(progress);
      if (progress >= 1) return finish(true);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
