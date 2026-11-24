import { forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { indentUnit, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { copyLineDown, cursorCharLeft, cursorCharRight, cursorGroupLeft, cursorGroupRight, cursorLineDown, cursorLineUp, cursorLineBoundaryBackward, cursorLineBoundaryForward, deleteLine, indentLess, indentMore, insertBlankLine, moveLineDown, moveLineUp, redo, selectLine, toggleComment, undo } from '@codemirror/commands';
import { openSearchPanel, search } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

const night = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: '#e6e3da' },
  '.cm-content': { caretColor: '#e6e3da', padding: '12px 0' },
  '.cm-cursor': { borderLeftColor: '#e6e3da', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(201,207,210,.20)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: '#565f64', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(201,207,210,.16)', outline: 'none' },
}, { dark: true });

/** Near monochrome, as the brand asks. Four quiet tints carry meaning: keywords, strings, numbers, comments. */
const ink = syntaxHighlighting(HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: '#c9cfd2', fontWeight: '500' },
  { tag: [t.string, t.special(t.string)], color: '#a8bba9' },
  { tag: [t.number, t.bool, t.null], color: '#c9b48c' },
  { tag: t.comment, color: '#6b767c', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className], color: '#e6e3da', fontWeight: '500' },
  { tag: [t.operator, t.punctuation], color: '#7c8891' },
  { tag: t.self, color: '#9aa3a8', fontStyle: 'italic' },
]));

export { night, ink };

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const CLOSERS = [')', ']', '}'];

/** Every command the on-screen toolbar can run (names double as the toolbar's keys). */
const COMMANDS = {
  newline: insertBlankLine,            // Ctrl+Enter: new line below, wherever the cursor is
  outdent: indentLess, undo, redo,
  left: cursorCharLeft, right: cursorCharRight, up: cursorLineUp, down: cursorLineDown, wordLeft: cursorGroupLeft, wordRight: cursorGroupRight,
  home: cursorLineBoundaryBackward, end: cursorLineBoundaryForward,
  comment: toggleComment,              // Ctrl+/
  duplicate: copyLineDown,             // Shift+Alt+Down
  deleteLine,                          // Ctrl+Shift+K
  moveUp: moveLineUp, moveDown: moveLineDown, // Alt+Up / Alt+Down
  selectLine,                          // Ctrl+L
  find: openSearchPanel,               // Ctrl+F
} as const;
export type EditorCommand = keyof typeof COMMANDS | 'tab';

export type EditorHandle = { insert: (text: string) => void; snippet: (text: string) => void; command: (name: EditorCommand) => void; blur: () => void };

/** CodeMirror configured for phones: no autocapitalise / autocorrect / smart quotes, 4-space indent, brand theme. */
export const CodeEditor = forwardRef<EditorHandle, { value: string; onChange: (v: string) => void; onRun?: () => void; readOnly?: boolean; fontSize?: number }>(function CodeEditor({ value, onChange, onRun, readOnly, fontSize }, ref) {
  const view = useRef<EditorView | null>(null);
  useImperativeHandle(ref, () => ({
    insert(text) {
      const v = view.current; if (!v) return;
      const { from, to } = v.state.selection.main;
      const next = v.state.doc.sliceString(to, to + 1);
      const quote = text === '"' || text === "'";
      // Match the keyboard behaviour: pairs auto-close, and typing a closer over the same closer just steps past it.
      if (from === to && next === text && (CLOSERS.includes(text) || quote)) {
        v.dispatch({ selection: { anchor: to + 1 }, scrollIntoView: true });
      } else if (from === to && PAIRS[text]) {
        v.dispatch({ changes: { from, insert: text + PAIRS[text] }, selection: { anchor: from + 1 }, scrollIntoView: true, userEvent: 'input.type' });
      } else {
        v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, scrollIntoView: true, userEvent: 'input.type' });
      }
      v.focus();
    },
    /** Inserts a template at the cursor, keeping the current indentation. `$0` marks where the cursor lands. */
    snippet(text) {
      const v = view.current; if (!v) return;
      const { from, to } = v.state.selection.main;
      const indent = /^\s*/.exec(v.state.doc.lineAt(from).text)![0];
      const mark = text.indexOf('$0');
      const clean = text.replace('$0', '');
      const body = clean.split('\n').join('\n' + indent);
      const at = mark < 0 ? body.length : clean.slice(0, mark).split('\n').join('\n' + indent).length;
      v.dispatch({ changes: { from, to, insert: body }, selection: { anchor: from + at }, scrollIntoView: true, userEvent: 'input.type' });
      v.focus();
    },
    command(name) {
      const v = view.current; if (!v) return;
      if (name === 'tab') {
        const { from, to } = v.state.selection.main;
        if (v.state.doc.lineAt(from).number !== v.state.doc.lineAt(to).number) indentMore(v);       // several lines selected: indent them all
        else v.dispatch({ changes: { from, to, insert: '    ' }, selection: { anchor: from + 4 }, scrollIntoView: true, userEvent: 'input.indent' });
      } else COMMANDS[name](v);
      if (name !== 'find') v.focus();
    },
    blur() { view.current?.contentDOM.blur(); },
  }), []);

  return (
    <CodeMirror
      value={value}
      minHeight="168px"
      maxHeight="340px"
      onChange={onChange}
      onCreateEditor={(v) => { view.current = v; }}
      theme="none"
      extensions={[
        python(), night, ink, indentUnit.of('    '), search({ top: true }),
        ...(onRun ? [Prec.highest(keymap.of([{ key: 'Shift-Enter', run: () => { onRun(); return true; } }]))] : []),
        EditorView.editable.of(!readOnly),
        EditorView.theme({ '.cm-content, .cm-line': { fontSize: `${fontSize ?? 16}px` } }),
        EditorState.phrases.of({ next: 'Next', previous: 'Prev', all: 'All', 'match case': 'Aa', 'by word': 'Word', replace: 'Replace', 'replace all': 'Replace all', Find: 'Find in code', Replace: 'Replace with' }),
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Python code editor', enterkeyhint: 'enter' }),
      ]}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false, autocompletion: false, closeBrackets: true, searchKeymap: true }}
    />
  );
});
