/** Owned concern: render and accept drops on one scalable canonical relational draft graph. */
import { useEffect, useMemo } from 'react';
import { CanvasRelationalTreeOperandCanvas } from './CanvasRelationalTreeOperandCanvas';
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { projectCanvasRelationalTreeAuthoringDraft } from './canvasRelationalTreeAuthoringProjection';
import {
  readCanvasRelationalOperationDrag,
  readCanvasRelationalSourceDrag,
} from './canvasRelationalTreeDrag';
import type { CanvasRelationalOperandPosition } from './CanvasRelationalTreeOperandSlot';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function CanvasRelationalTreeDraftViewport({
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
  onExpandRelation,
  onRemove,
}: Readonly<{
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
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
  selectedRelationId: string | null;
  onSelectRelation: (relationId: string | null) => void;
  onExpandRelation: (relationId: string | null) => void;
  onRemove: (relationId: string, keep?: 'left' | 'right') => void;
}>): JSX.Element {
  const inputById = useMemo(
    () => new Map(inputs.map((input) => [input.nodeId, input] as const)),
    [inputs]
  );
  const draftProjection = useMemo(
    () =>
      projectCanvasRelationalTreeAuthoringDraft({
        edges,
        inputs,
        joinDraft,
        nodes,
        operation,
        selectedInputIds,
        transformNode,
      }),
    [edges, inputs, joinDraft, nodes, operation, selectedInputIds, transformNode]
  );
  const treeNodes =
    draftProjection == null ? [] : flattenCanvasRelationalTree(draftProjection.root);
  const selectedLocator =
    treeNodes.find((node) => node.relationId === selectedRelationId)?.locator ?? '';
  const rootRelationId = draftProjection?.root.relationId ?? null;
  const relationIdFor = (locator: string) =>
    treeNodes.find((node) => node.locator === locator)?.relationId ?? null;
  const viewport = useCanvasRelationalTreeViewport(
    `${draftProjection?.root.locator ?? ''}:${selectedInputIds.join(',')}:${operation}`
  );
  useEffect(() => {
    if (selectedRelationId == null && rootRelationId != null) onSelectRelation(rootRelationId);
  }, [onSelectRelation, rootRelationId, selectedRelationId]);

  const placeDroppedSource = (nodeId: string): void => {
    if (selectedInputIds.includes(nodeId)) return;
    if (primaryInputId == null) onPlaceInput(nodeId, 'primary');
    else if (secondaryInputId == null && operation == null) onPlaceInput(nodeId, 'secondary');
    else onSelectInput(nodeId);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewport.viewportRef}
        data-slot="canvas-relational-tree-draft-viewport"
        className="absolute inset-0 cursor-grab overflow-auto p-5 pb-16 active:cursor-grabbing"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerUp}
        style={{
          backgroundColor: 'var(--surface-subtle)',
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--border-subtle) 72%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const droppedOperation = readCanvasRelationalOperationDrag(event.dataTransfer);
          if (droppedOperation != null) return onSelectOperation(droppedOperation);
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
              semanticContext={{ transformNode, draft: joinDraft ?? undefined }}
              onExpand={(locator) => onExpandRelation(relationIdFor(locator))}
              onRemove={onRemove}
              onSelect={(locator) => onSelectRelation(relationIdFor(locator))}
            />
          </div>
        )}
      </div>
      {draftProjection == null ? null : (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-(--border-subtle) bg-(--surface-panel) p-1 shadow-md">
          <CanvasRelationalTreeZoomControls
            copy={copy}
            zoom={viewport.zoom}
            minimumZoom={viewport.minimumZoom}
            onChange={viewport.changeZoom}
            onFit={viewport.fit}
          />
        </div>
      )}
    </div>
  );
}
