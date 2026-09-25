import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { graphJoin, appendGraphSource } from './canvasRelationGraph.test-support';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { createSourceSet, sourceSetOperations } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';

describe('branch retirement in composed relations', () => {
  it.each(Object.keys(sourceSetOperations))(
    'removes an N-ary %s operand without changing positional lineage',
    async (operation) => {
      const document = createSourceSet({
        targetNodeId: 'model',
        inputs: ['a', 'b', 'c'].map(source),
        operation: operation as keyof typeof sourceSetOperations,
      });
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(document);
      const root = session.locate(session.rootId, session.revision);
      const proposal = await prepareRelationRemoval(session, {
        relationId: root.inputs[1]!,
        expectedRevision: session.revision,
      });
      expect(proposal.operations).toEqual([]);
      const next = session.apply(proposal.change);
      const current = session.locate(root.binding.relationId, session.revision);
      expect(current.inputs).toEqual([root.inputs[0], root.inputs[2]]);
      expect(current.fields.map((field) => field.fieldId)).toEqual(
        root.fields.map((field) => field.fieldId)
      );
      expect(current.fields.map((field) => field.operandFieldIds)).toEqual(
        root.fields.map((field) => [field.operandFieldIds![0], field.operandFieldIds![2]])
      );
      expect(current.relation.relType.case === 'set' && current.relation.relType.value.op).toBe(
        sourceSetOperations[operation as keyof typeof sourceSetOperations]
      );
      expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)).toHaveLength(2);
    }
  );

  it('rejects loss of a downstream condition without publishing a partial retirement', async () => {
    const { session } = graphJoin();
    const leftId = session.locate(session.rootId, session.revision).inputs[0]!;
    await appendGraphSource(session, 'third');
    const root = await session.query(session.rootId);
    const revision = session.revision;
    await expect(
      prepareRelationRemoval(session, { relationId: leftId, expectedRevision: revision })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(session.rootId)).toEqual(root);
    expect(session.locate(leftId, revision).relation.relType.case).toBe('read');
  });

  it('preserves valid aggregate and window consumers when retiring an unrelated source', async () => {
    const { session } = graphJoin();
    const sourceId = session.locate(session.rootId, session.revision).inputs[1]!;
    await appendGraphSource(session, 'third');
    const schema = await session.query(session.rootId);
    await applySelectedRelationAggregate(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: schema.bindings.at(-1)!.fieldId,
      alias: 'total',
    });
    const grouped = await session.query(session.rootId);
    await applySelectedRelationWindow(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: grouped.bindings[0]!.fieldId,
      alias: 'rank',
    });
    const before = await session.query(session.rootId);
    const proposal = await prepareRelationRemoval(session, {
      relationId: sourceId,
      expectedRevision: session.revision,
    });
    expect(proposal.operations).toEqual([]);
    const document = session.apply(proposal.change);
    expect(session.rootId).toBe(before.relationId);
    expect((await session.query(session.rootId)).fields).toEqual(before.fields);
    expect(document.sidecar.relations.some((binding) => binding.relationId === sourceId)).toBe(
      false
    );
    expect(deriveSubstraitSchemas(document).schemas.get(session.rootId)).toEqual(before.fields);
  });
});
