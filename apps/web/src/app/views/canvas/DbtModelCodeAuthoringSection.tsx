/** Owned concern: render the editable DBT model code surface and artifact provenance. */
import type { Dispatch, SetStateAction } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import type { CanonicalNode } from '../../types/canonical';
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
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
  const provenanceDetail =
    artifact == null
      ? canvasViewCopy.inspectorDbtModelSqlUnavailableMessage
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
        <p
          data-slot="dbt-model-code-provenance"
          className={inspectorVisualClasses.inspectorArtifactDetail}
        >
          {provenanceDetail}
        </p>
        <Textarea
          id={`inspector-dbt-model-sql-${node.id}`}
          name="dbt-model-sql"
          value={editorValue}
          disabled={disabled}
          className={inspectorVisualClasses.inspectorCodeEditor}
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' || event.key === 'Delete') {
              event.stopPropagation();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === 'Backspace' || event.key === 'Delete') {
              event.stopPropagation();
            }
          }}
          onChange={(event) => {
            const modelSql = event.currentTarget.value;
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
