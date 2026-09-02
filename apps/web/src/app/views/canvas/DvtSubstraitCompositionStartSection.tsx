/** Owned concern: collect an explicit initial relation predicate for canonical composition. */
import { useMemo, useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasViewCopy } from './copy';

const FIELD_SEPARATOR = '\u001f';

type SelectedField = Readonly<{ nodeId: string; fieldName: string }>;

function fieldValue(selection: SelectedField): string {
  return `${selection.nodeId}${FIELD_SEPARATOR}${selection.fieldName}`;
}

function parseFieldValue(value: string): SelectedField | null {
  const separatorIndex = value.indexOf(FIELD_SEPARATOR);
  return separatorIndex <= 0
    ? null
    : {
        nodeId: value.slice(0, separatorIndex),
        fieldName: value.slice(separatorIndex + FIELD_SEPARATOR.length),
      };
}

function firstField(
  inputs: readonly CanvasDvtCompositionInput[],
  excludedNodeId?: string,
  connectionId?: string
): SelectedField | null {
  for (const input of inputs) {
    if (
      input.nodeId === excludedNodeId ||
      (connectionId != null && input.sourceRef.connectionRef.connectionId !== connectionId)
    ) {
      continue;
    }
    const field = input.fields.find((candidate) => candidate.stringCompatible);
    if (field != null) return { nodeId: input.nodeId, fieldName: field.name };
  }
  return null;
}

export function DvtSubstraitCompositionStartSection({
  disabled,
  inputs,
  onStartInnerJoin,
  onStartUnionAll,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  onStartInnerJoin: (selection: Readonly<{ left: SelectedField; right: SelectedField }>) => void;
  onStartUnionAll?: () => void;
}>): JSX.Element | null {
  const initialLeft = useMemo(() => firstField(inputs), [inputs]);
  const initialLeftInput = inputs.find((input) => input.nodeId === initialLeft?.nodeId);
  const initialRight = useMemo(
    () =>
      firstField(
        inputs,
        initialLeft?.nodeId,
        initialLeftInput?.sourceRef.connectionRef.connectionId
      ),
    [initialLeft?.nodeId, initialLeftInput?.sourceRef.connectionRef.connectionId, inputs]
  );
  const [left, setLeft] = useState(initialLeft);
  const [right, setRight] = useState(initialRight);
  const availableInputs = inputs.filter((input) =>
    input.fields.some((field) => field.stringCompatible)
  );
  if (availableInputs.length < 2 || left == null || right == null) return null;

  const selectField = (
    selectableInputs: readonly CanvasDvtCompositionInput[],
    selected: SelectedField,
    onSelect: (selection: SelectedField) => void,
    slot: string
  ): JSX.Element => (
    <select
      data-slot={slot}
      value={fieldValue(selected)}
      disabled={disabled}
      className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
      onChange={(event) => {
        const next = parseFieldValue(event.currentTarget.value);
        if (next != null) onSelect(next);
      }}
    >
      {selectableInputs.map((input) => (
        <optgroup key={input.nodeId} label={`${input.schema}.${input.table}`}>
          {input.fields
            .filter((field) => field.stringCompatible)
            .map((field) => (
              <option
                key={fieldValue({ nodeId: input.nodeId, fieldName: field.name })}
                value={fieldValue({ nodeId: input.nodeId, fieldName: field.name })}
              >
                {field.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );

  const leftInput = availableInputs.find((input) => input.nodeId === left.nodeId);
  const rightInputs = availableInputs.filter(
    (input) =>
      input.nodeId !== left.nodeId &&
      input.sourceRef.connectionRef.connectionId === leftInput?.sourceRef.connectionRef.connectionId
  );

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
      </h3>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtSubstraitExistingFieldLabel}</span>
        {selectField(
          availableInputs,
          left,
          (nextLeft) => {
            setLeft(nextLeft);
            const nextLeftInput = inputs.find((input) => input.nodeId === nextLeft.nodeId);
            const currentRightInput = inputs.find((input) => input.nodeId === right.nodeId);
            if (
              nextLeft.nodeId === right.nodeId ||
              currentRightInput?.sourceRef.connectionRef.connectionId !==
                nextLeftInput?.sourceRef.connectionRef.connectionId
            ) {
              setRight(
                firstField(
                  inputs,
                  nextLeft.nodeId,
                  nextLeftInput?.sourceRef.connectionRef.connectionId
                )
              );
            }
          },
          'dvt-composition-left-field'
        )}
      </label>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtSubstraitConnectedFieldLabel}</span>
        {selectField(rightInputs, right, setRight, 'dvt-composition-right-field')}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || left.nodeId === right.nodeId}
          data-slot="dvt-start-configured-inner-join"
          onClick={() => onStartInnerJoin({ left, right })}
        >
          {canvasViewCopy.inspectorDvtSubstraitInnerJoinAction}
        </Button>
        {onStartUnionAll == null ? null : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            data-slot="dvt-start-connected-union-all"
            onClick={onStartUnionAll}
          >
            {canvasViewCopy.inspectorDvtSubstraitUnionAllAction}
          </Button>
        )}
      </div>
    </section>
  );
}
