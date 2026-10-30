/** Owned concern: render one workspace-file editor or viewer from an explicit edit posture. */
import { useEffect, useState } from 'react';
import type { FileContent } from '../../ports/workspace';
import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { cn } from '../../components/ui/utils';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';
import type { MonacoInlineReferences } from '../../components/monaco/monacoInlineReferences';

type CodeWorkspaceFileSurfaceProps = Readonly<{
  ariaLabel: string;
  file: FileContent;
  loadingLabel: string;
  onChange: (value: string) => void;
  posture: CodeWorkspaceFileEditPosture;
  value: string;
  fillAvailableSpace?: boolean;
  inlineReferences?: MonacoInlineReferences;
  onInspectReference?: (id: string) => void;
}>;

export function CodeWorkspaceFileSurface({
  ariaLabel,
  file,
  loadingLabel,
  onChange,
  posture,
  value,
  fillAvailableSpace = false,
  inlineReferences,
  onInspectReference,
}: CodeWorkspaceFileSurfaceProps) {
  const [retainEditor, setRetainEditor] = useState(posture.kind === 'editable');
  useEffect(() => {
    if (posture.kind === 'editable') setRetainEditor(true);
  }, [posture.kind]);
  const containerClassName = fillAvailableSpace
    ? cn(monacoVisualClasses.surface, monacoVisualClasses.flexFill, 'rounded-none border-0')
    : undefined;
  if (!retainEditor && posture.kind !== 'editable') {
    return (
      <MonacoCodeViewer
        ariaLabel={ariaLabel}
        containerClassName={containerClassName}
        language={file.language}
        loadingLabel={loadingLabel}
        path={file.path}
        value={value}
        inlineReferences={inlineReferences}
        onInspectReference={onInspectReference}
      />
    );
  }

  return (
    <MonacoCodeEditor
      ariaLabel={ariaLabel}
      containerClassName={containerClassName}
      language={file.language}
      loadingLabel={loadingLabel}
      onChange={onChange}
      readOnly={posture.kind !== 'editable'}
      path={file.path}
      value={value}
      inlineReferences={inlineReferences}
      onInspectReference={onInspectReference}
    />
  );
}
