/** Owned concern: render one accessible relational operator card. */
import { AlertTriangle, Filter, Layers3, Sigma, Table2, ChevronDown } from 'lucide-react';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeChildRole } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

const operatorTone = {
  read: 'border-sky-800/90 bg-sky-950/25',
  project: 'border-blue-700/90 bg-blue-950/25',
  filter: 'border-violet-700/90 bg-violet-950/25',
  join: 'border-blue-500 bg-blue-950/35',
  set: 'border-indigo-600/90 bg-indigo-950/30',
  aggregate: 'border-amber-700/90 bg-amber-950/25',
  unsupported: 'border-rose-700/90 bg-rose-950/25',
} as const;

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

const operatorIcons = {
  read: Table2,
  join: CanvasRelationalJoinIcon,
  set: Layers3,
  project: Layers3,
  filter: Filter,
  aggregate: Sigma,
  unsupported: AlertTriangle,
};

export function CanvasRelationalTreeGraphNode({
  placed,
  selected,
  copy,
  onSelect,
  onExpand,
  semanticGraph,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  semanticGraph?: SemanticWorkbenchGraph;
}>): JSX.Element {
  const roleLabel = placed.role == null ? null : childRoleLabel(placed.role, placed.ordinal, copy);
  const subtitle = placed.node.displayName ?? placed.node.substraitKind;
  const isSource = placed.node.operator === 'read';
  const title = isSource ? subtitle : placed.node.operator.toUpperCase();
  const Icon = operatorIcons[placed.node.operator];
  return (
    <li
      role="none"
      className="absolute"
      style={{ left: placed.x, top: placed.y, width: placed.width, height: placed.height }}
      data-parent-locator={placed.parentLocator ?? undefined}
    >
      <button
        type="button"
        role="treeitem"
        aria-level={placed.level}
        aria-posinset={placed.ordinal + 1}
        aria-setsize={placed.siblingCount}
        aria-selected={selected}
        aria-expanded={placed.node.children.length === 0 ? undefined : true}
        aria-label={roleLabel == null ? title : `${roleLabel}: ${title}`}
        data-slot="canvas-relational-tree-node"
        data-locator={placed.node.locator}
        data-relation-id={placed.node.relationId ?? undefined}
        data-operator={placed.node.operator}
        onClick={() => onSelect(placed.node.locator)}
        onDoubleClick={() => placed.node.operator === 'join' && onExpand?.(placed.node.locator)}
        style={{ height: semanticGraph == null ? '100%' : 76 }}
        className={`h-full w-full rounded-md border px-3 py-2 text-left shadow-sm transition-colors hover:border-(--status-info) aria-selected:border-(--status-info) aria-selected:ring-2 aria-selected:ring-(--status-info) ${operatorTone[placed.node.operator]}`}
      >
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />
          <span
            data-slot="canvas-relational-node-title"
            title={title}
            className="truncate text-xs font-semibold text-(--text-strong)"
          >
            {title}
          </span>
        </span>
        {isSource ? null : (
          <span
            title={subtitle}
            className="mt-2 block truncate font-mono text-[11px] text-(--text-muted)"
          >
            {subtitle}
          </span>
        )}
        {roleLabel == null ? null : <span className="sr-only">{roleLabel}</span>}
      </button>
      {semanticGraph == null ? null : (
        <div
          data-slot="canvas-relational-semantic-zoom"
          data-relation-id={placed.node.relationId ?? undefined}
          className="rounded-b-md border border-t-0 border-blue-500 bg-(--surface-panel)"
        >
          <CanvasRelationalScalarTree graph={semanticGraph} compact />
        </div>
      )}
      {placed.node.operator !== 'join' || onExpand == null ? null : (
        <button
          type="button"
          data-slot="canvas-relational-node-expand"
          aria-label={`${copy.relationalTreeDetailLabel}: JOIN · ${subtitle}`}
          title={`${copy.relationalTreeDetailLabel}: JOIN`}
          onClick={() => onExpand(placed.node.locator)}
          className="absolute right-1 top-1 grid size-7 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-primary)"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      )}
    </li>
  );
}
