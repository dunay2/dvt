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
  onDisconnectRelation,
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
  onDisconnectRelation?: (id: string, port: number) => void;
  onRemoveStagedOperation?: (id: string) => void;
  outputRelationId?: string | null;
  onConnectOutput?: (relationId: string) => void;
  onDisconnectOutput?: () => void;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string) => void;
  semanticContext?: CanvasRelationalSemanticContext;
  zoom?: number;
  panMode?: boolean;
  onManualLayout?: () => void;
  onOpenOutput?: () => void;
}>): JSX.Element {
  const { layout, movement, graphs, expanded, zoomRevealsDetail, toggleDetail } =
    useCanvasRelationalTreePlacement({
      root,
      semanticContext,
      sourceOutputFieldsByRelationId,
      stagedOperations,
      pendingSources: occurrences?.pending,
      zoom,
      panMode,
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
        graphs={graphs}
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
