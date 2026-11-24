export interface CraftNote { id: string; level: 'warn' | 'tip'; text: string }

const RULES: Array<{ id: string; level: 'warn' | 'tip'; re: RegExp; text: string }> = [
  { id: 'mutable-default', level: 'warn', re: /def\s+\w+\([^)]*=\s*(\[\]|\{\}|set\(\))/, text: 'Mutable default argument. It is shared between calls. Default to None and create the object inside.' },
  { id: 'bare-except', level: 'warn', re: /^\s*except\s*:/m, text: 'Bare except hides real bugs. Catch the specific exception you expect.' },
  { id: 'eq-none', level: 'warn', re: /(==|!=)\s*None\b/, text: 'Compare with None using `is` or `is not`.' },
  { id: 'eq-bool', level: 'tip', re: /(==|!=)\s*(True|False)\b/, text: 'Test truthiness directly: `if ok:` instead of `if ok == True:`.' },
  { id: 'range-len', level: 'tip', re: /for\s+\w+\s+in\s+range\(\s*len\(/, text: 'Loop over the items directly, or use enumerate() when you need the index.' },
  { id: 'len-zero', level: 'tip', re: /if\s+(not\s+)?len\(\w+\)\s*(==|>|!=)\s*0/, text: 'Empty containers are falsy. `if not items:` reads better than comparing len() with 0.' },
  { id: 'keys-in', level: 'tip', re: /\bin\s+\w+\.keys\(\)/, text: '`key in mapping` already checks the keys, and it is faster.' },
  { id: 'star-import', level: 'warn', re: /^\s*from\s+\w+\s+import\s+\*/m, text: 'Avoid star imports. Name what you use so readers know where it comes from.' },
  { id: 'camel', level: 'tip', re: /def\s+[a-z]+[A-Z]\w*\(/, text: 'PEP 8 names functions in snake_case.' },
  { id: 'ambiguous-name', level: 'tip', re: /(^|[^\w.])(l|O|I)\s*=[^=]/m, text: 'Avoid l, O and I as names. They look like 1 and 0.' },
  { id: 'str-concat-loop', level: 'tip', re: /for\s[^\n]*:\n\s+\w+\s*\+=\s*(str\(|f?["'])/, text: 'Building a string with += in a loop is slow at scale. Collect parts in a list and use "".join(parts).' },
  { id: 'append-loop', level: 'tip', re: /(\w+)\s*=\s*\[\]\n\s*for\s[^\n]*:\n\s+\1\.append\(/, text: 'A loop that only appends can often be a list comprehension.' },
];

/** Light, conservative style review. It only flags patterns that are almost always worth changing. */
export function reviewCraft(code: string): CraftNote[] {
  const notes: CraftNote[] = [];
  for (const r of RULES) if (r.re.test(code)) notes.push({ id: r.id, level: r.level, text: r.text });
  if (code.split('\n').some((l) => l.length > 88)) notes.push({ id: 'long-line', level: 'tip', text: 'A line runs past 88 characters. Break it up so it fits a phone screen and a diff.' });
  return notes.sort((a, b) => (a.level === b.level ? 0 : a.level === 'warn' ? -1 : 1)).slice(0, 3);
}
