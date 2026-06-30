/** Owned concern: render a graph node port handle with Canvas-owned presentation tokens. */
import { Handle, Position } from '@xyflow/react';

import styles from './CanvasNodeShell.module.css';

export type CanvasNodePortHandleKind = 'source' | 'target';
export type CanvasNodePortTone = 'source' | 'model' | 'test' | 'output' | 'control';

type CanvasNodePortHandleProps = Readonly<{
  kind: CanvasNodePortHandleKind;
  id?: string;
  tone?: CanvasNodePortTone;
  label?: string;
}>;

export function CanvasNodePortHandle({
  kind,
  id,
  tone = 'control',
  label,
}: CanvasNodePortHandleProps): JSX.Element {
  return (
    <Handle
      id={id}
      type={kind}
      position={kind === 'source' ? Position.Right : Position.Left}
      data-slot="canvas-node-port-handle"
      data-port={kind}
      data-tone={tone}
      aria-label={label}
      className={styles.portHandle}
    />
  );
}
