/** Copy selected field trees while preserving source lineage in a new projection relation. */
import { allocateDvtFieldId, type DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

export function copyCanvasProjectionFieldBindings(
  source: readonly DvtSubstraitFieldBindingV1[],
  ordinals: readonly number[],
  relationId: string
): DvtSubstraitFieldBindingV1[] {
  const roots = source
    .filter((field) => field.parentFieldId == null)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const copyTree = (
    field: DvtSubstraitFieldBindingV1,
    outputOrdinal: number,
    parentFieldId?: string
  ): DvtSubstraitFieldBindingV1[] => {
    const fieldId = allocateDvtFieldId();
    return [
      {
        ...field,
        fieldId,
        relationId,
        outputOrdinal,
        sourceFieldId: field.fieldId,
        ...(parentFieldId == null ? {} : { parentFieldId }),
      },
      ...source
        .filter((child) => child.parentFieldId === field.fieldId)
        .flatMap((child) => copyTree(child, child.outputOrdinal, fieldId)),
    ];
  };
  return ordinals.flatMap((ordinal, outputOrdinal) => copyTree(roots[ordinal]!, outputOrdinal));
}
