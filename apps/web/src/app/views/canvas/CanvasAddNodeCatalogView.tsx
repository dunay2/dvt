/** Owned concern: render the Canvas add-node catalog without owning graph mutation. */
import { useId, useMemo, useState } from 'react';

import { canvasViewCopy, type CanvasViewCopy } from './copy';
import {
  filterCanvasAddNodeCatalogItems,
  type CanvasAddNodeCatalogItem,
} from './canvasAddNodeCatalogModel';

const CATALOG_LAYOUT_CLASS_NAME =
  'flex min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-y-hidden';
const CATALOG_SEARCH_CLASS_NAME =
  'h-9 w-full rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 text-sm text-(--text-default) outline-none focus-visible:border-(--accent-default) focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]';
const CATALOG_RESULTS_CLASS_NAME = 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1';
const CATALOG_EMPTY_CLASS_NAME = 'px-1 py-4 text-sm text-(--text-muted)';
const CATALOG_CATEGORY_CLASS_NAME =
  'min-w-0 border-t border-(--border-subtle) py-2 first:border-t-0 first:pt-0';
const CATALOG_CATEGORY_TITLE_CLASS_NAME =
  'px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-muted)';
const CATALOG_ITEM_CLASS_NAME =
  'flex w-full min-w-0 rounded-md px-2 py-2.5 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]';
const CATALOG_ITEM_DESCRIPTION_CLASS_NAME =
  'mt-1 block whitespace-normal break-words text-xs leading-5 text-(--text-muted)';

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
  const searchId = useId();
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
      <label className="sr-only" htmlFor={searchId}>
        {copy.canvasAddNodeCatalogSearchLabel}
      </label>
      <input
        autoFocus
        id={searchId}
        type="search"
        value={query}
        placeholder={copy.canvasAddNodeCatalogSearchPlaceholder}
        className={CATALOG_SEARCH_CLASS_NAME}
        onInput={(event) => setQuery(event.currentTarget.value)}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      <div data-slot="canvas-add-node-catalog-results" className={CATALOG_RESULTS_CLASS_NAME}>
        {visibleItems.length === 0 ? (
          <div className={CATALOG_EMPTY_CLASS_NAME}>{copy.canvasAddNodeCatalogEmptyMessage}</div>
        ) : (
          <div data-slot="canvas-context-menu-add-catalog-group" className="pt-3">
            {visibleGroups.map(([category, groupItems]) => {
              const categoryLabel = groupItems[0]?.categoryLabel ?? category;
              const categoryHeadingId = `${searchId}-${category}`;
              return (
                <section
                  key={category}
                  role="group"
                  aria-labelledby={categoryHeadingId}
                  aria-label={categoryLabel}
                  data-slot="canvas-context-menu-add-catalog-category"
                  data-catalog-category={category}
                  className={CATALOG_CATEGORY_CLASS_NAME}
                >
                  <h3 id={categoryHeadingId} className={CATALOG_CATEGORY_TITLE_CLASS_NAME}>
                    {categoryLabel}
                  </h3>
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-slot="canvas-context-menu-add-catalog-item"
                      data-menu-action={resolveCanvasAddNodeCatalogActionId(item)}
                      data-registration-kind={item.registration.kind}
                      className={CATALOG_ITEM_CLASS_NAME}
                      title={item.description}
                      onClick={() => onSelectItem(item)}
                    >
                      <span className="block min-w-0">
                        <span className="block font-medium">{item.actionLabel}</span>
                        <span className={CATALOG_ITEM_DESCRIPTION_CLASS_NAME}>
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function resolveCanvasAddNodeCatalogActionId(item: CanvasAddNodeCatalogItem): string {
  return item.actionId.split(':')[0] ?? item.actionId;
}
