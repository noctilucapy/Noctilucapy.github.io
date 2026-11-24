import { LogoMark } from '../components/LogoMark';

export function Onboarding({ onChoose }: { onChoose: (c: 'new' | 'some' | 'comfortable') => void }) {
  return (
    <div className="start-card">
      <LogoMark size={44} />
      <div className="eyebrow" style={{ marginTop: 22 }}>Noctiluca</div>
      <h1>Python, at the right depth.</h1>
      <p>Short challenges that follow your skill. Hard enough to stretch you, never so hard you stall. One question sets the starting depth, and the first few answers fine tune it.</p>
      <div className="eyebrow" style={{ margin: '28px 0 0' }}>How much Python do you know?</div>
      <button className="choice" onClick={() => onChoose('new')}><b>I am new</b><span>Start with print, variables and loops.</span></button>
      <button className="choice" onClick={() => onChoose('some')}><b>I know the basics</b><span>Functions, lists and dictionaries feel familiar.</span></button>
      <button className="choice" onClick={() => onChoose('comfortable')}><b>I code comfortably</b><span>Start with data structures, algorithms and game theory.</span></button>
    </div>
  );
}
