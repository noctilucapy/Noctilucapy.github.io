// Plays the adaptive engine against simulated learners and reports what a real learner would feel.
//   npm run simulate
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = require(process.env.ESBUILD_PATH ?? '/opt/npm-tools/node_modules/esbuild'); }
const root = new URL('..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'noctiluca-sim-'));
const entry = join(dir, 'entry.ts');
await (await import('node:fs/promises')).writeFile(entry, `
export * from ${JSON.stringify(join(root, 'src/engine/store.ts'))};
export * from ${JSON.stringify(join(root, 'src/engine/rating.ts'))};
export * from ${JSON.stringify(join(root, 'src/engine/selector.ts'))};
export * from ${JSON.stringify(join(root, 'src/engine/rng.ts'))};
export { catalog } from ${JSON.stringify(join(root, 'src/curriculum/index.ts'))};
`);
const out = join(dir, 'engine.mjs');
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
const E = await import(pathToFileURL(out).href);

function simulate({ label, trueRating, chosen, n, seed, careless = 0 }) {
  const rng = E.mulberry32(seed);
  const bias = Object.fromEntries(E.catalog.concepts.map((c) => [c.id, (rng() - 0.5) * 240]));
  let now = new Date('2026-03-01T09:00:00').getTime();
  let save = E.chooseStart({ ...E.freshSave(now), salt: seed }, chosen);
  const ids = new Set(), prompts = new Set(); const served = [];
  let repeats = 0, recalls = 0, topRun = 0, maxRun = 0, last = null;
  for (let i = 0; i < n; i++) {
    if (!save.session || save.session.done) { save = E.startSession(save, null, now); now += 20 * 3600 * 1000; }
    const pick = E.planNext(save, E.catalog, now);
    const ch = pick.ch;
    if (pick.tag === 'recall') recalls++; else if (ids.has(ch.id) || prompts.has(E.sigOf(ch))) repeats++;
    ids.add(ch.id); prompts.add(E.sigOf(ch));
    const theta = trueRating + bias[ch.concept];
    const p = E.expectedP(theta, ch.d);
    const clean = rng() < p, solved = clean || rng() < Math.min(0.97, p + 0.2);
    const o = { solved, gaveUp: !solved, wrong: clean ? 0 : solved ? 1 + Math.floor(rng() * 3) : 3, hints: clean ? 0 : solved ? Math.floor(rng() * 3) : 3, secs: ch.par * (0.4 + rng() * 1.2), code: '' };
    served.push({ d: ch.d, concept: ch.concept, slot: pick.slot, tag: pick.tag, p, solved, clean, g: save.g.r });
    if (last === ch.concept) topRun++; else topRun = 0; maxRun = Math.max(maxRun, topRun); last = ch.concept;
    ({ save } = E.applyResult(save, ch, pick, o, E.catalog, now));
    now += 90 * 1000;
  }
  const steps = served.slice(1).map((s, i) => s.d - served[i].d);
  const jumpsUp = steps.filter((d) => d > 150).length;
  if (process.env.DEBUG_CLIFFS) served.forEach((s, i) => { if (i > 5 && s.d > Math.max(...served.slice(Math.max(0, i - 8), i).filter((x) => x.solved).map((x) => x.d), s.g) + 140) console.log('   cliff', i, s.slot, s.tag, s.concept, 'd', s.d, 'g', Math.round(s.g), 'p', s.p.toFixed(2)); });
  const hardJumps = served.filter((s, i) => i > 5 && s.d > Math.max(...served.slice(Math.max(0, i - 8), i).filter((x) => x.solved).map((x) => x.d), s.g) + 140).length;
  let fail2 = 0, cur = 0, longest = 0;
  for (const s of served) { cur = s.solved ? 0 : cur + 1; longest = Math.max(longest, cur); if (cur === 2) fail2++; }
  const core = served.filter((s) => s.slot === 'core');
  const hit = (a, b) => core.filter((s) => s.p >= a && s.p <= b).length / Math.max(1, core.length);
  const concepts = new Set(served.map((s) => s.concept));
  const tracks = new Set([...concepts].map((c) => E.catalog.concepts.find((x) => x.id === c).track));
  const stretch = served.filter((s) => s.slot === 'stretch');
  console.log(`\n== ${label}  (true ${trueRating}, told the app "${chosen}")`);
  console.log(`  challenges served        ${n}   repeats: ${repeats}   labelled recalls: ${recalls}`);
  console.log(`  rating estimate          ${Math.round(save.g.r)}  (error ${Math.round(save.g.r - trueRating)})`);
  console.log(`  clean solve rate         ${(served.filter((s) => s.clean).length / n * 100).toFixed(0)}%   any solve ${(served.filter((s) => s.solved).length / n * 100).toFixed(0)}%`);
  console.log(`  core slots in 60-85% band ${(hit(0.6, 0.85) * 100).toFixed(0)}%   stretch avg p ${(stretch.reduce((a, s) => a + s.p, 0) / Math.max(1, stretch.length) * 100).toFixed(0)}%`);
  const tooHard = served.filter((s) => s.p < 0.3).length / n, tooEasy = served.filter((s) => s.p > 0.95).length / n;
  console.log(`  too hard (p<30%) ${(tooHard * 100).toFixed(0)}%   too easy (p>95%) ${(tooEasy * 100).toFixed(0)}%   cliffs (>140 above recent best): ${hardJumps}`);
  console.log(`  longest failure streak   ${longest}   concepts ${concepts.size}/29, tracks ${tracks.size}/5, longest same-concept run ${maxRun + 1}`);
  return { repeats, hardJumps, longest };
}

const r = [
  simulate({ label: 'Beginner, honest', trueRating: 560, chosen: 'new', n: 400, seed: 1 }),
  simulate({ label: 'Learner who guessed too low', trueRating: 1100, chosen: 'new', n: 400, seed: 2 }),
  simulate({ label: 'Learner who guessed too high', trueRating: 620, chosen: 'comfortable', n: 400, seed: 3 }),
  simulate({ label: 'Strong, steady', trueRating: 1300, chosen: 'some', n: 600, seed: 4 }),
  simulate({ label: 'Expert, long run', trueRating: 1700, chosen: 'comfortable', n: 800, seed: 5 }),
];
const bad = r.filter((x) => x.repeats > 0 || x.hardJumps > 3 || x.longest > 5);
console.log(bad.length ? '\nPROBLEMS FOUND' : '\nNo repeats, no cliffs (more than 3 per run), no long failure streaks.');
process.exit(bad.length ? 1 : 0);
