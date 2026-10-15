/** Passive Transform disposition selector. */
import type { DvtDestinationChoiceBinding } from './dvtDestinationBinding';
import { DvtDestinationChoiceField } from './DvtPostgresDestinationFields';
import type { CanvasViewCopy } from './canvasCopy.types';

export function DvtTransformMaterializationField({
  binding,
  copy,
}: Readonly<{ binding: DvtDestinationChoiceBinding; copy: CanvasViewCopy }>): JSX.Element {
  return (
    <DvtDestinationChoiceField
      binding={binding}
      name="dvt-transform-materialization"
      label={copy.inspectorDvtMaterializationLabel}
      copy={copy}
    />
  );
}
