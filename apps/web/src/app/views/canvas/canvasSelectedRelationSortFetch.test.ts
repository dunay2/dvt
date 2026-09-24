/** Editing follows relation identity, including either operand beneath another operator. */
import { describe, expect, it } from 'vitest';
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import { createDvtSubstraitFetchDraft } from '@dvt/postgres-projection';
import { indexSubstraitRelations, selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { reconnectSelectedRelation } from './canvasSelectedRelationChange';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { source } from './canvasRelationalOperator.test-support';

describe('selected unary operation', () => {
  it.each([0, 1] as const)(
    'edits Fetch in operand %s without touching its sibling',
    async (port) => {
      const original = createDvtSubstraitJoinDraft({
        left: source('left'),
        right: source('right'),
        targetNodeId: 'model',
      });
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(original);
      const root = session.locate(session.rootId, session.revision);
      const originalIndex = indexSubstraitRelations(original);
      if (!originalIndex.ok) throw originalIndex.error;
      const inputId = root.inputs[port]!;
      const schema = await session.query(inputId);
      const relationId = allocateDvtRelationId();
      const wrapper = createDvtSubstraitFetchDraft(selectDvtSubstraitRelation(original, inputId), {
        relationId,
        outputFieldIds: schema.bindings.map(() => allocateDvtFieldId()),
        count: 2n,
      });
      const index = indexSubstraitRelations(wrapper);
      if (!index.ok) throw index.error;
      const entry = index.index.relations.get(relationId)!;
      if (entry.relation.relType.case !== 'fetch') throw new Error('Expected Fetch');
      entry.relation.relType.value.common!.relAnchor = root.nextAnchor;
      const binding = { ...entry.binding, relAnchor: root.nextAnchor };
      const reconnected = reconnectSelectedRelation(
        session,
        inputId,
        entry.relation,
        relationId,
        session.revision
      );
      const draft = session.apply({
        expectedRevision: session.revision,
        removed: [],
        ...reconnected,
        upserts: [
          { relation: entry.relation, binding, fields: entry.fields },
          ...reconnected.upserts,
        ],
      });

      const edited = await applySelectedRelationSortFetch(session, {
        intent: 'edit',
        expectedRevision: session.revision,
        operation: 'fetch',
        relationId,
        count: 7n,
        offset: 1n,
      });
      const result = indexSubstraitRelations(edited);
      if (!result.ok) throw result.error;
      const selected = result.index.relations.get(relationId)!.relation.relType;
      if (selected.case !== 'fetch') throw new Error('Expected Fetch');
      expect(selected.value.countExpr?.rexType).toMatchObject({
        case: 'literal',
        value: { literalType: { case: 'i64', value: 7n } },
      });
      expect(selected.value.offsetExpr?.rexType).toMatchObject({
        case: 'literal',
        value: { literalType: { case: 'i64', value: 1n } },
      });
      const siblingId = root.inputs[1 - port]!;
      expect(result.index.relations.get(siblingId)).toEqual(
        originalIndex.index.relations.get(siblingId)
      );
      expect(edited.sidecar.relations).toEqual(draft.sidecar.relations);
      expect(new Map(edited.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(draft.sidecar.fields.map((field) => [field.fieldId, field]))
      );
    }
  );
});
