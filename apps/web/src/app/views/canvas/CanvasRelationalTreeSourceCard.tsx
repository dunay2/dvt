/** Owned concern: render one keyboard-accessible, draggable relational source reference. */
import { Check, Circle, Table2, TriangleAlert } from 'lucide-react';
import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { writeCanvasRelationalSourceDrag } from './canvasRelationalTreeDrag';

const stateClass = {
  participating: 'bg-(--surface-selected) text-(--text-muted)',
  pending: 'bg-(--surface-selected) text-(--status-warning)',
  missing: 'bg-(--surface-selected) text-(--status-danger)',
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
      draggable={draggable && item.sourceNodeId != null && item.state !== 'missing'}
      onDragStart={(event) => {
        if (!draggable || item.sourceNodeId == null || item.state === 'missing') {
          event.preventDefault();
          return;
        }
        writeCanvasRelationalSourceDrag(event.dataTransfer, item.sourceNodeId);
      }}
      disabled={item.state === 'missing' || item.sourceNodeId == null}
      onClick={() => {
        if (item.selectable !== false) onSelect(item);
      }}
      className="flex h-9 w-full items-center gap-2 rounded border border-(--border-subtle) bg-(--surface-panel) px-2 text-left enabled:cursor-grab enabled:hover:border-(--primary) enabled:active:cursor-grabbing aria-pressed:border-(--primary) aria-pressed:ring-1 aria-pressed:ring-(--primary) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:cursor-default"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Table2 aria-hidden="true" className="size-4 shrink-0 text-(--primary)" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--text-body)] leading-(--text-body-line-height) font-medium text-(--text-strong)">
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
