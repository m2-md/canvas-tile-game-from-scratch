// One number, one orb: the same seed always produces the same orb.
// No image files — every orb is a number transformed into canvas draw commands.
import { type Rng, mulberry32, range, int, pick } from "./rng";

type Motif = (
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  r: number,
  hue: number,
) => void;

// Motif 1: concentric rings
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

// Motif 2: radial spokes from center
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

// Motif 3: expanding spiral
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

// Motif 4: orbiting satellite dots
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

  ctx.translate(half, half); // center = (0,0): simplifies motifs

  // Glass sphere: radial gradient fading from bright core to dark perimeter
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, `hsl(${hue} 100% 72%)`);
  glow.addColorStop(0.35, `hsl(${hue} 90% 40% / 0.9)`);
  glow.addColorStop(1, "hsl(0 0% 5%)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // No leaking outside sphere: clip motifs to circle
  ctx.clip();

  // Additive blending: overlapping lines glow brighter (neon look)
  ctx.globalCompositeOperation = "lighter";

  // Each orb carries 2-3 random motifs — combinatorial explosion ensures uniqueness
  const layerCount = int(rng, 2, 3);
  for (let i = 0; i < layerCount; i++) {
    pick(rng, MOTIFS)(ctx, rng, r, hue);
  }

  return c;
}
