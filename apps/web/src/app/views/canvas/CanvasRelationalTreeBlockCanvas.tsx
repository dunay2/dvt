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
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeOperatorTools } from './CanvasRelationalTreeOperatorTools';

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
  onChangeJoinDraft,
  onPlaceInput,
  onSelectInput,
  onSelectOperation,
  initiallyExpanded = false,
  onPendingConditionChange,
  initialRelationId = null,
  onRemove,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: DvtSubstraitJoinDraft | null;
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  transformNode: CanonicalNode;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: DvtSubstraitJoinDraft) => void;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
  initiallyExpanded?: boolean;
  onPendingConditionChange?: (pending: boolean) => void;
  initialRelationId?: string | null;
  onRemove: (relationId: string, keep?: 'left' | 'right') => void;
}>): JSX.Element {
  const hasOperands = selectedInputIds.length > 0;
  const [selectedRelationId, setSelectedRelationId] = useState(initialRelationId);
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="flex min-h-0 min-w-0 flex-col overflow-hidden"
    >
      {
        <CanvasRelationalTreeOperationShelf
          choices={choices}
          copy={copy}
          hasOperands={hasOperands}
          operation={operation}
          selectedInputCount={selectedInputIds.length}
          onSelectOperation={onSelectOperation}
        >
          <CanvasRelationalTreeOperatorTools
            draft={joinDraft}
            editable
            onChange={onChangeJoinDraft}
          />
        </CanvasRelationalTreeOperationShelf>
      }
      <div className="canvas-operation-workspace relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
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
          onRemove={onRemove}
          onExpandRelation={(relationId) => {
            setSelectedRelationId(relationId);
            setExpanded(true);
          }}
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
          transformNode={transformNode}
          expanded={expanded}
          onClose={() => setExpanded(false)}
        />
      </div>
    </section>
  );
}
