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
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode;
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
    () => projectCanvasRelationalTreeDetails(root, semanticContext),
    [root, semanticContext?.transformNode, semanticContext?.draft]
  );
  const { positions, setPosition, expanded, toggleDetail } = useRelationalLayout();
  const sizes = useMemo(() => {
    const visible = new Map(detail.sizes);
    const visit = (node: CanvasRelationalTreeNode): void => {
      if (!expanded.has(node.relationId ?? node.locator)) visible.delete(node.locator);
      node.children.forEach((child) => visit(child.node));
    };
    visit(root);
    return visible;
  }, [root, detail, expanded]);
  const layout = useMemo(
    () => layoutCanvasRelationalTree(root, sizes, positions),
    [root, sizes, positions]
  );
  const movement = useRelationalCardMovement(
    layout.nodes,
    zoom,
    setPosition,
    onManualLayout,
    !panMode
  );
  const outputStyle = {
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

      {onOpenOutput == null ? (
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
            selected={placed.node.locator === selectedLocator}
            copy={copy}
            onSelect={onSelect}
            onExpand={onExpand}
            onRemove={onRemove}
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
