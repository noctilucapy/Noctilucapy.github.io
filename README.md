<div align="center">

<img src="docs/assets/banner.svg" alt="Noctiluca. Python, at the right depth." width="100%" />

<br />

<img src="docs/assets/badge-react.svg" alt="React 18" height="30" />
<img src="docs/assets/badge-typescript.svg" alt="TypeScript 5.9" height="30" />
<img src="docs/assets/badge-vite.svg" alt="Vite 7" height="30" />
<img src="docs/assets/badge-pyodide.svg" alt="Python via Pyodide 0.29" height="30" />
<br />
<img src="docs/assets/badge-offline.svg" alt="Offline after first run" height="30" />
<img src="docs/assets/badge-pwa.svg" alt="Installable PWA" height="30" />
<img src="docs/assets/badge-pages.svg" alt="Deploys to GitHub Pages" height="30" />
<img src="docs/assets/badge-license.svg" alt="Data stays on device" height="30" />

</div>

<img src="docs/assets/divider.svg" alt="" width="100%" />

**Noctiluca** is adaptive Python practice for your phone. Short challenges meet you at your level, never repeat, and slowly deepen. Python runs in your browser (Pyodide in a Web Worker), so it works offline after the first run. There is no server, no account and no tracking.

<img src="docs/assets/screens.svg" alt="Descent, Challenge and Terminal screens" width="100%" />

## Principles

<img src="docs/assets/features.svg" alt="Right difficulty, never repeats, spaced review, real Python in the browser, honest progress, yours alone" width="100%" />

## Depth and ranks

Every learner, every concept and every challenge sits on one **depth** scale. Your rank follows your overall depth, and the **Skills** screen shows depth per concept.

<img src="docs/assets/ranks.svg" alt="Ranks: Shallows 0, Twilight 800, Midnight 1000, Abyss 1250, Hadal 1500, Trench 1750" width="100%" />

## A descent

One session is a **descent** of five challenges, planned one step at a time. Each slot has a hard difficulty window tied to your recent clean solves, so a new level can never leap far above what you just did.

<img src="docs/assets/arc.svg" alt="Warm-up, core, core, review, stretch" width="100%" />

## How the engine works

<img src="docs/assets/engine.svg" alt="Save to planNext to flow target to selector to challenge to Pyodide to grade to applyResult and back to save" width="100%" />

| Part | What it does |
| --- | --- |
| **Rating** | Elo style skill per learner and per concept (logistic, 400 scale). Only clean solves give full credit; helped solves give 30 percent. |
| **Flow target** | A PID like controller aims for about 72 percent predicted success (clamped 55 to 90) and gives a breather after struggle. |
| **Session arc** | Warm-up, core, core, review, stretch, planned by the pure function `planNext(save, catalog, now)`. |
| **No sudden jumps** | Each slot has a hard difficulty window tied to recent clean solves. |
| **No repeats** | Prompt hashes, family cooldowns and endless seeded drill variants. Swap a challenge twice per session without penalty. |
| **Craft linter** | Best practice notes for mutable defaults, bare `except`, `range(len(...))` and more. |

### Spaced review

<img src="docs/assets/review.svg" alt="Leitner intervals of 0, 1, 3, 7, 16 and 35 days" width="100%" />

### XP and levels

Solved, clean solve, under par, stretch and craft bonuses, with a streak multiplier up to x1.25. Streak shields cover one missed day.

<img src="docs/assets/xp.svg" alt="XP parts and the level curve round(40 times n to the 1.45)" width="100%" />

## Content

**29 concepts** in **5 tracks**, **146 authored challenges** (write, debug, trace) plus **157 seeded drill families**.

<img src="docs/assets/tracks.svg" alt="Foundations, Data, Craft, Algorithms, Game Theory" width="100%" />

Add a challenge in `src/curriculum/*.ts`, then run `npm run verify` to bake its expected output.

## Terminal

A free scratchpad for any Python. Optional `input()` lines, a console, example snippets, and your code is saved on the device. Nothing there changes your depth or XP.

## Install on your phone

Open the site in Safari, tap **Share**, then **Add to Home Screen**. On Android, Chrome offers **Install**. It launches full screen with the Noctiluca icon and no browser bars, and a service worker keeps the app and the Python runtime available offline.

Progress lives in this browser. Use **Record → Backup** to copy a backup before clearing site data or changing phones.

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run verify     # runs every challenge in python3 and bakes expected outputs
npm run simulate   # simulated learners against the engine
npm run build      # type check and build into dist/
npm run assets     # regenerate icons, favicons and iOS splash screens
```

Deploys to GitHub Pages with `.github/workflows/pages.yml` (base path `/`, for the user site `noctilucapy.github.io`).

## Project map

```text
src/
  App.tsx              routes, fixed top bar and tab bar
  screens/             Home, Skills, Play, Terminal, Record, Done, Onboarding
  components/          TabBar, CodeEditor, Sheet, Icon, LogoMark
  engine/              rating, flow, selector, mastery, xp, goals, coach, store
  curriculum/          concepts, openers, algorithms, theory, trace, debug, drills
  python.ts            Pyodide worker client
public/                manifest, service worker, icons, splash screens
scripts/               verify-curriculum, simulate-engine, generate-assets
docs/assets/           README visuals (SVG)
```

## Design language

**Abyssal Liturgy**: near monochrome, with bone as the only true highlight and three muted signal tints for pass, caution and fail.

<img src="docs/assets/palette.svg" alt="Void, Charcoal, Deep, Bone, Silver, Ok, Warn, Bad" width="100%" />

Type: **Cormorant Garamond** for display, **Jost** for text, **JetBrains Mono** for code and labels.

## Ethics

The engagement techniques here are honest ones: visible progress, fair difficulty, spaced review. No fake scarcity, loss-aversion traps or paid pressure.

## Limits

Expert content tops out around rating 1600. Advanced concepts without drills fall back to recall after 30 days.

<img src="docs/assets/divider.svg" alt="" width="100%" />

<div align="center">
<sub>NOCTILUCA · PYTHON, AT THE RIGHT DEPTH</sub>
</div>
