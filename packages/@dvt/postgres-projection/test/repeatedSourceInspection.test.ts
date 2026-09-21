import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  inspectDvtSubstraitJoinDraft,
  projectDvtJoinDraftToPostgresSql,
  selectDvtSubstraitRelation,
  ZERO_SHA256,
} from '../src/index.js';

import { repeatedSourceDraft } from './fixtures/repeatedSourceDraft.js';

describe('repeated physical Read occurrences', () => {
  it.each([JoinRel_JoinType.INNER, JoinRel_JoinType.LEFT, JoinRel_JoinType.OUTER])(
    'preserves distinct identities, lineage and selector %i after protobuf roundtrip',
    async (type) => {
      const original = repeatedSourceDraft(type);
      const before = globalThis.structuredClone(original);
      const draft = {
        ...original,
        plan: fromBinary(PlanSchema, toBinary(PlanSchema, original.plan)),
      };
      const selected = selectDvtSubstraitRelation(draft, draft.sidecar.relations[2]!.relationId);
      const result = await projectDvtJoinDraftToPostgresSql(selected);
      const [left, right] = result.projection.inputs;
      expect(left!.sourceRef).toEqual(right!.sourceRef);
      expect(left!.relationId).not.toBe(right!.relationId);
      expect(new Set([...left!.fields, ...right!.fields].map((f) => f.fieldId)).size).toBe(4);
      expect(result.projection.joinRelations[0]!.joinType).toBe(type);
      expect(result.projection.joins[0]!.conditions).toEqual([
        {
          left: { kind: 'field', sourceFieldId: left!.fields[1]!.fieldId },
          right: { kind: 'field', sourceFieldId: right!.fields[0]!.fieldId },
        },
      ]);
      expect(result.projection.outputs.map((f) => f.source.fieldId)).toEqual(
        [...left!.fields, ...right!.fields].map((f) => f.fieldId)
      );
      expect(result.sql).toContain('raw.records AS left_source');
      expect(result.sql).toContain('raw.records AS right_source');
      expect(result.sql).toContain('left_source.parent_id = right_source.id');
      expect(original).toEqual(before);
    }
  );

  it.each(['relation', 'field', 'table', 'field type', 'field nullability', 'field name'])(
    'rejects inconsistent %s across occurrences',
    (corruption) => {
      const draft = repeatedSourceDraft();
      const root = draft.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join') throw new Error();
      const right = root.value.input.relType.value.right!.relType;
      if (right.case !== 'read' || right.value.readType.case !== 'namedTable') throw new Error();
      if (corruption === 'relation')
        draft.sidecar.relations[1]!.relationId = draft.sidecar.relations[0]!.relationId;
      if (corruption === 'field')
        draft.sidecar.fields[2]!.fieldId = draft.sidecar.fields[0]!.fieldId;
      if (corruption === 'table') {
        right.value.readType.value.names[1] = 'another_table';
        draft.sidecar.relations[1]!.displayName = 'another_table';
        draft.sidecar.relations[2]!.displayName = 'records+another_table';
      }
      if (corruption === 'field type') {
        right.value.baseSchema!.struct!.types[1]!.kind = {
          case: 'bool',
          value: { $typeName: 'substrait.Type.Boolean', typeVariationReference: 0, nullability: 1 },
        };
      }
      if (corruption === 'field nullability') {
        const type = right.value.baseSchema!.struct!.types[1]!.kind;
        if (type.case !== 'string') throw new Error();
        type.value.nullability = 2;
      }
      if (corruption === 'field name') {
        right.value.baseSchema!.names[1] = 'different';
        draft.sidecar.fields[3]!.displayName = 'different';
      }
      draft.sidecar.semanticPlanSha256 = ZERO_SHA256;
      const before = globalThis.structuredClone(draft);
      expect(inspectDvtSubstraitJoinDraft(draft)).toEqual({ ok: false });
      expect(draft).toEqual(before);
    }
  );
});
