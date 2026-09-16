/** Owned concern: author one canonical initial INNER JOIN before explicit Apply. */
import { useMemo, useState } from 'react';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  addDvtSubstraitJoinPredicateCondition,
  createDvtSubstraitStringInnerJoinDraft,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitJoinPredicateCondition,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { canvasViewCopy } from './copy';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';

type InitialJoinSelection = Readonly<{
  targetNodeId: string;
  left: Readonly<{ nodeId: string; fieldName: string }>;
  right: Readonly<{ nodeId: string; fieldName: string }>;
}>;

type JoinPair = Readonly<{
  leftNodeId: string;
  rightNodeId: string;
  leftFieldName: string;
  rightFieldName: string;
}>;

function firstStringField(input: CanvasDvtCompositionInput): string | null {
  return input.fields.find((field) => field.stringCompatible)?.name ?? null;
}

function createInitialPair(
  inputs: readonly CanvasDvtCompositionInput[],
  proposal?: InitialJoinSelection
): JoinPair | null {
  const proposedLeft = inputs.find((input) => input.nodeId === proposal?.left.nodeId);
  const proposedRight = inputs.find((input) => input.nodeId === proposal?.right.nodeId);
  if (
    proposedLeft != null &&
    proposedRight != null &&
    proposedLeft.nodeId !== proposedRight.nodeId &&
    hasSameConnectionRef(
      proposedLeft.sourceRef.connectionRef,
      proposedRight.sourceRef.connectionRef
    ) &&
    proposedLeft.fields.some(
      (field) => field.name === proposal?.left.fieldName && field.stringCompatible
    ) &&
    proposedRight.fields.some(
      (field) => field.name === proposal?.right.fieldName && field.stringCompatible
    )
  ) {
    return {
      leftNodeId: proposedLeft.nodeId,
      rightNodeId: proposedRight.nodeId,
      leftFieldName: proposal.left.fieldName,
      rightFieldName: proposal.right.fieldName,
    };
  }

  for (const left of inputs) {
    const leftFieldName = firstStringField(left);
    if (leftFieldName == null) continue;
    const right = inputs.find(
      (candidate) =>
        candidate.nodeId !== left.nodeId &&
        firstStringField(candidate) != null &&
        hasSameConnectionRef(left.sourceRef.connectionRef, candidate.sourceRef.connectionRef)
    );
    const rightFieldName = right == null ? null : firstStringField(right);
    if (right != null && rightFieldName != null) {
      return { leftNodeId: left.nodeId, rightNodeId: right.nodeId, leftFieldName, rightFieldName };
    }
  }
  return null;
}

function createJoinDraft(
  inputs: readonly CanvasDvtCompositionInput[],
  pair: JoinPair,
  targetNodeId: string
): DvtSubstraitInnerJoinDraft | null {
  const left = inputs.find((input) => input.nodeId === pair.leftNodeId);
  const right = inputs.find((input) => input.nodeId === pair.rightNodeId);
  if (left == null || right == null) return null;
  return createDvtSubstraitStringInnerJoinDraft({
    left: {
      source: left,
      fields: left.fields.filter((field) => field.stringCompatible).map((field) => field.name),
    },
    right: {
      source: right,
      fields: right.fields.filter((field) => field.stringCompatible).map((field) => field.name),
    },
    leftFieldName: pair.leftFieldName,
    rightFieldName: pair.rightFieldName,
    targetNodeId,
  });
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
  initialSelection?: InitialJoinSelection;
  onApply: (draft: DvtSubstraitInnerJoinDraft) => void;
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
  const [pair, setPair] = useState(() => createInitialPair(availableInputs, initialSelection));
  const targetNodeId = initialSelection?.targetNodeId ?? 'pending-inner-join';
  const [draft, setDraft] = useState(() =>
    pair == null ? null : createJoinDraft(availableInputs, pair, targetNodeId)
  );
  if (availableInputs.length < 2 || pair == null || draft == null) return null;

  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) return null;
  const joinRelation = inspection.projection.joinRelations[0];
  const predicate = inspection.projection.joins[0];
  const leftInput = availableInputs.find((input) => input.nodeId === pair.leftNodeId);
  if (joinRelation == null || predicate == null || leftInput == null) return null;
  const rightInputs = availableInputs.filter(
    (input) =>
      input.nodeId !== leftInput.nodeId &&
      hasSameConnectionRef(input.sourceRef.connectionRef, leftInput.sourceRef.connectionRef)
  );

  const replacePair = (nextPair: JoinPair): void => {
    const nextDraft = createJoinDraft(availableInputs, nextPair, targetNodeId);
    if (nextDraft == null) return;
    setPair(nextPair);
    setDraft(nextDraft);
  };

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
      </h3>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtRelationalLeftInput}</span>
        <select
          data-slot="dvt-composition-left-input"
          value={pair.leftNodeId}
          disabled={disabled}
          className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
          onChange={(event) => {
            const nextLeft = availableInputs.find(
              (input) => input.nodeId === event.currentTarget.value
            );
            if (nextLeft == null) return;
            const currentRight = availableInputs.find((input) => input.nodeId === pair.rightNodeId);
            const nextRight =
              currentRight != null &&
              currentRight.nodeId !== nextLeft.nodeId &&
              hasSameConnectionRef(
                currentRight.sourceRef.connectionRef,
                nextLeft.sourceRef.connectionRef
              )
                ? currentRight
                : availableInputs.find(
                    (input) =>
                      input.nodeId !== nextLeft.nodeId &&
                      hasSameConnectionRef(
                        input.sourceRef.connectionRef,
                        nextLeft.sourceRef.connectionRef
                      )
                  );
            const leftFieldName = firstStringField(nextLeft);
            const rightFieldName = nextRight == null ? null : firstStringField(nextRight);
            if (nextRight == null || leftFieldName == null || rightFieldName == null) return;
            replacePair({
              leftNodeId: nextLeft.nodeId,
              rightNodeId: nextRight.nodeId,
              leftFieldName,
              rightFieldName,
            });
          }}
        >
          {availableInputs.map((input) => (
            <option key={input.nodeId} value={input.nodeId}>
              {input.schema}.{input.table}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{canvasViewCopy.inspectorDvtRelationalRightInput}</span>
        <select
          data-slot="dvt-composition-right-input"
          value={pair.rightNodeId}
          disabled={disabled}
          className="h-8 w-full rounded border border-[color:var(--border-default)] bg-transparent px-2 text-xs"
          onChange={(event) => {
            const nextRight = rightInputs.find(
              (input) => input.nodeId === event.currentTarget.value
            );
            const rightFieldName = nextRight == null ? null : firstStringField(nextRight);
            if (nextRight == null || rightFieldName == null) return;
            replacePair({ ...pair, rightNodeId: nextRight.nodeId, rightFieldName });
          }}
        >
          {rightInputs.map((input) => (
            <option key={input.nodeId} value={input.nodeId}>
              {input.schema}.{input.table}
            </option>
          ))}
        </select>
      </label>
      <SemanticWorkbenchJoinConditionEditor
        projection={inspection.projection}
        rightInputIndex={1}
        conditions={predicate.conditions}
        onAdd={(condition, groupWithPrevious) =>
          setDraft((current) =>
            current == null
              ? current
              : addDvtSubstraitJoinPredicateCondition({
                  draft: current,
                  joinRelationId: joinRelation.relationId,
                  condition,
                  groupWithPrevious,
                })
          )
        }
        onUpdate={(conditionKey, condition) =>
          setDraft((current) =>
            current == null
              ? current
              : updateDvtSubstraitJoinPredicateCondition({
                  draft: current,
                  joinRelationId: joinRelation.relationId,
                  conditionKey,
                  condition,
                })
          )
        }
        onRemove={(conditionKey) =>
          setDraft((current) =>
            current == null
              ? current
              : removeDvtSubstraitJoinPredicateCondition({
                  draft: current,
                  joinRelationId: joinRelation.relationId,
                  conditionKey,
                })
          )
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          data-slot="dvt-start-configured-inner-join"
          onClick={() => onApply(draft)}
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
