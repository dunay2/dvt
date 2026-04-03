import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

import type { EditorTab } from './workbenchTypes';

interface MonacoEditorSurfaceProps {
  tab: EditorTab;
}

const THEME_NAME = 'dvt-vscode-workbench-dark';

function configureMonacoTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'delimiter', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',
      'editorWhitespace.foreground': '#3b3b3b',
      'editorGutter.background': '#1e1e1e',
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464b3',
      'scrollbarSlider.activeBackground': '#bfbfbf66',
      'minimap.background': '#1e1e1e',
    },
  });
}

const EDITOR_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  readOnly: true,
  minimap: { enabled: true },
  fontSize: 13,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'off',
  padding: { top: 12, bottom: 12 },
  tabSize: 2,
  renderWhitespace: 'selection',
  smoothScrolling: true,
  overviewRulerBorder: false,
  stickyScroll: { enabled: true },
};

const DIFF_OPTIONS: Monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  ...EDITOR_OPTIONS,
  renderSideBySide: true,
  originalEditable: false,
  diffWordWrap: 'off',
};

const handleMount: OnMount = (_editor, monaco) => {
  configureMonacoTheme(monaco);
};

export default function MonacoEditorSurface({ tab }: MonacoEditorSurfaceProps) {
  const language = tab.language ?? 'plaintext';

  if (tab.kind === 'diff') {
    return (
      <div className="h-full min-h-0 bg-[#1e1e1e]">
        <DiffEditor
          original={tab.originalValue ?? ''}
          modified={tab.value ?? ''}
          language={language}
          theme={THEME_NAME}
          options={DIFF_OPTIONS}
          onMount={handleMount}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-[#1e1e1e]">
      <Editor
        value={tab.value ?? ''}
        language={language}
        theme={THEME_NAME}
        options={{
          ...EDITOR_OPTIONS,
          readOnly: tab.readOnly ?? true,
        }}
        onMount={handleMount}
      />
    </div>
  );
}
