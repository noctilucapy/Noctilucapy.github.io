import { useCallback, useEffect, useMemo, useState } from 'react';
import { InstallHint } from './components/InstallHint';
import { Icon } from './components/Icon';
import { LogoMark } from './components/LogoMark';
import { TabBar, type TabId } from './components/TabBar';
import { catalog } from './curriculum';
import { recommend } from './engine/coach';
import { isDue, isUnlocked } from './engine/mastery';
import { ARC, type Pick } from './engine/selector';
import { applyResult, chooseStart, freshSave, loadSave, persist, planNext, startSession, swapCurrent, type Outcome, type Report } from './engine/store';
import type { Save, Settings, Slot } from './engine/types';
import { setHaptics } from './haptics';
import { useInstallHint, useViewportMode } from './hooks';
import { DoneScreen } from './screens/Done';
import { HomeScreen } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { PlayScreen } from './screens/Play';
import { RecordScreen } from './screens/Record';
import { SkillsScreen } from './screens/Skills';
import { TerminalScreen } from './screens/TerminalScreen';

type Route = 'home' | 'play' | 'skills' | 'terminal' | 'record' | 'done';
const ROUTES: Record<string, Route> = { '#/': 'home', '': 'home', '#': 'home', '#/play': 'play', '#/skills': 'skills', '#/terminal': 'terminal', '#/record': 'record', '#/done': 'done' };
const parseRoute = (): Route => ROUTES[location.hash] ?? 'home';
const TITLES: Record<Route, string> = { home: 'Noctiluca | Python at the right depth', play: 'Challenge · Noctiluca', skills: 'Skills · Noctiluca', terminal: 'Terminal · Noctiluca', record: 'Record · Noctiluca', done: 'Descent complete · Noctiluca' };

interface Active { pick: Pick; report: Report | null; nextSlot: Slot | null }

export default function App() {
  const [save, setSave] = useState<Save>(() => loadSave());
  const [route, setRoute] = useState<Route>(parseRoute);
  const [active, setActive] = useState<Active | null>(null);
  useViewportMode();
  const hint = useInstallHint(route === 'home' && save.start !== null);

  useEffect(() => persist(save), [save]);
  useEffect(() => setHaptics(save.settings.haptics), [save.settings.haptics]);
  useEffect(() => {
    const sync = () => setRoute(parseRoute());
    window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => { document.title = TITLES[route]; }, [route]);

  const go = useCallback((hash: string) => { location.hash = hash; }, []);

  // A refresh on the play route rebuilds the same challenge, because planning is a pure function of the save.
  useEffect(() => {
    if (route !== 'play' || active) return;
    const pick = planNext(save, catalog);
    if (pick) setActive({ pick, report: null, nextSlot: null }); else go(save.session?.done ? '#/done' : '#/');
  }, [route, active, save, go]);

  const begin = useCallback((focus: string | null) => {
    let s = save;
    if (!s.session || s.session.done || (focus !== null && s.session.focus !== focus)) s = startSession(s, focus);
    const pick = planNext(s, catalog);
    setSave(s);
    if (pick) { setActive({ pick, report: null, nextSlot: null }); go('#/play'); }
  }, [save, go]);

  const onResult = useCallback((o: Outcome) => {
    if (!active) return;
    const r = applyResult(save, active.pick.ch, active.pick, o, catalog);
    setSave(r.save);
    const ns = r.save.session;
    setActive({ ...active, report: r.report, nextSlot: ns && !ns.done ? ARC[ns.idx] : null });
  }, [active, save]);

  const onNext = useCallback(() => {
    if (!active?.report) return;
    if (active.report.descentDone) { setActive(null); go('#/done'); return; }
    const pick = planNext(save, catalog);
    if (pick) setActive({ pick, report: null, nextSlot: null }); else { setActive(null); go('#/'); }
  }, [active, save, go]);

  const onSwap = useCallback(() => {
    if (!active) return;
    const s = swapCurrent(save, active.pick.ch);
    const pick = planNext(s, catalog);
    setSave(s);
    if (pick) setActive({ pick, report: null, nextSlot: null });
  }, [active, save]);

  const preview = useMemo(() => {
    if (save.start === null) return null;
    return planNext(save.session && !save.session.done ? save : startSession(save), catalog);
  }, [save]);
  const recs = useMemo(() => recommend(save, catalog), [save]);
  const dueCount = useMemo(() => {
    const by = Object.fromEntries(catalog.concepts.map((c) => [c.id, c]));
    return catalog.concepts.filter((c) => isUnlocked(save, c, by) && isDue(save, c.id)).length;
  }, [save]);

  const patchSettings = (p: Partial<Settings>) => setSave((s) => ({ ...s, settings: { ...s.settings, ...p } }));

  if (save.start === null) {
    return <main className="shell" data-view="start"><Onboarding onChoose={(c) => setSave((s) => chooseStart(s, c))} /></main>;
  }

  const tab: TabId | null = route === 'home' ? 'home' : route === 'skills' ? 'skills' : route === 'record' ? 'record' : route === 'terminal' ? 'terminal' : null;
  return (
    <main className="shell" data-view={route}>
      {(tab || route === 'done') && (
        <header className="topbar">
          <a className="brand" href="#/" style={{ textDecoration: 'none' }}><LogoMark size={28} /><span>NOCTILUCA</span></a>
          <div className="chips">
            <span className="chip" title="Day streak" aria-label={`${save.streak.days} day streak`}><Icon name="flame" size={14} />{save.streak.days}</span>
            <span className="chip" title="XP" aria-label={`${save.xp} XP`}><Icon name="bolt" size={14} />{save.xp}</span>
          </div>
        </header>
      )}
      {route === 'home' && <HomeScreen save={save} concepts={catalog.concepts} preview={preview} recs={recs} onStart={begin} />}
      {route === 'skills' && <SkillsScreen save={save} cat={catalog} onPractice={begin} />}
      {route === 'record' && <RecordScreen save={save} onSettings={patchSettings} onImport={(s) => setSave(s)} onReset={() => { setSave({ ...freshSave(), start: null }); setActive(null); go('#/'); }} />}
      {route === 'terminal' && <TerminalScreen fontSize={save.settings.fontSize} />}
      {route === 'play' && active && <PlayScreen key={active.pick.ch.id} pick={active.pick} save={save} report={active.report} nextSlot={active.nextSlot} onResult={onResult} onNext={onNext} onSwap={onSwap} onBack={() => go('#/')} />}
      {route === 'done' && (save.session?.done ? <DoneScreen save={save} onAgain={() => begin(null)} onHome={() => go('#/')} /> : <p className="muted" style={{ padding: 40 }}>No finished descent yet.</p>)}
      {tab && <TabBar active={tab} dueCount={dueCount} />}
      {hint && route === 'home' && <InstallHint hint={hint} />}
    </main>
  );
}
