/**
 * "Physical" clues: blow (or shout) into the microphone, shake the phone.
 * Each one degrades gracefully: if the sensor is missing, blocked, or switched off in the
 * settings, the player holds a button instead. Nothing ever stalls the game.
 */
export type SensorKind = 'blow' | 'shout' | 'shake';

let micStream: MediaStream | null = null;
let micCtx: AudioContext | null = null;
let motionGranted: boolean | null = null;

export async function micAvailable() {
  return !!navigator.mediaDevices?.getUserMedia;
}

async function openMic(): Promise<AnalyserNode | null> {
  try {
    if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    micCtx = micCtx ?? new AudioContext();
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

/** iOS asks for permission, and only from inside a tap. */
async function askMotion(): Promise<boolean> {
  if (motionGranted !== null) return motionGranted;
  const D = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (!D) return (motionGranted = false);
  if (typeof D.requestPermission === 'function') {
    try {
      motionGranted = (await D.requestPermission()) === 'granted';
    } catch {
      motionGranted = false;
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
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      const m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const jerk = Math.abs(m - last);
      last = m;
      if (jerk > 9) progress = Math.min(1, progress + jerk / 140);
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
    const freq = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      if (cancel.cancelled) return finish(false);
      an.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      let loud = 0;
      if (kind === 'blow') {
        // blowing: loud and noisy, energy spread down low
        an.getByteFrequencyData(freq);
        let low = 0;
        for (let i = 1; i < 24; i++) low += freq[i];
        loud = rms > 0.08 && low / 23 > 120 ? 1 : 0;
      } else loud = rms > 0.18 ? 1 : 0;
      progress = Math.max(0, Math.min(1, progress + (loud ? 0.022 : -0.01)));
      onLevel(progress);
      if (progress >= 1) return finish(true);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
