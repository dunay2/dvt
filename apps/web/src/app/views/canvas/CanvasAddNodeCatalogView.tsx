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
const CATALOG_ITEM_META_CLASS_NAME = 'mt-0.5 flex items-center gap-2 text-xs text-(--text-muted)';
const CATALOG_ITEM_CATEGORY_CLASS_NAME =
  'rounded border border-(--border-subtle) px-1.5 py-0.5 text-[10px] uppercase tracking-wide';
const CATALOG_ITEM_DESCRIPTION_CLASS_NAME = 'truncate';

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

  return (
    <>
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
          {visibleItems.map((item) => (
            <CanvasContextMenuItem
              key={item.id}
              label={
                <span>
                  <span>{item.actionLabel}</span>
                  <span className={CATALOG_ITEM_META_CLASS_NAME}>
                    <span className={CATALOG_ITEM_CATEGORY_CLASS_NAME}>{item.categoryLabel}</span>
                    <span className={CATALOG_ITEM_DESCRIPTION_CLASS_NAME}>{item.description}</span>
                  </span>
                </span>
              }
              title={item.description}
              onSelect={() => onSelectItem(item)}
            />
          ))}
        </CanvasContextMenuSection>
      )}
    </>
  );
}
