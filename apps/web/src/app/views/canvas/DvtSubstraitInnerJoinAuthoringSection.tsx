/** Owned concern: edit the admitted two-source Substrait INNER JOIN in Node Properties. */
import type { Dispatch, ReactNode, SetStateAction } from 'react';

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
import { canvasViewCopy } from './copy';

export function DvtSubstraitInnerJoinAuthoringSection({
  disabled,
  draft,
  appendCandidates,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  appendCandidates: readonly DvtSubstraitJoinInput[];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const semanticDraft = { plan: draft.plan, sidecar: draft.sidecar };
  const mutateDraft = (
    transform: (current: DvtSubstraitInnerJoinDraft) => DvtSubstraitInnerJoinDraft
  ): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'sql_transform' ||
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
      {content}
    </div>
  );
  const renderJoinSummary = (projection: {
    left: { table: string };
    right: { table: string };
    leftKey: string;
    rightKey: string;
  }): JSX.Element => (
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
      const existingOutputNames = new Set(projection.outputs.map((output) => output.name));
      const selectedFields = candidate.fields.filter(
        (field) => field !== rightFieldName && !existingOutputNames.has(field)
      );
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
            defaultValue={projection.result.name}
            onBlur={(event) =>
              mutateDraft((current) =>
                renameDvtSubstraitInnerJoinGroupedRowNumberOutput(
                  current,
                  event.currentTarget.value
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
      if (typeof outputName !== 'string' || outputName.trim().length === 0) return;
      mutateDraft((current) => applyDvtSubstraitInnerJoinGroupedRowNumber(current, { outputName }));
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
          defaultValue={projection.measure.name}
          onBlur={(event) =>
            mutateDraft((current) =>
              renameDvtSubstraitInnerJoinCountOutput(current, event.currentTarget.value)
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
            defaultValue="group_rank"
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

  if (nInputInspection.ok && nInputInspection.projection.inputs.length > 2) {
    const projection = nInputInspection.projection;
    const mutateField = (edit: DvtSubstraitInnerJoinFieldEdit): void => {
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
                          defaultValue={output.name}
                          onBlur={(event) =>
                            mutateField({
                              kind: 'rename',
                              sourceFieldId: field.fieldId,
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
        {renderAppendInput(projection)}
      </div>
    );
  }

  const inspection = inspectDvtSubstraitInnerJoinDraft(semanticDraft);
  if (!inspection.ok) return null;
  const { projection } = inspection;
  const mutateField = (edit: DvtSubstraitInnerJoinFieldEdit): void => {
    mutateDraft((current) => applyDvtSubstraitInnerJoinFieldEdit(current, edit));
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
      applyDvtSubstraitInnerJoinGrouping(current, { groupFieldId, countOutputName })
    );
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
                      defaultValue={output.name}
                      onBlur={(event) =>
                        mutateField({
                          kind: 'rename',
                          fieldKey,
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
          defaultValue={projection.outputs[0]?.fieldId}
          className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
        >
          {projection.outputs.map((output) => (
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
          defaultValue="row_count"
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
      {nInputInspection.ok ? renderAppendInput(nInputInspection.projection) : null}
    </>
  );
}
