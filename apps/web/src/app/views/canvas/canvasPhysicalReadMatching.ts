/** Own exact physical publication identity and schema matching without binding or identity allocation. */
import type { ReadRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { IndexedRelation } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasSourceReferenceKey } from './canvasRelationalAnalysis';

function physicalReadSchemaMatches(
  schema: ReadRel['baseSchema'],
  fields: CanvasDvtCompositionInput['fields']
): boolean {
  if (schema?.names.length !== fields.length) return false;
  return fields.every((field, ordinal) => {
    if (field.name !== schema.names[ordinal]) return false;
    const type = schema.struct?.types[ordinal]?.kind;
    return type?.case === 'unbound' || type?.case === field.joinDataType;
  });
}

export function physicalReadMatches(
  entry: IndexedRelation,
  source: CanvasDvtCompositionInput
): boolean {
  const read = entry.relation.relType;
  if (read.case !== 'read') return false;
  if (read.value.readType.case !== 'namedTable') return false;
  if (!physicalReadIdentityMatches(entry, source)) return false;
  const namesMatch =
    JSON.stringify(read.value.readType.value.names) ===
    JSON.stringify([source.schema, source.table]);
  return namesMatch && physicalReadSchemaMatches(read.value.baseSchema, source.fields);
}

function physicalReadIdentityMatches(
  entry: IndexedRelation,
  source: CanvasDvtCompositionInput
): boolean {
  if (source.sourceRef == null || entry.binding.sourceRef == null) return false;
  return (
    canvasSourceReferenceKey(entry.binding.sourceRef) === canvasSourceReferenceKey(source.sourceRef)
  );
}
