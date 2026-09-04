/** Owned concern: render generated DBT model SQL as a read-only artifact projection. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { Label } from '../../components/ui/label';
import type { CanonicalNode } from '../../types/canonical';
import { normalizeDbtArtifactIdentifier } from './canvasDbtModelArtifactProjection';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';
import type { DbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

export function DbtModelCodeAuthoringSection({
  node,
  projection,
}: Readonly<{
  node: CanonicalNode;
  projection: DbtAuthoringModelProjection;
}>): JSX.Element {
  const artifact = projection.modelArtifact;
  const modelPath =
    artifact?.path ?? `models/${normalizeDbtArtifactIdentifier(node.name, node.id)}.sql`;
  const provenanceDetail =
    artifact == null
      ? null
      : formatCanvasCopyTemplate(canvasViewCopy.inspectorDbtModelSqlGeneratedDetailTemplate, {
          path: artifact.path,
        });

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-model-sql-${node.id}`}>
          {canvasViewCopy.inspectorDbtModelSqlLabel}
        </Label>
        {provenanceDetail == null ? null : (
          <p
            data-slot="dbt-model-code-provenance"
            className={inspectorVisualClasses.inspectorArtifactDetail}
          >
            {provenanceDetail}
          </p>
        )}
        <MonacoCodeViewer
          ariaLabel={canvasViewCopy.inspectorDbtModelSqlLabel}
          language="sql"
          loadingLabel={canvasViewCopy.inspectorDbtModelSqlLabel}
          value={artifact?.body ?? ''}
          path={modelPath}
        />
      </div>
    </div>
  );
}
