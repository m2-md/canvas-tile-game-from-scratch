// Bir sayıdan bir orb: aynı tohum (seed) her zaman aynı orbu üretir.
// Görsel dosyası yok — her orb, çizim komutlarına dönüşmüş bir sayıdır.
import { type Rng, mulberry32, range, int, pick } from "./rng";

type Motif = (
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) => void;

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

// Motif 2: merkezden dışa ışınlar
function spokes(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) {
  const count = int(rng, 5, 12);
  const inner = range(rng, r * 0.15, r * 0.4);
  const outer = range(rng, r * 0.6, r * 0.9);
  ctx.strokeStyle = `hsl(${hue + int(rng, -30, 30)} 100% 65% / 0.7)`;
  ctx.lineWidth = range(rng, 1, r * 0.04);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + range(rng, 0, 0.3);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
}

// Motif 3: dışa açılan spiral
function spiral(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) {
  const turns = range(rng, 1.5, 3.5);
  const dir = pick(rng, [-1, 1]);
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.02) {
    const a = t * turns * Math.PI * 2 * dir;
    const rr = t * r * 0.8;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `hsl(${hue + int(rng, -20, 20)} 100% 70% / 0.8)`;
  ctx.lineWidth = range(rng, 1.5, r * 0.05);
  ctx.stroke();
}

// Motif 4: yörüngedeki uydu noktaları
function satellites(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) {
  const count = int(rng, 3, 8);
  const orbit = range(rng, r * 0.45, r * 0.8);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + range(rng, 0, 0.4);
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * orbit,
      Math.sin(a) * orbit,
      range(rng, r * 0.03, r * 0.09),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `hsl(${hue + int(rng, -50, 50)} 100% ${int(rng, 60, 80)}%)`;
    ctx.fill();
  }
}

const MOTIFS: Motif[] = [rings, spokes, spiral, satellites];

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
