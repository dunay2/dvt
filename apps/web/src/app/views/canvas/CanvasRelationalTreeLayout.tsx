/** Owned concern: render deterministic graph geometry without creating a second Canvas authority. */
import { useMemo, useState } from 'react';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import { useRelationalCardMovement } from './relational-layout/useRelationalCardMovement';
import {
  CANVAS_RELATIONAL_DETAIL_ZOOM,
  type CanvasRelationalSemanticContext,
} from './canvasRelationalTreeDetails';
import { useCanvasRelationalTreeDetails } from './useCanvasRelationalTreeDetails';

import { RelationalTreeEdges } from './relational-layout/RelationalTreeEdges';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import { projectPendingSourceOccurrence } from './canvasRelationalTreeAuthoringProjection';
import { projectCanvasStagedOperation, type CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalTreeOutput } from './CanvasRelationalTreeOutput';
import { CanvasRelationalTreeNodes } from './CanvasRelationalTreeNodes';
import { projectCanvasRelationalMovableCards } from './projectCanvasRelationalMovableCards';

export function CanvasRelationalTreeLayout({
  outputName,
  root,
  selectedLocator,
  copy,
  onSelect,
  onExpand,
  onRemove,
  semanticContext,
  zoom = 1,
  panMode = false,
  onManualLayout,
  onOpenOutput,
  occurrences,
  stagedOperations = [],
  selectedStagedOperationId = null,
  onSelectStagedOperation,
  onConnectStagedOperation,
  onDisconnectStagedOperation,
  onRemoveStagedOperation,
  outputRelationId,
  onConnectOutput,
  onDisconnectOutput,
  sourceOutputFieldsByRelationId,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode | null;
  occurrences?: Pick<SourceOccurrenceActions, 'pending' | 'selectedId' | 'select' | 'remove'>;
  stagedOperations?: readonly CanvasStagedOperation[];
  selectedStagedOperationId?: string | null;
  onSelectStagedOperation?: (id: string) => void;
  onConnectStagedOperation?: (id: string, port: number, relationId: string) => void;
  onDisconnectStagedOperation?: (id: string, port: number) => void;
  onRemoveStagedOperation?: (id: string) => void;
  outputRelationId?: string | null;
  onConnectOutput?: (relationId: string) => void;
  onDisconnectOutput?: () => void;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
  semanticContext?: CanvasRelationalSemanticContext;
  zoom?: number;
  panMode?: boolean;
  onManualLayout?: () => void;
  onOpenOutput?: () => void;
}>): JSX.Element {
  const detail = useCanvasRelationalTreeDetails(
    root,
    semanticContext,
    sourceOutputFieldsByRelationId,
    stagedOperations
  );
  const { projectLayout, setPosition, expanded, toggleDetail } = useRelationalLayout();
  const zoomRevealsDetail = Math.round(zoom * 100) >= CANVAS_RELATIONAL_DETAIL_ZOOM * 100;
  const sizes = useMemo(() => {
    const visible = new Map(detail.sizes);
    const visit = (node: CanvasRelationalTreeNode): void => {
      if (!zoomRevealsDetail && !expanded.has(node.relationId ?? node.locator))
        visible.delete(node.locator);
      node.children.forEach((child) => visit(child.node));
    };
    if (root != null) visit(root);
    return visible;
  }, [root, detail, expanded, zoomRevealsDetail]);
  const detachedSources = useMemo(
    () => occurrences?.pending.map(projectPendingSourceOccurrence) ?? [],
    [occurrences?.pending]
  );
  const detached = useMemo(
    () => [...detachedSources, ...stagedOperations.map(projectCanvasStagedOperation)],
    [detachedSources, stagedOperations]
  );
  const layout = useMemo(
    () => projectLayout(root, sizes, detached),
    [root, sizes, detached, projectLayout]
  );
  const movableCards = useMemo(() => projectCanvasRelationalMovableCards(layout), [layout]);
  const movement = useRelationalCardMovement(
    movableCards,
    zoom,
    setPosition,
    onManualLayout,
    !panMode
  );
  const [selectedConnectionSource, setSelectedConnectionSource] = useState<string | null>(null);
  const effectiveOutputRelationId =
    outputRelationId === undefined ? (root?.relationId ?? null) : outputRelationId;
  return (
    <div
      {...movement}
      data-slot="canvas-relational-tree-layout"
      data-layout="graph"
      data-direction="left-to-right"
      className="relative"
      style={{ width: layout.width, height: layout.height }}
    >
      <RelationalTreeEdges
        layout={layout}
        stagedOperations={stagedOperations}
        removeConnectionLabel={copy.canvasContextMenuRemoveEdgeLabel}
        onSelectStagedOperation={onSelectStagedOperation}
        onDisconnectStagedOperation={onDisconnectStagedOperation}
        outputRelationId={effectiveOutputRelationId}
        onSelectOutput={onOpenOutput}
        onDisconnectOutput={onDisconnectOutput}
      />
      {layout.output == null ? null : (
        <CanvasRelationalTreeOutput
          output={layout.output}
          outputName={outputName}
          copy={copy}
          onOpen={onOpenOutput}
          connected={effectiveOutputRelationId != null}
          selectedSource={selectedConnectionSource}
          onConnect={
            onConnectOutput == null
              ? undefined
              : (relationId) => {
                  onConnectOutput(relationId);
                  setSelectedConnectionSource(null);
                }
          }
          onDisconnect={onDisconnectOutput}
          movable={!panMode}
        />
      )}
      <CanvasRelationalTreeNodes
        layout={layout}
        graphs={detail.graphs}
        expanded={expanded}
        zoomRevealsDetail={zoomRevealsDetail}
        toggleDetail={toggleDetail}
        occurrences={occurrences}
        stagedOperations={stagedOperations}
        selectedStagedOperationId={selectedStagedOperationId}
        selectedLocator={selectedLocator}
        selectedConnectionSource={selectedConnectionSource}
        panMode={panMode}
        copy={copy}
        actions={{
          select: onSelect,
          expand: onExpand,
          remove: onRemove,
          selectStaged: onSelectStagedOperation,
          removeStaged: onRemoveStagedOperation,
          selectConnectionSource:
            onConnectStagedOperation == null ? undefined : setSelectedConnectionSource,
          connectOperation:
            onConnectStagedOperation == null
              ? undefined
              : (id, port, producerId) => {
                  onConnectStagedOperation(id, port, producerId);
                  setSelectedConnectionSource(null);
                },
        }}
      />
    </div>
  );
}
