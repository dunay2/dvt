/** Owned concern: bind @monaco-editor/react DiffEditor with DVT read-only diff invariants. */
import { DiffEditor } from '@monaco-editor/react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';

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
        options={{
          ariaLabel,
          automaticLayout: true,
          codeLens: false,
          contextmenu: false,
          diffCodeLens: false,
          glyphMargin: false,
          minimap: { enabled: false },
          originalEditable: false,
          readOnly: true,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: 'on',
        }}
        original={original}
        theme="vs-dark"
      />
    </div>
  );
}
