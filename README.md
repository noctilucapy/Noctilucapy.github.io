# Noctiluca

Adaptive Python practice for your phone. Short challenges that meet you at your level, never repeat, and slowly deepen. Python runs in your browser (Pyodide in a Web Worker), so it works offline after the first run.

Design language: Abyssal Liturgy (void, bone, silver; Cormorant Garamond, Jost, JetBrains Mono).

## Quick start

```
npm install
npm run verify     # runs every challenge in python3 and bakes expected outputs
npm run simulate   # simulated learners against the engine
npm run build
```

Deploys to GitHub Pages with `.github/workflows/pages.yml` (base path `/`, for the user site noctilucapy.github.io).

## How the engine works

- **Rating.** Elo-style skill per learner and per concept (logistic, 400 scale). Only clean solves give full credit; helped solves give 30 percent.
- **Flow target.** A PID-like controller aims for about 72 percent predicted success (clamped 55 to 90), and gives a breather after struggle.
- **Session arc.** Five slots: warmup, core, core, review, stretch, planned one step at a time by the pure function `planNext(save, catalog, now)`.
- **No sudden jumps.** Each slot has a hard difficulty window tied to recent clean solves, so a new level can never leap far above what you just did.
- **No repeats.** Prompt hashes, family cooldowns and endless seeded drill variants. Swap a challenge twice per session without penalty.
- **Spaced review.** Leitner intervals of 0, 1, 3, 7, 16, 35 days.
- **XP.** Solved, clean solve, under par, stretch and craft bonuses, streak multiplier up to x1.25. Level curve `round(40 * n^1.45)`. Streak shields cover one missed day.
- **Craft linter.** Best-practice notes (mutable defaults, bare except, range(len), and more).

## Content

29 concepts in 5 tracks (Foundations, Data, Craft, Algorithms, Game Theory), 146 authored challenges (write, debug, trace) plus 157 seeded drill families. Add a challenge in `src/curriculum/*.ts`, then run `npm run verify`.

## Ethics

Engagement techniques here are honest ones: visible progress, fair difficulty, spaced review. No fake scarcity, loss-aversion traps, or paid pressure.

## Limits

Expert content tops out around rating 1600. Advanced concepts without drills fall back to recall after 30 days.
