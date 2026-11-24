import type { Flow } from './types';
import { clamp } from './rng';

export const freshFlow = (): Flow => ({ hist: [], integral: 0, lastErr: 0, fails: 0, wins: 0, fast: 0 });

/** Chance of success we want for a normal challenge. Roughly the "desirable difficulty" zone: hard enough to need effort, easy enough to finish. */
export const BASE_TARGET = 0.72;

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : BASE_TARGET);

/**
 * Dynamic difficulty as a feedback loop (the same idea as the PID director in Obsidian Break).
 * If recent results run above the target the loop lowers the target success chance, which asks for harder work.
 * If results run below, it raises the target and difficulty eases. Small steps only, so there are no cliffs.
 */
export function flowTarget(f: Flow): number {
  const rate = mean(f.hist.slice(-6));
  const err = BASE_TARGET - rate;
  let p = BASE_TARGET + 0.45 * err + 0.12 * f.integral + 0.25 * (err - f.lastErr);
  if (f.fails >= 1) p += 0.05 * f.fails;
  if (f.wins >= 3) p -= 0.02 * Math.min(4, f.wins - 2);
  return clamp(p, 0.55, 0.9);
}

export function recordFlow(f: Flow, score: number, fastSolve: boolean): Flow {
  const err = BASE_TARGET - mean(f.hist.slice(-6));
  return {
    hist: [...f.hist, score].slice(-12),
    integral: clamp(f.integral + err * 0.5, -1, 1),
    lastErr: err,
    fails: score < 0.4 ? f.fails + 1 : 0,
    wins: score >= 0.85 ? f.wins + 1 : 0,
    fast: fastSolve ? f.fast + 1 : 0,
  };
}

export type Mood = 'new' | 'flow' | 'struggling' | 'cruising';

export function moodOf(f: Flow): Mood {
  if (f.hist.length < 3) return 'new';
  if (f.fails >= 2 || mean(f.hist.slice(-4)) < 0.4) return 'struggling';
  if (f.wins >= 4 && f.fast >= 3) return 'cruising';
  return 'flow';
}

export const COACH: Record<Mood, string> = {
  new: 'Calibrating. The first few challenges teach the app where you are.',
  flow: 'In the zone. Difficulty is tracking you closely.',
  struggling: 'Rough patch. The next challenge steps down to rebuild footing.',
  cruising: 'Cruising. The next ones will climb in small steps.',
};
