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
  const [pair, setPair] = useState(() =>
    resolveCanvasDvtInitialJoinPair(availableInputs, initialSelection)
  );
  const targetNodeId = initialSelection?.targetNodeId ?? 'pending-inner-join';
  const [draft, setDraft] = useState(() =>
    pair == null ? null : createCanvasDvtInitialJoinDraft(availableInputs, pair, targetNodeId)
  );
  if (availableInputs.length < 2 || pair == null || draft == null) return null;

  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) return null;
  const joinRelation = inspection.projection.joinRelations[0];
  const predicate = inspection.projection.joins[0];
  const leftInput = availableInputs.find((input) => input.nodeId === pair.leftNodeId);
  if (joinRelation == null || predicate == null || leftInput == null) return null;
  const rightInputs = resolveCanvasDvtInitialJoinRightInputs(availableInputs, leftInput);

  const replacePair = (nextPair: CanvasDvtInitialJoinPair): void => {
    const nextDraft = createCanvasDvtInitialJoinDraft(availableInputs, nextPair, targetNodeId);
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
            const nextPair =
              currentRight == null
                ? null
                : resolveCanvasDvtInitialJoinPairForInputs(nextLeft, currentRight);
            const fallbackRight = resolveCanvasDvtInitialJoinRightInputs(
              availableInputs,
              nextLeft
            )[0];
            const fallbackPair =
              fallbackRight == null
                ? null
                : resolveCanvasDvtInitialJoinPairForInputs(nextLeft, fallbackRight);
            if (nextPair != null) replacePair(nextPair);
            else if (fallbackPair != null) replacePair(fallbackPair);
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
            const nextPair =
              nextRight == null
                ? null
                : resolveCanvasDvtInitialJoinPairForInputs(leftInput, nextRight);
            if (nextPair != null) replacePair(nextPair);
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
