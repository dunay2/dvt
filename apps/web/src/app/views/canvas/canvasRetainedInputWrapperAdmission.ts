/**
 * Owned concern: admit transparent unary chains anchored to an exact retained producer.
 * @baseline ADR-0064: FieldId and provenance, never display names alone, establish identity.
 * @decision Validate canonical schemas and one-to-one lineage at each Sort/Fetch hop.
 * @consequence Different producers and changed output contracts remain non-executable.
 * @version 1.0.0
 */
import { equals } from '@bufbuild/protobuf';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  deriveSubstraitSchemas,
  indexSubstraitRelations,
  readRelationStructure,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { canvasCanonicalProducerIdentity } from './canvasCanonicalProducerIdentity';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';
import { selectedSortDirections } from './canvasSelectedRelationSortFetch';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

function hasAdmittedParameters(wrapper: IndexedRelation, width: number): boolean {
  const variant = wrapper.relation.relType;
  if (variant.case === 'sort') {
    const ordinals = variant.value.sorts.map((sort) =>
      dvtSubstraitExpression.fieldOrdinal(sort.expr)
    );
    return (
      ordinals.length > 0 &&
      new Set(ordinals).size === ordinals.length &&
      ordinals.every((ordinal) => ordinal != null && ordinal >= 0 && ordinal < width) &&
      variant.value.sorts.every(
        (sort) =>
          sort.sortKind.case === 'direction' && selectedSortDirections.has(sort.sortKind.value)
      )
    );
  }
  if (variant.case !== 'fetch') return false;
  return [variant.value.offsetExpr, variant.value.countExpr].every((expr) => {
    if (expr == null) return true;
    const literal = expr.rexType;
    if (literal.case !== 'literal' || literal.value.literalType.case !== 'i64') return false;
    const value = literal.value.literalType.value;
    return value >= 0n && BigInt.asIntN(64, value) === value;
  });
}

function preservesBindings(input: IndexedRelation, wrapper: IndexedRelation): boolean {
  const outputs = new Map(wrapper.fields.map((field) => [field.sourceFieldId, field]));
  return (
    outputs.size === input.fields.length &&
    wrapper.fields.length === input.fields.length &&
    input.fields.every((field) => {
      const output = outputs.get(field.fieldId);
      return (
        output != null &&
        output.fieldId !== field.fieldId &&
        output.outputOrdinal === field.outputOrdinal &&
        output.displayName === field.displayName &&
        output.description === field.description &&
        output.operandFieldIds == null &&
        output.parentFieldId ===
          (field.parentFieldId == null ? undefined : outputs.get(field.parentFieldId)?.fieldId)
      );
    })
  );
}

function isTransparent(wrapper: IndexedRelation, input: IndexedRelation): boolean {
  const variant = wrapper.relation.relType;
  if (variant.case !== 'sort' && variant.case !== 'fetch') return false;
  const common = readRelationStructure(wrapper.relation).common;
  if (
    common?.hint != null ||
    common?.advancedExtension != null ||
    variant.value.advancedExtension != null
  )
    return false;
  const emit = common?.emitKind;
  const width = input.fields.filter((field) => field.parentFieldId == null).length;
  if (
    emit?.case === 'emit' &&
    (emit.value.outputMapping.length !== width ||
      emit.value.outputMapping.some((ordinal, index) => ordinal !== index))
  )
    return false;
  return hasAdmittedParameters(wrapper, width) && preservesBindings(input, wrapper);
}

export function admitCanvasRetainedInputWrappers(
  saved: SubstraitDocument,
  originalId: string,
  producer: SubstraitDocument,
  producerId: string
): readonly IndexedRelation[] | null {
  const original = projectCanvasStagedDocument(saved, originalId);
  const retained = projectCanvasStagedDocument(producer, originalId);
  const identity = original == null ? null : canvasCanonicalProducerIdentity(original);
  if (
    identity == null ||
    retained == null ||
    identity !== canvasCanonicalProducerIdentity(retained)
  )
    return null;
  const previous = indexSubstraitRelations(saved);
  if (!previous.ok) return null;
  const { index, schemas } = deriveSubstraitSchemas(producer);
  if (index.rootId !== producerId) return null;
  const chain: IndexedRelation[] = [];
  let id = producerId;
  while (id !== originalId) {
    const wrapper = index.relations.get(id)!;
    if (previous.index.relations.has(id) || wrapper.inputs.length !== 1) return null;
    const input = index.relations.get(wrapper.inputs[0]!)!;
    if (!isTransparent(wrapper, input)) return null;
    const before = schemas.get(input.binding.relationId)!;
    const after = schemas.get(id)!;
    if (
      before.length !== after.length ||
      before.some((field, ordinal) => !equals(TypeSchema, field.type, after[ordinal]!.type))
    )
      return null;
    chain.unshift(wrapper);
    id = input.binding.relationId;
  }
  return chain;
}
