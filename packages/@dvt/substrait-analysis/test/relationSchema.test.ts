import {
  JoinRel_JoinType,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { describe, expect, it } from 'vitest';

import { deriveSubstraitSchemas } from '../src/relationSchema.js';

import { relationsFixture } from './relationsFixture.js';

describe('Substrait output schema composition', () => {
  it.each(['cross', 'join', 'set'] as const)(
    'resolves transformed inputs on either %s port',
    (kind) => {
      const f = relationsFixture();
      const left = f.unary('filter', f.unary('project', f.read()));
      const right = f.unary('project', f.unary('filter', f.read()));
      const root = f.combine(kind, [left, right], kind === 'set' ? [0] : [1, 0]);
      const document = f.document(root);
      const before = globalThis.structuredClone(document);
      const result = deriveSubstraitSchemas(document);
      const fields = result.schemas.get(result.index.rootId)!;
      expect(fields.map((field) => field.type.kind.case)).toEqual(
        kind === 'set' ? ['i64'] : ['i64', 'i64']
      );
      expect(fields.map((field) => field.sourceFieldIds)).toEqual(
        kind === 'set' ? [['f1', 'f4']] : [['f4'], ['f1']]
      );
      expect(document).toEqual(before);
    }
  );

  it.each([
    [JoinRel_JoinType.INNER, [false, false]],
    [JoinRel_JoinType.LEFT, [false, true]],
    [JoinRel_JoinType.RIGHT, [true, false]],
    [JoinRel_JoinType.OUTER, [true, true]],
  ] as const)('preserves port-sensitive nullability for join type %s', (type, nullable) => {
    const f = relationsFixture();
    const root = f.combine('join', [f.read(), f.read()], [0, 1]);
    if (root.relType.case !== 'join') throw new Error('Expected join');
    root.relType.value.type = type;
    const result = deriveSubstraitSchemas(f.document(root));
    expect(
      result.schemas
        .get(result.index.rootId)!
        .map(
          ({ type: output }) =>
            output.kind.case === 'i64' &&
            output.kind.value.nullability === Type_Nullability.NULLABLE
        )
    ).toEqual(nullable);
  });

  it.each([
    [JoinRel_JoinType.LEFT_SEMI, 'f1'],
    [JoinRel_JoinType.LEFT_ANTI, 'f1'],
    [JoinRel_JoinType.RIGHT_SEMI, 'f2'],
    [JoinRel_JoinType.RIGHT_ANTI, 'f2'],
  ] as const)('retains only the specified side for join type %s', (type, origin) => {
    const f = relationsFixture();
    const root = f.combine('join', [f.read(), f.read()]);
    if (root.relType.case !== 'join') throw new Error('Expected join');
    root.relType.value.type = type;
    const result = deriveSubstraitSchemas(f.document(root));
    expect(result.schemas.get(result.index.rootId)!.map((field) => field.sourceFieldIds)).toEqual([
      [origin],
    ]);
  });

  it.each([
    [SetRel_SetOp.UNION_ALL, true],
    [SetRel_SetOp.UNION_DISTINCT, true],
    [SetRel_SetOp.INTERSECTION_MULTISET, false],
    [SetRel_SetOp.INTERSECTION_MULTISET_ALL, false],
    [SetRel_SetOp.MINUS_PRIMARY, false],
    [SetRel_SetOp.MINUS_PRIMARY_ALL, false],
  ] as const)('derives SET nullability by operation %s, not input names', (op, nullable) => {
    const f = relationsFixture();
    const left = f.read();
    const right = f.read();
    if (right.relType.case !== 'read') throw new Error('Expected read');
    const type = right.relType.value.baseSchema!.struct!.types[0]!;
    if (type.kind.case !== 'i64') throw new Error('Expected i64');
    type.kind.value.nullability = Type_Nullability.NULLABLE;
    right.relType.value.baseSchema!.names = ['another_name'];
    const root = f.combine('set', [left, right]);
    if (root.relType.case !== 'set') throw new Error('Expected set');
    root.relType.value.op = op;
    const result = deriveSubstraitSchemas(f.document(root));
    expect(result.schemas.get(result.index.rootId)![0]!.type.kind.value).toMatchObject({
      nullability: nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
    });
  });

  it.each([-1, 2])('rejects an out-of-scope emit ordinal %s', (ordinal) => {
    const f = relationsFixture();
    const root = f.combine('cross', [f.read(), f.read()], [ordinal]);
    expect(() => deriveSubstraitSchemas(f.document(root))).toThrow(
      expect.objectContaining({ code: 'invalid_structure', relationId: 'r3' })
    );
  });

  it('does not confuse repeated use of a physical source with field identity', () => {
    const f = relationsFixture();
    const root = f.combine('cross', [f.read(), f.read()], [0, 1]);
    const result = deriveSubstraitSchemas(f.document(root));
    expect(result.schemas.get(result.index.rootId)!.map((field) => field.sourceFieldIds)).toEqual([
      ['f1'],
      ['f2'],
    ]);
  });

  it('derives deep plans without recursive relation traversal', () => {
    const f = relationsFixture();
    let root = f.read();
    for (let depth = 0; depth < 3500; depth += 1) root = f.unary('fetch', root);
    const result = deriveSubstraitSchemas(f.document(root));
    expect(result.schemas.size).toBe(3501);
    expect(result.schemas.get(result.index.rootId)![0]!.sourceFieldIds).toEqual(['f1']);
  });
});
