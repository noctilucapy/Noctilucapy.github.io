import { ArrowLeft, ArrowLeftToLine, ArrowRight, ArrowRightToLine, ChevronLeft, CornerDownLeft, CopyPlus, Hash, IndentDecrease, MoveDown, MoveUp, Redo2, Search, TextSelect, Trash2, Undo2, Wrench } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EditorCommand, EditorHandle } from './CodeEditor';
import { tap } from '../haptics';

/** Keep the keyboard (and editor focus) alive when a toolbar button is pressed. */
export const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

const SYMBOLS = ['=', '(', ')', ':', '"', "'", '[', ']', '{', '}', ',', '.', '+', '-', '*', '/', '%', '#', '<', '>', '_', '!', '&', '|', '\\', '@', '~', '^', ';', '`'];

/** Templates for the things phone coders type most. `$0` is where the cursor lands. Indentation follows the current line. */
const SNIPPETS: Array<{ label: string; text: string }> = [
  { label: 'def', text: 'def $0():\n    ' },
  { label: 'for', text: 'for i in range($0):\n    ' },
  { label: 'for in', text: 'for $0 in :\n    ' },
  { label: 'enumerate', text: 'for i, x in enumerate($0):\n    ' },
  { label: 'if', text: 'if $0:\n    ' },
  { label: 'elif', text: 'elif $0:\n    ' },
  { label: 'else', text: 'else:\n    $0' },
  { label: 'while', text: 'while $0:\n    ' },
  { label: 'return', text: 'return $0' },
  { label: 'print()', text: 'print($0)' },
  { label: 'f""', text: 'f"{$0}"' },
  { label: 'len()', text: 'len($0)' },
  { label: 'range()', text: 'range($0)' },
  { label: '[ for ]', text: '[$0 for x in ]' },
  { label: 'lambda', text: 'lambda $0: ' },
  { label: 'try', text: 'try:\n    $0\nexcept Exception as e:\n    ' },
  { label: 'class', text: 'class $0:\n    def __init__(self):\n        ' },
  { label: 'with', text: 'with open($0) as f:\n    ' },
  { label: 'import', text: 'import $0' },
  { label: 'input', text: 'int(input($0))' },
  { label: 'main', text: 'if __name__ == "__main__":\n    $0' },
];

/** A toolbar key. A tap fires once (so dragging the bar to scroll never triggers a key); `repeat` keys keep firing while held. */
function Key({ label, title, onFire, repeat, className = '', children }: { label: string; title?: string; onFire: () => void; repeat?: boolean; className?: string; children: ReactNode }) {
  const hold = useRef(0), loop = useRef(0), repeated = useRef(false);
  const stop = () => { window.clearTimeout(hold.current); window.clearInterval(loop.current); };
  useEffect(() => stop, []);
  const fire = () => { tap(); onFire(); };
  return (
    <button
      className={`key ${className}`} aria-label={label} title={title ?? label}
      onPointerDown={(e) => {
        e.preventDefault(); repeated.current = false;
        if (repeat) hold.current = window.setTimeout(() => { repeated.current = true; fire(); loop.current = window.setInterval(fire, 70); }, 380);
      }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (repeated.current) { repeated.current = false; return; } fire(); }}
    >{children}</button>
  );
}

/** A trackpad key, like the iOS space bar: slide a finger on it to move the cursor left, right, up and down. */
function PadKey({ editor }: { editor: React.RefObject<EditorHandle | null> }) {
  const start = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const STEP_X = 11, STEP_Y = 26;
  return (
    <button
      className="key wide pad" aria-label="Cursor pad: slide to move the cursor" title="Slide to move the cursor"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start.current = { x: e.clientX, y: e.clientY, sx: 0, sy: 0 }; }}
      onPointerMove={(e) => {
        const s = start.current; if (!s) return;
        const dx = Math.trunc((e.clientX - s.x) / STEP_X) - s.sx, dy = Math.trunc((e.clientY - s.y) / STEP_Y) - s.sy;
        for (let i = 0; i < Math.abs(dx); i++) editor.current?.command(dx > 0 ? 'right' : 'left');
        for (let i = 0; i < Math.abs(dy); i++) editor.current?.command(dy > 0 ? 'down' : 'up');
        if (dx || dy) { tap(3); s.sx += dx; s.sy += dy; }
      }}
      onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}
      onContextMenu={(e) => e.preventDefault()}
    ><span className="glyph">◂ ▸ ▴ ▾</span></button>
  );
}

type Page = 'tools' | 'symbols' | 'snippets';

/** One slim row glued above the keyboard.
 *  Tools: the editing keys phone coders reach for most. Symbols: punctuation that is two taps deep on the system keyboard.
 *  Snippets: one tap templates (def, for, if, try ...). The primary action stays pinned on the right. */
export function Accessory({ editor, action }: { editor: React.RefObject<EditorHandle | null>; action: ReactNode }) {
  const [page, setPage] = useState<Page>('tools');
  const cmd = (name: EditorCommand) => () => editor.current?.command(name);
  const label = page === 'tools' ? 'Editor tools' : page === 'symbols' ? 'Code symbols' : 'Code snippets';
  return (
    <div className="accessory">
      <div className="keys" role="toolbar" aria-label={label} key={page}>
        {page === 'tools' && (
          <>
            <Key label="New line below (Ctrl+Enter)" onFire={cmd('newline')} className="wide accent"><span className="glyph">Ctrl+</span><CornerDownLeft size={15} /></Key>
            <Key label="Tab: indent four spaces" onFire={cmd('tab')} className="wide accent"><span className="glyph">⇥ TAB</span></Key>
            <PadKey editor={editor} />
            <Key label="Undo (Ctrl+Z)" onFire={cmd('undo')}><Undo2 size={18} /></Key>
            <Key label="Move cursor left" onFire={cmd('left')} repeat><ArrowLeft size={18} /></Key>
            <Key label="Move cursor right" onFire={cmd('right')} repeat><ArrowRight size={18} /></Key>
            <Key label="Jump one word left" onFire={cmd('wordLeft')} repeat><span className="glyph">◂ word</span></Key>
            <Key label="Jump one word right" onFire={cmd('wordRight')} repeat><span className="glyph">word ▸</span></Key>
            <Key label="Find and replace (Ctrl+F)" onFire={cmd('find')}><Search size={18} /></Key>
            <Key label="Comment or uncomment line (Ctrl+/)" onFire={cmd('comment')}><Hash size={18} /></Key>
            <Key label="Outdent (Shift+Tab)" onFire={cmd('outdent')}><IndentDecrease size={18} /></Key>
            <Key label="Redo (Ctrl+Shift+Z)" onFire={cmd('redo')}><Redo2 size={18} /></Key>
            <Key label="Duplicate line" onFire={cmd('duplicate')}><CopyPlus size={18} /></Key>
            <Key label="Delete line (Ctrl+Shift+K)" onFire={cmd('deleteLine')}><Trash2 size={18} /></Key>
            <Key label="Move line up (Alt+Up)" onFire={cmd('moveUp')} repeat><MoveUp size={18} /></Key>
            <Key label="Move line down (Alt+Down)" onFire={cmd('moveDown')} repeat><MoveDown size={18} /></Key>
            <Key label="Select line (Ctrl+L)" onFire={cmd('selectLine')}><TextSelect size={18} /></Key>
            <Key label="Go to start of line (Home)" onFire={cmd('home')}><ArrowLeftToLine size={18} /></Key>
            <Key label="Go to end of line (End)" onFire={cmd('end')}><ArrowRightToLine size={18} /></Key>
            <Key label="Show code symbols" onFire={() => setPage('symbols')} className="wide"><span className="glyph">( )</span></Key>
            <Key label="Show code snippets" onFire={() => setPage('snippets')} className="wide"><span className="glyph">{'{ }'} snip</span></Key>
          </>
        )}
        {page === 'symbols' && (
          <>
            <Key label="Back to editor tools" onFire={() => setPage('tools')} className="wide accent"><ChevronLeft size={16} /><Wrench size={15} /></Key>
            {SYMBOLS.map((k) => <Key key={k} label={`Insert ${k}`} onFire={() => editor.current?.insert(k)}>{k}</Key>)}
            <Key label="Show code snippets" onFire={() => setPage('snippets')} className="wide"><span className="glyph">{'{ }'} snip</span></Key>
          </>
        )}
        {page === 'snippets' && (
          <>
            <Key label="Back to editor tools" onFire={() => setPage('tools')} className="wide accent"><ChevronLeft size={16} /><Wrench size={15} /></Key>
            {SNIPPETS.map((s) => <Key key={s.label} label={`Insert ${s.label} template`} onFire={() => editor.current?.snippet(s.text)} className="wide snip"><span className="glyph">{s.label}</span></Key>)}
            <Key label="Show code symbols" onFire={() => setPage('symbols')} className="wide"><span className="glyph">( )</span></Key>
          </>
        )}
      </div>
      {action}
    </div>
  );
}
