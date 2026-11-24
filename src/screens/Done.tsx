import { Icon } from '../components/Icon';
import { CONCEPT_BY_ID } from '../curriculum/concepts';
import type { Save, Slot } from '../engine/types';

const NAME: Record<Slot, string> = { warmup: 'Warm-up', core: 'Core', review: 'Review', stretch: 'Stretch' };

export function DoneScreen({ save, onAgain, onHome }: { save: Save; onAgain: () => void; onHome: () => void }) {
  const s = save.session;
  if (!s) return null;
  const solved = s.results.filter((r) => r.score > 0).length;
  const xp = s.results.reduce((a, r) => a + r.xp, 0);
  const first = save.history[Math.max(0, save.history.length - s.results.length)]?.r ?? save.g.r;
  const dR = Math.round(save.g.r) - first;
  const line = solved === 5 ? 'A full descent. Everything landed.' : solved >= 3 ? 'A solid descent. The misses are tomorrow\'s reviews.' : 'A hard one. Difficulty will step down to rebuild footing.';
  return (
    <div className="done-wrap">
      <div className="eyebrow">Descent complete</div>
      <h1>{solved} of 5</h1>
      <p className="muted" style={{ fontSize: 16, lineHeight: 1.5, maxWidth: '34ch' }}>{line}</p>
      <div className="stats">
        <div className="stat"><small>XP earned</small><b>+{xp}</b></div>
        <div className="stat"><small>Depth change</small><b>{dR > 0 ? `+${dR}` : dR}</b></div>
      </div>
      <ul className="card arc" style={{ marginTop: 18 }}>
        {s.results.map((r, i) => (
          <li key={i}><span className="slotname">{NAME[r.slot]}</span><span className="name">{CONCEPT_BY_ID[r.concept]?.name}<small>depth {Math.round(r.d)}</small></span><span className={`dotscore ${r.score >= 0.85 ? 'ok' : r.score > 0 ? 'mid' : 'no'}`} /><span className="xp">{r.xp ? `+${r.xp}` : '-'}</span></li>
        ))}
      </ul>
      <div className="actions" style={{ marginTop: 22 }}>
        <button className="btn ghost" onClick={onHome}>Home</button>
        <button className="btn primary" onClick={onAgain}>Another descent <Icon name="arrow" size={17} /></button>
      </div>
    </div>
  );
}
