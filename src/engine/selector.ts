import type { Challenge, ConceptId, PickTag, Save, Slot } from './types';
import type { Catalog } from './catalog';
import { flowTarget, moodOf } from './flow';
import { isDue, isUnlocked, masteryFrac } from './mastery';
import { predict } from './rating';
import { clamp, dayKey, dayNumber, hash32, mulberry32 } from './rng';

const CONCEPT_TRACK_CACHE = (by: Record<string, import('./types').Concept>, id: string): string => by[id]?.track ?? 'x';

export const ARC: Slot[] = ['warmup', 'core', 'core', 'review', 'stretch'];

export interface Pick { ch: Challenge; slot: Slot; tag: PickTag; p: number; reason: string }

const FAMILY_COOLDOWN = 25;
const RECALL_AFTER_DAYS = 30;

/** Server-free, stable prompt fingerprint. */
export const sigOf = (ch: Challenge): number => hash32(ch.prompt + '|' + (ch.snippet ?? ''));

function slotTarget(save: Save, slot: Slot, struggling: boolean): { p: number; tag: PickTag } {
  const base = flowTarget(save.flow);
  if (save.g.n < 3) return { p: 0.85, tag: 'warmup' };
  if (struggling && (slot === 'core' || slot === 'stretch')) return { p: 0.93, tag: 'breather' };
  switch (slot) {
    case 'warmup': return { p: 0.92, tag: 'warmup' };
    case 'review': return { p: 0.84, tag: 'review' };
    case 'stretch': return { p: Math.min(0.58, base - 0.14), tag: 'stretch' };
    default: return { p: base, tag: 'core' };
  }
}

/** Hard difficulty window for a slot. This is what prevents sudden jumps, whatever the probability model says. */
function window(save: Save, slot: Slot, tag: PickTag): [number, number] {
  const solved = save.recent.filter((r) => r.score >= 0.85).slice(-6).map((r) => r.d);
  const ref = Math.max(save.g.r - 30, ...solved);
  if (tag === 'breather') return [save.g.r - 320, save.g.r - 60];
  switch (slot) {
    case 'warmup': return [save.g.r - 320, save.g.r - 40];
    case 'review': return [save.g.r - 300, ref + 30];
    case 'stretch': return [save.g.r - 40, ref + 130];
    default: return [save.g.r - 260, ref + 75];
  }
}

interface Ctx { save: Save; cat: Catalog; today: number; seenSigs: Set<number>; rng: () => number; byId: Record<string, import('./types').Concept> }

function makeCtx(save: Save, cat: Catalog, now: number): Ctx {
  return { save, cat, today: dayNumber(dayKey(new Date(now))), seenSigs: new Set(save.sigs), rng: mulberry32(hash32(`${save.salt}:${save.issued}`)), byId: Object.fromEntries(cat.concepts.map((c) => [c.id, c])) };
}

function freshDrill(ctx: Ctx, family: string): Challenge | null {
  for (let k = 0; k < 8; k++) {
    const seed = hash32(`${ctx.save.salt}:${ctx.save.issued}:${family}:${k}`);
    const ch = ctx.cat.drill(family, seed);
    if (!ctx.seenSigs.has(sigOf(ch))) return ch;
  }
  return null;
}

export function pickNext(save: Save, cat: Catalog, slot: Slot, focus: ConceptId | null, now: number = Date.now()): Pick {
  const ctx = makeCtx(save, cat, now);
  const mood = moodOf(save.flow);
  let { p: target, tag } = slotTarget(save, slot, mood === 'struggling');
  const [lo0, hi0] = window(save, slot, tag);

  const unlocked = cat.concepts.filter((c) => isUnlocked(save, c, ctx.byId));
  let pool = focus ? unlocked.filter((c) => c.id === focus) : unlocked;
  if (!pool.length) pool = unlocked.length ? unlocked : cat.concepts.filter((c) => c.needs.length === 0);

  // Review slot: only concepts that are due. If nothing is due, quietly become a core slot on the weakest touched concept.
  let reviewOnly = false;
  if (slot === 'review' && tag === 'review') {
    const due = pool.filter((c) => isDue(save, c.id, ctx.today));
    if (due.length) { pool = due; reviewOnly = true; }
    else { tag = 'core'; target = flowTarget(save.flow); }
  }

  const recentC = save.recent.slice(-3).map((r) => r.concept);
  const recentFam = new Set(save.recent.slice(-FAMILY_COOLDOWN).map((r) => r.family));
  const lastFormat = save.recent.slice(-2).map((r) => r.format);
  const trackCount: Record<string, number> = {};
  for (const r of save.recent.slice(-10)) { const t = CONCEPT_TRACK_CACHE(ctx.byId, r.concept); trackCount[t] = (trackCount[t] ?? 0) + 1; }

  type Cand = { ch: Challenge; recall: boolean };
  const gather = (concepts: typeof pool): Cand[] => {
    const out: Cand[] = [];
    for (const c of concepts) {
      for (const ch of cat.authored) {
        if (ch.concept !== c.id) continue;
        const seen = save.seenAt[ch.id];
        if (seen === undefined) { if (!ctx.seenSigs.has(sigOf(ch))) out.push({ ch, recall: false }); }
        else if (cat.families(c.id).length === 0 && ctx.today - seen >= RECALL_AFTER_DAYS) out.push({ ch, recall: true });
      }
      const fams = cat.families(c.id).filter((f) => !recentFam.has(f));
      for (const f of [...fams].sort(() => ctx.rng() - 0.5).slice(0, 4)) { const d = freshDrill(ctx, f); if (d) out.push({ ch: d, recall: false }); }
    }
    return out;
  };
  const fitsWindow = (x: Cand) => x.ch.d <= hi0 && x.ch.d >= lo0;
  let cands = gather(pool);
  // A due concept whose remaining challenges are all too deep is skipped for now rather than forcing a cliff.
  if (reviewOnly && !cands.some(fitsWindow)) {
    reviewOnly = false; tag = 'core'; target = flowTarget(save.flow);
    cands = gather(focus ? unlocked.filter((c) => c.id === focus) : unlocked);
  }
  // Hard rule: if anything fits the difficulty window, only those are considered.
  const inWindow = cands.filter(fitsWindow);
  if (inWindow.length) cands = inWindow;

  // If nothing at all is available (a tiny focus concept that is fully cleared), widen to every unlocked concept.
  if (!cands.length && focus) return pickNext(save, cat, slot, null, now);

  const score = (x: { ch: Challenge; recall: boolean }, lo: number, hi: number): number => {
    const ch = x.ch;
    const p = predict(save, ch.concept, ch.d);
    let s = -Math.abs(p - target) / 0.1;
    if (ch.d > hi) s -= 6 + (ch.d - hi) / 15;
    if (ch.d < lo) s -= 1.5 + (lo - ch.d) / 80;
    if (recentC[recentC.length - 1] === ch.concept) s -= 0.7;
    else if (recentC.includes(ch.concept)) s -= 0.3;
    if (recentFam.has(ch.family)) s -= 2;
    if (lastFormat.length === 2 && lastFormat.every((f) => f === ch.format)) s -= 0.4;
    if (isDue(save, ch.concept, ctx.today)) s += reviewOnly ? 0.5 : 0.6;
    if (ch.kind === 'authored' && !x.recall) s += 0.3;
    if (x.recall) s -= 0.4;
    const track = CONCEPT_TRACK_CACHE(ctx.byId, ch.concept);
    s -= 0.12 * (trackCount[track] ?? 0);
    if (slot === 'stretch' && ch.kind === 'authored') s += 0.25;
    if (focus && ch.concept === focus) s += 1.5;
    if ((save.mastery[ch.concept]?.seen ?? 0) === 0 && tag === 'core') s += 0.35;
    return s + ctx.rng() * 0.3;
  };

  let best: { ch: Challenge; recall: boolean } | null = null;
  let bestScore = -Infinity;
  for (const x of cands) { const s = score(x, lo0, hi0); if (s > bestScore) { bestScore = s; best = x; } }
  if (!best) { // content layer returned nothing usable: serve the easiest unseen thing rather than fail
    const any = cat.concepts.flatMap((c) => cat.families(c.id).slice(0, 1)).map((f) => freshDrill(ctx, f)).filter((x): x is Challenge => !!x);
    best = { ch: any.sort((a, b) => a.d - b.d)[0], recall: false };
  }

  const ch = best.ch;
  const p = predict(save, ch.concept, ch.d);
  const cname = ctx.byId[ch.concept]?.name ?? ch.concept;
  const gap = Math.round(ch.d - save.g.r);
  let reason: string;
  let outTag: PickTag = tag;
  if (best.recall) { reason = `Recall. You cleared this a while ago: ${cname}.`; outTag = 'recall'; }
  else if (tag === 'warmup') reason = 'Warm-up. A quick win to start moving.';
  else if (tag === 'breather') reason = 'Easing off. A confidence step after a hard stretch.';
  else if (tag === 'review') reason = `Review due. ${cname} is ready for a refresher.`;
  else if (tag === 'stretch') reason = `Stretch. About ${Math.round(p * 100)}% to solve${gap > 0 ? `, ${gap} deeper than you` : ''}.`;
  else if ((save.mastery[ch.concept]?.seen ?? 0) === 0) { reason = `New concept. ${cname}.`; outTag = 'new'; }
  else reason = `Built for you. About ${Math.round(p * 100)}% to solve.`;
  if (focus) outTag = tag === 'core' ? 'focus' : outTag;
  return { ch, slot, tag: outTag, p: clamp(p, 0.01, 0.99), reason };
}
