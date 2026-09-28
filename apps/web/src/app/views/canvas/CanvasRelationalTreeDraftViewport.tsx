/** Owned concern: render and accept drops on one scalable canonical relational draft graph. */
import type { ComponentProps } from 'react';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { RelationalViewportSurface } from './relational-layout/RelationalViewportSurface';
import { useCanvasRelationalDraftProjection } from './useCanvasRelationalDraftProjection';

import {
  readCanvasRelationalOperationDrag,
  readCanvasRelationalSourceDrag,
} from './canvasRelationalTreeDrag';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

function DraftViewport({
  copy,
  data,
  actions,
  onExpandRelation,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
  onExpandRelation: (relationId: string | null) => void;
}>): JSX.Element {
  const {
    selectedRelationId,
    draft: joinDraft,
    operation,
    pendingSources,
    nodes,
    edges,
    transformNode,
  } = data;
  const {
    projection: draftProjection,
    selectedLocator,
    relationIdFor,
  } = useCanvasRelationalDraftProjection(
    { edges, joinDraft, nodes, operation, transformNode },
    selectedRelationId,
    actions.reconcileSelection,
    data.selectedPendingId != null
  );
  const viewport = useCanvasRelationalTreeViewport();

  const { setPosition } = useRelationalLayout();

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
          if (droppedOperation != null) {
            const bounds =
              viewport.contentRef.current?.getBoundingClientRect() ??
              event.currentTarget.getBoundingClientRect();
            const id = actions.stageOperation(droppedOperation);
            if (id != null) {
              viewport.stopAutoFit();
              setPosition(id, {
                x: Math.max(0, (event.clientX - bounds.left) / viewport.zoom),
                y: Math.max(0, (event.clientY - bounds.top) / viewport.zoom),
              });
            }
            return;
          }
          const nodeId = readCanvasRelationalSourceDrag(event.dataTransfer);
          if (nodeId != null) {
            const bounds =
              viewport.contentRef.current?.getBoundingClientRect() ??
              event.currentTarget.getBoundingClientRect();
            const id = actions.dropSource(nodeId);
            if (id != null) {
              viewport.stopAutoFit();
              setPosition(id, {
                x: Math.max(0, (event.clientX - bounds.left) / viewport.zoom),
                y: Math.max(0, (event.clientY - bounds.top) / viewport.zoom),
              });
            }
          }
        }}
      >
        <div
          ref={viewport.contentRef}
          data-slot="canvas-relational-tree-draft"
          className="w-max"
          style={{ zoom: viewport.zoom }}
        >
          <CanvasRelationalTreeLayout
            occurrences={{
              pending: pendingSources,
              selectedId: data.selectedPendingId,
              select: actions.selectPending,
              remove: actions.removePending,
            }}
            stagedOperations={data.stagedOperations}
            selectedStagedOperationId={data.selectedStagedOperationId}
            onSelectStagedOperation={actions.selectStagedOperation}
            onConnectStagedOperation={actions.connectStagedOperation}
            onDisconnectStagedOperation={actions.disconnectStagedOperation}
            outputRelationId={data.outputRelationId}
            onConnectOutput={actions.connectOutput}
            onDisconnectOutput={actions.disconnectOutput}
            onRemoveStagedOperation={actions.removeStagedOperation}
            outputName={transformNode.name}
            root={draftProjection?.root ?? null}
            selectedLocator={selectedLocator}
            copy={copy}
            zoom={viewport.zoom}
            panMode={viewport.panMode || viewport.panning}
            onManualLayout={viewport.stopAutoFit}
            semanticContext={{ transformNode, draft: joinDraft ?? undefined }}
            onExpand={(locator) => onExpandRelation(relationIdFor(locator))}
            onRemove={actions.remove}
            onSelect={(locator) => actions.selectRelation(relationIdFor(locator))}
          />
        </div>
      </RelationalViewportSurface>
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
    </div>
  );
}

export function CanvasRelationalTreeDraftViewport(
  props: ComponentProps<typeof DraftViewport>
): JSX.Element {
  return <DraftViewport {...props} />;
}
