/** Owned concern: render deterministic graph geometry without creating a second Canvas authority. */
import { useMemo, useState } from 'react';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import { useRelationalCardMovement } from './relational-layout/useRelationalCardMovement';
import {
  projectCanvasRelationalTreeDetails,
  type CanvasRelationalSemanticContext,
} from './canvasRelationalTreeDetails';

import { layoutCanvasRelationalTree } from './canvasRelationalTreeGeometry';
import { RelationalTreeEdges } from './relational-layout/RelationalTreeEdges';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import { projectPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { projectCanvasStagedOperation, type CanvasStagedOperation } from './canvasStagedOperation';
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
  onRemoveStagedOperation,
  outputRelationId,
  onConnectOutput,
  onDisconnectOutput,
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
  const detail = useMemo(
    () =>
      root == null
        ? { sizes: new Map(), graphs: new Map() }
        : projectCanvasRelationalTreeDetails(root, semanticContext),
    [root, semanticContext?.transformNode, semanticContext?.draft]
  );
  const { positions, setPosition, expanded, toggleDetail } = useRelationalLayout();
  const sizes = useMemo(() => {
    const visible = new Map(detail.sizes);
    const visit = (node: CanvasRelationalTreeNode): void => {
      if (!expanded.has(node.relationId ?? node.locator)) visible.delete(node.locator);
      node.children.forEach((child) => visit(child.node));
    };
    if (root != null) visit(root);
    return visible;
  }, [root, detail, expanded]);
  const detachedSources = useMemo(
    () => occurrences?.pending.map(projectPendingSourceOccurrence) ?? [],
    [occurrences?.pending]
  );
  const detachedOperations = useMemo(
    () => stagedOperations.map(projectCanvasStagedOperation),
    [stagedOperations]
  );
  const detached = useMemo(
    () => [...detachedSources, ...detachedOperations],
    [detachedSources, detachedOperations]
  );
  const layout = useMemo(
    () => layoutCanvasRelationalTree(root, sizes, positions, detached),
    [root, sizes, positions, detached]
  );
  const movement = useRelationalCardMovement(
    layout.nodes,
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
        disconnectLabel={copy.reactFlowEdgeDescription}
        onDisconnectStagedOperation={onDisconnectStagedOperation}
        outputRelationId={effectiveOutputRelationId}
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
                  onConnectOutput?.(relationId);
                  setSelectedConnectionSource(null);
                }
          }
          onDisconnect={onDisconnectOutput}
        />
      )}

      <CanvasRelationalTreeNodes
        layout={layout}
        graphs={detail.graphs}
        expanded={expanded}
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
