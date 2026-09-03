// Ses dosyası yok: her ses, anında üretilen bir osilatör.
// Bir mp3 "dondurulmuş ses"tir; burada tarifin kendisini tutuyoruz.
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
  audioCtx ??= new AudioContext(); // ilk etkileşimde kur (tarayıcı kuralı)
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur); // doğal sönüm
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

export const sfx = {
  correct() {
    tone(660, 0.15);
    tone(990, 0.3, "sine", 0.12); // beşli aralık: "doğru" hissi
  },
  wrong() {
    tone(110, 0.35, "sawtooth", 0.22); // kalın testere: "olmadı"
  },
  levelUp() {
    // yükselen majör arpej — küçük bir fanfar
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
