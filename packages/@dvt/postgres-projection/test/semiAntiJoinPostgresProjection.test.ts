import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { projectDvtJoinDraftToPostgresSql, ZERO_SHA256 } from '../src/index.js';
import { inspectDvtSubstraitJoinDraft } from '../src/index.js';

import { semiAntiJoinDraft } from './fixtures/semiAntiJoinDraft.js';

describe('PostgreSQL SEMI and ANTI JOIN rendering', () => {
  it.each([
    [
      JoinRel_JoinType.LEFT_SEMI,
      'EXISTS',
      'raw.orders AS left_source',
      'raw.client AS right_source',
    ],
    [
      JoinRel_JoinType.LEFT_ANTI,
      'NOT EXISTS',
      'raw.orders AS left_source',
      'raw.client AS right_source',
    ],
    [
      JoinRel_JoinType.RIGHT_SEMI,
      'EXISTS',
      'raw.client AS right_source',
      'raw.orders AS left_source',
    ],
    [
      JoinRel_JoinType.RIGHT_ANTI,
      'NOT EXISTS',
      'raw.client AS right_source',
      'raw.orders AS left_source',
    ],
  ] as const)(
    'renders exact retained-side semantics for %s with %s',
    async (joinType, quantifier, retainedSource, queriedSource) => {
      const result = await projectDvtJoinDraftToPostgresSql(semiAntiJoinDraft(joinType));
      if (result.kind !== 'join') throw new Error('Expected the raw JOIN projection.');

      expect(result.projection.joinRelations[0]?.joinType).toBe(joinType);
      expect(result.projection.outputs).toHaveLength(2);
      expect(result.sql).toContain(`FROM ${retainedSource}`);
      const compactSql = result.sql.replaceAll(/\s+/g, ' ');
      expect(compactSql).toMatch(
        quantifier === 'EXISTS'
          ? new RegExp(`EXISTS \\(SELECT 1 FROM ${queriedSource}`)
          : new RegExp(`NOT \\(EXISTS \\(SELECT 1 FROM ${queriedSource}`)
      );
      expect(result.sql).not.toContain('DISTINCT');
      expect(result.sql).not.toContain(' NOT IN ');
    }
  );

  it.each([
    [JoinRel_JoinType.LEFT_SEMI, [2]],
    [JoinRel_JoinType.RIGHT_SEMI, [2, 3]],
  ] as const)(
    'rejects queried-side/global output ordinals for retained-side JOIN type %s',
    async (joinType, outputMapping) => {
      const candidate = semiAntiJoinDraft(joinType);
      const root = candidate.plan.relations[0]?.relType;
      if (
        root?.case !== 'root' ||
        root.value.input?.relType.case !== 'join' ||
        root.value.input.relType.value.common?.emitKind.case !== 'emit'
      ) {
        throw new Error('Fixture must contain an emitted JOIN root');
      }
      root.value.input.relType.value.common.emitKind.value.outputMapping = [...outputMapping];
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;

      expect(inspectDvtSubstraitJoinDraft(candidate).ok).toBe(false);
      await expect(projectDvtJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
