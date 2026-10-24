/** Owned concern: retain local list search and project matching rows, never mutate nodes. */
import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerListTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem } from './canvasExplorerItems';

export function CanvasExplorerList({
  items,
  onSelect,
  onImport,
  disabled,
  onDragStart,
  presentation,
  itemIcon,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  onSelect: (id: string) => void;
  onImport?: () => void;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  presentation?: 'list' | 'cards';
  itemIcon?: ReactNode;
}>): JSX.Element {
  const [query, setQuery] = useState('');
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const search = query.trim().toLocaleLowerCase();
  const searchIndex = useMemo(
    () =>
      items.map((item) => ({
        item,
        text: `${item.label} ${item.description ?? ''}`.toLocaleLowerCase(),
      })),
    [items]
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
      query={query}
      onQuery={setQuery}
      onSelect={onSelect}
      onImport={onImport}
      disabled={disabled}
      onDragStart={onDragStart}
      presentation={presentation}
      itemIcon={itemIcon}
      copy={copy}
    />
  );
}
