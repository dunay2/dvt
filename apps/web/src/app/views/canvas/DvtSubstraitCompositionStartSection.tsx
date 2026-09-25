import { sourceOperationFacts } from './canvasSourceOperationFacts';
import { resolveCanvasDvtInitialJoinInputs } from './canvasDvtInitialJoinModel';
/** Owned concern: orchestrate operation selection before canonical relational composition. */
import { useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  isCanvasRelationalPredicateSeedAvailable,
  type CanvasRelationalPredicateSeed,
} from './canvasRelationalPredicateSeed';
import {
  resolveCanvasRelationalOperationChoices,
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';
import { DvtSubstraitInnerJoinStartSection } from './DvtSubstraitInnerJoinStartSection';
import { DvtSubstraitUnionAllStartSection } from './DvtSubstraitUnionAllStartSection';
import {
  isCanvasJoinOperation,
  toSubstraitJoinType,
  type CanvasJoinOperation,
} from './canvasRelationalTreeJoinType';

export function DvtSubstraitCompositionStartSection({
  disabled,
  inputs,
  predicateSeed,
  onClearPredicateSeed,
  onStartInnerJoin,
  onStartUnionAll,
  onStartUnionDistinct,
  onStartIntersectDistinct,
  onStartExceptDistinct,
  onStartIntersectAll,
  onStartExceptAll,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  predicateSeed?: CanvasRelationalPredicateSeed | null;
  onClearPredicateSeed?: () => void;
  onStartInnerJoin: (draft: SubstraitDocument, operation: CanvasJoinOperation) => void;
  onStartUnionAll?: () => void;
  onStartUnionDistinct?: () => void;
  onStartIntersectDistinct?: () => void;
  onStartExceptDistinct?: () => void;
  onStartIntersectAll?: () => void;
  onStartExceptAll?: () => void;
}>): JSX.Element {
  const [selectedOperation, setSelectedOperation] = useState<CanvasRelationalOperation | null>(
    null
  );
  const availablePredicateSeed =
    predicateSeed != null && isCanvasRelationalPredicateSeedAvailable(inputs, predicateSeed)
      ? predicateSeed
      : null;
  const facts = {
    inputs,
    predicateAvailable: availablePredicateSeed != null,
    readOnly: disabled,
    unionAllAvailable: onStartUnionAll != null,
    unionDistinctAvailable: onStartUnionDistinct != null,
    intersectDistinctAvailable: onStartIntersectDistinct != null,
    exceptDistinctAvailable: onStartExceptDistinct != null,
    intersectAllAvailable: onStartIntersectAll != null,
    exceptAllAvailable: onStartExceptAll != null,
  };
  const choices = resolveCanvasRelationalOperationChoices(sourceOperationFacts(facts));
  const joinChoices = resolveCanvasRelationalOperationChoices(
    sourceOperationFacts({
      ...facts,
      inputs: resolveCanvasDvtInitialJoinInputs(inputs),
    })
  );
  const availableChoices = choices.map((choice, index) =>
    isCanvasJoinOperation(choice.operation) ? joinChoices[index]! : choice
  );

  if (isCanvasJoinOperation(selectedOperation)) {
    return (
      <DvtSubstraitInnerJoinStartSection
        key={
          availablePredicateSeed == null
            ? 'manual'
            : `${availablePredicateSeed.left.nodeId}:${availablePredicateSeed.left.fieldId}:${availablePredicateSeed.right.nodeId}:${availablePredicateSeed.right.fieldId}`
        }
        disabled={disabled}
        inputs={inputs}
        joinType={toSubstraitJoinType(selectedOperation)}
        initialSelection={availablePredicateSeed ?? undefined}
        onApply={(selection) => {
          onStartInnerJoin(selection, selectedOperation);
          onClearPredicateSeed?.();
        }}
        onCancel={() => {
          setSelectedOperation(null);
          onClearPredicateSeed?.();
        }}
      />
    );
  }
  const startSet = {
    union_all: onStartUnionAll,
    union_distinct: onStartUnionDistinct,
    intersect_distinct: onStartIntersectDistinct,
    except_distinct: onStartExceptDistinct,
    intersect_all: onStartIntersectAll,
    except_all: onStartExceptAll,
  };
  if (isCanvasSetOperation(selectedOperation) && startSet[selectedOperation] != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        operation={selectedOperation}
        onApply={() => {
          startSet[selectedOperation]?.();
          onClearPredicateSeed?.();
        }}
        onCancel={() => {
          setSelectedOperation(null);
          onClearPredicateSeed?.();
        }}
      />
    );
  }

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtRelationalOperationTitle}
      </h3>
      {availablePredicateSeed != null ? (
        <p
          data-slot="dvt-relational-predicate-proposal"
          className="rounded border border-[color:var(--border-default)] px-2 py-1.5 font-mono text-xs text-(--text-default)"
        >
          {availablePredicateSeed.left.nodeId}.{availablePredicateSeed.left.fieldName} ={' '}
          {availablePredicateSeed.right.nodeId}.{availablePredicateSeed.right.fieldName}
        </p>
      ) : null}
      <DvtRelationalOperationChooser choices={availableChoices} onSelect={setSelectedOperation} />
    </section>
  );
}
