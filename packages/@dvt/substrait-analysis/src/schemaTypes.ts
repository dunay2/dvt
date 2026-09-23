/** Derived facts retain canonical Substrait types; they do not admit execution. */
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone } from '@bufbuild/protobuf';

import { SubstraitAnalysisError } from './document.js';

export type SchemaField = Readonly<{
  type: Type;
  /** Field dependencies of this value; row dependencies remain in the relation index. */
  sourceFieldIds: readonly string[];
}>;

export function invalidSchema(message: string): never {
  throw new SubstraitAnalysisError('invalid_structure', message);
}

export function requireSchemaType(type: Type | undefined): Type {
  if (type?.kind.case == null || type.kind.case === 'alias') {
    return invalidSchema('A resolved Substrait output type is required.');
  }
  return type;
}

export function isSchemaTypeNullable(type: Type): boolean {
  const value = requireSchemaType(type).kind.value;
  return (
    value == null || !('nullability' in value) || value.nullability !== Type_Nullability.REQUIRED
  );
}

export function withSchemaNullability(field: SchemaField, nullable: boolean): SchemaField {
  if (field.type.kind.case === 'unbound') return field;
  const type = clone(TypeSchema, requireSchemaType(field.type));
  const value = type.kind.value;
  if (value == null || !('nullability' in value))
    return invalidSchema('Type nullability is unavailable.');
  value.nullability = nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED;
  return { ...field, type };
}

export function schemaFieldAt(fields: readonly SchemaField[], ordinal: number): SchemaField {
  if (!Number.isInteger(ordinal) || ordinal < 0 || fields[ordinal] == null) {
    return invalidSchema('A field ordinal is outside its relation scope.');
  }
  return fields[ordinal]!;
}
