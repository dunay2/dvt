/** Owned concern: render dbt model authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import type { DbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

export function DbtModelAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  projection,
  onChange,
  onCommitChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DbtNodeAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dbt'];
  projection: DbtAuthoringModelProjection;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
  onCommitChange: (draft: DbtNodeAuthoringMetadata) => void;
}>): JSX.Element {
  const selectClassName = inspectorVisualClasses.inspectorSelectInput;
  const materializedOptions = [
    { value: 'view', label: canvasViewCopy.inspectorDbtMaterializedViewLabel },
    { value: 'table', label: canvasViewCopy.inspectorDbtMaterializedTableLabel },
    { value: 'incremental', label: canvasViewCopy.inspectorDbtMaterializedIncrementalLabel },
    { value: 'ephemeral', label: canvasViewCopy.inspectorDbtMaterializedEphemeralLabel },
  ] as const;

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
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
          onBlur={() => onCommitChange(draft)}
        />
        {errors?.packageName ? (
          <p className={inspectorVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.packageName, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-materialized-${node.id}`}>
            {canvasViewCopy.inspectorDbtMaterializedLabel}
          </Label>
          <select
            id={`inspector-dbt-materialized-${node.id}`}
            name="dbt-materialized"
            value={draft.materialized}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors?.materialized ? 'true' : undefined}
            onChange={(event) => onCommitChange({ ...draft, materialized: event.target.value })}
          >
            {materializedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors?.materialized ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.materialized, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-origin-${node.id}`}>
            {canvasViewCopy.inspectorDbtOriginLabel}
          </Label>
          {projection.originOptions.length > 0 ? (
            <select
              id={`inspector-dbt-origin-${node.id}`}
              name="dbt-origin"
              value={projection.selectedOriginId}
              disabled={disabled}
              className={selectClassName}
              aria-invalid={errors?.selectedSourceId ? 'true' : undefined}
              onChange={(event) =>
                onCommitChange({ ...draft, selectedSourceId: event.target.value })
              }
            >
              {projection.selectedOriginId.length === 0 ? (
                <option value="" disabled>
                  {canvasViewCopy.inspectorDbtOriginPlaceholder}
                </option>
              ) : null}
              {projection.originOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={inspectorVisualClasses.inspectorBody}>
              {canvasViewCopy.inspectorDbtNoConnectedOriginsMessage}
            </p>
          )}
          {errors?.selectedSourceId ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.selectedSourceId, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
