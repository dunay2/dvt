/** Create one physical Read occurrence; identity is never inferred from a table name. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  ConnectedSourceRefSchema,
  DvtSemanticFieldNameV1Schema,
  type ConnectedSourceRef,
} from '@dvt/contracts';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

export type ConnectedRelationSource = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
}>;
export type SourceRelationInput = Readonly<{
  source: ConnectedRelationSource;
  fields: readonly string[];
  fieldTypes?: readonly DvtSubstraitJoinDataType[];
  fieldNullabilities?: readonly boolean[];
}>;

export function toSourceRelationInput(input: CanvasDvtCompositionInput): SourceRelationInput {
  if (input.fields.some((field) => field.joinDataType == null))
    throw new Error('Source fields need supported canonical types.');
  return {
    source: input,
    fields: input.fields.map((field) => field.name),
    fieldTypes: input.fields.map((field) => field.joinDataType!),
    fieldNullabilities: input.fields.map((field) => field.nullable ?? true),
  };
}

export function sourceFieldType(dataType: DvtSubstraitJoinDataType, nullable: boolean): Type {
  const nullability = nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED;
  const builders: Record<DvtSubstraitJoinDataType, () => Type> = {
    string: () => create(TypeSchema, { kind: { case: 'string', value: { nullability } } }),
    bool: () => create(TypeSchema, { kind: { case: 'bool', value: { nullability } } }),
    i64: () => create(TypeSchema, { kind: { case: 'i64', value: { nullability } } }),
    fp64: () => create(TypeSchema, { kind: { case: 'fp64', value: { nullability } } }),
    precisionTimestampTz: () =>
      create(TypeSchema, {
        kind: { case: 'precisionTimestampTz', value: { nullability, precision: 3 } },
      }),
  };
  return builders[dataType]();
}

export function createSourceRelation(input: SourceRelationInput, relAnchor: number) {
  const sourceRef = ConnectedSourceRefSchema.parse(input.source.sourceRef);
  const names = input.fields.map((name) => DvtSemanticFieldNameV1Schema.parse(name));
  if (
    names.length === 0 ||
    new Set(names).size !== names.length ||
    (input.fieldTypes != null && input.fieldTypes.length !== names.length) ||
    (input.fieldNullabilities != null && input.fieldNullabilities.length !== names.length)
  )
    throw new Error('Read fields need unique names and a complete schema.');
  const relationId = allocateDvtRelationId();
  const binding = { relationId, relAnchor, sourceRef, displayName: input.source.table };
  const fields = names.map((name, outputOrdinal) => ({
    fieldId: allocateDvtFieldId(),
    relationId,
    displayName: name,
    outputOrdinal,
  }));
  const relation = create(RelSchema, {
    relType: {
      case: 'read',
      value: {
        common: { relAnchor },
        readType: {
          case: 'namedTable',
          value: { names: [input.source.schema, input.source.table] },
        },
        baseSchema: {
          names,
          struct: {
            nullability: Type_Nullability.REQUIRED,
            types: names.map((_, ordinal) =>
              sourceFieldType(
                input.fieldTypes?.[ordinal] ?? 'string',
                input.fieldNullabilities?.[ordinal] ?? true
              )
            ),
          },
        },
      },
    },
  });
  return { relation, binding, fields };
}
