import { describe, expect, it } from 'vitest';
import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasEdgeCreationTransaction } from './canvasEdgeAdmissionTransaction';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { initializeConnectedModelProjection } from './canvasConnectedModelProjection';

describe('connected model output authority', () => {
  it('preserves a JOIN producer and rejects its stale replacement', async () => {
    const { document, sources, session } = graphJoin();
    const producer = graphModel(document);
    const consumer = { ...graphModel(), id: 'consumer' };
    const edges = [
      ...sources.map((node) => ({ sourceId: node.id, targetId: producer.id })),
      { sourceId: producer.id, targetId: consumer.id },
    ];
    const nodes = [...sources, producer, consumer];
    const connected = await initializeConnectedModelProjection({ target: consumer, nodes, edges });
    expect(connected).not.toBeNull();
    const graph = { node: connected!, nodes: [...sources, producer, connected!], edges };
    const truth = await projectCanvasNodePresentationTruth(graph);
    expect(truth.relationalComposition).toEqual({ state: 'single-input', connectedInputCount: 1 });
    expect(truth.columns.declared).toHaveLength(4);
    expect(() => resolveCanvasSubstraitGraphBindings(graph)).not.toThrow();
    const replacement = graphJoin();
    const stale = { ...graph, nodes: [...sources, graphModel(replacement.document), connected!] };
    expect(() => resolveCanvasSubstraitGraphBindings(stale)).toThrow();
    expect((await projectCanvasNodePresentationTruth(stale)).relationalComposition?.state).toBe(
      'unresolved'
    );
    expect(
      await initializeConnectedModelProjection({ target: connected!, nodes, edges })
    ).toBeNull();
    session.dispose();
    replacement.session.dispose();
  });
  it.each([false, true])(
    'connects an authored model (filtered=%s) without flattening it',
    async (filtered) => {
      let document = projectionScenario({ sourceNodeId: 'source', targetNodeId: 'producer' });
      if (filtered) {
        const analysis = new CanvasRelationAnalysisSession('producer');
        analysis.receive(document);
        const input = await analysis.query(analysis.rootId);
        document = await applySelectedRelationFilter(analysis, {
          intent: 'insert',
          relationId: analysis.rootId,
          expectedRevision: analysis.revision,
          fieldId: input.bindings[0]!.fieldId,
          capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
          value: 'Ana',
        });
        analysis.dispose();
      }
      const model: CanonicalNode = {
        id: 'producer',
        name: 'Producer',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      };
      const source: CanonicalNode = {
        ...model,
        id: 'source',
        kind: 'dvt:source',
        role: 'input',
        metadata: {
          schema: 'public',
          tableName: 'customers',
          connectedSourceRef: document.sidecar.relations.find((entry) => entry.sourceRef != null)!
            .sourceRef,
          columns: ['name', 'email', 'country'].map((name) => ({ name, type: 'string' })),
        },
      };
      const producer = applyDvtSubstraitSemanticDocument(
        model,
        encodeDvtSubstraitSemanticDocument(document)
      );
      const consumer = { ...model, id: 'consumer', name: 'Consumer' };
      const nodes = [source, producer, consumer];
      const before = structuredClone(producer);
      const edges = [{ sourceId: source.id, targetId: producer.id }];
      const draftSession: CanvasDraftSession = {
        syncState: 'editing',
        baseline: { record: null },
        draftRevision: 'rev-1',
        workingSet: {
          visibleNodeIds: nodes.map((node) => node.id),
          visibleEdges: edges,
          pendingExplicitNodeIds: [],
        },
        localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
      };
      const result = await resolveCanvasEdgeCreationTransaction({
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        draftSession,
        edges: [{ id: 'source-producer', source: source.id, target: producer.id }],
        pluginPortMap: getPluginPortMap(),
        connection: {
          source: producer.id,
          target: consumer.id,
          sourceHandle: null,
          targetHandle: null,
        },
      });
      expect(result.outcome).toBe('created');
      if (result.outcome !== 'created') throw new Error('Expected accepted connection');
      const connected = result.draftSession.localNodeCatalog![consumer.id]!;
      expect(readDvtTransformAuthoringAuthority(connected)).not.toBeNull();
      const graph = {
        node: connected,
        nodes: [source, producer, connected],
        edges: result.draftSession.workingSet.visibleEdges,
      };
      const truth = await projectCanvasNodePresentationTruth(graph);
      expect(truth.relationalComposition).toEqual({
        state: 'single-input',
        connectedInputCount: 1,
      });
      expect(
        truth.columns.visible
          .filter((column) => column.selected !== false)
          .map((column) => column.name)
      ).toEqual(['name', 'email', 'country']);
      expect(() => resolveCanvasSubstraitGraphBindings(graph)).not.toThrow();
      expect(producer).toEqual(before);
      expect(() => resolveCanvasSubstraitGraphBindings({ ...graph, edges })).toThrow();
    }
  );
});
