/** Owned concern: render the Canvas add-node catalog without owning graph mutation. */
import { useMemo, useState } from 'react';

import { canvasViewCopy, type CanvasViewCopy } from './copy';
import {
  filterCanvasAddNodeCatalogItems,
  type CanvasAddNodeCatalogItem,
} from './canvasAddNodeCatalogModel';
import { CanvasContextMenuItem, CanvasContextMenuSection } from './CanvasContextMenuPrimitives';

const CATALOG_HEADER_CLASS_NAME = 'px-2 pb-2 pt-1';
const CATALOG_TITLE_CLASS_NAME =
  'text-xs font-semibold uppercase tracking-wide text-(--text-muted)';
const CATALOG_SEARCH_CLASS_NAME =
  'mt-2 h-8 w-full rounded border border-(--border-subtle) bg-(--surface-base) px-2 text-sm text-(--text-default) outline-none focus:border-(--accent-default)';
const CATALOG_EMPTY_CLASS_NAME = 'px-2 py-3 text-sm text-(--text-muted)';
const CATALOG_LAYOUT_CLASS_NAME = 'w-full min-w-0 max-w-[calc(100vw-1.5rem)] overflow-x-hidden';
const CATALOG_CATEGORY_CLASS_NAME = 'min-w-0 border-t border-(--border-subtle) pt-1';
const CATALOG_CATEGORY_TITLE_CLASS_NAME =
  'px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)';
const CATALOG_ITEM_DESCRIPTION_CLASS_NAME =
  'mt-0.5 block whitespace-normal break-words text-xs leading-4 text-(--text-muted)';

export type CanvasAddNodeCatalogViewProps = Readonly<{
  items: readonly CanvasAddNodeCatalogItem[];
  onSelectItem: (item: CanvasAddNodeCatalogItem) => void;
  copy?: CanvasViewCopy;
}>;

export function CanvasAddNodeCatalogView({
  items,
  onSelectItem,
  copy = canvasViewCopy,
}: CanvasAddNodeCatalogViewProps): JSX.Element {
  const [query, setQuery] = useState('');
  const visibleItems = useMemo(() => filterCanvasAddNodeCatalogItems(items, query), [items, query]);
  const visibleGroups = useMemo(
    () =>
      Array.from(
        visibleItems.reduce((groups, item) => {
          const group = groups.get(item.category);
          if (group) {
            group.push(item);
          } else {
            groups.set(item.category, [item]);
          }
          return groups;
        }, new Map<CanvasAddNodeCatalogItem['category'], CanvasAddNodeCatalogItem[]>())
      ),
    [visibleItems]
  );

  return (
    <div data-slot="canvas-context-menu-add-catalog-layout" className={CATALOG_LAYOUT_CLASS_NAME}>
      <div className={CATALOG_HEADER_CLASS_NAME}>
        <div className={CATALOG_TITLE_CLASS_NAME}>{copy.canvasAddNodeCatalogTitle}</div>
        <label className="sr-only" htmlFor="canvas-add-node-catalog-search">
          {copy.canvasAddNodeCatalogSearchLabel}
        </label>
        <input
          id="canvas-add-node-catalog-search"
          type="search"
          value={query}
          placeholder={copy.canvasAddNodeCatalogSearchPlaceholder}
          className={CATALOG_SEARCH_CLASS_NAME}
          onInput={(event) => setQuery(event.currentTarget.value)}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className={CATALOG_EMPTY_CLASS_NAME}>{copy.canvasAddNodeCatalogEmptyMessage}</div>
      ) : (
        <CanvasContextMenuSection dataSlot="canvas-context-menu-add-catalog-group">
          {visibleGroups.map(([category, groupItems]) => {
            const categoryLabel = groupItems[0]?.categoryLabel ?? category;
            return (
              <div
                key={category}
                role="group"
                aria-label={categoryLabel}
                data-slot="canvas-context-menu-add-catalog-category"
                data-catalog-category={category}
                className={CATALOG_CATEGORY_CLASS_NAME}
              >
                <div className={CATALOG_CATEGORY_TITLE_CLASS_NAME}>{categoryLabel}</div>
                {groupItems.map((item) => (
                  <CanvasContextMenuItem
                    key={item.id}
                    dataSlot="canvas-context-menu-add-catalog-item"
                    dataMenuItemKind="catalog"
                    dataMenuAction={resolveCanvasAddNodeCatalogActionId(item)}
                    dataRegistrationKind={item.registration.kind}
                    label={
                      <span className="block min-w-0">
                        <span className="block font-medium">{item.actionLabel}</span>
                        <span className={CATALOG_ITEM_DESCRIPTION_CLASS_NAME}>
                          {item.description}
                        </span>
                      </span>
                    }
                    title={item.description}
                    onSelect={() => onSelectItem(item)}
                  />
                ))}
              </div>
            );
          })}
        </CanvasContextMenuSection>
      )}
    </div>
  );
}

function resolveCanvasAddNodeCatalogActionId(item: CanvasAddNodeCatalogItem): string {
  return item.actionId.split(':')[0] ?? item.actionId;
}
