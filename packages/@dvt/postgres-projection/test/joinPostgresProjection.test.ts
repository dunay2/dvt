import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildNInputJoinPostgresAst,
  inspectDvtSubstraitJoinDraft,
  projectDvtJoinDraftToPostgresSql,
  ZERO_SHA256,
  type DvtSubstraitJoinDraft,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/inner-join-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function draft(): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents['three']);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

describe('shared PostgreSQL JOIN admission', () => {
  it('reads an empty final selection as a draft but never renders it as executable SQL', async () => {
    const candidate = draft();
    const root = candidate.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
      throw new Error('Fixture must contain a JOIN root');
    const common = root.value.input.relType.value.common!;
    if (common.emitKind.case !== 'emit') throw new Error('Fixture must use explicit emit');
    const relationId = candidate.sidecar.relations.find(
      (relation) => relation.relAnchor === common.relAnchor
    )!.relationId;
    root.value.names = [];
    common.emitKind.value.outputMapping = [];
    candidate.sidecar.fields = candidate.sidecar.fields.filter(
      (field) => field.relationId !== relationId
    );
    candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
    const inspected = inspectDvtSubstraitJoinDraft(candidate);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.projection.outputs).toEqual([]);
    expect(inspected.projection.inputs).toHaveLength(3);
    expect(() => buildNInputJoinPostgresAst(inspected.projection)).toThrow(/output/i);
    await expect(projectDvtJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
      code: 'unsupported_shape',
    });
  });

  it.each(['root names', 'intermediate emit'])(
    'still rejects an inconsistent empty %s',
    (scenario) => {
      const candidate = draft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Fixture must contain a JOIN root');
      if (scenario === 'root names') root.value.names = [];
      else {
        const left = root.value.input.relType.value.left!.relType;
        if (left.case !== 'join' || left.value.common?.emitKind.case !== 'emit')
          throw new Error('Fixture must contain an intermediate emit');
        left.value.common.emitKind.value.outputMapping = [];
      }
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      expect(inspectDvtSubstraitJoinDraft(candidate).ok).toBe(false);
    }
  );

  it('renders every predicate and only the selected output fields', async () => {
    const result = await projectDvtJoinDraftToPostgresSql(draft());
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
    const candidate = draft();
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
      const candidate = draft();
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

  it.each(['semi join', 'post-join filter', 'stale hash'])(
    'rejects %s instead of dropping unsupported semantics',
    async (scenario) => {
      const candidate = draft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Fixture must contain a JOIN root');
      const join = root.value.input.relType.value;
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      if (scenario === 'semi join') join.type = JoinRel_JoinType.LEFT_SEMI;
      if (scenario === 'post-join filter') join.postJoinFilter = join.expression;
      if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      await expect(projectDvtJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
