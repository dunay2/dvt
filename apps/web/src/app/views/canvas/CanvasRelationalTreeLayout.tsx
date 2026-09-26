/** Owned concern: render deterministic graph geometry without creating a second Canvas authority. */
import { Table2 } from 'lucide-react';
import { useMemo } from 'react';
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
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode | null;
  occurrences?: Pick<SourceOccurrenceActions, 'pending' | 'selectedId' | 'select' | 'remove'>;
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
  const detached = useMemo(
    () => occurrences?.pending.map(projectPendingSourceOccurrence) ?? [],
    [occurrences?.pending]
  );
  const detachedIds = new Set(detached.map((node) => node.relationId));
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
  const outputStyle =
    layout.output == null
      ? undefined
      : {
          left: layout.output.x,
          top: layout.output.y,
          width: layout.output.width,
          height: layout.output.height,
        };
  const outputContent = (
    <>
      <Table2 aria-hidden="true" className="size-4 shrink-0 text-emerald-300" />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-(--text-primary)">
          {outputName}
        </span>
        <span className="block text-[9px] uppercase tracking-wide text-emerald-300">
          {copy.relationalTreeOutputLabel}
        </span>
      </span>
    </>
  );
  const outputClassName =
    'absolute z-10 flex items-center gap-2 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 text-left shadow-sm';

  return (
    <div
      {...movement}
      data-slot="canvas-relational-tree-layout"
      data-layout="graph"
      data-direction="left-to-right"
      className="relative"
      style={{ width: layout.width, height: layout.height }}
    >
      <RelationalTreeEdges layout={layout} />

      {layout.output == null ? null : onOpenOutput == null ? (
        <div
          data-slot="canvas-relational-tree-output"
          className={outputClassName}
          style={outputStyle}
        >
          {outputContent}
        </div>
      ) : (
        <button
          type="button"
          data-slot="canvas-relational-tree-output"
          aria-label={`${outputName} · ${copy.relationalTreeOutputLabel}`}
          onClick={onOpenOutput}
          className={`${outputClassName} transition-colors hover:bg-emerald-900/35 focus-visible:outline-2 focus-visible:outline-(--focus-ring)`}
          style={outputStyle}
        >
          {outputContent}
        </button>
      )}

      <ul role="tree" aria-label={copy.relationalTreeLabel} className="absolute inset-0">
        {layout.nodes.map((placed) => (
          <CanvasRelationalTreeGraphNode
            key={placed.node.locator}
            placed={placed}
            selected={
              occurrences?.selectedId != null
                ? placed.node.relationId === occurrences.selectedId
                : placed.node.locator === selectedLocator
            }
            copy={copy}
            onSelect={
              detachedIds.has(placed.node.relationId)
                ? () => occurrences?.select(placed.node.relationId!)
                : onSelect
            }
            onExpand={detachedIds.has(placed.node.relationId) ? undefined : onExpand}
            onRemove={detachedIds.has(placed.node.relationId) ? occurrences?.remove : onRemove}
            pending={detachedIds.has(placed.node.relationId)}
            semanticGraph={detail.graphs.get(placed.node.locator)}
            expanded={expanded.has(placed.node.relationId ?? placed.node.locator)}
            onToggleDetail={() => toggleDetail(placed.node.relationId ?? placed.node.locator)}
            movable={!panMode}
          />
        ))}
      </ul>
    </div>
  );
}
