/** Owned concern: present the source/operand catalogue for one relational tree. */
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSourceCard } from './CanvasRelationalTreeSourceCard';
import { SourceOccurrenceAction } from './relational-source-occurrence/SourceOccurrenceAction';
import type { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';

export function CanvasRelationalTreeSourceCatalogue({
  items,
  copy,
  collapsed = false,
  onToggle,
  draggable = false,
  onSelect,
  occurrences,
}: Readonly<{
  items: readonly CanvasRelationalTreeCatalogueItem[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  collapsed?: boolean;
  onToggle?: () => void;
  draggable?: boolean;
  onSelect: (item: CanvasRelationalTreeCatalogueItem) => void;
  occurrences?: ReturnType<typeof createSourceOccurrenceActions>;
}>): JSX.Element {
  const [search, setSearch] = useState('');
  const contentId = useId();
  const language = useApplicationLanguageStore((state) => state.language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const visibleItems = items.filter((item) =>
    item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  return (
    <section
      aria-label={copy.relationalTreeSourcesLabel}
      data-slot="canvas-relational-tree-sources"
      className="max-h-32 min-h-0 overflow-auto border-b border-(--border-subtle) bg-(--surface-panel) p-2 md:max-h-none md:border-r md:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          hidden={collapsed}
          className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)"
        >
          {copy.relationalTreeSourcesLabel}
        </h3>
        <span hidden={collapsed} className="ml-auto font-mono text-[9px] text-(--text-muted)">
          {items.length}
        </span>
        {onToggle == null ? null : (
          <button
            type="button"
            data-slot="canvas-relational-tree-sources-toggle"
            aria-expanded={!collapsed}
            aria-controls={contentId}
            aria-label={collapsed ? editorCopy.showSources : editorCopy.hideSources}
            title={collapsed ? editorCopy.showSources : editorCopy.hideSources}
            onClick={onToggle}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (!event.repeat) onToggle();
            }}
            className="grid size-7 shrink-0 place-items-center rounded hover:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
      <div id={contentId} hidden={collapsed} data-slot="canvas-relational-tree-source-list">
        <label className="mt-1 flex items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-subtle) px-2 py-1.5 focus-within:border-(--focus-ring)">
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
        <ul className="mt-2 flex gap-1 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-x-visible md:pb-0">
          {visibleItems.map((item) => (
            <li key={item.key} className="flex min-w-44 items-center gap-1 md:min-w-0">
              <CanvasRelationalTreeSourceCard
                item={item}
                copy={copy}
                draggable={draggable}
                onSelect={onSelect}
              />
              {occurrences == null || item.sourceNodeId == null ? null : (
                <SourceOccurrenceAction
                  label={item.label}
                  rejection={occurrences.rejection(item.sourceNodeId)}
                  onAdd={() => occurrences.add(item.sourceNodeId!)}
                />
              )}
            </li>
          ))}
        </ul>
        {visibleItems.length === 0 ? (
          <p className="mt-3 text-xs text-(--text-muted)">{editorCopy.noMatches}</p>
        ) : null}
      </div>
    </section>
  );
}
