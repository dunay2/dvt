import {
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_StringSchema,
  Type_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

describe('pinned Substrait structured-field capability', () => {
  it('round-trips ordered child types and their nullability without a private encoding', () => {
    const structuredType = create(TypeSchema, {
      kind: {
        case: 'struct',
        value: create(Type_StructSchema, {
          nullability: Type_Nullability.NULLABLE,
          types: [
            create(TypeSchema, {
              kind: {
                case: 'string',
                value: create(Type_StringSchema, {
                  nullability: Type_Nullability.REQUIRED,
                }),
              },
            }),
            create(TypeSchema, {
              kind: {
                case: 'i64',
                value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
              },
            }),
          ],
        }),
      },
    });

    const decoded = fromBinary(TypeSchema, toBinary(TypeSchema, structuredType));

    expect(decoded.kind.case).toBe('struct');
    if (decoded.kind.case !== 'struct') return;
    expect(decoded.kind.value.types.map((child) => child.kind.case)).toEqual(['string', 'i64']);
    expect(decoded.kind.value.types.map((child) => child.kind.value?.nullability)).toEqual([
      Type_Nullability.REQUIRED,
      Type_Nullability.NULLABLE,
    ]);
  });
});
