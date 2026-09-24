// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model admission', () => {
  it('offers the first output toggle but no reorder before a flat Model has canonical outputs', async () => {
    const sourceNode = {
      ...testNode,
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        },
        columns: [{ name: 'customer', type: 'text', nullable: false }],
      },
    } satisfies CanonicalNode;
    const modelNode = {
      ...testNode,
      id: 'model-orders',
      name: 'Orders Model',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: { columns: [{ name: 'customer', type: 'text', nullable: false }] },
    } satisfies CanonicalNode;
    const dependency = {
      id: 'source-model',
      sourceId: sourceNode.id,
      targetId: modelNode.id,
      relation: 'lineage' as const,
    };
    const nodes = [sourceNode, modelNode];
    const graphNodes = await Promise.all(
      nodes.map(async (node, index) =>
        mapCanonicalNodeToCanvasNode({
          canonicalNode: node,
          index,
          showColumns: true,
          presentationTruth: await projectCanvasNodePresentationTruth({
            node,
            nodes,
            edges: [dependency],
          }),
        })
      )
    );
    const base = buildReadModelArgs({ canMutateGraph: true });
    const mounted = await renderReadModel({
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [{ id: dependency.id, source: sourceNode.id, target: modelNode.id }],
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: { canonicalNodes: nodes, canonicalEdges: [dependency] },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: nodes.map((node) => node.id),
      },
    });

    try {
      const data = mounted.readState()?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(data.onToggleCanvasColumnOutput).toBe(base.columnActions.onToggleCanvasColumnOutput);
      expect(data.onReorderCanvasColumnOutput).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });

  it('does not offer output controls when the connected Source cannot materialize fields', async () => {
    const sourceNode = {
      ...testNode,
      metadata: { columns: [{ name: 'customer', type: 'text', nullable: false }] },
    } satisfies CanonicalNode;
    const modelNode = {
      ...testNode,
      id: 'model-orders',
      name: 'Orders Model',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: {},
    } satisfies CanonicalNode;
    const dependency = {
      id: 'source-model',
      sourceId: sourceNode.id,
      targetId: modelNode.id,
      relation: 'lineage' as const,
    };
    const nodes = [sourceNode, modelNode];
    const graphNodes = await Promise.all(
      nodes.map(async (node, index) =>
        mapCanonicalNodeToCanvasNode({
          canonicalNode: node,
          index,
          showColumns: true,
          presentationTruth: await projectCanvasNodePresentationTruth({
            node,
            nodes,
            edges: [dependency],
          }),
        })
      )
    );
    const base = buildReadModelArgs({ canMutateGraph: true });
    const mounted = await renderReadModel({
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [{ id: dependency.id, source: sourceNode.id, target: modelNode.id }],
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: { canonicalNodes: nodes, canonicalEdges: [dependency] },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: nodes.map((node) => node.id),
      },
    });

    try {
      const data = mounted.readState()?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(data.onToggleCanvasColumnOutput).toBeUndefined();
      expect(data.onReorderCanvasColumnOutput).toBeUndefined();

      const disconnectedModel = {
        ...modelNode,
        metadata: { columns: [{ name: 'customer', type: 'text', nullable: false }] },
      } satisfies CanonicalNode;
      const disconnectedGraphNode = mapCanonicalNodeToCanvasNode({
        canonicalNode: disconnectedModel,
        index: 0,
        showColumns: true,
        presentationTruth: await projectCanvasNodePresentationTruth({
          node: disconnectedModel,
          nodes: [disconnectedModel],
          edges: [],
        }),
      });
      await mounted.rerender({
        ...base,
        graphModel: {
          nodes: [disconnectedGraphNode],
          edges: [],
          canonicalNodesById: new Map([[disconnectedModel.id, disconnectedModel]]),
          onEdgesChange: vi.fn(),
        },
        visibleScope: { canonicalNodes: [disconnectedModel], canonicalEdges: [] },
        executionScope: {
          selectedNodeIds: [],
          workspaceNodeIds: [disconnectedModel.id],
        },
      });
      const disconnectedData = mounted.readState()?.nodesWithImpact[0]?.data as ReadModelNodeData;
      expect(disconnectedData.onToggleCanvasColumnOutput).toBeUndefined();
      expect(disconnectedData.onReorderCanvasColumnOutput).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });
});
