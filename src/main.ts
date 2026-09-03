// SABİT YILDIZLAR — değişen gökyüzünde değişmeyeni bul.
// Sıfır asset: görseller orb.ts'te, sesler audio.ts'te, kayıt localStorage'da.
import { mulberry32 } from "./rng";
import { drawOrb } from "./orb";
import {
  LEVELS,
  PENALTY,
  type Board,
  makeBoard,
  reroll,
  guess,
  computeLayout,
  cellAt,
  cellCenter,
  type Layout,
} from "./game";
import { sfx, toggleMute, muted } from "./audio";
import { loadScores, saveScore } from "./scores";

// --- Çift yükleme koruması ---------------------------------------------------
// Dev sunucusu (HMR) bu modülü sayfa yenilenmeden ikinci kez çalıştırabilir.
// O zaman iki oyun aynı canvas'a çizer, iki sayaç birden işler — kaos.
// Yeni kopya başlarken eskisini durduruyoruz: döngü biter, dinleyiciler iptal.
const w = window as unknown as { __stopGame?: () => void };
w.__stopGame?.();
let running = true;
const aborter = new AbortController();
w.__stopGame = () => {
  running = false;
  aborter.abort();
};
const on = { signal: aborter.signal };

// --- Tam ekran canvas (önceki oyundan öğrendiğimiz desen) -------------------
let W = window.innerWidth;
let H = window.innerHeight;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
canvas.width = W;
canvas.height = H;

window.addEventListener(
  "resize",
  () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    orbCache.clear(); // hücre boyutu değişti, orblar yeniden çizilsin
  },
  on,
);

// --- Oyun durumu -------------------------------------------------------------
type State = "menu" | "playing" | "showcase" | "over";
let state: State = "menu";

const rng = mulberry32(Date.now() >>> 0);

let level = 0;
let board: Board;
let found = new Set<number>();
let elapsed = 0; // toplam süre (sn) — cezalar dahil
let rerollClock = 0; // gökyüzü değişim sayacı
let showcaseClock = 0;
let scores = loadScores();

// Doğru tahminde büyüyen halka animasyonları
interface Pulse {
  cell: number;
  t: number;
}
let pulses: Pulse[] = [];

function currentLayout(): Layout {
  return computeLayout(LEVELS[level], W, H, H * 0.14, H * 0.12);
}

function startLevel() {
  board = makeBoard(rng, LEVELS[level]);
  found = new Set();
  rerollClock = 0;
  pulses = [];
  orbCache.clear();
  state = "playing";
}

function startGame() {
  level = 0;
  elapsed = 0;
  startLevel();
}

// --- Orb önbelleği: seed → çizilmiş canvas -----------------------------------
const orbCache = new Map<number, HTMLCanvasElement>();

function orb(seed: number, size: number): HTMLCanvasElement {
  let c = orbCache.get(seed);
  if (!c || c.width !== size) {
    c = drawOrb(seed, size);
    orbCache.set(seed, c);
  }
  return c;
}

// --- Girdi -------------------------------------------------------------------
canvas.addEventListener(
  "pointerdown",
  (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;

    // Sol alt köşe: her durumda mute
    if (x < 80 && y > H - 80) {
      toggleMute();
      return;
    }

    if (state === "menu" || state === "over") {
      startGame();
      return;
    }

    if (state !== "playing") return;

    const cell = cellAt(currentLayout(), x, y);
    if (cell < 0) return;

    const result = guess(board, found, cell);
    if (result.correct && !result.alreadyFound) {
      sfx.correct();
      pulses.push({ cell, t: 0 });
      if (result.done) {
        sfx.levelUp();
        state = "showcase";
        showcaseClock = 0;
      }
    } else if (!result.correct) {
      sfx.wrong();
      elapsed += PENALTY; // yanlış tahmin: süreye +10
    }
  },
  on,
);

// --- Güncelleme --------------------------------------------------------------
function update(dt: number) {
  for (const p of pulses) p.t += dt;
  pulses = pulses.filter((p) => p.t < 0.8);

  if (state === "playing") {
    elapsed += dt;
    rerollClock += dt;
    if (rerollClock >= 1) {
      rerollClock = 0;
      reroll(rng, board); // gökyüzü değişir, sabit yıldızlar kalır
      orbCache.clear();
    }
  }

  if (state === "showcase") {
    showcaseClock += dt;
    if (showcaseClock >= 2.5) {
      level++;
      if (level < LEVELS.length) {
        startLevel();
      } else {
        scores = saveScore(Math.round(elapsed));
        sfx.gameOver();
        state = "over";
      }
    }
  }
}

// --- Çizim -------------------------------------------------------------------
function titleGradient(size: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, H * 0.04, 0, H * 0.04 + size);
  g.addColorStop(0, "#facc15");
  g.addColorStop(1, "#ec4899");
  return g;
}

function drawTitle() {
  const size = Math.min(W * 0.09, 52);
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = titleGradient(size);
  ctx.fillText("SABİT YILDIZLAR", W / 2, H * 0.09);
}

function drawMute() {
  ctx.fillStyle = muted ? "#57534e" : "#f59e0b";
  ctx.beginPath(); // basit hoparlör: gövde + koni
  ctx.moveTo(24, H - 52);
  ctx.lineTo(36, H - 52);
  ctx.lineTo(52, H - 64);
  ctx.lineTo(52, H - 28);
  ctx.lineTo(36, H - 40);
  ctx.lineTo(24, H - 40);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, H - 68);
    ctx.lineTo(58, H - 24);
    ctx.stroke();
  }
}

function drawGrid() {
  const l = currentLayout();
  const size = Math.round(l.cell * 0.92);
  board.seeds.forEach((seed, i) => {
    const { x, y } = cellCenter(l, i);
    ctx.drawImage(orb(seed, size), x - size / 2, y - size / 2);
  });

  // Bulunan sabit yıldızlar: kesikli beyaz halka
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  for (const i of found) {
    const { x, y } = cellCenter(l, i);
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Doğru tahmin dalgası: büyüyüp sönen halka
  for (const p of pulses) {
    const { x, y } = cellCenter(l, p.cell);
    ctx.globalAlpha = 1 - p.t / 0.8;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + p.t * size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawBottomUI() {
  const spec = LEVELS[level];
  ctx.font = `bold ${Math.min(W * 0.055, 30)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = titleGradient(30);
  ctx.fillText(`BUL: ${spec.eternals - found.size}`, W / 2, H - 36);

  // Sağ altta süre kutusu
  ctx.fillStyle = "#f59e0b";
  const tw = 110;
  ctx.beginPath();
  ctx.roundRect(W - tw - 20, H - 66, tw, 44, 8);
  ctx.fill();
  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText(`${Math.round(elapsed)}`, W - tw / 2 - 20, H - 34);

  drawMute();
}

function drawCenteredList(lines: string[], startY: number, lineH: number) {
  ctx.textAlign = "center";
  lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));
}

function drawMenu() {
  drawTitle();
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillStyle = "#d6d3d1";
  ctx.fillText("Gökyüzü her saniye değişiyor.", W / 2, H * 0.2);
  ctx.fillText("Değişmeyen yıldızları bul!", W / 2, H * 0.2 + 30);

  ctx.fillStyle = "#a8a29e";
  ctx.font = "20px monospace";
  if (scores.length) {
    ctx.fillText("EN İYİ SÜRELER", W / 2, H * 0.34);
    drawCenteredList(
      scores.map((s, i) => `${i + 1}.  ${s} sn`),
      H * 0.34 + 36,
      30,
    );
  }

  ctx.fillStyle = titleGradient(40);
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText("BAŞLAMAK İÇİN DOKUN", W / 2, H * 0.82);
  drawMute();
}

function drawShowcase() {
  drawTitle();
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText(`Seviye ${level + 1} tamam!`, W / 2, H * 0.22);

  // Bulunan sabit yıldızları büyük göster — küçük bir ödül anı
  const size = Math.min(W / (board.eternalSpots.length + 1), H * 0.2);
  const total = board.eternalSpots.length * (size + 16) - 16;
  board.eternalSpots.forEach((spot, i) => {
    const x = W / 2 - total / 2 + i * (size + 16);
    ctx.drawImage(
      orb(board.seeds[spot], Math.round(size)),
      x,
      H / 2 - size / 2,
    );
  });
}

function drawOver() {
  drawTitle();
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText(`Bitirdin! Süren: ${Math.round(elapsed)} sn`, W / 2, H * 0.22);

  ctx.fillStyle = "#a8a29e";
  ctx.font = "20px monospace";
  ctx.fillText("EN İYİ SÜRELER", W / 2, H * 0.32);
  drawCenteredList(
    scores.map((s, i) => `${i + 1}.  ${s} sn`),
    H * 0.32 + 36,
    30,
  );

  ctx.fillStyle = titleGradient(36);
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText("TEKRAR OYNA", W / 2, H * 0.85);
  drawMute();
}

function draw() {
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(0, 0, W, H);

  if (state === "menu") drawMenu();
  else if (state === "showcase") drawShowcase();
  else if (state === "over") drawOver();
  else {
    drawTitle();
    drawGrid();
    drawBottomUI();
  }
}

// --- Oyun döngüsü ------------------------------------------------------------
let last = performance.now();

function frame(now: number) {
  if (!running) return; // eski kopya sessizce ölür (çift yükleme koruması)
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
