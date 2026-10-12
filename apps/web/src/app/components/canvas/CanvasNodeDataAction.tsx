/** Explicit data retrieval; selecting a card or column never runs this action. */
import { Play } from 'lucide-react';
import { canvasNodeEmbeddedControlProps } from './canvasNodeInteractionBoundary';
import styles from './CanvasNodeShell.module.css';

export function CanvasNodeDataAction({
  label,
  onExecute,
  disabled = false,
  title,
}: Readonly<{
  label: string;
  onExecute: () => void;
  disabled?: boolean;
  title?: string;
}>): JSX.Element {
  return (
    <button
      type="button"
      {...canvasNodeEmbeddedControlProps}
      data-slot="canvas-node-execute"
      disabled={disabled}
      title={title}
      className={`${styles.dataAction} nodrag nopan`}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail < 2) onExecute();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }}
    >
      <Play aria-hidden="true" className={styles.dataActionIcon} />
      {label}
    </button>
  );
}
