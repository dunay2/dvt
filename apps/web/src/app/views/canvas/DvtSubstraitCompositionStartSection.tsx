/** Owned concern: orchestrate operation selection before canonical relational composition. */
import { useState } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
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
  onStartInnerJoin,
  onStartUnionAll,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  onStartInnerJoin: (selection: DvtSubstraitJoinFieldSelection) => void;
  onStartUnionAll?: () => void;
}>): JSX.Element {
  const [selectedOperation, setSelectedOperation] = useState<CanvasRelationalOperation | null>(
    null
  );
  const choices = resolveCanvasRelationalOperationChoices({
    inputs,
    readOnly: disabled,
    unionAllAvailable: onStartUnionAll != null,
  });

  if (selectedOperation === 'inner_join') {
    return (
      <DvtSubstraitInnerJoinStartSection
        disabled={disabled}
        inputs={inputs}
        onApply={onStartInnerJoin}
        onCancel={() => setSelectedOperation(null)}
      />
    );
  }
  if (selectedOperation === 'union_all' && onStartUnionAll != null) {
    return (
      <DvtSubstraitUnionAllStartSection
        disabled={disabled}
        inputs={inputs}
        onApply={onStartUnionAll}
        onCancel={() => setSelectedOperation(null)}
      />
    );
  }

  return (
    <section className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtRelationalOperationTitle}
      </h3>
      <DvtRelationalOperationChooser choices={choices} onSelect={setSelectedOperation} />
    </section>
  );
}
