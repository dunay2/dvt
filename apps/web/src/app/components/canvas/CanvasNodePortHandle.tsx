/** Owned concern: render a graph node port handle with Canvas-owned presentation tokens. */
import { Handle, Position } from '@xyflow/react';
import { Fragment, useId } from 'react';

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

function resolveCompatibilityHintText(
  compatibility: CanvasNodePortCompatibilityView | undefined
): string | null {
  if (compatibility == null) {
    return null;
  }
  if (compatibility.compatibleNodeNames.length > 0) {
    return compatibility.compatibleNodeNames.join(', ');
  }
  return compatibility.description;
}

export function CanvasNodePortHandle({
  kind,
  id,
  tone = 'control',
  label,
  compatibility,
}: CanvasNodePortHandleProps): JSX.Element {
  const generatedHintId = useId();
  const compatibilityHintText = resolveCompatibilityHintText(compatibility);
  const compatibilityHintId =
    compatibilityHintText == null ? undefined : `${generatedHintId}-compatibility`;

  return (
    <Fragment>
      <Handle
        id={id}
        type={kind}
        position={kind === 'source' ? Position.Right : Position.Left}
        data-slot="canvas-node-port-handle"
        data-port={kind}
        data-tone={tone}
        data-port-compatibility={compatibility?.state}
        aria-label={label}
        aria-describedby={compatibilityHintId}
        tabIndex={0}
        title={compatibility?.description}
        className={styles.portHandle}
      />
      {compatibilityHintText == null || compatibility == null ? null : (
        <span
          id={compatibilityHintId}
          data-slot="canvas-node-port-compatibility-hint"
          data-port={kind}
          data-port-compatibility={compatibility.state}
          className={styles.portCompatibilityHint}
        >
          {compatibilityHintText}
        </span>
      )}
    </Fragment>
  );
}
