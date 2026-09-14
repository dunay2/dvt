import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  projectDvtInnerJoinDraftToPostgresSql,
  ZERO_SHA256,
  type DvtSubstraitInnerJoinDraft,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/inner-join-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function draft(): DvtSubstraitInnerJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents['three']);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

describe('shared PostgreSQL INNER JOIN admission', () => {
  it('renders every predicate and only the selected output fields', async () => {
    const result = await projectDvtInnerJoinDraftToPostgresSql(draft());
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

  it.each(['outer join', 'post-join filter', 'stale hash'])(
    'rejects %s instead of dropping unsupported semantics',
    async (scenario) => {
      const candidate = draft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Fixture must contain a JOIN root');
      const join = root.value.input.relType.value;
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      if (scenario === 'outer join') join.type = JoinRel_JoinType.LEFT;
      if (scenario === 'post-join filter') join.postJoinFilter = join.expression;
      if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      await expect(projectDvtInnerJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
