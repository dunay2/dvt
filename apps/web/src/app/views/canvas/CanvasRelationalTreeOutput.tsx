/** Presentation-only terminal for the model output in a relational layout. */
import { Table2 } from 'lucide-react';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  type CanvasRelationalTreeLayout,
} from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { readCanvasRelationalRelationDrag } from './canvasRelationalTreeDrag';
import { RelationalConnectionMenu } from './relational-layout/RelationalConnectionMenu';
import styles from './CanvasRelationalTreeOutput.module.css';
import portStyles from './CanvasRelationalPorts.module.css';

export function CanvasRelationalTreeOutput({
  output,
  outputName,
  copy,
  onOpen,
  connected,
  selectedSource,
  onConnect,
  onDisconnect,
  movable,
}: Readonly<{
  output: NonNullable<CanvasRelationalTreeLayout['output']>;
  outputName: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onOpen?: () => void;
  connected: boolean;
  selectedSource: string | null;
  onConnect?: (relationId: string) => void;
  onDisconnect?: () => void;
  movable: boolean;
}>): JSX.Element {
  const content = (
    <>
      <Table2 aria-hidden="true" className={styles.icon} />
      <span className={styles.identity}>
        <span className={styles.name}>{outputName}</span>
        <span className={styles.label}>{copy.relationalTreeOutputLabel}</span>
      </span>
    </>
  );
  const inputPort = (
    <button
      type="button"
      data-slot="canvas-relational-output-input-port"
      data-connected={connected || undefined}
      aria-label={copy.relationalTreePrimaryInputLabel}
      aria-keyshortcuts="Delete Backspace"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        if (connected) onOpen?.();
        else if (selectedSource != null) onConnect?.(selectedSource);
      }}
      onKeyDown={(event) => {
        if (!connected || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
        event.preventDefault();
        event.stopPropagation();
        onDisconnect?.();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'link';
      }}
      onDrop={(event) => {
        const relationId = readCanvasRelationalRelationDrag(event.dataTransfer);
        if (relationId == null) return;
        event.preventDefault();
        event.stopPropagation();
        onConnect?.(relationId);
      }}
      className={portStyles.centeredInputPort}
    />
  );
  return (
    <div
      data-slot="canvas-relational-tree-output"
      data-relational-card-id={CANVAS_RELATIONAL_OUTPUT_POSITION_ID}
      data-movable={movable}
      className={styles.root}
      style={{ left: output.x, top: output.y, width: output.width, height: output.height }}
    >
      {onOpen == null ? (
        content
      ) : (
        <button
          type="button"
          data-slot="canvas-relational-tree-output-open"
          aria-label={`${outputName} · ${copy.relationalTreeOutputLabel}`}
          onClick={onOpen}
          className={styles.open}
        >
          {content}
        </button>
      )}
      {onConnect == null && onDisconnect == null ? null : connected && onDisconnect != null ? (
        <RelationalConnectionMenu
          removeLabel={copy.canvasContextMenuRemoveEdgeLabel}
          onDisconnect={onDisconnect}
        >
          {inputPort}
        </RelationalConnectionMenu>
      ) : (
        inputPort
      )}
    </div>
  );
}
