/** Owned concern: orchestrate operation selection before canonical relational composition. */
import { useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';
import {
  resolveCanvasRelationalOperationChoices,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';
import {
  DvtSubstraitInnerJoinStartSection,
  type DvtSubstraitJoinFieldSelection,
} from './DvtSubstraitInnerJoinStartSection';
import { DvtSubstraitUnionAllStartSection } from './DvtSubstraitUnionAllStartSection';

export function DvtSubstraitCompositionStartSection({
  disabled,
  inputs,
  predicateSeed,
  onClearPredicateSeed,
  onStartInnerJoin,
  onStartUnionAll,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  predicateSeed?: CanvasRelationalPredicateSeed | null;
  onClearPredicateSeed?: () => void;
  onStartInnerJoin: (selection: DvtSubstraitJoinFieldSelection) => void;
  onStartUnionAll?: () => void;
}>): JSX.Element {
  const [selectedOperation, setSelectedOperation] = useState<CanvasRelationalOperation | null>(
    null
  );
  const choices = resolveCanvasRelationalOperationChoices({
    inputs,
    predicateAvailable: predicateSeed != null,
    readOnly: disabled,
    unionAllAvailable: onStartUnionAll != null,
  });

  if (selectedOperation === 'inner_join') {
    return (
      <DvtSubstraitInnerJoinStartSection
        key={
          predicateSeed == null
            ? 'manual'
            : `${predicateSeed.left.nodeId}:${predicateSeed.left.fieldId}:${predicateSeed.right.nodeId}:${predicateSeed.right.fieldId}`
        }
        disabled={disabled}
        inputs={inputs}
        initialSelection={predicateSeed ?? undefined}
        onApply={(selection) => {
          onStartInnerJoin(selection);
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

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtRelationalOperationTitle}
      </h3>
      {predicateSeed != null ? (
        <p
          data-slot="dvt-relational-predicate-proposal"
          className="rounded border border-[color:var(--border-default)] px-2 py-1.5 font-mono text-xs text-(--text-default)"
        >
          {predicateSeed.left.nodeId}.{predicateSeed.left.fieldName} = {predicateSeed.right.nodeId}.
          {predicateSeed.right.fieldName}
        </p>
      ) : null}
      <DvtRelationalOperationChooser choices={choices} onSelect={setSelectedOperation} />
    </section>
  );
}
