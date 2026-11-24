export type TrackId = 'foundations' | 'data' | 'craft' | 'algorithms' | 'theory';
export type Format = 'code' | 'debug' | 'trace';
export type ConceptId = string;

export interface Track { id: TrackId; name: string; blurb: string }

export interface Concept {
  id: ConceptId;
  track: TrackId;
  name: string;
  blurb: string;
  /** Concepts that should be warmed up first. */
  needs: ConceptId[];
  /** Rating band the concept spans. Mastery is where the learner sits inside it. */
  band: [number, number];
  /** One idiomatic habit worth knowing, shown on the skill page. */
  habit: string;
}

export interface Challenge {
  /** Authored: `a:<slug>`. Drill: `d:<tier>:<family>:<seed>`. */
  id: string;
  kind: 'authored' | 'drill';
  concept: ConceptId;
  format: Format;
  title: string;
  prompt: string;
  starter: string;
  /** Difficulty on the same scale as the learner rating. */
  d: number;
  /** Expected solve time in seconds for a learner at this depth. */
  par: number;
  hints: string[];
  /** Best-practice note shown after a solve. */
  tip?: string;
  /** Used to keep the same pattern from showing up twice in a short window. */
  family: string;
  /** Reference solution. Shown after solving. */
  target: string;
  /** Python appended to the learner's code. */
  test?: string;
  /** Pre-computed expected output of `target + test` (skips running the reference in the browser). */
  expected?: string;
  /** Hidden-test expressions, for per-case feedback. */
  cases?: string[];
  /** Trace format: code to read, four options, index of the right one. */
  snippet?: string;
  options?: string[];
  answer?: number;
}

export interface Skill { r: number; sd: number; n: number }
export interface Mastery { box: number; due: number; seen: number; solved: number; last: number }

export interface Flow { hist: number[]; integral: number; lastErr: number; fails: number; wins: number; fast: number }

export type Slot = 'warmup' | 'core' | 'review' | 'stretch';
export type PickTag = 'warmup' | 'new' | 'core' | 'review' | 'stretch' | 'breather' | 'recall' | 'focus';

export interface SlotResult { slot: Slot; id: string; concept: ConceptId; d: number; score: number; xp: number }
export interface Session { id: string; day: string; idx: number; focus: ConceptId | null; swaps: number; results: SlotResult[]; startedAt: number; done: boolean }

export interface RecentItem { id: string; concept: ConceptId; family: string; format: Format; d: number; score: number; day: number }
export interface Attempt { t: number; d: number; score: number; concept: ConceptId; xp: number; secs: number; r: number }

export interface GoalState { id: string; label: string; target: number; progress: number }

export interface Settings { haptics: boolean; fontSize: 16 | 17 | 18 }

export interface Save {
  v: 2;
  salt: number;
  created: number;
  /** null until the learner has chosen a starting point (or migrated from v1). */
  start: 'new' | 'some' | 'comfortable' | 'migrated' | null;
  xp: number;
  g: Skill;
  skills: Record<ConceptId, Skill>;
  mastery: Record<ConceptId, Mastery>;
  flow: Flow;
  /** Authored challenge id -> day number when it was served. */
  seenAt: Record<string, number>;
  /** Hashes of every prompt ever served. Guarantees no prompt is shown twice. */
  sigs: number[];
  recent: RecentItem[];
  issued: number;
  session: Session | null;
  streak: { days: number; last: string; shield: number };
  history: Attempt[];
  goals: { day: string; list: GoalState[] };
  stats: { solved: number; clean: number; hints: number; secs: number; sessions: number; bestStreak: number };
  settings: Settings;
  migrated?: { from: 'v1'; levels: number };
}
