import { useEffect, useMemo, useRef, useState } from 'react';
import { Accessory, keepFocus } from '../components/Accessory';
import { CodeEditor, type EditorHandle } from '../components/CodeEditor';
import { CodeView } from '../components/CodeView';
import { Depth, Icon, Meter } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { CONCEPT_BY_ID } from '../curriculum/concepts';
import { grade, type Grade } from '../curriculum/grade';
import { ARC, type Pick } from '../engine/selector';
import type { Outcome, Report } from '../engine/store';
import type { Save, Slot } from '../engine/types';
import { tap } from '../haptics';
import { useMedia } from '../hooks';
import { runPython, runtimeState, subscribeRuntime, warmUp, type RuntimeState } from '../python';

const SLOT_LABEL: Record<Slot, string> = { warmup: 'WARM', core: 'CORE', review: 'REVIEW', stretch: 'STRETCH' };
const TAG_LABEL: Record<string, string> = { warmup: 'Warm-up', new: 'New concept', core: 'Core', review: 'Review', stretch: 'Stretch', breather: 'Easing off', recall: 'Recall', focus: 'Focused practice' };
const TRACK_LABEL: Record<string, string> = { foundations: 'Foundations', data: 'Data', craft: 'Craft', algorithms: 'Algorithms', theory: 'Game theory' };

type Busy = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'error'; text: string };

interface Props {
  pick: Pick; save: Save; report: Report | null; nextSlot: Slot | null;
  onResult: (o: Outcome) => void; onNext: () => void; onSwap: () => void; onBack: () => void;
}

export function PlayScreen({ pick, save, report, nextSlot, onResult, onNext, onSwap, onBack }: Props) {
  const ch = pick.ch;
  const concept = CONCEPT_BY_ID[ch.concept];
  const [code, setCode] = useState(ch.starter);
  const [gr, setGr] = useState<Grade | null>(null);
  const [state, setState] = useState<Busy>({ kind: 'idle' });
  const [wrong, setWrong] = useState(0);
  const [hints, setHints] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [gone, setGone] = useState<number[]>([]);
  const [sheet, setSheet] = useState(false);
  const [coding, setCoding] = useState(false);     // explicit full-screen editor (phones)
  const [taskOpen, setTaskOpen] = useState(false);   // task + hints panel, floats over the editor
  const [outOpen, setOutOpen] = useState(false);     // full results panel, floats over the editor
  const [rt, setRt] = useState<RuntimeState>(runtimeState());
  const [gaveUp, setGaveUp] = useState(false);
  const editor = useRef<EditorHandle>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const started = useRef(Date.now());
  const token = useRef(0);
  const slot = useRef<HTMLDivElement>(null);
  const savedY = useRef(0);
  const [slotH, setSlotH] = useState(0);
  const phone = useMedia('(pointer: coarse) and (max-width: 820px)');
  const busy = state.kind === 'busy';
  const finished = report !== null;
  const isTrace = ch.format === 'trace';
  const full = coding && phone && !isTrace;
  const lines = code.trim() ? code.replace(/\s+$/, '').split('\n').length : 0;
  const examples = useMemo(() => {
    if (!ch.cases || !ch.expected) return [];
    const want = ch.expected.split('\n');
    return ch.cases.slice(0, 2).map((c, i) => ({ call: c, out: want[i]?.slice(3) ?? '' }));
  }, [ch]);

  useEffect(() => subscribeRuntime(setRt), []);
  useEffect(() => { if (!isTrace) warmUp(); window.scrollTo(0, 0); }, [isTrace]);
  useEffect(() => () => { token.current++; }, []);
  useEffect(() => { if (report) setSheet(true); }, [report]);
  // Lock the page behind the full-screen editor; the layout never depends on keyboard or focus state, so it cannot collapse or flicker.
  useEffect(() => {
    document.documentElement.classList.toggle('code-lock', full);
    return () => document.documentElement.classList.remove('code-lock');
  }, [full]);
  useEffect(() => { if (finished) closeEditor(); }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Called straight from a tap: focusing inside the gesture is what makes iOS raise the keyboard. */
  function openEditor() {
    if (finished || !phone) return;
    savedY.current = window.scrollY;
    setSlotH(Math.round(slot.current?.getBoundingClientRect().height ?? 0));
    editor.current?.focus();
    setTaskOpen(false); setOutOpen(false); setCoding(true);
  }
  function closeEditor() {
    if (!coding) return;
    editor.current?.blur();
    setCoding(false); setTaskOpen(false); setOutOpen(false);
    requestAnimationFrame(() => window.scrollTo(0, savedY.current));
  }
  function nextHint() { if (hintsLeft > 0) { tap(); setHints((h) => h + 1); } }

  const secs = () => Math.min(3600, Math.round((Date.now() - started.current) / 1000));
  const outcome = (solved: boolean, gave: boolean, w: number): Outcome => ({ solved, gaveUp: gave, wrong: w, hints, secs: secs(), code });

  async function run() {
    if (busy || finished) return;
    if (full) { setTaskOpen(false); }                      // stay in the editor: the result shows in the strip under the code
    else { requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })); editor.current?.blur(); }
    const mine = ++token.current;
    setState({ kind: 'busy', text: rt === 'ready' ? 'Running your code' : 'Waking Python. The first launch downloads the runtime' });
    try {
      const r = await runPython({ code, target: ch.target, test: ch.test, expected: ch.expected });
      if (mine !== token.current) return;
      const g = grade(ch, r.actual, ch.expected ?? r.expected);
      setGr(g); setState({ kind: 'idle' });
      if (g.solved) { tap(18); onResult(outcome(true, false, wrong)); }
      else setWrong((w) => w + 1);
    } catch (e) {
      if (mine !== token.current) return;
      const m = (e as Error).message;
      setGr(null);
      // Errors (syntax, timeouts, load failures) are not counted as wrong attempts.
      setState({ kind: 'error', text: m === 'TIMEOUT_RUN' ? 'That ran for too long. Check for a loop that never ends.' : m === 'TIMEOUT_LOAD' || m === 'START_FAILED' ? 'Python could not load. Check your connection and tap Run again.' : m });
    }
  }

  function check() {
    if (sel === null || finished) return;
    if (sel === ch.answer) { tap(18); onResult(outcome(true, false, wrong)); }
    else { tap(30); setWrong((w) => w + 1); setGone((g) => [...g, sel]); setSel(null); }
  }

  function giveUp() { setGaveUp(true); onResult(outcome(false, true, wrong)); }

  const pips = ARC.map((slot, i) => {
    const r = save.session?.results[i];
    const cls = r ? (r.score >= 0.5 ? 'done' : 'miss') : i === (save.session?.idx ?? 0) - (finished ? 1 : 0) ? 'now' : '';
    return { slot, cls };
  });
  const canSwap = !finished && wrong === 0 && hints === 0 && (save.session?.swaps ?? 0) < 2;
  const hintsLeft = ch.hints.length - hints;
  const solvedNow = finished && report.score > 0;
  const status = state.kind === 'busy' ? 'RUNNING' : state.kind === 'error' ? 'ERROR' : solvedNow ? 'ALL PASS' : gr ? `${gr.passed} OF ${gr.total}` : 'READY';
  const statusCls = state.kind === 'busy' ? 's-busy' : state.kind === 'error' || (gr && !gr.solved) ? 's-bad' : solvedNow ? 's-ok' : '';
  const firstBad = gr?.cases.findIndex((c) => !c.ok) ?? -1;

  const lastLine = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? t;
  const summary = state.kind === 'busy' ? state.text
    : state.kind === 'error' ? lastLine(state.text)
      : solvedNow ? 'All tests pass'
        : gr && ch.cases ? (firstBad >= 0 ? <>{gr.cases[firstBad].call} <Icon name="arrow" size={13} className="inline-ico" /> got {gr.cases[firstBad].got}</> : `${gr.passed} of ${gr.total} pass`)
          : gr ? (lastLine(gr.prints || 'Program finished with no output.'))
            : ch.cases ? 'Run to check against hidden cases' : 'Run to see your output';

  const examplesEl = examples.length > 0 && <div className="examples" aria-label="Examples">{examples.map((e) => <div key={e.call}><code>{e.call}</code><em>{e.out}</em></div>)}</div>;
  const hintsEl = hints > 0 && <div className="hints" role="note">{ch.hints.slice(0, hints).map((h, i) => <div className="hint" key={i}><b>{i + 1}/{ch.hints.length}</b><span>{h}</span></div>)}</div>;

  const outputBody = (
    <>
      {state.kind === 'busy' && <pre className="out" aria-live="polite">{state.text}</pre>}
      {state.kind === 'error' && <pre className="out error" aria-live="polite">{state.text}</pre>}
      {state.kind === 'idle' && !gr && <pre className="out muted">{ch.cases ? 'Run to check your code against hidden cases.' : 'Your result will appear here.'}</pre>}
      {state.kind === 'idle' && gr && ch.cases && (
        <>
          <div className="score" aria-live="polite">
            <span>{gr.passed} of {gr.total} pass</span>
            <div className="bars">{gr.cases.map((c, i) => <i key={i} className={c.ok ? 'ok' : 'no'} />)}</div>
          </div>
          {!gr.solved && firstBad >= 0 && (
            <div className="cases">
              <div className="case no"><b><Icon name="x" size={13} stroke={2} /></b><code>{gr.cases[firstBad].call}</code></div>
              <div className="case-detail">expected <i>{gr.cases[firstBad].want}</i><br />got <i>{gr.cases[firstBad].got}</i></div>
            </div>
          )}
          {gr.prints && <pre className="out muted">{gr.prints}</pre>}
        </>
      )}
      {state.kind === 'idle' && gr && !ch.cases && (
        <>
          <pre className={`out${gr.solved ? '' : ' muted'}`}>{gr.prints || 'Program finished with no output.'}</pre>
          {!gr.solved && wrong >= 2 && <pre className="out">{`Expected\n${ch.expected ?? ''}`}</pre>}
        </>
      )}
    </>
  );

  const runKey = <button className="run-mini" onPointerDown={keepFocus} onClick={run} disabled={busy}><Icon name="play" size={15} /> {busy ? 'Running' : 'Run'}</button>;

  return (
    <div className="workspace play challenge">
      <div className="play-bar">
        <button className="back" onClick={onBack}><Icon name="back" size={18} /> EXIT</button>
        <div className="slots" role="list" aria-label="Descent progress">
          {pips.map((p, i) => <div key={i} role="listitem" className={`slot ${p.cls}`}><i /><span>{SLOT_LABEL[p.slot]}</span></div>)}
        </div>
        <button className="swap" onClick={onSwap} disabled={!canSwap} aria-label="Swap this challenge for another"><Icon name="swap" size={14} /> {2 - (save.session?.swaps ?? 0)}</button>
      </div>

      <div className="head">
        <div className="eyebrow">{TAG_LABEL[pick.tag] ?? 'Challenge'} · {TRACK_LABEL[concept.track]} · {concept.name}</div>
        <h1>{ch.title}</h1>
        <div className="meta">
          <span><Depth d={ch.d} /> DEPTH {Math.round(ch.d)}</span>
          <span><Icon name="target" size={13} /> ~{Math.round(pick.p * 100)}% TO SOLVE</span>
          <span><Icon name="clock" size={13} /> PAR {Math.round(ch.par / 60 * 10) / 10 || 1} MIN</span>
        </div>
        <div className="reasonline">{pick.reason}</div>
        <p className="prompt">{ch.prompt}</p>
        {examplesEl}
        {hintsEl}
      </div>

      {isTrace ? (
        <div className="card output" ref={outRef}>
          <div className="card-top"><span><Icon name="terminal" size={14} /> What does it print</span><span className={`status ${solvedNow ? 's-ok' : wrong ? 's-bad' : ''}`}>{solvedNow ? 'CORRECT' : wrong ? `${wrong} WRONG` : 'CHOOSE'}</span></div>
          <div className="snippet"><CodeView code={ch.snippet ?? ''} /></div>
          <div className="options" role="radiogroup" aria-label="Output options">
            {ch.options!.map((o, i) => (
              <button key={i} role="radio" aria-checked={sel === i} disabled={gone.includes(i) || finished} className={`option${sel === i ? ' sel' : ''}${gone.includes(i) ? ' gone' : ''}${finished && i === ch.answer ? ' right' : ''}`} onClick={() => setSel(i)}>{o}</button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="editor-slot" ref={slot} style={full && slotH ? { height: slotH } : undefined}>
            <div className={`code-shell${full ? ' full' : ''}`} {...(full ? { role: 'dialog', 'aria-label': 'Code editor' } : {})}>
              {full && (
                <div className="code-top">
                  <div className="code-bar">
                    <button className="done" onClick={closeEditor}><Icon name="chevron-down" size={18} /> Done</button>
                    <span className="code-title"><b>{ch.title}</b></span>
                    <button className={`code-chip${taskOpen ? ' on' : ''}`} onPointerDown={keepFocus} onClick={() => { setTaskOpen((o) => !o); setOutOpen(false); }} aria-expanded={taskOpen}><Icon name="book" size={16} /> Task</button>
                    <button className={`code-chip${hints ? ' on' : ''}`} onPointerDown={keepFocus} onClick={() => { setTaskOpen((o) => !o); setOutOpen(false); }} aria-label={`Hints, ${hints} of ${ch.hints.length} used`}><Icon name="hint" size={16} /> {hints}/{ch.hints.length}</button>
                  </div>
                  {taskOpen && (
                    <>
                      <div className="scrim" onPointerDown={keepFocus} onClick={() => setTaskOpen(false)} />
                      <div className="panel task-panel" role="region" aria-label="Task and hints">
                        <div className="panel-head"><span className="eyebrow">Task</span><button className="icon-btn" onPointerDown={keepFocus} onClick={() => setTaskOpen(false)} aria-label="Close task"><Icon name="x" size={18} /></button></div>
                        <p className="prompt">{ch.prompt}</p>
                        {examplesEl}
                        {hintsEl}
                        <button className="btn ghost reveal" onPointerDown={keepFocus} onClick={nextHint} disabled={hintsLeft <= 0}><Icon name="hint" size={17} /> {hintsLeft > 0 ? `Reveal hint ${hints + 1} of ${ch.hints.length}` : 'No more hints'}</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="card editor-card">
                <div className="card-top">
                  <span><Icon name="terminal" size={14} /> main.py</span>
                  <span className={`rt rt-${rt}`}>{rt === 'ready' ? 'PYTHON READY' : rt === 'loading' ? 'PYTHON WAKING' : 'PYTHON ASLEEP'}</span>
                  <span className="lines">{lines} {lines === 1 ? 'line' : 'lines'}</span>
                  {phone && !finished && <button className="expand" onClick={openEditor} aria-label="Open full-screen editor"><Icon name="expand" size={14} /> Edit</button>}
                  <button className="icon-btn" onClick={() => setCode(ch.starter)} aria-label="Reset code" disabled={finished}><Icon name="reset" size={16} /></button>
                </div>
                <div className="editor">
                  <CodeEditor ref={editor} value={code} onChange={setCode} onRun={run} readOnly={finished} fontSize={save.settings.fontSize} />
                  {phone && !full && !finished && <button className="editor-open" onClick={openEditor} aria-label="Open full-screen code editor"><span><Icon name="expand" size={14} /> Tap to write code</span></button>}
                </div>
              </div>

              {full && (
                <div className="code-bottom">
                  {outOpen && (
                    <>
                      <div className="scrim" onPointerDown={keepFocus} onClick={() => setOutOpen(false)} />
                      <div className="panel out-panel" role="region" aria-label="Results">{outputBody}</div>
                    </>
                  )}
                  <button className="strip" onPointerDown={keepFocus} onClick={() => { setOutOpen((o) => !o); setTaskOpen(false); }} aria-expanded={outOpen}>
                    <span className={`status ${statusCls}`}>{status}</span>
                    <span className="strip-text">{summary}</span>
                    {outOpen ? <Icon name="chevron-down" size={16} /> : <Icon name="chevron-up" size={16} />}
                  </button>
                  <Accessory editor={editor} action={runKey} />
                </div>
              )}
            </div>
          </div>

          <div className="card output" ref={outRef}>
            <div className="card-top"><span><Icon name="check" size={14} /> {ch.cases ? 'Test cases' : 'Output'}</span><span className={`status ${statusCls}`}>{status}</span></div>
            {outputBody}
          </div>
        </>
      )}

      <div className="dock">
        <div className="actions">
          {!finished && <button className="btn ghost" onClick={nextHint} disabled={hintsLeft <= 0} aria-label="Reveal next hint"><Icon name="hint" size={17} /> {hints}/{ch.hints.length}</button>}
          {!finished && wrong >= 3 && <button className="btn ghost" onClick={giveUp}><Icon name="eye" size={17} /> Solution</button>}
          {finished ? <button className="btn primary run" onClick={() => setSheet(true)}>See result</button>
            : isTrace ? <button className="btn primary run" onClick={check} disabled={sel === null}>Check answer</button>
              : <button className="btn primary run" onClick={run} disabled={busy}><Icon name="play" size={15} /> {busy ? 'Running' : 'Run'}</button>}
        </div>
      </div>

      {sheet && report && (
        <Sheet eyebrow={gaveUp ? 'SOLUTION' : TAG_LABEL[pick.tag]?.toUpperCase() ?? 'RESULT'} title={gaveUp ? 'Study this one' : report.score >= 0.99 ? 'Clean solve' : 'Solved'} onClose={() => setSheet(false)}>
          <ResultBody report={report} ch={ch} gaveUp={gaveUp} nextSlot={nextSlot} onNext={() => { setSheet(false); onNext(); }} />
        </Sheet>
      )}
    </div>
  );
}

function ResultBody({ report, ch, gaveUp, nextSlot, onNext }: { report: Report; ch: Pick['ch']; gaveUp: boolean; nextSlot: Slot | null; onNext: () => void }) {
  const dR = report.ratingAfter - report.ratingBefore;
  return (
    <div className="result">
      {!gaveUp && <div className="xp-big"><b>+{report.xp}</b>XP</div>}
      {!gaveUp && report.parts.length > 0 && <div className="parts">{report.parts.map((p) => <div key={p.label}><span>{p.label}</span><b>+{p.xp}</b></div>)}</div>}
      {gaveUp && <p className="lead">No XP this time, and your depth moves only a little. Read the reference, then it comes back around as a fresh variant.</p>}
      <div className="deltas">
        <div className="delta"><small>Depth</small><b className={dR > 0 ? 'up' : dR < 0 ? 'down' : ''}>{report.ratingAfter} <span style={{ fontSize: 12 }}>{dR > 0 ? `+${dR}` : dR}</span></b></div>
        <div className="delta"><small>{report.conceptName}</small><b>{Math.round(report.conceptAfter * 100)}%</b><Meter frac={report.conceptAfter} /></div>
      </div>
      {report.rankUp && <div className="note"><b>Rank up</b>You reached {report.rank}.</div>}
      {report.levelAfter > report.levelBefore && <div className="note"><b>Level up</b>Level {report.levelAfter}.</div>}
      {report.unlocked.length > 0 && <div className="note"><b>Unlocked</b>{report.unlocked.join(', ')}</div>}
      {report.shieldEarned && <div className="note"><b>Streak shield earned</b>It will cover one missed day for you.</div>}
      {report.goalsDone.length > 0 && <div className="note"><b>Goal complete</b>{report.goalsDone.join('. ')}</div>}
      {report.craft.length > 0 && (
        <div className="note warn"><b>Best practice</b><ul>{report.craft.map((c) => <li key={c.id}>{c.text}</li>)}</ul></div>
      )}
      {ch.tip && <div className="note"><b>Worth remembering</b>{ch.tip}</div>}
      <div className="note"><b>Coach</b>{report.coach}</div>
      {ch.format !== 'trace' && <details className="ref" open={gaveUp}><summary>Reference solution</summary><pre>{ch.target}</pre></details>}
      <button className="btn primary" onClick={onNext}>{report.descentDone ? 'Finish descent' : `Next: ${nextSlot ? SLOT_LABEL[nextSlot].toLowerCase() : 'challenge'}`} <Icon name="arrow" size={17} /></button>
    </div>
  );
}
