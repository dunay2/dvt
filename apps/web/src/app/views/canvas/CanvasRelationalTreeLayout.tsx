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
import { CanvasRelationalTreeGraphNode } from './CanvasRelationalTreeGraphNode';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import { projectPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { projectCanvasStagedOperation, type CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalTreeOutput } from './CanvasRelationalTreeOutput';

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
  onRemoveStagedOperation,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode | null;
  occurrences?: Pick<SourceOccurrenceActions, 'pending' | 'selectedId' | 'select' | 'remove'>;
  stagedOperations?: readonly CanvasStagedOperation[];
  selectedStagedOperationId?: string | null;
  onSelectStagedOperation?: (id: string) => void;
  onConnectStagedOperation?: (id: string, port: number, relationId: string) => void;
  onRemoveStagedOperation?: (id: string) => void;
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
  const detachedIds = useMemo(
    () => new Set(detachedSources.map((node) => node.relationId)),
    [detachedSources]
  );
  const stagedById = useMemo(
    () => new Map(stagedOperations.map((operation) => [operation.id, operation])),
    [stagedOperations]
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
  return (
    <div
      {...movement}
      data-slot="canvas-relational-tree-layout"
      data-layout="graph"
      data-direction="left-to-right"
      className="relative"
      style={{ width: layout.width, height: layout.height }}
    >
      <RelationalTreeEdges layout={layout} stagedOperations={stagedOperations} />

      {layout.output == null ? null : (
        <CanvasRelationalTreeOutput
          output={layout.output}
          outputName={outputName}
          copy={copy}
          onOpen={onOpenOutput}
        />
      )}

      <ul role="tree" aria-label={copy.relationalTreeLabel} className="absolute inset-0">
        {layout.nodes.map((placed) => {
          const relationId = placed.node.relationId;
          const staged = relationId == null ? undefined : stagedById.get(relationId);
          const sourcePending = detachedIds.has(relationId);
          return (
            <CanvasRelationalTreeGraphNode
              key={placed.node.locator}
              placed={placed}
              selected={
                staged != null
                  ? relationId === selectedStagedOperationId
                  : occurrences?.selectedId != null
                    ? relationId === occurrences.selectedId
                    : placed.node.locator === selectedLocator
              }
              copy={copy}
              onSelect={
                staged != null
                  ? () => onSelectStagedOperation?.(staged.id)
                  : sourcePending
                    ? () => occurrences?.select(relationId!)
                    : onSelect
              }
              onExpand={sourcePending || staged != null ? undefined : onExpand}
              onRemove={
                staged != null
                  ? () => onRemoveStagedOperation?.(staged.id)
                  : sourcePending
                    ? occurrences?.remove
                    : onRemove
              }
              pending={sourcePending || staged != null}
              stagedOperation={staged}
              semanticGraph={detail.graphs.get(placed.node.locator)}
              expanded={expanded.has(relationId ?? placed.node.locator)}
              onToggleDetail={() => toggleDetail(relationId ?? placed.node.locator)}
              movable={!panMode}
              selectedConnectionSource={selectedConnectionSource}
              onSelectConnectionSource={
                onConnectStagedOperation == null ? undefined : setSelectedConnectionSource
              }
              onConnectOperation={
                onConnectStagedOperation == null
                  ? undefined
                  : (operationId, port, sourceId) => {
                      onConnectStagedOperation(operationId, port, sourceId);
                      setSelectedConnectionSource(null);
                    }
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
