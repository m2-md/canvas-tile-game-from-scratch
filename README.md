# SABİT YILDIZLAR — Sıfır Asset'li Desen Oyunu

"Sıfır Asset'li Oyun: Canvas'ta Prosedürel Grafik, Web Audio ve Bir Desen Oyunu"
makalesinin çalışan kodu. Her saniye değişen bir orb gökyüzünde **değişmeyenleri**
bulmaya çalışırsınız. Tamamı koddan üretilir:

- **Görseller:** `src/orb.ts` — tohumlu (seeded) prosedürel orblar; resim dosyası yok
- **Sesler:** `src/audio.ts` — Web Audio osilatörleri; mp3 yok
- **Skorlar:** `src/scores.ts` — localStorage; sunucu yok
- Üretim build'i: **JS 3.83 KB gzip** (`npm run build` ile doğrula)

## Kurulum ve çalıştırma

```bash
npm install
npm run dev     # http://localhost:5173 (veya Vite'ın verdiği port)
```

**Nasıl oynanır:** Dokun/başla → ızgaradaki orblar her saniye değişir, birkaçı hiç
değişmez (sabit yıldızlar). Onlara tıkla. Yanlış tahmin süreye **+10 sn** ekler.
5 seviye; ızgara 4×5'ten 7×9'a büyür. En düşük süreler skor tablosuna yazılır.
Sol alt köşe: ses aç/kapa.

## Test

```bash
npm test        # 17 birim testi
```

Testler saf mantığı doğrular: rng determinizmi, Fisher-Yates permütasyonu,
tahta kurulumu (benzersiz tohumlar, geçerli eternal noktaları), `reroll`
sözleşmesi (eternal kalır, diğerleri değişir), tahmin akışı, ızgara matematiği
(`cellAt` ↔ `cellCenter` terslik), localStorage skorları (bozuk veri dahil).

## Dosya yapısı

```
src/
  rng.ts      # mulberry32 + tohumlu yardımcılar (range, int, pick, shuffle)
  orb.ts      # prosedürel orb üreteci (4 motif: halka, ışın, spiral, uydu)
  game.ts     # saf oyun mantığı: makeBoard, reroll, guess, layout/cellAt
  audio.ts    # osilatör sentezi: correct/wrong/levelUp/gameOver + mute
  scores.ts   # localStorage skor tablosu
  main.ts     # durum makinesi, çizim, girdi, tam ekran canvas
tests/
  game.test.ts
```

## Alınan dersler (makalede de anlatılır)

- `sort(() => Math.random() - 0.5)` adil karıştırmaz — Fisher-Yates kullanın.
- Web Audio'da üstel sönüm zarfı olmadan her sesin sonunda "klik" duyulur.
- Dev sunucusunun HMR'ı entry modülünü sayfa yenilenmeden ikinci kez
  çalıştırabilir → iki oyun döngüsü aynı canvas'a çizer. `main.ts`'teki
  `window.__stopGame` koruması bunun için var.
- localStorage okurken `try/catch` şart: tek bozuk kayıt menüyü çökertir.

## Lisans

MIT
