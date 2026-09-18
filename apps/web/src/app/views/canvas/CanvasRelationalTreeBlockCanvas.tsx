/** Owned concern: compose the scalable relational draft viewport, toolbox and inline editor. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { useState } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { CanvasRelationalTreeDraftViewport } from './CanvasRelationalTreeDraftViewport';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import type { CanvasRelationalOperandPosition } from './CanvasRelationalTreeOperandSlot';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function CanvasRelationalTreeBlockCanvas({
  appendInput,
  choices,
  copy,
  edges,
  inputs,
  joinDraft,
  nodes,
  operation,
  primaryInputId,
  secondaryInputId,
  selectedInputIds,
  transformNode,
  onAppendJoinInput,
  onApply,
  onCancel,
  onChangeJoinDraft,
  onPlaceInput,
  onSelectInput,
  onSelectOperation,
  pendingCondition = false,
  onPendingConditionChange,
  initialRelationId = null,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  transformNode: CanonicalNode;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onApply: () => void;
  onCancel: () => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
  pendingCondition?: boolean;
  onPendingConditionChange?: (pending: boolean) => void;
  initialRelationId?: string | null;
}>): JSX.Element {
  const hasOperands = selectedInputIds.length > 0;
  const [selectedRelationId, setSelectedRelationId] = useState(initialRelationId);
  const ready =
    !pendingCondition &&
    appendInput == null &&
    ((operation === 'projection' && selectedInputIds.length === 1) ||
      (operation === 'inner_join' && joinDraft != null) ||
      (operation === 'union_all' && selectedInputIds.length >= 2));

  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="flex min-h-0 min-w-0 flex-col overflow-hidden"
    >
      <CanvasRelationalTreeOperationShelf
        choices={choices}
        copy={copy}
        hasOperands={hasOperands}
        operation={operation}
        ready={ready}
        selectedInputCount={selectedInputIds.length}
        onApply={onApply}
        onCancel={onCancel}
        onSelectOperation={onSelectOperation}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <CanvasRelationalTreeDraftViewport
          copy={copy}
          edges={edges}
          inputs={inputs}
          joinDraft={joinDraft}
          nodes={nodes}
          operation={operation}
          primaryInputId={primaryInputId}
          secondaryInputId={secondaryInputId}
          selectedInputIds={selectedInputIds}
          transformNode={transformNode}
          onPlaceInput={onPlaceInput}
          onSelectInput={onSelectInput}
          onSelectOperation={onSelectOperation}
          selectedRelationId={selectedRelationId}
          onSelectRelation={setSelectedRelationId}
        />
        <CanvasRelationalTreeInlineEditor
          appendInput={appendInput}
          copy={copy}
          joinDraft={joinDraft}
          operation={operation}
          onAppendJoinInput={onAppendJoinInput}
          onChangeJoinDraft={onChangeJoinDraft}
          onPendingConditionChange={onPendingConditionChange}
          selectedRelationId={selectedRelationId}
        />
      </div>
    </section>
  );
}
