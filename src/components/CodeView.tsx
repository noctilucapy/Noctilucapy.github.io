import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { ink, night } from './CodeEditor';

/** Read only, highlighted code for trace questions and reference solutions. */
export function CodeView({ code }: { code: string }) {
  return (
    <CodeMirror value={code} editable={false} theme="none" basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false, autocompletion: false }}
      extensions={[python(), night, ink, EditorView.editable.of(false), EditorView.contentAttributes.of({ tabindex: '-1' })]} />
  );
}
