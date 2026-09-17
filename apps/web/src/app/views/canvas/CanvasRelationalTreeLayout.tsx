/** Owned concern: render deterministic tree geometry without creating a second Canvas authority. */
import { useMemo } from 'react';

import {
  layoutCanvasRelationalTree,
  type CanvasRelationalTreePlacedEdge,
} from './canvasRelationalTreeGeometry';
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

function childRoleLabel(
  role: CanvasRelationalTreeChildRole,
  ordinal: number,
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  if (role === 'left') return copy.inspectorDvtRelationalLeftInput;
  if (role === 'right') return copy.inspectorDvtRelationalRightInput;
  if (role === 'primary') return copy.relationalTreePrimaryInputLabel;
  if (role === 'secondary') {
    return copy.relationalTreeSecondaryInputTemplate.replace('{ordinal}', String(ordinal + 1));
  }
  return copy.inspectorDbtOriginLabel;
}

function edgePath(edge: CanvasRelationalTreePlacedEdge): string {
  const middleY = edge.fromY + (edge.toY - edge.fromY) / 2;
  return `M ${edge.fromX} ${edge.fromY} V ${middleY} H ${edge.toX} V ${edge.toY}`;
}

const operatorTone = {
  read: 'border-cyan-800/80 bg-cyan-950/20',
  project: 'border-blue-700/80 bg-blue-950/20',
  filter: 'border-violet-700/80 bg-violet-950/20',
  join: 'border-emerald-700/80 bg-emerald-950/20',
  set: 'border-fuchsia-700/80 bg-fuchsia-950/20',
  aggregate: 'border-amber-700/80 bg-amber-950/20',
  unsupported: 'border-rose-700/80 bg-rose-950/20',
} as const;

export function CanvasRelationalTreeLayout({
  root,
  selectedLocator,
  copy,
  onSelect,
}: Readonly<{
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
}>): JSX.Element {
  const layout = useMemo(() => layoutCanvasRelationalTree(root), [root]);
  const relationByLocator = new Map(layout.nodes.map((placed) => [placed.node.locator, placed]));

  return (
    <div
      data-slot="canvas-relational-tree-layout"
      data-layout="branching"
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
          d={`M ${layout.output.x + layout.output.width / 2} ${layout.output.y + layout.output.height} V ${layout.nodes[0]!.y}`}
          fill="none"
          stroke="var(--border-strong)"
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
                  <path
                    key={edge.key}
                    d={edgePath(edge)}
                    fill="none"
                    stroke="var(--border-strong)"
                    strokeWidth="1.5"
                  />
                ))}
            </g>
          ))}
      </svg>

      <div
        data-slot="canvas-relational-tree-output"
        className="absolute grid place-items-center rounded border border-(--status-info) bg-(--surface-subtle) text-[10px] font-bold uppercase tracking-wide text-(--status-info)"
        style={layout.output}
      >
        {copy.relationalTreeOutputLabel}
      </div>

      <ul role="tree" aria-label={copy.relationalTreeLabel} className="absolute inset-0">
        {layout.nodes.map((placed) => {
          const roleLabel =
            placed.role == null ? null : childRoleLabel(placed.role, placed.ordinal, copy);
          const parent =
            placed.parentLocator == null ? null : relationByLocator.get(placed.parentLocator);
          return (
            <li
              key={placed.node.locator}
              role="none"
              className="absolute"
              style={{
                left: placed.x,
                top: placed.y,
                width: placed.width,
                height: placed.height,
              }}
              data-parent-locator={parent?.node.locator ?? undefined}
            >
              {roleLabel == null ? null : (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-(--surface-panel) px-1.5 text-[9px] font-semibold uppercase tracking-wide text-(--text-muted)">
                  {roleLabel}
                </span>
              )}
              <button
                type="button"
                role="treeitem"
                aria-level={placed.level}
                aria-posinset={placed.ordinal + 1}
                aria-setsize={placed.siblingCount}
                aria-selected={placed.node.locator === selectedLocator}
                aria-expanded={placed.node.children.length === 0 ? undefined : true}
                aria-label={
                  roleLabel == null ? placed.node.operator : `${roleLabel}: ${placed.node.operator}`
                }
                data-slot="canvas-relational-tree-node"
                data-locator={placed.node.locator}
                data-operator={placed.node.operator}
                onClick={() => onSelect(placed.node.locator)}
                className={`h-full w-full rounded-md border px-3 py-2 text-left shadow-sm transition-colors hover:border-(--status-info) aria-selected:border-(--status-info) aria-selected:ring-2 aria-selected:ring-(--status-info) ${operatorTone[placed.node.operator]}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-(--status-info)">
                    {placed.node.operator.toUpperCase()}
                  </span>
                  <span className="rounded bg-(--surface-panel) px-1.5 py-0.5 font-mono text-[9px] text-(--text-muted)">
                    {placed.node.output.fields.length}
                  </span>
                </span>
                <span className="mt-1 block truncate font-mono text-[10px] text-(--text-primary)">
                  {placed.node.displayName ?? placed.node.relationId ?? placed.node.substraitKind}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
