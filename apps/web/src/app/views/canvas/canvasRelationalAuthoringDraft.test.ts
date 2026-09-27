import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { graphJoin } from './canvasRelationGraph.test-support';
import { restoreCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';

describe('relational authoring draft restoration', () => {
  it('restores only work that is not already part of the applied semantic tree', () => {
    const { document, session } = graphJoin();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const pendingId = 'pending-operation:aggregate';
    const restored = restoreCanvasRelationalAuthoringDraft(
      {
        version: 'v1',
        sources: [],
        operations: [
          {
            relationId: session.rootId,
            operation: 'inner_join',
            inputs: [...indexed.index.relations.get(session.rootId)!.inputs],
          },
          {
            relationId: pendingId,
            operation: 'aggregate',
            inputs: [session.rootId],
          },
        ],
        outputRelationId: pendingId,
        positions: {
          [session.rootId]: { x: 10, y: 20 },
          [pendingId]: { x: 30, y: 40 },
        },
      },
      [],
      document
    );

    expect(restored?.operations).toEqual([
      expect.objectContaining({ id: pendingId, inputs: [session.rootId] }),
    ]);
    expect(restored?.positions.size).toBe(2);
  });
});
