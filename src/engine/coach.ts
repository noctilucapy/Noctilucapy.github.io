import type { Catalog } from './catalog';
import type { ConceptId, Save } from './types';
import { isDue, isUnlocked, masteryFrac } from './mastery';
import { clamp, dayKey, dayNumber } from './rng';

export interface Rec { kind: 'review' | 'weak' | 'unlock' | 'habit'; concept: ConceptId; title: string; why: string; canStart: boolean }

const KIND_LABEL: Record<Rec['kind'], string> = { review: 'Review', weak: 'Strengthen', unlock: 'Unlock', habit: 'Habit' };
export const recLabel = (k: Rec['kind']): string => KIND_LABEL[k];

/** Suggestions drawn from the learner's own numbers. At most four, in the order of how much they are worth. */
export function recommend(save: Save, cat: Catalog, now = Date.now()): Rec[] {
  const by = Object.fromEntries(cat.concepts.map((c) => [c.id, c]));
  const today = dayNumber(dayKey(new Date(now)));
  const unlocked = cat.concepts.filter((c) => isUnlocked(save, c, by));
  const out: Rec[] = [];

  const due = unlocked.filter((c) => isDue(save, c.id, today)).sort((a, b) => save.mastery[a.id].due - save.mastery[b.id].due)[0];
  if (due) {
    const days = today - (save.mastery[due.id].last || today);
    out.push({ kind: 'review', concept: due.id, title: due.name, why: days > 0 ? `Last practised ${days} day${days === 1 ? '' : 's'} ago. A short review locks it in.` : 'Ready for a refresher.', canStart: true });
  }

  const touched = unlocked.filter((c) => (save.skills[c.id]?.n ?? 0) >= 2 && !out.some((o) => o.concept === c.id));
  const weak = touched.sort((a, b) => masteryFrac(save, a) - masteryFrac(save, b))[0];
  if (weak && masteryFrac(save, weak) < 0.6) out.push({ kind: 'weak', concept: weak.id, title: weak.name, why: `Your weakest area right now (${Math.round(masteryFrac(save, weak) * 100)}% of its range). Practice here raises everything built on it.`, canStart: true });

  const locked = cat.concepts.filter((c) => !isUnlocked(save, c, by)).map((c) => ({ c, missing: c.needs.filter((id) => (save.mastery[id]?.solved ?? 0) < 2 && save.g.r < by[id].band[0] + 250) }))
    .sort((a, b) => a.missing.length - b.missing.length)[0];
  if (locked) {
    const m = locked.missing[0];
    const need = clamp(2 - (save.mastery[m]?.solved ?? 0), 1, 2);
    out.push({ kind: 'unlock', concept: m, title: locked.c.name, why: `Opens after ${need} more solve${need === 1 ? '' : 's'} in ${by[m].name}.`, canStart: true });
  }

  const lastC = save.recent[save.recent.length - 1]?.concept;
  const habitFrom = lastC ? by[lastC] : unlocked[0];
  if (habitFrom) out.push({ kind: 'habit', concept: habitFrom.id, title: habitFrom.name, why: habitFrom.habit, canStart: false });
  return out.slice(0, 4);
}
