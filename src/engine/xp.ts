import type { Challenge } from './types';

/** XP scales with difficulty so effort at depth pays more, but never explosively. */
export const baseXp = (d: number): number => Math.round(8 + Math.max(0, d - 400) / 35);

export interface XpPart { label: string; xp: number }
export interface XpInput { score: number; secs: number; hints: number; wrong: number; p: number; streakDays: number; craftClean: boolean }

export function awardXp(ch: Challenge, i: XpInput): { xp: number; parts: XpPart[] } {
  if (i.score <= 0) return { xp: 0, parts: [] };
  const base = baseXp(ch.d);
  const parts: XpPart[] = [{ label: 'Solved', xp: Math.round(base * i.score) }];
  const add = (label: string, share: number) => parts.push({ label, xp: Math.max(1, Math.round(base * share)) });
  if (i.hints === 0 && i.wrong === 0) add('Clean solve', 0.15);
  if (i.secs <= ch.par) add('Under par', 0.1);
  if (i.p < 0.5) add('Stretch', 0.25);
  if (i.craftClean) add('Craft', 0.05);
  const subtotal = parts.reduce((a, b) => a + b.xp, 0);
  const mult = Math.min(1.25, 1 + 0.02 * Math.min(i.streakDays, 12));
  if (mult > 1.001) parts.push({ label: `Streak x${mult.toFixed(2)}`, xp: Math.round(subtotal * (mult - 1)) });
  return { xp: parts.reduce((a, b) => a + b.xp, 0), parts };
}

/** XP needed to reach level n+1 from level n. Gentle curve: early levels fly by, later ones take real work. */
const need = (n: number): number => Math.round(40 * Math.pow(n, 1.45));

export function levelOf(xp: number): { level: number; into: number; need: number; frac: number } {
  let level = 1;
  let left = Math.max(0, xp);
  while (left >= need(level)) { left -= need(level); level++; }
  return { level, into: left, need: need(level), frac: left / need(level) };
}
