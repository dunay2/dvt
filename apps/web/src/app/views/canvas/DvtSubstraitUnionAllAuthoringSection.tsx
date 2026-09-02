/** Owned concern: edit the admitted N-source Substrait UNION ALL in Node Properties. */
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  applyDvtSubstraitUnionAllFieldEdit,
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  inspectDvtSubstraitUnionAllDraft,
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  removeDvtSubstraitUnionAllGroupedRowNumber,
  removeDvtSubstraitUnionAllGrouping,
  renameDvtSubstraitUnionAllCountOutput,
  renameDvtSubstraitUnionAllGroupedRowNumberOutput,
  type DvtSubstraitUnionAllDraft,
  type DvtSubstraitUnionAllFieldEdit,
} from './canvasDvtSubstraitSetComposition';
import { canvasViewCopy } from './copy';

export function DvtSubstraitUnionAllAuthoringSection({
  disabled,
  draft,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const semanticDraft = { plan: draft.plan, sidecar: draft.sidecar };
  const mutateDraft = (
    transform: (current: DvtSubstraitUnionAllDraft) => DvtSubstraitUnionAllDraft
  ): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'union_all'
      ) {
        return currentDraft;
      }
      return {
        ...currentDraft,
        dvt: {
          ...currentDraft.dvt,
          ...transform(currentDraft.dvt),
        },
      };
    });
  };
  const renderShell = (content: ReactNode): JSX.Element => (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-union-all-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitUnionAllTitle}
      </h3>
      {content}
    </div>
  );
  const renderInputs = (
    inputs: readonly Readonly<{ schema: string; table: string }>[]
  ): JSX.Element => (
    <p className="font-mono text-xs text-(--text-muted)">
      {inputs.map((input) => `${input.schema}.${input.table}`).join(' UNION ALL ')}
    </p>
  );

  const groupedWindowInspection = inspectDvtSubstraitUnionAllGroupedWindowDraft(semanticDraft);
  if (groupedWindowInspection.ok) {
    const projection = groupedWindowInspection.projection;
    return renderShell(
      <div
        data-slot="dvt-substrait-union-all-grouped-window-authoring"
        data-capability-id={projection.result.capabilityId}
        className="space-y-3"
      >
        {renderInputs(projection.inputs)}
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtSubstraitAggregateWindowTitle}
        </p>
        <div className="space-y-1">
          <p className="text-xs text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
          </p>
          <div className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs">
            {projection.groupField.name}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
          </p>
          <div className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs">
            {projection.measure.name}
          </div>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="dvt-substrait-union-all-window-output-name"
            className="text-xs text-(--text-muted)"
          >
            {canvasViewCopy.inspectorDvtSubstraitWindowOutputLabel}
          </label>
          <Input
            key={`${projection.result.fieldId}:${projection.result.name}`}
            id="dvt-substrait-union-all-window-output-name"
            data-slot="dvt-substrait-union-all-window-output-name"
            disabled={disabled}
            defaultValue={projection.result.name}
            onBlur={(event) =>
              mutateDraft((current) =>
                renameDvtSubstraitUnionAllGroupedRowNumberOutput(current, event.currentTarget.value)
              )
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="dvt-substrait-union-all-remove-window"
          disabled={disabled}
          onClick={() => mutateDraft(removeDvtSubstraitUnionAllGroupedRowNumber)}
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveAggregateWindowLabel}
        </Button>
      </div>
    );
  }

  const groupingInspection = inspectDvtSubstraitUnionAllGroupingDraft(semanticDraft);
  if (groupingInspection.ok) {
    const projection = groupingInspection.projection;
    const applyWindow = (form: HTMLFormElement): void => {
      const outputName = new FormData(form).get('windowOutputName');
      if (typeof outputName !== 'string' || outputName.trim().length === 0) return;
      mutateDraft((current) => applyDvtSubstraitUnionAllGroupedRowNumber(current, { outputName }));
    };
    return renderShell(
      <div
        data-slot="dvt-substrait-union-all-grouping-authoring"
        data-capability-id={projection.measure.capabilityId}
        className="space-y-3"
      >
        {renderInputs(projection.inputs)}
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtSubstraitAggregationTitle}
        </p>
        <div className="space-y-1">
          <p className="text-xs text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
          </p>
          <div className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs">
            {projection.groupField.name}
          </div>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="dvt-substrait-union-all-count-output-name"
            className="text-xs text-(--text-muted)"
          >
            {canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
          </label>
          <Input
            key={`${projection.measure.fieldId}:${projection.measure.name}`}
            id="dvt-substrait-union-all-count-output-name"
            data-slot="dvt-substrait-union-all-count-output-name"
            disabled={disabled}
            defaultValue={projection.measure.name}
            onBlur={(event) =>
              mutateDraft((current) =>
                renameDvtSubstraitUnionAllCountOutput(current, event.currentTarget.value)
              )
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </div>
        <form
          className="space-y-2 border-t border-[color:var(--border-default)] pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyWindow(event.currentTarget);
          }}
        >
          <p className="text-xs font-medium text-(--text-default)">
            {canvasViewCopy.inspectorDvtSubstraitAggregateWindowTitle}
          </p>
          <div className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs">
            {projection.measure.name} ↓, {projection.groupField.name} ↑
          </div>
          <Input
            data-slot="dvt-substrait-union-all-window-output-name"
            name="windowOutputName"
            aria-label={canvasViewCopy.inspectorDvtSubstraitWindowOutputLabel}
            disabled={disabled}
            defaultValue="group_rank"
          />
          <Button
            type="submit"
            size="sm"
            data-slot="dvt-substrait-union-all-apply-window"
            disabled={disabled}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (event.currentTarget.form != null) applyWindow(event.currentTarget.form);
            }}
          >
            {canvasViewCopy.inspectorDvtSubstraitApplyAggregateWindowLabel}
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="dvt-substrait-union-all-remove-grouping"
          disabled={disabled}
          onClick={() => mutateDraft(removeDvtSubstraitUnionAllGrouping)}
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveAggregationLabel}
        </Button>
      </div>
    );
  }

  const inspection = inspectDvtSubstraitUnionAllDraft(semanticDraft);
  if (!inspection.ok) return null;
  const mutateField = (edit: DvtSubstraitUnionAllFieldEdit): void => {
    mutateDraft((current) => applyDvtSubstraitUnionAllFieldEdit(current, edit));
  };
  const applyGrouping = (form: HTMLFormElement): void => {
    const formData = new FormData(form);
    const groupFieldId = formData.get('grainFieldId');
    const countOutputName = formData.get('countOutputName');
    if (
      typeof groupFieldId !== 'string' ||
      typeof countOutputName !== 'string' ||
      countOutputName.trim().length === 0
    ) {
      return;
    }
    mutateDraft((current) =>
      applyDvtSubstraitUnionAllGrouping(current, { groupFieldId, countOutputName })
    );
  };

  return renderShell(
    <>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllInputsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.inputs
              .map((input) => `${input.schema}.${input.table}`)
              .join(' UNION ALL ')}
          </dd>
        </div>
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllFieldsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.outputs.map((output) => output.name).join(', ')}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
          </dt>
          <dd className="space-y-2">
            {inspection.projection.availableFields.map((field) => {
              const output = inspection.projection.outputs.find(
                (candidate) => candidate.fieldKey === field.fieldKey
              );
              const selected = output != null;
              const outputOrdinal = output?.outputOrdinal ?? -1;
              return (
                <div
                  key={field.fieldKey}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[color:var(--border-default)] p-2"
                >
                  <input
                    type="checkbox"
                    data-slot="dvt-substrait-union-all-field"
                    data-field-key={field.fieldKey}
                    aria-label={`${canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}: ${field.defaultName}`}
                    checked={selected}
                    disabled={disabled || (selected && inspection.projection.outputs.length === 1)}
                    onChange={(event) =>
                      mutateField({
                        kind: 'set-selected',
                        fieldKey: field.fieldKey,
                        selected: event.currentTarget.checked,
                      })
                    }
                  />
                  {output == null ? (
                    <span className="text-(--text-muted)">{field.defaultName}</span>
                  ) : (
                    <Input
                      key={`${output.fieldId}:${output.name}`}
                      data-slot="dvt-substrait-union-all-output-name"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtVisualOutputNameLabel}: ${field.defaultName}`}
                      disabled={disabled}
                      defaultValue={output.name}
                      onBlur={(event) =>
                        mutateField({
                          kind: 'rename',
                          fieldKey: field.fieldKey,
                          outputName: event.currentTarget.value,
                        })
                      }
                    />
                  )}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-union-all-field-up"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldUpLabel}: ${field.defaultName}`}
                      disabled={disabled || !selected || outputOrdinal === 0}
                      onClick={() =>
                        mutateField({ kind: 'move', fieldKey: field.fieldKey, direction: 'up' })
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-union-all-field-down"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldDownLabel}: ${field.defaultName}`}
                      disabled={
                        disabled ||
                        !selected ||
                        outputOrdinal === inspection.projection.outputs.length - 1
                      }
                      onClick={() =>
                        mutateField({ kind: 'move', fieldKey: field.fieldKey, direction: 'down' })
                      }
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              );
            })}
          </dd>
        </div>
      </dl>
      <form
        className="space-y-2 border-t border-[color:var(--border-default)] pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          applyGrouping(event.currentTarget);
        }}
      >
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtSubstraitAggregationTitle}
        </p>
        <select
          data-slot="dvt-substrait-union-all-grain-field"
          name="grainFieldId"
          aria-label={canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
          disabled={disabled}
          defaultValue={inspection.projection.outputs[0]?.fieldId}
          className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
        >
          {inspection.projection.outputs.map((output) => (
            <option key={output.fieldId} value={output.fieldId}>
              {output.name}
            </option>
          ))}
        </select>
        <Input
          data-slot="dvt-substrait-union-all-count-output-name"
          name="countOutputName"
          aria-label={canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
          disabled={disabled}
          defaultValue="row_count"
        />
        <Button
          type="submit"
          size="sm"
          data-slot="dvt-substrait-union-all-apply-grouping"
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            if (event.currentTarget.form != null) applyGrouping(event.currentTarget.form);
          }}
        >
          {canvasViewCopy.inspectorDvtSubstraitApplyAggregationLabel}
        </Button>
      </form>
    </>
  );
}
