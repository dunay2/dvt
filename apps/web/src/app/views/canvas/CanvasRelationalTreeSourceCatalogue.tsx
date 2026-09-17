/** Owned concern: present the source/operand catalogue for one relational tree. */
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

export function CanvasRelationalTreeSourceCatalogue({
  items,
  copy,
  draggable = false,
  onBeginDrag,
  onSelect,
}: Readonly<{
  items: readonly CanvasRelationalTreeCatalogueItem[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  draggable?: boolean;
  onBeginDrag?: (item: CanvasRelationalTreeCatalogueItem) => void;
  onSelect: (item: CanvasRelationalTreeCatalogueItem) => void;
}>): JSX.Element {
  const stateLabel = {
    participating: copy.relationalTreeParticipatingLabel,
    pending: copy.relationalTreePendingLabel,
    missing: copy.relationalTreeMissingLabel,
  } as const;

  return (
    <section
      aria-label={copy.relationalTreeSourcesLabel}
      className="max-h-40 min-h-0 overflow-auto border-b border-(--border-subtle) bg-(--surface-panel) p-3 md:max-h-none md:border-r md:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
          {copy.relationalTreeSourcesLabel}
        </h3>
        <span className="font-mono text-[9px] text-(--text-muted)">{items.length}</span>
      </div>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-x-visible md:pb-0">
        {items.map((item) => (
          <li key={item.key} className="min-w-44 md:min-w-0">
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
              disabled={
                item.selectable === false || (item.selectable == null && item.treeLocator == null)
              }
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(item);
              }}
              className="w-full rounded-md border border-(--border-subtle) bg-(--surface-subtle) p-2.5 text-left enabled:cursor-grab enabled:hover:border-(--status-info) enabled:active:cursor-grabbing aria-pressed:border-(--status-info) aria-pressed:ring-1 aria-pressed:ring-(--status-info) disabled:cursor-default"
            >
              <span className="flex items-center gap-2">
                <Table2 aria-hidden="true" className="size-4 shrink-0 text-(--status-info)" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] font-semibold text-(--text-primary)">
                    {item.label}
                  </span>
                  {item.fieldCount == null ? null : (
                    <span className="block text-[9px] text-(--text-muted)">
                      {copy.nodePresentationColumnsLabel}: {item.fieldCount}
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`mt-2 inline-flex rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase ${stateClass[item.state]}`}
              >
                {stateLabel[item.state]}
              </span>
              {item.reason == null ? null : (
                <span className="mt-1 block text-[9px] text-(--text-muted)">{item.reason}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
