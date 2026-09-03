# Sıfır Asset'li Oyun: Canvas'ta Prosedürel Grafik, Web Audio ve Bir Desen Oyunu

*Görseli MidJourney'den, sesi ses paketinden indirmek yerine her pikseli ve her notayı koddan üretiyoruz — ortaya "SABİT YILDIZLAR" çıkıyor.*

*Tahmini okuma süresi: 14 dakika*

---

"Gezegen" kelimesi Yunanca *planetes*'ten gelir: "gezen". Eski gökbilimciler teleskopsuz, katalogsuz, fotoğrafsız bir gökyüzüne bakıp gezegenleri nasıl ayırt etti? Gökyüzünü ezberlediler. Binlerce yıldız her gece aynı yerinde duruyordu; ama birkaç parlak nokta kurallara uymuyor, geziniyordu. Değişmeyenin içinde değişeni gördüler.

Bu yazıda tersini oynayacağız: her saniye değişen bir gökyüzünde **değişmeyeni** bulacaksınız.

Oyunun ilhamı, geçenlerde okuduğum bir tile game tutorial'ı. Mekanik zekiceydi: bir ızgara dolusu parlak "plazma orbu" sürekli değişiyor, birkaç tanesi hep aynı kalıyor — onları bulan kazanıyor. Ama kodun yanında bir alışveriş listesi vardı: orb görselleri MidJourney'den üretilmiş bir jpg, sesler hazır bir audiosprite dosyası, logo Google Fonts'tan, skor tablosu framework'ün sunucusundan. Oyunun *kalbi* olan orblar, kodun dokunamadığı bir resim dosyasıydı.

Aklıma takılan soru şuydu: bir oyunun **tek bir dosya bile indirmeden** var olması mümkün mü? Görsel yok, ses yok, font yok, sunucu yok. Sadece kod.

Mümkünmüş. Hem de sandığınızdan kısa. Bu yazının sonunda elinizde beş seviyeli, sesli, skor tablolu, her ekranda çalışan bir oyun olacak — ve `assets/` klasörü diye bir şey olmayacak. Çünkü bir görsel dosyası aslında *dondurulmuş çizim komutlarıdır*, bir mp3 *dondurulmuş sestir*. Biz dondurmayacağız; tarifin kendisini tutacağız.

### Her Şeyin Temeli: Tohum

Prosedürel üretimin bütün sırrı tek bir fikirde saklı: **kontrollü rastgelelik**.

`Math.random()` her çağrıda farklı sonuç verir — güzel, ama dizginsiz. Aynı orbu bir saniye sonra tekrar çizmek isterseniz şansınız yok; test yazmak isterseniz hiç yok. İhtiyacımız olan şey, bir sayı verdiğimizde hep aynı "rastgele" diziyi üreten bir fonksiyon. Bu sayıya **tohum** (seed) denir. Aynı tohumdan hep aynı çiçek açar.

```ts
// src/rng.ts
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
```

Bu, mulberry32 — bit operasyonlarıyla sayıyı iyice karıştırıp 0 ile 1 arasına sıkıştıran, 32-bit'lik minicik bir PRNG (pseudo-random number generator, *sözde rastgele sayı üreteci*). İçindeki sihirli sabitleri ezberlemenize gerek yok; kimse ezberlemiyor. Önemli olan sözleşmesi: `mulberry32(42)` bugün de, yarın da, sizin makinenizde de aynı diziyi üretir.

Bir yardımcıya daha ihtiyacımız var — diziyi karıştırmak için. Ve burada küçük bir tuzak uyarısı: internette sık görülen `arr.sort(() => Math.random() - 0.5)` hilesi **adil karıştırmaz** (bazı permütasyonlar diğerlerinden daha olası çıkar). Doğrusu Fisher-Yates:

```ts
// src/rng.ts
// Fisher-Yates: her permütasyon eşit olasılıkla (sort(random) hilesi değil!)
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

`rng`'yi parametre olarak alıyor — `Math.random`'a değil, bizim tohumlu üretecimize bağlı. Testlerde `mulberry32(5)` verirsiniz, sonuç deterministiktir. Bu ufak disiplin birazdan meyvesini verecek.

### Bir Sayıdan Bir Orb

Şimdi yazının en keyifli kısmı. O parlak plazma orblarını çizeceğiz — resim dosyası yok, her orb bir `seed` sayısından doğuyor.

Bir orb üç katmandan oluşuyor. Önce **cam küre**: merkezde parlak, kenara doğru karanlığa sönen bir radial gradient. Sonra **motifler**: halkalar, ışınlar, spiraller, yörünge noktaları — orb'un karakterini veren süsler. En sonda da küçük ama etkisi büyük bir numara: `globalCompositeOperation = "lighter"`, yani üst üste binen çizgilerin renklerini *toplayarak* çizmek. Neon parlamasının bütün sırrı bu tek satır.

```ts
// src/orb.ts
export function drawOrb(seed: number, size: number): HTMLCanvasElement {
  const rng = mulberry32(seed);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;
  const r = half * 0.92;
  const hue = int(rng, 0, 359);

  ctx.translate(half, half); // merkez = (0,0): motifler basitleşir

  // Cam küre: parlak çekirdekten karanlığa sönen radial gradient
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, `hsl(${hue} 100% 72%)`);
  glow.addColorStop(0.35, `hsl(${hue} 90% 40% / 0.9)`);
  glow.addColorStop(1, "hsl(0 0% 5%)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Küre dışına taşma yok: motifler daireye kırpılır
  ctx.clip();

  // Işık toplansın: üst üste binen çizgiler parlaklaşır (neon hissi)
  ctx.globalCompositeOperation = "lighter";

  // Her orb 2-3 rastgele motif taşır — kombinasyon patlaması benzersizliği getirir
  const layerCount = int(rng, 2, 3);
  for (let i = 0; i < layerCount; i++) {
    pick(rng, MOTIFS)(ctx, rng, r, hue);
  }

  return c;
}
```

Dikkat: fonksiyon ekrana çizmiyor, bir `HTMLCanvasElement` *döndürüyor*. Görünmeyen (offscreen) bir canvas'a çiziyoruz; oyun bu küçük tuvali `drawImage` ile ızgaraya damgalıyor ve bir kez çizilen orb önbellekten geliyor.

Motifler ise sıradan çizim fonksiyonları. İşte en basiti:

```ts
// src/orb.ts
// Motif 1: eş merkezli halkalar
function rings(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) {
  const count = int(rng, 1, 3);
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, range(rng, r * 0.3, r * 0.85), 0, Math.PI * 2);
    ctx.strokeStyle = `hsl(${hue + int(rng, -40, 40)} 100% ${int(rng, 55, 75)}% / 0.8)`;
    ctx.lineWidth = range(rng, 1, r * 0.06);
    ctx.stroke();
  }
}
```

Diğer üçü (ışınlar, spiral, uydular) aynı şablonun varyasyonları — repoda hepsi var. Asıl güç kombinasyonda: 4 motif × 2-3 katman × her katmanın kendi sayı/renk/boyut zarları... Pratikte iki orb'un aynı çıkması imkânsıza yakın. Yüz orbluk bir spritesheet'in yerini, dört tane sekiz satırlık fonksiyon aldı.

Peki bu MidJourney görsellerinden güzel mi? Açık konuşayım: hayır, o orblar daha zengin. Ama bunlar *bizim*. İstediğimiz an yeni motif ekleriz, renk paletini tek satırla değiştiririz, boyutu ekrana göre üretiriz — ve kimseden izin istemeyiz. Prosedürel üretimin takası budur: ham güzellikten biraz verir, kontrolün tamamını alırsınız.

### Oyunun Beyni: Saf Fonksiyonlar

Fizik motoru yazısında bir ilke bırakmıştım: motor fiziği bilir, oyunu bilmez. Aynı ilkenin bu oyundaki karşılığı: **çizim çizer, mantık bilir.** Oyunun bütün kuralları DOM'suz, canvas'sız, yan etkisiz fonksiyonlarda yaşıyor — çünkü tarayıcı gerektirmeyen kod, testte de çalışır.

Tahta kurulumu:

```ts
// src/game.ts
// Yeni tahta: her hücreye benzersiz tohum, rastgele hücrelere eternal damgası
export function makeBoard(rng: Rng, spec: LevelSpec): Board {
  const cellCount = spec.cols * spec.rows;
  const used = new Set<number>();
  const seeds: number[] = [];
  while (seeds.length < cellCount) {
    const s = Math.floor(rng() * 1e9);
    if (!used.has(s)) {
      used.add(s);
      seeds.push(s);
    }
  }
  const allSpots = [...Array(cellCount).keys()];
  const eternalSpots = shuffle(rng, allSpots).slice(0, spec.eternals);
  return { seeds, eternalSpots };
}
```

Tahta dediğimiz şeye bakın: sadece bir sayı dizisi (`seeds`) ve birkaç index (`eternalSpots`). Orijinal tutorial'da bu iş, 100 karelik spritesheet'ten kare *ödünç alma* ve array cerrahisiyle dönüyordu. Bizde her hücre kendi tohumunu taşıyor — orb'un görüntüsü o sayının içinde şifreli.

Gökyüzünün değişmesi de tek bir map:

```ts
// src/game.ts
// Gökyüzünü değiştir: eternaller kalır, geri kalan her hücre yeni tohum alır
export function reroll(rng: Rng, board: Board): void {
  board.seeds = board.seeds.map((s, i) =>
    board.eternalSpots.includes(i) ? s : Math.floor(rng() * 1e9),
  );
}
```

Sabit yıldız tohumunu korur, gezegenler yeni tohum alır. Oyunun bütün "sihri" bu üç satırda.

Tahmin mantığı da aynı sadelikte — üç soruya cevap veren küçük bir fonksiyon: doğru mu, zaten bulunmuş muydu, seviye bitti mi?

```ts
// src/game.ts
export function guess(
  board: Board,
  found: Set<number>,
  cell: number,
): GuessResult {
  const correct = board.eternalSpots.includes(cell);
  const alreadyFound = found.has(cell);
  if (correct && !alreadyFound) found.add(cell);
  return {
    correct,
    alreadyFound,
    done: found.size === board.eternalSpots.length,
  };
}
```

`alreadyFound` kontrolü kritik: aynı eternal'e iki kez tıklamak iki bulma sayılmamalı. Orijinal tutorial bunu `correct` dizisiyle çözüyordu; `Set` aynı işi doğal olarak yapar.

### Dünyanın En Ucuz Çarpışma Testi

Fizik oyununda çarpışma için mesafeler, normaller, impulse'lar hesaplamıştık. Izgara oyununun güzelliği şurada: hangi hücreye tıklandığını bulmak için *hiçbir şeyle* çarpışmanıza gerek yok. Izgara zaten matematiksel bir nesne — piksel koordinatını hücre indexine çeviren şey iki bölme, bir çarpma:

```ts
// src/game.ts
// Piksel → hücre index. Izgara dışıysa -1.
// Çarpışma testinin en ucuz hali: iki bölme, bir çarpma.
export function cellAt(l: Layout, x: number, y: number): number {
  const cx = Math.floor((x - l.ox) / l.cell);
  const cy = Math.floor((y - l.oy) / l.cell);
  if (cx < 0 || cx >= l.cols || cy < 0 || cy >= l.rows) return -1;
  return cy * l.cols + cx;
}
```

Yirmi orb'a tek tek "sana mı tıklandı?" diye sormak yok. Tıklama noktasından hücre koordinatına doğrudan atlıyoruz. Bin hücrelik ızgarada da aynı maliyet: sıfıra yakın.

Bu fonksiyonların hepsi saf olduğu için test etmek zevke dönüşüyor. Projede 17 birim testi var; en sevdiğim, `reroll`'un sözleşmesini doğrulayan:

```ts
// tests/game.test.ts
it("eternal tohumları korur, diğerlerini değiştirir", () => {
  const rng = mulberry32(17);
  const board = makeBoard(rng, LEVELS[0]);
  const before = [...board.seeds];
  reroll(rng, board);
  board.seeds.forEach((seed, i) => {
    if (board.eternalSpots.includes(i)) {
      expect(seed).toBe(before[i]); // sabit yıldız: aynı
    } else {
      expect(seed).not.toBe(before[i]); // gökyüzü: değişti
    }
  });
});
```

Tohumlu üretecin karşılığı burada ödeniyor: `mulberry32(17)` her koşuda aynı tahtayı kurar. Rastgeleliğe dayanan bir oyunun deterministik testleri olması — başta verdiğimiz ufak disiplinin geri dönüşü.

### Ses Dosyası Değil, Ses Tarifi

Sıra seste. Yaklaşım aynı: mp3 indirmek yerine sesi üretmek. Web Audio API ile bir osilatör kurup frekans ve süre veriyorsunuz; ses, hoparlöre giden matematik:

```ts
// src/audio.ts
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
```

`exponentialRampToValueAtTime` satırı önemli: sesi aniden kesmek yerine üstel olarak söndürüyor. Bunu atlarsanız her sesin sonunda "klik" duyarsınız — hoparlör membranının aniden bırakılmasının sesi bu. Küçük bir zarf (envelope), büyük bir fark.

Efektler de birer tarif. "Doğru" sesi bir beşli aralık, "yanlış" sesi kalın bir testere dişi:

```ts
// src/audio.ts — sfx'in ilk iki üyesi (levelUp/gameOver aynı dosyada)
export const sfx = {
  correct() {
    tone(660, 0.15);
    tone(990, 0.3, "sine", 0.12); // beşli aralık: "doğru" hissi
  },
  wrong() {
    tone(110, 0.35, "sawtooth", 0.22); // kalın testere: "olmadı"
  },
  // levelUp() ve gameOver(): yükselen/inen arpej fanfarları
};
```

Neden 660 ve 990? Frekans oranı 2:3 — müzikte *tam beşli*. Kulağımız bu oranı "çözülmüş, olumlu" duyar; yüzyıllardır zafer tantanaları bu aralığa yaslanır. İki satır kodla müzik teorisinden ödünç aldığımız şey, oyuncunun "doğru bildim" hissi.

Bir uyarı: tarayıcılar `AudioContext`'i kullanıcı etkileşimi olmadan başlatmaz (otomatik çalan reklamlara borçluyuz). `??=` ile ilk sese kadar erteliyoruz; ilk ses zaten hep bir tıklamadan sonra geldiği için sorun kendiliğinden çözülüyor.

### Kayıt Defteri: localStorage

Orijinal oyun skorları framework'ün sunucusuna yazıyordu — bir veri kimliği için form doldurup onay bekliyordunuz. Tek oyunculu bir oyunun "en iyi sürelerim" listesi için sunucu, bana hep fazla geldi. Tarayıcının kendi kayıt defteri yeterli:

```ts
// src/scores.ts
// En düşük 10 süreyi tutar, yenisini ekleyip sıralı listeyi döner
export function saveScore(time: number): number[] {
  const scores = [...loadScores(), time].sort((a, b) => a - b).slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(scores));
  return scores;
}
```

`loadScores` tarafında `try/catch` var — çünkü localStorage'a bir kez bile bozuk veri girerse (uzantılar, elle kurcalama, eski sürüm) `JSON.parse` fırlatır ve oyununuz *menüde* çöker. Kayıt okuma kodu, paranoyak olmayı hak eden nadir yerlerdendir.

### Parçaları Birleştirmek

Geri kalanı, fizik yazısından tanıdığınız iskelet: `requestAnimationFrame` döngüsü, `dt` ile zaman, viewport boyutunda canvas (daireler daire kalsın diye CSS ölçeklemesi yok — o dersin tamamı önceki yazıda). Üstüne minicik bir durum makinesi: `menu → playing → showcase → over`. Gökyüzü değişimi de döngünün içinde bir saniye sayacı:

```ts
// src/main.ts — oyun döngüsündeki güncelleme
  if (state === "playing") {
    elapsed += dt;
    rerollClock += dt;
    if (rerollClock >= 1) {
      rerollClock = 0;
      reroll(rng, board); // gökyüzü değişir, sabit yıldızlar kalır
      orbCache.clear();
    }
  }
```

Oyunlaştırma dokunuşları orijinaldekiyle aynı ruhta: yanlış tahmine **+10 saniye ceza** (aceleyle her yere tıklamayı acıtır), seviye sonunda bulduğunuz yıldızların büyük gösterildiği kısa bir "vitrin" anı, beş seviyede 4×5'ten 7×9'a büyüyen ızgara. Zorluk kendiliğinden tırmanıyor: 63 hücrede 6 sabit yıldız bulmak, 20 hücrede 2 bulmaya hiç benzemiyor.

Bu arada itiraf: oyunu test ederken sayacım bir ara 219 saniye gösterdi — daha 20 saniye oynamışken. Bir saat kodda hata aradım; hata kodda değildi. Dev sunucusunun sıcak yenilemesi (hot reload) oyun modülünü sayfayı yenilemeden ikinci kez çalıştırmış, iki oyun *aynı canvas'a* çiziyordu: iki döngü, iki sayaç, tıklama başına iki tahmin. Çözüm, modülün başına eski kopyayı durduran birkaç satır koymak. Tarayıcıda "imkânsız" bir durum görürseniz aklınızda olsun: bazen kodunuz yanlış değildir, iki tane çalışıyordur.

### Peki Ne Kadar Küçük?

Söz vermiştim: `assets/` klasörü yok. Peki toplam ne kadar?

Üretim build'i — oyunun tamamı, beş seviye, ses, skor tablosu dahil — **gzip'le 3.83 KB** JavaScript (HTML ile birlikte 4.3 KB). Ölçtüm, uydurmuyorum. Orijinal oyunun tek başına orb spritesheet'i bunun yüzlerce katı. Yükleme çubuğuna gerek kalmadı çünkü yüklenecek bir şey yok.

Adil olmak gerekirse: bu karşılaştırma biraz elmayla armut. ZIM koca bir framework taşıyor çünkü size Tile, Emitter, LeaderBoard, Timer hazır veriyor; biz hepsini elle yazdık. Hangisi "daha iyi" değil mesele — mesele, elle yazınca bunların ne kadar *küçük* şeyler olduğunu görmek. Tile bir bölme işlemi, LeaderBoard bir sort+slice, Emitter bir parçacık dizisi. Kutunun içi, kutudan küçük.

### Özetle:

1. Prosedürel üretimin temeli tohumlu rastgelelik: `mulberry32(seed)` → hep aynı dizi → tekrarlanabilir görseller ve deterministik testler.
2. Karıştırma işi Fisher-Yates'in; `sort(() => Math.random() - 0.5)` adil değildir.
3. Bir orb = radial gradient + `clip()` + `lighter` modunda 2-3 motif. Kombinasyon patlaması benzersizliği bedavaya getirir.
4. Çizim çizer, mantık bilir: kurallar saf fonksiyonlarda yaşarsa testler tarayıcısız koşar.
5. Izgarada çarpışma testi yoktur: `cellAt` iki bölme, bir çarpmadır.
6. Ses dosyası yerine osilatör + üstel sönüm zarfı; "doğru" hissi bir beşli aralıktır (2:3).
7. Tek oyunculu skor tablosuna sunucu gerekmez: localStorage + `try/catch`.
8. Dev sunucusunda "imkânsız" bug görürseniz: modülünüz iki kez çalışıyor olabilir.

Kodun tamamı — orb üreteci, oyun mantığı, 17 test ve oyunun kendisi — GitHub'da; `npm install && npm run dev` ile bir dakikada gökyüzündesiniz.

Bu oyunu yazarken en çok şuna şaştım: "asset" dediğimiz şeylerin ne kadarının aslında dondurulmuş kod olduğuna. Bir spritesheet, birinin bir zamanlar çalıştırdığı çizim komutlarının çıktısı; bir mp3, bir sentezleyicinin donmuş nefesi. Prosedürel üretim yeni bir şey icat etmiyor — sadece dondurucuyu kapatıp tarifi ocağa geri koyuyor. Ve tarif elinizdeyse, yemeği istediğiniz kadar değiştirebilirsiniz. 🌌⚙️
