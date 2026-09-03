// High scores — no server, no database: localStorage is sufficient.
const KEY = "sabit-yildizlar-scores";

export function loadScores(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return []; // corrupted data will not break the game
  }
}

// Keeps lowest 10 times, appends new one and returns sorted list
export function saveScore(time: number): number[] {
  const scores = [...loadScores(), time].sort((a, b) => a - b).slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(scores));
  return scores;
}
