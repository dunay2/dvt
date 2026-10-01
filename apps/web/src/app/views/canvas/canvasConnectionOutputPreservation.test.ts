import { describe, expect, it } from 'vitest';
import { createProducerInput } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
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
import { createSourceDocument } from './canvasSourceDocument';
import { createCanvasRelationalAnalysisReader } from './canvasRelationalAnalysisMemo';
import { setDvtSourceOutputIncluded } from './canvasDvtSourceSemanticAuthoring';

function scenario(): { model: CanonicalNode; nodes: CanonicalNode[]; draft: CanvasDraftSession } {
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
  it('keeps the tree inspectable when Source withdraws a field still named by a saved binding', () => {
    const { model, nodes } = scenario();
    const result = setDvtSourceOutputIncluded(nodes[0]!, 'client_id', false);
    if (result.outcome !== 'applied') throw new Error('Expected source publication update');
    const edges = [
      {
        sourceId: 'client',
        targetId: model.id,
        inputBindings: {
          version: 'v1' as const,
          fields: ['client_id', 'country'].map((producerFieldId) => ({
            inputId: producerFieldId,
            producerFieldId,
          })),
        },
      },
    ];
    const before = structuredClone(edges);
    const tree = projectCanvasRelationalTree({
      node: model,
      nodes: [result.node, nodes[1]!, model],
      edges,
    });
    expect(tree.ok).toBe(true);
    if (!tree.ok) throw new Error('Expected inspectable withdrawn field');
    expect(tree.projection.root.output.fields).toEqual([]);
    expect(tree.projection.root.unavailableFields?.map((field) => field.displayName)).toEqual([
      'id_cliente',
    ]);
    expect(edges).toEqual(before);
  });
  it('recomputes a retained document when only persisted Input bindings change and recovers on reconnection', () => {
    const { model, nodes, draft } = scenario();
    const read = createCanvasRelationalAnalysisReader();
    const graph = { node: model, nodes, edges: draft.workingSet.visibleEdges };
    const initial = read(graph);
    const changed = read({
      ...graph,
      edges: [
        {
          sourceId: 'client',
          targetId: model.id,
          metadata: {
            inputBindings: {
              version: 'v1',
              fields: [{ inputId: 'country-input', producerFieldId: 'country' }],
            },
          },
        },
      ],
    });
    expect(changed).not.toBe(initial);
    expect(changed.failure).toBeNull();
    expect(
      changed.semantic?.publication?.get(changed.semantic.index.rootId)?.unavailableFieldIds
    ).toEqual(['output-id']);
    const restored = read(graph);
    expect(restored.semantic?.publication).toBeUndefined();
    expect(restored.semantic?.digest).toBe(initial.semantic?.digest);
  });
  it('retains a withdrawn reference for repair without publishing it or counting it', async () => {
    const { model, nodes } = scenario();
    const before = structuredClone(model);
    const graph = {
      node: model,
      nodes,
      edges: [
        {
          sourceId: 'client',
          targetId: model.id,
          inputBindings: {
            version: 'v1' as const,
            fields: [{ inputId: 'country-input', producerFieldId: 'country' }],
          },
        },
      ],
    };
    const tree = projectCanvasRelationalTree(graph);
    expect(tree.ok).toBe(true);
    if (!tree.ok) throw new Error('Expected inspectable retained document');
    expect(tree.projection.root.output.fields).toEqual([]);
    expect(tree.projection.root.unavailableFields?.map((field) => field.displayName)).toEqual([
      'id_cliente',
    ]);
    expect(tree.projection.root.projectionSummary?.passthroughFieldCount).toBe(0);
    const truth = await projectCanvasNodePresentationTruth(graph);
    expect(truth.columns.visible.filter((field) => field.selected !== false)).toEqual([]);
    expect(model).toEqual(before);
  });
  it('exposes only published producer fields to a consumer and never copies producer operations', async () => {
    const { model: producer, nodes, draft } = scenario();
    const consumer = { ...graphModel(), id: 'consumer', name: 'Consumer' };
    const edges = [
      ...draft.workingSet.visibleEdges,
      { sourceId: producer.id, targetId: consumer.id },
    ];
    const input = createProducerInput(
      {
        nodeId: producer.id,
        name: producer.name,
        document: decodeDvtSubstraitSemanticDocument(
          readDvtTransformAuthoringAuthority(producer)!.semanticDocument
        ),
      },
      1
    );
    const connected = applyDvtSubstraitSemanticDocument(
      consumer,
      encodeDvtSubstraitSemanticDocument(createSourceDocument([input], input))
    );
    const graph = { node: connected!, nodes: [...nodes, connected!], edges };
    const truth = await projectCanvasNodePresentationTruth(graph);
    expect(truth.columns.inherited.map((column) => column.name)).toEqual(['id_cliente']);
    const tree = projectCanvasRelationalTree(graph);
    expect(tree.ok).toBe(true);
    if (!tree.ok) throw new Error('Expected a consumer tree');
    const operations = (node: typeof tree.projection.root): string[] => [
      node.operator,
      ...node.children.flatMap((child) => operations(child.node)),
    ];
    expect(operations(tree.projection.root)).toEqual(['read']);
    expect(tree.projection.root.displayName).toBe(producer.name);
  });
  it('does not borrow another field identity through a shared column name', () => {
    const columns = projectInteractiveCanvasColumns(
      {
        id: 'model',
        position: { x: 0, y: 0 },
        data: { columns: [{ id: 'orders.client_id', name: 'client_id', type: 'string' }] },
      },
      new Map()
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
      expect(truth.columns.declared.map((column) => column.name)).toEqual(
        intent === 'additional' ? ['id_cliente'] : []
      );
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
      if (intent !== 'additional')
        expect(tree.projection.root.unavailableFields?.map((field) => field.displayName)).toEqual([
          'id_cliente',
        ]);
      expect(tree.projection.inputs).toContainEqual(
        expect.objectContaining({ sourceNodeId: 'orders', state: 'pending' })
      );
      if (intent !== 'additional')
        expect(() => resolveCanvasSubstraitGraphBindings(graph)).toThrow();
    }
  );
});
