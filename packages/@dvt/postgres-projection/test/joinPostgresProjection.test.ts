import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { projectDvtJoinDraftToPostgresSql, ZERO_SHA256 } from '../src/index.js';

import { joinDraft } from './fixtures/joinDraft.js';

describe('PostgreSQL INNER and outer JOIN rendering', () => {
  it('renders every predicate and only the selected output fields', async () => {
    const result = await projectDvtJoinDraftToPostgresSql(joinDraft());
    expect(result.projection.inputs).toHaveLength(3);
    expect(result.projection.outputs.map((field) => field.name)).toEqual([
      'order_id',
      'client_id',
      'client_client_id',
      'country',
      'product',
    ]);
    expect(result.sql).toContain(
      'JOIN raw.order_details AS join_source_3 ON left_source.order_id = join_source_3.order_id'
    );
  });

  it('preserves mixed INNER then LEFT stage types and renders LEFT JOIN', async () => {
    const candidate = joinDraft();
    const root = candidate.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'join') {
      throw new Error('Fixture must contain a JOIN root');
    }
    root.value.input.relType.value.type = JoinRel_JoinType.LEFT;
    candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;

    const result = await projectDvtJoinDraftToPostgresSql(candidate);

    expect(result.projection.joinRelations.map((stage) => stage.joinType)).toEqual([
      JoinRel_JoinType.INNER,
      JoinRel_JoinType.LEFT,
    ]);
    expect(result.sql).toContain(
      'LEFT JOIN raw.order_details AS join_source_3 ON left_source.order_id = join_source_3.order_id'
    );
    expect(
      result.projection.outputs
        .filter((output) => output.source.inputIndex === 2)
        .every((output) => output.nullable)
    ).toBe(true);
  });

  it.each([
    [JoinRel_JoinType.RIGHT, 'RIGHT JOIN', [0, 1]],
    [JoinRel_JoinType.OUTER, 'FULL JOIN', [0, 1, 2]],
  ] as const)(
    'preserves exact %s semantics and cumulative output nullability',
    async (joinType, sqlJoin, nullExtendedInputs) => {
      const candidate = joinDraft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join') {
        throw new Error('Fixture must contain a JOIN root');
      }
      root.value.input.relType.value.type = joinType;
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;

      const result = await projectDvtJoinDraftToPostgresSql(candidate);

      expect(result.projection.joinRelations.map((stage) => stage.joinType)).toEqual([
        JoinRel_JoinType.INNER,
        joinType,
      ]);
      expect(result.sql).toContain(
        `${sqlJoin} raw.order_details AS join_source_3 ON left_source.order_id = join_source_3.order_id`
      );
      result.projection.outputs.forEach((output) => {
        const source = result.projection.inputs[output.source.inputIndex]!.fields.find(
          (field) => field.fieldId === output.source.fieldId
        )!;
        expect(output.nullable).toBe(
          new Set<number>(nullExtendedInputs).has(output.source.inputIndex) ? true : source.nullable
        );
      });
    }
  );

  it.each(['single join', 'post-join filter', 'stale hash'])(
    'rejects %s instead of dropping unsupported semantics',
    async (scenario) => {
      const candidate = joinDraft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Fixture must contain a JOIN root');
      const join = root.value.input.relType.value;
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      if (scenario === 'single join') join.type = JoinRel_JoinType.LEFT_SINGLE;
      if (scenario === 'post-join filter') join.postJoinFilter = join.expression;
      if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      await expect(projectDvtJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
