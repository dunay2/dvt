/** Owned concern: edit the admitted two-source Substrait INNER JOIN in Node Properties. */
import { isWellFormedCanvasText, PostgresIdentifierV1Schema } from '@dvt/contracts';
import { useId, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS,
  applyDvtSubstraitInnerJoinFieldEdit,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  appendDvtSubstraitInnerJoinInput,
  inspectDvtSubstraitInnerJoinDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
  renameDvtSubstraitInnerJoinCountOutput,
  renameDvtSubstraitInnerJoinGroupedRowNumberOutput,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinFieldEdit,
  type DvtSubstraitJoinInput,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';

export function DvtSubstraitInnerJoinAuthoringSection({
  disabled,
  draft,
  appendCandidates,
  onChange,
  outputNameDrafts,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  appendCandidates: readonly DvtSubstraitJoinInput[];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
  outputNameDrafts: Readonly<Record<string, string>>;
}>): JSX.Element | null {
  const semanticDraft = { plan: draft.plan, sidecar: draft.sidecar };
  const countOutputDraftKey = 'inner-join:new-count-output';
  const windowOutputDraftKey = 'inner-join:new-window-output';
  const outputPolicyErrorId = useId();
  const outputPolicyErrorIdFor = (key: string): string =>
    `${outputPolicyErrorId}-${encodeURIComponent(key)}`;
  const outputNameErrorFor = (key: string) => {
    const value = outputNameDrafts[key];
    if (value == null) return null;
    if (value.trim().length === 0) return 'dvt_alias_required' as const;
    if (!isWellFormedCanvasText(value)) return 'dvt_identifier_invalid' as const;
    if (value !== value.trim()) return 'dvt_identifier_whitespace' as const;
    return PostgresIdentifierV1Schema.safeParse(value).success
      ? null
      : ('dvt_identifier_too_long' as const);
  };
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
    if (
      value.trim().length === 0 ||
      !isWellFormedCanvasText(value) ||
      value !== value.trim() ||
      !PostgresIdentifierV1Schema.safeParse(value).success
    )
      return;
    apply(value);
    clearOutputNameDraft(key);
  };
  const mutateDraft = (
    transform: (current: DvtSubstraitInnerJoinDraft) => DvtSubstraitInnerJoinDraft
  ): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'inner_join'
      ) {
        return currentDraft;
      }
      return {
        ...currentDraft,
        dvt: { ...currentDraft.dvt, ...transform(currentDraft.dvt) },
      };
    });
  };
  const renderShell = (content: ReactNode): JSX.Element => (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-inner-join-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
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
  const renderJoinSummary = (
    projection:
      | {
          left: { table: string };
          right: { table: string };
          leftKey: string;
          rightKey: string;
        }
      | Pick<DvtSubstraitNInputJoinProjection, 'inputs' | 'joins'>
  ): JSX.Element =>
    'inputs' in projection ? (
      <p className="text-xs text-(--text-muted)">
        {projection.inputs.map((input) => input.table).join(' + ')}
      </p>
    ) : (
      <div className="space-y-1 text-xs">
        <p className="text-(--text-muted)">
          {projection.left.table} + {projection.right.table}
        </p>
        <p>
          {projection.left.table}.{projection.leftKey} = {projection.right.table}.
          {projection.rightKey}
        </p>
      </div>
    );
  const nInputInspection = inspectDvtSubstraitNInputJoinDraft(semanticDraft);
  const binaryInspection = inspectDvtSubstraitInnerJoinDraft(semanticDraft);
  const renderAppendInput = (projection: DvtSubstraitNInputJoinProjection): ReactNode => {
    if (appendCandidates.length === 0) return null;
    const candidateFieldSeparator = '\u001f';
    const appendInput = (form: HTMLFormElement): void => {
      const formData = new FormData(form);
      const leftSourceFieldId = formData.get('leftSourceFieldId');
      const candidateField = formData.get('candidateField');
      if (typeof leftSourceFieldId !== 'string' || typeof candidateField !== 'string') return;
      const separatorIndex = candidateField.indexOf(candidateFieldSeparator);
      if (separatorIndex <= 0) return;
      const candidateNodeId = candidateField.slice(0, separatorIndex);
      const rightFieldName = candidateField.slice(separatorIndex + candidateFieldSeparator.length);
      const candidate = appendCandidates.find(
        (input) => input.source.nodeId === candidateNodeId && input.fields.includes(rightFieldName)
      );
      if (candidate == null) return;
      const selectedFields = candidate.fields.filter((field) => field !== rightFieldName);
      if (selectedFields.length === 0) return;
      mutateDraft((current) =>
        appendDvtSubstraitInnerJoinInput(current, {
          source: candidate.source,
          fields: candidate.fields,
          predicate: { leftSourceFieldId, rightFieldName },
          selectedFields,
        })
      );
    };
    return (
      <form
        className="space-y-2 border-t border-[color:var(--border-default)] pt-3"
        data-slot="dvt-substrait-append-input"
        onSubmit={(event) => {
          event.preventDefault();
          appendInput(event.currentTarget);
        }}
      >
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtSubstraitAppendInputTitle}
        </p>
        <label className="block space-y-1 text-xs text-(--text-muted)">
          <span>{canvasViewCopy.inspectorDvtSubstraitExistingFieldLabel}</span>
          <select
            name="leftSourceFieldId"
            data-slot="dvt-substrait-append-left-field"
            disabled={disabled}
            className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
          >
            {projection.outputs.map((output) => (
              <option key={output.source.fieldId} value={output.source.fieldId}>
                {output.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs text-(--text-muted)">
          <span>{canvasViewCopy.inspectorDvtSubstraitConnectedFieldLabel}</span>
          <select
            name="candidateField"
            data-slot="dvt-substrait-append-right-field"
            disabled={disabled}
            className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
          >
            {appendCandidates.map((candidate) => (
              <optgroup key={candidate.source.nodeId} label={candidate.source.table}>
                {candidate.fields.map((field) => (
                  <option
                    key={`${candidate.source.nodeId}:${field}`}
                    value={`${candidate.source.nodeId}${candidateFieldSeparator}${field}`}
                  >
                    {candidate.source.table}.{field}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" disabled={disabled} data-slot="dvt-substrait-append-submit">
          {canvasViewCopy.inspectorDvtSubstraitAppendInputAction}
        </Button>
      </form>
    );
  };
  const renderGroupingForm = (
    outputs: readonly Readonly<{ name: string; fieldId: string }>[]
  ): JSX.Element => {
    const applyGrouping = (form: HTMLFormElement): void => {
      const formData = new FormData(form);
      const groupFieldId = formData.get('grainFieldId');
      const countOutputName = formData.get('countOutputName');
      if (typeof groupFieldId !== 'string' || typeof countOutputName !== 'string') return;
      renameOutput(countOutputDraftKey, countOutputName, (name) =>
        mutateDraft((current) =>
          applyDvtSubstraitInnerJoinGrouping(current, { groupFieldId, countOutputName: name })
        )
      );
    };
    return (
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
          data-slot="dvt-substrait-inner-join-grain-field"
          name="grainFieldId"
          aria-label={canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
          disabled={disabled}
          defaultValue={outputs[0]?.fieldId}
          className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
        >
          {outputs.map((output) => (
            <option key={output.fieldId} value={output.fieldId}>
              {output.name}
            </option>
          ))}
        </select>
        <Input
          data-slot="dvt-substrait-inner-join-count-output-name"
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
          data-slot="dvt-substrait-inner-join-apply-grouping"
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
    );
  };

  const groupedWindowInspection = inspectDvtSubstraitInnerJoinGroupedWindowDraft(semanticDraft);
  if (groupedWindowInspection.ok) {
    const projection = groupedWindowInspection.projection;
    return renderShell(
      <div
        data-slot="dvt-substrait-inner-join-grouped-window-authoring"
        data-capability-id={projection.result.capabilityId}
        className="space-y-3"
      >
        {renderJoinSummary(projection)}
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
            htmlFor="dvt-substrait-inner-join-window-output-name"
            className="text-xs text-(--text-muted)"
          >
            {canvasViewCopy.inspectorDvtSubstraitWindowOutputLabel}
          </label>
          <Input
            key={`${projection.result.fieldId}:${projection.result.name}`}
            id="dvt-substrait-inner-join-window-output-name"
            data-slot="dvt-substrait-inner-join-window-output-name"
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
                  renameDvtSubstraitInnerJoinGroupedRowNumberOutput(current, name)
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
          data-slot="dvt-substrait-inner-join-remove-window"
          disabled={disabled}
          onClick={() => mutateDraft(removeDvtSubstraitInnerJoinGroupedRowNumber)}
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveAggregateWindowLabel}
        </Button>
      </div>
    );
  }

  const groupingInspection = inspectDvtSubstraitInnerJoinGroupingDraft(semanticDraft);
  if (groupingInspection.ok) {
    const projection = groupingInspection.projection;
    const applyWindow = (form: HTMLFormElement): void => {
      const outputName = new FormData(form).get('windowOutputName');
      if (typeof outputName !== 'string') return;
      renameOutput(windowOutputDraftKey, outputName, (name) =>
        mutateDraft((current) =>
          applyDvtSubstraitInnerJoinGroupedRowNumber(current, { outputName: name })
        )
      );
    };
    return renderShell(
      <div
        data-slot="dvt-substrait-inner-join-grouping-authoring"
        data-capability-id={projection.measure.capabilityId}
        className="space-y-3"
      >
        {renderJoinSummary(projection)}
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
        <Input
          key={`${projection.measure.fieldId}:${projection.measure.name}`}
          data-slot="dvt-substrait-inner-join-count-output-name"
          aria-label={canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
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
              mutateDraft((current) => renameDvtSubstraitInnerJoinCountOutput(current, name))
            )
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
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
            data-slot="dvt-substrait-inner-join-window-output-name"
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
            data-slot="dvt-substrait-inner-join-apply-window"
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
          data-slot="dvt-substrait-inner-join-remove-grouping"
          disabled={disabled}
          onClick={() => mutateDraft(removeDvtSubstraitInnerJoinGrouping)}
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveAggregationLabel}
        </Button>
      </div>
    );
  }

  if (
    nInputInspection.ok &&
    (nInputInspection.projection.inputs.length > 2 || !binaryInspection.ok)
  ) {
    const projection = nInputInspection.projection;
    const mutateField = (edit: DvtSubstraitInnerJoinFieldEdit): void => {
      if (edit.kind === 'set-selected' && !edit.selected) {
        const key = 'sourceFieldId' in edit ? edit.sourceFieldId : edit.fieldKey;
        if (key != null) clearOutputNameDraft(key);
      }
      mutateDraft((current) => applyDvtSubstraitInnerJoinFieldEdit(current, edit));
    };
    return renderShell(
      <div className="space-y-3" data-slot="dvt-substrait-n-input-join-authoring">
        <p className="text-xs text-(--text-muted)">
          {projection.inputs.map((input) => input.table).join(' + ')}
        </p>
        <ul className="space-y-1 text-xs" data-slot="dvt-substrait-n-input-predicates">
          {projection.joins.map((join) => {
            const leftInput = projection.inputs.find((input) =>
              input.fields.some((field) => field.fieldId === join.leftSourceFieldId)
            );
            const rightInput = projection.inputs.find((input) =>
              input.fields.some((field) => field.fieldId === join.rightSourceFieldId)
            );
            const leftField = leftInput?.fields.find(
              (field) => field.fieldId === join.leftSourceFieldId
            );
            const rightField = rightInput?.fields.find(
              (field) => field.fieldId === join.rightSourceFieldId
            );
            return (
              <li key={`${join.leftSourceFieldId}:${join.rightSourceFieldId}`}>
                {leftInput?.table}.{leftField?.name} = {rightInput?.table}.{rightField?.name}
              </li>
            );
          })}
        </ul>
        <dl className="space-y-2 text-xs">
          <div className="space-y-2">
            <dt className="text-(--text-muted)">
              {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
            </dt>
            <dd className="space-y-2">
              {projection.inputs.flatMap((input) =>
                input.fields.map((field) => {
                  const output = projection.outputs.find(
                    (candidate) => candidate.source.fieldId === field.fieldId
                  );
                  const selected = output != null;
                  const outputOrdinal = output?.outputOrdinal ?? -1;
                  const fieldLabel = `${input.table}.${field.name}`;
                  return (
                    <div
                      key={field.fieldId}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[color:var(--border-default)] p-2"
                      data-slot="dvt-substrait-n-input-field"
                      data-source-field-id={field.fieldId}
                    >
                      <input
                        type="checkbox"
                        name="dvt-substrait-n-input-field"
                        value={field.fieldId}
                        aria-label={`${canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}: ${fieldLabel}`}
                        checked={selected}
                        disabled={disabled || (selected && projection.outputs.length === 1)}
                        onChange={(event) =>
                          mutateField({
                            kind: 'set-selected',
                            sourceFieldId: field.fieldId,
                            selected: event.currentTarget.checked,
                          })
                        }
                      />
                      {output == null ? (
                        <span className="text-(--text-muted)">{fieldLabel}</span>
                      ) : (
                        <Input
                          key={`${output.fieldId}:${output.name}`}
                          data-slot="dvt-substrait-n-input-output-name"
                          data-source-field-id={field.fieldId}
                          aria-label={`${canvasViewCopy.inspectorDvtVisualOutputNameLabel}: ${fieldLabel}`}
                          disabled={disabled}
                          value={outputNameDrafts[field.fieldId] ?? output.name}
                          onChange={(event) =>
                            updateOutputNameDraft(field.fieldId, event.currentTarget.value)
                          }
                          aria-invalid={invalidOutputNames.has(field.fieldId) ? 'true' : undefined}
                          aria-describedby={
                            invalidOutputNames.has(field.fieldId)
                              ? outputPolicyErrorIdFor(field.fieldId)
                              : undefined
                          }
                          onBlur={(event) =>
                            renameOutput(field.fieldId, event.currentTarget.value, (outputName) =>
                              mutateField({
                                kind: 'rename',
                                sourceFieldId: field.fieldId,
                                outputName,
                              })
                            )
                          }
                        />
                      )}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          data-action="move-substrait-n-input-field-up"
                          data-source-field-id={field.fieldId}
                          aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldUpLabel}: ${fieldLabel}`}
                          disabled={disabled || !selected || outputOrdinal === 0}
                          onClick={() =>
                            mutateField({
                              kind: 'move',
                              sourceFieldId: field.fieldId,
                              direction: 'up',
                            })
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          data-action="move-substrait-n-input-field-down"
                          data-source-field-id={field.fieldId}
                          aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldDownLabel}: ${fieldLabel}`}
                          disabled={
                            disabled || !selected || outputOrdinal === projection.outputs.length - 1
                          }
                          onClick={() =>
                            mutateField({
                              kind: 'move',
                              sourceFieldId: field.fieldId,
                              direction: 'down',
                            })
                          }
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </dd>
          </div>
        </dl>
        {renderGroupingForm(projection.outputs)}
        {renderAppendInput(projection)}
      </div>
    );
  }

  const inspection = binaryInspection;
  if (!inspection.ok) return null;
  const { projection } = inspection;
  const mutateField = (edit: DvtSubstraitInnerJoinFieldEdit): void => {
    if (edit.kind === 'set-selected' && !edit.selected) {
      const key = 'sourceFieldId' in edit ? edit.sourceFieldId : edit.fieldKey;
      if (key != null) clearOutputNameDraft(key);
    }
    mutateDraft((current) => applyDvtSubstraitInnerJoinFieldEdit(current, edit));
  };

  return renderShell(
    <>
      {renderJoinSummary(projection)}
      <dl className="space-y-2 text-xs">
        <div className="space-y-2">
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
          </dt>
          <dd className="space-y-2">
            {DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS.map((fieldKey) => {
              const output = projection.outputs.find(
                (candidate) => candidate.fieldKey === fieldKey
              );
              const selected = output != null;
              const outputOrdinal = output?.outputOrdinal ?? -1;
              const defaultName = fieldKey.slice(fieldKey.indexOf('.') + 1);
              return (
                <div
                  key={fieldKey}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[color:var(--border-default)] p-2"
                  data-slot="dvt-substrait-inner-join-field"
                  data-field-key={fieldKey}
                >
                  <input
                    type="checkbox"
                    name="dvt-substrait-inner-join-field"
                    value={fieldKey}
                    aria-label={`${canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}: ${defaultName}`}
                    checked={selected}
                    disabled={disabled || (selected && projection.outputs.length === 1)}
                    onChange={(event) =>
                      mutateField({
                        kind: 'set-selected',
                        fieldKey,
                        selected: event.currentTarget.checked,
                      })
                    }
                  />
                  {output == null ? (
                    <span className="text-(--text-muted)">{defaultName}</span>
                  ) : (
                    <Input
                      key={`${output.fieldId}:${output.name}`}
                      data-slot="dvt-substrait-inner-join-output-name"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtVisualOutputNameLabel}: ${defaultName}`}
                      disabled={disabled}
                      value={outputNameDrafts[fieldKey] ?? output.name}
                      onChange={(event) =>
                        updateOutputNameDraft(fieldKey, event.currentTarget.value)
                      }
                      aria-invalid={invalidOutputNames.has(fieldKey) ? 'true' : undefined}
                      aria-describedby={
                        invalidOutputNames.has(fieldKey)
                          ? outputPolicyErrorIdFor(fieldKey)
                          : undefined
                      }
                      onBlur={(event) =>
                        renameOutput(fieldKey, event.currentTarget.value, (outputName) =>
                          mutateField({
                            kind: 'rename',
                            fieldKey,
                            outputName,
                          })
                        )
                      }
                    />
                  )}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-inner-join-field-up"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldUpLabel}: ${defaultName}`}
                      disabled={disabled || !selected || outputOrdinal === 0}
                      onClick={() => mutateField({ kind: 'move', fieldKey, direction: 'up' })}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-inner-join-field-down"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldDownLabel}: ${defaultName}`}
                      disabled={
                        disabled || !selected || outputOrdinal === projection.outputs.length - 1
                      }
                      onClick={() => mutateField({ kind: 'move', fieldKey, direction: 'down' })}
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
      {renderGroupingForm(projection.outputs)}
      {nInputInspection.ok ? renderAppendInput(nInputInspection.projection) : null}
    </>
  );
}
