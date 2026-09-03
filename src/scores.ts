// Skor tablosu — sunucu yok, veritabanı yok: localStorage yeter.
const KEY = "sabit-yildizlar-scores";

export function loadScores(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return []; // bozuk veri oyunu bozmasın
  }
}

// En düşük 10 süreyi tutar, yenisini ekleyip sıralı listeyi döner
export function saveScore(time: number): number[] {
  const scores = [...loadScores(), time].sort((a, b) => a - b).slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(scores));
  return scores;
}
