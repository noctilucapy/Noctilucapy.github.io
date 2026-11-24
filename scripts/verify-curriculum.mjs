// Verifies every challenge against real Python and bakes the expected outputs.
//   npm run verify            quick check (12 seeds per drill family), rewrites src/curriculum/baked.json
//   npm run verify -- --deep  40 seeds per drill family
// Needs python3 on PATH. esbuild comes with Vite.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = require(process.env.ESBUILD_PATH ?? '/opt/npm-tools/node_modules/esbuild'); }

const root = new URL('..', import.meta.url).pathname;
const deep = process.argv.includes('--deep');
const SEEDS = deep ? 40 : 12;
const dir = mkdtempSync(join(tmpdir(), 'noctiluca-verify-'));
const out = join(dir, 'curriculum.mjs');
await esbuild.build({ entryPoints: [join(root, 'src/curriculum/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
const cur = await import(pathToFileURL(out).href);
const { AUTHORED, catalog } = cur;

const py = (source, timeout = 15000) => new Promise((resolve) => {
  const p = spawn('python3', ['-I', '-c', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let o = '', e = '';
  const t = setTimeout(() => { p.kill('SIGKILL'); resolve({ ok: false, out: o, err: 'TIMEOUT' }); }, timeout);
  p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (e += d));
  p.on('close', (c) => { clearTimeout(t); resolve({ ok: c === 0, out: o, err: e.trim().split('\n').slice(-2).join(' | ') }); });
});

async function pool(items, n, fn) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; res[k] = await fn(items[k]); } }));
  return res;
}

const problems = [];
const bad = (id, msg) => problems.push(`${id}: ${msg}`);
const baked = {};
const norm = (ch, o) => (ch.cases ? o.split('\n').filter((l) => l.startsWith('@@')).join('\n') : o.trimEnd());

const ids = new Set();
for (const c of AUTHORED) { if (ids.has(c.id)) bad(c.id, 'duplicate id'); ids.add(c.id); }
const prompts = new Set();
for (const c of AUTHORED) { const k = c.prompt + (c.snippet ?? ''); if (prompts.has(k)) bad(c.id, 'duplicate prompt'); prompts.add(k); }

await pool(AUTHORED, 8, async (c) => {
  if (c.format === 'trace') {
    const r = await py(c.snippet);
    if (!r.ok) return bad(c.id, `snippet failed: ${r.err}`);
    const right = c.options[c.answer].trim();
    if (r.out.trim() !== right) bad(c.id, `declared answer ${JSON.stringify(right)} but Python printed ${JSON.stringify(r.out.trim())}`);
    if (new Set(c.options.map((o) => o.trim())).size !== 4) bad(c.id, 'options are not 4 distinct strings');
    return;
  }
  const a = await py(c.target + '\n' + (c.test ?? ''));
  if (!a.ok) return bad(c.id, `reference failed: ${a.err}`);
  const b = await py(c.target + '\n' + (c.test ?? ''));
  if (a.out !== b.out) bad(c.id, 'reference output is not deterministic');
  const exp = norm(c, a.out);
  if (c.cases && exp.includes('@@!')) bad(c.id, 'reference raises on a case');
  if (c.cases && exp.split('\n').length !== c.cases.length) bad(c.id, 'reference did not print one result per case');
  if (!exp.trim()) bad(c.id, 'reference prints nothing');
  baked[c.id] = exp;
  const s = await py(c.starter + '\n' + (c.test ?? ''), 8000);
  if (norm(c, s.out) === exp && s.ok) bad(c.id, 'starter already passes');
});

// Drill families: many seeds, every one must run, stay unique and stay short.
const fams = catalog.concepts.flatMap((k) => catalog.families(k.id).map((f) => [k.id, f]));
const seenPrompts = new Set();
let drillRuns = 0;
await pool(fams.flatMap(([k, f]) => Array.from({ length: SEEDS }, (_, s) => [k, f, s + 1])), 8, async ([k, f, s]) => {
  const d = catalog.drill(f, s * 104729 + 17);
  drillRuns++;
  if (d.target.split('\n').length > 20) bad(d.id, 'solution longer than 20 lines');
  seenPrompts.add(d.prompt);
  const r = await py(d.target + '\n' + (d.test ?? ''), 10000);
  if (!r.ok) bad(d.id, `drill failed (${k}): ${r.err}`);
  else if (!r.out.trim()) bad(d.id, 'drill prints nothing');
});

writeFileSync(join(root, 'src/curriculum/baked.json'), JSON.stringify(Object.fromEntries(Object.entries(baked).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');

const byConcept = {};
for (const c of AUTHORED) (byConcept[c.concept] ??= []).push(c.d);
console.log('\nconcept            authored  drills  d-range');
for (const k of catalog.concepts) {
  const d = (byConcept[k.id] ?? []).sort((a, b) => a - b);
  console.log(`${k.id.padEnd(18)} ${String(d.length).padStart(7)} ${String(catalog.families(k.id).length).padStart(7)}  ${d.length ? d[0] + '-' + d[d.length - 1] : '-'}`);
  if (!d.length && !catalog.families(k.id).length) bad(k.id, 'concept has no content');
}
console.log(`\n${AUTHORED.length} authored, ${fams.length} drill families, ${drillRuns} drill instances run, ${seenPrompts.size} distinct drill prompts`);
if (problems.length) { console.error(`\n${problems.length} problem(s):\n` + problems.map((p) => ' - ' + p).join('\n')); process.exit(1); }
console.log('All good. baked.json updated.');
