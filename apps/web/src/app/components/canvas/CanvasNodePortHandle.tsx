/** Owned concern: render a graph node port handle with Canvas-owned presentation tokens. */
import { Handle, Position } from '@xyflow/react';

import styles from './CanvasNodeShell.module.css';

export type CanvasNodePortHandleKind = 'source' | 'target';

type CanvasNodePortHandleProps = Readonly<{
  kind: CanvasNodePortHandleKind;
}>;

export function CanvasNodePortHandle({ kind }: CanvasNodePortHandleProps): JSX.Element {
  return (
    <Handle
      type={kind}
      position={kind === 'source' ? Position.Right : Position.Left}
      data-slot="canvas-node-port-handle"
      data-port={kind}
      className={styles.portHandle}
    />
  );
}
