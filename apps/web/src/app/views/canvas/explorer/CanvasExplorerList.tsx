/** Owned concern: retain local list search and project matching rows, never mutate nodes. */
import { useMemo, useState, type DragEvent } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerListTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem, CanvasExplorerCategoryAction } from './canvasExplorerItems';

export function CanvasExplorerList({
  items,
  onSelect,
  disabled,
  onDragStart,
  categoryActions,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  categoryActions?: ReadonlyMap<string, CanvasExplorerCategoryAction>;
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
    if (!search) for (const category of categoryActions?.keys() ?? []) groups.set(category, []);
    for (const item of matches) {
      const group = groups.get(item.category);
      if (group) group.push(item);
      else groups.set(item.category, [item]);
    }
    return groups;
  }, [matches, search, categoryActions]);
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
      disabled={disabled}
      onDragStart={onDragStart}
      categoryActions={categoryActions}
      copy={copy}
    />
  );
}
