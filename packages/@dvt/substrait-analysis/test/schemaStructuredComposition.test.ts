import {
  ExpressionSchema,
  JoinRel_JoinType,
  RelSchema,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { deriveExpressionSchema } from '../src/schemaExpression.js';
import { deriveJoinSchema, deriveSetSchema } from '../src/schemaMultiInput.js';
import type { SchemaField } from '../src/schemaTypes.js';

const field = (id: string): SchemaField => {
  const leaf = create(TypeSchema, {
    kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } },
  });
  return {
    type: create(TypeSchema, {
      kind: { case: 'struct', value: { nullability: Type_Nullability.REQUIRED, types: [leaf] } },
    }),
    sourceFieldIds: [id],
    children: [{ type: leaf, sourceFieldIds: [id] }],
  };
};

describe('structured fields across relation ports', () => {
  it('merges each SET child dependency by ordinal without losing another operand', () => {
    const set = create(RelSchema, {
      relType: { case: 'set', value: { op: SetRel_SetOp.UNION_ALL } },
    });
    if (set.relType.case !== 'set') throw new Error('Expected set');
    const fields = deriveSetSchema(set.relType.value, [[field('left')], [field('right')]]);
    expect(fields[0]!.sourceFieldIds).toEqual(['left', 'right']);
    expect(fields[0]!.children?.[0]!.sourceFieldIds).toEqual(['left', 'right']);
  });

  it.each([JoinRel_JoinType.LEFT, JoinRel_JoinType.RIGHT])(
    'preserves nested types while selecting a null-extended JOIN side %s',
    (type) => {
      const join = create(RelSchema, { relType: { case: 'join', value: { type } } });
      if (join.relType.case !== 'join') throw new Error('Expected join');
      const fields = deriveJoinSchema(join.relType.value, [[field('left')], [field('right')]]);
      const ordinal = type === JoinRel_JoinType.LEFT ? 1 : 0;
      const selection = create(ExpressionSchema, {
        rexType: {
          case: 'selection',
          value: {
            rootType: { case: 'rootReference', value: {} },
            referenceType: {
              case: 'directReference',
              value: {
                referenceType: {
                  case: 'structField',
                  value: {
                    field: ordinal,
                    child: {
                      referenceType: { case: 'structField', value: { field: 0 } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const selected = deriveExpressionSchema(selection, fields);
      expect(selected.type.kind.value).toMatchObject({ nullability: Type_Nullability.NULLABLE });
      expect(selected.sourceFieldIds).toEqual([ordinal === 1 ? 'right' : 'left']);
      expect(fields[ordinal]!.children?.[0]!.type.kind.value).toMatchObject({
        nullability: Type_Nullability.REQUIRED,
      });
    }
  );
});
