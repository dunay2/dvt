/** Owned concern: create a canonical pass-through projection for one Source operand. */
import { allocateDvtFieldId } from '@dvt/contracts';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  createDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

export function createCanvasRelationalTreeProjectionDraft(
  args: Readonly<{ input: CanvasDvtCompositionInput; targetNodeId: string }>
): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: args.input.nodeId,
      schema: args.input.schema,
      table: args.input.table,
      sourceRef: args.input.sourceRef,
      fields: args.input.fields.map(({ name, dataType }) => ({ name, dataType })),
    },
    targetNodeId: args.targetNodeId,
    outputs: args.input.fields.map((field) => ({
      fieldId: allocateDvtFieldId(),
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
}
