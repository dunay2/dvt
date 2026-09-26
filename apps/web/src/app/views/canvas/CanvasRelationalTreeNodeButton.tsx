/** Owned concern: readable card content and accessible semantic input roles. */
import { resolveCanvasRelationalNodeCopy } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

const operatorTone = {
  read: 'border-sky-800/90 bg-sky-950/25',
  project: 'border-blue-700/90 bg-blue-950/25',
  filter: 'border-violet-700/90 bg-violet-950/25',
  join: 'border-blue-500 bg-blue-950/35',
  cross: 'border-cyan-500 bg-cyan-950/30',
  set: 'border-indigo-600/90 bg-indigo-950/30',
  aggregate: 'border-amber-700/90 bg-amber-950/25',
  sort: 'border-cyan-600/90 bg-cyan-950/25',
  fetch: 'border-teal-600/90 bg-teal-950/25',
  window: 'border-blue-700/90 bg-blue-950/25',
  unsupported: 'border-rose-700/90 bg-rose-950/25',
};

export function CanvasRelationalTreeNodeButton({
  placed,
  selected,
  copy,
  detailed,
  movable,
  onSelect,
  onExpand,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  detailed: boolean;
  movable: boolean;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
}>): JSX.Element {
  const { node, role } = placed;
  const roleLabel =
    role == null
      ? null
      : role === 'left'
        ? copy.inspectorDvtRelationalLeftInput
        : role === 'right'
          ? copy.inspectorDvtRelationalRightInput
          : role === 'primary'
            ? copy.relationalTreePrimaryInputLabel
            : role === 'secondary'
              ? copy.relationalTreeSecondaryInputTemplate.replace(
                  '{ordinal}',
                  String(placed.ordinal + 1)
                )
              : copy.inspectorDbtOriginLabel;
  const isSource = node.operator === 'read';
  const { operation, presentation, title, detail } = resolveCanvasRelationalNodeCopy(node, copy);
  const Icon = presentation.icon;
  return (
    <button
      type="button"
      draggable={false}
      role="treeitem"
      aria-level={placed.level}
      aria-posinset={placed.ordinal + 1}
      aria-setsize={placed.siblingCount}
      aria-selected={selected}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
      aria-expanded={node.children.length === 0 ? undefined : true}
      aria-label={roleLabel == null ? title : `${roleLabel}: ${title}`}
      data-slot="canvas-relational-tree-node"
      data-locator={node.locator}
      data-relation-id={node.relationId ?? undefined}
      data-operator={node.operator}
      data-presentation={operation}
      onClick={() => {
        onSelect(node.locator);
        onExpand?.(node.locator);
      }}
      style={{
        touchAction: 'none',
        height: detailed ? 76 : '100%',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
      className={`w-full select-none rounded-md border px-3 py-2 text-left shadow-sm transition-colors hover:border-(--status-info) aria-selected:border-(--status-info) aria-selected:ring-2 aria-selected:ring-(--status-info) ${movable ? 'cursor-grab data-[dragging=true]:cursor-grabbing' : 'cursor-inherit'} ${operatorTone[presentation.category]}`}
    >
      <span className="flex items-center gap-2 pr-5">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />
        <span
          data-slot="canvas-relational-node-title"
          title={title}
          className="truncate text-sm font-medium leading-5 text-(--text-strong)"
        >
          {title}
        </span>
      </span>
      {isSource ? null : (
        <span
          title={detail}
          className="mt-1 block truncate text-[13px] font-normal leading-5 text-(--text-muted)"
        >
          {detail}
        </span>
      )}
      {roleLabel == null ? null : <span className="sr-only">{roleLabel}</span>}
    </button>
  );
}
