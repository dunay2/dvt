/** Owned concern: adapt one structured Artifacts payload to the read-only Monaco code viewer. */
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import type { ArtifactFileName, ArtifactPreviewDocument } from './constants';
import { formatStructuredArtifactContent } from './structuredArtifactContent';

type ArtifactMonacoPreviewPanelProps = {
  readonly title: string;
  readonly fileName: ArtifactFileName;
  readonly document: ArtifactPreviewDocument;
};

export function ArtifactMonacoPreviewPanel({
  title,
  fileName,
  document,
}: ArtifactMonacoPreviewPanelProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <MonacoCodeViewer
        ariaLabel={title}
        language="json"
        loadingLabel={`Loading ${fileName}...`}
        path={document.path}
        value={formatStructuredArtifactContent(document.content)}
      />
    </>
  );
}
