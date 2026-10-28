/** Owned concern: render one workspace-file editor or viewer from an explicit edit posture. */
import type { FileContent } from '../../ports/workspace';
import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { cn } from '../../components/ui/utils';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';

type CodeWorkspaceFileSurfaceProps = Readonly<{
  ariaLabel: string;
  file: FileContent;
  loadingLabel: string;
  onChange: (value: string) => void;
  posture: CodeWorkspaceFileEditPosture;
  value: string;
  fillAvailableSpace?: boolean;
}>;

export function CodeWorkspaceFileSurface({
  ariaLabel,
  file,
  loadingLabel,
  onChange,
  posture,
  value,
  fillAvailableSpace = false,
}: CodeWorkspaceFileSurfaceProps) {
  const containerClassName = fillAvailableSpace
    ? cn(monacoVisualClasses.surface, monacoVisualClasses.flexFill, 'rounded-none border-0')
    : undefined;
  if (posture.kind !== 'editable') {
    return (
      <MonacoCodeViewer
        ariaLabel={ariaLabel}
        containerClassName={containerClassName}
        language={file.language}
        loadingLabel={loadingLabel}
        path={file.path}
        value={value}
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
      path={file.path}
      value={value}
    />
  );
}
