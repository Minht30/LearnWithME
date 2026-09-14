/**
 * All practice-room sounds synthesized in the browser via WebAudio.
 * No asset files, no autoplay policy pitfalls once the user has interacted.
 *
 * Master volume + focus-music loop are managed here (client-side only).
 */

type Osc = OscillatorType;

// -------- Shared master volume ------------------------------------------------

let masterVolume = 0.7;
export function setMasterVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  if (musicGain && musicCtx) {
    musicGain.gain.setTargetAtTime(musicPlaying ? masterVolume * 0.14 : 0, musicCtx.currentTime, 0.15);
  }
}

function tone(
  enabled: boolean,
  notes: { freq: number; startMs: number; durMs: number; type?: Osc; gain?: number }[]
) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.22 * masterVolume;
    master.connect(ctx.destination);

    let latest = 0;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.value = n.freq;
      const t0 = ctx.currentTime + n.startMs / 1000;
      const t1 = t0 + n.durMs / 1000;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(n.gain ?? 0.35, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t1 + 0.05);
      latest = Math.max(latest, n.startMs + n.durMs);
    }
    setTimeout(() => ctx.close(), latest + 200);
  } catch {
    /* audio unavailable */
  }
}

/** Warm two-note chime for timer transitions (start, one-minute-left, end). */
export function playChime(enabled: boolean) {
  tone(enabled, [
    { freq: 880, startMs: 0, durMs: 180 },
    { freq: 660, startMs: 190, durMs: 280 },
  ]);
}

/** Rising two-note ding for a correct answer. */
export function playCorrect(enabled: boolean) {
  tone(enabled, [
    { freq: 660, startMs: 0, durMs: 120, gain: 0.4 },
    { freq: 990, startMs: 100, durMs: 260, gain: 0.4 },
  ]);
}

/** Soft single low tone for an incorrect answer — friendly, not harsh. */
export function playIncorrect(enabled: boolean) {
  tone(enabled, [
    { freq: 330, startMs: 0, durMs: 240, type: "triangle", gain: 0.32 },
  ]);
}

/** Short click for question navigation. Very quiet — background feedback only. */
export function playClick(enabled: boolean) {
  tone(enabled, [{ freq: 1400, startMs: 0, durMs: 40, type: "square", gain: 0.08 }]);
}

/** Rising arpeggio for a 3+ streak. */
export function playStreak(enabled: boolean) {
  tone(enabled, [
    { freq: 523, startMs: 0, durMs: 90, gain: 0.35 },
    { freq: 659, startMs: 80, durMs: 90, gain: 0.35 },
    { freq: 784, startMs: 160, durMs: 90, gain: 0.35 },
    { freq: 1046, startMs: 240, durMs: 200, gain: 0.4 },
  ]);
}

/** Triumphant chord when the test is finished. */
export function playSubmit(enabled: boolean) {
  tone(enabled, [
    { freq: 523, startMs: 0, durMs: 500, gain: 0.35 },
    { freq: 659, startMs: 0, durMs: 500, gain: 0.28 },
    { freq: 784, startMs: 0, durMs: 500, gain: 0.28 },
    { freq: 1046, startMs: 120, durMs: 380, gain: 0.35 },
  ]);
}

/** Tiny warning tick for timer under 10s. */
export function playTick(enabled: boolean) {
  tone(enabled, [{ freq: 900, startMs: 0, durMs: 40, type: "sine", gain: 0.16 }]);
}

// -------- Focus music (procedural ambient) -----------------------------------

let musicCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicNodes: OscillatorNode[] = [];
let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Very quiet, dreamy chord pad with a slow melody on top.
 * Uses only two detuned oscillators + an occasional bell note.
 */
export function setMusicPlaying(on: boolean) {
  if (typeof window === "undefined") return;
  if (on === musicPlaying) return;

  if (!on) {
    musicPlaying = false;
    if (musicGain && musicCtx) musicGain.gain.setTargetAtTime(0, musicCtx.currentTime, 0.2);
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    musicNodes.forEach((n) => { try { n.stop(); } catch {} });
    musicNodes = [];
    if (musicCtx) { musicCtx.close().catch(() => {}); musicCtx = null; musicGain = null; }
    return;
  }

  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    musicCtx = new Ctx();
    musicGain = musicCtx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(musicCtx.destination);
    musicGain.gain.setTargetAtTime(masterVolume * 0.14, musicCtx.currentTime, 0.6);

    // Pad — two detuned sines an octave apart
    const pad1 = musicCtx.createOscillator();
    pad1.type = "sine";
    pad1.frequency.value = 220;   // A3
    const pad2 = musicCtx.createOscillator();
    pad2.type = "triangle";
    pad2.frequency.value = 329.6; // E4

    const filter = musicCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    pad1.connect(filter);
    pad2.connect(filter);
    filter.connect(musicGain);
    pad1.start(); pad2.start();
    musicNodes = [pad1, pad2];

    // Sparse bell notes on a pentatonic
    const scale = [523.25, 587.33, 659.25, 783.99, 880]; // C D E G A
    musicInterval = setInterval(() => {
      if (!musicCtx || !musicGain) return;
      const n = musicCtx.createOscillator();
      const g = musicCtx.createGain();
      n.type = "sine";
      n.frequency.value = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
      const t0 = musicCtx.currentTime;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.08, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);
      n.connect(g).connect(musicGain);
      n.start(t0);
      n.stop(t0 + 2.6);
    }, 3400);

    musicPlaying = true;
  } catch {
    /* ignore */
  }
}
