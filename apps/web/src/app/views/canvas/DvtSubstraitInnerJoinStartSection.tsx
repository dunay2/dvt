/** Owned concern: collect one explicit initial INNER JOIN predicate. */
import { useMemo, useState } from 'react';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasViewCopy } from './copy';

const FIELD_SEPARATOR = '\u001f';

type SelectedField = Readonly<{ nodeId: string; fieldName: string }>;

export type DvtSubstraitJoinFieldSelection = Readonly<{
  left: SelectedField;
  right: SelectedField;
}>;

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
  connectionRef?: ConnectedSourceRef['connectionRef']
): SelectedField | null {
  for (const input of inputs) {
    if (
      input.nodeId === excludedNodeId ||
      (connectionRef != null && !hasSameConnectionRef(input.sourceRef.connectionRef, connectionRef))
    ) {
      continue;
    }
    const field = input.fields.find((candidate) => candidate.stringCompatible);
    if (field != null) return { nodeId: input.nodeId, fieldName: field.name };
  }
  return null;
}

export function DvtSubstraitInnerJoinStartSection({
  disabled,
  inputs,
  initialSelection,
  onApply,
  onCancel,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  initialSelection?: DvtSubstraitJoinFieldSelection;
  onApply: (selection: DvtSubstraitJoinFieldSelection) => void;
  onCancel: () => void;
}>): JSX.Element | null {
  const availableInputs = useMemo(
    () =>
      inputs.filter(
        (input) =>
          input.sourceRef.connectionRef.provider === 'postgres' &&
          input.fields.some((field) => field.stringCompatible) &&
          inputs.some(
            (candidate) =>
              candidate.nodeId !== input.nodeId &&
              candidate.fields.some((field) => field.stringCompatible) &&
              hasSameConnectionRef(input.sourceRef.connectionRef, candidate.sourceRef.connectionRef)
          )
      ),
    [inputs]
  );
  const proposedLeft = initialSelection?.left;
  const proposedRight = initialSelection?.right;
  const admittedProposal = useMemo(() => {
    if (
      proposedLeft == null ||
      proposedRight == null ||
      proposedLeft.nodeId === proposedRight.nodeId
    ) {
      return null;
    }
    const leftInput = availableInputs.find((input) => input.nodeId === proposedLeft.nodeId);
    const rightInput = availableInputs.find((input) => input.nodeId === proposedRight.nodeId);
    if (
      leftInput == null ||
      rightInput == null ||
      !leftInput.fields.some(
        (field) => field.name === proposedLeft.fieldName && field.stringCompatible
      ) ||
      !rightInput.fields.some(
        (field) => field.name === proposedRight.fieldName && field.stringCompatible
      ) ||
      !hasSameConnectionRef(leftInput.sourceRef.connectionRef, rightInput.sourceRef.connectionRef)
    ) {
      return null;
    }
    return { left: proposedLeft, right: proposedRight };
  }, [availableInputs, proposedLeft, proposedRight]);
  const initialLeft = useMemo(
    () => admittedProposal?.left ?? firstField(availableInputs),
    [admittedProposal, availableInputs]
  );
  const initialLeftInput = availableInputs.find((input) => input.nodeId === initialLeft?.nodeId);
  const initialRight = useMemo(
    () =>
      admittedProposal?.right ??
      firstField(availableInputs, initialLeft?.nodeId, initialLeftInput?.sourceRef.connectionRef),
    [
      admittedProposal,
      availableInputs,
      initialLeft?.nodeId,
      initialLeftInput?.sourceRef.connectionRef,
    ]
  );
  const [left, setLeft] = useState(initialLeft);
  const [right, setRight] = useState(initialRight);
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
      leftInput != null &&
      hasSameConnectionRef(input.sourceRef.connectionRef, leftInput.sourceRef.connectionRef)
  );

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
      </h3>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtRelationalLeftOperandField}</span>
        {selectField(
          availableInputs,
          left,
          (nextLeft) => {
            setLeft(nextLeft);
            const nextLeftInput = availableInputs.find((input) => input.nodeId === nextLeft.nodeId);
            const currentRightInput = availableInputs.find(
              (input) => input.nodeId === right.nodeId
            );
            if (
              nextLeft.nodeId === right.nodeId ||
              nextLeftInput == null ||
              currentRightInput == null ||
              !hasSameConnectionRef(
                currentRightInput.sourceRef.connectionRef,
                nextLeftInput.sourceRef.connectionRef
              )
            ) {
              setRight(
                firstField(availableInputs, nextLeft.nodeId, nextLeftInput?.sourceRef.connectionRef)
              );
            }
          },
          'dvt-composition-left-field'
        )}
      </label>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtRelationalRightOperandField}</span>
        {selectField(rightInputs, right, setRight, 'dvt-composition-right-field')}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || left.nodeId === right.nodeId}
          data-slot="dvt-start-configured-inner-join"
          onClick={() => onApply({ left, right })}
        >
          {canvasViewCopy.inspectorDvtRelationalApply}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="dvt-cancel-relational-operation"
          onClick={onCancel}
        >
          {canvasViewCopy.inspectorDvtRelationalCancel}
        </Button>
      </div>
    </section>
  );
}
