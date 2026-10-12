/** Bind emit slots by ordinal path, independent of sidecar storage order or operand shape. */
import { allocateDvtFieldId, type DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { readRelationStructure, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

type Fields = readonly DvtSubstraitFieldBindingV1[];

export function relationOutputMapping(relation: Rel, width: number): readonly number[] {
  const emit = readRelationStructure(relation).common?.emitKind;
  return emit?.case === 'emit'
    ? emit.value.outputMapping
    : Array.from({ length: width }, (_, i) => i);
}

export function relationOutputField(
  relation: Rel,
  fields: Fields,
  naturalOrdinal: number,
  width: number
) {
  const outputOrdinal = relationOutputMapping(relation, width).indexOf(naturalOrdinal);
  return fields.find(
    (field) => field.parentFieldId == null && field.outputOrdinal === outputOrdinal
  );
}

export function bindRelationOutputs(
  relationId: string,
  natural: Fields,
  mapping: readonly number[],
  previous: Fields = []
): DvtSubstraitFieldBindingV1[] {
  const children = (fields: Fields, parentId?: string) =>
    fields.filter((field) => field.parentFieldId === parentId);
  const roots = children(natural);
  const result: DvtSubstraitFieldBindingV1[] = [];
  const bind = (
    field: DvtSubstraitFieldBindingV1,
    ordinal: number,
    siblings: Fields,
    parentId?: string
  ) => {
    const prior = siblings.find((item) => item.outputOrdinal === ordinal);
    const { parentFieldId: _parent, ...value } = field;
    const bound = {
      ...value,
      fieldId: prior?.fieldId ?? allocateDvtFieldId(),
      relationId,
      outputOrdinal: ordinal,
      ...(parentId == null ? {} : { parentFieldId: parentId }),
    };
    result.push(bound);
    for (const child of children(natural, field.fieldId))
      bind(
        child,
        child.outputOrdinal,
        prior == null ? [] : children(previous, prior.fieldId),
        bound.fieldId
      );
  };
  mapping.forEach((slot, ordinal) => {
    const field = roots.find((item) => item.outputOrdinal === slot);
    if (field == null)
      throw new SubstraitAnalysisError('invalid_binding', 'Emit references an unavailable output.');
    bind(field, ordinal, children(previous));
  });
  return result;
}
