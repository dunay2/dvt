/** Unary controls must not flatten nested fields or erase a relation's output mapping. */
import { describe, expect, it } from 'vitest';
import { cloneLocalRelation } from '@dvt/substrait-analysis';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { removeSelectedRelationPassthrough } from './canvasSelectedRelationPassthrough';

describe('selected unary structural preservation', () => {
  it.each(['sort', 'fetch'] as const)(
    '%s preserves nested identities through insertion and removal',
    async (operation) => {
      const pilot = createDvtSubstraitPilotDraft({
        sourceNodeId: 'records',
        targetNodeId: 'model',
      });
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(pilot);
      const initial = await session.query(session.rootId);
      const document = composeDvtSubstraitProjectionFields(pilot, {
        draggedFieldId: initial.bindings[0]!.fieldId,
        targetFieldId: initial.bindings[1]!.fieldId,
        parentFieldId: 'composed',
        parentName: 'composed',
      });
      session.receive(document);
      const inputId = session.rootId;
      const schema = await session.query(inputId);
      expect(schema.bindings.some((field) => field.parentFieldId != null)).toBe(true);
      await applySelectedRelationSortFetch(session, {
        intent: 'insert',
        relationId: inputId,
        expectedRevision: session.revision,
        ...(operation === 'sort'
          ? {
              operation,
              keys: [
                {
                  fieldId: schema.bindings[0]!.fieldId,
                  direction: SortField_SortDirection.ASC_NULLS_LAST,
                },
              ],
            }
          : { operation, count: 2n }),
      });
      const output = await session.query(session.rootId);
      expect(output.fields).toEqual(schema.fields);
      const bySource = new Map(output.bindings.map((field) => [field.sourceFieldId, field]));
      for (const input of schema.bindings) {
        const field = bySource.get(input.fieldId)!;
        expect(field.fieldId).not.toBe(input.fieldId);
        expect(field.outputOrdinal).toBe(input.outputOrdinal);
        if (input.parentFieldId != null)
          expect(field.parentFieldId).toBe(bySource.get(input.parentFieldId)!.fieldId);
      }
      const removed = await removeSelectedRelationPassthrough(
        session,
        session.rootId,
        session.revision
      );
      expect(removed.plan).toEqual(document.plan);
      expect(new Map(removed.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(document.sidecar.fields.map((field) => [field.fieldId, field]))
      );
      session.dispose();
    }
  );

  it.each(['sort', 'fetch'] as const)(
    'removing %s retains a non-identity emit as a projection',
    async (operation) => {
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(
        createDvtSubstraitPilotDraft({ sourceNodeId: 'records', targetNodeId: 'model' })
      );
      const schema = await session.query(session.rootId);
      await applySelectedRelationSortFetch(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        ...(operation === 'sort'
          ? {
              operation,
              keys: [
                {
                  fieldId: schema.bindings[0]!.fieldId,
                  direction: SortField_SortDirection.ASC_NULLS_LAST,
                },
              ],
            }
          : { operation, count: 2n }),
      });
      const target = session.locate(session.rootId, session.revision);
      const input = session.locate(target.inputs[0]!, session.revision);
      const relation = cloneLocalRelation(target.relation, [input.relation]);
      if (relation.relType.case !== 'sort' && relation.relType.case !== 'fetch')
        throw new Error('Expected unary');
      relation.relType.value.common!.emitKind = {
        case: 'emit',
        value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [1, 0] },
      };
      const fields = [target.fields[1]!, target.fields[0]!].map((field, outputOrdinal) => ({
        ...field,
        outputOrdinal,
      }));
      session.apply({
        expectedRevision: session.revision,
        removed: [],
        rootNames: fields.map((field) => field.displayName!),
        upserts: [{ relation, binding: target.binding, fields }],
      });
      const before = await session.query(session.rootId);
      await removeSelectedRelationPassthrough(session, session.rootId, session.revision);
      const after = await session.query(session.rootId);
      expect(after.fields).toEqual(before.fields);
      expect(after.bindings).toEqual(before.bindings);
      expect(session.locate(session.rootId, session.revision).relation.relType.case).toBe(
        'project'
      );
      session.dispose();
    }
  );
});
