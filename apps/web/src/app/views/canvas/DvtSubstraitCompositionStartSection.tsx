import { sourceOperationFacts } from './canvasSourceOperationFacts';
import { resolveCanvasDvtInitialJoinInputs } from './canvasDvtInitialJoinModel';
/** Owned concern: orchestrate operation selection before canonical relational composition. */
import { useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  resolveCanvasRelationalOperationChoices,
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';
import { DvtSubstraitInnerJoinStartSection } from './DvtSubstraitInnerJoinStartSection';
import {
  DvtRelationCompositionConfirmation,
  type CanvasPredicateFreeOperation,
} from './DvtRelationCompositionConfirmation';
import {
  isCanvasJoinOperation,
  toSubstraitJoinType,
  type CanvasJoinOperation,
} from './canvasRelationalTreeJoinType';

export function DvtSubstraitCompositionStartSection({
  disabled,
  inputs,
  onStartInnerJoin,
  onStartWithoutPredicate = {},
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  onStartInnerJoin: (draft: SubstraitDocument, operation: CanvasJoinOperation) => void;
  onStartWithoutPredicate?: Readonly<Partial<Record<CanvasPredicateFreeOperation, () => void>>>;
}>): JSX.Element {
  const [selectedOperation, setSelectedOperation] = useState<CanvasRelationalOperation | null>(
    null
  );
  const facts = {
    inputs,
    predicateAvailable: false,
    readOnly: disabled,
    unionAllAvailable: onStartWithoutPredicate.union_all != null,
    unionDistinctAvailable: onStartWithoutPredicate.union_distinct != null,
    intersectDistinctAvailable: onStartWithoutPredicate.intersect_distinct != null,
    exceptDistinctAvailable: onStartWithoutPredicate.except_distinct != null,
    intersectAllAvailable: onStartWithoutPredicate.intersect_all != null,
    exceptAllAvailable: onStartWithoutPredicate.except_all != null,
  };
  const choices = resolveCanvasRelationalOperationChoices(sourceOperationFacts(facts));
  const joinChoices = resolveCanvasRelationalOperationChoices(
    sourceOperationFacts({
      ...facts,
      inputs: resolveCanvasDvtInitialJoinInputs(inputs),
    })
  );
  const availableChoices = choices.map((choice, index) => {
    if (isCanvasJoinOperation(choice.operation)) return joinChoices[index]!;
    return onStartWithoutPredicate[choice.operation as CanvasPredicateFreeOperation] == null
      ? { ...choice, selectable: false }
      : choice;
  });

  if (isCanvasJoinOperation(selectedOperation)) {
    return (
      <DvtSubstraitInnerJoinStartSection
        disabled={disabled}
        inputs={inputs}
        joinType={toSubstraitJoinType(selectedOperation)}
        onApply={(selection) => {
          onStartInnerJoin(selection, selectedOperation);
        }}
        onCancel={() => setSelectedOperation(null)}
      />
    );
  }
  if (
    (isCanvasSetOperation(selectedOperation) || selectedOperation === 'cross_join') &&
    onStartWithoutPredicate[selectedOperation] != null
  ) {
    return (
      <DvtRelationCompositionConfirmation
        disabled={disabled}
        inputs={inputs}
        operation={selectedOperation}
        onApply={() => onStartWithoutPredicate[selectedOperation]?.()}
        onCancel={() => setSelectedOperation(null)}
      />
    );
  }

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtRelationalOperationTitle}
      </h3>
      <DvtRelationalOperationChooser choices={availableChoices} onSelect={setSelectedOperation} />
    </section>
  );
}
