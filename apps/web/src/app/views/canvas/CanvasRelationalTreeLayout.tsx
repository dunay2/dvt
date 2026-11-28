/** Owned concern: assemble the relational graph's presentation layers without semantic authority. */
import { useState } from 'react';
import type { CanvasRelationalSemanticContext } from './canvasRelationalTreeDetails';
import { useCanvasRelationalTreePlacement } from './useCanvasRelationalTreePlacement';

import { RelationalTreeEdges } from './relational-layout/RelationalTreeEdges';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalTreeOutput } from './CanvasRelationalTreeOutput';
import { CanvasRelationalTreeNodes } from './CanvasRelationalTreeNodes';

const EMPTY_STAGED_OPERATIONS: readonly CanvasStagedOperation[] = [];

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
  onManualLayout,
  onOpenOutput,
  onInspectOutputConnection,
  occurrences,
  stagedOperations = EMPTY_STAGED_OPERATIONS,
  selectedStagedOperationId = null,
  onSelectStagedOperation,
  onConnectStagedOperation,
  onDisconnectStagedOperation,
  onDisconnectRelation,
  outputRelationId,
  onConnectOutput,
  onDisconnectOutput,
  sourceOutputFieldsByRelationId,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode | null;
  occurrences?: Pick<SourceOccurrenceActions, 'pending' | 'selectedId' | 'select'>;
  stagedOperations?: readonly CanvasStagedOperation[];
  selectedStagedOperationId?: string | null;
  onSelectStagedOperation?: (id: string) => void;
  onConnectStagedOperation?: (id: string, port: number, relationId: string) => void;
  onDisconnectStagedOperation?: (id: string, port: number) => void;
  onDisconnectRelation?: (id: string, port: number) => void;
  outputRelationId?: string | null;
  onConnectOutput?: (relationId: string) => void;
  onDisconnectOutput?: () => void;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string, onAccepted: (id: string) => void) => void;
  semanticContext?: CanvasRelationalSemanticContext;
  zoom?: number;
  onManualLayout?: () => void;
  onOpenOutput?: () => void;
  onInspectOutputConnection?: () => void;
}>): JSX.Element {
  const {
    layout,
    movement,
    graphs,
    expanded,
    zoomRevealsDetail,
    toggleDetail,
    retainPositionsAfterRemoval,
  } = useCanvasRelationalTreePlacement({
    root,
    semanticContext,
    sourceOutputFieldsByRelationId,
    stagedOperations,
    pendingSources: occurrences?.pending,
    zoom,
    onManualLayout,
  });
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
        onDisconnectRelation={onDisconnectRelation}
        outputRelationId={effectiveOutputRelationId}
        onSelectOutput={onInspectOutputConnection}
        onDisconnectOutput={onDisconnectOutput}
      />
      {layout.output == null ? null : (
        <CanvasRelationalTreeOutput
          output={layout.output}
          outputName={outputName}
          copy={copy}
          onOpen={onOpenOutput}
          onInspectConnection={onInspectOutputConnection}
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
          movable
        />
      )}
      <CanvasRelationalTreeNodes
        layout={layout}
        graphs={graphs}
        expanded={expanded}
        zoomRevealsDetail={zoomRevealsDetail}
        toggleDetail={toggleDetail}
        occurrences={occurrences}
        stagedOperations={stagedOperations}
        selectedStagedOperationId={selectedStagedOperationId}
        selectedLocator={selectedLocator}
        selectedConnectionSource={selectedConnectionSource}
        copy={copy}
        actions={{
          select: onSelect,
          expand: onExpand,
          remove: onRemove == null ? undefined : (id) => onRemove(id, retainPositionsAfterRemoval),
          selectStaged: onSelectStagedOperation,
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
