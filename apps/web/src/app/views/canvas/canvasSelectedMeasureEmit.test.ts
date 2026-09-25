import { clone } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';

describe('measure forms preserve canonical emit contracts', () => {
  it.each([applySelectedRelationAggregate, applySelectedRelationWindow])(
    'edits the computed alias after output reordering and sidecar permutation',
    async (apply) => {
      const { session } = selectedUnaryScenario();
      const input = await session.query(session.rootId);
      await apply(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: input.bindings[0]!.fieldId,
        alias: 'measure',
      });
      const selected = session.locate(session.rootId, session.revision);
      const width = selected.fields.length;
      const relation = clone(RelSchema, selected.relation);
      const variant = relation.relType;
      if (variant.case !== 'aggregate' && variant.case !== 'project')
        throw new Error('Expected measure');
      variant.value.common!.emitKind = {
        case: 'emit',
        value: {
          $typeName: 'substrait.RelCommon.Emit',
          outputMapping: [width - 1, 0],
        },
      };
      const roots = selected.fields.filter((field) => field.parentFieldId == null);
      const fields = [roots.at(-1)!, roots[0]!]
        .map((field, outputOrdinal) => ({ ...field, outputOrdinal }))
        .reverse();
      session.apply({
        expectedRevision: session.revision,
        removed: [],
        rootNames: [...fields].reverse().map((field) => field.displayName!),
        upserts: [{ relation, binding: selected.binding, fields }],
      });
      const before = await session.query(session.rootId);
      const edited = await apply(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        fieldId: input.bindings[0]!.fieldId,
        alias: 'renamed',
      });
      const after = await session.query(session.rootId);
      expect(after.fields).toEqual(before.fields);
      expect(new Set(after.bindings.map((field) => field.fieldId))).toEqual(
        new Set(before.bindings.map((field) => field.fieldId))
      );
      expect(after.bindings.find((field) => field.outputOrdinal === 0)?.displayName).toBe(
        'renamed'
      );
      expect(after.bindings.find((field) => field.outputOrdinal === 1)?.displayName).toBe(
        roots[0]!.displayName
      );
      expect(deriveSubstraitSchemas(edited).schemas.get(session.rootId)).toEqual(after.fields);
    }
  );
});
