import { useState } from 'react';
import { Icon, Meter } from '../components/Icon';
import { TRACKS } from '../curriculum/concepts';
import { isDue, isUnlocked, masteryFrac, masteryLabel } from '../engine/mastery';
import type { Catalog } from '../engine/catalog';
import type { Save } from '../engine/types';
import { dayKey, dayNumber } from '../engine/rng';

export function SkillsScreen({ save, cat, onPractice }: { save: Save; cat: Catalog; onPractice: (concept: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const by = Object.fromEntries(cat.concepts.map((c) => [c.id, c]));
  const today = dayNumber(dayKey());
  return (
    <div>
      <div className="page-title">
        <div className="eyebrow">Skill map</div>
        <h1>What you can do, and what is next</h1>
        <p>A concept opens when its prerequisites have two solves, or when your depth shows you are past them. Tap one to practise it.</p>
      </div>
      {TRACKS.map((t) => (
        <section className="track" key={t.id} aria-label={t.name}>
          <header><h2>{t.name}</h2><span className="eyebrow">{t.blurb}</span></header>
          <div className="card">
            {cat.concepts.filter((c) => c.track === t.id).map((c) => {
              const unlocked = isUnlocked(save, c, by);
              const due = isDue(save, c.id, today);
              const m = save.mastery[c.id];
              const authoredTotal = cat.authored.filter((a) => a.concept === c.id).length;
              const authoredDone = cat.authored.filter((a) => a.concept === c.id && save.seenAt[a.id] !== undefined).length;
              const missing = c.needs.filter((id) => (save.mastery[id]?.solved ?? 0) < 2 && save.g.r < by[id].band[0] + 250).map((id) => by[id].name);
              return (
                <div key={c.id} className={`concept${unlocked ? '' : ' locked'}`}>
                  <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                    {!unlocked && <Icon name="lock" size={16} />}
                    <span className="c-main"><b>{c.name}</b><Meter frac={unlocked ? masteryFrac(save, c) : 0} /></span>
                    <span className={`c-tag${due ? ' due' : ''}`}>{!unlocked ? 'Locked' : due ? 'Review' : masteryLabel(save, c)}</span>
                  </button>
                  {open === c.id && (
                    <div className="c-open">
                      <p>{c.blurb}</p>
                      <div className="facts">
                        <span>{m?.solved ?? 0} solved</span>
                        <span>{authoredDone}/{authoredTotal} curated cleared</span>
                        {cat.families(c.id).length > 0 && <span>endless drills</span>}
                      </div>
                      <div className="habit">Habit: {c.habit}</div>
                      {unlocked
                        ? <button className="btn primary small" onClick={() => onPractice(c.id)}>Practise {c.name.toLowerCase()} <Icon name="arrow" size={15} /></button>
                        : <p className="muted">Needs two solves in: {missing.join(', ')}.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
