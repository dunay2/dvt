/** Owned concern: bind the read-only diff editor and own its worker model lifetime. */
import { useMonaco, type Monaco, type MonacoDiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
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

function syncDiffText(
  monaco: Monaco,
  model: editor.ITextModel,
  language: string,
  content: string
): void {
  if (model.getLanguageId() !== language) monaco.editor.setModelLanguage(model, language);
  if (model.getValue() !== content) model.setValue(content);
}

export default function MonacoDiffSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  modified,
  original,
}: MonacoDiffSurfaceProps) {
  const monaco = useMonaco();
  const host = useRef<HTMLDivElement | null>(null);
  const diff = useRef<MonacoDiffEditor | null>(null);
  useLayoutEffect(() => {
    if (!monaco || !host.current) return;
    configureMonacoVisualTheme(monaco);
    monaco.editor.setTheme(monacoTheme);
    const editor = monaco.editor.createDiffEditor(
      host.current,
      createMonacoDiffOptions({ ariaLabel: '' })
    );
    const models = {
      original: monaco.editor.createModel(''),
      modified: monaco.editor.createModel(''),
    };
    const viewModel = editor.createViewModel(models);
    editor.setModel(viewModel);
    diff.current = editor;
    return () => {
      // Cancel in-flight worker reads before disposing the text models.
      diff.current = null;
      editor.setModel(null);
      viewModel.dispose();
      editor.dispose();
      models.original.dispose();
      models.modified.dispose();
    };
  }, [monaco]);
  useLayoutEffect(() => {
    const editor = diff.current;
    if (!monaco || !editor) return;
    const models = editor.getModel();
    if (!models) return;
    editor.updateOptions(createMonacoDiffOptions({ ariaLabel }));
    syncDiffText(monaco, models.original, language, original);
    syncDiffText(monaco, models.modified, language, modified);
  }, [ariaLabel, language, modified, monaco, original]);
  return <div ref={host} className={containerClassName} data-testid="monaco-diff-viewer" />;
}
