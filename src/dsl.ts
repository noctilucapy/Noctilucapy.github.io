import type { Challenge, ConceptId, Format } from '../engine/types';

/** Wraps each case so one crash, or stray prints, cannot hide the other results. Result lines start with "@@". */
export const harness = (cases: string[]): string =>
  `import io as __io, contextlib as __cl\ndef __t(f):\n    __b = __io.StringIO()\n    try:\n        with __cl.redirect_stdout(__b):\n            r = f()\n        print('@@=' + repr(r))\n    except BaseException as e:\n        print('@@!' + type(e).__name__)\n` +
  cases.map((c) => `__t(lambda: ${c})`).join('\n');

const parOf = (d: number) => Math.round(60 + Math.max(0, d - 500) / 4);

export interface Spec {
  slug: string; concept: ConceptId; d: number; title: string;
  /** Starter code. For plain challenges this is a signature stub. For debug challenges it is the buggy code. */
  starter: string;
  prompt: string; solution: string; cases: string[];
  /** Three hints separated by "|", from a nudge to a near giveaway. */
  hints: string; tip: string; format?: Format; par?: number;
}

export function code(s: Spec): Challenge {
  return {
    id: `a:${s.slug}`, kind: 'authored', concept: s.concept, format: s.format ?? 'code', title: s.title, prompt: s.prompt, starter: s.starter,
    d: s.d, par: s.par ?? parOf(s.d), hints: s.hints.split('|').map((x) => x.trim()), tip: s.tip, family: `a:${s.slug}`,
    target: s.solution, test: harness(s.cases), cases: s.cases,
  };
}

/** Shorthand for signature-stub challenges. */
export const fn = (slug: string, concept: ConceptId, d: number, title: string, sig: string, prompt: string, solution: string, cases: string[], hints: string, tip: string): Challenge =>
  code({ slug, concept, d, title, starter: `${sig}\n    pass\n`, prompt, solution, cases, hints, tip });

export function trace(slug: string, concept: ConceptId, d: number, title: string, snippet: string, right: string, wrong: [string, string, string], tip: string): Challenge {
  // Deterministic shuffle by slug so the right answer is not always first.
  const at = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  const options = [...wrong]; options.splice(at, 0, right);
  return {
    id: `a:${slug}`, kind: 'authored', concept, format: 'trace', title, prompt: 'Read the code. What does it print? No running it.', starter: '', d, par: 45 + Math.round((d - 500) / 8),
    hints: ['Trace it line by line and write down each variable.', 'Look for what is shared or reused rather than copied.', 'Run it in the Terminal if you want to check, then come back.'],
    tip, family: `a:${slug}`, target: snippet, snippet, options, answer: at,
  };
}
