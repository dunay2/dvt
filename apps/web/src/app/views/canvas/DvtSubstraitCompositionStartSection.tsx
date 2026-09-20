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
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
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
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  predicateSeed?: CanvasRelationalPredicateSeed | null;
  onClearPredicateSeed?: () => void;
  onStartInnerJoin: (draft: DvtSubstraitJoinDraft, operation: CanvasJoinOperation) => void;
  onStartUnionAll?: () => void;
  onStartUnionDistinct?: () => void;
  onStartIntersectDistinct?: () => void;
  onStartExceptDistinct?: () => void;
}>): JSX.Element {
  const [selectedOperation, setSelectedOperation] = useState<CanvasRelationalOperation | null>(
    null
  );
  const availablePredicateSeed =
    predicateSeed != null && isCanvasRelationalPredicateSeedAvailable(inputs, predicateSeed)
      ? predicateSeed
      : null;
  const choices = resolveCanvasRelationalOperationChoices({
    inputs,
    predicateAvailable: availablePredicateSeed != null,
    readOnly: disabled,
    unionAllAvailable: onStartUnionAll != null,
    unionDistinctAvailable: onStartUnionDistinct != null,
    intersectDistinctAvailable: onStartIntersectDistinct != null,
    exceptDistinctAvailable: onStartExceptDistinct != null,
  });

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
  if (selectedOperation === 'union_all' && onStartUnionAll != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        onApply={() => {
          onStartUnionAll();
          onClearPredicateSeed?.();
        }}
        onCancel={() => {
          setSelectedOperation(null);
          onClearPredicateSeed?.();
        }}
      />
    );
  }
  if (selectedOperation === 'union_distinct' && onStartUnionDistinct != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        operation="union_distinct"
        onApply={() => {
          onStartUnionDistinct();
          onClearPredicateSeed?.();
        }}
        onCancel={() => {
          setSelectedOperation(null);
          onClearPredicateSeed?.();
        }}
      />
    );
  }
  if (selectedOperation === 'intersect_distinct' && onStartIntersectDistinct != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        operation="intersect_distinct"
        onApply={() => {
          onStartIntersectDistinct();
          onClearPredicateSeed?.();
        }}
        onCancel={() => {
          setSelectedOperation(null);
          onClearPredicateSeed?.();
        }}
      />
    );
  }
  if (selectedOperation === 'except_distinct' && onStartExceptDistinct != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        operation="except_distinct"
        onApply={() => {
          onStartExceptDistinct();
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
      <DvtRelationalOperationChooser choices={choices} onSelect={setSelectedOperation} />
    </section>
  );
}
