/** Owned concern: render the editable DBT model code surface and artifact provenance. */
import type { Dispatch, SetStateAction } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';
import { Label } from '../../components/ui/label';
import type { CanonicalNode } from '../../types/canonical';
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { normalizeDbtArtifactIdentifier } from './canvasDbtModelArtifactProjection';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';
import type { DbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

export function DbtModelCodeAuthoringSection({
  node,
  disabled,
  draft,
  projection,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DbtNodeAuthoringMetadata;
  projection: DbtAuthoringModelProjection;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const artifact = projection.modelArtifact;
  const editorValue = draft.modelSql ?? artifact?.body ?? '';
  const modelPath =
    artifact?.path ?? `models/${normalizeDbtArtifactIdentifier(node.name, node.id)}.sql`;
  const provenanceDetail =
    artifact == null
      ? null
      : formatCanvasCopyTemplate(
          artifact.provenance === 'authored'
            ? canvasViewCopy.inspectorDbtModelSqlAuthoredDetailTemplate
            : canvasViewCopy.inspectorDbtModelSqlGeneratedDetailTemplate,
          { path: artifact.path }
        );

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
        <MonacoCodeEditor
          ariaLabel={canvasViewCopy.inspectorDbtModelSqlLabel}
          language="sql"
          loadingLabel={canvasViewCopy.inspectorDbtModelSqlLabel}
          value={editorValue}
          path={modelPath}
          readOnly={disabled}
          onChange={(modelSql) => {
            onChange((currentDraft) =>
              currentDraft.dbt == null
                ? currentDraft
                : {
                    ...currentDraft,
                    dbt: { ...currentDraft.dbt, modelSql },
                  }
            );
          }}
        />
      </div>
    </div>
  );
}
