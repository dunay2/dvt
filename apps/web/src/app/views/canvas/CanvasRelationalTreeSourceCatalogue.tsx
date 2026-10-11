/**
 * Owned concern: retain source catalogue search and compose existing occurrence actions.
 * @baseline GH-3610: disclosure belongs to the shared Canvas explorer.
 * @decision Keep source selection semantics in the supplied application ports.
 * @consequence Presentation no longer owns a second collapse path.
 * @version 1.0.0
 */
import { useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import type { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import { CanvasRelationalSourceCatalogueTemplate } from './CanvasRelationalTreeSourceCatalogue.templates';

export function CanvasRelationalTreeSourceCatalogue({
  items,
  copy,
  draggable = false,
  onSelect,
  occurrences,
}: Readonly<{
  items: readonly CanvasRelationalTreeCatalogueItem[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  draggable?: boolean;
  onSelect: (item: CanvasRelationalTreeCatalogueItem) => void;
  occurrences?: ReturnType<typeof createSourceOccurrenceActions>;
}>): JSX.Element {
  const [search, setSearch] = useState('');
  const editorCopy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const visibleItems = items.filter((item) =>
    item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  return (
    <CanvasRelationalSourceCatalogueTemplate
      items={visibleItems}
      copy={copy}
      editorCopy={editorCopy}
      search={search}
      onSearch={setSearch}
      draggable={draggable}
      onSelect={onSelect}
      occurrences={occurrences}
    />
  );
}
