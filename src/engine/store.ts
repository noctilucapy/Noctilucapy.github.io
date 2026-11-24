import type { Challenge, Save, Session, Slot, SlotResult } from './types';
import type { Catalog } from './catalog';
import { ARC, pickNext, sigOf, type Pick } from './selector';
import { COACH, freshFlow, moodOf, recordFlow, type Mood } from './flow';
import { freshMastery, masteryFrac, updateMastery } from './mastery';
import { freshSkill, predict, rankOf, updateSkill } from './rating';
import { awardXp, levelOf, type XpPart } from './xp';
import { reviewCraft, type CraftNote } from './craft';
import { applyGoals, dailyGoals } from './goals';
import { clamp, dayKey, dayNumber, hash32 } from './rng';

export const SAVE_KEY = 'noctiluca.save.v2';
const OLD_KEY = 'noctiluca.save.v1';
const MAX_SIGS = 6000;

export function freshSave(now = Date.now()): Save {
  const day = dayKey(new Date(now));
  return {
    v: 2, salt: hash32(String(now) + Math.random()), created: now, start: null, xp: 0,
    g: freshSkill(600), skills: {}, mastery: {}, flow: freshFlow(), seenAt: {}, sigs: [], recent: [], issued: 0, session: null,
    streak: { days: 0, last: '', shield: 0 }, history: [], goals: { day, list: dailyGoals(day) },
    stats: { solved: 0, clean: 0, hints: 0, secs: 0, sessions: 0, bestStreak: 0 }, settings: { haptics: true, fontSize: 16 },
  };
}

/** Starting point chosen on first launch. Wide uncertainty lets the first few results correct a wrong guess quickly. */
export function chooseStart(save: Save, start: 'new' | 'some' | 'comfortable'): Save {
  const r = start === 'new' ? 540 : start === 'some' ? 820 : 1120;
  return { ...save, start, g: freshSkill(r, 240) };
}

function migrateV1(now: number): Save | null {
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const levels = Array.isArray(s.done) ? s.done.length : 0;
    if (!levels && !s.xp) return null;
    const base = freshSave(now);
    return {
      ...base, start: 'migrated', xp: Number(s.xp) || 0, g: freshSkill(Math.round(560 + Math.min(1000, levels) * 0.9), 170),
      streak: { days: Number(s.streak) || 0, last: typeof s.lastDay === 'string' ? s.lastDay : '', shield: 0 }, migrated: { from: 'v1', levels },
    };
  } catch { return null; }
}

export function loadSave(now = Date.now()): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Save;
      if (s && s.v === 2 && s.g && typeof s.g.r === 'number') return { ...freshSave(now), ...s, settings: { ...freshSave(now).settings, ...s.settings } };
    }
  } catch { /* corrupt or blocked storage: fall through to a fresh save */ }
  return migrateV1(now) ?? freshSave(now);
}

export function persist(s: Save): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode or quota */ } }

export const exportSave = (s: Save): string => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export function importSave(text: string): Save | null {
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(text.trim())))) as Save;
    return s && s.v === 2 && s.g && typeof s.g.r === 'number' ? { ...freshSave(), ...s } : null;
  } catch { return null; }
}

/* ───────── sessions: a five slot arc (warm-up, core, core, review, stretch) ───────── */

export function startSession(save: Save, focus: string | null = null, now = Date.now()): Save {
  const session: Session = { id: `${dayKey(new Date(now))}-${save.stats.sessions + 1}`, day: dayKey(new Date(now)), idx: 0, focus, swaps: 0, results: [], startedAt: now, done: false };
  return { ...save, session };
}

export const slotAt = (s: Session): Slot => ARC[Math.min(s.idx, ARC.length - 1)];

/** Pure: the same save always plans the same next challenge, so the Home preview matches what Play serves. */
export function planNext(save: Save, cat: Catalog, now: number = Date.now()): Pick | null {
  const s = save.session;
  if (!s || s.done) return null;
  return pickNext(save, cat, slotAt(s), s.focus, now);
}

function remember(save: Save, ch: Challenge, today: number): Save {
  const sigs = [...save.sigs, sigOf(ch)];
  return {
    ...save, sigs: sigs.length > MAX_SIGS ? sigs.slice(-MAX_SIGS) : sigs,
    seenAt: ch.kind === 'authored' ? { ...save.seenAt, [ch.id]: today } : save.seenAt, issued: save.issued + 1,
  };
}

/** "Not this one": retire the challenge without any rating penalty. Limited so the arc keeps its shape. */
export const MAX_SWAPS = 2;
export function swapCurrent(save: Save, ch: Challenge): Save {
  if (!save.session || save.session.swaps >= MAX_SWAPS) return save;
  const next = remember(save, ch, dayNumber(dayKey())) as Save;
  return { ...next, session: { ...save.session, swaps: save.session.swaps + 1 } };
}

export interface Outcome { solved: boolean; gaveUp: boolean; wrong: number; hints: number; secs: number; code: string }
export interface Report {
  score: number; xp: number; parts: XpPart[]; ratingBefore: number; ratingAfter: number; rank: string; rankUp: boolean;
  levelBefore: number; levelAfter: number; conceptName: string; conceptBefore: number; conceptAfter: number;
  craft: CraftNote[]; shieldEarned: boolean; goalsDone: string[]; streak: number; mood: Mood; coach: string; unlocked: string[]; descentDone: boolean;
}

export const scoreOf = (o: Outcome): number => (o.solved ? clamp(1 - 0.12 * Math.min(o.wrong, 4) - 0.1 * Math.min(o.hints, 3), 0.35, 1) : 0);

export function applyResult(save: Save, ch: Challenge, pick: Pick, o: Outcome, cat: Catalog, now = Date.now()): { save: Save; report: Report } {
  const today = dayNumber(dayKey(new Date(now)));
  const day = dayKey(new Date(now));
  const score = scoreOf(o);
  const p = predict(save, ch.concept, ch.d);
  const concept = cat.concepts.find((c) => c.id === ch.concept)!;
  const weight = o.gaveUp ? 0.7 : 1;

  // streak with a shield that quietly covers one missed day
  let { days, last, shield } = save.streak;
  const gap = last ? today - dayNumber(last) : Infinity;
  let shieldEarned = false;
  if (o.solved) {
    if (gap === 1) days += 1; else if (gap === 0) days = Math.max(1, days); else if (gap === 2 && shield > 0) { shield -= 1; days += 1; } else days = 1;
    if (gap !== 0 && days > 0 && days % 7 === 0 && shield < 2) { shield += 1; shieldEarned = true; }
    last = day;
  }

  const craft = o.solved && ch.format !== 'trace' ? reviewCraft(o.code) : [];
  const fast = o.solved && o.wrong === 0 && o.hints === 0 && o.secs <= ch.par * 0.6;
  const { xp, parts } = awardXp(ch, { score, secs: o.secs, hints: o.hints, wrong: o.wrong, p, streakDays: days, craftClean: o.solved && craft.length === 0 && ch.format !== 'trace' });

  const before = { r: save.g.r, level: levelOf(save.xp).level, frac: masteryFrac(save, concept), rank: rankOf(save.g.r).name };
  const g = updateSkill(save.g, ch.d, score, weight);
  const skills = { ...save.skills, [ch.concept]: updateSkill(save.skills[ch.concept] ?? freshSkill(save.g.r, 200), ch.d, score, weight) };
  const mastery = { ...save.mastery, [ch.concept]: updateMastery(save.mastery[ch.concept] ?? freshMastery(), score, today) };
  const flow = recordFlow(save.flow, score, fast);

  const result: SlotResult = { slot: pick.slot, id: ch.id, concept: ch.concept, d: ch.d, score, xp };
  const session = save.session && !save.session.done ? { ...save.session, idx: save.session.idx + 1, results: [...save.session.results, result] } : save.session;
  const descentDone = !!session && !save.session!.done && session.idx >= ARC.length;
  if (session && descentDone) session.done = true;

  const goals0 = save.goals.day === day ? save.goals : { day, list: dailyGoals(day) };
  const goalRes = applyGoals(goals0.list, { solved: o.solved, clean: o.wrong === 0 && o.hints === 0, stretch: pick.slot === 'stretch', review: pick.tag === 'review', advanced: concept.track === 'algorithms' || concept.track === 'theory', xp, descentDone });

  const withSeen = remember(save, ch, today) as Save;
  const stats = { ...save.stats, solved: save.stats.solved + (o.solved ? 1 : 0), clean: save.stats.clean + (o.solved && o.wrong === 0 && o.hints === 0 ? 1 : 0), hints: save.stats.hints + o.hints, secs: save.stats.secs + o.secs, sessions: save.stats.sessions + (descentDone ? 1 : 0), bestStreak: Math.max(save.stats.bestStreak, days) };
  const next: Save = {
    ...withSeen, xp: save.xp + xp, g, skills, mastery, flow, session, streak: { days, last, shield }, stats, goals: { day, list: goalRes.list },
    recent: [...save.recent, { id: ch.id, concept: ch.concept, family: ch.family, format: ch.format, d: ch.d, score, day: today }].slice(-40),
    history: [...save.history, { t: now, d: ch.d, score, concept: ch.concept, xp, secs: o.secs, r: Math.round(g.r) }].slice(-300),
  };

  const unlockedBefore = new Set(cat.concepts.filter((c) => c.needs.every((id) => (save.mastery[id]?.solved ?? 0) >= 2 || save.g.r >= (cat.concepts.find((x) => x.id === id)!.band[0] + 250))).map((c) => c.id));
  const unlocked = cat.concepts.filter((c) => !unlockedBefore.has(c.id) && c.needs.every((id) => (mastery[id]?.solved ?? 0) >= 2 || g.r >= (cat.concepts.find((x) => x.id === id)!.band[0] + 250))).map((c) => c.name);
  const mood = moodOf(flow);
  return {
    save: next,
    report: {
      score, xp, parts, ratingBefore: Math.round(before.r), ratingAfter: Math.round(g.r), rank: rankOf(g.r).name, rankUp: rankOf(g.r).name !== before.rank && g.r > before.r,
      levelBefore: before.level, levelAfter: levelOf(next.xp).level, conceptName: concept.name, conceptBefore: before.frac, conceptAfter: masteryFrac(next, concept),
      craft, shieldEarned, goalsDone: goalRes.done, streak: days, mood, coach: COACH[mood], unlocked, descentDone,
    },
  };
}
