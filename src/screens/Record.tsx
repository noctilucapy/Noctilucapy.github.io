import { useState } from 'react';
import { Icon } from '../components/Icon';
import { CONCEPT_BY_ID, TRACKS } from '../curriculum/concepts';
import { rankOf } from '../engine/rating';
import { exportSave, importSave } from '../engine/store';
import type { Save, Settings } from '../engine/types';
import { levelOf } from '../engine/xp';

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="muted" style={{ padding: 14, fontSize: 14 }}>Solve a few challenges to see your depth over time.</p>;
  const W = 320, H = 120, lo = Math.min(...values) - 20, hi = Math.max(...values) + 20;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - ((v - lo) / (hi - lo)) * (H - 12) - 6] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Depth over your last ${values.length} challenges, from ${values[0]} to ${values[values.length - 1]}`}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} className="grid" x1="0" x2={W} y1={H * f} y2={H * f} />)}
      <path className="area" d={`${d}L${W} ${H}L0 ${H}Z`} />
      <path className="path" d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Props { save: Save; onSettings: (s: Partial<Settings>) => void; onImport: (s: Save) => void; onReset: () => void }

export function RecordScreen({ save, onSettings, onImport, onReset }: Props) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const rank = rankOf(save.g.r), lv = levelOf(save.xp);
  const hist = save.history;
  const clean = save.stats.solved ? Math.round((save.stats.clean / save.stats.solved) * 100) : 0;
  const hours = save.stats.secs / 3600;
  const byTrack = TRACKS.map((t) => {
    const h = hist.filter((a) => CONCEPT_BY_ID[a.concept]?.track === t.id);
    return { t, n: h.length, ok: h.length ? Math.round((h.filter((a) => a.score >= 0.85).length / h.length) * 100) : 0 };
  });
  const backup = () => { const s = exportSave(save); setText(s); navigator.clipboard?.writeText(s).then(() => setMsg('Backup copied. Keep it somewhere safe.'), () => setMsg('Select the text below and copy it.')); };
  const restore = () => { const s = importSave(text); if (s) { onImport(s); setMsg('Restored.'); } else setMsg('That backup could not be read.'); };

  return (
    <div>
      <div className="page-title"><div className="eyebrow">Record</div><h1>{rank.name}, level {lv.level}</h1><p>{save.migrated ? `Imported from the old version: ${save.migrated.levels} levels set your starting depth.` : 'Everything here is stored on this device only.'}</p></div>
      <div className="stats">
        <div className="stat"><small>Depth</small><b>{Math.round(save.g.r)}</b></div>
        <div className="stat"><small>XP</small><b>{save.xp}</b></div>
        <div className="stat"><small>Solved</small><b>{save.stats.solved}</b></div>
        <div className="stat"><small>Clean solves</small><b>{clean}%</b></div>
        <div className="stat"><small>Best streak</small><b>{save.stats.bestStreak}d</b></div>
        <div className="stat"><small>Time coding</small><b>{hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`}</b></div>
      </div>

      <section className="section"><div className="eyebrow">Depth over time</div><div className="card"><Spark values={hist.map((h) => h.r)} /></div></section>

      <section className="section"><div className="eyebrow">Clean solve rate by track</div>
        <div className="card tracks">{byTrack.map(({ t, n, ok }) => <div className="track-row" key={t.id}><span>{t.name}</span><div className="meter"><i style={{ width: `${ok}%` }} /></div><span>{n ? `${ok}%` : '-'}</span></div>)}</div>
      </section>

      <section className="section"><div className="eyebrow">Recent</div>
        <ul className="card history">
          {hist.length === 0 && <li className="muted">Nothing yet.</li>}
          {[...hist].reverse().slice(0, 12).map((h, i) => (
            <li key={i}><span className={`dotscore ${h.score >= 0.85 ? 'ok' : h.score > 0 ? 'mid' : 'no'}`} /><span className="h-name">{CONCEPT_BY_ID[h.concept]?.name ?? h.concept}</span><small>{h.xp ? `+${h.xp} XP` : 'no XP'}</small></li>
          ))}
        </ul>
      </section>

      <section className="section"><div className="eyebrow">Settings</div>
        <div className="card">
          <div className="setting"><div><b>Key haptics</b><small>A light tick on toolbar keys, where the device allows it.</small></div>
            <button className="switch" role="switch" aria-checked={save.settings.haptics} aria-label="Key haptics" onClick={() => onSettings({ haptics: !save.settings.haptics })} /></div>
          <div className="setting"><div><b>Editor text size</b><small>16 is the smallest that stops iOS zooming in.</small></div>
            <div className="seg">{([16, 17, 18] as const).map((n) => <button key={n} aria-pressed={save.settings.fontSize === n} onClick={() => onSettings({ fontSize: n })}>{n}</button>)}</div></div>
        </div>
      </section>

      <section className="section"><div className="eyebrow">Backup</div>
        <div className="card backup">
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>Progress lives in this browser. Copy a backup before clearing site data or changing phones.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Backup text appears here. Paste one to restore." aria-label="Backup text" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
          <div className="row"><button className="btn ghost small" onClick={backup}><Icon name="copy" size={15} /> Copy backup</button><button className="btn ghost small" onClick={restore} disabled={!text.trim()}>Restore</button></div>
          {msg && <p className="muted" role="status" style={{ fontSize: 13 }}>{msg}</p>}
        </div>
        <div style={{ marginTop: 14 }}>
          {confirm
            ? <div className="row"><button className="btn danger small" onClick={onReset}>Erase everything</button><button className="btn ghost small" onClick={() => setConfirm(false)}>Cancel</button></div>
            : <button className="btn ghost small" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </section>
    </div>
  );
}
