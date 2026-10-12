/** Owned concern: passive source catalogue markup; reuse existing source and occurrence controls. */
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
import type { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasRelationalTreeSourceCard } from './CanvasRelationalTreeSourceCard';
import { SourceOccurrenceAction } from './relational-source-occurrence/SourceOccurrenceAction';
import styles from './explorer/CanvasExplorer.module.css';

export function CanvasRelationalSourceCatalogueTemplate({
  items,
  copy,
  editorCopy,
  search,
  onSearch,
  draggable,
  onSelect,
  occurrences,
}: ComponentProps<typeof CanvasRelationalTreeSourceCatalogue> &
  Readonly<{
    editorCopy: ReturnType<typeof resolveCanvasSemanticEditorCopy>;
    search: string;
    onSearch: (value: string) => void;
  }>): JSX.Element {
  return (
    <div data-slot="canvas-relational-tree-sources" className={styles.listPanel}>
      <label className={styles.search}>
        <Search aria-hidden="true" />
        <input
          type="search"
          aria-label={editorCopy.search}
          placeholder={editorCopy.search}
          value={search}
          onChange={(event) => onSearch(event.currentTarget.value)}
        />
      </label>
      <ul className={styles.list} data-slot="canvas-relational-tree-source-list">
        {items.map((item) => (
          <li key={item.key} className={styles.sourceRow}>
            <CanvasRelationalTreeSourceCard
              item={item}
              copy={copy}
              draggable={draggable === true}
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
      {items.length === 0 ? <p className={styles.empty}>{editorCopy.noMatches}</p> : null}
    </div>
  );
}
