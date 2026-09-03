// Tohum (seed) → her zaman aynı rastgele dizi.
// Oyunun tamamı bu fikre yaslanır: aynı tohumdan hep aynı orb.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (rng: Rng, min: number, max: number): number =>
  min + rng() * (max - min);

export const int = (rng: Rng, min: number, max: number): number =>
  Math.floor(range(rng, min, max + 1));

export const pick = <T>(rng: Rng, arr: T[]): T =>
  arr[Math.floor(rng() * arr.length)];

// Fisher-Yates: her permütasyon eşit olasılıkla (sort(random) hilesi değil!)
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
