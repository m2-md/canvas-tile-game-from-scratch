// No sound files: every sound is an oscillator synthesized on the fly.
// An mp3 is "frozen sound"; here we keep the recipe itself.
let audioCtx: AudioContext | null = null;

export let muted = false;
export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.2,
) {
  if (muted) return;
  audioCtx ??= new AudioContext(); // create on first user interaction (browser policy)
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur); // natural decay
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

export const sfx = {
  correct() {
    tone(660, 0.15);
    tone(990, 0.3, "sine", 0.12); // perfect fifth: "correct" sensation
  },
  wrong() {
    tone(110, 0.35, "sawtooth", 0.22); // low sawtooth: "wrong"
  },
  levelUp() {
    // rising major arpeggio — celebratory fanfare
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.2, "triangle"), i * 90),
    );
  },
  gameOver() {
    [784, 659, 523, 392].forEach((f, i) =>
      setTimeout(() => tone(f, 0.3, "triangle"), i * 150),
    );
  },
};
