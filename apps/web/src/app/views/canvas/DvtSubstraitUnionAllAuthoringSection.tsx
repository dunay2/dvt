/** Owned concern: edit the admitted N-source Substrait UNION ALL in Node Properties. */
import { useId, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { resolveCanvasDvtOutputNameDraftError } from './canvasInspectorAuthoringModel';
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
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';

export function DvtSubstraitUnionAllAuthoringSection({
  disabled,
  draft,
  onChange,
  outputNameDrafts,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
  outputNameDrafts: Readonly<Record<string, string>>;
}>): JSX.Element | null {
  const semanticDraft = { plan: draft.plan, sidecar: draft.sidecar };
  const countOutputDraftKey = 'union-all:new-count-output';
  const windowOutputDraftKey = 'union-all:new-window-output';
  const outputPolicyErrorId = useId();
  const outputPolicyErrorIdFor = (key: string): string =>
    `${outputPolicyErrorId}-${encodeURIComponent(key)}`;
  const outputNameErrorFor = (key: string) =>
    resolveCanvasDvtOutputNameDraftError(draft, outputNameDrafts, key);
  const invalidOutputNames = new Set(
    Object.keys(outputNameDrafts).filter((key) => outputNameErrorFor(key) != null)
  );
  const updateOutputNameDraft = (key: string, value: string): void => {
    onChange((current) => ({
      ...current,
      outputNameDrafts: { ...current.outputNameDrafts, [key]: value },
    }));
  };
  const clearOutputNameDraft = (key: string): void => {
    onChange((current) => {
      const { [key]: _removed, ...remaining } = current.outputNameDrafts ?? {};
      const { outputNameDrafts: _current, ...rest } = current;
      return Object.keys(remaining).length > 0 ? { ...rest, outputNameDrafts: remaining } : rest;
    });
  };
  const renameOutput = (key: string, value: string, apply: (name: string) => void): void => {
    if (resolveCanvasDvtOutputNameDraftError(draft, outputNameDrafts, key) != null) return;
    apply(value);
    clearOutputNameDraft(key);
  };
  const mutateDraft = (
    transform: (current: DvtSubstraitUnionAllDraft) => DvtSubstraitUnionAllDraft,
    discardedOutputNameDraftKeys: readonly string[] = []
  ): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'union_all'
      ) {
        return currentDraft;
      }
      const nextDraft = {
        ...currentDraft,
        dvt: {
          ...currentDraft.dvt,
          ...transform(currentDraft.dvt),
        },
      };
      if (discardedOutputNameDraftKeys.length === 0) return nextDraft;
      const discardedKeys = new Set(discardedOutputNameDraftKeys);
      const remainingOutputNameDrafts = Object.fromEntries(
        Object.entries(currentDraft.outputNameDrafts ?? {}).filter(
          ([key]) => !discardedKeys.has(key)
        )
      );
      const { outputNameDrafts: _discarded, ...nextDraftWithoutOutputNames } = nextDraft;
      return Object.keys(remainingOutputNameDrafts).length > 0
        ? { ...nextDraftWithoutOutputNames, outputNameDrafts: remainingOutputNameDrafts }
        : nextDraftWithoutOutputNames;
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
      {Object.keys(outputNameDrafts).map((key) => {
        const error = outputNameErrorFor(key);
        return error == null ? null : (
          <p
            key={key}
            id={outputPolicyErrorIdFor(key)}
            role="alert"
            className={inspectorVisualClasses.inspectorErrorText}
          >
            {formatCanvasInspectorNodeDraftError(error, canvasViewCopy)}
          </p>
        );
      })}
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
            value={outputNameDrafts[projection.result.fieldId] ?? projection.result.name}
            onChange={(event) =>
              updateOutputNameDraft(projection.result.fieldId, event.currentTarget.value)
            }
            aria-invalid={invalidOutputNames.has(projection.result.fieldId) ? 'true' : undefined}
            aria-describedby={
              invalidOutputNames.has(projection.result.fieldId)
                ? outputPolicyErrorIdFor(projection.result.fieldId)
                : undefined
            }
            onBlur={(event) =>
              renameOutput(projection.result.fieldId, event.currentTarget.value, (name) =>
                mutateDraft((current) =>
                  renameDvtSubstraitUnionAllGroupedRowNumberOutput(current, name)
                )
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
          onClick={() =>
            mutateDraft(removeDvtSubstraitUnionAllGroupedRowNumber, [projection.result.fieldId])
          }
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
      if (typeof outputName !== 'string') return;
      renameOutput(windowOutputDraftKey, outputName, (name) =>
        mutateDraft((current) =>
          applyDvtSubstraitUnionAllGroupedRowNumber(current, { outputName: name })
        )
      );
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
            value={outputNameDrafts[projection.measure.fieldId] ?? projection.measure.name}
            onChange={(event) =>
              updateOutputNameDraft(projection.measure.fieldId, event.currentTarget.value)
            }
            aria-invalid={invalidOutputNames.has(projection.measure.fieldId) ? 'true' : undefined}
            aria-describedby={
              invalidOutputNames.has(projection.measure.fieldId)
                ? outputPolicyErrorIdFor(projection.measure.fieldId)
                : undefined
            }
            onBlur={(event) =>
              renameOutput(projection.measure.fieldId, event.currentTarget.value, (name) =>
                mutateDraft((current) => renameDvtSubstraitUnionAllCountOutput(current, name))
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
            value={outputNameDrafts[windowOutputDraftKey] ?? 'group_rank'}
            onChange={(event) =>
              updateOutputNameDraft(windowOutputDraftKey, event.currentTarget.value)
            }
            aria-invalid={invalidOutputNames.has(windowOutputDraftKey) ? 'true' : undefined}
            aria-describedby={
              invalidOutputNames.has(windowOutputDraftKey)
                ? outputPolicyErrorIdFor(windowOutputDraftKey)
                : undefined
            }
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
          onClick={() =>
            mutateDraft(removeDvtSubstraitUnionAllGrouping, [
              projection.measure.fieldId,
              windowOutputDraftKey,
            ])
          }
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveAggregationLabel}
        </Button>
      </div>
    );
  }

  const inspection = inspectDvtSubstraitUnionAllDraft(semanticDraft);
  if (!inspection.ok) return null;
  const mutateField = (edit: DvtSubstraitUnionAllFieldEdit): void => {
    if (edit.kind === 'set-selected' && !edit.selected) {
      const output = inspection.projection.outputs.find(
        (candidate) => candidate.fieldKey === edit.fieldKey
      );
      if (output != null) clearOutputNameDraft(output.fieldId);
    }
    mutateDraft((current) => applyDvtSubstraitUnionAllFieldEdit(current, edit));
  };
  const applyGrouping = (form: HTMLFormElement): void => {
    const formData = new FormData(form);
    const groupFieldId = formData.get('grainFieldId');
    const countOutputName = formData.get('countOutputName');
    if (typeof groupFieldId !== 'string' || typeof countOutputName !== 'string') return;
    renameOutput(countOutputDraftKey, countOutputName, (name) =>
      mutateDraft((current) =>
        applyDvtSubstraitUnionAllGrouping(current, { groupFieldId, countOutputName: name })
      )
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
                      value={outputNameDrafts[output.fieldId] ?? output.name}
                      onChange={(event) =>
                        updateOutputNameDraft(output.fieldId, event.currentTarget.value)
                      }
                      aria-invalid={invalidOutputNames.has(output.fieldId) ? 'true' : undefined}
                      aria-describedby={
                        invalidOutputNames.has(output.fieldId)
                          ? outputPolicyErrorIdFor(output.fieldId)
                          : undefined
                      }
                      onBlur={(event) =>
                        renameOutput(output.fieldId, event.currentTarget.value, (outputName) =>
                          mutateField({ kind: 'rename', fieldKey: field.fieldKey, outputName })
                        )
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
          value={outputNameDrafts[countOutputDraftKey] ?? 'row_count'}
          onChange={(event) =>
            updateOutputNameDraft(countOutputDraftKey, event.currentTarget.value)
          }
          aria-invalid={invalidOutputNames.has(countOutputDraftKey) ? 'true' : undefined}
          aria-describedby={
            invalidOutputNames.has(countOutputDraftKey)
              ? outputPolicyErrorIdFor(countOutputDraftKey)
              : undefined
          }
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
