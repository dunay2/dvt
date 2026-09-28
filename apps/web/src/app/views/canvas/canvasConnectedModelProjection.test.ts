import { describe, expect, it } from 'vitest';
import { getPluginPortMap } from '../../plugins/registry';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasEdgeCreationTransaction } from './canvasEdgeAdmissionTransaction';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { graphJoin, graphModel, graphSource } from './canvasRelationGraph.test-support';

describe('producer dependency admission', () => {
  it.each(['physical', 'model'] as const)(
    'connects a %s producer without creating consumer semantics or copying operations',
    async (kind) => {
      const fixture = graphJoin();
      try {
        const producer = kind === 'model' ? graphModel(fixture.document) : graphSource('source');
        const consumer = { ...graphModel(), id: 'consumer' };
        const sources = kind === 'model' ? fixture.sources : [];
        const second = graphSource('another-producer');
        const nodes = [...sources, producer, consumer, second];
        const before = structuredClone(producer);
        const initialEdges = sources.map((node) => ({ sourceId: node.id, targetId: producer.id }));
        const draftSession: CanvasDraftSession = {
          syncState: 'editing',
          baseline: { record: null },
          draftRevision: 'rev-1',
          workingSet: {
            visibleNodeIds: nodes.map((node) => node.id),
            visibleEdges: initialEdges,
            pendingExplicitNodeIds: [],
          },
          localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
        };
        const result = await resolveCanvasEdgeCreationTransaction({
          canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
          draftSession,
          edges: initialEdges.map((edge, index) => ({
            id: String(index),
            source: edge.sourceId,
            target: edge.targetId,
          })),
          pluginPortMap: getPluginPortMap(),
          connection: {
            source: producer.id,
            target: consumer.id,
            sourceHandle: null,
            targetHandle: null,
          },
        });
        expect(result.outcome).toBe('created');
        if (result.outcome !== 'created') throw new Error('Expected admitted dependency');
        const connected = result.draftSession.localNodeCatalog![consumer.id]!;
        expect(connected).toBe(consumer);
        expect(readDvtTransformAuthoringAuthority(connected)).toBeNull();
        expect(producer).toEqual(before);
        expect(result.draftSession.workingSet.visibleEdges).toContainEqual({
          sourceId: producer.id,
          targetId: consumer.id,
        });

        const next = await resolveCanvasEdgeCreationTransaction({
          canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
          draftSession: result.draftSession,
          edges: result.edges,
          pluginPortMap: getPluginPortMap(),
          connection: {
            source: second.id,
            target: consumer.id,
            sourceHandle: null,
            targetHandle: null,
          },
        });
        expect(next.outcome).toBe('created');
        if (next.outcome !== 'created') throw new Error('Expected second dependency');
        expect(next.draftSession.localNodeCatalog![consumer.id]).toBe(consumer);
        expect(next.draftSession.workingSet.visibleEdges).toHaveLength(initialEdges.length + 2);
      } finally {
        fixture.session.dispose();
      }
    }
  );
});
