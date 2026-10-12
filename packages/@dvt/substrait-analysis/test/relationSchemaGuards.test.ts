import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { deriveSubstraitSchemas } from '../src/relationSchema.js';
import { isSchemaTypeNullable } from '../src/schemaTypes.js';

import { relationsFixture } from './relationsFixture.js';

describe('schema derivation boundaries', () => {
  it.each(['kind', 'variation', 'width', 'unbound'] as const)(
    'rejects SET input %s mismatches instead of coercing them',
    (mismatch) => {
      const f = relationsFixture();
      const left = f.read();
      const right = f.read();
      if (right.relType.case !== 'read') throw new Error('Expected read');
      const type = right.relType.value.baseSchema!.struct!.types[0]!;
      if (type.kind.case !== 'i64') throw new Error('Expected i64');
      if (mismatch === 'kind')
        type.kind = {
          case: 'fp64',
          value: { ...type.kind.value, $typeName: 'substrait.Type.FP64' },
        };
      if (mismatch === 'variation' && type.kind.case === 'i64')
        type.kind.value.typeVariationReference = 17;
      if (mismatch === 'unbound')
        type.kind = { case: 'unbound', value: { $typeName: 'substrait.Type.Unbound' } };
      const second = mismatch === 'width' ? f.unary('project', right, [0, 0]) : right;
      const root = f.combine('set', [left, second]);
      expect(() => deriveSubstraitSchemas(f.document(root))).toThrow(
        expect.objectContaining({ code: 'invalid_structure' })
      );
    }
  );

  it('preserves an explicit unknown type without fabricating type or nullability', () => {
    const f = relationsFixture();
    const read = f.read();
    if (read.relType.case !== 'read') throw new Error('Expected read');
    const unknown = create(TypeSchema, { kind: { case: 'unbound', value: {} } });
    read.relType.value.baseSchema!.struct!.types = [unknown];
    const result = deriveSubstraitSchemas(f.document(f.unary('project', read)));
    const type = result.schemas.get(result.index.rootId)![0]!.type;
    expect(type).toBe(unknown);
    expect(isSchemaTypeNullable(type)).toBe(true);
  });

  it('does not use presentation aliases as schema admission rules', () => {
    const f = relationsFixture();
    const document = f.document(f.combine('cross', [f.read(), f.read()], [0, 1]));
    const before = deriveSubstraitSchemas(document);
    for (const binding of document.sidecar.relations) binding.displayName = 'Any business label';
    const after = deriveSubstraitSchemas(document);
    expect(after.schemas).toEqual(before.schemas);
  });

  it('does not silently lose dependencies when a source field identity is absent', () => {
    const f = relationsFixture();
    const document = f.document(f.unary('project', f.read()));
    document.sidecar.fields = document.sidecar.fields.filter((field) => field.relationId !== 'r1');
    expect(() => deriveSubstraitSchemas(document)).toThrow(
      expect.objectContaining({ code: 'invalid_structure' })
    );
  });

  it('supports an empty output and repeated emission without inventing another relation', () => {
    const f = relationsFixture();
    const repeated = f.unary('project', f.read(), [0, 0]);
    const document = f.document(f.unary('project', repeated, []));
    const { schemas, index } = deriveSubstraitSchemas(document);
    expect(schemas.get('r2')).toHaveLength(2);
    expect(schemas.get('r2')![0]).toEqual(schemas.get('r2')![1]);
    expect(schemas.get(index.rootId)).toEqual([]);
  });
});
