/** Owned concern: project catalogue search and disclosure, independent of placement commands. */
import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerListTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import { CanvasExplorerConnections } from './CanvasExplorerConnections';

export function CanvasExplorerList({
  items,
  onSelect,
  disabled,
  onDragStart,
  onAddModel,
  onImport,
  connections,
  status,
  countKnown = true,
  pending = false,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  onImport?: () => void;
  connections?: ReactNode;
  status?: ReactNode;
  countKnown?: boolean;
  pending?: boolean;
}>): JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const search = query.trim().toLocaleLowerCase();
  const searchIndex = useMemo(
    () =>
      items.map((item) => ({
        item,
        text: [
          item.label,
          item.description,
          item.searchText,
          ...(item.details ?? []).map((detail) => detail.value),
          item.isSource ? copy.source : undefined,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase(),
      })),
    [items, copy.source]
  );
  const matches = useMemo(() => {
    if (!search) return items;
    const result: CanvasExplorerItem[] = [];
    for (const { item, text } of searchIndex) {
      if (text.includes(search)) result.push(item);
    }
    return result;
  }, [items, search, searchIndex]);
  return (
    <CanvasExplorerListTemplate
      items={matches}
      open={open}
      onOpenChange={setOpen}
      selectedId={selectedId}
      expandedIds={expandedIds}
      onToggleDetails={(id) => {
        setExpandedIds((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      query={query}
      onQuery={setQuery}
      onSelect={(id) => {
        setSelectedId(id);
        onSelect(id);
      }}
      disabled={disabled}
      onDragStart={onDragStart}
      onAddModel={onAddModel}
      status={status}
      countKnown={countKnown}
      pending={pending}
      connections={
        connections ?? (
          <CanvasExplorerConnections state={{ status: 'unavailable' }} onManage={onImport} />
        )
      }
      copy={copy}
    />
  );
}
