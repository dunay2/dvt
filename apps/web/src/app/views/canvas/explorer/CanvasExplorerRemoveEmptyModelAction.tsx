/** Owned concern: expose explicit empty-draft disposal without selecting or placing a Model. */
import { Trash2 } from 'lucide-react';
import type { CanvasExplorerCopy } from './CanvasExplorer.types';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import styles from './CanvasExplorer.module.css';

export function CanvasExplorerRemoveEmptyModelAction({
  item,
  copy,
  disabled,
  onRemove,
}: Readonly<{
  item: CanvasExplorerItem;
  copy: CanvasExplorerCopy;
  disabled?: boolean;
  onRemove?: (id: string) => void;
}>): JSX.Element | null {
  if (!item.emptyDefinition || onRemove == null) return null;
  const label = `${copy.deleteEmptyModel}: ${item.label}`;
  return (
    <button
      type="button"
      className={styles.headerAction}
      data-slot="canvas-explorer-remove-empty-model"
      data-model-id={item.id}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onRemove(item.id);
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Trash2 aria-hidden="true" />
    </button>
  );
}
