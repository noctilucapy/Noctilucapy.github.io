import type { Mastery, Save, Concept, ConceptId } from './types';
import { clamp, dayNumber, dayKey } from './rng';
import { effectiveRating } from './rating';

const INTERVALS = [0, 1, 3, 7, 16, 35];
export const freshMastery = (): Mastery => ({ box: 0, due: 0, seen: 0, solved: 0, last: 0 });

/** Leitner style spacing: good results push the next review further out, poor results pull it back in. */
export function updateMastery(m: Mastery, score: number, today: number): Mastery {
  let box = m.box;
  let wait: number;
  if (score >= 0.85) { box = Math.min(5, box + 1); wait = INTERVALS[box]; }
  else if (score >= 0.5) { wait = Math.max(1, Math.ceil(INTERVALS[box] / 2)); }
  else { box = Math.max(0, box - 2); wait = 1; }
  return { box, due: today + Math.max(1, wait), seen: m.seen + 1, solved: m.solved + (score >= 0.5 ? 1 : 0), last: today };
}

/** Where the learner sits inside the concept's rating band, 0 to 1. */
export function masteryFrac(save: Save, c: Concept): number {
  const sk = save.skills[c.id];
  if (!sk || sk.n === 0) return 0;
  return clamp((effectiveRating(save, c.id) - c.band[0]) / (c.band[1] - c.band[0]), 0.02, 1);
}

export function masteryLabel(save: Save, c: Concept): string {
  const m = save.mastery[c.id];
  if (!m || m.seen === 0) return 'New';
  const f = masteryFrac(save, c);
  return f < 0.25 ? 'Learning' : f < 0.55 ? 'Practiced' : f < 0.8 ? 'Solid' : 'Mastered';
}

/** A concept opens once its prerequisites have two real solves, or the rating shows the learner is already past it. */
export function isUnlocked(save: Save, c: Concept, all: Record<string, Concept>): boolean {
  return c.needs.every((id) => {
    const need = all[id];
    return (save.mastery[id]?.solved ?? 0) >= 2 || save.g.r >= need.band[0] + 250;
  });
}

export function isDue(save: Save, id: ConceptId, today = dayNumber(dayKey())): boolean {
  const m = save.mastery[id];
  return !!m && m.seen > 0 && m.due <= today;
}
