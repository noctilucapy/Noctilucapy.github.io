import { Depth, Icon, Meter } from '../components/Icon';
import { TRACKS } from '../curriculum/concepts';
import { recLabel, type Rec } from '../engine/coach';
import { masteryFrac } from '../engine/mastery';
import { rankOf, RANKS } from '../engine/rating';
import type { Pick } from '../engine/selector';
import { ARC } from '../engine/selector';
import { COACH, moodOf } from '../engine/flow';
import type { Concept, Save } from '../engine/types';
import { levelOf } from '../engine/xp';

interface Props { save: Save; concepts: Concept[]; preview: Pick | null; recs: Rec[]; onStart: (focus: string | null) => void }

export function HomeScreen({ save, concepts, preview, recs, onStart }: Props) {
  const rank = rankOf(save.g.r);
  const lv = levelOf(save.xp);
  const s = save.session && !save.session.done ? save.session : null;
  const idx = s?.idx ?? 0;
  const next = rank.next;
  const mood = moodOf(save.flow);
  const goalsLeft = save.goals.list.filter((g) => g.progress < g.target).length;

  return (
    <div className="home">
      <section className="rank" aria-label="Your depth">
        <div className="eyebrow">Rank</div>
        <h1 className="rank-name">{rank.name}</h1>
        <div className="rank-sub">DEPTH <b>{Math.round(save.g.r)}</b>{save.g.n < 6 ? ' · still calibrating' : ''}</div>
        <Meter frac={rank.frac} thick />
        <div className="rank-foot"><span>{RANKS[rank.index].min}</span><span>{next ? `${Math.max(1, next - Math.round(save.g.r))} to ${RANKS[rank.index + 1].name}` : 'Deepest rank'}</span></div>
        <div className="level-row"><span>LEVEL <b>{lv.level}</b></span><Meter frac={lv.frac} /><span>{lv.into}/{lv.need} XP</span></div>
      </section>

      <button className="descent" onClick={() => onStart(null)}>
        <div className="eyebrow">{s ? `Descent in progress · ${idx} of ${ARC.length}` : 'Today'}</div>
        <h2>{s ? 'Continue your descent' : 'Begin a descent'}</h2>
        <p>{preview ? preview.reason : 'Five challenges: a warm-up, two core, a review and a stretch. About 12 minutes.'}</p>
        {preview && <div className="descent-meta" style={{ marginTop: 10 }}><span><Depth d={preview.ch.d} /> {Math.round(preview.ch.d)}</span><span>~{Math.round(preview.p * 100)}% to solve</span></div>}
        <div className="pips" aria-hidden="true">{ARC.map((_, i) => <i key={i} className={i < idx ? 'on' : ''} />)}</div>
        <div className="descent-row"><span className="descent-meta"><span>{s ? `${ARC.length - idx} left` : '5 challenges'}</span><span>~12 min</span></span><span className="descent-go"><Icon name="arrow" size={20} /></span></div>
      </button>

      <section className="section" aria-label="Daily goals">
        <div className="eyebrow"><span>Today's goals</span><span>{goalsLeft === 0 ? 'All done' : `${goalsLeft} left`}</span></div>
        <div className="card">
          {save.goals.list.map((g) => (
            <div key={g.id} className={`goal${g.progress >= g.target ? ' done' : ''}`}>
              <span className="goal-check">{g.progress >= g.target && <Icon name="check" size={13} stroke={2.4} />}</span>
              <span className="goal-text">{g.label}</span>
              <span className="goal-n">{g.progress}/{g.target}</span>
            </div>
          ))}
        </div>
        <div className="eyebrow" style={{ marginTop: 10, justifyContent: 'flex-start', gap: 14 }}>
          <span><Icon name="flame" size={12} /> {save.streak.days} day streak</span>
          {save.streak.shield > 0 && <span><Icon name="shield" size={12} /> {save.streak.shield} shield</span>}
        </div>
      </section>

      <section className="section" aria-label="Coach">
        <div className="eyebrow"><span>Coach</span></div>
        <div className="card">
          <p className="coach">{COACH[mood]}</p>
          {recs.map((r) => (
            <button key={r.kind + r.concept} className="rec" disabled={!r.canStart} onClick={() => r.canStart && onStart(r.concept)}>
              <span className="rec-kind">{recLabel(r.kind)}</span>
              <span className="rec-body"><b>{r.title}</b><span>{r.why}</span></span>
              {r.canStart && <Icon name="chevron" size={18} />}
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-label="Tracks">
        <div className="eyebrow"><span>Tracks</span></div>
        <div className="card tracks">
          {TRACKS.map((t) => {
            const cs = concepts.filter((c) => c.track === t.id);
            const avg = cs.reduce((a, c) => a + masteryFrac(save, c), 0) / cs.length;
            return <div className="track-row" key={t.id}><span>{t.name}</span><Meter frac={avg} /><span>{Math.round(avg * 100)}%</span></div>;
          })}
        </div>
      </section>
    </div>
  );
}
