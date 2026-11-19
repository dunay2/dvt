/** Owned concern: bind @monaco-editor/react DiffEditor with DVT read-only diff invariants. */
import { DiffEditor, type MonacoDiffEditor } from '@monaco-editor/react';
import { useLayoutEffect, useRef } from 'react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';
import { configureMonacoLocalWorkers } from './monacoLocalWorkers';
import {
  configureMonacoVisualTheme,
  createMonacoDiffOptions,
  monacoTheme,
} from './monacoVisualTokens';

type MonacoDiffSurfaceProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  modified: string;
  original: string;
}>;

configureMonacoLocalWorkers();

export default function MonacoDiffSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  modified,
  original,
}: MonacoDiffSurfaceProps) {
  const diff = useRef<MonacoDiffEditor | null>(null);
  useLayoutEffect(
    () => () => {
      const editor = diff.current;
      const models = editor?.getModel();
      if (!editor || !models) return;
      // Detach both models before the React integration disposes the diff editor.
      editor.setModel(null);
      models.original.dispose();
      models.modified.dispose();
    },
    []
  );
  return (
    <div className={containerClassName} data-testid="monaco-diff-viewer">
      <DiffEditor
        beforeMount={configureMonacoVisualTheme}
        height="100%"
        language={language}
        modified={modified}
        onMount={(editor) => {
          diff.current = editor;
        }}
        options={createMonacoDiffOptions({ ariaLabel })}
        original={original}
        theme={monacoTheme}
      />
    </div>
  );
}
