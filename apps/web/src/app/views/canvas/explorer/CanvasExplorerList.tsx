/** Owned concern: retain local list search and project matching rows, never mutate nodes. */
import { useState, type DragEvent } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerListTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasExplorerList({
  items,
  onSelect,
  onImport,
  disabled,
  onDragStart,
}: Readonly<{
  items: readonly Readonly<{
    id: string;
    label: string;
    description?: string;
    selected?: boolean;
  }>[];
  onSelect: (id: string) => void;
  onImport?: () => void;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
}>): JSX.Element {
  const [query, setQuery] = useState('');
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const search = query.trim().toLocaleLowerCase();
  const matches = items.filter((item) =>
    `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(search)
  );
  return (
    <CanvasExplorerListTemplate
      items={matches}
      query={query}
      onQuery={setQuery}
      onSelect={onSelect}
      onImport={onImport}
      disabled={disabled}
      onDragStart={onDragStart}
      copy={copy}
    />
  );
}
