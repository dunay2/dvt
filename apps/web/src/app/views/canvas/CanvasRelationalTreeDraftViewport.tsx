/** Owned concern: render and accept drops on one scalable canonical relational draft graph. */
import { useMemo, type ComponentProps } from 'react';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { RelationalViewportSurface } from './relational-layout/RelationalViewportSurface';
import { CanvasRelationalTreeOperandCanvas } from './CanvasRelationalTreeOperandCanvas';
import { useCanvasRelationalDraftProjection } from './useCanvasRelationalDraftProjection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  readCanvasRelationalOperationDrag,
  readCanvasRelationalSourceDrag,
} from './canvasRelationalTreeDrag';
import type { CanvasRelationalOperandPosition } from './CanvasRelationalTreeOperandSlot';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

function DraftViewport({
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
  onPlaceInput,
  onSelectInput,
  onSelectOperation,
  selectedRelationId,
  onSelectRelation,
  onReconcileSelection,
  onExpandRelation,
  onRemove,
}: Readonly<{
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
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation, relationId?: string) => void;
  selectedRelationId: string | null;
  onSelectRelation: (relationId: string | null) => void;
  onReconcileSelection: (relationId: string | null) => void;
  onExpandRelation: (relationId: string | null) => void;
  onRemove: (relationId: string, keep?: 'left' | 'right') => void;
}>): JSX.Element {
  const inputById = useMemo(
    () => new Map(inputs.map((input) => [input.nodeId, input] as const)),
    [inputs]
  );
  const {
    projection: draftProjection,
    selectedLocator,
    relationIdFor,
  } = useCanvasRelationalDraftProjection(
    { edges, joinDraft, nodes, operation, transformNode },
    selectedRelationId,
    onReconcileSelection
  );
  const viewport = useCanvasRelationalTreeViewport(
    `${draftProjection?.root.locator ?? ''}:${selectedInputIds.join(',')}:${operation}`
  );

  const placeDroppedSource = (nodeId: string): void => {
    if (selectedInputIds.includes(nodeId)) return;
    if (primaryInputId == null) onPlaceInput(nodeId, 'primary');
    else if (secondaryInputId == null && operation == null) onPlaceInput(nodeId, 'secondary');
    else onSelectInput(nodeId);
  };

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <RelationalViewportSurface
        viewport={viewport}
        draft
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const droppedOperation = readCanvasRelationalOperationDrag(event.dataTransfer);
          if (droppedOperation != null)
            return onSelectOperation(droppedOperation, selectedRelationId ?? undefined);
          const nodeId = readCanvasRelationalSourceDrag(event.dataTransfer);
          if (nodeId != null) placeDroppedSource(nodeId);
        }}
      >
        {draftProjection == null ? (
          <CanvasRelationalTreeOperandCanvas
            copy={copy}
            primaryInput={primaryInputId == null ? null : (inputById.get(primaryInputId) ?? null)}
            secondaryInput={
              secondaryInputId == null ? null : (inputById.get(secondaryInputId) ?? null)
            }
            onPlaceInput={onPlaceInput}
          />
        ) : (
          <div
            ref={viewport.contentRef}
            data-slot="canvas-relational-tree-draft"
            className="w-max"
            style={{ zoom: viewport.zoom }}
          >
            <CanvasRelationalTreeLayout
              outputName={transformNode.name}
              root={draftProjection.root}
              selectedLocator={selectedLocator}
              copy={copy}
              zoom={viewport.zoom}
              panMode={viewport.panMode || viewport.panning}
              onManualLayout={viewport.stopAutoFit}
              semanticContext={{ transformNode, draft: joinDraft ?? undefined }}
              onExpand={(locator) => onExpandRelation(relationIdFor(locator))}
              onRemove={onRemove}
              onSelect={(locator) => onSelectRelation(relationIdFor(locator))}
            />
          </div>
        )}
      </RelationalViewportSurface>
      {draftProjection == null ? null : (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-(--border-subtle) bg-(--surface-panel) p-1 shadow-md">
          <CanvasRelationalTreeZoomControls
            copy={copy}
            zoom={viewport.zoom}
            minimumZoom={viewport.minimumZoom}
            onChange={viewport.changeZoom}
            onFit={viewport.fit}
            panMode={viewport.panMode}
            onTogglePan={viewport.togglePanMode}
          />
        </div>
      )}
    </div>
  );
}

export function CanvasRelationalTreeDraftViewport(
  props: ComponentProps<typeof DraftViewport>
): JSX.Element {
  return (
    <RelationalLayoutSession>
      <DraftViewport {...props} />
    </RelationalLayoutSession>
  );
}
