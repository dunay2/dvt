/** Owned concern: render dbt model authoring fields. */
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
import type { DbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

export function DbtModelAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  projection,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DbtNodeAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dbt'];
  projection: DbtAuthoringModelProjection;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const selectClassName = graphVisualClasses.inspectorSelectInput;
  const materializedOptions = [
    { value: 'view', label: canvasViewCopy.inspectorDbtMaterializedViewLabel },
    { value: 'table', label: canvasViewCopy.inspectorDbtMaterializedTableLabel },
    { value: 'incremental', label: canvasViewCopy.inspectorDbtMaterializedIncrementalLabel },
    { value: 'ephemeral', label: canvasViewCopy.inspectorDbtMaterializedEphemeralLabel },
  ] as const;

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
            onChange={(event) =>
              onChange((currentDraft) => ({
                ...currentDraft,
                dbt: currentDraft.dbt
                  ? { ...currentDraft.dbt, materialized: event.target.value }
                  : undefined,
              }))
            }
          >
            {materializedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors?.materialized ? (
            <p className={graphVisualClasses.inspectorErrorText}>
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
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dbt: currentDraft.dbt
                    ? { ...currentDraft.dbt, selectedSourceId: event.target.value }
                    : undefined,
                }))
              }
            >
              {projection.originOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={graphVisualClasses.inspectorBody}>
              {canvasViewCopy.inspectorDbtNoConnectedOriginsMessage}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dbt-generated-sql-${node.id}`}>
            {canvasViewCopy.inspectorDbtGeneratedSqlLabel}
          </Label>
          {projection.generatedModelSql ? (
            <pre
              id={`inspector-dbt-generated-sql-${node.id}`}
              data-slot="dbt-generated-model-sql"
              className="min-h-16 overflow-auto rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs leading-5 text-slate-100"
            >
              {projection.generatedModelSql}
            </pre>
          ) : (
            <p className={graphVisualClasses.inspectorBody}>
              {canvasViewCopy.inspectorDbtGeneratedSqlUnavailableMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
