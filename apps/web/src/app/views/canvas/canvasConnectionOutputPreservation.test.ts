import { describe, expect, it } from 'vitest';
import { getPluginPortMap } from '../../plugins/registry';
import { graphModel, graphSource } from './canvasRelationGraph.test-support';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  resolveCanvasEdgeCreationTransaction,
  resolveCanvasEdgeReconnectTransaction,
} from './canvasEdgeAdmissionTransaction';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { projectInteractiveCanvasColumns } from './canvasGraphNodeColumnProjection';

function scenario() {
  const client = graphSource('client');
  client.metadata = {
    ...client.metadata,
    columns: ['client_id', 'country'].map((name) => ({ name, type: 'string' })),
  };
  const orders = graphSource('orders');
  orders.metadata = {
    ...orders.metadata,
    columns: ['order_id', 'client_id', 'product'].map((name) => ({ name, type: 'string' })),
  };
  const source = resolveDvtSubstraitProjectionSource(client)!;
  const model = applyDvtSubstraitSemanticDocument(
    graphModel(),
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        targetNodeId: 'model',
        source,
        outputs: [{ fieldId: 'output-id', name: 'id_cliente', sourceFieldName: 'client_id' }],
      })
    )
  );
  const nodes = [client, orders, model];
  const draft: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: 'revision-1',
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: [{ sourceId: client.id, targetId: model.id }],
      pendingExplicitNodeIds: [],
    },
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
  return { model, nodes, draft };
}

describe('connection preserves authored output', () => {
  it('does not borrow another field identity through a shared column name', () => {
    const columns = projectInteractiveCanvasColumns(
      {
        id: 'model',
        position: { x: 0, y: 0 },
        data: { columns: [{ id: 'orders.client_id', name: 'client_id', type: 'string' }] },
      },
      new Map(),
      new Map([
        [
          'client_id',
          {
            columnId: 'client-output-id',
            dataType: 'string',
            menu: { category: 'text', items: [] },
          },
        ],
      ])
    );
    expect(columns[0]?.id).toBe('orders.client_id');
    expect(columns[0]?.functionMenu).toBeUndefined();
  });
  it('exposes new source outputs only after explicit editor composition, retaining the previous projection', async () => {
    const { model, nodes, draft } = scenario();
    const edges = [...draft.workingSet.visibleEdges, { sourceId: 'orders', targetId: 'model' }];
    const analysis = new CanvasRelationAnalysisSession(model.id);
    try {
      analysis.receive(
        decodeDvtSubstraitSemanticDocument(
          readDvtTransformAuthoringAuthority(model)!.semanticDocument
        )
      );
      const input = resolveCanvasDvtCompositionInputs({
        targetNodeId: model.id,
        nodes,
        edges,
      }).find((entry) => entry.nodeId === 'orders')!;
      const before = await analysis.query(analysis.rootId);
      const document = await composeSourceRelation(analysis, {
        relationId: analysis.rootId,
        expectedRevision: analysis.revision,
        operation: 'inner_join',
        input,
        predicate: { leftSourceFieldId: before.bindings[0]!.fieldId, rightFieldName: 'client_id' },
      });
      const composed = applyDvtSubstraitSemanticDocument(
        model,
        encodeDvtSubstraitSemanticDocument(document)
      );
      const graph = { node: composed, nodes: [nodes[0]!, nodes[1]!, composed], edges };
      const truth = await projectCanvasNodePresentationTruth(graph);
      expect(truth.columns.declared.map((column) => column.name)).toEqual([
        'id_cliente',
        'order_id',
        'client_id',
        'product',
      ]);
      expect(truth.relationalComposition).toMatchObject({
        state: 'canonical',
        operation: 'inner_join',
      });
      expect(() => resolveCanvasSubstraitGraphBindings(graph)).not.toThrow();
    } finally {
      analysis.dispose();
    }
  });
  it.each(['additional', 'replacement', 'reconnect'] as const)(
    '%s dependency does not restore excluded fields or replace aliases',
    async (intent) => {
      const { model, nodes, draft } = scenario();
      const edge = { id: 'client-model', source: 'client', target: 'model' };
      const args = {
        draftSession:
          intent === 'replacement' ? canvasGraphLifecycle.edge.replaceVisible(draft, []) : draft,
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        edges: intent === 'replacement' ? [] : [edge],
        pluginPortMap: getPluginPortMap(),
        connection: { source: 'orders', target: 'model', sourceHandle: null, targetHandle: null },
      };
      const result =
        intent === 'reconnect'
          ? resolveCanvasEdgeReconnectTransaction({ ...args, edge })
          : await resolveCanvasEdgeCreationTransaction(args);
      expect(result.outcome).toBe(intent === 'reconnect' ? 'reconnected' : 'created');
      if (result.outcome === 'noop') throw new Error('Expected admitted dependency');
      const after = result.draftSession.localNodeCatalog?.model ?? model;
      expect(after.metadata?.transformAuthoring).toEqual(model.metadata?.transformAuthoring);
      const graph = {
        node: after,
        nodes: [nodes[0]!, nodes[1]!, after],
        edges: result.draftSession.workingSet.visibleEdges,
      };
      const truth = await projectCanvasNodePresentationTruth(graph);
      expect(truth.columns.declared.map((column) => column.name)).toEqual(['id_cliente']);
      expect(
        truth.columns.inherited
          .filter((column) => column.sourceNodeId === 'orders')
          .map((column) => column.name)
      ).toEqual(['order_id', 'client_id', 'product']);
      expect(truth.relationalComposition?.state).toBe(
        intent === 'additional' ? 'pending' : 'incomplete'
      );
      const tree = projectCanvasRelationalTree(graph);
      expect(tree.ok).toBe(true);
      if (!tree.ok) throw new Error('Expected inspectable incomplete draft');
      expect(tree.projection.inputs).toContainEqual(
        expect.objectContaining({ sourceNodeId: 'orders', state: 'pending' })
      );
      if (intent !== 'additional')
        expect(() => resolveCanvasSubstraitGraphBindings(graph)).toThrow();
    }
  );
});
