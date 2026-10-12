/** Create one physical or published-producer Read; never copy producer operations. */
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
  type DvtInputBindingsV1,
} from '@dvt/contracts';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createProducerInput, type IndexedRelation } from '@dvt/substrait-analysis';

export type ConnectedRelationSource = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
}>;
export type CanvasRelationInputSource =
  | ConnectedRelationSource
  | Pick<
      Extract<CanvasDvtCompositionInput, { sourceRef: null }>,
      'nodeId' | 'schema' | 'table' | 'sourceRef' | 'producer'
    >;
export type SourceRelationInput<
  Source extends CanvasRelationInputSource = ConnectedRelationSource,
> = Readonly<{
  source: Source;
  fields: readonly string[];
  fieldIds?: readonly string[];
  fieldTypes?: readonly (DvtSubstraitJoinDataType | null)[];
  fieldNullabilities?: readonly boolean[];
  inputBindings?: DvtInputBindingsV1;
}>;

export function toSourceRelationInput(
  input: CanvasDvtCompositionInput
): SourceRelationInput<CanvasRelationInputSource> {
  return {
    source: input,
    fields: input.fields.map((field) => field.name),
    fieldIds: input.fields.map((field) => field.id ?? field.name),
    fieldTypes: input.fields.map((field) => field.joinDataType),
    fieldNullabilities: input.fields.map((field) => field.nullable ?? true),
    ...(input.inputBindings == null ? {} : { inputBindings: input.inputBindings }),
  };
}

/** An explicit operation owns a local Read; producer operations stay in their own model. */
export function createCanvasInputRead(
  input: CanvasDvtCompositionInput,
  relAnchor: number
): Pick<IndexedRelation, 'relation' | 'fields'> & {
  binding: IndexedRelation['binding'] & { displayName: string };
} {
  return createSourceRelation(toSourceRelationInput(input), relAnchor);
}

export function canvasInputConnection(source: CanvasRelationInputSource) {
  return source.sourceRef == null ? source.producer.connection : source.sourceRef.connectionRef;
}

export function sourceFieldType(
  dataType: DvtSubstraitJoinDataType | null,
  nullable: boolean
): Type {
  if (dataType === null) return create(TypeSchema, { kind: { case: 'unbound', value: {} } });
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

export function createSourceRelation(
  input: SourceRelationInput<CanvasRelationInputSource>,
  relAnchor: number
): Pick<IndexedRelation, 'relation'> & {
  binding: IndexedRelation['binding'] & { displayName: string };
  fields: (IndexedRelation['fields'][number] & { displayName: string })[];
} {
  if (input.source.sourceRef == null) {
    const read = createProducerInput(input.source.producer, relAnchor);
    return {
      ...read,
      binding: { ...read.binding, displayName: input.source.table },
      fields: read.fields.map((field) => ({
        ...field,
        displayName: field.displayName ?? field.fieldId,
      })),
    };
  }
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
                input.fieldTypes === undefined ? 'string' : input.fieldTypes[ordinal]!,
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
