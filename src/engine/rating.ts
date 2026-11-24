import type { ConceptId, Save, Skill } from './types';
import { clamp } from './rng';

/** Chance that a learner at rating `r` solves a challenge of difficulty `d` cleanly (Elo logistic, 400 point scale). */
export const expectedP = (r: number, d: number): number => 1 / (1 + Math.pow(10, (d - r) / 400));

export const freshSkill = (r: number, sd = 220): Skill => ({ r, sd, n: 0 });

/** Concept skills lean on the global rating until the learner has real evidence in that concept. */
export function effectiveRating(save: Save, concept: ConceptId): number {
  const c = save.skills[concept];
  if (!c) return save.g.r;
  const w = c.n / (c.n + 4);
  return w * c.r + (1 - w) * save.g.r;
}

export const predict = (save: Save, concept: ConceptId, d: number): number => expectedP(effectiveRating(save, concept), d);

/** Elo style update. Uncertain skills move fast, settled skills move slowly. `weight` softens the update (for example after a give up). */
export function updateSkill(s: Skill, d: number, score: number, weight = 1): Skill {
  // The model's p means "solves it cleanly", so only a clean solve earns full credit. Help-assisted solves count for far less.
  const credit = score >= 0.99 ? 1 : score * 0.3;
  const p = expectedP(s.r, d);
  const k = (16 + 36 * clamp(s.sd / 220, 0, 1.2)) * weight;
  return { r: clamp(s.r + k * (credit - p), 300, 2300), sd: Math.max(70, s.sd * 0.94), n: s.n + 1 };
}

export const RANKS = [
  { name: 'Shallows', min: 0 },
  { name: 'Twilight', min: 800 },
  { name: 'Midnight', min: 1000 },
  { name: 'Abyss', min: 1250 },
  { name: 'Hadal', min: 1500 },
  { name: 'Trench', min: 1750 },
] as const;

export function rankOf(rating: number): { name: string; index: number; next: number | null; frac: number } {
  let i = 0;
  RANKS.forEach((r, k) => { if (rating >= r.min) i = k; });
  const next = i + 1 < RANKS.length ? RANKS[i + 1].min : null;
  const frac = next === null ? 1 : (rating - RANKS[i].min) / (next - RANKS[i].min);
  return { name: RANKS[i].name, index: i, next, frac: clamp(frac, 0, 1) };
}
