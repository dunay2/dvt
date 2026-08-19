/** Owned concern: bind Monaco Editor as the shared code surface for viewer and local editor modes. */
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';
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
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco == null || path == null) return;
    const modelUri = monaco.Uri.parse(path);
    const applyDiagnostics = (model: editor.ITextModel) => {
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
    };
    const currentModel = monaco.editor.getModel(modelUri);
    if (currentModel != null) {
      applyDiagnostics(currentModel);
    }
    const modelSubscription = monaco.editor.onDidCreateModel((model) => {
      if (model.uri.toString() === modelUri.toString()) {
        applyDiagnostics(model);
      }
    });
    return () => {
      modelSubscription.dispose();
      const model = monaco.editor.getModel(modelUri);
      if (model != null) {
        monaco.editor.setModelMarkers(model, 'dvt-postgres-sql-readiness', []);
      }
    };
  }, [diagnostics, monaco, path, value]);

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
        path={path}
        theme={monacoTheme}
        value={value}
      />
    </div>
  );
}
