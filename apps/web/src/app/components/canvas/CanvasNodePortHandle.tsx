/** Owned concern: render a graph node port handle with Canvas-owned presentation tokens. */
import { Handle, Position } from '@xyflow/react';

import styles from './CanvasNodeShell.module.css';

export type CanvasNodePortHandleKind = 'source' | 'target';
export type CanvasNodePortTone = 'source' | 'model' | 'test' | 'output' | 'control';
export type CanvasNodePortCompatibilityView = Readonly<{
  state: 'available' | 'blocked' | 'unavailable';
  compatibleNodeNames: readonly string[];
  description: string;
}>;

type CanvasNodePortHandleProps = Readonly<{
  kind: CanvasNodePortHandleKind;
  id?: string;
  tone?: CanvasNodePortTone;
  label?: string;
  compatibility?: CanvasNodePortCompatibilityView;
}>;

export function CanvasNodePortHandle({
  kind,
  id,
  tone = 'control',
  label,
  compatibility,
}: CanvasNodePortHandleProps): JSX.Element {
  return (
    <Handle
      id={id}
      type={kind}
      position={kind === 'source' ? Position.Right : Position.Left}
      data-slot="canvas-node-port-handle"
      data-port={kind}
      data-tone={tone}
      data-port-compatibility={compatibility?.state}
      aria-label={label}
      title={compatibility?.description}
      className={styles.portHandle}
    />
  );
}
