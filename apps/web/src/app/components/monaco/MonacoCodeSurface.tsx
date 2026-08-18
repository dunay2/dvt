/** Owned concern: bind Monaco Editor as the shared code surface for viewer and local editor modes. */
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';

import type { MonacoCodeDiagnostic } from './MonacoCodeEditor';
import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';
import { configureMonacoLocalWorkers } from './monacoLocalWorkers';
import { createMonacoCodeOptions, monacoTheme } from './monacoVisualTokens';

export type MonacoCodeSurfaceProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  onChange?: (value: string) => void;
  path?: string;
  readOnly?: boolean;
  value: string;
  diagnostics?: readonly MonacoCodeDiagnostic[];
}>;

configureMonacoLocalWorkers();

export default function MonacoCodeSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  onChange,
  path,
  readOnly = true,
  value,
  diagnostics = [],
}: MonacoCodeSurfaceProps) {
  const isReadOnly = readOnly;
  const modelRef = useRef<editor.ITextModel | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    const model = modelRef.current;
    const monaco = monacoRef.current;
    if (model == null || monaco == null) return;
    monaco.editor.setModelMarkers(
      model,
      'dvt-postgres-sql-readiness',
      diagnostics.map((diagnostic) => {
        const start = model.getPositionAt(diagnostic.startOffset ?? 0);
        const end = model.getPositionAt(
          Math.max(diagnostic.startOffset ?? 0, diagnostic.endOffset ?? 1)
        );
        return {
          severity: monaco.MarkerSeverity.Error,
          message: diagnostic.message,
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        };
      })
    );
    return () => {
      monaco.editor.setModelMarkers(model, 'dvt-postgres-sql-readiness', []);
    };
  }, [diagnostics, value]);

  const handleMount: OnMount = (editorInstance, monaco) => {
    modelRef.current = editorInstance.getModel();
    monacoRef.current = monaco;
    const model = editorInstance.getModel();
    if (model != null) {
      monaco.editor.setModelMarkers(model, 'dvt-postgres-sql-readiness', []);
    }
  };

  return (
    <div
      className={containerClassName}
      data-testid={isReadOnly ? 'monaco-code-viewer' : 'monaco-code-editor'}
    >
      <Editor
        height="100%"
        language={language}
        onChange={
          isReadOnly
            ? undefined
            : (nextValue) => {
                onChange?.(nextValue ?? '');
              }
        }
        options={createMonacoCodeOptions({ ariaLabel, readOnly: isReadOnly })}
        onMount={handleMount}
        path={path}
        theme={monacoTheme}
        value={value}
      />
    </div>
  );
}
