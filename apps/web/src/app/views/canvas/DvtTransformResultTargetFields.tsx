/** Passive explicit Transform destination presentation. */
import type { DvtDestinationBinding } from './dvtDestinationBinding';
import { DvtPostgresDestinationFields } from './DvtPostgresDestinationFields';
import type { CanvasViewCopy } from './canvasCopy.types';

export function DvtTransformResultTargetFields({
  binding,
  copy,
}: Readonly<{ binding: DvtDestinationBinding; copy: CanvasViewCopy }>): JSX.Element {
  return (
    <DvtPostgresDestinationFields binding={binding} namespace="dvt-transform-result" copy={copy} />
  );
}
