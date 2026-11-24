import type { Challenge, ConceptId } from '../engine/types';
import { DRILL_TIERS, makeDrill } from '../puzzles';
import { CONCEPT_BY_ID } from './concepts';

/** Which concept each puzzle topic trains. Topics not listed fall back to the tier default. */
const TOPIC: Record<string, ConceptId> = {
  Output: 'output', Arithmetic: 'output', Variables: 'output', Floats: 'output', Booleans: 'output', 'Built-ins': 'output',
  'String repeat': 'strings', Length: 'strings', 'String methods': 'strings', 'f-strings': 'strings', Slicing: 'strings', Concatenation: 'strings', Replace: 'strings', Counting: 'strings', Splitting: 'strings', Joining: 'strings',
  Conditions: 'branching',
  Loops: 'loops', Accumulators: 'loops', 'While loops': 'loops', Break: 'loops', Tables: 'loops', Patterns: 'loops', 'Nested loops': 'loops',
  Functions: 'functions', 'Default arguments': 'functions',
  Lists: 'lists', 'List methods': 'lists', Sorting: 'lists', Averages: 'lists', 'Sorting keys': 'lists', 'Key functions': 'lists', 'Multi-key sorting': 'lists', 'Nested lists': 'lists',
  Dictionaries: 'dicts', Tuples: 'dicts', enumerate: 'dicts', zip: 'dicts', Membership: 'dicts', Sets: 'dicts', 'Set operations': 'dicts', Grouping: 'dicts', Deduplication: 'dicts',
  Comprehensions: 'comprehensions', Filtering: 'comprehensions', 'Dict comprehensions': 'comprehensions', 'any / all': 'comprehensions', 'map and lambda': 'comprehensions', 'zip and dict': 'comprehensions', Flattening: 'comprehensions',
  'Frequency maps': 'text', Palindromes: 'text', Words: 'text', Ciphers: 'text', Digits: 'text', Acronyms: 'text', Anagrams: 'text', 'Run-length encoding': 'text', Strings: 'text', Formatting: 'oop',
  Recursion: 'recursion', Euclid: 'numbers', Primes: 'numbers', Collatz: 'numbers', Binary: 'numbers', Divisors: 'numbers', Sieve: 'numbers', 'Roman numerals': 'numbers', Josephus: 'numbers',
  Classes: 'oop', Exceptions: 'oop', Inheritance: 'oop', Generators: 'functional', itertools: 'functional', Closures: 'functional', Decorators: 'functional', reduce: 'functional',
  Stacks: 'stacks', Queues: 'stacks',
  'Binary search': 'search', 'Two sum': 'hashing', Pairs: 'hashing', Matrices: 'arrays', Rotation: 'arrays', 'Prefix sums': 'arrays', 'Order statistics': 'sorting', Merging: 'sorting',
  Pascal: 'dp', Memoization: 'dp', 'Dynamic programming': 'dp', Graphs: 'graphs', 'Flood fill': 'graphs',
};
const TIER_DEFAULT: ConceptId[] = ['output', 'loops', 'lists', 'dicts', 'comprehensions', 'text', 'recursion', 'oop', 'arrays', 'dp'];

const byConcept = new Map<ConceptId, string[]>();
const meta = new Map<string, { tier: number; family: number; concept: ConceptId; d: number }>();
DRILL_TIERS.forEach((fams, t) => fams.forEach((_, f) => {
  const probe = makeDrill(t + 1, f, 1);
  let concept = TOPIC[probe.topic] ?? TIER_DEFAULT[t];
  // The tier decides how deep a pattern is, so a topic like "Sorting" in tier 9 lands in the sorting algorithms concept.
  if (t + 1 >= 9 && probe.topic === 'Sorting') concept = 'sorting';
  if (t + 1 >= 9 && probe.topic === 'Frequency maps') concept = 'hashing';
  if (t + 1 >= 9 && probe.topic === 'Deduplication') concept = 'hashing';
  if (!CONCEPT_BY_ID[concept]) concept = TIER_DEFAULT[t];
  const lines = probe.target.split('\n').length;
  const d = Math.round(430 + 105 * t + Math.min(70, (lines - 1) * 9) + (((t * 31 + f * 17) % 25) - 12));
  const key = `d:${t + 1}:${f}`;
  meta.set(key, { tier: t + 1, family: f, concept, d });
  byConcept.set(concept, [...(byConcept.get(concept) ?? []), key]);
}));

export const drillFamilies = (concept: ConceptId): string[] => byConcept.get(concept) ?? [];

export function drill(family: string, seed: number): Challenge {
  const m = meta.get(family)!;
  let b = makeDrill(m.tier, m.family, seed);
  for (let k = 1; k < 6 && b.target.split('\n').length > 20; k++) b = makeDrill(m.tier, m.family, seed + k * 7919);
  const first = b.target.split('\n')[0];
  return {
    id: `d:${m.tier}:${m.family}:${b.seed}`, kind: 'drill', concept: m.concept, format: 'code', title: b.topic, prompt: b.prompt, starter: b.starter ?? '# your code\n',
    d: m.d, par: Math.round(45 + (m.d - 430) / 5), hints: [b.hint, `Concept: ${CONCEPT_BY_ID[m.concept].blurb}`, `The first line is:\n${first}`],
    tip: CONCEPT_BY_ID[m.concept].habit, family, target: b.target, test: b.test,
  };
}
