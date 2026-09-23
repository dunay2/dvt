import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  decodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  encodeDvtSubstraitPlanV1,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  projectDvtJoinDraftToPostgresSql,
  projectDvtSetDraftToPostgresSql,
  selectDvtSubstraitRelation,
  type DvtSubstraitJoinDraft,
} from '../src/index.js';

const joinFixtures = JSON.parse(
  readFileSync(new URL('./fixtures/inner-join-documents.json', import.meta.url), 'utf8')
);
const setFixtures = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
);
function joinFixture(): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(joinFixtures.three);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

function setFixture(operation: SetRel_SetOp): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(setFixtures.unionDistinct);
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]?.relType;
  const set = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (set?.case !== 'set') throw new Error('Fixture must contain one SetRel.');
  set.value.op = operation;
  return {
    plan,
    sidecar: { ...document.sidecar, semanticPlanSha256: encodeDvtSubstraitPlanV1(plan).sha256 },
  };
}

describe('selected relation query projection', () => {
  it('projects the intermediate JOIN with only its own inputs and outputs without mutating authoring', async () => {
    const original = joinFixture();
    const before = globalThis.structuredClone(original);
    const joins = original.sidecar.relations.filter((relation) => relation.sourceRef == null);
    const selected = selectDvtSubstraitRelation(original, joins[0]!.relationId);
    const result = await projectDvtJoinDraftToPostgresSql(selected);
    expect(result.projection.inputs).toHaveLength(2);
    expect(result.sql.match(/\bJOIN\b/g)).toHaveLength(1);
    expect(result.sql).not.toContain('raw.order_details');
    expect(result.projection.outputs.map((output) => output.name)).toEqual([
      'order_id',
      'client_id',
      'client_client_id',
      'country',
    ]);
    expect(selected.sidecar.relations.map((relation) => relation.relationId)).toContain(
      joins[0]!.relationId
    );
    expect(original).toEqual(before);
    const final = await projectDvtJoinDraftToPostgresSql(
      selectDvtSubstraitRelation(original, joins[1]!.relationId)
    );
    expect(final.projection.inputs).toHaveLength(3);
    expect(final.sql.match(/\bJOIN\b/g)).toHaveLength(2);
  });

  it.each([
    ['union_distinct', SetRel_SetOp.UNION_DISTINCT],
    ['intersect_distinct', SetRel_SetOp.INTERSECTION_MULTISET],
    ['except_distinct', SetRel_SetOp.MINUS_PRIMARY],
    ['intersect_all', SetRel_SetOp.INTERSECTION_MULTISET_ALL],
    ['except_all', SetRel_SetOp.MINUS_PRIMARY_ALL],
  ] as const)('preserves selected %s relation identities for exact preview', async (name, op) => {
    const original = setFixture(op);
    const before = globalThis.structuredClone(original);
    const relationId = original.sidecar.relations.find(
      (relation) => relation.sourceRef == null
    )!.relationId;

    const selected = selectDvtSubstraitRelation(original, relationId);
    const result = await projectDvtSetDraftToPostgresSql(selected);

    expect(result.projection.operation).toBe(name);
    expect(result.projection.inputs.map((input) => input.table)).toEqual([
      'customers_north',
      'customers_south',
      'customers_west',
    ]);
    expect(selected.sidecar.relations).toEqual(original.sidecar.relations);
    expect(original).toEqual(before);
  });

  it.each(['foreign relation', 'stale plan', 'duplicate anchor'])(
    'fails closed for %s',
    (reason) => {
      const candidate = joinFixture();
      const id = candidate.sidecar.relations.find(
        (relation) => relation.sourceRef == null
      )!.relationId;
      if (reason === 'stale plan') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      if (reason === 'duplicate anchor')
        candidate.sidecar.relations[1]!.relAnchor = candidate.sidecar.relations[0]!.relAnchor;
      expect(() =>
        selectDvtSubstraitRelation(candidate, reason === 'foreign relation' ? 'foreign' : id)
      ).toThrow();
    }
  );
});
