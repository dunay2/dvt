/** Literal type construction uses the pinned protobuf; unsupported kinds fail closed. */
import type { Expression_Literal } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';

import { invalidSchema, isSchemaTypeNullable, requireSchemaType } from './schemaTypes.js';

export function deriveLiteralType(literal: Expression_Literal): Type {
  const attributes = {
    nullability: literal.nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
    typeVariationReference: literal.typeVariationReference,
  };
  const value = literal.literalType;
  switch (value.case) {
    case 'string':
    case 'i64':
    case 'fp64':
      return create(TypeSchema, { kind: { case: value.case, value: attributes } });
    case 'boolean':
      return create(TypeSchema, { kind: { case: 'bool', value: attributes } });
    case 'precisionTimestampTz':
      return create(TypeSchema, {
        kind: { case: value.case, value: { ...attributes, precision: value.value.precision } },
      });
    case 'null': {
      const type = requireSchemaType(value.value);
      if (!isSchemaTypeNullable(type))
        return invalidSchema('A null literal cannot declare a required type.');
      return type;
    }
    default:
      return invalidSchema('Literal type is outside the supported schema profile.');
  }
}
