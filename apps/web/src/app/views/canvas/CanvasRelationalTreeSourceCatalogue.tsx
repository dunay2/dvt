/** Owned concern: present the source/operand catalogue for one relational tree. */
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSourceCard } from './CanvasRelationalTreeSourceCard';

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
  const [search, setSearch] = useState('');
  const language = useApplicationLanguageStore((state) => state.language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const visibleItems = items.filter((item) =>
    item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

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
      <label className="mt-3 flex items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-subtle) px-2 py-1.5 focus-within:border-(--focus-ring)">
        <Search aria-hidden="true" className="size-3.5 shrink-0 text-(--text-muted)" />
        <input
          type="search"
          aria-label={editorCopy.search}
          placeholder={editorCopy.search}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          className="min-w-0 flex-1 bg-transparent text-xs text-(--text-default) outline-none"
        />
      </label>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-x-visible md:pb-0">
        {visibleItems.map((item) => (
          <li key={item.key} className="min-w-44 md:min-w-0">
            <CanvasRelationalTreeSourceCard
              item={item}
              copy={copy}
              draggable={draggable}
              onBeginDrag={onBeginDrag}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
      {visibleItems.length === 0 ? (
        <p className="mt-3 text-xs text-(--text-muted)">{editorCopy.noMatches}</p>
      ) : null}
    </section>
  );
}
