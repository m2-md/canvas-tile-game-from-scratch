import { describe, it, expect, beforeEach } from "vitest";
import { mulberry32, shuffle, int } from "../src/rng";
import {
  LEVELS,
  makeBoard,
  reroll,
  guess,
  computeLayout,
  cellAt,
  cellCenter,
} from "../src/game";
import { loadScores, saveScore } from "../src/scores";

describe("rng: seed determinism", () => {
  it("same seed produces same sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("different seeds produce different sequences", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, a);
    const seqB = Array.from({ length: 10 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it("values remain in [0, 1) range", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("generates int including bounds", () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(int(rng, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("shuffle is a permutation (loses no elements)", () => {
    const rng = mulberry32(5);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const mixed = shuffle(rng, arr);
    expect([...mixed].sort((a, b) => a - b)).toEqual(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // original is not mutated
  });
});

describe("makeBoard: board setup", () => {
  it("generates as many unique seeds as cell count", () => {
    const rng = mulberry32(11);
    const spec = LEVELS[0]; // 4x5, 2 eternal
    const board = makeBoard(rng, spec);
    expect(board.seeds).toHaveLength(20);
    expect(new Set(board.seeds).size).toBe(20);
  });

  it("selects correct number of unique, valid eternal spots", () => {
    const rng = mulberry32(13);
    for (const spec of LEVELS) {
      const board = makeBoard(rng, spec);
      expect(board.eternalSpots).toHaveLength(spec.eternals);
      expect(new Set(board.eternalSpots).size).toBe(spec.eternals);
      for (const s of board.eternalSpots) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(spec.cols * spec.rows);
      }
    }
  });
});

describe("reroll: sky changes, fixed stars remain", () => {
  it("preserves eternal seeds, changes the others", () => {
    const rng = mulberry32(17);
    const board = makeBoard(rng, LEVELS[0]);
    const before = [...board.seeds];
    reroll(rng, board);
    board.seeds.forEach((seed, i) => {
      if (board.eternalSpots.includes(i)) {
        expect(seed).toBe(before[i]); // fixed star: same
      } else {
        expect(seed).not.toBe(before[i]); // sky: changed
      }
    });
  });
});

describe("guess: guess logic", () => {
  it("correct -> added to found; done when all found", () => {
    const rng = mulberry32(19);
    const board = makeBoard(rng, LEVELS[0]);
    const found = new Set<number>();
    const [e1, e2] = board.eternalSpots;

    const r1 = guess(board, found, e1);
    expect(r1).toEqual({ correct: true, alreadyFound: false, done: false });

    const r2 = guess(board, found, e2);
    expect(r2).toEqual({ correct: true, alreadyFound: false, done: true });
  });

  it("clicking same eternal twice does not count again", () => {
    const rng = mulberry32(23);
    const board = makeBoard(rng, LEVELS[0]);
    const found = new Set<number>();
    const e1 = board.eternalSpots[0];
    guess(board, found, e1);
    const again = guess(board, found, e1);
    expect(again.alreadyFound).toBe(true);
    expect(found.size).toBe(1);
  });

  it("wrong cell returns correct=false, found does not grow", () => {
    const rng = mulberry32(29);
    const board = makeBoard(rng, LEVELS[0]);
    const found = new Set<number>();
    const wrongCell = board.seeds.findIndex(
      (_, i) => !board.eternalSpots.includes(i),
    );
    const r = guess(board, found, wrongCell);
    expect(r.correct).toBe(false);
    expect(found.size).toBe(0);
  });
});

describe("layout: grid math", () => {
  const spec = LEVELS[0]; // 4x5
  const l = computeLayout(spec, 800, 1200, 150, 120);

  it("grid fits screen", () => {
    expect(l.ox).toBeGreaterThanOrEqual(0);
    expect(l.oy).toBeGreaterThanOrEqual(150);
    expect(l.ox + l.cell * l.cols).toBeLessThanOrEqual(800);
    expect(l.oy + l.cell * l.rows).toBeLessThanOrEqual(1200 - 120 + 0.001);
  });

  it("cellAt is the inverse of cellCenter (for every cell)", () => {
    for (let i = 0; i < spec.cols * spec.rows; i++) {
      const { x, y } = cellCenter(l, i);
      expect(cellAt(l, x, y)).toBe(i);
    }
  });

  it("returns -1 outside grid", () => {
    expect(cellAt(l, 1, 1)).toBe(-1); // top-left corner (header area)
    expect(cellAt(l, 799, 1199)).toBe(-1); // bottom-right corner (UI area)
    expect(cellAt(l, -5, 500)).toBe(-1);
  });
});

describe("scores: localStorage leaderboard", () => {
  beforeEach(() => {
    // In Node environment localStorage does not exist — minimal mock is sufficient
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it("scores are sorted ascending", () => {
    saveScore(120);
    saveScore(80);
    const scores = saveScore(100);
    expect(scores).toEqual([80, 100, 120]);
  });

  it("keeps at most 10 scores", () => {
    for (let i = 1; i <= 15; i++) saveScore(i * 10);
    expect(loadScores()).toHaveLength(10);
    expect(loadScores()[0]).toBe(10); // keeps the best
  });

  it("corrupted data does not crash game", () => {
    localStorage.setItem("sabit-yildizlar-scores", "{invalid json");
    expect(loadScores()).toEqual([]);
  });
});
