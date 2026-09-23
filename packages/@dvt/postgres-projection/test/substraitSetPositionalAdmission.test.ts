import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { inspectDvtSubstraitSetDraft, projectDvtSetDraftToPostgresSql } from '../src/index.js';

import { readOccurrences, renameReadField } from './occurrenceAdmissionFixtures.js';
import { identityFixture, refreshDigest, relationRoot } from './relationIdentityFixtures.js';

describe('SET positional compatibility', () => {
  it.each([
    SetRel_SetOp.UNION_ALL,
    SetRel_SetOp.UNION_DISTINCT,
    SetRel_SetOp.INTERSECTION_MULTISET,
    SetRel_SetOp.INTERSECTION_MULTISET_ALL,
    SetRel_SetOp.MINUS_PRIMARY,
    SetRel_SetOp.MINUS_PRIMARY_ALL,
  ])('admits different input names for selector %s without changing tuple order', async (op) => {
    const draft = identityFixture('set');
    const root = relationRoot(draft);
    if (root.relType.case !== 'set') throw new Error('Set required');
    root.relType.value.op = op;
    renameReadField(draft, 1, 0, 'client_key');
    renameReadField(draft, 2, 1, 'region');

    const inspection = inspectDvtSubstraitSetDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) throw new Error('Positional set should be admitted');
    expect(inspection.projection.outputs.map((field) => field.name)).toEqual([
      'customer_id',
      'country',
    ]);
    const result = await projectDvtSetDraftToPostgresSql(draft);
    expect(result.sql).toContain('client_key AS customer_id');
    expect(result.sql).toContain('region AS country');
  });

  it('rejects equal names with incompatible positional types', () => {
    const draft = identityFixture('set');
    const rel = readOccurrences(draft)[1]!;
    if (rel.relType.case !== 'read') throw new Error('Read required');
    rel.relType.value.baseSchema!.struct!.types[0] = create(TypeSchema, {
      kind: { case: 'bool', value: { nullability: Type_Nullability.NULLABLE } },
    });
    refreshDigest(draft);
    expect(inspectDvtSubstraitSetDraft(draft).ok).toBe(false);
  });
});
