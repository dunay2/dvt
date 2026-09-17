/** Owned concern: present the source/operand catalogue for one relational tree. */
import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { writeCanvasRelationalSourceDrag } from './canvasRelationalTreeDrag';

const stateClass = {
  participating: 'border-emerald-700 text-emerald-300',
  pending: 'border-amber-700 text-amber-300',
  missing: 'border-rose-700 text-rose-300',
} as const;

export function CanvasRelationalTreeSourceCatalogue({
  items,
  copy,
  draggable = false,
  onSelect,
}: Readonly<{
  items: readonly CanvasRelationalTreeCatalogueItem[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  draggable?: boolean;
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
      className="min-h-0 overflow-auto border-b border-(--border-subtle) p-3 lg:border-b-0 lg:border-r"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
        {copy.relationalTreeSourcesLabel}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
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
              disabled={
                item.selectable === false || (item.selectable == null && item.treeLocator == null)
              }
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(item);
              }}
              className="w-full rounded border border-(--border-subtle) bg-(--surface-subtle) p-2 text-left aria-pressed:border-(--status-info) aria-pressed:ring-1 aria-pressed:ring-(--status-info) disabled:cursor-default"
            >
              <span className="block truncate font-mono text-[11px] text-(--text-primary)">
                {item.label}
              </span>
              <span
                className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${stateClass[item.state]}`}
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
