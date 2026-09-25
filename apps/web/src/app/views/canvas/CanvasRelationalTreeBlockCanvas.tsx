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
import type { SubstraitDocument } from '@dvt/substrait-analysis';

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
  selectedRelationId,
  onSelectRelation,
  onReconcileSelection,
  onRemove,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: SubstraitDocument | null;
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  transformNode: CanonicalNode;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: SubstraitDocument) => void;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation, relationId?: string) => void;
  initiallyExpanded?: boolean;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  onSelectRelation: (relationId: string | null) => void;
  onReconcileSelection: (relationId: string | null) => void;
  onRemove: (relationId: string, keep?: 'left' | 'right') => void;
}>): JSX.Element {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
      <CanvasRelationalTreeOperationShelf
        choices={choices}
        appending={appendInput != null}
        selectedRelationId={selectedRelationId}
        copy={copy}
        operation={operation}
        onSelectOperation={onSelectOperation}
        draft={joinDraft}
        editable
        onChangeDraft={onChangeJoinDraft}
      />
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
          onSelectRelation={onSelectRelation}
          onReconcileSelection={onReconcileSelection}
          onRemove={onRemove}
          onExpandRelation={(relationId) => {
            onSelectRelation(relationId);
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
