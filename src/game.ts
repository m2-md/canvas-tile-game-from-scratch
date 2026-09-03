// Saf oyun mantığı — DOM yok, canvas yok, yan etki yok.
// Çizim çizer, mantık bilir: bu dosya testlerde başsız (headless) çalışır.
import { type Rng, shuffle } from "./rng";

export interface LevelSpec {
  cols: number;
  rows: number;
  eternals: number; // bulunacak sabit yıldız sayısı
}

export const LEVELS: LevelSpec[] = [
  { cols: 4, rows: 5, eternals: 2 },
  { cols: 5, rows: 6, eternals: 3 },
  { cols: 6, rows: 7, eternals: 4 },
  { cols: 6, rows: 8, eternals: 5 },
  { cols: 7, rows: 9, eternals: 6 },
];

export const PENALTY = 10; // yanlış tahmin: +10 saniye

export interface Board {
  seeds: number[]; // her hücrenin orb tohumu
  eternalSpots: number[]; // değişmeyen hücrelerin indexleri
}

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

// Gökyüzünü değiştir: eternaller kalır, geri kalan her hücre yeni tohum alır
export function reroll(rng: Rng, board: Board): void {
  board.seeds = board.seeds.map((s, i) =>
    board.eternalSpots.includes(i) ? s : Math.floor(rng() * 1e9),
  );
}

export interface GuessResult {
  correct: boolean;
  alreadyFound: boolean;
  done: boolean; // seviyedeki tüm eternaller bulundu mu?
}

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

// --- Izgara yerleşimi ve tek satırlık "çarpışma testi" ----------------------

export interface Layout {
  cols: number;
  rows: number;
  cell: number; // kare hücre kenarı (px)
  ox: number; // ızgaranın sol üst köşesi
  oy: number;
}

// Ekrana sığan en büyük kare hücreyi bul, ızgarayı ortala
export function computeLayout(
  spec: LevelSpec,
  W: number,
  H: number,
  top: number,
  bottom: number,
): Layout {
  const availW = W * 0.94;
  const availH = H - top - bottom;
  const cell = Math.min(availW / spec.cols, availH / spec.rows);
  return {
    cols: spec.cols,
    rows: spec.rows,
    cell,
    ox: (W - cell * spec.cols) / 2,
    oy: top + (availH - cell * spec.rows) / 2,
  };
}

// Piksel → hücre index. Izgara dışıysa -1.
// Çarpışma testinin en ucuz hali: iki bölme, bir çarpma.
export function cellAt(l: Layout, x: number, y: number): number {
  const cx = Math.floor((x - l.ox) / l.cell);
  const cy = Math.floor((y - l.oy) / l.cell);
  if (cx < 0 || cx >= l.cols || cy < 0 || cy >= l.rows) return -1;
  return cy * l.cols + cx;
}

// Hücre index → merkez noktası (çizim için)
export function cellCenter(l: Layout, i: number): { x: number; y: number } {
  return {
    x: l.ox + (i % l.cols) * l.cell + l.cell / 2,
    y: l.oy + Math.floor(i / l.cols) * l.cell + l.cell / 2,
  };
}
