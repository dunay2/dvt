import type { Connection, Edge } from '@xyflow/react';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildNodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { getPluginPortMap } from '../../plugins/registry';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import type { CanvasDraftSession } from './canvasDraftSession';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  resolveCanvasEdgeCreationTransaction,
  resolveCanvasEdgeReconnectTransaction,
} from './canvasEdgeAdmissionTransaction';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

function buildCanonicalNode(
  id: string,
  role: CanonicalNode['role'],
  kind: CanonicalNode['kind']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

function buildConnectedSourceNode(
  id: string,
  columns: readonly Readonly<{ name: string; type: string }>[]
): CanonicalNode {
  return {
    ...buildCanonicalNode(id, 'input', 'dvt:source'),
    metadata: {
      schema: 'raw',
      tableName: id,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${id}`,
      },
      columns,
    },
  };
}

function buildDraftSession(
  visibleEdges: CanvasDraftSession['workingSet']['visibleEdges'] = []
): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges,
      pendingExplicitNodeIds: [],
    },
  } satisfies CanvasDraftSession;
}

const pluginPortMap = getPluginPortMap();

describe('canvasEdgeAdmissionTransaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an edge with the next viewport edges and draft visible edges together', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      ['transform-node', buildCanonicalNode('transform-node', 'transform', 'dvt:transform')],
    ]);
    const connection: Connection = {
      source: 'source-node',
      sourceHandle: null,
      target: 'transform-node',
      targetHandle: null,
    };

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection,
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('created');
    if (transaction.outcome !== 'created') {
      throw new Error('Expected a created edge transaction');
    }
    expect(transaction.edges).toMatchObject([
      {
        id: 'source-node->transform-node:123',
        source: 'source-node',
        target: 'transform-node',
      },
    ]);
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'transform-node' },
    ]);
  });

  it('binds a newly connected DBT model to the real origin schema in the same transaction', () => {
    const source = {
      ...buildConnectedSourceNode('source-node', []),
      pluginId: 'dvt.warehouse-source',
      metadata: {
        ...buildConnectedSourceNode('source-node', []).metadata,
        schema: 'dvt',
      },
    };
    const model: CanonicalNode = {
      ...buildCanonicalNode('transform-node', 'transform', 'dvt:transform'),
      pluginId: 'dbt',
      metadata: {
        config: { schema: 'raw', table: 'model_1', materialized: 'view' },
        dbt: { schemaName: 'raw', tableName: 'model_1', materialized: 'view' },
      },
    };

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      connection: {
        source: source.id,
        sourceHandle: null,
        target: model.id,
        targetHandle: null,
      },
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('created');
    if (transaction.outcome !== 'created') {
      throw new Error('Expected a created edge transaction');
    }
    expect(transaction.draftSession.localNodeCatalog?.[model.id]?.metadata).toMatchObject({
      config: { schema: 'dvt', table: 'model_1' },
      dbt: { schemaName: 'dvt', selectedSourceId: source.id },
    });
  });

  it('creates deterministic column mappings in the same transaction as the stage edge', () => {
    const source = buildConnectedSourceNode('source-node', [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ]);
    const transform = buildCanonicalNode('transform-node', 'transform', 'dvt:transform');
    const canonicalNodesById = new Map<string, CanonicalNode>([
      [source.id, source],
      [transform.id, transform],
    ]);

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: source.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      },
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('created');
    if (transaction.outcome !== 'created') {
      throw new Error('Expected a created edge transaction');
    }
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: source.id, targetId: transform.id },
    ]);
    const mappedTransform = transaction.draftSession.localNodeCatalog?.[transform.id];
    if (mappedTransform == null) {
      throw new Error('Expected the created transaction to update the transform recipe');
    }
    const authority = readDvtTransformAuthoringAuthority(mappedTransform)!;
    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.source.nodeId).toBe(source.id);
    expect(inspection.projection.outputs).toMatchObject([
      {
        fieldId: 'output:order_id',
        name: 'order_id',
        sourceFieldName: 'order_id',
      },
      {
        fieldId: 'output:customer',
        name: 'customer',
        sourceFieldName: 'customer',
      },
    ]);
  });

  it('creates a second source edge without inventing a multi-source projection', () => {
    const firstSource = buildConnectedSourceNode('source-node', [
      { name: 'shared_id', type: 'integer' },
      { name: 'first_only', type: 'text' },
    ]);
    const secondSource = buildConnectedSourceNode('second-source', [
      { name: 'shared_id', type: 'integer' },
      { name: 'second_only', type: 'numeric' },
    ]);
    const transform = buildCanonicalNode('transform-node', 'transform', 'dvt:transform');
    const canonicalNodesById = new Map([
      [firstSource.id, firstSource],
      [secondSource.id, secondSource],
      [transform.id, transform],
    ]);
    const firstEdge: Edge = {
      id: 'first-source-to-transform',
      source: firstSource.id,
      target: transform.id,
    };
    const draftSession = {
      ...buildDraftSession([{ sourceId: firstSource.id, targetId: transform.id }]),
      workingSet: {
        visibleNodeIds: [firstSource.id, secondSource.id, transform.id],
        visibleEdges: [{ sourceId: firstSource.id, targetId: transform.id }],
        pendingExplicitNodeIds: [],
      },
    };

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: secondSource.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      },
      draftSession,
      edges: [firstEdge],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('created');
    if (transaction.outcome !== 'created') {
      throw new Error('Expected a created edge transaction');
    }
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: firstSource.id, targetId: transform.id },
      { sourceId: secondSource.id, targetId: transform.id },
    ]);
    expect(transaction.draftSession.localNodeCatalog?.[transform.id]).toBeUndefined();
  });

  it('rejects creation when an endpoint is missing from the canonical graph', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
    ]);

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: 'source-node',
        sourceHandle: null,
        target: 'missing-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction).toEqual({
      outcome: 'noop',
      rejection: { code: 'node_not_found_in_graph' },
    });
  });

  it('rejects self-loop creation before graph effects are produced', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
    ]);

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: 'source-node',
        sourceHandle: null,
        target: 'source-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction).toEqual({
      outcome: 'noop',
      rejection: { code: 'self_connection' },
    });
  });

  it('rejects reverse transformation direction in constrained transformation graphs', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      ['transform-node', buildCanonicalNode('transform-node', 'transform', 'dvt:transform')],
      ['sink-node', buildCanonicalNode('sink-node', 'output', 'dvt:sink')],
    ]);

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: 'sink-node',
        sourceHandle: null,
        target: 'source-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction).toEqual({
      outcome: 'noop',
      rejection: { code: 'plugin_rule_blocked', reason: 'Sinks are terminal nodes' },
    });
  });

  it('keeps a rejected stage edge out of persistence and Inputs/Outputs', () => {
    const source = buildCanonicalNode('source-node', 'input', 'dvt:source');
    const sink = buildCanonicalNode('sink-node', 'output', 'dvt:sink');
    const canonicalNodes = [source, sink];
    const canonicalNodesById = new Map(canonicalNodes.map((node) => [node.id, node]));
    const draftSession: CanvasDraftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: canonicalNodes.map((node) => node.id),
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const viewportEdges: Edge[] = [];

    const transaction = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: source.id,
        sourceHandle: null,
        target: sink.id,
        targetHandle: null,
      },
      draftSession,
      edges: viewportEdges,
      pluginPortMap,
    });

    expect(transaction).toEqual({
      outcome: 'noop',
      rejection: {
        code: 'plugin_rule_blocked',
        reason: 'Connection not permitted by DVT authoring rules',
      },
    });
    expect(viewportEdges).toEqual([]);
    expect(draftSession.workingSet.visibleEdges).toEqual([]);

    const persistedDraft = buildCurrentDraftPayload(
      canonicalNodes.map((node, index) => ({
        id: node.id,
        position: { x: index * 100, y: 0 },
      })),
      draftSession,
      { kind: 'transformation', title: 'Main canvas' },
      null,
      canonicalNodes,
      []
    );
    const semanticGraph = projectWorkspaceGraphAuthoringDraftSemanticGraph(persistedDraft);
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: persistedDraft.nodeIds,
      visibleEdges: persistedDraft.edges,
      draftSemanticGraph: semanticGraph,
      localCanonicalNodes: [],
    });
    const readInputsOutputs = (
      nodeId: string
    ): ReturnType<typeof buildNodePropertiesReadModel>['sections'][number] | undefined => {
      const node = projection.canonicalNodesById.get(nodeId);
      expect(node).toBeDefined();
      return buildNodePropertiesReadModel({
        node: node!,
        nodes: projection.canonicalNodes,
        edges: projection.canonicalEdges,
      }).sections.find((section) => section.id === 'inputs-outputs');
    };

    expect(persistedDraft.nodeIds).toEqual([source.id, sink.id]);
    expect(persistedDraft.edges).toEqual([]);
    expect(projection.canonicalEdges).toEqual([]);
    expect(readInputsOutputs(source.id)?.tableRows ?? []).toEqual([]);
    expect(readInputsOutputs(sink.id)?.tableRows ?? []).toEqual([]);
  });

  it('reconnects an edge with a stable edge identity and draft visible edges together', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      ['transform-node', buildCanonicalNode('transform-node', 'transform', 'dvt:transform')],
      ['sink-node', buildCanonicalNode('sink-node', 'output', 'dvt:sink')],
    ]);
    const edge: Edge = {
      id: 'edge-1',
      source: 'source-node',
      target: 'sink-node',
    };

    const transaction = resolveCanvasEdgeReconnectTransaction({
      canonicalNodesById,
      connection: {
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession([{ sourceId: 'source-node', targetId: 'sink-node' }]),
      edge,
      edges: [edge],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('reconnected');
    if (transaction.outcome !== 'reconnected') {
      throw new Error('Expected a reconnected edge transaction');
    }
    expect(transaction.edges).toEqual([
      {
        id: 'edge-1',
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
    ]);
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'transform-node' },
    ]);
  });

  it('reprojects available transform columns from the replacement upstream source', () => {
    const firstSource = {
      ...buildCanonicalNode('source-node', 'input', 'dvt:source'),
      metadata: { columns: [{ name: 'legacy_id', type: 'integer' }] },
    };
    const replacementSource = {
      ...buildCanonicalNode('replacement-source', 'input', 'dvt:source'),
      metadata: { columns: [{ name: 'current_id', type: 'text' }] },
    };
    const transform = buildCanonicalNode('transform-node', 'transform', 'dvt:transform');
    const canonicalNodesById = new Map<string, CanonicalNode>([
      [firstSource.id, firstSource],
      [replacementSource.id, replacementSource],
      [transform.id, transform],
    ]);
    const edge: Edge = {
      id: 'edge-1',
      source: firstSource.id,
      target: transform.id,
    };
    const draftSession: CanvasDraftSession = {
      ...buildDraftSession([{ sourceId: firstSource.id, targetId: transform.id }]),
      workingSet: {
        visibleNodeIds: [firstSource.id, replacementSource.id, transform.id],
        visibleEdges: [{ sourceId: firstSource.id, targetId: transform.id }],
        pendingExplicitNodeIds: [],
      },
    };

    const transaction = resolveCanvasEdgeReconnectTransaction({
      canonicalNodesById,
      connection: {
        source: replacementSource.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      },
      draftSession,
      edge,
      edges: [edge],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('reconnected');
    if (transaction.outcome !== 'reconnected') {
      throw new Error('Expected a reconnected edge transaction');
    }
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: replacementSource.id, targetId: transform.id },
    ]);

    const presentation = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [firstSource, replacementSource, transform],
      edges: transaction.draftSession.workingSet.visibleEdges,
    });

    expect(presentation.columns.inherited).toEqual([
      expect.objectContaining({
        name: 'current_id',
        reference: `${replacementSource.id}.current_id`,
        sourceNodeId: replacementSource.id,
      }),
    ]);
    expect(presentation.columns.inherited).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'legacy_id',
          sourceNodeId: firstSource.id,
        }),
      ])
    );
  });

  it('keeps reconnecting to the same target idempotent instead of duplicating edges', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      ['transform-node', buildCanonicalNode('transform-node', 'transform', 'dvt:transform')],
    ]);
    const edge: Edge = {
      id: 'edge-1',
      source: 'source-node',
      target: 'transform-node',
    };

    const transaction = resolveCanvasEdgeReconnectTransaction({
      canonicalNodesById,
      connection: {
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession([{ sourceId: 'source-node', targetId: 'transform-node' }]),
      edge,
      edges: [edge],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('reconnected');
    if (transaction.outcome !== 'reconnected') {
      throw new Error('Expected a reconnected edge transaction');
    }
    expect(transaction.edges).toEqual([
      {
        id: 'edge-1',
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
    ]);
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'transform-node' },
    ]);
  });
});
