/** Owned concern: author one canonical initial INNER JOIN before explicit Apply. */
import { useMemo, useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  createCanvasDvtInitialJoinDraft,
  resolveCanvasDvtInitialJoinInputs,
  resolveCanvasDvtInitialJoinPair,
  resolveCanvasDvtInitialJoinPairForInputs,
  resolveCanvasDvtInitialJoinRightInputs,
  type CanvasDvtInitialJoinPair,
  type CanvasDvtInitialJoinSelection,
} from './canvasDvtInitialJoinModel';
import {
  addDvtSubstraitJoinPredicateCondition,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitJoinPredicateCondition,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { canvasViewCopy } from './copy';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';

const sourceSelectClassName =
  'h-8 w-full rounded border border-[color:var(--border-default)] bg-slate-950 px-2 text-xs text-slate-100 [&>option]:bg-slate-950 [&>option]:text-slate-100';

export function DvtSubstraitInnerJoinStartSection({
  disabled,
  inputs,
  initialSelection,
  onApply,
  onCancel,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  initialSelection?: CanvasDvtInitialJoinSelection;
  onApply: (draft: DvtSubstraitInnerJoinDraft) => void;
  onCancel: () => void;
}>): JSX.Element | null {
  const availableInputs = useMemo(() => resolveCanvasDvtInitialJoinInputs(inputs), [inputs]);
  const initialPair = useMemo(
    () => resolveCanvasDvtInitialJoinPair(availableInputs, initialSelection),
    [availableInputs, initialSelection]
  );
  const [selectedInputs, setSelectedInputs] = useState(() => ({
    leftNodeId: initialPair?.leftNodeId ?? '',
    rightNodeId: initialPair?.rightNodeId ?? '',
  }));
  const targetNodeId = initialSelection?.targetNodeId ?? 'pending-inner-join';
  const [draft, setDraft] = useState(() =>
    initialPair == null
      ? null
      : createCanvasDvtInitialJoinDraft(availableInputs, initialPair, targetNodeId)
  );
  if (availableInputs.length < 2) return null;

  const inspection = draft == null ? null : inspectDvtSubstraitNInputJoinDraft(draft);
  const joinRelation = inspection?.ok ? inspection.projection.joinRelations[0] : undefined;
  const predicate = inspection?.ok ? inspection.projection.joins[0] : undefined;
  const leftInput = availableInputs.find((input) => input.nodeId === selectedInputs.leftNodeId);
  const rightInputs =
    leftInput == null ? [] : resolveCanvasDvtInitialJoinRightInputs(availableInputs, leftInput);

  const replacePair = (nextPair: CanvasDvtInitialJoinPair | null): void => {
    const nextDraft =
      nextPair == null
        ? null
        : createCanvasDvtInitialJoinDraft(availableInputs, nextPair, targetNodeId);
    setSelectedInputs({
      leftNodeId: nextPair?.leftNodeId ?? selectedInputs.leftNodeId,
      rightNodeId: nextPair?.rightNodeId ?? '',
    });
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
          value={selectedInputs.leftNodeId}
          disabled={disabled}
          className={sourceSelectClassName}
          onChange={(event) => {
            const nextLeft = availableInputs.find(
              (input) => input.nodeId === event.currentTarget.value
            );
            if (nextLeft == null) return;
            const currentRight = availableInputs.find(
              (input) => input.nodeId === selectedInputs.rightNodeId
            );
            const nextPair =
              currentRight == null
                ? null
                : resolveCanvasDvtInitialJoinPairForInputs(nextLeft, currentRight);
            setSelectedInputs({
              leftNodeId: nextLeft.nodeId,
              rightNodeId: nextPair?.rightNodeId ?? '',
            });
            setDraft(
              nextPair == null
                ? null
                : createCanvasDvtInitialJoinDraft(availableInputs, nextPair, targetNodeId)
            );
          }}
        >
          <option value="" disabled>
            —
          </option>
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
          value={selectedInputs.rightNodeId}
          disabled={disabled || leftInput == null}
          className={sourceSelectClassName}
          onChange={(event) => {
            const nextRight = rightInputs.find(
              (input) => input.nodeId === event.currentTarget.value
            );
            const nextPair =
              nextRight == null
                ? null
                : leftInput == null
                  ? null
                  : resolveCanvasDvtInitialJoinPairForInputs(leftInput, nextRight);
            replacePair(nextPair);
          }}
        >
          <option value="" disabled>
            —
          </option>
          {rightInputs.map((input) => (
            <option key={input.nodeId} value={input.nodeId}>
              {input.schema}.{input.table}
            </option>
          ))}
        </select>
      </label>
      {inspection?.ok && joinRelation != null && predicate != null ? (
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
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || draft == null}
          data-slot="dvt-start-configured-inner-join"
          onClick={() => {
            if (draft != null) onApply(draft);
          }}
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
