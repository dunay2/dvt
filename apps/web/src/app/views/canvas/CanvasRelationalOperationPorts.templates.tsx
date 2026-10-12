/**
 * Owned concern: render passive, keyboard-accessible relation connection targets.
 * @baseline GH-3271-COMPOSITION-CONCERNS: cardinality and gestures have separate owners.
 * @decision Render supplied port models with semantic CSS and forwarded callbacks.
 * @consequence Markup contains no admission policy, derived state or persistence.
 * @version 1.0.0
 */
import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import styles from './CanvasRelationalPorts.module.css';

export function CanvasRelationalOperationPortsTemplate(
  props: Readonly<{
    outputLabel: string;
    selected: boolean;
    inputs: readonly Readonly<{ port: number; label: string; glyph: string; connected: boolean }>[];
    onPointerDown: (event: PointerEvent) => void;
    onOutputClick: (event: MouseEvent) => void;
    onOutputDragStart: (event: DragEvent) => void;
    onInputClick: (event: MouseEvent, port: number) => void;
    onInputDragOver: (event: DragEvent) => void;
    onInputDrop: (event: DragEvent, port: number) => void;
  }>
): JSX.Element {
  return (
    <>
      <button
        type="button"
        draggable
        data-slot="canvas-relational-output-port"
        aria-label={props.outputLabel}
        aria-pressed={props.selected}
        onPointerDown={props.onPointerDown}
        onClick={props.onOutputClick}
        onDragStart={props.onOutputDragStart}
        className={styles.outputPort}
      />
      <div className={styles.inputPorts}>
        {props.inputs.map((input) => (
          <div key={input.port} className={styles.inputSlot}>
            <button
              type="button"
              data-slot="canvas-relational-input-port"
              data-port={input.port}
              data-connected={input.connected || undefined}
              aria-label={input.label}
              title={input.label}
              onPointerDown={props.onPointerDown}
              onClick={(event) => props.onInputClick(event, input.port)}
              onDragOver={props.onInputDragOver}
              onDrop={(event) => props.onInputDrop(event, input.port)}
              className={styles.labeledInputPort}
            >
              {input.glyph}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
