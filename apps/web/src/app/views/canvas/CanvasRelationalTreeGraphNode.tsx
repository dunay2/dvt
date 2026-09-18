/** Owned concern: render one accessible relational operator card. */
import { AlertTriangle, Filter, Layers3, Link2, Sigma, Table2 } from 'lucide-react';

import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';
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

function OperatorIcon({ operator }: Readonly<{ operator: CanvasRelationalTreeOperator }>) {
  const Icon =
    operator === 'read'
      ? Table2
      : operator === 'join'
        ? Link2
        : operator === 'set' || operator === 'project'
          ? Layers3
          : operator === 'filter'
            ? Filter
            : operator === 'aggregate'
              ? Sigma
              : AlertTriangle;
  return <Icon aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />;
}

export function CanvasRelationalTreeGraphNode({
  placed,
  selected,
  copy,
  onSelect,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
}>): JSX.Element {
  const roleLabel = placed.role == null ? null : childRoleLabel(placed.role, placed.ordinal, copy);
  const subtitle = placed.node.displayName ?? placed.node.relationId ?? placed.node.substraitKind;
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
        aria-label={
          roleLabel == null ? placed.node.operator : `${roleLabel}: ${placed.node.operator}`
        }
        data-slot="canvas-relational-tree-node"
        data-locator={placed.node.locator}
        data-operator={placed.node.operator}
        onClick={() => onSelect(placed.node.locator)}
        className={`h-full w-full rounded-md border px-3 py-2 text-left shadow-sm transition-colors hover:border-(--status-info) aria-selected:border-(--status-info) aria-selected:ring-2 aria-selected:ring-(--status-info) ${operatorTone[placed.node.operator]}`}
      >
        <span className="flex items-center gap-2">
          <OperatorIcon operator={placed.node.operator} />
          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-(--text-primary)">
            {placed.node.operator.toUpperCase()}
          </span>
          <span className="ml-auto rounded bg-(--surface-panel) px-1.5 py-0.5 font-mono text-[9px] text-(--text-muted)">
            {placed.node.output.fields.length}
          </span>
        </span>
        <span className="mt-1 block truncate font-mono text-[10px] text-(--text-muted)">
          {subtitle}
        </span>
        {roleLabel == null ? null : <span className="sr-only">{roleLabel}</span>}
      </button>
    </li>
  );
}
