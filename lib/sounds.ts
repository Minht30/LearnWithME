/**
 * All practice-room sounds synthesized in the browser via WebAudio.
 * No asset files, no autoplay policy pitfalls once the user has interacted.
 */

type Osc = OscillatorType;

function tone(
  enabled: boolean,
  notes: { freq: number; startMs: number; durMs: number; type?: Osc; gain?: number }[]
) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.18;
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
