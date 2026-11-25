/** Validate the pinned, required scalar values of a single literal model row. */
import type {
  Expression,
  ReadRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { z } from 'zod';

import {
  DvtStringLiteralV1Schema,
  PostgresIdentifierV1Schema,
} from './CanvasAuthoringFieldPolicy.v1.js';

const requiredScalar = z.object({
  nullability: z.literal(Type_Nullability.REQUIRED),
  typeVariationReference: z.literal(0),
});
const validLiteralValue = z.discriminatedUnion('case', [
  z.object({ case: z.literal('i32'), value: z.int32() }),
  z.object({ case: z.literal('boolean'), value: z.boolean() }),
  z.object({ case: z.literal('string'), value: DvtStringLiteralV1Schema }),
]);
const literalKinds = { i32: 'i32', boolean: 'bool', string: 'string' } as const;

function matchesRequiredLiteral(expression: Expression, type: Type): boolean {
  if (expression.rexType.case !== 'literal') return false;
  const literal = expression.rexType.value;
  if (literal.nullable || literal.typeVariationReference !== 0) return false;
  const value = validLiteralValue.safeParse(literal.literalType);
  if (!value.success || !requiredScalar.safeParse(type.kind.value).success) return false;
  return literalKinds[value.data.case] === type.kind.case;
}

export function isDvtSubstraitLiteralRowValuesV1(read: ReadRel, names: readonly string[]): boolean {
  const schema = read.baseSchema;
  if (!schema?.struct) return false;
  if (read.readType.case !== 'virtualTable') return false;
  if (!requiredScalar.safeParse(schema.struct).success) return false;
  const rows = read.readType.value.expressions;
  if (rows.length !== 1) return false;
  return matchesSchemaColumns(rows[0]!.fields, schema.struct.types, schema.names, names);
}

function validNames(names: readonly string[]): boolean {
  return (
    names.length > 0 &&
    new Set(names).size === names.length &&
    names.every((name) => PostgresIdentifierV1Schema.safeParse(name).success)
  );
}

function matchesSchemaColumns(
  fields: readonly Expression[],
  types: readonly Type[],
  schemaNames: readonly string[],
  names: readonly string[]
): boolean {
  if (!validNames(names)) return false;
  if (![fields, types, schemaNames].every((columns) => columns.length === names.length))
    return false;
  return (
    fields.every((field, index) => matchesRequiredLiteral(field, types[index]!)) &&
    schemaNames.every((name, index) => name === names[index])
  );
}
