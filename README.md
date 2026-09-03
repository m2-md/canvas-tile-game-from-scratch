# FIXED STARS — A Zero-Asset Pattern Game

<!-- LINKS:BEGIN — üretildi: scripts/sync-repo-links.py · elle düzenleme -->
**▶ [Live demo](https://m2-md.github.io/canvas-tile-game-from-scratch/)** · [Source](https://github.com/m2-md/canvas-tile-game-from-scratch)
<!-- LINKS:END -->

Working code for the article "A Game with Zero Assets: Procedural Graphics, Web
Audio and a Pattern Game in Canvas". In a sky of orbs that change every second you
try to find the **unchanging** ones. All of it is produced from code:

- **Visuals:** `src/orb.ts` — seeded procedural orbs; no image files
- **Sounds:** `src/audio.ts` — Web Audio oscillators; no mp3
- **Scores:** `src/scores.ts` — localStorage; no server
- Production build: **JS 3.83 KB gzip** (verify with `npm run build`)

## Setup and running

```bash
npm install
npm run dev     # http://localhost:5173 (or whatever port Vite gives you)
```

**How to play:** Tap/start → the orbs in the grid change every second, a few never
change at all (the fixed stars). Click them. A wrong guess adds **+10 s** to your
time. 5 levels; the grid grows from 4×5 to 7×9. The lowest times are written to the
scoreboard. Bottom left corner: sound on/off.

## Tests

```bash
npm test        # 17 unit tests
```

The tests verify the pure logic: rng determinism, Fisher-Yates permutation, board
setup (unique seeds, valid eternal points), the `reroll` contract (the eternals
stay, the others change), the guess flow, grid math (`cellAt` ↔ `cellCenter`
inverse), localStorage scores (including corrupt data).

## File layout

```
src/
  rng.ts      # mulberry32 + seeded helpers (range, int, pick, shuffle)
  orb.ts      # procedural orb generator (4 motifs: ring, ray, spiral, satellite)
  game.ts     # pure game logic: makeBoard, reroll, guess, layout/cellAt
  audio.ts    # oscillator synthesis: correct/wrong/levelUp/gameOver + mute
  scores.ts   # localStorage scoreboard
  main.ts     # state machine, drawing, input, fullscreen canvas
tests/
  game.test.ts
```

## Lessons learned (also told in the article)

- `sort(() => Math.random() - 0.5)` does not shuffle fairly — use Fisher-Yates.
- Without an exponential decay envelope in Web Audio you hear a "click" at the end
  of every sound.
- The dev server's HMR can run the entry module a second time without reloading the
  page → two game loops draw to the same canvas. The `window.__stopGame` guard in
  `main.ts` exists for this.
- `try/catch` is mandatory when reading localStorage: a single corrupt record
  crashes the menu.

## License

MIT
