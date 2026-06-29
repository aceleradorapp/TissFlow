import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function XmlEditorPane({ xmlString, errorLines, isDark, onChange }) {
  const editorRef      = useRef(null);
  const decorationsRef = useRef([]);

  // Apply error line decorations whenever errorLines changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    if (!errorLines?.length) return;

    const decorations = errorLines.map(line => ({
      range: new window.monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine:       true,
        className:         'ide-error-line',
        glyphMarginClassName: 'ide-error-glyph',
        overviewRuler: {
          color:    '#ef4444',
          position: window.monaco.editor.OverviewRulerLane.Left,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations([], decorations);
  }, [errorLines]);

  function handleMount(editor) {
    editorRef.current = editor;
  }

  return (
    <div className="h-full flex flex-col">
      <Editor
        height="100%"
        defaultLanguage="xml"
        value={xmlString ?? ''}
        theme={isDark ? 'vs-dark' : 'light'}
        onChange={onChange}
        onMount={handleMount}
        options={{
          fontSize:             12,
          fontFamily:           '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
          fontLigatures:        true,
          minimap:              { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap:             'on',
          lineNumbers:          'on',
          glyphMargin:          true,
          folding:              true,
          automaticLayout:      true,
          tabSize:              2,
          renderLineHighlight:  'line',
          padding:              { top: 8, bottom: 8 },
        }}
      />

      {/* Inject error line CSS once */}
      <style>{`
        .ide-error-line {
          background: rgba(239, 68, 68, 0.07) !important;
          border-left: 2px solid rgba(239, 68, 68, 0.6);
        }
        .ide-error-glyph {
          background: #ef4444;
          width: 4px !important;
          margin-left: 3px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
