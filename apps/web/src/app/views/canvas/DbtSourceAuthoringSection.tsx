/** Owned concern: render dbt source authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

export function DbtSourceAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DbtNodeAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dbt'];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDbtCardTitle}
      </h3>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-package-${node.id}`}>
          {canvasViewCopy.inspectorDbtPackageLabel}
        </Label>
        <Input
          id={`inspector-dbt-package-${node.id}`}
          name="dbt-package"
          value={draft.packageName}
          disabled={disabled}
          aria-invalid={errors?.packageName ? 'true' : undefined}
          onChange={(event) =>
            onChange((currentDraft) => ({
              ...currentDraft,
              dbt: currentDraft.dbt
                ? { ...currentDraft.dbt, packageName: event.target.value }
                : undefined,
            }))
          }
        />
        {errors?.packageName ? (
          <p className={graphVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.packageName, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-source-${node.id}`}>
            {canvasViewCopy.inspectorDbtSourceLabel}
          </Label>
          <Input
            id={`inspector-dbt-source-${node.id}`}
            name="dbt-source"
            value={draft.sourceName}
            disabled={disabled}
            aria-invalid={errors?.sourceName ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) => ({
                ...currentDraft,
                dbt: currentDraft.dbt
                  ? { ...currentDraft.dbt, sourceName: event.target.value }
                  : undefined,
              }))
            }
          />
          {errors?.sourceName ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.sourceName, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-schema-${node.id}`}>
            {canvasViewCopy.inspectorDbtSchemaLabel}
          </Label>
          <Input
            id={`inspector-dbt-schema-${node.id}`}
            name="dbt-schema"
            value={draft.schemaName}
            disabled={disabled}
            aria-invalid={errors?.schemaName ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) => ({
                ...currentDraft,
                dbt: currentDraft.dbt
                  ? { ...currentDraft.dbt, schemaName: event.target.value }
                  : undefined,
              }))
            }
          />
          {errors?.schemaName ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.schemaName, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-table-${node.id}`}>
            {canvasViewCopy.inspectorDbtTableLabel}
          </Label>
          <Input
            id={`inspector-dbt-table-${node.id}`}
            name="dbt-table"
            value={draft.tableName}
            disabled={disabled}
            aria-invalid={errors?.tableName ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) => ({
                ...currentDraft,
                dbt: currentDraft.dbt
                  ? { ...currentDraft.dbt, tableName: event.target.value }
                  : undefined,
              }))
            }
          />
          {errors?.tableName ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.tableName, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
