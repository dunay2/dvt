/** Owned concern: render explicit DBT generic-test authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import type { DbtTestAuthoringMetadata } from './canvasDbtTestAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import type { DbtTestAuthoringFieldsModel } from './dbtTestAuthoringFieldsModel';

type DbtTestAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DbtTestAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dbtTest'];
  projection: DbtTestAuthoringFieldsModel;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>;

export function DbtTestAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  projection,
  onChange,
}: DbtTestAuthoringSectionProps): JSX.Element {
  const updateDraft = (changes: Partial<DbtTestAuthoringMetadata>) => {
    onChange((currentDraft) => {
      if (!currentDraft.dbtTest) return currentDraft;

      return {
        ...currentDraft,
        dbtTest: {
          ...currentDraft.dbtTest,
          targetModelId:
            changes.targetModelId ??
            (currentDraft.dbtTest.targetModelId || projection.selectedTargetModelId),
          ...changes,
        },
      };
    });
  };
  const selectClassName = inspectorVisualClasses.inspectorSelectInput;
  const columnListId = `inspector-dbt-test-columns-${node.id}`;

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDbtTestTitle}
      </h3>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-test-type-${node.id}`}>
          {canvasViewCopy.inspectorDbtTestTypeLabel}
        </Label>
        <select
          id={`inspector-dbt-test-type-${node.id}`}
          name="dbt-test-type"
          value={draft.testType}
          disabled={disabled}
          className={selectClassName}
          aria-invalid={errors?.testType ? 'true' : undefined}
          onChange={(event) => updateDraft({ testType: event.target.value })}
        >
          <option value="not_null">{canvasViewCopy.inspectorDbtTestNotNullLabel}</option>
          <option value="unique">{canvasViewCopy.inspectorDbtTestUniqueLabel}</option>
        </select>
        {errors?.testType ? (
          <p className={inspectorVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.testType, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-test-target-${node.id}`}>
          {canvasViewCopy.inspectorDbtTestTargetLabel}
        </Label>
        {projection.targetOptions.length > 0 ? (
          <select
            id={`inspector-dbt-test-target-${node.id}`}
            name="dbt-test-target"
            value={projection.selectedTargetModelId}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors?.targetModelId ? 'true' : undefined}
            onChange={(event) => updateDraft({ targetModelId: event.target.value })}
          >
            {projection.targetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <p className={inspectorVisualClasses.inspectorBody}>
            {canvasViewCopy.inspectorDbtTestNoConnectedTargetMessage}
          </p>
        )}
        {errors?.targetModelId ? (
          <p className={inspectorVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.targetModelId, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-test-column-${node.id}`}>
          {canvasViewCopy.inspectorDbtTestColumnLabel}
        </Label>
        <Input
          id={`inspector-dbt-test-column-${node.id}`}
          name="dbt-test-column"
          list={columnListId}
          value={draft.targetColumn}
          disabled={disabled}
          aria-invalid={errors?.targetColumn ? 'true' : undefined}
          onChange={(event) => updateDraft({ targetColumn: event.target.value })}
        />
        <datalist id={columnListId}>
          {projection.columnOptions.map((columnName) => (
            <option key={columnName} value={columnName} />
          ))}
        </datalist>
        {errors?.targetColumn ? (
          <p className={inspectorVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.targetColumn, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-test-severity-${node.id}`}>
          {canvasViewCopy.inspectorDbtTestSeverityLabel}
        </Label>
        <select
          id={`inspector-dbt-test-severity-${node.id}`}
          name="dbt-test-severity"
          value={draft.severity}
          disabled={disabled}
          className={selectClassName}
          aria-invalid={errors?.severity ? 'true' : undefined}
          onChange={(event) => updateDraft({ severity: event.target.value })}
        >
          <option value="error">{canvasViewCopy.inspectorDbtTestSeverityErrorLabel}</option>
          <option value="warn">{canvasViewCopy.inspectorDbtTestSeverityWarnLabel}</option>
        </select>
        {errors?.severity ? (
          <p className={inspectorVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.severity, canvasViewCopy)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
