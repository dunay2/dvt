import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  CrossRelSchema,
  JoinRel_JoinType,
  RelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  inspectDvtSubstraitCrossDraft,
  projectDvtCrossDraftToPostgresSql,
  selectDvtSubstraitRelation,
  ZERO_SHA256,
  type DvtSubstraitCrossDraft,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/inner-join-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function snapshotDraft(draft: DvtSubstraitCrossDraft): Readonly<{
  plan: Uint8Array;
  sidecar: string;
}> {
  return {
    plan: toBinary(PlanSchema, draft.plan),
    sidecar: JSON.stringify(draft.sidecar),
  };
}

function expectDraftUnchanged(
  draft: DvtSubstraitCrossDraft,
  before: ReturnType<typeof snapshotDraft>
): void {
  expect(toBinary(PlanSchema, draft.plan)).toEqual(before.plan);
  expect(JSON.stringify(draft.sidecar)).toBe(before.sidecar);
}

function replaceJoinsWithCross(rel: Rel): Rel {
  if (rel.relType.case === 'read') return rel;
  if (rel.relType.case !== 'join') throw new Error('Fixture must contain only ReadRel/JoinRel');
  const join = rel.relType.value;
  if (join.left == null || join.right == null) throw new Error('Fixture JOIN must be binary');
  return create(RelSchema, {
    relType: {
      case: 'cross',
      value: create(CrossRelSchema, {
        common: join.common,
        left: replaceJoinsWithCross(join.left),
        right: replaceJoinsWithCross(join.right),
      }),
    },
  });
}

function crossDraft(key: 'two' | 'three'): DvtSubstraitCrossDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents[key]);
  const candidate = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) throw new Error('Fixture must have root');
  root.value.input = replaceJoinsWithCross(root.value.input);
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
  return candidate;
}

function outerJoinThenCrossDraft(): DvtSubstraitCrossDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents.three);
  const candidate = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('Fixture must contain a final JOIN');
  }
  const finalJoin = root.value.input.relType.value;
  if (finalJoin.left?.relType.case !== 'join' || finalJoin.right == null) {
    throw new Error('Fixture must contain a left-associated three-input JOIN');
  }
  finalJoin.left.relType.value.type = JoinRel_JoinType.LEFT;
  root.value.input = create(RelSchema, {
    relType: {
      case: 'cross',
      value: create(CrossRelSchema, {
        common: finalJoin.common,
        left: finalJoin.left,
        right: finalJoin.right,
      }),
    },
  });
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
  return candidate;
}

describe('shared PostgreSQL CROSS admission', () => {
  it('inspects the exact binary CrossRel and renders a real CROSS JOIN', async () => {
    const result = await projectDvtCrossDraftToPostgresSql(crossDraft('two'));

    expect(result.projection.inputs).toHaveLength(2);
    expect(result.projection.crossRelations).toHaveLength(1);
    expect(result.projection.outputs.map((output) => output.name)).toEqual([
      'order_id',
      'client_id',
      'client_client_id',
      'country',
    ]);
    expect(result.sql).toContain('CROSS JOIN');
    expect(result.sql).not.toContain(' ON ');
  });

  it('preserves a left-associated three-source CrossRel chain', async () => {
    const result = await projectDvtCrossDraftToPostgresSql(crossDraft('three'));

    expect(result.projection.inputs).toHaveLength(3);
    expect(result.projection.crossRelations).toHaveLength(2);
    expect(result.sql.match(/CROSS JOIN/g)).toHaveLength(2);
  });

  it('preserves an admitted outer JOIN subtree below CROSS without reassociation', async () => {
    const candidate = outerJoinThenCrossDraft();
    const before = snapshotDraft(candidate);

    const result = await projectDvtCrossDraftToPostgresSql(candidate);

    expect(result.projection.inputs).toHaveLength(3);
    expect(result.sql).toContain('LEFT JOIN');
    expect(result.sql).toContain('CROSS JOIN');
    expect(result.sql.indexOf('LEFT JOIN')).toBeLessThan(result.sql.indexOf('CROSS JOIN'));
    expect(result.sql).toMatch(
      /FROM \( SELECT[\s\S]+LEFT JOIN[\s\S]+\) AS cross_left\s+CROSS JOIN/
    );
    expectDraftUnchanged(candidate, before);
  });

  it('projects the selected intermediate CrossRel without mutating the persisted tree', async () => {
    const candidate = crossDraft('three');
    const before = snapshotDraft(candidate);
    const stages = candidate.sidecar.relations.filter((relation) => relation.sourceRef == null);

    const selected = selectDvtSubstraitRelation(candidate, stages[0]!.relationId);
    const result = await projectDvtCrossDraftToPostgresSql(selected);

    expect(result.projection.inputs).toHaveLength(2);
    expect(result.sql.match(/CROSS JOIN/g)).toHaveLength(1);
    expect(result.sql).not.toContain('raw.order_details');
    expectDraftUnchanged(candidate, before);
  });

  it('keeps an input in SQL when only fields from the other side are emitted', async () => {
    const candidate = crossDraft('two');
    const root = candidate.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input?.relType.case !== 'cross') {
      throw new Error('Fixture must contain CrossRel');
    }
    const common = root.value.input.relType.value.common;
    if (common?.emitKind.case !== 'emit') throw new Error('Fixture must use emit');
    common.emitKind.value.outputMapping = [0];
    root.value.names = ['order_id'];
    const relationId = candidate.sidecar.relations.find(
      (relation) => relation.relAnchor === common.relAnchor
    )!.relationId;
    candidate.sidecar.fields = candidate.sidecar.fields
      .filter((field) => field.relationId !== relationId)
      .concat({
        fieldId: 'cross-output-order-id',
        relationId,
        sourceFieldId: candidate.sidecar.fields.find(
          (field) => field.relationId === candidate.sidecar.relations[0]!.relationId
        )!.fieldId,
        outputOrdinal: 0,
        displayName: 'order_id',
      });

    const result = await projectDvtCrossDraftToPostgresSql(candidate);

    expect(result.projection.outputs).toHaveLength(1);
    expect(result.sql).toContain('raw.orders AS left_source');
    expect(result.sql).toContain('CROSS JOIN raw.client AS right_source');
    expect(result.sql).not.toContain('DISTINCT');
  });

  it.each(['missing input', 'invalid emit', 'stale hash', 'unsupported right subtree'])(
    'rejects %s before PostgreSQL',
    async (scenario) => {
      const candidate = crossDraft('two');
      const root = candidate.plan.relations[0]?.relType;
      if (root?.case !== 'root' || root.value.input?.relType.case !== 'cross') {
        throw new Error('Fixture must contain CrossRel');
      }
      const cross = root.value.input.relType.value;
      if (scenario === 'missing input') cross.right = undefined;
      if (scenario === 'invalid emit' && cross.common?.emitKind.case === 'emit') {
        cross.common.emitKind.value.outputMapping = [99];
      }
      if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      if (scenario === 'unsupported right subtree') cross.right = cross.left;

      expect(inspectDvtSubstraitCrossDraft(candidate).ok).toBe(false);
      await expect(projectDvtCrossDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
