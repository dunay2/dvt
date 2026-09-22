/** Owned concern: render one keyboard-accessible, draggable relational source reference. */
import { Check, Circle, Table2, TriangleAlert } from 'lucide-react';
import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { writeCanvasRelationalSourceDrag } from './canvasRelationalTreeDrag';

const stateClass = {
  participating: 'border-emerald-700/80 bg-emerald-950/30 text-emerald-300',
  pending: 'border-amber-700/80 bg-amber-950/30 text-amber-300',
  missing: 'border-rose-700/80 bg-rose-950/30 text-rose-300',
} as const;

export function CanvasRelationalTreeSourceCard({
  item,
  copy,
  draggable,
  onSelect,
}: Readonly<{
  item: CanvasRelationalTreeCatalogueItem;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draggable: boolean;
  onSelect: (item: CanvasRelationalTreeCatalogueItem) => void;
}>): JSX.Element {
  const stateLabel = {
    participating: copy.relationalTreeParticipatingLabel,
    pending: copy.relationalTreePendingLabel,
    missing: copy.relationalTreeMissingLabel,
  } as const;
  const StatusIcon = { participating: Check, pending: Circle, missing: TriangleAlert }[item.state];
  return (
    <button
      type="button"
      title={`${item.label} · ${stateLabel[item.state]}${item.reason == null ? '' : ` · ${item.reason}`}${draggable ? ` · ${copy.relationalTreeSourceActionHint}` : ''}`}
      data-slot="canvas-relational-tree-source"
      data-node-id={item.sourceNodeId ?? undefined}
      aria-pressed={item.selected === true}
      draggable={draggable && item.sourceNodeId != null && item.selectable !== false}
      onDragStart={(event) => {
        if (item.sourceNodeId == null || item.selectable === false) {
          event.preventDefault();
          return;
        }
        writeCanvasRelationalSourceDrag(event.dataTransfer, item.sourceNodeId);
      }}
      disabled={item.selectable === false || (item.selectable == null && item.treeLocator == null)}
      onClick={() => onSelect(item)}
      className="flex h-9 w-full items-center gap-2 rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-left enabled:cursor-grab enabled:hover:border-(--status-info) enabled:active:cursor-grabbing aria-pressed:border-(--status-info) aria-pressed:ring-1 aria-pressed:ring-(--status-info) disabled:cursor-default"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Table2 aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />
        <span className="min-w-0 flex-1">
          <span
            style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}
            className="block truncate text-sm font-medium text-(--text-strong)"
          >
            {item.label}
          </span>
        </span>
      </span>
      <span
        title={stateLabel[item.state]}
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded ${stateClass[item.state]}`}
      >
        <StatusIcon aria-hidden="true" className="size-3" />
        <span className="sr-only">{stateLabel[item.state]}</span>
      </span>
      {item.reason == null ? null : <span className="sr-only">{item.reason}</span>}
    </button>
  );
}
