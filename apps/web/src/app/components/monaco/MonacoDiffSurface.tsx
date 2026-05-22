/** Owned concern: bind @monaco-editor/react DiffEditor with DVT read-only diff invariants. */
import { DiffEditor } from '@monaco-editor/react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';
import { createMonacoDiffOptions, monacoTheme } from './monacoVisualTokens';

type MonacoDiffSurfaceProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  modified: string;
  original: string;
}>;

export default function MonacoDiffSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  modified,
  original,
}: MonacoDiffSurfaceProps) {
  return (
    <div className={containerClassName} data-testid="monaco-diff-viewer">
      <DiffEditor
        height="100%"
        language={language}
        modified={modified}
        options={createMonacoDiffOptions({ ariaLabel })}
        original={original}
        theme={monacoTheme}
      />
    </div>
  );
}
