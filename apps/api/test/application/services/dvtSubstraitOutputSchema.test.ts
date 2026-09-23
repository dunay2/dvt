import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { projectDvtJoinDraftToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';

import { withSubstraitOutputSchema } from '../../../src/application/services/dvtSubstraitOutputSchema.js';
import {
  identityFixture,
  refreshDigest,
  relationRoot,
} from '../../fixtures/dvtRelationAdmissionFixture.js';

describe('canonical output schema at the PostgreSQL query boundary', () => {
  it('takes nullability from Substrait while preserving the executable projection', async () => {
    const draft = identityFixture('join');
    const root = relationRoot(draft);
    if (root.relType.case !== 'join' || root.relType.value.right?.relType.case !== 'read')
      throw new Error('Expected fixture join');
    root.relType.value.type = JoinRel_JoinType.LEFT;
    for (const type of root.relType.value.right.relType.value.baseSchema!.struct!.types) {
      if (type.kind.case !== 'string') throw new Error('Expected string input');
      type.kind.value.nullability = Type_Nullability.REQUIRED;
    }
    refreshDigest(draft);
    const projection = await projectDvtJoinDraftToPostgresSql(draft);
    const projected = {
      ...projection,
      orderBy: null,
      outputs: projection.projection.outputs.map((field) => ({ ...field, nullable: false })),
    };
    const result = withSubstraitOutputSchema(draft, projected);
    expect(result.ast).toBe(projected.ast);
    expect(result.sql).toBe(projected.sql);
    expect(result.outputs.filter((field) => field.name === 'product')).toEqual([
      expect.objectContaining({ dataType: 'string', nullable: true }),
    ]);
  });

  it.each(['name', 'width', 'ordinal'] as const)(
    'rejects projection %s drift instead of reporting a misleading schema',
    async (drift) => {
      const draft = identityFixture('join');
      const projected = await projectDvtJoinDraftToPostgresSql(draft);
      const outputs = projected.projection.outputs.map((output) => ({ ...output }));
      if (drift === 'name') outputs[0]!.name = 'unrelated';
      if (drift === 'width') outputs.pop();
      if (drift === 'ordinal') outputs[0]!.outputOrdinal = 3;
      expect(() =>
        withSubstraitOutputSchema(draft, { ...projected, orderBy: null, outputs })
      ).toThrow();
    }
  );
});
