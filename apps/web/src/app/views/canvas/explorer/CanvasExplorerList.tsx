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
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<string>>(
    () => new Set()
  );
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
  const categories = useMemo(() => {
    const groups = new Map<string | undefined, CanvasExplorerItem[]>();
    for (const item of matches) {
      const group = groups.get(item.category);
      if (group) group.push(item);
      else groups.set(item.category, [item]);
    }
    return groups;
  }, [matches]);
  return (
    <CanvasExplorerListTemplate
      categories={categories}
      collapsedCategories={collapsedCategories}
      onCategoryOpenChange={(category, open) => {
        setCollapsedCategories((previous) => {
          const next = new Set(previous);
          if (open) next.delete(category);
          else next.add(category);
          return next;
        });
      }}
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
