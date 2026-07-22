/** Owned concern: render one workspace-file editor or viewer from an explicit edit posture. */
import type { FileContent } from '../../ports/workspace';
import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';

type CodeWorkspaceFileSurfaceProps = Readonly<{
  ariaLabel: string;
  file: FileContent;
  loadingLabel: string;
  onChange: (value: string) => void;
  posture: CodeWorkspaceFileEditPosture;
  value: string;
}>;

export function CodeWorkspaceFileSurface({
  ariaLabel,
  file,
  loadingLabel,
  onChange,
  posture,
  value,
}: CodeWorkspaceFileSurfaceProps) {
  if (posture.kind === 'graph_owned_read_only') {
    return (
      <MonacoCodeViewer
        ariaLabel={ariaLabel}
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
      language={file.language}
      loadingLabel={loadingLabel}
      onChange={onChange}
      path={file.path}
      value={value}
    />
  );
}
