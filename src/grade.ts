import type { Challenge } from '../engine/types';

export interface CaseResult { call: string; ok: boolean; got: string; want: string }
export interface Grade { solved: boolean; passed: number; total: number; cases: CaseResult[]; prints: string }

const resultLines = (out: string) => out.split('\n').filter((l) => l.startsWith('@@'));
const show = (l: string | undefined) => (l === undefined ? '(missing)' : l.startsWith('@@!') ? `raised ${l.slice(3)}` : l.slice(3));

/** Compares learner output with the expected output. Case based challenges report each case. Plain ones compare printed text. */
export function grade(ch: Challenge, actual: string, expected: string): Grade {
  if (ch.cases) {
    const got = resultLines(actual), want = resultLines(expected);
    const cases = ch.cases.map((call, i) => ({ call, ok: got[i] === want[i] && got[i] !== undefined, got: show(got[i]), want: show(want[i]) }));
    const passed = cases.filter((c) => c.ok).length;
    return { solved: passed === cases.length && got.length === want.length, passed, total: cases.length, cases, prints: actual.split('\n').filter((l) => !l.startsWith('@@')).join('\n').trim() };
  }
  const ok = actual.trimEnd() === expected.trimEnd();
  return { solved: ok, passed: ok ? 1 : 0, total: 1, cases: [], prints: actual };
}
