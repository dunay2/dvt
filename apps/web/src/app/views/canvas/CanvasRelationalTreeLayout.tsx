/** Owned concern: render deterministic graph geometry without creating a second Canvas authority. */
import { Table2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  CANVAS_RELATIONAL_SEMANTIC_ZOOM,
  projectCanvasRelationalTreeSemanticZoom,
  type CanvasRelationalSemanticContext,
} from './canvasRelationalTreeSemanticZoom';

import {
  layoutCanvasRelationalTree,
  type CanvasRelationalTreePlacedEdge,
} from './canvasRelationalTreeGeometry';
import { CanvasRelationalTreeGraphNode } from './CanvasRelationalTreeGraphNode';
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

function childRoleBadge(role: CanvasRelationalTreeChildRole, ordinal: number): string | null {
  if (role === 'left') return 'L';
  if (role === 'right') return 'R';
  if (role === 'primary') return '1';
  if (role === 'secondary') return String(ordinal + 1);
  return null;
}

function edgePath(edge: CanvasRelationalTreePlacedEdge): string {
  const controlOffset = Math.max(32, (edge.toX - edge.fromX) * 0.45);
  return `M ${edge.fromX} ${edge.fromY} C ${edge.fromX + controlOffset} ${edge.fromY}, ${edge.toX - controlOffset} ${edge.toY}, ${edge.toX} ${edge.toY}`;
}

function EdgeRoleBadge({ edge }: Readonly<{ edge: CanvasRelationalTreePlacedEdge }>) {
  const badge = childRoleBadge(edge.role, edge.ordinal);
  const width = 20;
  return badge == null ? null : (
    <g
      data-slot="canvas-relational-tree-input-label"
      data-role={edge.role}
      transform={`translate(${edge.toX - width - 4} ${edge.toY - 10})`}
    >
      <rect
        width={width}
        height="20"
        rx="4"
        fill="var(--surface-panel)"
        stroke="var(--status-info)"
      />
      <text
        x={width / 2}
        y="14"
        fill="var(--text-strong)"
        fontSize="12"
        fontWeight="500"
        textAnchor="middle"
      >
        {badge}
      </text>
    </g>
  );
}

export function CanvasRelationalTreeLayout({
  outputName,
  root,
  selectedLocator,
  copy,
  onSelect,
  onExpand,
  semanticContext,
  zoom = 1,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  semanticContext?: CanvasRelationalSemanticContext;
  zoom?: number;
}>): JSX.Element {
  const detailed = Math.round(zoom * 100) >= CANVAS_RELATIONAL_SEMANTIC_ZOOM * 100;
  const detail = useMemo(
    () => projectCanvasRelationalTreeSemanticZoom(root, detailed ? semanticContext : undefined),
    [root, detailed, semanticContext?.transformNode, semanticContext?.draft]
  );
  const layout = useMemo(() => layoutCanvasRelationalTree(root, detail.sizes), [root, detail]);
  const rootNode = layout.nodes[0]!;

  return (
    <div
      data-slot="canvas-relational-tree-layout"
      data-layout="graph"
      data-direction="left-to-right"
      className="relative"
      style={{ width: layout.width, height: layout.height }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={layout.width}
        height={layout.height}
      >
        <path
          d={`M ${rootNode.x + rootNode.width} ${layout.output.y + layout.output.height / 2} H ${layout.output.x}`}
          fill="none"
          stroke="var(--status-info)"
          strokeWidth="1.5"
        />
        {layout.nodes
          .filter((placed) => placed.node.children.length > 0)
          .map((parent) => (
            <g
              key={parent.node.locator}
              data-slot="canvas-relational-tree-children"
              data-parent-locator={parent.node.locator}
              data-child-count={parent.node.children.length}
            >
              {layout.edges
                .filter((edge) => edge.parentLocator === parent.node.locator)
                .map((edge) => (
                  <g key={edge.key}>
                    <path
                      d={edgePath(edge)}
                      fill="none"
                      stroke="var(--status-info)"
                      strokeOpacity="0.8"
                      strokeWidth="1.5"
                    />
                    <EdgeRoleBadge edge={edge} />
                  </g>
                ))}
            </g>
          ))}
      </svg>

      <div
        data-slot="canvas-relational-tree-output"
        className="absolute flex items-center gap-2 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 text-left shadow-sm"
        style={{
          left: layout.output.x,
          top: layout.output.y,
          width: layout.output.width,
          height: layout.output.height,
        }}
      >
        <Table2 aria-hidden="true" className="size-4 shrink-0 text-emerald-300" />
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold text-(--text-primary)">
            {outputName}
          </span>
          <span className="block text-[9px] uppercase tracking-wide text-emerald-300">
            {copy.relationalTreeOutputLabel}
          </span>
        </span>
      </div>

      <ul role="tree" aria-label={copy.relationalTreeLabel} className="absolute inset-0">
        {layout.nodes.map((placed) => (
          <CanvasRelationalTreeGraphNode
            key={placed.node.locator}
            placed={placed}
            selected={placed.node.locator === selectedLocator}
            copy={copy}
            onSelect={onSelect}
            onExpand={onExpand}
            semanticGraph={detail.graphs.get(placed.node.locator)}
          />
        ))}
      </ul>
    </div>
  );
}
