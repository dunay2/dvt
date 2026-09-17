/** Owned concern: render one keyboard-accessible, draggable relational source reference. */
import { Table2 } from 'lucide-react';
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
  onBeginDrag,
  onSelect,
}: Readonly<{
  item: CanvasRelationalTreeCatalogueItem;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draggable: boolean;
  onBeginDrag?: (item: CanvasRelationalTreeCatalogueItem) => void;
  onSelect: (item: CanvasRelationalTreeCatalogueItem) => void;
}>): JSX.Element {
  const stateLabel = {
    participating: copy.relationalTreeParticipatingLabel,
    pending: copy.relationalTreePendingLabel,
    missing: copy.relationalTreeMissingLabel,
  } as const;
  return (
    <button
      type="button"
      title={draggable ? copy.relationalTreeSourceActionHint : undefined}
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
        onBeginDrag?.(item);
      }}
      disabled={item.selectable === false || (item.selectable == null && item.treeLocator == null)}
      onClick={() => onSelect(item)}
      className="w-full rounded-md border border-(--border-subtle) bg-(--surface-subtle) p-2.5 text-left enabled:cursor-grab enabled:hover:border-(--status-info) enabled:active:cursor-grabbing aria-pressed:border-(--status-info) aria-pressed:ring-1 aria-pressed:ring-(--status-info) disabled:cursor-default"
    >
      <span className="flex items-center gap-2">
        <Table2 aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-(--text-primary)">
            {item.label}
          </span>
          {item.fieldCount == null ? null : (
            <span className="block text-[11px] text-(--text-muted)">
              {copy.nodePresentationColumnsLabel}: {item.fieldCount}
            </span>
          )}
        </span>
      </span>
      <span
        className={`mt-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${stateClass[item.state]}`}
      >
        {stateLabel[item.state]}
      </span>
      {item.reason == null ? null : (
        <span className="mt-1 block text-[11px] text-(--text-muted)">{item.reason}</span>
      )}
    </button>
  );
}
