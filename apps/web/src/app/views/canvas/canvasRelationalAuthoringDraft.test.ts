import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import {
  readCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

describe('relational authoring draft restoration', () => {
  it.each([false, true])(
    'retires completed wiring without reviving it on save (disconnected: %s)',
    (disconnected) => {
      const { document, session } = graphJoin();
      const draft = {
        version: 'v1' as const,
        sources: [],
        operations: [],
        outputRelationId: disconnected ? null : session.rootId,
        positions: {},
      };
      const model = graphModel(document);
      model.metadata = { ...model.metadata, relationalAuthoringDraft: draft };
      const expected = disconnected ? draft : null;
      expect(readCanvasRelationalAuthoringDraft(model)).toEqual(expected);
      const inspector = createCanvasInspectorNodeDraft(model);
      expect(inspector.relationalAuthoringDraft ?? null).toEqual(expected);
      const saved = applyCanvasInspectorNodeDraft(model, inspector);
      expect(saved.metadata?.relationalAuthoringDraft ?? null).toEqual(expected);
    }
  );

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
