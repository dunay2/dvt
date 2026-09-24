// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  type ReadModelArgs,
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model dbt', () => {
  it('keeps only round-trippable DBT output edits and withholds transform gestures', async () => {
    const columns = [{ name: 'order_id', type: 'text' }];
    const sourceNode = {
      ...testNode,
      pluginId: 'dvt.warehouse-source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/public/orders',
        },
        sourceName: 'local_postgres_proof_dvt_public',
        schema: 'public',
        tableName: 'orders',
        columns,
      },
    } satisfies CanonicalNode;
    const modelNode = {
      ...testNode,
      id: 'dbt-model-orders',
      name: 'Orders Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: {
        authority: 'dbt-project-files',
        dbt: { packageName: 'analytics' },
        typeLabel: 'Model',
      },
    } satisfies CanonicalNode;
    const dependency = {
      id: 'source-to-dbt-model',
      sourceId: sourceNode.id,
      targetId: modelNode.id,
      relation: 'lineage' as const,
    };
    const base = buildReadModelArgs({ canMutateGraph: true });
    const graphNodes = [sourceNode, modelNode].map((node, index) => {
      const mapped = mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: true,
      });
      return {
        ...mapped,
        data: {
          ...mapped.data,
          columns,
          columnDisclosureExpanded: true,
        },
      };
    });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [],
        canonicalNodesById: new Map([sourceNode, modelNode].map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode, modelNode],
        canonicalEdges: [dependency],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const state = mounted.readState();
      const sourceData = state?.nodesWithImpact[0]?.data as ReadModelNodeData;
      expect(sourceData.onAddCanvasCalculatedColumn).toBeUndefined();
      expect(
        (sourceData.columns as ReadonlyArray<{ functionMenu?: unknown }>)[0]?.functionMenu
      ).toBeUndefined();
      expect(sourceData.onToggleCanvasColumnOutput).toEqual(
        args.columnActions.onToggleCanvasColumnOutput
      );
      expect(sourceData.onReorderCanvasColumnOutput).toEqual(
        args.columnActions.onReorderCanvasColumnOutput
      );
      expect(state?.edgesWithImpact).toEqual([]);
      expect((state?.nodesWithImpact[1]?.data as ReadModelNodeData).columnPortDirections).toEqual([
        'target',
        'source',
      ]);
      expect(
        (state?.nodesWithImpact[1]?.data as ReadModelNodeData).onToggleCanvasColumnOutput
      ).toEqual(expect.any(Function));
      expect(
        (state?.nodesWithImpact[1]?.data as ReadModelNodeData).onReorderCanvasColumnOutput
      ).toEqual(args.columnActions.onReorderCanvasColumnOutput);
      const modelData = state?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(modelData.onApplyCanvasColumnFunction).toBeUndefined();
      expect(
        (modelData.columns as ReadonlyArray<{ functionMenu?: unknown }>)[0]?.functionMenu
      ).toBeUndefined();

      const staleModelNode = {
        ...modelNode,
        metadata: {
          ...modelNode.metadata,
          dbt: {
            projectionColumns: [{ name: 'retired_order_id', output: true }],
          },
        },
      } satisfies CanonicalNode;
      const staleGraphNodes = [sourceNode, staleModelNode].map((node, index) => ({
        ...mapCanonicalNodeToCanvasNode({ canonicalNode: node, index, showColumns: true }),
        data: {
          ...graphNodes[index]!.data,
          columns,
          columnDisclosureExpanded: true,
        },
      }));

      await mounted.rerender({
        ...args,
        graphModel: {
          ...args.graphModel,
          nodes: staleGraphNodes,
          canonicalNodesById: new Map([sourceNode, staleModelNode].map((node) => [node.id, node])),
        },
        visibleScope: {
          canonicalNodes: [sourceNode, staleModelNode],
          canonicalEdges: [dependency],
        },
      });

      expect(mounted.readState()?.edgesWithImpact).toEqual([]);
      expect(
        (mounted.readState()?.nodesWithImpact[1]?.data as ReadModelNodeData)
          .onToggleCanvasColumnOutput
      ).toEqual(expect.any(Function));
    } finally {
      await mounted.cleanup();
    }
  });
});
