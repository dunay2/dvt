/** Reconcile an admitted SQL projection with its authoritative Substrait output schema. */
import {
  deriveSubstraitSchemas,
  isSchemaTypeNullable,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import type { DvtPostgresTransformProjection } from './dvtPostgresTransformProjection.js';

export function withSubstraitOutputSchema(
  document: SubstraitDocument,
  projection: DvtPostgresTransformProjection
): DvtPostgresTransformProjection {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const fields = schemas.get(index.rootId)!;
  const root = document.plan.relations[0]!.relType;
  if (
    root.case !== 'root' ||
    projection.outputs.length !== fields.length ||
    projection.outputs.some(
      (field, ordinal) =>
        field.name !== root.value.names[ordinal] || field.outputOrdinal !== ordinal
    )
  ) {
    throw new Error('PostgreSQL output bindings differ from the canonical Substrait schema.');
  }
  return {
    ...projection,
    outputs: fields.map((field, outputOrdinal) => ({
      name: root.value.names[outputOrdinal]!,
      outputOrdinal,
      dataType: field.type.kind.case === 'unbound' ? 'unknown' : field.type.kind.case!,
      nullable: isSchemaTypeNullable(field.type),
    })),
  };
}
