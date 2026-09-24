/** Schema derivation is not execution admission: it neither grants provider capability nor checks a saved revision. */
import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import {
  indexSubstraitRelations,
  type SubstraitRelationIndex,
  type IndexedRelation,
} from './relationIndex.js';
import { readRelationStructure } from './relationStructure.js';
import { bindSchemaFields, schemaNameCount } from './schemaHierarchy.js';
import { deriveOperatorSchema } from './schemaOperators.js';
import { invalidSchema, schemaFieldAt, type SchemaField } from './schemaTypes.js';

export type SubstraitSchemas = Readonly<{
  index: SubstraitRelationIndex;
  schemas: ReadonlyMap<string, readonly SchemaField[]>;
}>;

export function deriveRelationSchema(
  entry: IndexedRelation,
  inputs: readonly (readonly SchemaField[])[]
): readonly SchemaField[] {
  try {
    const derived = deriveOperatorSchema(entry, inputs);
    const { common } = readRelationStructure(entry.relation);
    const outputs =
      common?.emitKind.case === 'emit'
        ? common.emitKind.value.outputMapping.map((ordinal) => schemaFieldAt(derived, ordinal))
        : derived;
    bindSchemaFields(outputs, entry.fields);
    return outputs;
  } catch (error) {
    if (!(error instanceof SubstraitAnalysisError)) throw error;
    throw new SubstraitAnalysisError(error.code, error.message, entry.binding.relationId);
  }
}

export function deriveSubstraitSchemas(document: SubstraitDocument): SubstraitSchemas {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const { index } = indexed;
  const schemas = new Map<string, readonly SchemaField[]>();
  for (const id of index.postorder) {
    const entry = index.relations.get(id)!;
    schemas.set(
      id,
      deriveRelationSchema(
        entry,
        entry.inputs.map((inputId) => schemas.get(inputId)!)
      )
    );
  }
  const root = document.plan.relations[0]!.relType;
  if (
    root.case !== 'root' ||
    root.value.names.length !==
      schemaNameCount(schemas.get(index.rootId)!.map((field) => field.type))
  ) {
    return invalidSchema('Root names do not match the derived output width.');
  }
  return { index, schemas };
}
