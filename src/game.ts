// Pure game logic — no DOM, no canvas, no side effects.
// Renderer draws, logic knows: runs headless in unit tests.
import { type Rng, shuffle } from "./rng";

export interface LevelSpec {
  cols: number;
  rows: number;
  eternals: number; // number of fixed stars to find
}

export const LEVELS: LevelSpec[] = [
  { cols: 4, rows: 5, eternals: 2 },
  { cols: 5, rows: 6, eternals: 3 },
  { cols: 6, rows: 7, eternals: 4 },
  { cols: 6, rows: 8, eternals: 5 },
  { cols: 7, rows: 9, eternals: 6 },
];

export const PENALTY = 10; // wrong guess: +10 seconds

export interface Board {
  seeds: number[]; // orb seed for each cell
  eternalSpots: number[]; // indices of unchanging cells
}

// New board: unique seed per cell, random cells designated as eternal
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

// Reroll sky: eternals remain, every other cell gets a new seed
export function reroll(rng: Rng, board: Board): void {
  board.seeds = board.seeds.map((s, i) =>
    board.eternalSpots.includes(i) ? s : Math.floor(rng() * 1e9),
  );
}

export interface GuessResult {
  correct: boolean;
  alreadyFound: boolean;
  done: boolean; // are all eternals in the level found?
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

// --- Grid layout and single-line "collision test" ----------------------

export interface Layout {
  cols: number;
  rows: number;
  cell: number; // square cell size (px)
  ox: number; // grid top-left origin x
  oy: number;
}

// Find largest square cell fitting available screen area, center the grid
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

// Pixel -> cell index. Returns -1 if outside grid.
// Cheapest collision check: two divisions, one multiplication.
export function cellAt(l: Layout, x: number, y: number): number {
  const cx = Math.floor((x - l.ox) / l.cell);
  const cy = Math.floor((y - l.oy) / l.cell);
  if (cx < 0 || cx >= l.cols || cy < 0 || cy >= l.rows) return -1;
  return cy * l.cols + cx;
}

// Cell index -> center coordinate (for rendering)
export function cellCenter(l: Layout, i: number): { x: number; y: number } {
  return {
    x: l.ox + (i % l.cols) * l.cell + l.cell / 2,
    y: l.oy + Math.floor(i / l.cols) * l.cell + l.cell / 2,
  };
}
