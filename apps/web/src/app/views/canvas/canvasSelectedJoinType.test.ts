import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { changeSelectedJoinType } from './canvasSelectedJoinType';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';

describe('selected JOIN type', () => {
  it.each([0, 1] as const)(
    'preserves output identities when retaining side %s under a consumer',
    async (side) => {
      const session = new CanvasRelationAnalysisSession('model');
      const document = createSourceJoin({
        left: { source: source('one'), fields: ['code'] },
        right: { source: source('two'), fields: ['code'] },
        targetNodeId: 'model',
        leftFieldName: 'code',
        rightFieldName: 'code',
        outputs: [{ side, fieldName: 'code', name: 'chosen' }],
      });
      session.receive(document);
      const joinId = session.rootId;
      const initial = await session.query(joinId);
      await applySelectedRelationSortFetch(session, {
        relationId: joinId,
        expectedRevision: session.revision,
        intent: 'insert',
        operation: 'fetch',
        count: 3n,
      });
      const consumer = session.locate(session.rootId, session.revision);
      await changeSelectedJoinType(session, {
        relationId: joinId,
        expectedRevision: session.revision,
        joinType: side === 0 ? JoinRel_JoinType.LEFT_SEMI : JoinRel_JoinType.RIGHT_ANTI,
      });
      const after = await session.query(joinId);
      expect(after.bindings).toEqual(initial.bindings);
      expect(after.fields).toEqual(initial.fields);
      expect(session.locate(session.rootId, session.revision).binding).toEqual(consumer.binding);
      expect(session.locate(joinId, session.revision).inputs).toEqual(
        document.sidecar.relations.slice(0, 2).map((entry) => entry.relationId)
      );
      await expect(
        changeSelectedJoinType(session, {
          relationId: joinId,
          expectedRevision: session.revision,
          joinType: side === 0 ? JoinRel_JoinType.RIGHT_SEMI : JoinRel_JoinType.LEFT_ANTI,
        })
      ).rejects.toThrow();
      expect(await session.query(joinId)).toEqual(after);
    }
  );
});
