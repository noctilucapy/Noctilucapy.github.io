import type { GoalState } from './types';
import { hash32, mulberry32 } from './rng';

const POOL: Array<Omit<GoalState, 'progress'>> = [
  { id: 'descent', label: 'Finish a descent (5 challenges)', target: 1 },
  { id: 'solve3', label: 'Solve 3 challenges', target: 3 },
  { id: 'clean2', label: 'Solve 2 with no hints', target: 2 },
  { id: 'stretch', label: 'Beat a stretch challenge', target: 1 },
  { id: 'review', label: 'Clear a review', target: 1 },
  { id: 'xp60', label: 'Earn 60 XP', target: 60 },
  { id: 'algo', label: 'Solve an algorithm or game theory challenge', target: 1 },
];

/** Three goals per day, the same wording for every player, no currency attached. They exist to make progress visible. */
export function dailyGoals(day: string): GoalState[] {
  const rng = mulberry32(hash32(`goals:${day}`));
  const bag = [...POOL];
  const out: GoalState[] = [{ ...bag.shift()!, progress: 0 }];
  while (out.length < 3) out.push({ ...bag.splice(Math.floor(rng() * bag.length), 1)[0], progress: 0 });
  return out;
}

export interface GoalEvent { solved: boolean; clean: boolean; stretch: boolean; review: boolean; advanced: boolean; xp: number; descentDone: boolean }

export function applyGoals(list: GoalState[], e: GoalEvent): { list: GoalState[]; done: string[] } {
  const done: string[] = [];
  const next = list.map((g) => {
    const add = g.id === 'descent' ? +e.descentDone : g.id === 'solve3' ? +e.solved : g.id === 'clean2' ? +(e.solved && e.clean)
      : g.id === 'stretch' ? +(e.solved && e.stretch) : g.id === 'review' ? +(e.solved && e.review) : g.id === 'xp60' ? e.xp : +(e.solved && e.advanced);
    const progress = Math.min(g.target, g.progress + add);
    if (progress >= g.target && g.progress < g.target) done.push(g.label);
    return { ...g, progress };
  });
  return { list: next, done };
}
